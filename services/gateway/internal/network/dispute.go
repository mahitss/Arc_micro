package network

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrDisputeNotOpen       = errors.New("dispute is not in an open or reviewable state")
	ErrUnauthorizedDisputant = errors.New("initiator is not a party to this contract")
)

// DisputeStorageRepository defines storage interface for disputes.
type DisputeStorageRepository interface {
	ContractStorageRepository
	SaveDispute(ctx context.Context, d *DisputeRecord) error
	GetDispute(ctx context.Context, id string) (*DisputeRecord, error)
	ListDisputes(ctx context.Context, orgID string) ([]*DisputeRecord, error)
	UpdateDisputeState(ctx context.Context, id string, state DisputeState, notes string, refund string, resolvedAt *time.Time) error
}

// DisputeManager handles formal counterparty complaints and audit resolutions.
type DisputeManager struct {
	repo DisputeStorageRepository
}

// NewDisputeManager creates a new DisputeManager.
func NewDisputeManager(repo DisputeStorageRepository) *DisputeManager {
	return &DisputeManager{repo: repo}
}

// OpenDispute records a formal dispute against an active or completed contract.
func (m *DisputeManager) OpenDispute(
	ctx context.Context,
	contractID string,
	initiatorAgentID string,
	reason string,
	evidence string,
) (*DisputeRecord, error) {
	contract, err := m.repo.GetServiceContract(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("contract not found: %w", err)
	}

	// Verify initiator is a contract counterparty
	if !strings.EqualFold(initiatorAgentID, contract.RequesterAgentID) && !strings.EqualFold(initiatorAgentID, contract.ProviderAgentID) {
		return nil, ErrUnauthorizedDisputant
	}

	respondentID := contract.ProviderAgentID
	if strings.EqualFold(initiatorAgentID, contract.ProviderAgentID) {
		respondentID = contract.RequesterAgentID
	}

	now := time.Now().UTC()
	dispute := &DisputeRecord{
		DisputeID:         fmt.Sprintf("disp_%d", now.UnixNano()),
		ContractID:        contractID,
		OrganizationID:    contract.OrganizationID,
		InitiatorAgentID:  initiatorAgentID,
		RespondentAgentID: respondentID,
		Reason:            reason,
		Evidence:          evidence,
		State:             DisputeStateOpen,
		RefundAmount:      "0",
		CreatedAt:         now,
	}

	if err := m.repo.SaveDispute(ctx, dispute); err != nil {
		return nil, fmt.Errorf("failed to save dispute: %w", err)
	}

	// Transition contract to DISPUTED
	contract.State = ContractDisputed
	contract.UpdatedAt = now
	_ = m.repo.SaveServiceContract(ctx, contract)

	_ = m.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkDisputeOpened,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: contract.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        initiatorAgentID,
		AgentID:        initiatorAgentID,
		Data: map[string]interface{}{
			"dispute_id":  dispute.DisputeID,
			"contract_id": contractID,
			"respondent":  respondentID,
			"reason":      reason,
		},
	})

	return dispute, nil
}

// ResolveDispute closes a dispute with an authoritative settlement decision.
func (m *DisputeManager) ResolveDispute(
	ctx context.Context,
	disputeID string,
	state DisputeState,
	notes string,
	refundAmount string,
) (*DisputeRecord, error) {
	dispute, err := m.repo.GetDispute(ctx, disputeID)
	if err != nil {
		return nil, err
	}

	if dispute.State != DisputeStateOpen && dispute.State != DisputeStateUnderReview {
		return nil, fmt.Errorf("%w: dispute is already %s", ErrDisputeNotOpen, dispute.State)
	}

	now := time.Now().UTC()
	if err := m.repo.UpdateDisputeState(ctx, disputeID, state, notes, refundAmount, &now); err != nil {
		return nil, err
	}

	dispute.State = state
	dispute.ResolutionNotes = notes
	dispute.RefundAmount = refundAmount
	dispute.ResolvedAt = &now

	// Apply dispute penalty to respondent's trust profile
	profile, err := m.repo.GetTrustProfile(ctx, dispute.RespondentAgentID)
	if err == nil && profile != nil {
		profile.DisputeCount++
		profile.LastActiveAt = now
		profile.UpdatedAt = now
		_ = m.repo.SaveTrustProfile(ctx, profile)
	}

	_ = m.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkDisputeResolved,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: dispute.OrganizationID,
		ActorType:      "SYSTEM",
		ActorID:        "dispute_manager",
		Data: map[string]interface{}{
			"dispute_id":    disputeID,
			"state":         string(state),
			"refund_amount": refundAmount,
			"notes":         notes,
		},
	})

	return dispute, nil
}
