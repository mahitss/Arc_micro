package agent

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrUnauthorizedToolCall = errors.New("unauthorized tool call: agent does not possess permission for this tool")
	ErrToolExecutionFailed  = errors.New("tool execution failed")
	ErrBudgetNotInitialized = errors.New("agent budget is not initialized")
)

const (
	ToolNameSearchService  = "search_service"
	ToolNameGetQuote       = "get_quote"
	ToolNameGetBudget      = "get_budget"
	ToolNameRequestPayment = "request_payment"
	ToolNameCheckPayment   = "check_payment"
	ToolNameContinueTask   = "continue_task"
)

// AllowedTools contains the strictly whitelisted tools granted to the agent.
var AllowedTools = map[string]bool{
	ToolNameSearchService:  true,
	ToolNameGetQuote:       true,
	ToolNameGetBudget:      true,
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
	Query      string `json:"query,omitempty"`
	Category   string `json:"category,omitempty"`
	Capability string `json:"capability,omitempty"`
}

// DiscoveredService describes a service returned to the agent.
type DiscoveredService struct {
	ID                    string   `json:"id"`
	Name                  string   `json:"name"`
	Description           string   `json:"description"`
	Category              string   `json:"category"`
	Capabilities          []string `json:"capabilities,omitempty"`
	Asset                 string   `json:"asset"`
	MaxPrice              string   `json:"max_price"`
	FixedPrice            string   `json:"fixed_price,omitempty"`
	PricingModel          string   `json:"pricing_model"`
	TrustStatus           string   `json:"trust_status"`
	HistoricalReliability string   `json:"historical_reliability,omitempty"`
	Enabled               bool     `json:"enabled"`
}

// GetQuoteInput represents arguments for requesting a quote.
type GetQuoteInput struct {
	ServiceID       string `json:"service_id"`
	RequestedAmount string `json:"requested_amount,omitempty"`
	Asset           string `json:"asset,omitempty"`
	Purpose         string `json:"purpose,omitempty"`
}

// GetQuoteOutput represents a time-bound quote returned to the agent.
type GetQuoteOutput struct {
	QuoteID           string `json:"quote_id"`
	ServiceID         string `json:"service_id"`
	Recipient         string `json:"recipient"`
	Amount            string `json:"amount"`
	Asset             string `json:"asset"`
	Purpose           string `json:"purpose,omitempty"`
	EstimatedDelivery string `json:"estimated_delivery,omitempty"`
	ExpiresAt         string `json:"expires_at"`
	ValidUntilEpoch   int64  `json:"valid_until_epoch"`
}

// GetBudgetInput represents input to check remaining financial budget.
type GetBudgetInput struct {
	AgentID string `json:"agent_id,omitempty"`
}

// GetBudgetOutput represents the current economic accounting state of the agent.
type GetBudgetOutput struct {
	AgentID     string `json:"agent_id"`
	Currency    string `json:"currency"`
	BudgetLimit string `json:"budget_limit"`
	Spent       string `json:"spent"`
	Reserved    string `json:"reserved"`
	Available   string `json:"available"`
}

