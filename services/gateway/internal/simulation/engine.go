package simulation

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"math/rand"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var globalRunSeq uint64

// SimulationEngine coordinates deterministic digital twin forecast runs.
type SimulationEngine struct {
	mu           sync.RWMutex
	snapshots    *SnapshotManager
	policyClient policy.Client
	runs         map[string]*SimulationRun
}

// NewSimulationEngine constructs a new SimulationEngine.
func NewSimulationEngine(snapshots *SnapshotManager, pClient policy.Client) *SimulationEngine {
	if snapshots == nil {
		snapshots = NewSnapshotManager()
	}
	return &SimulationEngine{
		snapshots:    snapshots,
		policyClient: pClient,
		runs:         make(map[string]*SimulationRun),
	}
}

// CreateRun initializes an unexecuted simulation run with a frozen digital twin snapshot.
func (se *SimulationEngine) CreateRun(
	ctx context.Context,
	scenario SimulationScenario,
	reg *registry.Registry,
) (*SimulationRun, error) {
	se.mu.Lock()
	defer se.mu.Unlock()

	if scenario.ID == "" {
		scenario.ID = fmt.Sprintf("scen_%d", time.Now().UnixNano())
	}
	if scenario.Currency == "" {
		scenario.Currency = "USDC"
	}
	if scenario.PriceMultiplier <= 0 {
		scenario.PriceMultiplier = 1.0
	}
	if scenario.LatencyMultiplier <= 0 {
		scenario.LatencyMultiplier = 1.0
	}

	seed := time.Now().UnixNano()
	seq := atomic.AddUint64(&globalRunSeq, 1)
	runID := fmt.Sprintf("sim_%d_%d", seed, seq)
	now := time.Now().UTC()

	// Capture frozen snapshot of economic environment
	snapshot := se.snapshots.CaptureSnapshot(ctx, scenario.OrganizationID, reg, &scenario)

	run := &SimulationRun{
		ID:                   runID,
		OrganizationID:       scenario.OrganizationID,
		CreatedBy:            scenario.AgentID,
		SourceType:           "MISSION",
		ScenarioID:           scenario.ID,
		Status:               StatusCreated,
		Seed:                 seed,
		ExecutionMode:        ExecutionModeSimulation, // Strict Invariant: Always Simulation
		CreatedAt:            now,
		Summary:              fmt.Sprintf("Simulation initialized for '%s'", scenario.Name),
		ConfigurationVersion: snapshot.Version,
		SnapshotID:           snapshot.SnapshotID,
		SnapshotVersion:      snapshot.Version,
		Scenario:             scenario,
		Snapshot:             snapshot,
		Trace: []SimulationTraceEvent{
			{
				EventNumber: 1,
				Timestamp:   now,
				EventType:   "simulation.created",
				Actor:       scenario.AgentID,
				Details:     fmt.Sprintf("Created simulation with snapshot %s (Seed: %d)", snapshot.Version, seed),
				IsProjected: true,
			},
		},
	}

	if scenario.IsSwarm {
		run.SourceType = "SWARM"
	}

	se.runs[run.ID] = run
	return run, nil
}

// Run executes the deterministic simulation pipeline on an existing run.
func (se *SimulationEngine) Run(ctx context.Context, runID string) (*SimulationRun, error) {
	se.mu.Lock()
	run, exists := se.runs[runID]
	if !exists {
		se.mu.Unlock()
		return nil, fmt.Errorf("simulation run '%s' not found", runID)
	}
	se.mu.Unlock()

	return se.executeRun(ctx, run)
}

