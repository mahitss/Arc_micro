package execution

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrIntentNotFound             = errors.New("payment intent not found")
	ErrAlreadyConfirmed           = errors.New("payment intent has already executed and confirmed on-chain")
	ErrAlreadyExecuting           = errors.New("payment intent is currently executing or submitted")
	ErrExecutionNotPermitted      = errors.New("payment intent status does not permit execution")
	ErrPolicyDenied               = errors.New("execution blocked: payment intent was denied by policy (hard denial invariant)")
	ErrIntentExpired              = errors.New("execution blocked: payment intent has expired")
	ErrGlobalExecutionPaused      = errors.New("execution blocked: global payment execution kill switch is active")
	ErrOrganizationPaused         = errors.New("execution blocked: organization is paused")
	ErrAgentNotActive             = errors.New("execution blocked: agent is paused or not active")
	ErrServiceNotActive           = errors.New("execution blocked: target service is disabled or not active")
	ErrApprovalRequired           = errors.New("execution blocked: payment requires valid human approval")
	ErrApprovalExpired            = errors.New("execution blocked: human approval has expired")
	ErrAgentSelfApprovalProhibited = errors.New("execution blocked: agent cannot approve its own payment")
)

// Clock provides current time for deterministic testing.
type Clock interface {
	Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }

// Gate defines the execution eligibility check contract.
type Gate interface {
	CheckEligibility(ctx context.Context, intentID string) (*intent.PaymentIntent, error)
}

// DefaultGate enforces the 10-point execution safety matrix in deterministic order.
type DefaultGate struct {
	repo       storage.Repository
	emergency  emergency.Controller
	clock      Clock
}

// NewExecutionGate creates a new DefaultGate instance.
func NewExecutionGate(repo storage.Repository, em emergency.Controller, clock Clock) *DefaultGate {
	if clock == nil {
		clock = RealClock{}
	}
	return &DefaultGate{
		repo:      repo,
		emergency: em,
		clock:     clock,
	}
}

// CheckEligibility evaluates all 10 prerequisites in strict precedence before permitting execution.
func (g *DefaultGate) CheckEligibility(ctx context.Context, intentID string) (*intent.PaymentIntent, error) {
	now := g.clock.Now()

	// 1. PaymentIntent exists
	pi, err := g.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, ErrIntentNotFound
	}

	// 2. Terminal & Duplicate Execution Checks
	if pi.Status == intent.StatusConfirmed {
		return nil, ErrAlreadyConfirmed
	}
	if pi.Status == intent.StatusExecuting || pi.Status == intent.StatusSubmitted {
		return nil, ErrAlreadyExecuting
	}
	if pi.Status == intent.StatusDenied || pi.Status == intent.StatusRejected ||
		pi.Status == intent.StatusCancelled || pi.Status == intent.StatusFailed {
		return nil, fmt.Errorf("%w: current status %s", ErrExecutionNotPermitted, pi.Status)
	}

	// 3. CRITICAL INVARIANT: Hard Policy Denial can NEVER become executable
	if pi.PolicyDecision == "DENY" {
		return nil, ErrPolicyDenied
	}

	// 4. Intent Expiration Check
	if now.After(pi.ExpiresAt) {
		_ = g.repo.UpdateIntentStatus(ctx, intentID, intent.StatusExpired, now)
		return nil, ErrIntentExpired
	}

	// 5. Global Execution Kill Switch Check
	if g.emergency != nil {
		paused, err := g.emergency.IsGlobalExecutionPaused(ctx)
		if err != nil || paused {
			return nil, ErrGlobalExecutionPaused
		}
	}

	// 6. Organization Status Check
	orgID := pi.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	org, err := g.repo.GetOrganization(ctx, orgID)
	if err == nil && org != nil {
		if org.Status == "PAUSED" || org.Status == "SUSPENDED" {
			return nil, ErrOrganizationPaused
		}
	}

	// 7. Agent Status Check
	ag, err := g.repo.GetAgent(ctx, pi.AgentID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrAgentNotActive, err)
	}
	if ag.Status != "ACTIVE" {
		return nil, fmt.Errorf("%w: agent status is %s", ErrAgentNotActive, ag.Status)
	}

	// 8. Service Status Check
	srv, err := g.repo.GetService(ctx, pi.ServiceID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrServiceNotActive, err)
	}
	if !srv.Enabled {
		return nil, ErrServiceNotActive
	}

	// 9. Human Approval Check
	if pi.RequiresApproval || pi.Status == intent.StatusApprovalRequired {
		app, err := g.repo.GetApprovalByIntent(ctx, intentID)
		if err != nil || app == nil {
			return nil, ErrApprovalRequired
		}

		if app.Status != "APPROVED" {
			return nil, fmt.Errorf("%w: approval status is %s", ErrApprovalRequired, app.Status)
		}

		// Check approval expiration
		if !app.ExpiresAt.IsZero() && now.After(app.ExpiresAt) {
			_ = g.repo.UpdateApprovalStatus(ctx, app.ID, "EXPIRED", "", "Approval TTL elapsed", now)
			return nil, ErrApprovalExpired
		}

		// Prevent Agent Self-Approval
		if strings.EqualFold(app.ApprovedBy, pi.AgentID) {
			return nil, ErrAgentSelfApprovalProhibited
		}
	}

	// 10. Status must be AUTHORIZED or APPROVED
	if !intent.CanExecute(pi.Status) {
		return nil, fmt.Errorf("%w: status %s is not executable", ErrExecutionNotPermitted, pi.Status)
	}

	return pi, nil
}