// RequestPaymentInput represents the strict schema for the request_payment tool.
type RequestPaymentInput struct {
	ServiceID     string `json:"service_id"`
	QuoteID       string `json:"quote_id,omitempty"`
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
	budget        *AgentBudget
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

// SetBudget assigns an AgentBudget to the ToolExecutor.
func (e *ToolExecutor) SetBudget(b *AgentBudget) {
	e.budget = b
}

// GetBudget returns the agent's safe economic state.
func (e *ToolExecutor) GetBudget(ctx context.Context, input GetBudgetInput) (*GetBudgetOutput, error) {
	if e.budget == nil {
		return nil, ErrBudgetNotInitialized
	}
	limit, spent, reserved, available := e.budget.Snapshot()
	return &GetBudgetOutput{
		AgentID:     e.agentID,
		Currency:    e.budget.Currency,
		BudgetLimit: limit.String(),
		Spent:       spent.String(),
		Reserved:    reserved.String(),
		Available:   available.String(),
	}, nil
}

// SearchService discovers approved services matching the query, category, or capability.
func (e *ToolExecutor) SearchService(ctx context.Context, input SearchServiceInput) ([]DiscoveredService, error) {
	services := e.registry.List()
	var results []DiscoveredService
	q := strings.ToLower(strings.TrimSpace(input.Query))
	cat := strings.ToLower(strings.TrimSpace(input.Category))
	capReq := strings.ToLower(strings.TrimSpace(input.Capability))

	for _, s := range services {
		if !s.Enabled || s.TrustStatus == registry.TrustStatusDisabled {
			continue
		}
		if cat != "" && !strings.EqualFold(s.Category, cat) {
			continue
		}
		if capReq != "" {
			hasCap := false
			for _, c := range s.Capabilities {
				if strings.EqualFold(c, capReq) {
					hasCap = true
					break
				}
			}
			if !hasCap {
				continue
			}
		}
		if q != "" {
			matchID := strings.Contains(strings.ToLower(s.ID), q)
			matchName := strings.Contains(strings.ToLower(s.Name), q)
			matchDesc := strings.Contains(strings.ToLower(s.Description), q)
			matchCap := false
			for _, c := range s.Capabilities {
				if strings.Contains(strings.ToLower(c), q) {
					matchCap = true
					break
				}
			}
			if !matchID && !matchName && !matchDesc && !matchCap {
				continue
			}
		}
		results = append(results, DiscoveredService{
			ID:                    s.ID,
			Name:                  s.Name,
			Description:           s.Description,
			Category:              s.Category,
			Capabilities:          s.Capabilities,
			Asset:                 s.Asset,
			MaxPrice:              s.MaxPrice,
			FixedPrice:            s.FixedPrice,
			PricingModel:          s.PricingModel,
			TrustStatus:           s.TrustStatus,
			HistoricalReliability: s.HistoricalReliability,
			Enabled:               s.Enabled,
		})
	}
	return results, nil
}

// GetQuote requests a binding, time-limited quote for a service.
func (e *ToolExecutor) GetQuote(ctx context.Context, input GetQuoteInput) (*GetQuoteOutput, error) {
	if strings.TrimSpace(input.ServiceID) == "" {
		return nil, errors.New("service_id is required to obtain a quote")
	}

	quote, err := e.registry.CreateQuoteWithTerms(
		input.ServiceID,
		input.RequestedAmount,
		input.Asset,
		input.Purpose,
		"immediate",
		15*time.Minute,
	)
	if err != nil {
		return nil, err
	}

	return &GetQuoteOutput{
		QuoteID:           quote.ID,
		ServiceID:         quote.ServiceID,
		Recipient:         quote.Recipient,
		Amount:            quote.Amount,
		Asset:             quote.Asset,
		Purpose:           quote.Purpose,
		EstimatedDelivery: quote.EstimatedDelivery,
		ExpiresAt:         quote.ExpiresAt.Format(time.RFC3339),
		ValidUntilEpoch:   quote.ExpiresAt.Unix(),
	}, nil
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

	// 2. Budget verification & reservation (if budget is tracked on executor)
	amtInt, ok := new(big.Int).SetString(input.Amount, 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, ErrInvalidAmountFormat
	}
	if e.budget != nil {
		if err := e.budget.Reserve(amtInt); err != nil {
			return nil, err
		}
	}

	// 3. Resolve service and ensure existence
	regService, err := e.registry.Resolve(input.ServiceID)
	if err != nil {
		if e.budget != nil {
			_ = e.budget.Release(amtInt)
		}
		return nil, err
	}

	// 4. Create payment intent in AgentPay
	pi, err := e.intentService.CreateIntent(ctx, intent.CreateIntentParams{
		AgentID:       e.agentID,
		VaultAddress:  e.vaultAddress,
		ServiceID:     regService.ID,
		QuoteID:       input.QuoteID,
		Amount:        input.Amount,
		Asset:         input.Asset,
		Purpose:       input.Purpose,
		Justification: input.Justification,
	})
	if err != nil {
		if e.budget != nil {
			_ = e.budget.Release(amtInt)
		}
		return nil, fmt.Errorf("failed to create payment intent: %w", err)
	}

	// 5. Authorize intent through Rust policy and risk engines
	authIntent, decision, err := e.intentService.AuthorizeIntent(ctx, pi.IntentID)
	if err != nil {
		if e.budget != nil {
			_ = e.budget.Release(amtInt)
		}
		return nil, fmt.Errorf("policy authorization failed: %w", err)
	}

	// If denied by policy, release reserved budget
	if decision.Decision == "DENY" && e.budget != nil {
		_ = e.budget.Release(amtInt)
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
