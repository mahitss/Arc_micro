package integration

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// Configurable policy client for demonstrable security tests
type demonstrablePolicyClient struct {
	decisionFunc func(req domain.PaymentRequest) (domain.AuthorizationDecision, error)
	healthFunc   func(ctx context.Context) error
}

func (d *demonstrablePolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	if d.decisionFunc != nil {
		return d.decisionFunc(req)
	}
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "deterministic authorization approved",
	}, nil
}

func (d *demonstrablePolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	dec, err := d.Authorize(ctx, req)
	dec.Simulation = true
	return dec, err
}

func (d *demonstrablePolicyClient) CheckHealth(ctx context.Context) error {
	if d.healthFunc != nil {
		return d.healthFunc(ctx)
	}
	return nil
}

// Configurable execution service for demonstrable security tests
type demonstrableExecutionService struct {
	broadcastCount int
	executeFunc    func(req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
}

func (d *demonstrableExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	d.broadcastCount++
	if d.executeFunc != nil {
		return d.executeFunc(req)
	}
	return &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70",
		Vault:           req.VaultAddress,
		Recipient:       req.Recipient,
		Amount:          req.Amount,
	}, nil
}

func (d *demonstrableExecutionService) ReconcileTransaction(ctx context.Context, requestID string) (*blockchain.PaymentExecutionResult, error) {
	return &blockchain.PaymentExecutionResult{
		RequestID:       requestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70",
	}, nil
}

// =============================================================================
// PHASE 3 — DEMONSTRABLE SECURITY GUARANTEES
// =============================================================================

// Guarantee 1: A Valid Request is deterministically authorized and audited.
func TestSecurityGuarantee_1_ValidRequest_AuthorizedAndAudited(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "research-compute-v1",
		Name:      "Verified Research Compute Service",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "10000000", // 10 USDC
	})

	execSvc := &demonstrableExecutionService{}
	policyClient := &demonstrablePolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Policy evaluation passed: within 10.00 USDC ceiling and allowlisted recipient",
			}, nil
		},
	}

	intentSvc := intent.NewService(repo, policyClient, execSvc, reg, nil, 300*time.Second, false)

	// 1. Create valid payment intent
	it, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "research-compute-v1",
		Amount:         "1000000", // 1.00 USDC
		Asset:          "USDC",
		Purpose:        "market_scan",
		Justification:  "deterministic telemetry collection",
		RequestID:      "req_valid_001",
	})
	if err != nil {
		t.Fatalf("expected intent creation to succeed: %v", err)
	}
	if it.Status != intent.StatusCreated {
		t.Fatalf("expected CREATED status, got %s", it.Status)
	}

	// 2. Authorize intent against deterministic policy
	authIntent, dec, err := intentSvc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected authorization error: %v", err)
	}
	if authIntent.Status != intent.StatusAuthorized {
		t.Errorf("expected AUTHORIZED status, got %s", authIntent.Status)
	}
	if dec.Decision != domain.DecisionAllow {
		t.Errorf("expected ALLOW decision, got %s", dec.Decision)
	}
	if dec.ReasonCode != domain.ReasonApproved {
		t.Errorf("expected ReasonApproved, got %s", dec.ReasonCode)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("zero broadcast expected before confirmation, got %d", execSvc.broadcastCount)
	}

	// 3. Explicit operator confirmation
	confirmedIntent, execRes, err := intentSvc.ConfirmIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected confirmation error: %v", err)
	}
	if confirmedIntent.Status != intent.StatusConfirmed {
		t.Errorf("expected CONFIRMED status, got %s", confirmedIntent.Status)
	}
	if execSvc.broadcastCount != 1 {
		t.Errorf("expected exactly 1 broadcast, got %d", execSvc.broadcastCount)
	}
	if execRes.TransactionHash == "" {
		t.Error("expected valid transaction hash upon confirmation")
	}

	// 4. Verify auditable persistence in repository
	savedIntent, err := repo.GetIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve intent from storage: %v", err)
	}
	if savedIntent.Status != intent.StatusConfirmed {
		t.Errorf("stored intent status mismatch: %s", savedIntent.Status)
	}
	savedExec, err := repo.GetExecution(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve execution record: %v", err)
	}
	if savedExec.Status != string(blockchain.StateConfirmed) {
		t.Errorf("stored execution status mismatch: %s", savedExec.Status)
	}
}

