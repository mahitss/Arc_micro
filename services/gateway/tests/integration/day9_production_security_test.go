package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/emergency"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/treasury"
)

// mockDay9PolicyClient implements policy decisions with deterministic rules.
type mockDay9PolicyClient struct {
	mu        sync.Mutex
	decisions map[string]domain.Decision
}

func newMockDay9PolicyClient() *mockDay9PolicyClient {
	return &mockDay9PolicyClient{
		decisions: make(map[string]domain.Decision),
	}
}

func (m *mockDay9PolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// If explicit decision set for this request/amount
	if dec, ok := m.decisions[req.Amount]; ok {
		reason := "Policy configured decision"
		code := domain.ReasonApproved
		if dec == domain.DecisionDeny {
			code = domain.ReasonAmountExceedsLimit
			reason = "Hard policy violation: blocked"
		} else if dec == domain.DecisionApprovalRequired {
			code = domain.ReasonAboveApprovalThreshold
			reason = "Requires human approval"
		}
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   dec,
			ReasonCode: code,
			Reason:     reason,
		}, nil
	}

	// Default: 1.50 USDC is DENIED
	if req.Amount == "1500000" {
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   domain.DecisionDeny,
			ReasonCode: domain.ReasonAmountExceedsLimit,
			Reason:     "Policy hard deny: exceeds maximum ceiling",
		}, nil
	}

	// 1.00 USDC is APPROVAL_REQUIRED
	if req.Amount == "1000000" {
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   domain.DecisionApprovalRequired,
			ReasonCode: domain.ReasonAboveApprovalThreshold,
			Reason:     "Policy requires human approval",
		}, nil
	}

	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Approved by deterministic policy",
	}, nil
}

func (m *mockDay9PolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	dec, err := m.Authorize(ctx, req)
	if err == nil {
		dec.Simulation = true
	}
	return dec, err
}

func (m *mockDay9PolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

// mockDay9BlockchainClient implements blockchain.Client with simulated receipt behavior.
type mockDay9BlockchainClient struct {
	mu           sync.Mutex
	failReceipt  bool
	receiptFound bool
}

func (m *mockDay9BlockchainClient) ChainID(ctx context.Context) (*big.Int, error) {
	return big.NewInt(5042), nil
}

func (m *mockDay9BlockchainClient) BalanceAt(ctx context.Context, account common.Address) (*big.Int, error) {
	return big.NewInt(1000000000000000000), nil
}

func (m *mockDay9BlockchainClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	return 1, nil
}

func (m *mockDay9BlockchainClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	return big.NewInt(20000000000), nil
}

func (m *mockDay9BlockchainClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	return big.NewInt(1000000000), nil
}

func (m *mockDay9BlockchainClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	return 65000, nil
}

func (m *mockDay9BlockchainClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return nil
}

func (m *mockDay9BlockchainClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.failReceipt {
		return nil, fmt.Errorf("context deadline exceeded")
	}
	if !m.receiptFound {
		return nil, fmt.Errorf("transaction receipt not found")
	}
	return &types.Receipt{
		Status:      1,
		BlockNumber: big.NewInt(104200),
		TxHash:      txHash,
		GasUsed:     65000,
	}, nil
}

func (m *mockDay9BlockchainClient) Close() {}

// mockDay9BalanceProvider simulates on-chain USDC treasury balance.
type mockDay9BalanceProvider struct {
	balance *big.Int
}

func (m *mockDay9BalanceProvider) GetVaultBalance(ctx context.Context, vaultAddress string) (*big.Int, error) {
	return m.balance, nil
}

// setupDay9TestEnv boots the gateway with isolated storage, registry, and execution service.
func setupDay9TestEnv(t *testing.T) (*httptest.Server, storage.Repository, *registry.Registry, *intent.Service, *execution.ExecutionService, *mockDay9BlockchainClient) {
	cfg := &config.Config{
		Port:                    "8080",
		PolicyEngineURL:         "http://localhost:8081",
		PolicyEngineTimeout:     2 * time.Second,
		PaymentIntentTTLSeconds: 300,
		AgentAutoExecution:      false,
		AllowLocalhostWebhooks:  true,
		MaxRequestBodyBytes:     1048576,
		ArcChainID:              "5042",
		EnableLiveExecution:     false,
	}

	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	pClient := newMockDay9PolicyClient()
	bcClient := &mockDay9BlockchainClient{receiptFound: true}
	execSvc := execution.NewExecutionService(cfg, bcClient, nil)

	intentSvc := intent.NewService(
		repo,
		pClient,
		execSvc,
		reg,
		nil,
		300*time.Second,
		false,
	)

	router := gwHttp.NewRouter(cfg, pClient, execSvc, nil, intentSvc, repo, reg)
	server := httptest.NewServer(router)

	// Seed Org A and Org B agents
	_ = repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_orgA_01",
		OrganizationID: "org_A",
		Name:           "Org A Research Agent",
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})
	_ = repo.SaveAgent(context.Background(), &storage.Agent{
		ID:             "agent_orgB_01",
		OrganizationID: "org_B",
		Name:           "Org B Scraper Agent",
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	})

	return server, repo, reg, intentSvc, execSvc, bcClient
}

