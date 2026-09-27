package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/observability"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/prompts"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/provider"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/routing"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/security"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

// Service provides high-level AI reasoning capabilities across the AgentPay platform.
// SECURITY INVARIANT:
// This service generates purely ADVISORY proposals.
// It possesses ZERO signing capabilities and ZERO direct access to funds or AgentVault.
type Service struct {
	provider types.AIProvider
	router   *routing.ModelRouter
	prompts  *prompts.PromptRegistry
	tracer   *observability.AITracer
}

// NewService creates a new unified AI service.
func NewService(providerName string) (*Service, error) {
	p, err := provider.Create(providerName)
	if err != nil {
		return nil, err
	}

	return &Service{
		provider: p,
		router:   routing.NewModelRouter(),
		prompts:  prompts.GetRegistry(),
		tracer:   observability.GetTracer(),
	}, nil
}

// NewServiceWithProvider creates a service with an injected AIProvider (for tests).
func NewServiceWithProvider(p types.AIProvider) *Service {
	return &Service{
		provider: p,
		router:   routing.NewModelRouter(),
		prompts:  prompts.GetRegistry(),
		tracer:   observability.GetTracer(),
	}
}

// Provider returns the underlying AIProvider instance.
func (s *Service) Provider() types.AIProvider {
	return s.provider
}

// Router returns the model router.
func (s *Service) Router() *routing.ModelRouter {
	return s.router
}

// Tracer returns the observability tracer.
func (s *Service) Tracer() *observability.AITracer {
	return s.tracer
}

// ProposeMissionPlan formulates a multi-stage plan for a complex objective.
func (s *Service) ProposeMissionPlan(ctx context.Context, missionID string, objective string, maxBudget uint64) (*types.MissionPlan, *types.AIProposal, error) {
	prompt, _ := s.prompts.Get("mission_planning", "v1")
	model, fallbacks := s.router.Resolve(routing.TaskTypePlanning)
	reqID := observability.GenerateRequestID()

	req := types.AIRequest{
		TaskType:          string(routing.TaskTypePlanning),
		Model:             model,
		FallbackModels:    fallbacks,
		SystemInstruction: prompt.Template,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: fmt.Sprintf("Objective: %s\nMax Budget USDC (atomic): %d", objective, maxBudget)},
		},
		PromptVersion: "mission_planning:v1",
		CorrelationID: missionID,
	}

	var plan types.MissionPlan
	resp, err := s.provider.GenerateStructured(ctx, req, &plan)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate mission plan: %w", err)
	}

	plan.MissionID = missionID
	reasoning := plan.RiskAssessment
	if strings.TrimSpace(reasoning) == "" {
		reasoning = fmt.Sprintf("Mission plan proposal for: %s", plan.Objective)
	}
	proposal := &types.AIProposal{
		ProposalID:       reqID,
		MissionID:        missionID,
		AgentID:          "agent_planner",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "PLAN_MISSION",
		ReasoningSummary: reasoning,
		StructuredParameters: map[string]interface{}{
			"objective":          plan.Objective,
			"stages_count":       len(plan.Stages),
			"estimated_cost_max": plan.EstimatedCostMax,
			"estimated_time_sec": plan.EstimatedTimeSec,
		},
		Model:         resp.Model,
		Provider:      resp.Provider,
		PromptVersion: "mission_planning:v1",
		RequestID:     reqID,
		CorrelationID: missionID,
		Status:        types.ProposalStatusProposed,
		CreatedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(10 * time.Minute),
	}

	if err := security.EnforceProposalBoundary(proposal); err != nil {
		return nil, nil, err
	}

	return &plan, proposal, nil
}