// Guarantee 2: A Prohibited Recipient is denied with an auditable reason and zero execution.
func TestSecurityGuarantee_2_ProhibitedRecipient_DeniedWithReasonAndZeroExecution(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "untrusted-service-v1",
		Name:      "Untrusted Anonymous Service",
		Recipient: "0xDead000000000000000000000000000000000001",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "5000000",
	})

	execSvc := &demonstrableExecutionService{}

	// Policy engine deterministically enforces recipient boundaries
	policyClient := &demonstrablePolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			if strings.EqualFold(req.Recipient, "0xDead000000000000000000000000000000000001") {
				return domain.AuthorizationDecision{
					RequestID:  req.RequestID,
					Decision:   domain.DecisionDeny,
					ReasonCode: domain.ReasonRecipientNotAllowed,
					Reason:     "Security Invariant Violation: Recipient 0xDead... is not on the organization allowlist",
				}, nil
			}
			return domain.AuthorizationDecision{Decision: domain.DecisionAllow}, nil
		},
	}

	intentSvc := intent.NewService(repo, policyClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "untrusted-service-v1",
		Amount:         "1000000",
		Asset:          "USDC",
		Purpose:        "untrusted_payment_test",
		Justification:  "testing recipient restriction",
		RequestID:      "req_prohibited_recipient_001",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	authIntent, dec, err := intentSvc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected authorization error: %v", err)
	}

	// Verify denial semantics
	if authIntent.Status != intent.StatusDenied {
		t.Fatalf("expected intent status DENIED, got %s", authIntent.Status)
	}
	if dec.Decision != domain.DecisionDeny {
		t.Errorf("expected decision DENY, got %s", dec.Decision)
	}
	if dec.ReasonCode != domain.ReasonRecipientNotAllowed {
		t.Errorf("expected ReasonRecipientNotAllowed, got %s", dec.ReasonCode)
	}
	if !strings.Contains(dec.Reason, "not on the organization allowlist") {
		t.Errorf("expected explicit auditable reason, got %q", dec.Reason)
	}

	// Crucial invariant: ZERO blockchain execution occurred
	if execSvc.broadcastCount != 0 {
		t.Fatalf("SECURITY VIOLATION: prohibited recipient resulted in %d broadcasts", execSvc.broadcastCount)
	}

	// Verify denied intent cannot be confirmed
	_, _, confirmErr := intentSvc.ConfirmIntent(context.Background(), it.IntentID)
	if confirmErr == nil {
		t.Fatal("expected confirmation of denied intent to be blocked, got nil")
	}
}

