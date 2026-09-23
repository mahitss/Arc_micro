package network

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrCyclicDelegationDetected = errors.New("cyclic delegation dependency detected; contract would form an infinite loop")
	ErrMaxDepthExceeded         = errors.New("delegation depth exceeds maximum ceiling of 3")
	ErrSubcontractPriceExceeded = errors.New("subcontract price exceeds parent contract allocation")
)

// DelegationManager governs cross-agent task delegation and enforces strict bounds.
// INVARIANT INV-25, INV-26: Shared economic envelope; child contracts draw from parent reservation.
// INVARIANT INV-27: Strict bounded delegation depth (maximum 3); cyclic dependencies rejected.
type DelegationManager struct {
	repo ContractStorageRepository
}

// NewDelegationManager creates a new DelegationManager.
func NewDelegationManager(repo ContractStorageRepository) *DelegationManager {
	return &DelegationManager{repo: repo}
}

// DelegateSubcontract creates a validated child contract ensuring anti-cycle and depth invariants.
func (d *DelegationManager) DelegateSubcontract(
	ctx context.Context,
	parentContractID string,
	subcontractorAgentID string,
	capability string,
	subPriceBaseUnits string,
	deadline time.Time,
	inputSpec map[string]interface{},
) (*AgentServiceContract, error) {
	parent, err := d.repo.GetServiceContract(ctx, parentContractID)
	if err != nil {
		return nil, fmt.Errorf("parent contract not found: %w", err)
	}

	// 1. Invariant: Max Delegation Depth (Ceiling = 3)
	childDepth := parent.DelegationDepth + 1
	if childDepth > MaxAgentDelegationDepth {
		return nil, fmt.Errorf("%w (parent depth: %d, child would be %d)", ErrMaxDepthExceeded, parent.DelegationDepth, childDepth)
	}

	// 2. Invariant: Anti-Cycle Verification
	if err := d.detectCycles(ctx, parent, subcontractorAgentID); err != nil {
		return nil, err
	}

	// 3. Invariant: Shared Economic Envelope (Subcontract Price <= Parent Price)
	subPrice, ok1 := new(big.Int).SetString(subPriceBaseUnits, 10)
	parentPrice, ok2 := new(big.Int).SetString(parent.Price, 10)
	if ok1 && ok2 && parentPrice.Sign() > 0 && subPrice.Cmp(parentPrice) > 0 {
		return nil, fmt.Errorf("%w: sub-price %s > parent budget %s", ErrSubcontractPriceExceeded, subPriceBaseUnits, parent.Price)
	}

	now := time.Now().UTC()
	rootMissionID := parent.RootMissionID
	if rootMissionID == "" {
		rootMissionID = parent.MissionID
	}

	childContract := &AgentServiceContract{
		ContractID:         fmt.Sprintf("contract_del_%d", now.UnixNano()),
		OrganizationID:     parent.OrganizationID,
		RequesterAgentID:   parent.ProviderAgentID, // Parent's provider becomes the child's requester
		ProviderAgentID:    subcontractorAgentID,
		Capability:         capability,
		MissionID:          parent.MissionID,
		RootMissionID:      rootMissionID,
		ParentContractID:   parent.ContractID,
		DelegationDepth:    childDepth,
		InputSpec:          inputSpec,
		Price:              subPriceBaseUnits,
		Currency:           parent.Currency,
		BudgetCeiling:      parent.Price,
		Deadline:           deadline,
		Expiration:         now.Add(1 * time.Hour),
		VerificationPolicy: parent.VerificationPolicy,
		CancellationPolicy: parent.CancellationPolicy,
		DisputePolicy:      parent.DisputePolicy,
		PaymentTerms:       "ON_VERIFIED_RESULT",
		State:              ContractProposed,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := d.repo.SaveServiceContract(ctx, childContract); err != nil {
		return nil, fmt.Errorf("failed to save child contract: %w", err)
	}

	_ = d.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkDelegationStarted,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: parent.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        parent.ProviderAgentID,
		AgentID:        parent.ProviderAgentID,
		Data: map[string]interface{}{
			"parent_contract_id": parent.ContractID,
			"child_contract_id":  childContract.ContractID,
			"subcontractor_id":   subcontractorAgentID,
			"delegation_depth":   childDepth,
			"price":              subPriceBaseUnits,
		},
	})

	return childContract, nil
}

// detectCycles walks the delegation ancestry to ensure the target agent is not in the ancestor chain.
func (d *DelegationManager) detectCycles(ctx context.Context, parent *AgentServiceContract, targetAgentID string) error {
	visited := make(map[string]bool)
	visited[strings.ToLower(targetAgentID)] = true

	current := parent
	for current != nil {
		// If ancestor requester or provider matches target, a cycle exists
		if strings.EqualFold(current.RequesterAgentID, targetAgentID) || strings.EqualFold(current.ProviderAgentID, targetAgentID) {
			return fmt.Errorf("%w: agent %s already exists in delegation chain", ErrCyclicDelegationDetected, targetAgentID)
		}

		if current.ParentContractID == "" {
			break
		}

		ancestor, err := d.repo.GetServiceContract(ctx, current.ParentContractID)
		if err != nil {
			break
		}
		current = ancestor
	}

	return nil
}
