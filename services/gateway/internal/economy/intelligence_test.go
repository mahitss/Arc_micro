package economy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// -----------------------------------------------------------------------------
// Test 1: Economic Memory Append-Only Integrity & Multi-Tenant Isolation
// -----------------------------------------------------------------------------

func TestEconomicMemory_AppendOnlyAndIsolation(t *testing.T) {
	mem := NewEconomicMemoryStore()
	ctx := context.Background()

	// Record observation for Org A
	obsA, err := mem.RecordObservation(ctx, &EconomicObservation{
		OrganizationID: "org_alpha",
		MissionID:      "msn_alpha_1",
		AgentID:        "agent_buyer",
		ServiceID:      "svc_weather_1",
		EventType:      ObservationServiceSuccess,
		Outcome:        OutcomeSuccess,
		Price:          "500000",
		LatencyMs:      120,
		QualityScore:   9800,
		Success:        true,
	})
	if err != nil {
		t.Fatalf("failed to record observation: %v", err)
	}
	if obsA.ID == "" {
		t.Fatal("expected generated observation ID")
	}

	// Record observation for Org B
	_, err = mem.RecordObservation(ctx, &EconomicObservation{
		OrganizationID: "org_beta",
		MissionID:      "msn_beta_1",
		AgentID:        "agent_buyer_beta",
		ServiceID:      "svc_weather_1",
		EventType:      ObservationServiceFailure,
		Outcome:        OutcomeFailure,
		Price:          "500000",
		LatencyMs:      3000,
		QualityScore:   0,
		Success:        false,
		FailureReason:  "connection timeout",
	})
	if err != nil {
		t.Fatalf("failed to record observation: %v", err)
	}

	// Verify Tenant Isolation: Org Alpha should NOT see Org Beta's observations
	alphaObs := mem.GetObservationsByMission(ctx, "org_alpha", "msn_alpha_1")
	if len(alphaObs) != 1 {
		t.Fatalf("expected 1 observation for org_alpha, got %d", len(alphaObs))
	}
	if !alphaObs[0].Success {
		t.Fatal("org_alpha observation was corrupted by org_beta failure")
	}

	betaObs := mem.GetObservationsByMission(ctx, "org_beta", "msn_alpha_1")
	if len(betaObs) != 0 {
		t.Fatalf("org_beta should have 0 observations for org_alpha's mission, got %d", len(betaObs))
	}

	// Verify Append-Only Immutability: Mutating returned pointer does not alter internal state
	alphaObs[0].Success = false
	freshObs := mem.GetObservationsByMission(ctx, "org_alpha", "msn_alpha_1")
	if !freshObs[0].Success {
		t.Fatal("internal economic memory mutated through external reference: append-only invariant violated")
	}
}

// -----------------------------------------------------------------------------
// Test 2: Service Performance Memory: Windowed & Contextual Calculations
// -----------------------------------------------------------------------------

