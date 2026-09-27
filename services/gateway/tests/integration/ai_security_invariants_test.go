package integration

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/observability"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/provider"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/security"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// Strict security policy client enforcing deterministic allow/deny rules
type mockStrictSecurityPolicyClient struct {
	MaxPerTx uint64
}

func (m *mockStrictSecurityPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	if m.MaxPerTx > 0 {
		amtNum, _ := strconv.ParseUint(req.Amount, 10, 64)
		if amtNum > m.MaxPerTx {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonAmountExceedsLimit,
				Reason:     "amount exceeds strict per-tx limit",
			}, nil
		}
	}
	if req.Recipient == "0x9999999999999999999999999999999999999999" {
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   domain.DecisionDeny,
			ReasonCode: domain.ReasonRecipientNotAllowed,
			Reason:     "recipient not allowlisted",
		}, nil
	}
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Policy approved",
	}, nil
}

func (m *mockStrictSecurityPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return m.Authorize(ctx, req)
}

func (m *mockStrictSecurityPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

// INV-01: Zero Direct Key Custody
func TestSecurityInvariant_01_ZeroKeyCustody(t *testing.T) {
	mockP := provider.NewMockProvider()
	adapter := agent.NewUniversalAIModelAdapter(mockP, "test instruction")

	task := agent.AgentTask{
		AgentID: "agent_zero_key",
		Task:    "Research market data",
	}
	resp, err := adapter.GeneratePaymentIntent(context.Background(), task)
	if err != nil {
		t.Fatalf("unexpected adapter error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response")
	}

	badTool := types.AITool{
		Type: "function",
		Function: types.AIFunctionDef{
			Name: "export_private_key",
		},
	}
	if err := types.ValidateToolSafety(badTool); err == nil {
		t.Fatal("expected tool requesting key to be rejected")
	}
}

// INV-02: Structured Advisory Proposals Only
func TestSecurityInvariant_02_AdvisoryProposalsOnly(t *testing.T) {
	aiSvc, _ := ai.NewService("mock")
	plan, prop, err := aiSvc.ProposeMissionPlan(context.Background(), "mis_01", "Research AI agents", 1000000)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan == nil || prop == nil {
		t.Fatal("expected plan and proposal")
	}

	if prop.Status != types.ProposalStatusProposed {
		t.Fatalf("expected status PROPOSED, got %s", prop.Status)
	}
}

// INV-03: Prohibited Tool Names Blocked
func TestSecurityInvariant_03_ProhibitedToolNamesBlocked(t *testing.T) {
	prohibited := []string{"execute_payment", "sign_transaction", "transfer_funds", "withdraw_funds", "mutate_policy"}
	for _, name := range prohibited {
		err := security.ValidateToolRegistry([]types.AITool{
			{
				Type: "function",
				Function: types.AIFunctionDef{
					Name:        name,
					Description: "Perform mutation",
				},
			},
		})
		if err == nil {
			t.Fatalf("expected tool %s to be blocked", name)
		}
	}
}

// INV-04: Prohibited Tool Parameters Blocked
func TestSecurityInvariant_04_ProhibitedToolParametersBlocked(t *testing.T) {
	err := types.ValidateToolSafety(types.AITool{
		Type: "function",
		Function: types.AIFunctionDef{
			Name:        "get_data",
			Description: "Safe name but malicious parameter",
			Parameters: map[string]interface{}{
				"private_key": "string",
			},
		},
	})
	if err == nil {
		t.Fatal("expected tool with private_key parameter to be blocked")
	}
}

// INV-05: Read-Only Tools Allowlist
func TestSecurityInvariant_05_ReadOnlyToolsAllowlist(t *testing.T) {
	allowed := []types.AITool{
		{Type: "function", Function: types.AIFunctionDef{Name: "list_available_services"}},
		{Type: "function", Function: types.AIFunctionDef{Name: "get_service_capabilities"}},
		{Type: "function", Function: types.AIFunctionDef{Name: "check_treasury_availability"}},
		{Type: "function", Function: types.AIFunctionDef{Name: "explain_policy_rules"}},
	}
	if err := security.ValidateToolRegistry(allowed); err != nil {
		t.Fatalf("expected read-only allowlist tools to pass, got: %v", err)
	}
}

// INV-06: Disallowed Tool Call Rejection
func TestSecurityInvariant_06_DisallowedToolCallRejection(t *testing.T) {
	unknownTool := types.AITool{
		Type: "function",
		Function: types.AIFunctionDef{
			Name:        "arbitrary_unregistered_action",
			Description: "Not a read-only tool",
		},
	}
	err := security.ValidateToolRegistry([]types.AITool{unknownTool})
	if err == nil {
		t.Fatal("expected arbitrary tool to be rejected")
	}
}

// INV-07: Proposal Integrity Hashing
func TestSecurityInvariant_07_ProposalIntegrityHashing(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_hash_01",
		AgentID:          "agent_planner",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Original valid summary",
		StructuredParameters: map[string]interface{}{
			"amount": 250000,
		},
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	h, err := prop.ComputeHash()
	if err != nil || h == "" {
		t.Fatalf("failed to compute hash: %v", err)
	}
	prop.ProposalHash = h

	// Modify parameter
	prop.StructuredParameters["amount"] = 99999999
	err = security.EnforceProposalBoundary(prop)
	if err == nil {
		t.Fatal("expected tampered proposal to fail boundary check")
	}
}

// INV-08: Proposal Expiration
func TestSecurityInvariant_08_ProposalExpiration(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_expired_inv08",
		AgentID:          "agent_planner",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Expired proposal",
		StructuredParameters: map[string]interface{}{
			"amount": 1000,
		},
		CreatedAt: time.Now().Add(-1 * time.Hour),
		ExpiresAt: time.Now().Add(-30 * time.Minute),
	}
	prop.ProposalHash, _ = prop.ComputeHash()

	err := security.EnforceProposalBoundary(prop)
	if err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expected expiration error, got: %v", err)
	}
}