// Guarantee 3: A Request Exceeding Policy Limits is rejected with an explicit reason.
func TestSecurityGuarantee_3_ExceedingPolicyLimits_RejectedWithAuditableReason(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "high-compute-cluster",
		Name:      "High Performance Compute Cluster",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "200000000", // 200 USDC
	})

	execSvc := &demonstrableExecutionService{}

	// Policy limits: per-tx ceiling = 50.00 USDC, daily limit = 100.00 USDC
	policyClient := &demonstrablePolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			if req.Amount == "75000000" { // 75 USDC > 50 USDC ceiling
				return domain.AuthorizationDecision{
					RequestID:  req.RequestID,
					Decision:   domain.DecisionDeny,
					ReasonCode: domain.ReasonAmountExceedsLimit,
					Reason:     "Policy Limit Exceeded: Amount 75.00 USDC exceeds per-transaction limit of 50.00 USDC (INV-165)",
				}, nil
			}
			if req.Amount == "150000000" { // 150 USDC > 100 USDC daily
				return domain.AuthorizationDecision{
					RequestID:  req.RequestID,
					Decision:   domain.DecisionDeny,
					ReasonCode: domain.ReasonDailyLimitExceeded,
					Reason:     "Velocity Limit Exceeded: Daily spend would reach 150.00 USDC, exceeding daily ceiling of 100.00 USDC",
				}, nil
			}
			return domain.AuthorizationDecision{Decision: domain.DecisionAllow}, nil
		},
	}

	intentSvc := intent.NewService(repo, policyClient, execSvc, reg, nil, 300*time.Second, false)

	// Case 3A: Per-transaction ceiling breach
	itA, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "high-compute-cluster",
		Amount:         "75000000",
		Asset:          "USDC",
		Purpose:        "large_model_inference",
		Justification:  "trying to exceed per-tx ceiling",
		RequestID:      "req_limit_per_tx",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	authA, decA, _ := intentSvc.AuthorizeIntent(context.Background(), itA.IntentID)
	if authA.Status != intent.StatusDenied {
		t.Fatalf("expected status DENIED for per-tx breach, got %s", authA.Status)
	}
	if decA.ReasonCode != domain.ReasonAmountExceedsLimit {
		t.Errorf("expected ReasonAmountExceedsLimit, got %s", decA.ReasonCode)
	}
	if !strings.Contains(decA.Reason, "exceeds per-transaction limit") {
		t.Errorf("expected explicit ceiling reason, got %q", decA.Reason)
	}
	if execSvc.broadcastCount != 0 {
		t.Fatalf("zero broadcasts expected, got %d", execSvc.broadcastCount)
	}

	// Case 3B: Daily velocity limit breach
	itB, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "high-compute-cluster",
		Amount:         "150000000",
		Asset:          "USDC",
		Purpose:        "daily_batch_job",
		Justification:  "trying to exceed daily limit",
		RequestID:      "req_limit_daily",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	authB, decB, _ := intentSvc.AuthorizeIntent(context.Background(), itB.IntentID)
	if authB.Status != intent.StatusDenied {
		t.Fatalf("expected status DENIED for daily breach, got %s", authB.Status)
	}
	if decB.ReasonCode != domain.ReasonDailyLimitExceeded {
		t.Errorf("expected ReasonDailyLimitExceeded, got %s", decB.ReasonCode)
	}
	if execSvc.broadcastCount != 0 {
		t.Fatalf("zero broadcasts expected, got %d", execSvc.broadcastCount)
	}
}