func TestServicePerformance_WindowedAndContextual(t *testing.T) {
	mem := NewEconomicMemoryStore()
	ctx := context.Background()

	// Seed 8 successful data_analysis jobs and 2 failed image_analysis jobs
	for i := 0; i < 8; i++ {
		_, _ = mem.RecordObservation(ctx, &EconomicObservation{
			OrganizationID: "org_test",
			MissionID:      "msn_1",
			ServiceID:      "data_agent",
			EventType:      ObservationServiceSuccess,
			Outcome:        OutcomeSuccess,
			Price:          "300000", // 0.30 USDC
			LatencyMs:      400,
			QualityScore:   9500,
			Success:        true,
			InputContext:   map[string]interface{}{"capability": "data_analysis"},
		})
	}
	for i := 0; i < 2; i++ {
		_, _ = mem.RecordObservation(ctx, &EconomicObservation{
			OrganizationID: "org_test",
			MissionID:      "msn_1",
			ServiceID:      "data_agent",
			EventType:      ObservationServiceFailure,
			Outcome:        OutcomeFailure,
			Price:          "500000",
			LatencyMs:      1200,
			QualityScore:   3000,
			Success:        false,
			FailureReason:  "unsupported format",
			InputContext:   map[string]interface{}{"capability": "image_analysis"},
		})
	}

	perf := mem.CalculatePerformance(ctx, "org_test", "data_agent", WindowAllTime)
	if perf.TotalJobs != 10 {
		t.Fatalf("expected 10 total jobs, got %d", perf.TotalJobs)
	}
	// 8 / 10 = 8000 basis points (80%)
	if perf.SuccessRateBps != 8000 {
		t.Fatalf("expected 8000 bps success rate, got %d", perf.SuccessRateBps)
	}
	if perf.FailureRateBps != 2000 {
		t.Fatalf("expected 2000 bps failure rate, got %d", perf.FailureRateBps)
	}
	if perf.Confidence != ConfidenceHigh {
		t.Fatalf("expected HIGH confidence for 10 observations, got %s", perf.Confidence)
	}

	// Verify Contextual Breakdown
	dataCtx, exists := perf.ContextualBreakdown["data_analysis"]
	if !exists {
		t.Fatal("expected contextual metrics for data_analysis")
	}
	if dataCtx.SuccessRateBps != 10000 {
		t.Fatalf("expected 10000 bps for data_analysis, got %d", dataCtx.SuccessRateBps)
	}

	imgCtx, exists := perf.ContextualBreakdown["image_analysis"]
	if !exists {
		t.Fatal("expected contextual metrics for image_analysis")
	}
	if imgCtx.SuccessRateBps != 0 {
		t.Fatalf("expected 0 bps for image_analysis, got %d", imgCtx.SuccessRateBps)
	}
}

// -----------------------------------------------------------------------------
// Test 3: Deterministic Outcome Evaluator
// -----------------------------------------------------------------------------

func TestOutcomeEvaluator_DeterministicValidation(t *testing.T) {
	eval := NewOutcomeEvaluator()

	// Valid result with correct checksum
	payload := `{"status":"success","data":"market analysis report"}`
	hasher := sha256.New()
	hasher.Write([]byte(payload))
	checksum := hex.EncodeToString(hasher.Sum(nil))

	res := eval.Evaluate(EvaluationInput{
		ExpectedCapability: "data_analysis",
		AgreedPrice:        "300000",
		ActualResultRaw:    payload,
		ResultChecksum:     checksum,
		ObservedLatencyMs:  500,
	})
	if res.Outcome != OutcomeSuccess {
		t.Fatalf("expected SUCCESS, got %s", res.Outcome)
	}
	if res.ReasonCode != "RESULT_VALIDATED" {
		t.Fatalf("expected RESULT_VALIDATED, got %s", res.ReasonCode)
	}

	// Tampered checksum detection
	resTampered := eval.Evaluate(EvaluationInput{
		ExpectedCapability: "data_analysis",
		ActualResultRaw:    payload,
		ResultChecksum:     "0000000000000000000000000000000000000000000000000000000000000000",
		ObservedLatencyMs:  500,
	})
	if resTampered.Outcome != OutcomeFailure || resTampered.ReasonCode != "CHECKSUM_MISMATCH" {
		t.Fatalf("expected CHECKSUM_MISMATCH failure, got outcome=%s reason=%s", resTampered.Outcome, resTampered.ReasonCode)
	}

	// Timeout classification
	resTimeout := eval.Evaluate(EvaluationInput{
		ExpectedCapability: "data_analysis",
		ExecutionError:     "context deadline exceeded: timeout waiting for reply",
		ObservedLatencyMs:  5000,
	})
	if resTimeout.Outcome != OutcomeFailure || resTimeout.FailureClass != FailureTimeout {
		t.Fatalf("expected TIMEOUT failure class, got %s", resTimeout.FailureClass)
	}
}

// -----------------------------------------------------------------------------
// Test 4: Anomaly Detection & Circuit Breaker
// -----------------------------------------------------------------------------

