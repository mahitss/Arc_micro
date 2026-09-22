package economy

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrMissionNotFound        = errors.New("mission not found")
	ErrMissionInactive        = errors.New("mission is not in an active state")
	ErrAgentInactive          = errors.New("agent is paused or disabled")
	ErrOrgInactive            = errors.New("organization is suspended or inactive")
	ErrAmountExceedsRemaining = errors.New("proposed amount exceeds remaining mission budget")
	ErrAmountExceedsMaxExec   = errors.New("proposed amount exceeds maximum per-step execution limit")
	ErrServiceNotRegistered   = errors.New("service is not registered or enabled in registry")
	ErrRecipientMismatch      = errors.New("recipient address does not match authoritative registry address")
	ErrPolicyDenied           = errors.New("payment rejected by deterministic policy engine")
	ErrApprovalRequired       = errors.New("payment requires out-of-band operator approval")
)

// StateRepository defines the minimal query methods needed by the BudgetController.
type StateRepository interface {
	GetAgentStatus(ctx context.Context, id string) (string, error)
	GetOrganizationStatus(ctx context.Context, id string) (string, error)
}

// EligibilityResult contains the outcome of the 12-point pre-payment verification checklist.
type EligibilityResult struct {
	Allowed          bool
	RequiresApproval bool
	ReasonCode       string
	Reason           string
	PolicyDecision   *domain.AuthorizationDecision
	Service          *registry.Service
}

// BudgetController enforces financial invariants across missions, agents, and organizations.
type BudgetController struct {
	mu           sync.Mutex
	repo         StateRepository
	reg          *registry.Registry
	policyClient policy.Client
}

// NewBudgetController creates a BudgetController.
func NewBudgetController(repo StateRepository, reg *registry.Registry, policyClient policy.Client) *BudgetController {
	return &BudgetController{
		repo:         repo,
		reg:          reg,
		policyClient: policyClient,
	}
}

// ValidatePaymentEligibility performs the authoritative 12-point checklist before creating a payment proposal.
func (bc *BudgetController) ValidatePaymentEligibility(
	ctx context.Context,
	m *Mission,
	step *MissionStep,
	serviceID string,
	amount string,
	asset string,
) (*EligibilityResult, error) {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	// 1. Mission exists
	if m == nil {
		return nil, ErrMissionNotFound
	}

	// 2. Mission active
	if !IsActive(m.Status) {
		return nil, fmt.Errorf("%w: current status %s", ErrMissionInactive, m.Status)
	}
	if m.Deadline != nil && time.Now().UTC().After(*m.Deadline) {
		return nil, fmt.Errorf("mission deadline lapsed at %s", m.Deadline.Format(time.RFC3339))
	}

	// Parse proposed amount
	amtInt, ok := new(big.Int).SetString(amount, 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, errors.New("invalid payment amount: must be positive integer string")
	}

	// 3. Agent active
	agentStatus, err := bc.repo.GetAgentStatus(ctx, m.AgentID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve agent status: %w", err)
	}
	if agentStatus != "ACTIVE" {
		return nil, fmt.Errorf("%w: agent %s has status %s", ErrAgentInactive, m.AgentID, agentStatus)
	}

	// 4. Organization active
	orgStatus, err := bc.repo.GetOrganizationStatus(ctx, m.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve organization: %w", err)
	}
	if orgStatus != "" && orgStatus != "ACTIVE" {
		return nil, fmt.Errorf("%w: organization %s has status %s", ErrOrgInactive, m.OrganizationID, orgStatus)
	}

	// 5. Budget available & 7. Amount <= mission remaining budget
	remBudget, ok := new(big.Int).SetString(m.RemainingBudget, 10)
	if !ok || remBudget.Cmp(amtInt) < 0 {
		return nil, fmt.Errorf("%w: requested %s, remaining %s", ErrAmountExceedsRemaining, amount, m.RemainingBudget)
	}

	// 6. Amount <= transaction/step limit
	if m.MaxExecutionAmount != "" {
		maxExec, ok := new(big.Int).SetString(m.MaxExecutionAmount, 10)
		if ok && maxExec.Sign() > 0 && amtInt.Cmp(maxExec) > 0 {
			return nil, fmt.Errorf("%w: requested %s, limit %s", ErrAmountExceedsMaxExec, amount, m.MaxExecutionAmount)
		}
	}
	if step != nil && step.MaxBudget != "" {
		stepBudget, ok := new(big.Int).SetString(step.MaxBudget, 10)
		if ok && stepBudget.Sign() > 0 && amtInt.Cmp(stepBudget) > 0 {
			return nil, fmt.Errorf("%w: requested %s exceeds step max budget %s", ErrAmountExceedsMaxExec, amount, step.MaxBudget)
		}
	}

	// 8. Service allowed & registered
	svc, err := bc.reg.Resolve(serviceID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrServiceNotRegistered, err)
	}
	if !svc.Enabled || svc.TrustStatus == "DISABLED" {
		return nil, fmt.Errorf("service '%s' is disabled in registry", serviceID)
	}

	// 9. Recipient is authoritative server-side address
	recipient := svc.Recipient
	if recipient == "" {
		return nil, errors.New("service does not have an authoritative recipient configured")
	}

	// 10 & 11. Existing Policy Engine & Risk Engine approval
	var policyDecision *domain.AuthorizationDecision
	if bc.policyClient != nil {
		dec, err := bc.policyClient.Authorize(ctx, domain.PaymentRequest{
			RequestID:      fmt.Sprintf("chk_%s_%d", m.ID, time.Now().UnixNano()),
			AgentID:        m.AgentID,
			OrganizationID: m.OrganizationID,
			ServiceID:      serviceID,
			Recipient:      recipient,
			Amount:         amount,
			Asset:          asset,
			Purpose:        fmt.Sprintf("Mission %s - %s", m.ID, m.Objective),
		})
		if err != nil {
			return nil, fmt.Errorf("policy evaluation failed: %w", err)
		}
		policyDecision = &dec

		// Check decision
		if dec.Decision == domain.DecisionDeny {
			return &EligibilityResult{
				Allowed:        false,
				ReasonCode:     string(dec.ReasonCode),
				Reason:         dec.Reason,
				PolicyDecision: &dec,
				Service:        svc,
			}, fmt.Errorf("%w: reason=%s", ErrPolicyDenied, dec.Reason)
		}

		// 12. Approval requirements
		if dec.Decision == domain.DecisionApprovalRequired {
			return &EligibilityResult{
				Allowed:          true,
				RequiresApproval: true,
				ReasonCode:       string(dec.ReasonCode),
				Reason:           dec.Reason,
				PolicyDecision:   &dec,
				Service:          svc,
			}, nil
		}
	}

	return &EligibilityResult{
		Allowed:          true,
		RequiresApproval: false,
		ReasonCode:       "APPROVED",
		Reason:           "Deterministic 12-point policy checklist satisfied",
		PolicyDecision:   policyDecision,
		Service:          svc,
	}, nil
}