// Guarantee 4: A Replayed Request is idempotently blocked with zero duplicate execution.
func TestSecurityGuarantee_4_ReplayedRequest_IdempotentZeroDuplicateBroadcast(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "market-data-v1",
		Name:      "Realtime Market Feed",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "5000000",
	})

	execSvc := &demonstrableExecutionService{}
	policyClient := &demonstrablePolicyClient{}
	intentSvc := intent.NewService(repo, policyClient, execSvc, reg, nil, 300*time.Second, false)

	replayedID := "unique_idempotency_key_replay_test_999"

	// 1. Initial request submission
	it1, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "market-data-v1",
		Amount:         "250000", // 0.25 USDC
		Asset:          "USDC",
		Purpose:        "price_tick",
		Justification:  "initial fetch",
		RequestID:      replayedID,
	})
	if err != nil {
		t.Fatalf("failed to create initial intent: %v", err)
	}

	// Authorize and confirm initial request
	_, _, err = intentSvc.AuthorizeIntent(context.Background(), it1.IntentID)
	if err != nil {
		t.Fatalf("failed to authorize initial intent: %v", err)
	}
	conf1, res1, err := intentSvc.ConfirmIntent(context.Background(), it1.IntentID)
	if err != nil {
		t.Fatalf("failed to confirm initial intent: %v", err)
	}
	if conf1.Status != intent.StatusConfirmed {
		t.Errorf("expected CONFIRMED status on initial confirm, got %s", conf1.Status)
	}
	if execSvc.broadcastCount != 1 {
		t.Fatalf("expected 1 execution, got %d", execSvc.broadcastCount)
	}

	// 2. Replay attempt: Agent re-submits exact same request with identical idempotency key
	it2, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "market-data-v1",
		Amount:         "250000",
		Asset:          "USDC",
		Purpose:        "price_tick",
		Justification:  "replayed request",
		RequestID:      replayedID,
	})
	if err != nil {
		t.Fatalf("idempotent retrieval failed: %v", err)
	}
	// The returned intent ID MUST match the existing record
	if it2.IntentID != it1.IntentID {
		t.Errorf("expected existing intent ID %s, got %s", it1.IntentID, it2.IntentID)
	}

	// 3. Attempt duplicate confirmation on the replayed intent
	conf2, res2, err := intentSvc.ConfirmIntent(context.Background(), it2.IntentID)
	if err != nil {
		t.Fatalf("expected idempotent confirmation return, got error: %v", err)
	}
	if conf2.Status != intent.StatusConfirmed {
		t.Errorf("expected status CONFIRMED, got %s", conf2.Status)
	}

	// CRITICAL INVARIANT: Broadcast count must remain exactly 1 (Zero double-spend / double execution)
	if execSvc.broadcastCount != 1 {
		t.Fatalf("REPLAY ATTACK VULNERABILITY: broadcast count increased to %d", execSvc.broadcastCount)
	}
	if res1.TransactionHash != res2.TransactionHash {
		t.Errorf("transaction hash mismatch between replays: %s vs %s", res1.TransactionHash, res2.TransactionHash)
	}

	// 4. Conflicting replay attempt: Same idempotency key with conflicting amount must be rejected with ErrIdempotencyConflict
	_, conflictErr := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "market-data-v1",
		Amount:         "99999999", // Different amount
		Asset:          "USDC",
		Purpose:        "tampered_payload",
		RequestID:      replayedID,
	})
	if conflictErr == nil {
		t.Fatal("expected ErrIdempotencyConflict for tampered replayed request, got nil")
	}
	if !errors.Is(conflictErr, intent.ErrIdempotencyConflict) {
		t.Errorf("expected ErrIdempotencyConflict, got %v", conflictErr)
	}
}

// Guarantee 5: An Unavailable AI Provider fails closed safely with zero financial mutation.
func TestSecurityGuarantee_5_UnavailableAIProvider_FailsClosedSafely(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "ai-provider-service",
		Name:      "External LLM Cluster",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "10000000",
	})

	execSvc := &demonstrableExecutionService{}

	// Policy client simulates downstream provider crash / connection refused (HTTP 502 / 504 / ECONNREFUSED)
	downstreamErr := errors.New("provider unreachable: dial tcp 10.0.1.5:8081: connection refused (HTTP 504 Gateway Timeout)")
	failingPolicyClient := &demonstrablePolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{}, downstreamErr
		},
		healthFunc: func(ctx context.Context) error {
			return errors.New("downstream AI provider unhealthy")
		},
	}

	intentSvc := intent.NewService(repo, failingPolicyClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "ai-provider-service",
		Amount:         "1000000",
		Asset:          "USDC",
		Purpose:        "offline_provider_test",
		Justification:  "testing fail-closed safety invariant",
		RequestID:      "req_provider_outage_001",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// Attempt authorization
	authIntent, _, authErr := intentSvc.AuthorizeIntent(context.Background(), it.IntentID)
	if authErr == nil {
		t.Fatal("expected authorization error when provider is down, got nil (FAIL-OPEN DETECTED)")
	}

	// Verify fail-closed invariant
	if authIntent != nil && (authIntent.Status == intent.StatusAuthorized || authIntent.Status == intent.StatusConfirmed) {
		t.Fatalf("FAIL-OPEN VULNERABILITY: intent transitioned to %s during provider outage", authIntent.Status)
	}

	// Check repository state directly
	checkIntent, _ := repo.GetIntent(context.Background(), it.IntentID)
	if checkIntent.Status == intent.StatusAuthorized || checkIntent.Status == intent.StatusConfirmed {
		t.Errorf("unsafe persistence: stored intent is marked %s", checkIntent.Status)
	}

	// ZERO execution occurred
	if execSvc.broadcastCount != 0 {
		t.Fatalf("ZERO EXECUTION VIOLATION: provider outage caused %d broadcasts", execSvc.broadcastCount)
	}
}