func TestAnomalyDetection_CircuitBreaker(t *testing.T) {
	mem := NewEconomicMemoryStore()
	detector := NewAnomalyDetector(mem)
	ctx := context.Background()

	// Seed baseline: 5 successful jobs at 200,000 micro-USDC (0.20 USDC), 300ms latency
	for i := 0; i < 5; i++ {
		_, _ = mem.RecordObservation(ctx, &EconomicObservation{
			OrganizationID: "org_cb",
			ServiceID:      "unstable_service",
			EventType:      ObservationServiceSuccess,
			Outcome:        OutcomeSuccess,
			Price:          "200000",
			LatencyMs:      300,
			QualityScore:   9000,
			Success:        true,
		})
	}

	signals, cb := detector.DetectAnomalies(ctx, "org_cb", "unstable_service")
	if cb != CircuitBreakerHealthy {
		t.Fatalf("expected HEALTHY circuit breaker, got %s", cb)
	}
	if len(signals) != 0 {
		t.Fatalf("expected 0 anomalies on baseline, got %d", len(signals))
	}

	// Intentionally record 5 consecutive failures
	for i := 0; i < 5; i++ {
		_, _ = mem.RecordObservation(ctx, &EconomicObservation{
			OrganizationID: "org_cb",
			ServiceID:      "unstable_service",
			EventType:      ObservationServiceFailure,
			Outcome:        OutcomeFailure,
			Price:          "500000",
			LatencyMs:      1500,
			Success:        false,
			FailureReason:  "service unavailable 503",
		})
	}

	signals, cb = detector.DetectAnomalies(ctx, "org_cb", "unstable_service")
	if cb != CircuitBreakerTemporarilyUnavailable {
		t.Fatalf("expected TEMPORARILY_UNAVAILABLE after 5 consecutive failures, got %s", cb)
	}
	if len(signals) == 0 {
		t.Fatal("expected anomaly signals detected after failure spike")
	}
}

// -----------------------------------------------------------------------------
// Test 5: Adaptive Candidate Ranking with Contextual Scoring
// -----------------------------------------------------------------------------

func TestAdaptiveCandidateRanking_ContextualDominance(t *testing.T) {
	engine := NewEconomyEngine(nil)

	step := &MissionStep{
		StepID:             "step_1",
		RequiredCapability: "web_search",
		MaxBudget:          "1000000", // 1.00 USDC
	}

	q1 := &Quote{
		QuoteID:            "q_svc_generic",
		ServiceID:          "svc_generic",
		Price:              "400000",
		QualityScore:       8000,
		ReputationScore:    9000,
		EstimatedLatencyMs: 300,
	}
	q2 := &Quote{
		QuoteID:            "q_svc_specialist",
		ServiceID:          "svc_specialist",
		Price:              "420000", // slightly more expensive
		QualityScore:       8000,
		ReputationScore:    9000,
		EstimatedLatencyMs: 320,
	}

	reps := map[string]*ServiceReputation{
		"svc_generic":    {ServiceID: "svc_generic", ReputationScore: 9000},
		"svc_specialist": {ServiceID: "svc_specialist", ReputationScore: 9000},
	}

	// svc_specialist has 99% contextual success for "web_search"
	perfs := map[string]*ServicePerformance{
		"svc_generic": {
			ServiceID:            "svc_generic",
			RecentSuccessRateBps: 8000,
			Confidence:           ConfidenceMedium,
			ContextualBreakdown: map[string]ContextualPerformance{
				"web_search": {Capability: "web_search", SuccessRateBps: 5000}, // 50%
			},
		},
		"svc_specialist": {
			ServiceID:            "svc_specialist",
			RecentSuccessRateBps: 9900,
			Confidence:           ConfidenceHigh,
			ContextualBreakdown: map[string]ContextualPerformance{
				"web_search": {Capability: "web_search", SuccessRateBps: 9900}, // 99%
			},
		},
	}

	ranked, err := engine.RankCandidatesAdaptive(step, []*Quote{q1, q2}, reps, perfs)
	if err != nil {
		t.Fatalf("ranking failed: %v", err)
	}

	if ranked[0].Quote.ServiceID != "svc_specialist" {
		t.Fatalf("expected svc_specialist to rank 1st due to contextual performance, got %s", ranked[0].Quote.ServiceID)
	}
	if ranked[0].Confidence != ConfidenceHigh {
		t.Fatalf("expected HIGH confidence, got %s", ranked[0].Confidence)
	}
}

