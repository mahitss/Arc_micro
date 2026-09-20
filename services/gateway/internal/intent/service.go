package intent

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrIntentNotFound    = errors.New("payment intent not found")
	ErrIntentExpired     = errors.New("payment intent has expired")
	ErrNotAuthorized     = errors.New("payment intent must be authorized before confirmation")
	ErrAlreadyConfirmed  = errors.New("payment intent is already confirmed")
	ErrAlreadyExecuting  = errors.New("payment intent is currently being executed")
	ErrExecutionFailed   = errors.New("payment intent execution failed")
)

// Clock allows injecting time for deterministic testing.
type Clock interface {
	Now() time.Time
}

// RealClock returns the current system time.
type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }

// Repository defines the minimal storage operations needed by IntentService.
type Repository interface {
	SaveIntent(ctx context.Context, pi *PaymentIntent) error
	GetIntent(ctx context.Context, id string) (*PaymentIntent, error)
	UpdateIntentStatus(ctx context.Context, id string, status IntentStatus, updatedAt time.Time) error
	CompareAndSwapIntentStatus(ctx context.Context, id string, expectedStatus IntentStatus, newStatus IntentStatus, updatedAt time.Time) (bool, error)
	SaveExecution(ctx context.Context, ex *PaymentExecutionRecord) error
	GetExecution(ctx context.Context, intentID string) (*PaymentExecutionRecord, error)
}

// ExecutionService defines the execution boundary for payment confirmation.
type ExecutionService interface {
	ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
}

// CreateIntentParams holds parameters for creating a new PaymentIntent.
type CreateIntentParams struct {
	AgentID       string
	VaultAddress  string
	ServiceID     string
	Amount        string
	Asset         string
	Purpose       string
	Justification string
}

// Service manages the lifecycle, authorization, and confirmation of PaymentIntents.
type Service struct {
	repo          Repository
	policyClient  policy.Client
	execService   ExecutionService
	registry      *registry.Registry
	clock         Clock
	ttl           time.Duration
	autoExecution bool
}

// NewService creates a new intent Service.
func NewService(
	repo Repository,
	policyClient policy.Client,
	execService ExecutionService,
	reg *registry.Registry,
	clock Clock,
	ttl time.Duration,
	autoExecution bool,
) *Service {
	if clock == nil {
		clock = RealClock{}
	}
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	return &Service{
		repo:          repo,
		policyClient:  policyClient,
		execService:   execService,
		registry:      reg,
		clock:         clock,
		ttl:           ttl,
		autoExecution: autoExecution,
	}
}

// CreateIntent validates service constraints and persists a new PaymentIntent in CREATED state.
func (s *Service) CreateIntent(ctx context.Context, params CreateIntentParams) (*PaymentIntent, error) {
	// 1. Resolve registered service and validate amount/asset bounds
	regService, err := s.registry.ValidatePayment(params.ServiceID, params.Amount, params.Asset)
	if err != nil {
		return nil, err
	}

	// 2. Generate secure intent ID
	intentID := generateIntentID()
	now := s.clock.Now()
	expiresAt := now.Add(s.ttl)

	intent := &PaymentIntent{
		IntentID:      intentID,
		AgentID:       params.AgentID,
		VaultAddress:  params.VaultAddress,
		Recipient:     regService.Recipient, // Server-resolved approved recipient
		Amount:        params.Amount,
		Asset:         params.Asset,
		Purpose:       params.Purpose,
		ServiceID:     params.ServiceID,
		Justification: params.Justification,
		Status:        StatusCreated,
		CreatedAt:     now,
		ExpiresAt:     expiresAt,
		UpdatedAt:     now,
	}

	if err := s.repo.SaveIntent(ctx, intent); err != nil {
		return nil, fmt.Errorf("failed to save payment intent: %w", err)
	}

	return intent, nil
}

