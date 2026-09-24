package operations

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestOperationsDecisionEngine_DeterministicTransitions(t *testing.T) {
	engine := NewOperationsDecisionEngine()

	// 1. Ready to execute
	in := DecisionInputs{
		TenantID:      "tenant_1",
		WorkflowID:    "wf_1",
		StepID:        "step_1",
		WorkflowState: "RUNNING",
		StepState:     "PENDING",
		TimeRemaining: 10 * time.Minute,
		Attempts:      0,
		MaxAttempts:   3,
		StateVersion:  1,
	}
	dec, err := engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionRun {
		t.Errorf("expected DecisionRun, got %s", dec.DecisionType)
	}
	if dec.FinancialAuthority != "UNCHANGED" {
		t.Errorf("expected FinancialAuthority UNCHANGED, got %s", dec.FinancialAuthority)
	}

	// 2. Policy DENY strictly produces CANCEL (INV-122, INV-125)
	in.IsFinancial = true
	in.PolicyDecision = "DENY"
	dec, err = engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionCancel {
		t.Errorf("expected DecisionCancel for policy DENY, got %s", dec.DecisionType)
	}
	if dec.ReasonCode != "POLICY_HARD_DENY" {
		t.Errorf("expected reason POLICY_HARD_DENY, got %s", dec.ReasonCode)
	}

	// 3. Approval Required & Expired produces ESCALATE (INV-123)
	in.PolicyDecision = "APPROVAL_REQUIRED"
	in.ApprovalApproved = false
	in.ApprovalExpired = true
	dec, err = engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionEscalate {
		t.Errorf("expected DecisionEscalate for expired approval, got %s", dec.DecisionType)
	}

	// 4. Missing Treasury Reservation produces WAIT (INV-124)
	in.ApprovalApproved = true
	in.ApprovalExpired = false
	in.HasReservation = false
	dec, err = engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionWait {
		t.Errorf("expected DecisionWait for missing reservation, got %s", dec.DecisionType)
	}

	// 5. Ambiguous Blockchain Submission produces RECONCILE (INV-106)
	in.HasReservation = true
	in.StepState = "AMBIGUOUS"
	dec, err = engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionReconcile {
		t.Errorf("expected DecisionReconcile for ambiguous step, got %s", dec.DecisionType)
	}

	// 6. Provider Circuit Open produces REPLAN
	in.StepState = "PENDING"
	in.ProviderStatus = "CIRCUIT_OPEN"
	dec, err = engine.Evaluate(in)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if dec.DecisionType != DecisionReplan {
		t.Errorf("expected DecisionReplan for circuit open provider, got %s", dec.DecisionType)
	}
}

func TestPriorityEngine_BoundedCalculation(t *testing.T) {
	pe := NewPriorityEngine()

	// High urgency: tight deadline + recovery + high tier
	pHigh := pe.CalculatePriority(PriorityFactors{
		DeadlineProximitySeconds: 120, // 2 mins
		DependencyCriticality:    4,
		WorkflowAgeSeconds:       600,
		IsRecovery:               true,
		TenantPriorityTier:       3,
		ResourceAvailability:     1.0,
	})
	if pHigh <= 500 {
		t.Errorf("expected high priority > 500, got %d", pHigh)
	}
	if pHigh > 1000 {
		t.Errorf("priority cannot exceed 1000, got %d", pHigh)
	}

	// Low urgency
	pLow := pe.CalculatePriority(PriorityFactors{
		DeadlineProximitySeconds: 7200,
		DependencyCriticality:    0,
		WorkflowAgeSeconds:       10,
		IsRecovery:               false,
		TenantPriorityTier:       0,
		ResourceAvailability:     1.0,
	})
	if pLow >= pHigh {
		t.Errorf("expected low priority < high priority, got pLow=%d, pHigh=%d", pLow, pHigh)
	}
}

