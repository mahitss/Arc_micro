package constitution

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

func TestDefaultConstitutionAndHashing(t *testing.T) {
	c := DefaultConstitution("org_test_01")
	if c.OrganizationID != "org_test_01" {
		t.Fatalf("expected org_test_01, got %s", c.OrganizationID)
	}
	if c.Version != 1 {
		t.Fatalf("expected version 1, got %d", c.Version)
	}
	if c.PolicyHash == "" {
		t.Fatal("expected non-empty policy hash")
	}

	// Invariant INV-42: Deterministic Policy Hash
	hash2 := c.CalculatePolicyHash()
	if c.PolicyHash != hash2 {
		t.Fatalf("policy hash must be deterministic: %s != %s", c.PolicyHash, hash2)
	}
}

func TestEvaluatorDecisions(t *testing.T) {
	eval := NewEvaluator()
	c := DefaultConstitution("org_test_01")

	// 1. Valid payment under thresholds -> ALLOW
	ctx1 := PolicyEvaluationContext{
		OrganizationID:      "org_test_01",
		AgentID:             "agent_01",
		Amount:              "5000000", // 5 USDC
		Currency:            "USDC",
		RecipientAddress:    "0x1234567890123456789012345678901234567890",
		RiskScore:           20,
		TrustScoreBps:       9500,
		DelegationDepth:     0,
		ConstitutionVersion: 1,
		Timestamp:           time.Now().UTC(),
	}
	dec1 := eval.Evaluate(&c, ctx1)
	if dec1.Decision != domain.DecisionAllow {
		t.Fatalf("expected ALLOW for 5 USDC, got %s (Reason: %s)", dec1.Decision, dec1.Reason)
	}

	// 2. Amount > 10 USDC -> REQUIRE_APPROVAL
	ctx2 := ctx1
	ctx2.Amount = "15000000" // 15 USDC
	dec2 := eval.Evaluate(&c, ctx2)
	// Default constitution single payment limit is 10 USDC, so 15 USDC should be DENIED by limit
	if dec2.Decision != domain.DecisionDeny {
		t.Fatalf("expected DENY for 15 USDC (exceeds single limit of 10 USDC), got %s", dec2.Decision)
	}

	// 3. Amount > approval threshold (e.g. 10 USDC) when single payment limit is higher
	cExpanded := c
	for i := range cExpanded.Rules {
		if cExpanded.Rules[i].Type == RuleTypeSpendingLimit && cExpanded.Rules[i].SpendingLimit != nil {
			cExpanded.Rules[i].SpendingLimit.MaxSinglePayment = "50000000" // 50 USDC
		}
	}
	dec3 := eval.Evaluate(&cExpanded, ctx2)
	if dec3.Decision != domain.DecisionApprovalRequired {
		t.Fatalf("expected REQUIRE_APPROVAL for 15 USDC under 50 USDC ceiling, got %s", dec3.Decision)
	}

	// 4. Prohibited Asset -> DENY
	ctx4 := ctx1
	ctx4.Currency = "ETH"
	dec4 := eval.Evaluate(&c, ctx4)
	if dec4.Decision != domain.DecisionDeny {
		t.Fatalf("expected DENY for ETH asset, got %s", dec4.Decision)
	}

	// 5. Delegation Depth > 3 -> HARD DENY
	ctx5 := ctx1
	ctx5.DelegationDepth = 4
	dec5 := eval.Evaluate(&c, ctx5)
	if dec5.Decision != domain.DecisionDeny {
		t.Fatalf("expected DENY for delegation depth 4, got %s", dec5.Decision)
	}

	// 6. Emergency Global Pause -> DENY
	ctx6 := ctx1
	ctx6.IsGlobalPaused = true
	dec6 := eval.Evaluate(&c, ctx6)
	if dec6.Decision != domain.DecisionDeny || dec6.ReasonCode != domain.ReasonGlobalPaused {
		t.Fatalf("expected DENY with GLOBAL_PAUSED, got %s / %s", dec6.Decision, dec6.ReasonCode)
	}
}

func TestHierarchicalInheritanceMonotonicity(t *testing.T) {
	resolver := NewInheritanceResolver()
	c := DefaultConstitution("org_test_01")

	// 1. Child narrows limit -> SUCCESS
	agentLimits := &SpendingLimitRule{
		MaxSinglePayment: "5000000",  // 5 USDC (parent is 10)
		DailyBudgetLimit: "20000000", // 20 USDC (parent is 100)
	}
	eff, err := resolver.ComposeEffectiveScope(&c, agentLimits, nil, nil)
	if err != nil {
		t.Fatalf("failed to compose narrowed child scope: %v", err)
	}
	if eff.MaxSinglePayment != "5000000" {
		t.Fatalf("expected 5000000, got %s", eff.MaxSinglePayment)
	}
	if eff.DailyBudgetLimit != "20000000" {
		t.Fatalf("expected 20000000, got %s", eff.DailyBudgetLimit)
	}

	// 2. Child attempts authority escalation -> REJECTED (INV-33)
	escalatedAgent := &SpendingLimitRule{
		MaxSinglePayment: "25000000", // 25 USDC > Parent 10 USDC!
	}
	_, errEsc := resolver.ComposeEffectiveScope(&c, escalatedAgent, nil, nil)
	if errEsc == nil {
		t.Fatal("expected ErrAuthorityEscalation for child attempting to declare higher single limit than parent")
	}

	// 3. Mission attempts budget escalation -> REJECTED (INV-34)
	escalatedMission := &MissionRule{
		MaxBudget: "150000000", // 150 USDC > Parent MaxMissionSpend 50 USDC!
	}
	_, errMiss := resolver.ComposeEffectiveScope(&c, nil, escalatedMission, nil)
	if errMiss == nil {
		t.Fatal("expected ErrAuthorityEscalation for mission budget escalation")
	}
}