// TestDay9_IDOR_CrossOrganizationIsolation verifies that Org A cannot access or manipulate Org B resources.
func TestDay9_IDOR_CrossOrganizationIsolation(t *testing.T) {
	server, repo, _, intentSvc, _, _ := setupDay9TestEnv(t)
	defer server.Close()

	ctx := context.Background()

	// Create intent for Org B
	piB, err := intentSvc.CreateIntent(ctx, intent.CreateIntentParams{
		OrganizationID: "org_B",
		AgentID:        "agent_orgB_01",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		ServiceID:      "compute-cluster",
		Amount:         "500000",
		Asset:          "USDC",
		Purpose:        "Org B scraping",
		RequestID:      "req_orgB_01",
	})
	if err != nil {
		t.Fatalf("failed to create Org B intent: %v", err)
	}

	// 1. Org A requests Org B intent via GET /v1/payment-intents/{id} with Org A header
	req, _ := http.NewRequest("GET", server.URL+"/v1/payment-intents/"+piB.IntentID, nil)
	req.Header.Set("X-Organization-ID", "org_A")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("failed request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 NOT FOUND on cross-org intent read, got %d", resp.StatusCode)
	}

	// 2. Org A attempts to read Org B agent budget
	reqBudget, _ := http.NewRequest("GET", server.URL+"/v1/agent-budgets/agent_orgB_01", nil)
	reqBudget.Header.Set("X-Organization-ID", "org_A")
	respBudget, err := http.DefaultClient.Do(reqBudget)
	if err != nil {
		t.Fatalf("failed budget request: %v", err)
	}
	defer respBudget.Body.Close()

	if respBudget.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 NOT FOUND on cross-org agent budget read, got %d", respBudget.StatusCode)
	}

	// 3. Org A attempts to pause Org B organization
	reqPause, _ := http.NewRequest("POST", server.URL+"/v1/organizations/org_B/pause", nil)
	reqPause.Header.Set("X-Organization-ID", "org_A")
	respPause, err := http.DefaultClient.Do(reqPause)
	if err != nil {
		t.Fatalf("failed pause request: %v", err)
	}
	defer respPause.Body.Close()

	if respPause.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 FORBIDDEN on cross-org organization pause, got %d", respPause.StatusCode)
	}

	// 4. Org A attempts to access Org B approval
	appB := &storage.Approval{
		ID:              "app_orgB_99",
		OrganizationID:  "org_B",
		PaymentIntentID: piB.IntentID,
		Status:          "PENDING",
		CreatedAt:       time.Now(),
		ExpiresAt:       time.Now().Add(10 * time.Minute),
	}
	_ = repo.SaveApproval(ctx, appB)

	reqApp, _ := http.NewRequest("GET", server.URL+"/v1/approvals/"+appB.ID, nil)
	reqApp.Header.Set("X-Organization-ID", "org_A")
	respApp, err := http.DefaultClient.Do(reqApp)
	if err != nil {
		t.Fatalf("failed approval request: %v", err)
	}
	defer respApp.Body.Close()

	if respApp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 NOT FOUND on cross-org approval read, got %d", respApp.StatusCode)
	}

	// 5. Org A attempts to approve Org B approval
	approveBody := bytes.NewBufferString(`{"approver_id":"usr_attacker"}`)
	reqApprove, _ := http.NewRequest("POST", server.URL+"/v1/approvals/"+appB.ID+"/approve", approveBody)
	reqApprove.Header.Set("X-Organization-ID", "org_A")
	respApprove, err := http.DefaultClient.Do(reqApprove)
	if err != nil {
		t.Fatalf("failed approval action request: %v", err)
	}
	defer respApprove.Body.Close()

	if respApprove.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 NOT FOUND on cross-org approval action, got %d", respApprove.StatusCode)
	}
}

