package agent

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrUnauthorizedToolCall = errors.New("unauthorized tool call: agent does not possess permission for this tool")
	ErrToolExecutionFailed  = errors.New("tool execution failed")
)

const (
	ToolNameSearchService  = "search_service"
	ToolNameRequestPayment = "request_payment"
	ToolNameCheckPayment   = "check_payment"
	ToolNameContinueTask   = "continue_task"
)

// AllowedTools contains the strictly whitelisted tools granted to the agent.
var AllowedTools = map[string]bool{
	ToolNameSearchService:  true,
	ToolNameRequestPayment: true,
	ToolNameCheckPayment:   true,
	ToolNameContinueTask:   true,
}

// IsToolAllowed verifies that a tool name is permitted.
func IsToolAllowed(name string) bool {
	return AllowedTools[name]
}

// SearchServiceInput represents query arguments for service discovery.
type SearchServiceInput struct {
	Query string `json:"query,omitempty"`
}

// DiscoveredService describes a service returned to the agent.
type DiscoveredService struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Asset    string `json:"asset"`
	MaxPrice string `json:"max_price"`
	Enabled  bool   `json:"enabled"`
}

// RequestPaymentInput represents the strict schema for the request_payment tool.
type RequestPaymentInput struct {
	ServiceID     string `json:"service_id"`
	Amount        string `json:"amount"` // micro-USDC integer base units string
	Asset         string `json:"asset"`  // Must be "USDC"
	Purpose       string `json:"purpose"`
	Justification string `json:"justification"`
}

// RequestPaymentOutput represents the structured output of the request_payment tool.
type RequestPaymentOutput struct {
	PaymentIntentID  string `json:"payment_intent_id"`
	Status           string `json:"status"` // CREATED, AUTHORIZED, APPROVAL_REQUIRED, DENIED
	Decision         string `json:"decision"`
	Reason           string `json:"reason"`
	RiskScore        *int   `json:"risk_score,omitempty"`
	RiskLevel        string `json:"risk_level,omitempty"`
	RequiresApproval bool   `json:"requires_approval"`
	TransactionHash  string `json:"transaction_hash,omitempty"`
}

// CheckPaymentInput represents input for polling payment status.
type CheckPaymentInput struct {
	PaymentIntentID string `json:"payment_intent_id"`
}

// CheckPaymentOutput represents output of check_payment tool.
type CheckPaymentOutput struct {
	PaymentIntentID string `json:"payment_intent_id"`
	Status          string `json:"status"`
	TransactionHash string `json:"transaction_hash,omitempty"`
}

// ContinueTaskInput represents input for continuing the task after payment confirmation.
type ContinueTaskInput struct {
	PaymentIntentID string `json:"payment_intent_id"`
	ServiceID       string `json:"service_id"`
	TaskContext     string `json:"task_context"`
}

// ToolExecutor executes allowed tools safely on behalf of the agent.
type ToolExecutor struct {
	registry      *registry.Registry
	intentService *intent.Service
	provider      ExternalServiceProvider
	agentID       string
	vaultAddress  string
}

// NewToolExecutor creates a new ToolExecutor with strictly bounded tools.
func NewToolExecutor(
	reg *registry.Registry,
	intentSvc *intent.Service,
	provider ExternalServiceProvider,
	agentID string,
	vaultAddress string,
) *ToolExecutor {
	return &ToolExecutor{
		registry:      reg,
		intentService: intentSvc,
		provider:      provider,
		agentID:       agentID,
		vaultAddress:  vaultAddress,
	}
}

// SearchService discovers approved services matching the query.
func (e *ToolExecutor) SearchService(ctx context.Context, input SearchServiceInput) ([]DiscoveredService, error) {
	services := e.registry.List()
	var results []DiscoveredService
	q := strings.ToLower(strings.TrimSpace(input.Query))

	for _, s := range services {
		if !s.Enabled {
			continue
		}
		if q == "" || strings.Contains(strings.ToLower(s.ID), q) || strings.Contains(strings.ToLower(s.Name), q) {
			results = append(results, DiscoveredService{
				ID:       s.ID,
				Name:     s.Name,
				Asset:    s.Asset,
				MaxPrice: s.MaxPrice,
				Enabled:  s.Enabled,
			})
		}
	}
	return results, nil
}

// RequestPayment creates and authorizes a payment intent through AgentPay.
func (e *ToolExecutor) RequestPayment(ctx context.Context, input RequestPaymentInput) (*RequestPaymentOutput, error) {
	// 1. Strict schema validation
	if strings.TrimSpace(input.ServiceID) == "" {
		return nil, ErrMissingService
	}
	if strings.TrimSpace(input.Amount) == "" {
		return nil, ErrMissingAmount
	}
	if strings.TrimSpace(input.Asset) == "" {
		return nil, ErrMissingAsset
	}
	if strings.TrimSpace(input.Purpose) == "" {
		return nil, ErrMissingPurpose
	}

	// 2. Resolve service and ensure existence
	regService, err := e.registry.Resolve(input.ServiceID)
	if err != nil {
		return nil, err
	}

	// 3. Create payment intent in AgentPay
	pi, err := e.intentService.CreateIntent(ctx, intent.CreateIntentParams{
		AgentID:       e.agentID,
		VaultAddress:  e.vaultAddress,
		ServiceID:     regService.ID,
		Amount:        input.Amount,
		Asset:         input.Asset,
		Purpose:       input.Purpose,
		Justification: input.Justification,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create payment intent: %w", err)
	}

	// 4. Authorize intent through Rust policy and risk engines
	authIntent, decision, err := e.intentService.AuthorizeIntent(ctx, pi.IntentID)
	if err != nil {
		return nil, fmt.Errorf("policy authorization failed: %w", err)
	}

	output := &RequestPaymentOutput{
		PaymentIntentID:  authIntent.IntentID,
		Status:           string(authIntent.Status),
		Decision:         string(decision.Decision),
		Reason:           decision.Reason,
		RequiresApproval: authIntent.RequiresApproval,
	}

	return output, nil
}

// CheckPayment retrieves the current status of a payment intent.
func (e *ToolExecutor) CheckPayment(ctx context.Context, input CheckPaymentInput) (*CheckPaymentOutput, error) {
	pi, ex, err := e.intentService.GetIntent(ctx, input.PaymentIntentID)
	if err != nil {
		return nil, err
	}

	txHash := ""
	if ex != nil {
		txHash = ex.TransactionHash
	}

	return &CheckPaymentOutput{
		PaymentIntentID: pi.IntentID,
		Status:          string(pi.Status),
		TransactionHash: txHash,
	}, nil
}
