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
	ErrSelfHiringProhibited       = errors.New("requester and provider agents must be distinct")
	ErrDelegationDepthOverflow    = errors.New("delegation depth exceeds maximum allowed of 3")
	ErrContractExpiredOrInvalid   = errors.New("contract has expired or is invalid")
	ErrContractWrongState         = errors.New("contract is not in required state for this operation")
	ErrParentBudgetExceeded       = errors.New("delegated sub-contract price exceeds parent contract budget envelope")
)

// ContractStorageRepository extends StorageRepository with contract-specific methods.
type ContractStorageRepository interface {
	StorageRepository
	SaveServiceContract(ctx context.Context, c *AgentServiceContract) error
	GetServiceContract(ctx context.Context, id string) (*AgentServiceContract, error)
	ListServiceContracts(ctx context.Context, orgID string) ([]*AgentServiceContract, error)
	UpdateServiceContractState(ctx context.Context, id string, state ContractState, updatedAt time.Time) error
}

// ContractManager manages the lifecycle of AgentServiceContracts.
// INVARIANT: Contracts define economic intent; financial authorization is deferred to AgentPay's payment pipeline.
type ContractManager struct {
	repo ContractStorageRepository
}

// NewContractManager creates a new ContractManager.
func NewContractManager(repo ContractStorageRepository) *ContractManager {
	return &ContractManager{repo: repo}
}

// CreateContract initializes and validates a new service contract proposal.
func (m *ContractManager) CreateContract(ctx context.Context, c *AgentServiceContract) (*AgentServiceContract, error) {
	if c == nil {
		return nil, errors.New("contract cannot be nil")
	}

	// 1. Invariant: Distinct agents
	if strings.EqualFold(c.RequesterAgentID, c.ProviderAgentID) {
		return nil, ErrSelfHiringProhibited
	}

	// 2. Check provider status
	provider, err := m.repo.GetNetworkIdentity(ctx, c.ProviderAgentID)
	if err == nil && provider != nil {
		if provider.Status == IdentityStatusRevoked || provider.Status == IdentityStatusSuspended {
			return nil, fmt.Errorf("%w: provider agent is %s", ErrAgentSuspendedOrRevoked, provider.Status)
		}
	}

	// 3. Delegation Depth Bound (INV-27)
	if c.DelegationDepth > MaxAgentDelegationDepth {
		return nil, fmt.Errorf("%w: requested depth %d exceeds ceiling %d", ErrDelegationDepthOverflow, c.DelegationDepth, MaxAgentDelegationDepth)
	}

	// 4. Parent Envelope Constraint (INV-25, INV-26)
	if c.ParentContractID != "" {
		parent, err := m.repo.GetServiceContract(ctx, c.ParentContractID)
		if err != nil {
			return nil, fmt.Errorf("parent contract not found: %w", err)
		}
		pPrice, _ := new(big.Int).SetString(parent.Price, 10)
		cPrice, _ := new(big.Int).SetString(c.Price, 10)
		if pPrice != nil && cPrice != nil && cPrice.Cmp(pPrice) > 0 {
			return nil, fmt.Errorf("%w: child price %s > parent price %s", ErrParentBudgetExceeded, c.Price, parent.Price)
		}
	}

	now := time.Now().UTC()
	if c.ContractID == "" {
		c.ContractID = fmt.Sprintf("contract_%d", now.UnixNano())
	}
	if c.Currency == "" {
		c.Currency = "USDC"
	}
	if c.Expiration.IsZero() {
		c.Expiration = now.Add(1 * time.Hour)
	}
	if c.Deadline.IsZero() {
		c.Deadline = now.Add(2 * time.Hour)
	}

	c.State = ContractProposed
	c.CreatedAt = now
	c.UpdatedAt = now

	if err := m.repo.SaveServiceContract(ctx, c); err != nil {
		return nil, fmt.Errorf("failed to save contract: %w", err)
	}

	_ = m.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkContractCreated,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: c.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        c.RequesterAgentID,
		AgentID:        c.RequesterAgentID,
		Data: map[string]interface{}{
			"contract_id":      c.ContractID,
			"requester_id":     c.RequesterAgentID,
			"provider_id":      c.ProviderAgentID,
			"capability":       c.Capability,
			"price":            c.Price,
			"delegation_depth": c.DelegationDepth,
		},
	})

	return c, nil
}

// AcceptContract transitions a proposed contract to ACCEPTED state.
func (m *ContractManager) AcceptContract(ctx context.Context, contractID, acceptorAgentID string) (*AgentServiceContract, error) {
	c, err := m.repo.GetServiceContract(ctx, contractID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if now.After(c.Expiration) {
		_ = m.repo.UpdateServiceContractState(ctx, contractID, ContractExpired, now)
		return nil, ErrContractExpiredOrInvalid
	}

	if c.State != ContractProposed && c.State != ContractNegotiating {
		return nil, fmt.Errorf("%w: current state is %s", ErrContractWrongState, c.State)
	}

	c.State = ContractAccepted
	c.UpdatedAt = now

	if err := m.repo.SaveServiceContract(ctx, c); err != nil {
		return nil, err
	}

	_ = m.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkContractAccepted,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: c.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        acceptorAgentID,
		AgentID:        acceptorAgentID,
		Data: map[string]interface{}{
			"contract_id": c.ContractID,
			"accepted_by": acceptorAgentID,
			"price":       c.Price,
		},
	})

	return c, nil
}

// CancelContract terminates a contract, releasing any pending holds.
func (m *ContractManager) CancelContract(ctx context.Context, contractID, reason string) error {
	c, err := m.repo.GetServiceContract(ctx, contractID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	if c.State == ContractCompleted || c.State == ContractFailed || c.State == ContractCancelled {
		return fmt.Errorf("contract is already terminal: %s", c.State)
	}

	if err := m.repo.UpdateServiceContractState(ctx, contractID, ContractCancelled, now); err != nil {
		return err
	}

	return nil
}