// TestDay9_FinancialInvariants tests the core financial safety rules.
func TestDay9_FinancialInvariants(t *testing.T) {
	server, repo, _, intentSvc, _, _ := setupDay9TestEnv(t)
	defer server.Close()

	ctx := context.Background()
	ds := service.NewDomainService(repo)

	// INVARIANT 4 & 5: HARD DENY cannot be overridden by human approval.
	t.Run("HardDenyCannotBeOverriddenByApproval", func(t *testing.T) {
		pi, err := intentSvc.CreateIntent(ctx, intent.CreateIntentParams{
			OrganizationID: "org_A",
			AgentID:        "agent_orgA_01",
			VaultAddress:   "0x1111111111111111111111111111111111111111",
			ServiceID:      "compute-cluster",
			Amount:         "1500000", // 1.50 USDC -> Hard Deny
			Asset:          "USDC",
			Purpose:        "Over limit spend",
			RequestID:      "req_hard_deny_01",
		})
		if err != nil {
			t.Fatalf("failed to create intent: %v", err)
		}

		// Authorize - will be DENIED
		authPI, dec, err := intentSvc.AuthorizeIntent(ctx, pi.IntentID)
		if err != nil {
			t.Fatalf("authorization error: %v", err)
		}
		if dec.Decision != domain.DecisionDeny || authPI.Status != intent.StatusDenied {
			t.Fatalf("expected DENIED, got %s / %s", dec.Decision, authPI.Status)
		}

		// Attempt human approval on this denied intent -> Must return ErrCannotApproveDenied
		_, _, err = ds.RecordApproval(ctx, "org_A", pi.IntentID, "usr_admin", true, "Trying to override")
		if err == nil {
			t.Fatal("expected error overriding hard DENY, but succeeded!")
		}
		if err != service.ErrCannotApproveDenied {
			t.Fatalf("expected ErrCannotApproveDenied, got: %v", err)
		}
	})

	// INVARIANT 14: Agent cannot approve its own payment.
	t.Run("AgentCannotApproveItsOwnPayment", func(t *testing.T) {
		pi, err := intentSvc.CreateIntent(ctx, intent.CreateIntentParams{
			OrganizationID: "org_A",
			AgentID:        "agent_orgA_01",
			VaultAddress:   "0x1111111111111111111111111111111111111111",
			ServiceID:      "compute-cluster",
			Amount:         "1000000", // 1.00 USDC -> Approval Required
			Asset:          "USDC",
			Purpose:        "Heavy compute",
			RequestID:      "req_self_app_01",
		})
		if err != nil {
			t.Fatalf("failed to create intent: %v", err)
		}

		// Set status to APPROVAL_REQUIRED
		pi.Status = intent.StatusApprovalRequired
		_ = repo.SaveIntent(ctx, pi)
		_ = repo.SaveApproval(ctx, &storage.Approval{
			ID:              "app_self_01",
			OrganizationID:  "org_A",
			PaymentIntentID: pi.IntentID,
			Status:          "PENDING",
			CreatedAt:       time.Now(),
			ExpiresAt:       time.Now().Add(10 * time.Minute),
		})

		// Agent attempts self-approval: approver_id == agent_id
		_, _, err = ds.RecordApproval(ctx, "org_A", pi.IntentID, "agent_orgA_01", true, "Self approving")
		if err == nil {
			t.Fatal("expected error on agent self-approval, but succeeded!")
		}
		if err != service.ErrAgentSelfApprovalProhibited {
			t.Fatalf("expected ErrAgentSelfApprovalProhibited, got: %v", err)
		}
	})

	// INVARIANT 7: Recipient is determined server-side from Service Registry, never user-controlled.
	t.Run("TrustedServiceRecipientNeverUserControlled", func(t *testing.T) {
		payload := []byte(`{
			"agent_id": "agent_orgA_01",
			"service": "compute-cluster",
			"amount": "500000",
			"asset": "USDC",
			"purpose": "scrape data",
			"recipient": "0xAttackerControlledAddress00000000000000"
		}`)
		req, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		defer resp.Body.Close()

		var created struct {
			Recipient string `json:"recipient"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&created)

		// Must match the official registry recipient for "compute-cluster", NOT the attacker address
		if created.Recipient == "0xAttackerControlledAddress00000000000000" {
			t.Fatal("CRITICAL INVARIANT VIOLATION: User-controlled recipient overwrote registry recipient!")
		}
		if created.Recipient != "0x2222222222222222222222222222222222222222" {
			t.Fatalf("expected registry recipient 0x2222222222222222222222222222222222222222, got %s", created.Recipient)
		}
	})

	// INVARIANT 9: Idempotent payment intent creation returns existing intent without double-spending.
	t.Run("IdempotencyPreventsDuplicatePaymentCreation", func(t *testing.T) {
		idempotencyKey := "idem_key_unique_123"
		payload := []byte(`{
			"agent_id": "agent_orgA_01",
			"service": "compute-cluster",
			"amount": "500000",
			"asset": "USDC",
			"purpose": "scrape data"
		}`)

		// Request 1
		req1, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewBuffer(payload))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("Idempotency-Key", idempotencyKey)
		resp1, err := http.DefaultClient.Do(req1)
		if err != nil {
			t.Fatalf("request 1 failed: %v", err)
		}
		defer resp1.Body.Close()

		var pi1 struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(resp1.Body).Decode(&pi1)

		// Request 2 with same idempotency key
		req2, _ := http.NewRequest("POST", server.URL+"/v1/payment-intents", bytes.NewBuffer(payload))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("Idempotency-Key", idempotencyKey)
		resp2, err := http.DefaultClient.Do(req2)
		if err != nil {
			t.Fatalf("request 2 failed: %v", err)
		}
		defer resp2.Body.Close()

		var pi2 struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(resp2.Body).Decode(&pi2)

		if pi1.ID != pi2.ID {
			t.Fatalf("idempotency violation: expected same intent ID %s, got %s", pi1.ID, pi2.ID)
		}
	})

	// INVARIANT 15: Emergency agent pause blocks execution.
	t.Run("EmergencyPausePreventsExecution", func(t *testing.T) {
		ctrl := emergency.NewController(repo)
		_ = ctrl.PauseAgent(ctx, "org_A", "agent_orgA_01", "usr_admin")

		// Verify agent is paused
		ag, _ := repo.GetAgent(ctx, "agent_orgA_01")
		if ag.Status != "PAUSED" {
			t.Fatalf("expected agent status PAUSED, got %s", ag.Status)
		}

		// Creating intent for paused agent must be blocked
		_, err := intentSvc.CreateIntent(ctx, intent.CreateIntentParams{
			OrganizationID: "org_A",
			AgentID:        "agent_orgA_01",
			VaultAddress:   "0x1111111111111111111111111111111111111111",
			ServiceID:      "compute-cluster",
			Amount:         "500000",
			Asset:          "USDC",
			Purpose:        "attempt during pause",
			RequestID:      "req_paused_attempt",
		})
		if err == nil {
			t.Fatal("expected error creating payment intent for paused agent, but succeeded!")
		}

		// Resume agent for subsequent tests
		_ = ctrl.ResumeAgent(ctx, "org_A", "agent_orgA_01", "usr_admin")
	})
}

// TestDay9_ConcurrencyAndRaceConditions tests concurrent treasury reservations and duplicate approvals.
func TestDay9_ConcurrencyAndRaceConditions(t *testing.T) {
	_, repo, _, _, _, _ := setupDay9TestEnv(t)
	ctx := context.Background()

	// CASE B: Treasury balance race.
	// Authoritative balance is 10.00 USDC (10000000 units).
	// Two concurrent requests attempt to reserve 8.00 USDC (8000000 units) each.
	// Only ONE request may succeed; total reserved must not exceed 10.00 USDC.
	t.Run("TreasuryConcurrentReservationRace", func(t *testing.T) {
		bp := &mockDay9BalanceProvider{balance: big.NewInt(10000000)} // 10 USDC
		ts := treasury.NewTreasuryService(repo, bp)

		var wg sync.WaitGroup
		successCount := 0
		var mu sync.Mutex

		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				res, err := ts.ReserveFunds(
					ctx,
					"org_A",
					"0x1111111111111111111111111111111111111111",
					fmt.Sprintf("pi_race_%d", idx),
					"8000000", // 8 USDC
				)
				if err == nil && res != nil {
					mu.Lock()
					successCount++
					mu.Unlock()
				}
			}(i)
		}
		wg.Wait()

		// Max allowed reservations is 1 (since 8 + 8 = 16 > 10)
		if successCount > 1 {
			t.Fatalf("CRITICAL CONCURRENCY RACE VIOLATION: Both 8 USDC requests reserved against 10 USDC balance! successCount=%d", successCount)
		}
		if successCount != 1 {
			t.Fatalf("expected exactly 1 reservation to succeed, got %d", successCount)
		}
	})

	// CASE C: Concurrent approvals for the same intent. Only one may succeed.
	t.Run("ConcurrentApprovalsSameIntent", func(t *testing.T) {
		ds := service.NewDomainService(repo)

		pi := &intent.PaymentIntent{
			IntentID:       "pi_concurrent_appr",
			OrganizationID: "org_A",
			AgentID:        "agent_orgA_01",
			Amount:         "25000000",
			Asset:          "USDC",
			Status:         intent.StatusApprovalRequired,
			CreatedAt:      time.Now(),
			ExpiresAt:      time.Now().Add(10 * time.Minute),
		}
		_ = repo.SaveIntent(ctx, pi)

		app := &storage.Approval{
			ID:              "app_concurrent_01",
			OrganizationID:  "org_A",
			PaymentIntentID: pi.IntentID,
			Status:          "PENDING",
			CreatedAt:       time.Now(),
			ExpiresAt:       time.Now().Add(10 * time.Minute),
		}
		_ = repo.SaveApproval(ctx, app)

		var wg sync.WaitGroup
		approvedCount := 0
		var mu sync.Mutex

		for i := 0; i < 2; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				_, _, err := ds.RecordApproval(ctx, "org_A", pi.IntentID, fmt.Sprintf("usr_admin_%d", idx), true, "Concurrent approve")
				if err == nil {
					mu.Lock()
					approvedCount++
					mu.Unlock()
				}
			}(i)
		}
		wg.Wait()

		if approvedCount != 1 {
			t.Fatalf("expected exactly 1 concurrent approval to succeed, got %d", approvedCount)
		}
	})
}

// TestDay9_AmbiguousTransactionLifecycle verifies handling of network timeouts after broadcast.
func TestDay9_AmbiguousTransactionLifecycle(t *testing.T) {
	_, repo, _, _, _, bcClient := setupDay9TestEnv(t)
	ctx := context.Background()

	cfg := &config.Config{
		ArcChainID:          "5042",
		EnableLiveExecution: true,
		ExecutorPrivateKey:  "0000000000000000000000000000000000000000000000000000000000000001",
	}
	execSvc := execution.NewExecutionService(cfg, bcClient, nil)

	// Configure blockchain client to simulate receipt lookup timeout
	bcClient.mu.Lock()
	bcClient.failReceipt = true
	bcClient.mu.Unlock()

	req := blockchain.PaymentExecutionRequest{
		RequestID:    "req_ambiguous_01",
		AgentID:      "agent_orgA_01",
		VaultAddress: "0x1111111111111111111111111111111111111111",
		Recipient:    "0x2222222222222222222222222222222222222222",
		Amount:       "1000000",
		Purpose:      "test ambiguous lifecycle",
	}

	// 1. Execute payment: broadcast succeeds, but waitForReceipt times out
	res, err := execSvc.ExecutePayment(ctx, req)
	if err == nil {
		t.Fatal("expected error on receipt timeout")
	}

	// System must NOT mark the transaction as FAILED; it must be AMBIGUOUS
	if res == nil {
		t.Fatal("expected execution result to be returned even on receipt timeout")
	}
	if res.Status != blockchain.StateAmbiguous {
		t.Fatalf("expected StateAmbiguous on RPC receipt timeout, got %s", res.Status)
	}
	if res.TransactionHash == "" {
		t.Fatal("expected transaction hash to be preserved in ambiguous state")
	}

	// 2. Recovery / Reconciliation procedure:
	// Network is restored and receipt is now queryable
	bcClient.mu.Lock()
	bcClient.failReceipt = false
	bcClient.receiptFound = true
	bcClient.mu.Unlock()

	reconciledRes, err := execSvc.ReconcileTransaction(ctx, req.RequestID)
	if err != nil {
		t.Fatalf("reconciliation failed: %v", err)
	}
	if reconciledRes.Status != blockchain.StateConfirmed {
		t.Fatalf("expected reconciled state CONFIRMED, got %s", reconciledRes.Status)
	}

	_ = repo // Clean check
}
