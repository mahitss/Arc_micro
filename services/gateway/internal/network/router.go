package network

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrNoSuitableAgentFound = errors.New("economic router found no suitable agent matching requirements")
)

// TaskRoutingRequest specifies the task parameters for economic routing.
type TaskRoutingRequest struct {
	OrganizationID     string    `json:"organization_id"`
	RequesterAgentID   string    `json:"requester_agent_id"`
	MissionID          string    `json:"mission_id,omitempty"`
	RequiredCapability string    `json:"required_capability"`
	BudgetBaseUnits    string    `json:"budget_base_units"` // e.g. "1000000" for 1.00 USDC
	Deadline           time.Time `json:"deadline"`
	RiskTolerance      string    `json:"risk_tolerance"` // "LOW", "MEDIUM", "HIGH"
	MinTrustScore      int64     `json:"min_trust_score"`
}

// ExecutionPlanDraft represents the proposed, advisory economic plan produced by the router.
// INVARIANT: This is an intent proposal. It holds ZERO financial authority until evaluated by Policy & Treasury.
type ExecutionPlanDraft struct {
	PlanID             string             `json:"plan_id"`
	SelectedAgentID    string             `json:"selected_agent_id"`
	SelectedCapability string             `json:"selected_capability"`
	ProjectedCost      string             `json:"projected_cost"` // micro-USDC
	Currency           string             `json:"currency"`       // "USDC"
	EstimatedLatencyMs int64              `json:"estimated_latency_ms"`
	Rankings           []CandidateRanking `json:"rankings"`
	SelectedRanking    *CandidateRanking  `json:"selected_ranking"`
	SafetyNotice       string             `json:"safety_notice"`
	CreatedAt          time.Time          `json:"created_at"`
}

// EconomicRouter orchestrates discovery, quoting, trust evaluation, and candidate selection.
type EconomicRouter struct {
	discovery *AgentDiscoveryService
	selection *AgentSelectionEngine
}

// NewEconomicRouter creates a new EconomicRouter.
func NewEconomicRouter(discovery *AgentDiscoveryService, selection *AgentSelectionEngine) *EconomicRouter {
	return &EconomicRouter{
		discovery: discovery,
		selection: selection,
	}
}

// RouteTask executes the 8-stage economic routing pipeline and generates a proposed execution plan draft.
func (r *EconomicRouter) RouteTask(ctx context.Context, req TaskRoutingRequest) (*ExecutionPlanDraft, error) {
	// 1. Discover candidates
	filter := DiscoveryFilter{
		Capability:     req.RequiredCapability,
		OrganizationID: req.OrganizationID,
		MinTrustScore:  req.MinTrustScore,
		Availability:   "ACTIVE",
		Limit:          20,
	}
	candidates, err := r.discovery.Discover(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("discovery failed during routing: %w", err)
	}
	if len(candidates) == 0 {
		return nil, ErrNoSuitableAgentFound
	}

	// 2. Evaluate and Rank Candidates
	selTask := SelectionTask{
		Objective:          fmt.Sprintf("Fulfill %s", req.RequiredCapability),
		RequiredCapability: req.RequiredCapability,
		BudgetBaseUnits:    req.BudgetBaseUnits,
		Deadline:           req.Deadline,
		RiskConstraint:     req.RiskTolerance,
		MinTrustScore:      req.MinTrustScore,
	}

	rankings, err := r.selection.SelectBestAgent(selTask, candidates)
	if err != nil {
		return nil, fmt.Errorf("selection failed: %w", err)
	}

	selected := &rankings[0]

	now := time.Now().UTC()
	draft := &ExecutionPlanDraft{
		PlanID:             fmt.Sprintf("plan_draft_%d", now.UnixNano()),
		SelectedAgentID:    selected.AgentID,
		SelectedCapability: req.RequiredCapability,
		ProjectedCost:      selected.PriceBaseUnits,
		Currency:           "USDC",
		EstimatedLatencyMs: selected.LatencyScore,
		Rankings:           rankings,
		SelectedRanking:    selected,
		SafetyNotice:       "ADVISORY PLAN ONLY — REQUIRES DETERMINISTIC POLICY EVALUATION AND TREASURY RESERVATION BEFORE SETTLEMENT",
		CreatedAt:          now,
	}

	return draft, nil
}