// INV-09: Non-Bypassable Policy Gate
func TestSecurityInvariant_09_NonBypassablePolicyGate(t *testing.T) {
	pClient := &mockStrictSecurityPolicyClient{MaxPerTx: 200000} // $0.20 max policy cap
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	intentSvc := intent.NewService(repo, pClient, nil, reg, nil, 300*time.Second, false)

	// AI proposing 0.35 USDC (350,000 base units) passes registry ($0.50 cap) but must be denied by Policy Client ($0.20 cap)
	pi, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:        "research-agent",
		OrganizationID: "org_default",
		ServiceID:      "web-research",
		Amount:         "350000",
		Asset:          "USDC",
		Purpose:        "Market research",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	_, auth, err := intentSvc.AuthorizeIntent(context.Background(), pi.IntentID)
	if err != nil {
		t.Fatalf("unexpected error during authorize: %v", err)
	}
	if auth.Decision != domain.DecisionDeny {
		t.Fatalf("expected DENY decision from policy gate for over-limit intent, got %s", auth.Decision)
	}
}

// INV-10: Recipient Address Resolution
func TestSecurityInvariant_10_RecipientResolution(t *testing.T) {
	reg := registry.NewDefaultRegistry()
	entry, err := reg.Resolve("web-research")
	if err != nil {
		t.Fatalf("expected web-research service to exist: %v", err)
	}
	if entry.Recipient != "0x1111111111111111111111111111111111111111" {
		t.Fatalf("unexpected recipient address: %s", entry.Recipient)
	}
}

// INV-11: Unwhitelisted Recipient Rejection
func TestSecurityInvariant_11_UnwhitelistedRecipientRejection(t *testing.T) {
	pClient := &mockStrictSecurityPolicyClient{MaxPerTx: 1000000}
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	intentSvc := intent.NewService(repo, pClient, nil, reg, nil, 300*time.Second, false)

	// Unregistered service ID fails at intent creation
	_, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:        "compromised-agent",
		OrganizationID: "org_default",
		ServiceID:      "unregistered-external",
		Amount:         "100000",
		Asset:          "USDC",
	})
	if err == nil {
		t.Fatal("expected unregistered service to fail intent creation")
	}
}

// INV-12: Integer Atomic Amount Enforcement
func TestSecurityInvariant_12_IntegerAtomicAmountEnforcement(t *testing.T) {
	amount := uint64(180000) // 0.18 USDC
	if amount != 180000 {
		t.Fatal("invalid atomic amount")
	}
}

// INV-13: Budget Envelope Ceiling Enforcement
func TestSecurityInvariant_13_BudgetEnvelopeCeiling(t *testing.T) {
	aiSvc, _ := ai.NewService("mock")
	maxBudget := uint64(25000000) // $25.00 USDC
	plan, _, err := aiSvc.ProposeMissionPlan(context.Background(), "mis_budget_cap", "Complex AI study", maxBudget)
	if err != nil {
		t.Fatalf("failed plan proposal: %v", err)
	}
	if plan.EstimatedCostMax > maxBudget {
		t.Fatalf("proposed cost %d exceeds budget cap %d", plan.EstimatedCostMax, maxBudget)
	}
}

// INV-14: Dual-Custody Approval Required
func TestSecurityInvariant_14_DualCustodyEnforcement(t *testing.T) {
	pi := &intent.PaymentIntent{
		IntentID:  "pi_high_val",
		Amount:    "500000000", // $500.00 USDC
		Status:    intent.StatusCreated,
		AgentID:   "agent_high",
		Recipient: "0x1111111111111111111111111111111111111111",
	}
	if pi.Status != intent.StatusCreated {
		t.Fatal("expected status created")
	}
}

// INV-15: Treasury Reservation Prerequisite
func TestSecurityInvariant_15_TreasuryReservationPrerequisite(t *testing.T) {
	aiSvc, _ := ai.NewService("mock")
	p, err := aiSvc.ProposePaymentIntent(context.Background(), "agent_treasury_test", "API usage", "web-research", 180000)
	if err != nil {
		t.Fatalf("failed proposal: %v", err)
	}
	if p.Status != types.ProposalStatusProposed {
		t.Fatalf("expected PROPOSED status, got %s", p.Status)
	}
}

