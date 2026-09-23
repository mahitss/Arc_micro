package economy

import (
	"context"
	"fmt"
	"math/big"
	"sync"
	"time"
)

// ObservationPipeline coordinates the ingestion, validation, and enrichment of economic observations.
//
// SECURITY INVARIANT:
// Observations can ONLY be submitted by internal execution gates (settled payments, verified results,
// validated timeouts, or the deterministic simulation sandbox). Untrusted user input is rejected.
type ObservationPipeline struct {
	mu           sync.RWMutex
	memoryStore  *EconomicMemoryStore
	learningEngine *EconomicLearningEngine
}

// NewObservationPipeline creates a new observation ingestion pipeline.
func NewObservationPipeline(memoryStore *EconomicMemoryStore, learningEngine *EconomicLearningEngine) *ObservationPipeline {
	return &ObservationPipeline{
		memoryStore:    memoryStore,
		learningEngine: learningEngine,
	}
}

// SetLearningEngine binds the learning engine if initialized after the pipeline.
func (p *ObservationPipeline) SetLearningEngine(engine *EconomicLearningEngine) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.learningEngine = engine
}

// IngestObservation normalizes, verifies, and records an economic observation.
func (p *ObservationPipeline) IngestObservation(ctx context.Context, obs *EconomicObservation) (*EconomicObservation, error) {
	if obs == nil {
		return nil, fmt.Errorf("observation is nil")
	}

	// Multi-tenant & security sanitization
	if obs.OrganizationID == "" {
		obs.OrganizationID = "global"
	}
	if obs.SimulationFlag == "" {
		obs.SimulationFlag = ModeReal
	}
	if obs.Scope == "" {
		obs.Scope = ScopeOrganization
	}
	if obs.Timestamp.IsZero() {
		obs.Timestamp = time.Now().UTC()
	}

	recorded, err := p.memoryStore.RecordObservation(ctx, obs)
	if err != nil {
		return nil, err
	}

	// Update lightweight feature store
	p.updateFeaturesFromObservation(ctx, recorded)

	// Trigger async drift and learning evaluations if engine is bound
	p.mu.RLock()
	le := p.learningEngine
	p.mu.RUnlock()

	if le != nil && recorded.SimulationFlag == ModeReal {
		// Non-blocking check for economic drift
		go func(o *EconomicObservation) {
			_ = le.EvaluateDrift(context.Background(), o.OrganizationID, o.GetProvider())
		}(recorded)
	}

	return recorded, nil
}

// IngestQuote records a price & duration quotation event.
func (p *ObservationPipeline) IngestQuote(ctx context.Context, orgID, agentID, serviceID, capability string, quotedCost string, quotedDurationMs int64, isSim bool) (*EconomicObservation, error) {
	mode := ModeReal
	if isSim {
		mode = ModeSimulation
	}

	metadata := make(map[string]interface{})
	if quotedDurationMs > 0 {
		metadata["quoted_duration_ms"] = float64(quotedDurationMs)
	}

	obs := &EconomicObservation{
		OrganizationID: orgID,
		AgentID:        agentID,
		ServiceID:      serviceID,
		Provider:       serviceID,
		Capability:     capability,
		EventType:      ObservationQuote,
		Outcome:        OutcomeSuccess,
		QuotedCost:     quotedCost,
		Price:          quotedCost,
		ExecutionDuration: quotedDurationMs,
		LatencyMs:      quotedDurationMs,
		Success:        true,
		SimulationFlag: mode,
		Metadata:       metadata,
	}

	return p.IngestObservation(ctx, obs)
}

// IngestExecutionSuccess records a successfully executed and verified service interaction.
func (p *ObservationPipeline) IngestExecutionSuccess(ctx context.Context, orgID, agentID, serviceID, capability string, quotedCost, settledCost string, latencyMs int64, qualityScore int64, isSim bool) (*EconomicObservation, error) {
	mode := ModeReal
	if isSim {
		mode = ModeSimulation
	}

	obs := &EconomicObservation{
		OrganizationID:     orgID,
		AgentID:            agentID,
		ServiceID:          serviceID,
		Provider:           serviceID,
		Capability:         capability,
		EventType:          ObservationExecution,
		Outcome:            OutcomeSuccess,
		QuotedCost:         quotedCost,
		SettledCost:        settledCost,
		Price:              settledCost,
		ExecutionDuration:  latencyMs,
		LatencyMs:          latencyMs,
		QualityScore:       qualityScore,
		Success:            true,
		VerificationResult: "VERIFIED",
		SimulationFlag:     mode,
	}

	return p.IngestObservation(ctx, obs)
}