func TestResourceScheduler_TenantFairness(t *testing.T) {
	sched := NewResourceScheduler(20)

	// Set tenant quota to max 2 workflows
	sched.SetTenantQuota("tenant_A", TenantQuota{
		MaxConcurrentWorkflows: 2,
		MaxConcurrentTasks:     5,
		MaxRequestsPerMinute:   60,
	})

	// Tenant A acquires 2 slots
	if err := sched.AcquireSlot("tenant_A", true); err != nil {
		t.Fatalf("slot 1 failed: %v", err)
	}
	if err := sched.AcquireSlot("tenant_A", true); err != nil {
		t.Fatalf("slot 2 failed: %v", err)
	}

	// Tenant A 3rd slot must fail (quota exceeded, INV-126)
	if err := sched.AcquireSlot("tenant_A", true); err != ErrTenantQuotaExceeded {
		t.Errorf("expected ErrTenantQuotaExceeded for tenant_A, got %v", err)
	}

	// Tenant B should still be able to acquire slots (prevent starvation)
	if err := sched.AcquireSlot("tenant_B", true); err != nil {
		t.Errorf("tenant_B should acquire slot freely, got: %v", err)
	}

	// Release slot
	sched.ReleaseSlot("tenant_A", true)
	if err := sched.AcquireSlot("tenant_A", true); err != nil {
		t.Errorf("tenant_A should acquire slot after release, got: %v", err)
	}
}