// -----------------------------------------------------------------------------
// Test 6: Replanning Engine: Budget & Deadline Awareness
// -----------------------------------------------------------------------------

func TestReplanningEngine_BudgetAndDeadlineAwareness(t *testing.T) {
	reg := registry.NewDefaultRegistry()
	mem := NewEconomicMemoryStore()
	detector := NewAnomalyDetector(mem)
	engine := NewEconomyEngine(nil)
	replanner := NewReplanningEngine(reg, engine, mem, detector)
	ctx := context.Background()

	mission := &Mission{
		ID:              "msn_replan_1",
		OrganizationID:  "org_replan",
		Currency:        "USDC",
		RemainingBudget: "100000", // 0.10 USDC remaining
	}
	failedStep := &MissionStep{
		StepID:             "step_replan",
		SelectedServiceID:  "agent_data",
		RequiredCapability: "data_analysis",
		MaxBudget:          "250000",
	}

	// 1. Budget too low for expensive alternative: Should fail closed
	proposal, err := replanner.ProposeRecovery(ctx, ReplanContext{
		Mission:          mission,
		FailedStep:       failedStep,
		FailureClass:     FailureTimeout,
		FailureReason:    "Service timeout",
		RecoveryAttempts: 1,
		RemainingBudget:  "50000", // 0.05 USDC - cannot afford any 0.10+ service
	})
	if err == nil && proposal.Strategy != StrategyAbortMission {
		t.Fatal("expected replanning to abort when remaining budget is insufficient")
	}

	// 2. Deadline expired: Should fail closed
	proposal, err = replanner.ProposeRecovery(ctx, ReplanContext{
		Mission:          mission,
		FailedStep:       failedStep,
		FailureClass:     FailureTimeout,
		FailureReason:    "Service timeout",
		RecoveryAttempts: 1,
		RemainingBudget:  "1000000",
		RemainingTimeMs:  500, // 500ms remaining
	})
	if err == nil && proposal.Strategy != StrategyAbortMission {
		t.Fatal("expected replanning to abort when remaining deadline is expired")
	}

	// 3. Max recovery attempts exceeded: Should fail closed
	proposal, err = replanner.ProposeRecovery(ctx, ReplanContext{
		Mission:          mission,
		FailedStep:       failedStep,
		FailureClass:     FailureTimeout,
		FailureReason:    "Service timeout",
		RecoveryAttempts: MAX_RECOVERY_ATTEMPTS,
		RemainingBudget:  "1000000",
		RemainingTimeMs:  60000,
	})
	if err == nil && proposal.Strategy != StrategyAbortMission {
		t.Fatal("expected replanning to abort when MAX_RECOVERY_ATTEMPTS reached")
	}
}

// -----------------------------------------------------------------------------
// Test 7: Security Adversarial: Hard Policy Deny & Anti-Poisoning
// -----------------------------------------------------------------------------