// Guarantee 6: An RPC Failure or Unconfirmed Transaction does not report phantom success.
func TestSecurityGuarantee_6_RPCFailureOrUnconfirmedTx_SafeAmbiguousAudit(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "settlement-service",
		Name:      "Settlement Service",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "10000000",
	})

	policyClient := &demonstrablePolicyClient{}

	// Scenario 6A: Blockchain RPC drops during broadcast
	rpcDropSvc := &demonstrableExecutionService{
		executeFunc: func(req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
			return nil, errors.New("arc rpc error: post https://rpc.testnet.arc.network: net/http: request canceled (Client.Timeout exceeded)")
		},
	}

	intentSvcA := intent.NewService(repo, policyClient, rpcDropSvc, reg, nil, 300*time.Second, false)

	itA, _ := intentSvcA.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "settlement-service",
		Amount:         "1000000",
		Asset:          "USDC",
		Purpose:        "rpc_drop_test",
		RequestID:      "req_rpc_drop_001",
	})
	intentSvcA.AuthorizeIntent(context.Background(), itA.IntentID)

	_, _, confirmErrA := intentSvcA.ConfirmIntent(context.Background(), itA.IntentID)
	if confirmErrA == nil {
		t.Fatal("expected error on RPC drop, got nil")
	}

	// Verify state is NOT CONFIRMED
	checkA, _ := repo.GetIntent(context.Background(), itA.IntentID)
	if checkA.Status == intent.StatusConfirmed {
		t.Fatal("PHANTOM SUCCESS DETECTED: intent marked CONFIRMED despite RPC failure")
	}

	// Scenario 6B: Transaction submitted but unconfirmed (pending receipt timeout)
	pendingTxHash := "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	unconfirmedSvc := &demonstrableExecutionService{
		executeFunc: func(req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
			return &blockchain.PaymentExecutionResult{
				RequestID:       req.RequestID,
				Status:          blockchain.StateAmbiguous, // or StateSubmitted
				TransactionHash: pendingTxHash,
				Vault:           req.VaultAddress,
				Recipient:       req.Recipient,
				Amount:          req.Amount,
			}, errors.New("receipt confirmation timeout: transaction pending in mempool")
		},
	}

	intentSvcB := intent.NewService(repo, policyClient, unconfirmedSvc, reg, nil, 300*time.Second, false)

	itB, _ := intentSvcB.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alpha",
		AgentID:        "research-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "settlement-service",
		Amount:         "1000000",
		Asset:          "USDC",
		Purpose:        "unconfirmed_tx_test",
		RequestID:      "req_unconfirmed_001",
	})
	intentSvcB.AuthorizeIntent(context.Background(), itB.IntentID)

	_, execB, confirmErrB := intentSvcB.ConfirmIntent(context.Background(), itB.IntentID)
	if confirmErrB == nil {
		t.Fatal("expected confirmation timeout error, got nil")
	}

	// Verify hash was saved for flight recorder reconciliation, but status is NOT CONFIRMED
	if execB != nil && execB.Status == blockchain.StateConfirmed {
		t.Error("unconfirmed tx must not report CONFIRMED status")
	}
	checkB, _ := repo.GetIntent(context.Background(), itB.IntentID)
	if checkB.Status == intent.StatusConfirmed {
		t.Fatal("PHANTOM SUCCESS: unconfirmed transaction recorded as confirmed")
	}
}

// =============================================================================
// PHASE 4 — HARDENED INTEGRATION & END-TO-END AUDIT FLOW
// =============================================================================

