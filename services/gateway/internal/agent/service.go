package agent

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrTaskEmpty             = errors.New("task text cannot be empty")
	ErrTaskTooLong           = errors.New("task text exceeds maximum allowed length of 4096 bytes")
	ErrAgentIDRequired       = errors.New("agent_id is required")
	ErrMissingService        = errors.New("ai returned payment required but omitted service")
	ErrMissingAmount         = errors.New("ai returned payment required but omitted amount")
	ErrInvalidAmountFormat   = errors.New("ai returned invalid monetary amount (must be positive integer base units)")
	ErrMissingAsset          = errors.New("ai returned payment required but omitted asset")
	ErrMissingPurpose        = errors.New("ai returned payment required but omitted purpose")
	ErrRecipientManipulation = errors.New("ai attempted recipient manipulation (address does not match registered service recipient)")
)

const MaxTaskLength = 4096

// TaskResponse represents the API response for an agent task evaluation.
type TaskResponse struct {
	TaskID        string               `json:"task_id"`
	Status        string               `json:"status"` // "PAYMENT_REQUIRED" or "NO_PAYMENT_REQUIRED"
	PaymentIntent *intent.PaymentIntent `json:"payment_intent,omitempty"`
}

// Service orchestrates AI task processing, schema validation, and intent creation.
type Service struct {
	model         AgentModel
	intentService *intent.Service
	registry      *registry.Registry
	autoExecution bool
}

// NewService creates a new agent Service.
func NewService(
	model AgentModel,
	intentService *intent.Service,
	reg *registry.Registry,
	autoExecution bool,
) *Service {
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	return &Service{
		model:         model,
		intentService: intentService,
		registry:      reg,
		autoExecution: autoExecution,
	}
}

// ProcessTask receives a high-level user task, evaluates it with the AI model, and produces a payment intent if required.
func (s *Service) ProcessTask(ctx context.Context, task AgentTask) (*TaskResponse, error) {
	// 1. Validate inputs
	if strings.TrimSpace(task.AgentID) == "" {
		return nil, ErrAgentIDRequired
	}
	trimmedTask := strings.TrimSpace(task.Task)
	if trimmedTask == "" {
		return nil, ErrTaskEmpty
	}
	if len(task.Task) > MaxTaskLength {
		return nil, ErrTaskTooLong
	}

	taskID := generateTaskID()

	// 2. Call AI model (untrusted output)
	aiResp, err := s.model.GeneratePaymentIntent(ctx, task)
	if err != nil {
		return nil, fmt.Errorf("ai model error: %w", err)
	}

	// 3. If no payment required, return immediately
	if !aiResp.RequiresPayment {
		return &TaskResponse{
			TaskID: taskID,
			Status: "NO_PAYMENT_REQUIRED",
		}, nil
	}

	// 4. Strict Schema & Security Validation on AI output
	if strings.TrimSpace(aiResp.Service) == "" {
		return nil, ErrMissingService
	}
	if strings.TrimSpace(aiResp.Amount) == "" {
		return nil, ErrMissingAmount
	}
	amountBig, ok := new(big.Int).SetString(aiResp.Amount, 10)
	if !ok || amountBig.Sign() <= 0 {
		return nil, ErrInvalidAmountFormat
	}
	if strings.TrimSpace(aiResp.Asset) == "" {
		return nil, ErrMissingAsset
	}
	if strings.TrimSpace(aiResp.Purpose) == "" {
		return nil, ErrMissingPurpose
	}

	// 5. Service Registry Resolution & Security Checks
	regService, err := s.registry.Resolve(aiResp.Service)
	if err != nil {
		// Unknown or invalid service
		return nil, err
	}

	// If AI output included an explicit recipient, verify it does NOT attempt to manipulate or spoof
	if aiResp.Recipient != "" && !strings.EqualFold(aiResp.Recipient, regService.Recipient) {
		return nil, fmt.Errorf("%w: model requested %s, registered is %s", ErrRecipientManipulation, aiResp.Recipient, regService.Recipient)
	}

	// 6. Create PaymentIntent (validates max_price, asset, and persists in CREATED state)
	createdIntent, err := s.intentService.CreateIntent(ctx, intent.CreateIntentParams{
		AgentID:       task.AgentID,
		VaultAddress:  task.VaultAddress,
		ServiceID:     aiResp.Service,
		Amount:        aiResp.Amount,
		Asset:         aiResp.Asset,
		Purpose:       aiResp.Purpose,
		Justification: aiResp.Justification,
	})
	if err != nil {
		return nil, err
	}

	// 7. Auto-execution support if configured
	if s.autoExecution {
		// Authorize via Rust policy engine
		authIntent, decision, err := s.intentService.AuthorizeIntent(ctx, createdIntent.IntentID)
		if err == nil && authIntent.Status == intent.StatusAuthorized && decision != nil {
			// If authorized, proceed to execution
			confirmedIntent, _, _ := s.intentService.ConfirmIntent(ctx, createdIntent.IntentID)
			if confirmedIntent != nil {
				createdIntent = confirmedIntent
			}
		} else if authIntent != nil {
			createdIntent = authIntent
		}
	}

	return &TaskResponse{
		TaskID:        taskID,
		Status:        "PAYMENT_REQUIRED",
		PaymentIntent: createdIntent,
	}, nil
}

func generateTaskID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("task_%s", hex.EncodeToString(b))
}