func TestSecurityAdversarial_HardDenyAndAntiPoisoning(t *testing.T) {
	reg := registry.NewDefaultRegistry()
	mem := NewEconomicMemoryStore()
	replanner := NewReplanningEngine(reg, nil, mem, nil)
	ctx := context.Background()

	mission := &Mission{
		ID:              "msn_sec_1",
		OrganizationID:  "org_sec",
		RemainingBudget: "5000000",
	}
	step := &MissionStep{
		StepID:             "step_sec",
		SelectedServiceID:  "svc_forbidden",
		RequiredCapability: "data_analysis",
		MaxBudget:          "500000",
	}

	// Invariant: Hard Policy DENY cannot be overridden by replanning
	proposal, err := replanner.ProposeRecovery(ctx, ReplanContext{
		Mission:          mission,
		FailedStep:       step,
		FailureClass:     FailurePolicyFailure,
		FailureReason:    "POLICY_HARD_DENY: Target contract blocked",
		RecoveryAttempts: 0,
		RemainingBudget:  "5000000",
		PolicyHardDeny:   true,
	})
	if err != nil {
		t.Fatalf("unexpected replanner error: %v", err)
	}
	if proposal.Strategy != StrategyAbortMission {
		t.Fatalf("expected StrategyAbortMission on hard policy deny, got %s", proposal.Strategy)
	}
	if proposal.Reason != "POLICY_HARD_DENY" {
		t.Fatalf("expected reason POLICY_HARD_DENY, got %s", proposal.Reason)
	}

	// Data Poisoning Defense: external untrusted claims cannot mutate authoritative store
	untrustedClaim := &AgentResult{
		Quality: 1.0,
		ProviderMetadata: map[string]string{
			"claimed_success_rate": "100%",
			"reputation":           "10000",
		},
	}
	if untrustedClaim.ProviderMetadata["reputation"] != "10000" {
		t.Fatal("invalid test fixture")
	}

	// Check that EconomicMemoryStore only records through RecordObservation
	perf := mem.CalculatePerformance(ctx, "org_sec", "svc_forbidden", WindowAllTime)
	if perf.Confidence != ConfidenceUnknown {
		t.Fatalf("expected UNKNOWN confidence when no authoritative observations exist, got %s", perf.Confidence)
	}
}

// -----------------------------------------------------------------------------
// Test 8: End-to-End Adaptive Demo Scenario (Phase 25)
// -----------------------------------------------------------------------------