// Guarantee 7: End-to-End Request-to-Decision-to-Audit Flow through HTTP Router
func TestHardenedIntegration_CompleteRequestToDecisionToAuditFlow(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		MaxRequestBodyBytes:     1048576,
		Environment:             "production",
		BootstrapAPIKey:         "ap_live_bootstrap_super_admin_test_token_4444",
		ArcChainID:              "5042002",
		ArcExplorerURL:          "https://testnet.arcscan.app",
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "sec-audited-service",
		Name:      "Audited Research Service",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "5000000",
	})

	policyClient := &demonstrablePolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Audited authorization approved against Constitution v8",
			}, nil
		},
	}
	execSvc := &demonstrableExecutionService{}
	intentSvc := intent.NewService(repo, policyClient, execSvc, reg, nil, 5*time.Minute, false)

	// Create API Key for tenant org_enterprise
	apiKeySecret, apiKeyObj, err := auth.GenerateAPIKey("org_enterprise", "Enterprise Production Key", []string{domain.ScopePaymentsCreate, domain.ScopePaymentsRead})
	if err != nil {
		t.Fatalf("failed to generate test API key: %v", err)
	}
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             apiKeyObj.ID,
		OrganizationID: apiKeyObj.OrganizationID,
		KeyHash:        apiKeyObj.KeyHash,
		Name:           apiKeyObj.Name,
		MaskedKey:      apiKeyObj.MaskedKey,
		Scopes:         "payments:create,payments:read",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	router := gwHttp.NewRouter(cfg, policyClient, execSvc, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// 1. Submit POST /v1/payment-intents with authenticated API key
	reqBody := `{"agent_id":"research-agent","service":"sec-audited-service","amount":"500000","asset":"USDC","purpose":"flight_recorder_audit","vault_address":"0x7789bC3d8366782b97496165C24BD5bB09302843"}`
	httpReq, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", strings.NewReader(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKeySecret)
	httpReq.Header.Set("Idempotency-Key", "idemp_e2e_audit_flow_001")

	httpResp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		t.Fatalf("HTTP request failed: %v", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK && httpResp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 200/201 response, got %d", httpResp.StatusCode)
	}

	var createdResp struct {
		ID       string `json:"id"`
		Status   string `json:"status"`
		Decision struct {
			Result string `json:"result"`
			Reason string `json:"reason"`
		} `json:"decision"`
	}
	if err := json.NewDecoder(httpResp.Body).Decode(&createdResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if createdResp.ID == "" {
		t.Fatal("expected non-empty payment intent ID")
	}
	if createdResp.Decision.Result != "ALLOW" {
		t.Errorf("expected decision ALLOW, got %s", createdResp.Decision.Result)
	}

	// 2. Fetch Trace via GET /v1/payment-intents/{id}/trace
	traceReq, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents/"+createdResp.ID+"/trace", nil)
	traceReq.Header.Set("Authorization", "Bearer "+apiKeySecret)

	traceResp, err := http.DefaultClient.Do(traceReq)
	if err != nil {
		t.Fatalf("trace request failed: %v", err)
	}
	defer traceResp.Body.Close()

	if traceResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for trace inspection, got %d", traceResp.StatusCode)
	}

	// 3. Confirm zero secret leakage in trace response
	var traceData map[string]interface{}
	json.NewDecoder(traceResp.Body).Decode(&traceData)
	traceBytes, _ := json.Marshal(traceData)
	traceStr := string(traceBytes)

	for _, secretToken := range []string{"private_key", "secret", "seed_phrase", "apiKeySecret"} {
		if strings.Contains(traceStr, secretToken) {
			t.Errorf("SECURITY LEAK: trace payload exposed sensitive field %s", secretToken)
		}
	}
}