func TestPolicyDiffAndAuthorityDelta(t *testing.T) {
	diffEngine := NewPolicyDiffEngine()
	v1 := DefaultConstitution("org_test_01")

	// Create v2 with expanded single payment limit (AUTHORITY_INCREASE)
	v2 := v1
	v2.Version = 2
	v2.Rules = make([]ConstitutionRule, len(v1.Rules))
	copy(v2.Rules, v1.Rules)
	for i := range v2.Rules {
		if v2.Rules[i].Type == RuleTypeSpendingLimit && v2.Rules[i].SpendingLimit != nil {
			sl := *v2.Rules[i].SpendingLimit
			sl.MaxSinglePayment = "25000000" // 10 -> 25 USDC
			v2.Rules[i].SpendingLimit = &sl
		}
	}

	diff := diffEngine.Diff(&v1, &v2)
	if diff.AuthorityDelta.Classification != "MORE_PERMISSIVE" {
		t.Fatalf("expected MORE_PERMISSIVE classification, got %s", diff.AuthorityDelta.Classification)
	}
	if len(diff.ModifiedRules) == 0 {
		t.Fatal("expected modified rules in diff")
	}
}

func TestPolicyTestRunner(t *testing.T) {
	runner := NewTestRunner(nil)
	c := DefaultConstitution("org_test_01")

	cases := []PolicyTestCase{
		{
			Name: "Permitted small payment",
			Context: PolicyEvaluationContext{
				OrganizationID:      "org_test_01",
				AgentID:             "agent_01",
				Amount:              "1000000", // 1 USDC
				Currency:            "USDC",
				ConstitutionVersion: 1,
				Timestamp:           time.Now().UTC(),
			},
			ExpectedDecision: domain.DecisionAllow,
		},
		{
			Name: "Blocked asset",
			Context: PolicyEvaluationContext{
				OrganizationID:      "org_test_01",
				AgentID:             "agent_01",
				Amount:              "1000000",
				Currency:            "BTC",
				ConstitutionVersion: 1,
				Timestamp:           time.Now().UTC(),
			},
			ExpectedDecision: domain.DecisionDeny,
		},
	}

	report := runner.RunTestSuite(&c, cases)
	if !report.Passed {
		t.Fatalf("expected all test cases to pass, but failed: %v", report.Failures)
	}
	if report.PassedTests != 2 {
		t.Fatalf("expected 2 passed tests, got %d", report.PassedTests)
	}
}

func TestAtomicActivationAndRollback(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	gov := NewGovernanceService(store)

	v1 := DefaultConstitution("org_test_01")
	if err := store.SaveConstitution(ctx, &v1); err != nil {
		t.Fatalf("failed to save genesis v1: %v", err)
	}

	active, err := store.GetActiveConstitution(ctx, "org_test_01")
	if err != nil {
		t.Fatalf("failed to get active v1: %v", err)
	}
	if active.Version != 1 {
		t.Fatalf("expected active version 1, got %d", active.Version)
	}

	// Propose v2
	v2Draft := v1
	v2Draft.Version = 2
	pcr, err := gov.ProposeChange(ctx, "org_test_01", v2Draft, "operator_alice")
	if err != nil {
		t.Fatalf("failed to propose v2: %v", err)
	}

	// Review & Approve
	_, err = gov.ReviewChange(ctx, pcr.RequestID, "reviewer_bob", true, "Approved v2 updates")
	if err != nil {
		t.Fatalf("failed to review v2: %v", err)
	}

	// Activate v2
	activated, err := gov.ActivateChange(ctx, pcr.RequestID, "approver_charlie", nil)
	if err != nil {
		t.Fatalf("failed to activate v2: %v", err)
	}
	if activated.Version != 2 {
		t.Fatalf("expected activated version 2, got %d", activated.Version)
	}

	// Verify active version is now 2 (INV-50)
	active2, _ := store.GetActiveConstitution(ctx, "org_test_01")
	if active2.Version != 2 {
		t.Fatalf("expected active version 2, got %d", active2.Version)
	}

	// Rollback to v1 (INV-51)
	rolledBack, err := gov.RollbackPolicy(ctx, "org_test_01", 1, "security_lead")
	if err != nil {
		t.Fatalf("failed to rollback to v1: %v", err)
	}
	if rolledBack.Version != 1 {
		t.Fatalf("expected active version 1 after rollback, got %d", rolledBack.Version)
	}

	activeAfterRollback, _ := store.GetActiveConstitution(ctx, "org_test_01")
	if activeAfterRollback.Version != 1 {
		t.Fatalf("expected active version 1, got %d", activeAfterRollback.Version)
	}
}