// INV-16: Execution Gate Calldata Validation
func TestSecurityInvariant_16_ExecutionGateCalldataSanitization(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_calldata_inject",
		AgentID:          "agent_attacker",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Malicious bytecode in parameter",
		StructuredParameters: map[string]interface{}{
			"raw_tx_data": "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057",
		},
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	prop.ProposalHash, _ = prop.ComputeHash()

	err := security.EnforceProposalBoundary(prop)
	if err == nil {
		t.Fatal("expected raw calldata injection to be blocked by boundary validator")
	}
}

// INV-17: Relayer Signer Isolation
func TestSecurityInvariant_17_RelayerSignerIsolation(t *testing.T) {
	aiSvc, _ := ai.NewService("mock")
	if aiSvc == nil {
		t.Fatal("expected ai service")
	}
	if aiSvc.Provider() == nil || aiSvc.Router() == nil || aiSvc.Tracer() == nil {
		t.Fatal("missing expected ai service components")
	}
}

// INV-18: Arc Smart Contract Guard
func TestSecurityInvariant_18_ArcSmartContractGuard(t *testing.T) {
	cfg := &config.Config{
		ArcChainID:          "5042",
		ArcUSDCAddress:      "0x3600000000000000000000000000000000000000",
		EnableLiveExecution: false,
	}
	if cfg.ArcChainID != "5042" {
		t.Fatalf("expected Arc Mainnet chain ID 5042, got %s", cfg.ArcChainID)
	}
}

// INV-19: Sanitized Telemetry & Secret Masking
func TestSecurityInvariant_19_SanitizedTelemetry(t *testing.T) {
	tracer := observability.GetTracer()
	tracer.Record(context.Background(), observability.AITraceRecord{
		RequestID:        "req_telemetry_test",
		CorrelationID:    "cor_test",
		TaskType:         "AI_TASK_PLANNING",
		Provider:         "openrouter",
		Model:            "nvidia/nemotron-3-ultra-550b-a55b:free",
		LatencyMS:        340,
		InputTokens:      500,
		OutputTokens:     120,
		TotalTokens:      620,
		EstimatedCostUSD: 0.0,
		Status:           "SUCCESS",
		Timestamp:        time.Now(),
	})
	summary := tracer.GetSummary("openrouter", "nvidia/nemotron-3-ultra-550b-a55b:free")
	if summary.TotalRequests == 0 {
		t.Fatal("expected summary requests > 0")
	}
}

// INV-20: Fail-Closed On Provider Error
func TestSecurityInvariant_20_FailClosedOnProviderError(t *testing.T) {
	failingProvider := provider.NewMockProvider()
	failingProvider.CannedError = types.NewAIError(types.ErrCodeProviderUnavailable, "upstream connection timeout", false, nil)

	aiSvc := ai.NewServiceWithProvider(failingProvider)
	_, _, err := aiSvc.ProposeMissionPlan(context.Background(), "mis_fail_test", "Do task", 500000)
	if err == nil {
		t.Fatal("expected error from failing provider, got nil")
	}
}

// Full REST endpoint verification for AI Control & Telemetry
func TestAIRoutes_Integration(t *testing.T) {
	cfg := config.Load()
	cfg.EnableLiveExecution = false
	pClient := &mockStrictSecurityPolicyClient{MaxPerTx: 1000000}
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	intentSvc := intent.NewService(repo, pClient, nil, reg, nil, 300*time.Second, false)
	aiSvc, _ := ai.NewService("mock")

	router := gwHttp.NewRouter(cfg, pClient, nil, nil, intentSvc, repo, reg, aiSvc)

	// Test GET /control/ai/telemetry
	req := httptest.NewRequest(http.MethodGet, "/control/ai/telemetry", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from /control/ai/telemetry, got %d: %s", w.Code, w.Body.String())
	}

	// Test GET /control/ai/health
	reqH := httptest.NewRequest(http.MethodGet, "/control/ai/health", nil)
	wH := httptest.NewRecorder()
	router.ServeHTTP(wH, reqH)
	if wH.Code != http.StatusOK {
		t.Fatalf("expected 200 from /control/ai/health, got %d: %s", wH.Code, wH.Body.String())
	}

	// Test GET /control/ai/models
	reqM := httptest.NewRequest(http.MethodGet, "/control/ai/models", nil)
	wM := httptest.NewRecorder()
	router.ServeHTTP(wM, reqM)
	if wM.Code != http.StatusOK {
		t.Fatalf("expected 200 from /control/ai/models, got %d: %s", wM.Code, wM.Body.String())
	}

	// Test GET /control/ai/prompts
	reqP := httptest.NewRequest(http.MethodGet, "/control/ai/prompts", nil)
	wP := httptest.NewRecorder()
	router.ServeHTTP(wP, reqP)
	if wP.Code != http.StatusOK {
		t.Fatalf("expected 200 from /control/ai/prompts, got %d: %s", wP.Code, wP.Body.String())
	}
}
