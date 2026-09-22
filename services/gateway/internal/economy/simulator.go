package economy

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// SimulatedStepTrace records the dry-run projection for a planned step.
type SimulatedStepTrace struct {
	StepID             string            `json:"step_id"`
	RequiredCapability string            `json:"required_capability"`
	Category           string            `json:"category"`
	AllocatedBudget    string            `json:"allocated_budget"`
	CandidatesFound    int               `json:"candidates_found"`
	SelectedServiceID  string            `json:"selected_service_id"`
	SelectedQuotePrice string            `json:"selected_quote_price"`
	UtilityScore       int64             `json:"utility_score"`
	PolicyDecision     string            `json:"policy_decision"`
	PolicyReason       string            `json:"policy_reason"`
	RequiresApproval   bool              `json:"requires_approval"`
	ProjectedSpend     string            `json:"projected_spend"`
	Explanation        string            `json:"explanation"`
}

// MissionSimulationResult encapsulates the dry-run outcome of an autonomous mission.
// INVARIANT: Simulation MUST NEVER sign, broadcast, or mutate real treasury state.
type MissionSimulationResult struct {
	SimulationOnly     bool                 `json:"simulation_only"` // Strictly true
	MissionID          string               `json:"mission_id"`
	Objective          string               `json:"objective"`
	AuthorizedBudget   string               `json:"authorized_budget"`
	Currency           string               `json:"currency"`
	PlannedStepsCount  int                  `json:"planned_steps_count"`
	ProjectedSpend     string               `json:"projected_spend"`
	MaxFinancialRisk   string               `json:"max_financial_risk"`
	SimulatedSteps     []SimulatedStepTrace `json:"simulated_steps"`
	AllStepsApproved   bool                 `json:"all_steps_approved"`
	ApprovalRequired   bool                 `json:"approval_required"`
	PolicyViolations   []string             `json:"policy_violations,omitempty"`
	GeneratedAt        time.Time            `json:"generated_at"`
}

// MissionSimulator evaluates autonomous missions in a zero-risk simulation sandbox.
type MissionSimulator struct {
	planner       Planner
	reg           *registry.Registry
	economyEngine *EconomyEngine
	reputationMgr *ReputationManager
	policyClient  policy.Client
}

// NewMissionSimulator creates a new simulation engine.
func NewMissionSimulator(
	planner Planner,
	reg *registry.Registry,
	engine *EconomyEngine,
	repMgr *ReputationManager,
	policyClient policy.Client,
) *MissionSimulator {
	if planner == nil {
		planner = NewPlanner()
	}
	if engine == nil {
		engine = NewEconomyEngine(nil)
	}
	if repMgr == nil {
		repMgr = NewReputationManager()
	}
	return &MissionSimulator{
		planner:       planner,
		reg:           reg,
		economyEngine: engine,
		reputationMgr: repMgr,
		policyClient:  policyClient,
	}
}

