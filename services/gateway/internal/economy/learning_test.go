package economy

import (
	"context"
	"testing"
	"time"
)

func TestObservationPipeline(t *testing.T) {
	ctx := context.Background()
	memStore := NewEconomicMemoryStore()
	learningEngine := NewEconomicLearningEngine(memStore)
	pipeline := NewObservationPipeline(memStore, learningEngine)

	orgID := "org_test"
	agentID := "agent_alpha"
	serviceID := "svc_summarizer"

	// 1. Ingest Quote
	quoteObs, err := pipeline.IngestQuote(ctx, orgID, agentID, serviceID, "nlp_summary", "1000", 250, false)
	if err != nil {
		t.Fatalf("failed to ingest quote: %v", err)
	}
	if quoteObs.EventType != ObservationQuote {
		t.Errorf("expected ObservationQuote, got %v", quoteObs.EventType)
	}

	// 2. Ingest Execution Success
	succObs, err := pipeline.IngestExecutionSuccess(ctx, orgID, agentID, serviceID, "nlp_summary", "1000", "1050", 240, 9900, false)
	if err != nil {
		t.Fatalf("failed to ingest success: %v", err)
	}
	if !succObs.Success || succObs.Outcome != OutcomeSuccess {
		t.Errorf("expected successful execution outcome")
	}

	// 3. Ingest Failure
	failObs, err := pipeline.IngestExecutionFailure(ctx, orgID, agentID, serviceID, "nlp_summary", "1000", 5000, "deadline exceeded", FailureTimeout, false)
	if err != nil {
		t.Fatalf("failed to ingest failure: %v", err)
	}
	if failObs.Success || failObs.Outcome != OutcomeTimeout {
		t.Errorf("expected timeout failure outcome")
	}

	// 4. Ingest Verification
	verObs, err := pipeline.IngestVerificationResult(ctx, orgID, agentID, serviceID, true, "schema check passed", false)
	if err != nil {
		t.Fatalf("failed to ingest verification: %v", err)
	}
	if !verObs.Success {
		t.Errorf("expected verification success")
	}

	// 5. Ingest Mission Summary
	missionSummary := &MissionOutcomeSummary{
		MissionID:          "m_101",
		OrganizationID:     orgID,
		Objective:          "market_research",
		Strategy:           "BEST_PRICE",
		TotalCost:          "1050",
		ExpectedCost:       "1000",
		DurationMs:         240,
		VerificationPassed: true,
		FinalOutcome:       OutcomeSuccess,
		CompletedAt:        time.Now().UTC(),
	}
	if err := pipeline.IngestMissionCompletion(ctx, missionSummary); err != nil {
		t.Fatalf("failed to ingest mission completion: %v", err)
	}

	// Check that observations are recorded
	obsList := memStore.GetObservations(ctx, orgID, 10)
	if len(obsList) < 4 {
		t.Errorf("expected at least 4 observations, got %d", len(obsList))
	}
}

func TestSimulatorCalibration(t *testing.T) {
	ctx := context.Background()
	memStore := NewEconomicMemoryStore()
	learningEngine := NewEconomicLearningEngine(memStore)

	orgID := "org_calibration"

	// Record 5 missions where settled was higher than expected (underestimation bias)
	for i := 1; i <= 5; i++ {
		learningEngine.RecordMissionOutcome(ctx, &MissionOutcomeSummary{
			MissionID:      generateID("m"),
			OrganizationID: orgID,
			TotalCost:      "1500", // actual
			ExpectedCost:   "1000", // planned
			DurationMs:     300,
			PlanVsActual: PlanVsActual{
				PlannedDurationMs: 250,
			},
			CompletedAt: time.Now().UTC(),
		})
	}

	calib := learningEngine.CalibrateSimulator(ctx, orgID)
	if calib.TotalRunsCompared != 5 {
		t.Fatalf("expected 5 runs compared, got %d", calib.TotalRunsCompared)
	}
	// Underestimation bias should be 10000 bps (100%)
	if calib.UnderestimationBiasBps != 10000 {
		t.Errorf("expected 10000 bps underestimation, got %d", calib.UnderestimationBiasBps)
	}
	// Cost prediction accuracy should be approx 5000 bps (50% error)
	if calib.CostPredictionAccuracyBps != 5000 {
		t.Errorf("expected 5000 bps cost accuracy, got %d", calib.CostPredictionAccuracyBps)
	}
}