func TestQueueManager_PriorityAndDeadLetter(t *testing.T) {
	qm := NewQueueManager()

	// Enqueue low priority item
	_, err := qm.Enqueue(QueueItem{
		TenantID:       "tenant_1",
		QueueName:      QueueTask,
		Priority:       100,
		IdempotencyKey: "item_low",
		Payload:        map[string]interface{}{"data": "low"},
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}

	// Enqueue high priority item
	_, err = qm.Enqueue(QueueItem{
		TenantID:       "tenant_1",
		QueueName:      QueueTask,
		Priority:       900,
		IdempotencyKey: "item_high",
		Payload:        map[string]interface{}{"data": "high"},
	})
	if err != nil {
		t.Fatalf("enqueue failed: %v", err)
	}

	// Dequeue should yield item_high first
	dequeued, err := qm.Dequeue("tenant_1", QueueTask, "worker_1", 30*time.Second)
	if err != nil {
		t.Fatalf("dequeue failed: %v", err)
	}
	if dequeued.IdempotencyKey != "item_high" {
		t.Errorf("expected item_high dequeued first, got %s", dequeued.IdempotencyKey)
	}

	// Reject item until max attempts reached -> dead lettered (INV-128)
	dequeued.Attempts = 5 // max attempts
	dequeued.MaxAttempts = 5
	dl, err := qm.Reject("tenant_1", dequeued.ItemID, "permanent provider crash", "evidence_log_xyz")
	if err != nil {
		t.Fatalf("reject failed: %v", err)
	}
	if dl == nil {
		t.Fatalf("expected dead letter item produced")
	}
	if dl.Reason != "permanent provider crash" {
		t.Errorf("expected reason preserved, got %s", dl.Reason)
	}

	// Check dead letters list
	dls := qm.ListDeadLetters("tenant_1")
	if len(dls) != 1 {
		t.Errorf("expected 1 dead letter, got %d", len(dls))
	}
}

func TestHealthProber_ArcTruthfulness(t *testing.T) {
	// Case 1: RPC connected, Vault unverified -> NOT VERIFIED / NOT DEPLOYED (INV-135)
	prober1 := NewHealthProber(nil, nil, func(ctx context.Context) (bool, error) {
		return true, nil
	}, "", false)

	arcState1 := prober1.ProbeArc(context.Background())
	if arcState1.StatusText != "NOT VERIFIED / NOT DEPLOYED" {
		t.Errorf("expected 'NOT VERIFIED / NOT DEPLOYED', got %s", arcState1.StatusText)
	}
	if arcState1.RecentSettlementVerified {
		t.Errorf("unverified vault cannot claim recent settlement verified")
	}

	// Case 2: RPC down -> RPC_DOWN
	prober2 := NewHealthProber(nil, nil, func(ctx context.Context) (bool, error) {
		return false, nil
	}, "0x1234567890abcdef1234567890abcdef12345678", false)

	arcState2 := prober2.ProbeArc(context.Background())
	if arcState2.StatusText != "RPC_DOWN" {
		t.Errorf("expected 'RPC_DOWN', got %s", arcState2.StatusText)
	}

	// Case 3: Live execution enabled with verified vault
	prober3 := NewHealthProber(nil, nil, func(ctx context.Context) (bool, error) {
		return true, nil
	}, "0x1234567890abcdef1234567890abcdef12345678", true)

	arcState3 := prober3.ProbeArc(context.Background())
	if arcState3.StatusText != "LIVE_VERIFIED" {
		t.Errorf("expected 'LIVE_VERIFIED', got %s", arcState3.StatusText)
	}
}

func TestIncidentCorrelation_ForbiddenMitigations(t *testing.T) {
	ice := NewIncidentCorrelationEngine()
	inc := ice.RecordFailure("tenant_1", "DATABASE_LATENCY", SeverityHigh, "connection pool exhausted", "wf_1", "db_primary", "corr_db_01")

	// Attempt forbidden mitigation: INCREASE_LIMIT (INV-132)
	err := ice.ApplyMitigation("tenant_1", inc.IncidentID, "INCREASE_LIMIT_TO_FORCE_PAYMENT")
	if err == nil || !strings.Contains(err.Error(), "forbidden mitigation") {
		t.Errorf("expected ErrForbiddenMitigation, got %v", err)
	}

	// Attempt forbidden mitigation: BYPASS_POLICY (INV-122)
	err = ice.ApplyMitigation("tenant_1", inc.IncidentID, "BYPASS_POLICY_GATE")
	if err == nil || !strings.Contains(err.Error(), "forbidden mitigation") {
		t.Errorf("expected ErrForbiddenMitigation for bypass policy, got %v", err)
	}

	// Permitted safe mitigation: RESTART_WORKER
	err = ice.ApplyMitigation("tenant_1", inc.IncidentID, "RESTART_WORKER")
	if err != nil {
		t.Errorf("expected RESTART_WORKER allowed, got %v", err)
	}
	if inc.State != IncidentStateMitigating {
		t.Errorf("expected state MITIGATING, got %s", inc.State)
	}
}

func TestCircuitBreaker_TripsAndHalfOpen(t *testing.T) {
	cbr := NewCircuitBreakerRegistry()
	cb := cbr.GetOrCreate("tenant_1", "PROVIDER", "provider_fast_data")
	cb.Threshold = 3
	cb.CooldownSeconds = 1

	// Record 3 failures
	cbr.RecordFailure("tenant_1", "PROVIDER", "provider_fast_data")
	cbr.RecordFailure("tenant_1", "PROVIDER", "provider_fast_data")
	cbr.RecordFailure("tenant_1", "PROVIDER", "provider_fast_data")

	// Must be OPEN
	if cbr.AllowExecution("tenant_1", "PROVIDER", "provider_fast_data") {
		t.Errorf("expected circuit to be OPEN and reject execution")
	}

	// Wait for cooldown
	time.Sleep(1100 * time.Millisecond)

	// Next check transitions to HALF_OPEN and allows probe
	if !cbr.AllowExecution("tenant_1", "PROVIDER", "provider_fast_data") {
		t.Errorf("expected probe execution permitted in HALF_OPEN")
	}

	// Success resets to CLOSED
	cbr.RecordSuccess("tenant_1", "PROVIDER", "provider_fast_data")
	if cb.State != CircuitClosed {
		t.Errorf("expected circuit to reset to CLOSED, got %s", cb.State)
	}
}

func TestPlanManager_FinancialDiffFlagsRevalidation(t *testing.T) {
	pm := NewPlanManager()

	initialSteps := []PlanStep{
		{StepID: "s1", StepType: "RESEARCH", IsFinancial: false},
	}
	_, err := pm.CreatePlan("tenant_1", "wf_plan_test", initialSteps, nil)
	if err != nil {
		t.Fatalf("create plan failed: %v", err)
	}

	// Add a financial step in v2
	v2Steps := []PlanStep{
		{StepID: "s1", StepType: "RESEARCH", IsFinancial: false},
		{StepID: "s2", StepType: "PAY_MILESTONE", IsFinancial: true},
	}
	plan2, diff, err := pm.MutatePlan("tenant_1", "wf_plan_test", v2Steps, nil)
	if err != nil {
		t.Fatalf("mutate plan failed: %v", err)
	}

	if plan2.PlanVersion != 2 {
		t.Errorf("expected plan version 2, got %d", plan2.PlanVersion)
	}
	if !diff.PolicyRevalidationRequired {
		t.Errorf("adding financial step must flag policy_revalidation_required (INV-131)")
	}
}