// AuthorizeIntent forwards the intent to the Rust Policy Engine and records the decision.
func (s *Service) AuthorizeIntent(ctx context.Context, intentID string) (*PaymentIntent, *domain.AuthorizationDecision, error) {
	intent, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, nil, ErrIntentNotFound
	}

	// Check expiration
	if s.clock.Now().After(intent.ExpiresAt) {
		_ = s.repo.UpdateIntentStatus(ctx, intentID, StatusExpired, s.clock.Now())
		intent.Status = StatusExpired
		return intent, nil, ErrIntentExpired
	}

	// Idempotency: if already AUTHORIZED, APPROVAL_REQUIRED, or DENIED, return current state
	if intent.Status == StatusAuthorized {
		decision := domain.AuthorizationDecision{
			RequestID:  intent.IntentID,
			Decision:   domain.DecisionAllow,
			ReasonCode: domain.ReasonApproved,
			Reason:     "Payment satisfies the configured policy.",
		}
		return intent, &decision, nil
	}
	if intent.Status == StatusApprovalRequired {
		decision := domain.AuthorizationDecision{
			RequestID:  intent.IntentID,
			Decision:   domain.DecisionApprovalRequired,
			ReasonCode: domain.ReasonApprovalRequired,
			Reason:     "Payment requires human approval before it can be executed.",
		}
		return intent, &decision, nil
	}
	if intent.Status == StatusDenied {
		decision := domain.AuthorizationDecision{
			RequestID:  intent.IntentID,
			Decision:   domain.DecisionDeny,
			ReasonCode: domain.ReasonDailyLimitExceeded,
			Reason:     "Payment was previously denied by policy.",
		}
		return intent, &decision, nil
	}

	// Forward to Rust Policy Engine
	req := domain.PaymentRequest{
		RequestID:      intent.IntentID,
		AgentID:        intent.AgentID,
		OrganizationID: intent.OrganizationID,
		ServiceID:      intent.ServiceID,
		Recipient:      intent.Recipient,
		Amount:         intent.Amount,
		Asset:          intent.Asset,
		Purpose:        intent.Purpose,
	}

	decision, err := s.policyClient.Authorize(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	now := s.clock.Now()
	var newStatus IntentStatus
	if decision.Decision == domain.DecisionAllow {
		newStatus = StatusAuthorized
	} else if decision.Decision == domain.DecisionApprovalRequired {
		newStatus = StatusApprovalRequired
	} else {
		newStatus = StatusDenied
	}

	intent.PolicyDecision = string(decision.Decision)
	intent.RequiresApproval = (decision.Decision == domain.DecisionApprovalRequired)

	if err := s.repo.UpdateIntentStatus(ctx, intentID, newStatus, now); err != nil {
		return nil, nil, fmt.Errorf("failed to update intent status: %w", err)
	}

	intent.Status = newStatus
	intent.UpdatedAt = now
	return intent, &decision, nil

}