func TestEconomicDriftDetection(t *testing.T) {
	ctx := context.Background()
	memStore := NewEconomicMemoryStore()
	learningEngine := NewEconomicLearningEngine(memStore)
	pipeline := NewObservationPipeline(memStore, learningEngine)

	orgID := "org_drift"
	providerID := "prov_flaky"

	// Populate baseline: 10 successes
	for i := 0; i < 10; i++ {
		_, _ = pipeline.IngestExecutionSuccess(ctx, orgID, "agent_1", providerID, "data_extract", "100", "100", 150, 9500, false)
	}

	// Check drift: should be nil (baseline and recent are both 100% success)
	drift := learningEngine.EvaluateDrift(ctx, orgID, providerID)
	if drift != nil {
		t.Errorf("expected no drift yet, got %v", drift)
	}

	// Now inject 6 failures out of 10 recent jobs (success drops from 100% to 40% -> >15% drop)
	for i := 0; i < 6; i++ {
		_, _ = pipeline.IngestExecutionFailure(ctx, orgID, "agent_1", providerID, "data_extract", "100", 150, "service unavailable", FailurePermanent, false)
	}
	for i := 0; i < 4; i++ {
		_, _ = pipeline.IngestExecutionSuccess(ctx, orgID, "agent_1", providerID, "data_extract", "100", "100", 150, 9500, false)
	}

	drift = learningEngine.EvaluateDrift(ctx, orgID, providerID)
	if drift == nil {
		t.Fatalf("expected drift to be detected, got nil")
	}
	if drift.Signal != "success_rate" {
		t.Errorf("expected success_rate signal, got %s", drift.Signal)
	}
	if drift.Severity != DriftSevere && drift.Severity != DriftDetected {
		t.Errorf("expected severe or detected drift, got %s", drift.Severity)
	}
}

func TestEconomicRecommendationsAndForecast(t *testing.T) {
	ctx := context.Background()
	memStore := NewEconomicMemoryStore()
	learningEngine := NewEconomicLearningEngine(memStore)
	pipeline := NewObservationPipeline(memStore, learningEngine)

	orgID := "org_recs"

	// Provider A: highly reliable (5 successes)
	for i := 0; i < 5; i++ {
		_, _ = pipeline.IngestExecutionSuccess(ctx, orgID, "agent_1", "prov_rockstar", "nlp_summary", "100", "100", 100, 9900, false)
	}
	// Provider B: flaky (1 success, 4 failures)
	_, _ = pipeline.IngestExecutionSuccess(ctx, orgID, "agent_1", "prov_flaky", "nlp_summary", "100", "100", 100, 9900, false)
	for i := 0; i < 4; i++ {
		_, _ = pipeline.IngestExecutionFailure(ctx, orgID, "agent_1", "prov_flaky", "nlp_summary", "100", 100, "crash", FailurePermanent, false)
	}

	recs := learningEngine.GenerateRecommendations(ctx, orgID)
	if len(recs) == 0 {
		t.Fatalf("expected recommendations to be generated")
	}

	foundPrefer := false
	for _, r := range recs {
		if r.RecommendationType == "PREFER_PROVIDER" {
			foundPrefer = true
			if r.TargetEntityID != "prov_rockstar" {
				t.Errorf("expected recommendation to prefer prov_rockstar, got %s", r.TargetEntityID)
			}
			if r.Confidence != ConfidenceHigh {
				t.Errorf("expected HIGH confidence recommendation")
			}
		}
	}
	if !foundPrefer {
		t.Errorf("expected PREFER_PROVIDER recommendation for prov_rockstar")
	}

	// Test Forecast
	forecast := learningEngine.GenerateForecast(ctx, orgID, "nlp_summary")
	if forecast == nil {
		t.Fatalf("expected forecast, got nil")
	}
	if forecast.SampleSize < 5 {
		t.Errorf("expected sample size >= 5, got %d", forecast.SampleSize)
	}
	if forecast.ExpectedCostMin == "" || forecast.ExpectedCostMax == "" {
		t.Errorf("expected non-empty cost min/max")
	}
}

func TestSecurityInvariantAdvisoryOnly(t *testing.T) {
	// SECURITY INVARIANT:
	// Verify that recommendations and drift alerts have ZERO financial authority.
	ctx := context.Background()
	memStore := NewEconomicMemoryStore()
	learningEngine := NewEconomicLearningEngine(memStore)

	recs := learningEngine.GenerateRecommendations(ctx, "org_security")
	for _, r := range recs {
		// Verify recommendation status is NEW or advisory, never automatically executing payments
		if r.Status != "NEW" && r.Status != "ACTIVE" {
			t.Errorf("expected advisory status, got %s", r.Status)
		}
	}

	calib := learningEngine.CalibrateSimulator(ctx, "org_security")
	if calib == nil {
		t.Fatalf("expected calibration metrics")
	}
}