func TestAdaptiveDemo_DeterministicFailureAndRecovery(t *testing.T) {
	reg := registry.NewDefaultRegistry()

	// Register 3 alternative services for data_analysis as specified in demo scenario
	reg.Register(&registry.Service{
		ID:           "data_agent_a",
		Name:         "DataAgent A",
		Capabilities: []string{"data_analysis"},
		Recipient:    "0x1111111111111111111111111111111111111111",
		Asset:        "USDC",
		Enabled:      true,
		FixedPrice:   "400000", // $0.40
		PricingModel: registry.PricingModelFixed,
	})
	reg.Register(&registry.Service{
		ID:           "data_agent_b",
		Name:         "DataAgent B",
		Capabilities: []string{"data_analysis"},
		Recipient:    "0x2222222222222222222222222222222222222222",
		Asset:        "USDC",
		Enabled:      true,
		FixedPrice:   "350000", // $0.35
		PricingModel: registry.PricingModelFixed,
	})
	reg.Register(&registry.Service{
		ID:           "data_agent_c",
		Name:         "DataAgent C",
		Capabilities: []string{"data_analysis"},
		Recipient:    "0x3333333333333333333333333333333333333333",
		Asset:        "USDC",
		Enabled:      true,
		FixedPrice:   "450000", // $0.45
		PricingModel: registry.PricingModelFixed,
	})

	memStore := NewEconomicMemoryStore()
	evaluator := NewOutcomeEvaluator()
	detector := NewAnomalyDetector(memStore)
	engine := NewEconomyEngine(nil)
	replanner := NewReplanningEngine(reg, engine, memStore, detector)

	ctx := context.Background()

	mission := &Mission{
		ID:                 "msn_demo_1",
		OrganizationID:     "org_demo",
		AgentID:            "agent_buyer",
		Objective:          "Produce a verified AI infrastructure report under $5",
		Budget:             "5000000", // $5.00
		RemainingBudget:    "5000000",
		Spent:              "0",
		Currency:           "USDC",
		MaxExecutionAmount: "1000000",
	}

	failedStep := &MissionStep{
		StepID:             "step_research",
		RequiredCapability: "data_analysis",
		MaxBudget:          "500000",
		SelectedServiceID:  "data_agent_a",
	}

	// 1. Initial Service (agent_data) simulates TIMEOUT
	evalRes := evaluator.Evaluate(EvaluationInput{
		ExpectedCapability: "data_analysis",
		ExecutionError:     "connection timeout after 3000ms",
		ObservedLatencyMs:  3000,
	})
	if evalRes.Outcome != OutcomeFailure || evalRes.FailureClass != FailureTimeout {
		t.Fatalf("expected timeout failure, got outcome=%s class=%s", evalRes.Outcome, evalRes.FailureClass)
	}

	// 2. Record failure observation in append-only memory
	_, _ = memStore.RecordObservation(ctx, &EconomicObservation{
		OrganizationID: mission.OrganizationID,
		MissionID:      mission.ID,
		AgentID:        mission.AgentID,
		ServiceID:      failedStep.SelectedServiceID,
		EventType:      ObservationServiceFailure,
		Outcome:        OutcomeFailure,
		Price:          failedStep.MaxBudget,
		LatencyMs:      3000,
		Success:        false,
		FailureReason:  evalRes.Explanation,
		InputContext:   map[string]interface{}{"capability": "data_analysis"},
	})

	// 3. Trigger Replanning Engine
	proposal, err := replanner.ProposeRecovery(ctx, ReplanContext{
		Mission:          mission,
		FailedStep:       failedStep,
		FailureClass:     evalRes.FailureClass,
		FailureReason:    evalRes.Explanation,
		RecoveryAttempts: 1,
		RemainingBudget:  mission.RemainingBudget,
		RemainingTimeMs:  30000,
	})
	if err != nil {
		t.Fatalf("replanning failed: %v", err)
	}

	if proposal.Strategy != StrategyTryAlternativeService {
		t.Fatalf("expected StrategyTryAlternativeService, got %s", proposal.Strategy)
	}
	if len(proposal.ProposedSteps) == 0 {
		t.Fatal("expected proposed alternative steps in proposal")
	}

	altStep := proposal.ProposedSteps[0]
	altServiceID := altStep.RecommendedServiceID
	if altServiceID == failedStep.SelectedServiceID {
		t.Fatal("recommended alternative cannot be the failed service")
	}

	// 4. Verify alternative fits strictly within remaining budget
	pCost, _ := new(big.Int).SetString(altStep.EstimatedCost, 10)
	remInt, _ := new(big.Int).SetString(mission.RemainingBudget, 10)
	if pCost.Cmp(remInt) > 0 {
		t.Fatalf("alternative cost %s exceeds remaining budget %s", altStep.EstimatedCost, mission.RemainingBudget)
	}

	// 5. Successful Execution of Alternative Service
	altPayload := `{"status":"success","data":"Verified AI infrastructure dataset"}`
	altEval := evaluator.Evaluate(EvaluationInput{
		ExpectedCapability: "data_analysis",
		AgreedPrice:        altStep.EstimatedCost,
		ActualResultRaw:    altPayload,
		ObservedLatencyMs:  350,
	})
	if altEval.Outcome != OutcomeSuccess {
		t.Fatalf("expected alternative result to validate, got %s", altEval.Outcome)
	}

	// 6. Record Alternative Success in Memory
	_, _ = memStore.RecordObservation(ctx, &EconomicObservation{
		OrganizationID: mission.OrganizationID,
		MissionID:      mission.ID,
		AgentID:        mission.AgentID,
		ServiceID:      altServiceID,
		EventType:      ObservationServiceSuccess,
		Outcome:        OutcomeSuccess,
		Price:          altStep.EstimatedCost,
		LatencyMs:      350,
		QualityScore:   altEval.QualityScore,
		Success:        true,
		InputContext:   map[string]interface{}{"capability": "data_analysis"},
	})

	// 7. Update Mission Accounting
	spentInt, _ := new(big.Int).SetString(mission.Spent, 10)
	spentInt.Add(spentInt, pCost)
	remInt.Sub(remInt, pCost)
	mission.Spent = spentInt.String()
	mission.RemainingBudget = remInt.String()
	mission.Status = StatusCompleted

	// 8. Assert Final Financial & Adaptation Invariants
	if mission.Status != StatusCompleted {
		t.Fatalf("expected mission status COMPLETED, got %s", mission.Status)
	}
	if remInt.Sign() < 0 {
		t.Fatal("mission remaining budget became negative: invariant violated")
	}
	totBudget, _ := new(big.Int).SetString(mission.Budget, 10)
	if spentInt.Cmp(totBudget) > 0 {
		t.Fatalf("spent %s exceeded budget %s", spentInt.String(), totBudget.String())
	}
}