// ConfirmIntent confirms and executes an authorized, non-expired intent.
func (s *Service) ConfirmIntent(ctx context.Context, intentID string) (*PaymentIntent, *blockchain.PaymentExecutionResult, error) {
	intent, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, nil, ErrIntentNotFound
	}

	// Check expiration
	if s.clock.Now().After(intent.ExpiresAt) {
		_ = s.repo.UpdateIntentStatus(ctx, intentID, StatusExpired, s.clock.Now())
		intent.Status = StatusExpired
		return intent, nil, ErrIntentExpired
	}

	// Idempotency: if already confirmed, return existing result without re-executing
	if intent.Status == StatusConfirmed {
		ex, _ := s.repo.GetExecution(ctx, intentID)
		txHash := ""
		if ex != nil {
			txHash = ex.TransactionHash
		}
		res := &blockchain.PaymentExecutionResult{
			RequestID:       intent.IntentID,
			Status:          blockchain.StateConfirmed,
			TransactionHash: txHash,
			Vault:           intent.VaultAddress,
			Recipient:       intent.Recipient,
			Amount:          intent.Amount,
		}
		return intent, res, nil
	}

	// Must be AUTHORIZED before execution
	if intent.Status != StatusAuthorized {
		return nil, nil, fmt.Errorf("%w (current status: %s)", ErrNotAuthorized, intent.Status)
	}

	// Atomic compare-and-swap transition to EXECUTING prevents race conditions/double-execution
	now := s.clock.Now()
	if err := ValidateTransition(intent.Status, StatusExecuting); err != nil {
		return nil, nil, err
	}

	swapped, err := s.repo.CompareAndSwapIntentStatus(ctx, intentID, StatusAuthorized, StatusExecuting, now)
	if err != nil {
		return nil, nil, err
	}
	if !swapped {
		// Concurrent request already won the race. Re-fetch current state to handle idempotently.
		recheck, err := s.repo.GetIntent(ctx, intentID)
		if err != nil {
			return nil, nil, err
		}
		if recheck.Status == StatusConfirmed {
			ex, _ := s.repo.GetExecution(ctx, intentID)
			txHash := ""
			if ex != nil {
				txHash = ex.TransactionHash
			}
			res := &blockchain.PaymentExecutionResult{
				RequestID:       recheck.IntentID,
				Status:          blockchain.StateConfirmed,
				TransactionHash: txHash,
				Vault:           recheck.VaultAddress,
				Recipient:       recheck.Recipient,
				Amount:          recheck.Amount,
			}
			return recheck, res, nil
		}
		if recheck.Status == StatusExecuting {
			return nil, nil, ErrAlreadyExecuting
		}
		if recheck.Status == StatusExpired {
			return nil, nil, ErrIntentExpired
		}
		return nil, nil, fmt.Errorf("%w (current status: %s)", ErrNotAuthorized, recheck.Status)
	}

	intent.Status = StatusExecuting
	intent.UpdatedAt = now

	// Invoke ExecutionService
	execReq := blockchain.PaymentExecutionRequest{
		RequestID:    intent.IntentID,
		AgentID:      intent.AgentID,
		VaultAddress: intent.VaultAddress,
		Recipient:    intent.Recipient,
		Amount:       intent.Amount,
		Purpose:      intent.Purpose,
	}

	execResult, err := s.execService.ExecutePayment(ctx, execReq)
	now = s.clock.Now()

	if err != nil {
		_ = s.repo.UpdateIntentStatus(ctx, intentID, StatusFailed, now)
		intent.Status = StatusFailed
		intent.UpdatedAt = now
		_ = s.repo.SaveExecution(ctx, &PaymentExecutionRecord{
			IntentID:  intentID,
			Status:    string(StatusFailed),
			ErrorCode: err.Error(),
		})
		return intent, nil, fmt.Errorf("%w: %v", ErrExecutionFailed, err)
	}

	// Handle execution result states
	if execResult.Status == blockchain.StateConfirmed {
		_ = s.repo.UpdateIntentStatus(ctx, intentID, StatusConfirmed, now)
		intent.Status = StatusConfirmed
		intent.UpdatedAt = now
		_ = s.repo.SaveExecution(ctx, &PaymentExecutionRecord{
			IntentID:        intentID,
			TransactionHash: execResult.TransactionHash,
			Status:          string(StatusConfirmed),
			ConfirmedAt:     &now,
		})
	} else if execResult.Status == blockchain.StateExecutionDisabled {
		// Live execution disabled: keep intent in AUTHORIZED state so it can be viewed or confirmed later
		_ = s.repo.UpdateIntentStatus(ctx, intentID, StatusAuthorized, now)
		intent.Status = StatusAuthorized
		intent.UpdatedAt = now
	}

	return intent, execResult, nil
}

// GetIntent retrieves an intent and its execution record.
func (s *Service) GetIntent(ctx context.Context, intentID string) (*PaymentIntent, *PaymentExecutionRecord, error) {
	intent, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, nil, ErrIntentNotFound
	}
	ex, _ := s.repo.GetExecution(ctx, intentID)
	return intent, ex, nil
}

func generateIntentID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("intent_%s", hex.EncodeToString(b))
}