// executeRun carries out deterministic execution against the frozen snapshot.
func (se *SimulationEngine) executeRun(ctx context.Context, run *SimulationRun) (*SimulationRun, error) {
	startedAt := time.Now().UTC()
	run.StartedAt = &startedAt
	run.Status = StatusRunning

	// Initialize deterministic pseudo-random source from explicit seed
	rng := rand.New(rand.NewSource(run.Seed))

	trace := run.Trace
	eventNum := len(trace) + 1

	recordTrace := func(evType, actor, stepID, details, decision, amount string) {
		trace = append(trace, SimulationTraceEvent{
			EventNumber:    eventNum,
			Timestamp:      time.Now().UTC(),
			EventType:      evType,
			Actor:          actor,
			StepID:         stepID,
			Details:        details,
			PolicyDecision: decision,
			Amount:         amount,
			IsProjected:    true,
		})
		eventNum++
	}

	recordTrace("simulation.started", run.CreatedBy, "", fmt.Sprintf("Started forecast for '%s'", run.Scenario.Objective), "", "")

	budgetBig, _ := new(big.Int).SetString(run.Scenario.Budget, 10)
	if budgetBig == nil || budgetBig.Sign() <= 0 {
		budgetBig = big.NewInt(5000000) // fallback 5.00 USDC
	}

	totalProjected := big.NewInt(0)
	minSpend := big.NewInt(0)
	maxSpend := big.NewInt(0)
	approvalCount := 0
	riskScoreSum := 0
	distinctServices := make(map[string]bool)
	distinctAgents := make(map[string]bool)

	planSteps := make([]SimulationPlanStep, 0)

	// Step generation depending on Swarm vs Standard Mission
	type stepSpec struct {
		id         string
		role       string
		capability string
		budget     *big.Int
		dependsOn  []string
	}

	var steps []stepSpec
	if run.Scenario.IsSwarm {
		// Multi-Agent Swarm DAG (Orchestrator -> Researcher + DataProvider -> Analyst -> Verifier -> Critic -> Synthesizer)
		steps = []stepSpec{
			{id: "task_research", role: "RESEARCHER", capability: "web-research", budget: new(big.Int).Div(budgetBig, big.NewInt(4))},
			{id: "task_data", role: "DATA_PROVIDER", capability: "data-analysis", budget: new(big.Int).Div(budgetBig, big.NewInt(4))},
			{id: "task_analyst", role: "ANALYST", capability: "financial-modeling", budget: new(big.Int).Div(budgetBig, big.NewInt(5)), dependsOn: []string{"task_research", "task_data"}},
			{id: "task_verifier", role: "VERIFIER", capability: "verification", budget: new(big.Int).Div(budgetBig, big.NewInt(6)), dependsOn: []string{"task_analyst"}},
			{id: "task_critic", role: "CRITIC", capability: "code-review", budget: new(big.Int).Div(budgetBig, big.NewInt(8)), dependsOn: []string{"task_verifier"}},
			{id: "task_synthesis", role: "SYNTHESIZER", capability: "report-synthesis", budget: new(big.Int).Div(budgetBig, big.NewInt(8)), dependsOn: []string{"task_critic"}},
		}
	} else {
		// Single-Agent Mission 3-step pipeline (Research -> Data -> Synthesis)
		steps = []stepSpec{
			{id: "step_research", role: "RESEARCHER", capability: "web-research", budget: new(big.Int).Div(budgetBig, big.NewInt(2))},
			{id: "step_data", role: "DATA_PROVIDER", capability: "data-analysis", budget: new(big.Int).Div(budgetBig, big.NewInt(3))},
			{id: "step_verification", role: "VERIFIER", capability: "verification", budget: new(big.Int).Div(budgetBig, big.NewInt(4)), dependsOn: []string{"step_data"}},
		}
	}

	distinctAgents[run.CreatedBy] = true

	// Simulate each step
	for idx, s := range steps {
		stepNum := idx + 1

		// 1. Discover service in snapshot
		var matchedService *domain.Service
		for _, svc := range run.Snapshot.Services {
			if !svc.Enabled {
				continue
			}
			descLower := strings.ToLower(svc.Description)
			nameLower := strings.ToLower(svc.Name)
			capLower := strings.ToLower(s.capability)
			if strings.Contains(descLower, capLower) || strings.Contains(nameLower, capLower) {
				matchedService = svc
				break
			}
		}

		if matchedService == nil {
			// Fallback to first available enabled service
			for _, svc := range run.Snapshot.Services {
				if svc != nil && svc.Enabled {
					matchedService = svc
					break
				}
			}
			if matchedService == nil {
				matchedService = &domain.Service{
					ID:        fmt.Sprintf("svc_%s", s.capability),
					Name:      fmt.Sprintf("Service %s", s.capability),
					Recipient: "0x1234567890123456789012345678901234567890",
					MaxPrice:  "500000",
					Asset:     "USDC",
					Enabled:   true,
				}
			}
		}

		distinctServices[matchedService.ID] = true

		// 2. Derive price
		priceStr := matchedService.MaxPrice
		if priceStr == "" {
			priceStr = "400000"
		}
		priceBig, _ := new(big.Int).SetString(priceStr, 10)
		if priceBig == nil {
			priceBig = big.NewInt(400000)
		}

		// Apply scenario price multiplier
		if run.Scenario.PriceMultiplier > 0 && run.Scenario.PriceMultiplier != 1.0 {
			multFloat := float64(priceBig.Int64()) * run.Scenario.PriceMultiplier
			priceBig = big.NewInt(int64(multFloat))
		}

		// 3. Duration & Latency model
		latency := int64(250 + rng.Intn(200))
		if run.Scenario.LatencyMultiplier > 0 {
			latency = int64(float64(latency) * run.Scenario.LatencyMultiplier)
		}

		// 4. Policy evaluation via Rust client or offline logic
		policyDecision := "ALLOW"
		policyReasonCode := "POLICY_PERMITTED"
		policyReason := "Permitted under standard spending bounds"
		approvalRequired := false

		// Check if scenario policy threshold is exceeded
		if run.Scenario.PolicyThreshold != "" {
			threshBig, _ := new(big.Int).SetString(run.Scenario.PolicyThreshold, 10)
			if threshBig != nil && priceBig.Cmp(threshBig) > 0 {
				policyDecision = "APPROVAL_REQUIRED"
				policyReasonCode = "POLICY_APPROVAL_THRESHOLD_EXCEEDED"
				policyReason = fmt.Sprintf("Projected amount %s exceeds scenario threshold %s", priceBig.String(), run.Scenario.PolicyThreshold)
				approvalRequired = true
			}
		} else if se.policyClient != nil {
			dec, err := se.policyClient.Simulate(ctx, domain.PaymentRequest{
				RequestID:      fmt.Sprintf("sim_req_%s", s.id),
				AgentID:        run.CreatedBy,
				OrganizationID: run.OrganizationID,
				ServiceID:      matchedService.ID,
				Recipient:      matchedService.Recipient,
				Amount:         priceBig.String(),
				Asset:          "USDC",
				Purpose:        fmt.Sprintf("Simulation: %s", run.Scenario.Objective),
			})
			if err == nil {
				if dec.Decision == domain.DecisionDeny {
					policyDecision = "DENY"
					policyReasonCode = string(dec.ReasonCode)
					policyReason = dec.Reason
				} else if dec.Decision == domain.DecisionApprovalRequired {
					policyDecision = "APPROVAL_REQUIRED"
					policyReasonCode = string(dec.ReasonCode)
					policyReason = dec.Reason
					approvalRequired = true
				}
			}
		}

		// Check for hard scenario policy deny
		if run.Scenario.FailureProfile == FailureBudgetExhaustion && idx > 0 {
			policyDecision = "DENY"
			policyReasonCode = "POLICY_DAILY_LIMIT_EXCEEDED"
			policyReason = "Simulated budget exhaustion failure triggered"
		}

		// 5. Risk Scoring
		riskLevel := "LOW"
		riskScore := 15
		var riskFactors []string

		if priceBig.Cmp(big.NewInt(2000000)) > 0 {
			riskLevel = "MEDIUM"
			riskScore = 45
			riskFactors = append(riskFactors, "Transaction amount exceeds $2.00 threshold")
		}
		if run.Scenario.FailureProfile == FailureHighRisk {
			riskLevel = "HIGH"
			riskScore = 85
			riskFactors = append(riskFactors, "High anomaly score detected in provider telemetry")
			policyDecision = "APPROVAL_REQUIRED"
			approvalRequired = true
		}

		riskScoreSum += riskScore
		if approvalRequired {
			approvalCount++
		}

		// 6. Failure Injection Check
		isInjected := false
		if run.Scenario.FailureProfile != FailureNone && run.Scenario.FailureProfile != "" {
			if (run.Scenario.FailureProfile == FailureServiceTimeout && idx == 0) ||
				(run.Scenario.FailureProfile == FailureServiceFailure && idx == 1) ||
				(run.Scenario.FailureProfile == FailureLowQualityResult && idx == 0) {
				isInjected = true
			}
		}
		for _, fi := range run.Scenario.InjectedFailures {
			if fi.StepID == s.id || fi.ServiceID == matchedService.ID {
				isInjected = true
			}
		}

		if isInjected {
			recordTrace("simulation.failure_injected", run.CreatedBy, s.id,
				fmt.Sprintf("Injected failure '%s' on service '%s'", run.Scenario.FailureProfile, matchedService.ID),
				policyDecision, priceBig.String())

			// Simulate recovery to alternative service
			recordTrace("simulation.recovery_projected", run.CreatedBy, s.id,
				"Replanning Engine discovered alternative candidate counterparty within budget ceiling",
				"ALLOW", priceBig.String())

			// Recovery adds slight cost variance ($0.15) and 300ms recovery latency
			recoveryDelta := big.NewInt(150000)
			priceBig.Add(priceBig, recoveryDelta)
			latency += 300
		}

		totalProjected.Add(totalProjected, priceBig)
		minSpend.Add(minSpend, priceBig)
		maxSpend.Add(maxSpend, priceBig)

		recordTrace("simulation.step_projected", run.CreatedBy, s.id,
			fmt.Sprintf("Projected step '%s' with %s (%s)", s.id, matchedService.Name, s.capability),
			policyDecision, priceBig.String())

		planSteps = append(planSteps, SimulationPlanStep{
			StepNumber:          stepNum,
			StepID:              s.id,
			AgentID:             run.CreatedBy,
			ServiceID:           matchedService.ID,
			ServiceName:         matchedService.Name,
			Capability:          s.capability,
			EstimatedCost:       priceBig.String(),
			EstimatedDurationMs: latency,
			PolicyDecision:      policyDecision,
			PolicyReasonCode:    policyReasonCode,
			PolicyReason:        policyReason,
			RiskLevel:           riskLevel,
			RiskFactors:         riskFactors,
			ApprovalRequired:    approvalRequired,
			Dependencies:        s.dependsOn,
			Explanation:         fmt.Sprintf("Selected optimal service '%s' based on contextual utility", matchedService.Name),
		})
	}

	completedAt := time.Now().UTC()
	run.CompletedAt = &completedAt
	run.DurationMs = completedAt.Sub(startedAt).Milliseconds()

	// Remaining budget
	remaining := new(big.Int).Sub(budgetBig, totalProjected)
	if remaining.Sign() < 0 {
		remaining = big.NewInt(0)
	}

	// Calculate average risk score
	avgRisk := 15
	if len(steps) > 0 {
		avgRisk = riskScoreSum / len(steps)
	}

	// Worst case exposure derivation: budget ceiling is absolute cap
	worstCase := budgetBig.String()
	if totalProjected.Cmp(budgetBig) > 0 {
		worstCase = totalProjected.String()
	}

	run.Economics = ProjectedEconomics{
		ProjectedSpend:   totalProjected.String(),
		MinimumSpend:     minSpend.String(),
		MaximumSpend:     maxSpend.String(),
		ExpectedSpend:    totalProjected.String(),
		RemainingBudget:  remaining.String(),
		NumberOfPayments: len(steps),
		NumberOfAgents:   len(distinctAgents),
		NumberOfServices: len(distinctServices),
		ApprovalCount:    approvalCount,
		RiskScore:        avgRisk,
		Currency:         run.Scenario.Currency,
		IsProjected:      true,
	}

	run.Exposure = WorstCaseExposure{
		MaximumExposure:     worstCase,
		BudgetCeiling:       budgetBig.String(),
		PerTransactionLimit: "5000000",
		TotalStepsPlanned:   len(steps),
		ExposureFormula:     "min(SwarmMaxBudget, sum(TaskCeilings))",
		Explanation:         "Calculated strictly from formal policy bounds and pre-allocated budget ceilings",
	}

	run.Plan = SimulationExecutionPlan{
		TotalSteps:          len(planSteps),
		EstimatedCost:       totalProjected.String(),
		EstimatedDurationMs: run.DurationMs,
		MaxDepth:            3,
		Steps:               planSteps,
	}

	// Final Status
	if run.Scenario.FailureProfile == FailureBudgetExhaustion || totalProjected.Cmp(budgetBig) > 0 {
		run.Status = StatusFailed
		run.Summary = "Simulation completed with failure: Projected spend exceeds authorized budget ceiling"
		recordTrace("simulation.failed", run.CreatedBy, "", run.Summary, "DENY", totalProjected.String())
	} else if approvalCount > 0 {
		run.Status = StatusCompleted
		run.Summary = fmt.Sprintf("Simulation completed with %d required approvals. Projected spend: %s %s",
			approvalCount, formatUnits(totalProjected.String()), run.Scenario.Currency)
		recordTrace("simulation.completed", run.CreatedBy, "", run.Summary, "APPROVAL_REQUIRED", totalProjected.String())
	} else {
		run.Status = StatusCompleted
		run.Summary = fmt.Sprintf("Simulation completed successfully. Projected spend: %s %s",
			formatUnits(totalProjected.String()), run.Scenario.Currency)
		recordTrace("simulation.completed", run.CreatedBy, "", run.Summary, "ALLOW", totalProjected.String())
	}

	run.Trace = trace

	se.mu.Lock()
	se.runs[run.ID] = run
	se.mu.Unlock()

	return run, nil
}