// Simulate runs a full dry-run of a mission objective without broadcasting or reserving treasury funds.
func (s *MissionSimulator) Simulate(ctx context.Context, m *Mission) (*MissionSimulationResult, error) {
	if m == nil {
		return nil, errors.New("nil mission provided for simulation")
	}

	plan, err := s.planner.PlanMission(ctx, m)
	if err != nil {
		return nil, fmt.Errorf("simulation planning failed: %w", err)
	}

	totalProjected := big.NewInt(0)
	allApproved := true
	requiresApproval := false
	var violations []string
	traces := make([]SimulatedStepTrace, 0, len(plan.Steps))

	for _, step := range plan.Steps {
		// 1. Discover matching services
		discovered := s.reg.ListByCapability(step.RequiredCapability)
		if len(discovered) == 0 {
			violations = append(violations, fmt.Sprintf("no service providing capability '%s'", step.RequiredCapability))
			allApproved = false
			continue
		}

		// 2. Generate simulated quotes
		quotes := make([]*Quote, 0, len(discovered))
		for _, svc := range discovered {
			quoteAmount := ""
			if svc.FixedPrice != "" {
				quoteAmount = svc.FixedPrice
			} else if svc.MaxPrice != "" {
				budgetInt, ok1 := new(big.Int).SetString(step.MaxBudget, 10)
				maxInt, ok2 := new(big.Int).SetString(svc.MaxPrice, 10)
				if ok1 && ok2 && budgetInt.Cmp(maxInt) < 0 {
					quoteAmount = step.MaxBudget
				} else {
					quoteAmount = svc.MaxPrice
				}
			}
			q, err := s.reg.CreateQuote(svc.ID, quoteAmount, m.Currency)
			if err == nil && q != nil {
				qPrice, okQ := new(big.Int).SetString(q.Amount, 10)
				bMax, okB := new(big.Int).SetString(step.MaxBudget, 10)
				if okQ && okB && qPrice.Cmp(bMax) > 0 {
					continue
				}
				quotes = append(quotes, &Quote{
					QuoteID:            q.ID,
					ServiceID:          q.ServiceID,
					MissionID:          m.ID,
					Price:              q.Amount,
					Asset:              q.Asset,
					EstimatedLatencyMs: q.EstimatedLatencyMs,
					QualityScore:       q.QualityScore,
					RiskScore:          q.RiskScore,
					ReputationScore:    q.ReputationScore,
					ExpiresAt:          q.ExpiresAt,
					RecipientBinding:   q.Recipient,
					CreatedAt:          q.CreatedAt,
				})
			}
		}

		if len(quotes) == 0 {
			violations = append(violations, fmt.Sprintf("no valid quotes for step '%s'", step.StepID))
			allApproved = false
			continue
		}

		// 3. Rank candidate quotes
		reps := make(map[string]*ServiceReputation)
		for _, q := range quotes {
			reps[q.ServiceID] = s.reputationMgr.GetReputation(ctx, m.OrganizationID, q.ServiceID)
		}

		best, err := s.economyEngine.SelectBestCandidate(&step, quotes, reps)
		if err != nil {
			violations = append(violations, fmt.Sprintf("quote selection failed for step '%s': %v", step.StepID, err))
			allApproved = false
			continue
		}

		priceInt, _ := new(big.Int).SetString(best.Quote.Price, 10)
		totalProjected.Add(totalProjected, priceInt)

		// 4. Evaluate against Policy Engine
		decision := "ALLOW"
		reason := "Simulated approval baseline"
		reqApp := false

		if s.policyClient != nil {
			dec, err := s.policyClient.Simulate(ctx, domain.PaymentRequest{
				RequestID:      fmt.Sprintf("sim_%s", step.StepID),
				AgentID:        m.AgentID,
				OrganizationID: m.OrganizationID,
				ServiceID:      best.Quote.ServiceID,
				Recipient:      best.Quote.RecipientBinding,
				Amount:         best.Quote.Price,
				Asset:          best.Quote.Asset,
				Purpose:        fmt.Sprintf("Simulated: %s", m.Objective),
			})
			if err != nil {
				decision = "POLICY_ERROR"
				reason = err.Error()
				allApproved = false
				violations = append(violations, fmt.Sprintf("policy error on step '%s': %v", step.StepID, err))
			} else if dec.Decision == "DENY" {
				decision = "DENY"
				reason = dec.Reason
				allApproved = false
				violations = append(violations, fmt.Sprintf("policy denied step '%s': %s", step.StepID, dec.Reason))
			} else if dec.Decision == "APPROVAL_REQUIRED" {
				decision = "APPROVAL_REQUIRED"
				reason = dec.Reason
				reqApp = true
				requiresApproval = true
			}
		}

		traces = append(traces, SimulatedStepTrace{
			StepID:             step.StepID,
			RequiredCapability: step.RequiredCapability,
			Category:           step.Category,
			AllocatedBudget:    step.MaxBudget,
			CandidatesFound:    len(discovered),
			SelectedServiceID:  best.Quote.ServiceID,
			SelectedQuotePrice: best.Quote.Price,
			UtilityScore:       best.UtilityScore,
			PolicyDecision:     decision,
			PolicyReason:       reason,
			RequiresApproval:   reqApp,
			ProjectedSpend:     best.Quote.Price,
			Explanation:        best.Explanation,
		})
	}

	return &MissionSimulationResult{
		SimulationOnly:     true, // INVARIANT: Strictly true
		MissionID:          m.ID,
		Objective:          m.Objective,
		AuthorizedBudget:   m.Budget,
		Currency:           m.Currency,
		PlannedStepsCount:  len(plan.Steps),
		ProjectedSpend:     totalProjected.String(),
		MaxFinancialRisk:   m.Budget,
		SimulatedSteps:     traces,
		AllStepsApproved:   allApproved,
		ApprovalRequired:   requiresApproval,
		PolicyViolations:   violations,
		GeneratedAt:        time.Now().UTC(),
	}, nil
}