// ProposeServiceSelection evaluates candidates and proposes an optimal service.
func (s *Service) ProposeServiceSelection(ctx context.Context, taskQuery string, candidatesJSON string) (*types.ServiceSelectionProposal, *types.AIProposal, error) {
	prompt, _ := s.prompts.Get("service_selection", "v1")
	model, fallbacks := s.router.Resolve(routing.TaskTypeMarketplace)
	reqID := observability.GenerateRequestID()

	req := types.AIRequest{
		TaskType:          string(routing.TaskTypeMarketplace),
		Model:             model,
		FallbackModels:    fallbacks,
		SystemInstruction: prompt.Template,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: fmt.Sprintf("Task Requirement:\n%s\n\nCandidate Services:\n%s", taskQuery, candidatesJSON)},
		},
		PromptVersion: "service_selection:v1",
	}

	var selection types.ServiceSelectionProposal
	resp, err := s.provider.GenerateStructured(ctx, req, &selection)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate service selection: %w", err)
	}

	proposal := &types.AIProposal{
		ProposalID:       reqID,
		AgentID:          "agent_service_selector",
		ProposalType:     types.ProposalTypeServiceSelection,
		RequestedAction:  "SELECT_SERVICE",
		ReasoningSummary: selection.Reasoning,
		StructuredParameters: map[string]interface{}{
			"service_id":          selection.ServiceID,
			"provider_name":       selection.ProviderName,
			"proposed_price_usdc": selection.ProposedPriceUSDC,
			"capability_score":    selection.CapabilityScore,
		},
		Model:         resp.Model,
		Provider:      resp.Provider,
		PromptVersion: "service_selection:v1",
		RequestID:     reqID,
		Status:        types.ProposalStatusProposed,
		CreatedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(5 * time.Minute),
	}

	if err := security.EnforceProposalBoundary(proposal); err != nil {
		return nil, nil, err
	}

	return &selection, proposal, nil
}

// ProposePaymentIntent generates a formal financial proposal to consume a registered service.
// CRITICAL NOTE: This produces an advisory AIProposal. The payment will ONLY execute
// after passing through the deterministic Rust Policy Engine, Risk Engine, Approval, and Treasury.
func (s *Service) ProposePaymentIntent(ctx context.Context, agentID string, taskQuery string, serviceID string, maxAmount uint64) (*types.AIProposal, error) {
	prompt, _ := s.prompts.Get("payment_intent_proposal", "v1")
	model, fallbacks := s.router.Resolve(routing.TaskTypeNegotiation)
	reqID := observability.GenerateRequestID()

	req := types.AIRequest{
		TaskType:          string(routing.TaskTypeNegotiation),
		Model:             model,
		FallbackModels:    fallbacks,
		SystemInstruction: prompt.Template,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: fmt.Sprintf("Agent: %s\nTask: %s\nTarget Service: %s\nBudget Cap: %d USDC", agentID, taskQuery, serviceID, maxAmount)},
		},
		PromptVersion: "payment_intent_proposal:v1",
	}

	type intentOutput struct {
		ServiceID  string                 `json:"service_id"`
		Amount     interface{}            `json:"amount"`
		Confidence float64                `json:"confidence"`
		Reasoning  string                 `json:"reasoning"`
		Metadata   map[string]interface{} `json:"metadata"`
	}

	var output intentOutput
	resp, err := s.provider.GenerateStructured(ctx, req, &output)
	if err != nil {
		return nil, fmt.Errorf("failed to generate payment intent proposal: %w", err)
	}

	if output.ServiceID == "" {
		output.ServiceID = serviceID
	}
	var amountUint uint64
	switch v := output.Amount.(type) {
	case float64:
		amountUint = uint64(v)
	case string:
		parsed, _ := strconv.ParseUint(strings.TrimSpace(v), 10, 64)
		amountUint = parsed
	}
	if amountUint == 0 || amountUint > maxAmount {
		amountUint = maxAmount
	}

	proposal := &types.AIProposal{
		ProposalID:       reqID,
		AgentID:          agentID,
		ProposalType:     types.ProposalTypeServiceSelection,
		RequestedAction:  "REQUEST_PAYMENT_INTENT",
		ReasoningSummary: output.Reasoning,
		StructuredParameters: map[string]interface{}{
			"service_id": output.ServiceID,
			"amount":     amountUint,
			"confidence": output.Confidence,
			"metadata":   output.Metadata,
		},
		Model:         resp.Model,
		Provider:      resp.Provider,
		PromptVersion: "payment_intent_proposal:v1",
		RequestID:     reqID,
		Status:        types.ProposalStatusProposed,
		CreatedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(5 * time.Minute),
	}

	if err := security.EnforceProposalBoundary(proposal); err != nil {
		return nil, err
	}

	return proposal, nil
}