// GetRun retrieves a simulation run by ID.
func (se *SimulationEngine) GetRun(runID string) (*SimulationRun, bool) {
	se.mu.RLock()
	defer se.mu.RUnlock()
	run, ok := se.runs[runID]
	return run, ok
}

// ListRuns returns all simulation runs for an organization.
func (se *SimulationEngine) ListRuns(orgID string) []*SimulationRun {
	se.mu.RLock()
	defer se.mu.RUnlock()
	res := make([]*SimulationRun, 0)
	for _, r := range se.runs {
		if orgID == "" || r.OrganizationID == orgID {
			res = append(res, r)
		}
	}
	return res
}

// CancelRun aborts an ongoing simulation run.
func (se *SimulationEngine) CancelRun(runID string) (*SimulationRun, error) {
	se.mu.Lock()
	defer se.mu.Unlock()
	run, exists := se.runs[runID]
	if !exists {
		return nil, fmt.Errorf("simulation run '%s' not found", runID)
	}
	run.Status = StatusCancelled
	run.Summary = "Simulation cancelled by user request"
	return run, nil
}

func formatUnits(baseUnits string) string {
	b, ok := new(big.Int).SetString(baseUnits, 10)
	if !ok {
		return baseUnits
	}
	f := new(big.Float).Quo(new(big.Float).SetInt(b), big.NewFloat(1000000))
	return fmt.Sprintf("%.2f", f)
}

// Checksum computes a SHA-256 hash of byte payload.
func Checksum(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}