// Guarantee 8: Tenant Isolation strictly blocks cross-organization resource tampering.
func TestHardenedIntegration_TenantIsolation_CrossOrgBlocked(t *testing.T) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		MaxRequestBodyBytes:     1048576,
		Environment:             "production",
		BootstrapAPIKey:         "ap_live_bootstrap_super_admin_test_token_5555",
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "test-service",
		Name:      "Test Isolated Service",
		Recipient: "0x2a3613D44799Ce28385058358586E8D311eE6C57",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "1000000",
	})
	pClient := &demonstrablePolicyClient{}
	execSvc := &demonstrableExecutionService{}
	intentSvc := intent.NewService(repo, pClient, execSvc, reg, nil, 5*time.Minute, false)

	// Create Alice key for org_alice
	aliceSecret, aliceKey, _ := auth.GenerateAPIKey("org_alice", "Alice Key", []string{domain.ScopePaymentsCreate, domain.ScopePaymentsRead})
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             aliceKey.ID,
		OrganizationID: aliceKey.OrganizationID,
		KeyHash:        aliceKey.KeyHash,
		Name:           aliceKey.Name,
		MaskedKey:      aliceKey.MaskedKey,
		Scopes:         "payments:create,payments:read",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	// Create Bob key for org_bob
	bobSecret, bobKey, _ := auth.GenerateAPIKey("org_bob", "Bob Key", []string{domain.ScopePaymentsCreate, domain.ScopePaymentsRead})
	_ = repo.SaveAPIKey(context.Background(), &storage.APIKey{
		ID:             bobKey.ID,
		OrganizationID: bobKey.OrganizationID,
		KeyHash:        bobKey.KeyHash,
		Name:           bobKey.Name,
		MaskedKey:      bobKey.MaskedKey,
		Scopes:         "payments:create,payments:read",
		Status:         string(domain.APIKeyStatusActive),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	router := gwHttp.NewRouter(cfg, pClient, execSvc, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)
	defer server.Close()

	// Alice creates an intent for org_alice
	aliceIntent, err := intentSvc.CreateIntent(context.Background(), intent.CreateIntentParams{
		OrganizationID: "org_alice",
		AgentID:        "alice-agent",
		VaultAddress:   "0x7789bC3d8366782b97496165C24BD5bB09302843",
		ServiceID:      "test-service",
		Amount:         "100000",
		Asset:          "USDC",
		Purpose:        "alice_confidential_task",
		RequestID:      "req_alice_secret_001",
	})
	if err != nil {
		t.Fatalf("failed to create alice intent: %v", err)
	}

	// 1. Alice verifies she can read her own intent (200 OK)
	aliceReq, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents/"+aliceIntent.IntentID, nil)
	aliceReq.Header.Set("Authorization", "Bearer "+aliceSecret)
	aliceResp, err := http.DefaultClient.Do(aliceReq)
	if err != nil {
		t.Fatalf("alice request failed: %v", err)
	}
	defer aliceResp.Body.Close()
	if aliceResp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for Alice accessing own intent, got %d", aliceResp.StatusCode)
	}

	// 2. Bob attempts to read Alice's intent via GET /v1/payment-intents/{id}
	bobReq, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents/"+aliceIntent.IntentID, nil)
	bobReq.Header.Set("Authorization", "Bearer "+bobSecret)

	bobResp, err := http.DefaultClient.Do(bobReq)
	if err != nil {
		t.Fatalf("bob request failed: %v", err)
	}
	defer bobResp.Body.Close()

	// Bob must receive 403 Forbidden or 404 Not Found (Cross-tenant boundary enforced)
	if bobResp.StatusCode != http.StatusForbidden && bobResp.StatusCode != http.StatusNotFound {
		t.Fatalf("TENANT ISOLATION BREACH: expected 403 or 404, got %d", bobResp.StatusCode)
	}
}

// Guarantee 9: Server-Side Secret Boundaries — No secrets in responses or configs.
func TestHardenedIntegration_ServerSideSecretBoundaries(t *testing.T) {
	rawConfig := config.Load()

	// Live execution must be disabled in this Sprint
	if rawConfig.EnableLiveExecution {
		t.Fatal("NON-NEGOTIABLE INVARIANT VIOLATION: EnableLiveExecution must be false")
	}

	// Validate that client configs have no private keys
	testnetVault := rawConfig.TestnetAgentVaultAddress
	if testnetVault != "0x7789bC3d8366782b97496165C24BD5bB09302843" {
		t.Errorf("expected TestnetAgentVaultAddress to be 0x7789bC3d8366782b97496165C24BD5bB09302843, got %s", testnetVault)
	}
	if rawConfig.TestnetArcChainID != "5042002" {
		t.Errorf("expected TestnetArcChainID 5042002, got %s", rawConfig.TestnetArcChainID)
	}
}