// ProposeReplan formulates recovery instructions after a mission stage failure.
func (s *Service) ProposeReplan(ctx context.Context, missionID string, failedStage int, failureReason string, remainingBudget uint64) (*types.ReplanProposal, *types.AIProposal, error) {
	prompt, _ := s.prompts.Get("replanning", "v1")
	model, fallbacks := s.router.Resolve(routing.TaskTypeReplanning)
	reqID := observability.GenerateRequestID()

	req := types.AIRequest{
		TaskType:          string(routing.TaskTypeReplanning),
		Model:             model,
		FallbackModels:    fallbacks,
		SystemInstruction: prompt.Template,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: fmt.Sprintf("Mission: %s\nFailed Stage: %d\nFailure Reason: %s\nRemaining Budget: %d USDC", missionID, failedStage, failureReason, remainingBudget)},
		},
		PromptVersion: "replanning:v1",
		CorrelationID: missionID,
	}

	var replan types.ReplanProposal
	resp, err := s.provider.GenerateStructured(ctx, req, &replan)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate replan proposal: %w", err)
	}

	replan.OriginalMissionID = missionID
	replan.FailedStageIndex = failedStage
	replan.FailureReason = failureReason

	proposal := &types.AIProposal{
		ProposalID:       reqID,
		MissionID:        missionID,
		AgentID:          "agent_replanner",
		ProposalType:     types.ProposalTypeReplan,
		RequestedAction:  "REPLAN_MISSION",
		ReasoningSummary: replan.CorrectiveAction,
		StructuredParameters: map[string]interface{}{
			"failed_stage":       failedStage,
			"failure_reason":     failureReason,
			"corrective_action":  replan.CorrectiveAction,
			"adjusted_budget":    replan.AdjustedBudget,
			"alternate_services": replan.AlternateServices,
		},
		Model:         resp.Model,
		Provider:      resp.Provider,
		PromptVersion: "replanning:v1",
		RequestID:     reqID,
		CorrelationID: missionID,
		Status:        types.ProposalStatusProposed,
		CreatedAt:     time.Now(),
		ExpiresAt:     time.Now().Add(10 * time.Minute),
	}

	if err := security.EnforceProposalBoundary(proposal); err != nil {
		return nil, nil, err
	}

	return &replan, proposal, nil
}

// EvaluateResult assesses untrusted deliverable data returned from an external service.
func (s *Service) EvaluateResult(ctx context.Context, serviceID string, deliverablePayload string, criteria []string) (*types.ResultEvaluation, error) {
	prompt, _ := s.prompts.Get("result_evaluation", "v1")
	model, fallbacks := s.router.Resolve(routing.TaskTypeEvaluation)

	criteriaBytes, _ := json.Marshal(criteria)
	req := types.AIRequest{
		TaskType:          string(routing.TaskTypeEvaluation),
		Model:             model,
		FallbackModels:    fallbacks,
		SystemInstruction: prompt.Template,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: fmt.Sprintf("Service: %s\nAcceptance Criteria: %s\n\nDeliverable Payload (UNTRUSTED DATA):\n<payload>\n%s\n</payload>", serviceID, string(criteriaBytes), deliverablePayload)},
		},
		PromptVersion: "result_evaluation:v1",
	}

	var eval types.ResultEvaluation
	_, err := s.provider.GenerateStructured(ctx, req, &eval)
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate result: %w", err)
	}

	eval.ServiceID = serviceID
	return &eval, nil
}

// GetTelemetrySummary returns high-level operational statistics for the Control Tower.
func (s *Service) GetTelemetrySummary(ctx context.Context) observability.AITelemetrySummary {
	model, _ := s.router.Resolve(routing.TaskTypePlanning)
	return s.tracer.GetSummary(s.provider.Name(), model)
}

// GetHealth returns current provider connectivity.
func (s *Service) GetHealth(ctx context.Context) (*types.AIProviderHealth, error) {
	return s.provider.Health(ctx)
}