// IngestExecutionFailure records a failed service interaction with failure classification.
func (p *ObservationPipeline) IngestExecutionFailure(ctx context.Context, orgID, agentID, serviceID, capability string, quotedCost string, latencyMs int64, failureReason string, failureClass FailureClass, isSim bool) (*EconomicObservation, error) {
	mode := ModeReal
	if isSim {
		mode = ModeSimulation
	}

	outcome := OutcomeFailure
	if failureClass == FailureTimeout || failureClass == FailureProviderTimeout {
		outcome = OutcomeTimeout
	} else if failureClass == FailureVerificationFailed {
		outcome = OutcomeVerificationFailed
	}

	metadata := map[string]interface{}{
		"failure_class": string(failureClass),
	}

	obs := &EconomicObservation{
		OrganizationID:    orgID,
		AgentID:           agentID,
		ServiceID:         serviceID,
		Provider:          serviceID,
		Capability:        capability,
		EventType:         ObservationFailure,
		Outcome:           outcome,
		QuotedCost:        quotedCost,
		Price:             "0",
		ExecutionDuration: latencyMs,
		LatencyMs:         latencyMs,
		Success:           false,
		FailureReason:     failureReason,
		SimulationFlag:    mode,
		Metadata:          metadata,
	}

	return p.IngestObservation(ctx, obs)
}

// IngestVerificationResult records the outcome of an independent verification check.
func (p *ObservationPipeline) IngestVerificationResult(ctx context.Context, orgID, agentID, serviceID string, passed bool, details string, isSim bool) (*EconomicObservation, error) {
	mode := ModeReal
	if isSim {
		mode = ModeSimulation
	}

	outcome := OutcomeSuccess
	evType := ObservationResultValidated
	if !passed {
		outcome = OutcomeVerificationFailed
		evType = ObservationResultRejected
	}

	obs := &EconomicObservation{
		OrganizationID:     orgID,
		AgentID:            agentID,
		ServiceID:          serviceID,
		Provider:           serviceID,
		EventType:          evType,
		Outcome:            outcome,
		Success:            passed,
		VerificationResult: details,
		SimulationFlag:     mode,
	}

	return p.IngestObservation(ctx, obs)
}

// IngestMissionCompletion records a holistic mission outcome.
func (p *ObservationPipeline) IngestMissionCompletion(ctx context.Context, summary *MissionOutcomeSummary) error {
	if summary == nil {
		return fmt.Errorf("summary is nil")
	}
	p.memoryStore.RecordMissionSummary(ctx, summary)

	// Close learning loop if calibration engine exists
	p.mu.RLock()
	le := p.learningEngine
	p.mu.RUnlock()

	if le != nil {
		le.RecordMissionOutcome(ctx, summary)
	}

	return nil
}

// IngestSwarmCompletion records a multi-agent swarm execution outcome.
func (p *ObservationPipeline) IngestSwarmCompletion(ctx context.Context, summary *SwarmOutcomeSummary) error {
	if summary == nil {
		return fmt.Errorf("swarm summary is nil")
	}
	p.memoryStore.RecordSwarmSummary(ctx, summary)

	p.mu.RLock()
	le := p.learningEngine
	p.mu.RUnlock()

	if le != nil {
		le.RecordSwarmOutcome(ctx, summary)
	}

	return nil
}

// updateFeaturesFromObservation populates the deterministic feature store.
func (p *ObservationPipeline) updateFeaturesFromObservation(ctx context.Context, obs *EconomicObservation) {
	if obs == nil || obs.SimulationFlag == ModeSimulation {
		// INVARIANT: Feature store for production decisions only consumes REAL observations
		return
	}

	provider := obs.GetProvider()
	if provider == "" {
		return
	}

	now := time.Now().UTC()
	// Record latency feature
	if obs.GetDurationMs() > 0 {
		p.memoryStore.RecordFeature(ctx, &PerformanceFeature{
			FeatureKey:         fmt.Sprintf("provider:%s:last_latency_ms", provider),
			EntityID:           provider,
			OrganizationID:     obs.OrganizationID,
			Value:              fmt.Sprintf("%d", obs.GetDurationMs()),
			NumericValue:       float64(obs.GetDurationMs()),
			Source:             "pipeline:observation",
			TimeWindow:         "latest",
			SampleCount:        1,
			ComputationVersion: "v1",
			GeneratedAt:        now,
		})
	}

	// Record success flag
	succVal := 0.0
	if obs.Success {
		succVal = 1.0
	}
	p.memoryStore.RecordFeature(ctx, &PerformanceFeature{
		FeatureKey:         fmt.Sprintf("provider:%s:last_success", provider),
		EntityID:           provider,
		OrganizationID:     obs.OrganizationID,
		Value:              fmt.Sprintf("%t", obs.Success),
		NumericValue:       succVal,
		Source:             "pipeline:observation",
		TimeWindow:         "latest",
		SampleCount:        1,
		ComputationVersion: "v1",
		GeneratedAt:        now,
	})

	// Record price feature
	if obs.GetSettledCost() != "" {
		if pInt, ok := new(big.Int).SetString(obs.GetSettledCost(), 10); ok {
			p.memoryStore.RecordFeature(ctx, &PerformanceFeature{
				FeatureKey:         fmt.Sprintf("provider:%s:last_price_micro", provider),
				EntityID:           provider,
				OrganizationID:     obs.OrganizationID,
				Value:              obs.GetSettledCost(),
				NumericValue:       float64(pInt.Int64()),
				Source:             "pipeline:observation",
				TimeWindow:         "latest",
				SampleCount:        1,
				ComputationVersion: "v1",
				GeneratedAt:        now,
			})
		}
	}
}
