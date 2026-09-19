package integration

import (
	"context"
	"errors"
	"math/big"
	"testing"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// Mock policy client for negative path testing
type testPolicyClient struct {
	decisionFunc func(req domain.PaymentRequest) (domain.AuthorizationDecision, error)
}

func (m *testPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	if m.decisionFunc != nil {
		return m.decisionFunc(req)
	}
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "allowed",
	}, nil
}

func (m *testPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

// Mock execution service that tracks broadcast count
type testExecutionService struct {
	broadcastCount int
	executeFunc    func(req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
}

func (m *testExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	m.broadcastCount++
	if m.executeFunc != nil {
		return m.executeFunc(req)
	}
	return &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
		Vault:           req.VaultAddress,
		Recipient:       req.Recipient,
		Amount:          req.Amount,
	}, nil
}

// A. Amount above per-transaction limit -> Rust DENY -> NO transaction
func TestNegativePath_A_AmountAbovePerTxLimit(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "weather-data-v1",
		Name:      "Weather Radar Service",
		Recipient: "0x1111111111111111111111111111111111111111",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "200000000",
	})
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonAmountExceedsLimit,
				Reason:     "amount exceeds per-transaction limit of 50000000",
			}, nil
		},
	}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "weather-data-v1",
		Amount:        "60000000", // exceeds 50 USDC limit
		Asset:         "USDC",
		Purpose:       "weather_check",
		Justification: "fetching radar data",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	itAuth, dec, err := svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	if itAuth.Status != intent.StatusDenied {
		t.Errorf("expected status DENIED, got %s", itAuth.Status)
	}
	if dec.Decision != domain.DecisionDeny {
		t.Errorf("expected decision DENY, got %s", dec.Decision)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// B. Amount above daily limit -> Rust DENY -> NO transaction
func TestNegativePath_B_AmountAboveDailyLimit(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	reg.Register(&registry.Service{
		ID:        "weather-data-v1",
		Name:      "Weather Radar Service",
		Recipient: "0x1111111111111111111111111111111111111111",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "200000000",
	})
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonDailyLimitExceeded,
				Reason:     "payment would exceed daily budget of 100000000",
			}, nil
		},
	}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "weather-data-v1",
		Amount:        "150000000",
		Asset:         "USDC",
		Purpose:       "large_batch",
		Justification: "historical weather backfill",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	itAuth, dec, err := svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	if itAuth.Status != intent.StatusDenied {
		t.Errorf("expected status DENIED, got %s", itAuth.Status)
	}
	if dec.Decision != domain.DecisionDeny {
		t.Errorf("expected decision DENY, got %s", dec.Decision)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// C. Unknown service -> backend rejection -> NO transaction
func TestNegativePath_C_UnknownService(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	_, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "unregistered-malicious-service",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "exploit",
		Justification: "testing unknown service",
	})
	if err == nil {
		t.Error("expected error for unknown service, got nil")
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// D. Unapproved recipient -> rejection -> NO transaction
func TestNegativePath_D_UnapprovedRecipient(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonRecipientNotAllowed,
				Reason:     "recipient is not on the allowed whitelist",
			}, nil
		},
	}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "web_research",
		Justification: "radar fetch",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	itAuth, dec, err := svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	if itAuth.Status != intent.StatusDenied {
		t.Errorf("expected status DENIED, got %s", itAuth.Status)
	}
	if dec.ReasonCode != domain.ReasonRecipientNotAllowed {
		t.Errorf("expected ReasonRecipientNotAllowed, got %s", dec.ReasonCode)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// E. Blocked recipient -> rejection -> NO transaction
func TestNegativePath_E_BlockedRecipient(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionDeny,
				ReasonCode: domain.ReasonRecipientBlocked,
				Reason:     "recipient is on the blocked list",
			}, nil
		},
	}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "web_research",
		Justification: "radar fetch",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	itAuth, dec, err := svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	if itAuth.Status != intent.StatusDenied {
		t.Errorf("expected status DENIED, got %s", itAuth.Status)
	}
	if dec.ReasonCode != domain.ReasonRecipientBlocked {
		t.Errorf("expected ReasonRecipientBlocked, got %s", dec.ReasonCode)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// F. Expired payment intent -> rejection -> NO transaction
func TestNegativePath_F_ExpiredIntent(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 10*time.Millisecond, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "web_research",
		Justification: "radar fetch",
	})
	if err != nil {
		t.Fatalf("unexpected error creating intent: %v", err)
	}

	_, _, err = svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	// Wait for expiration
	time.Sleep(25 * time.Millisecond)

	_, _, err = svc.ConfirmIntent(context.Background(), it.IntentID)
	if err == nil {
		t.Error("expected error confirming expired intent, got nil")
	}
	if !errors.Is(err, intent.ErrIntentExpired) {
		t.Errorf("expected ErrIntentExpired, got %v", err)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions, got %d", execSvc.broadcastCount)
	}
}

// G. Duplicate confirmation -> existing execution returned -> NO duplicate transaction
func TestNegativePath_G_DuplicateConfirmation(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "web_research",
		Justification: "radar fetch",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, _, err = svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	// First confirmation
	it1, res1, err := svc.ConfirmIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error on first confirm: %v", err)
	}
	if execSvc.broadcastCount != 1 {
		t.Fatalf("expected 1 execution, got %d", execSvc.broadcastCount)
	}
	if it1.Status != intent.StatusConfirmed {
		t.Errorf("expected CONFIRMED status, got %s", it1.Status)
	}

	// Second confirmation (duplicate)
	it2, res2, err := svc.ConfirmIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error on second confirm: %v", err)
	}

	if it2.Status != intent.StatusConfirmed {
		t.Errorf("expected CONFIRMED status, got %s", it2.Status)
	}
	// Execution count must remain 1
	if execSvc.broadcastCount != 1 {
		t.Errorf("expected broadcast count to remain 1, got %d", execSvc.broadcastCount)
	}
	if res1.TransactionHash != res2.TransactionHash {
		t.Error("expected identical transaction hash for duplicate confirmation")
	}
}

// H. Auto-execution disabled -> intent waits for explicit confirmation
func TestNegativePath_H_AutoExecutionDisabled(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &testExecutionService{}
	pClient := &testPolicyClient{}
	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "test-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "web_research",
		Justification: "radar fetch",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	itAuth, _, err := svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("unexpected error authorizing: %v", err)
	}

	if itAuth.Status != intent.StatusAuthorized {
		t.Errorf("expected status AUTHORIZED (waiting for confirmation), got %s", itAuth.Status)
	}
	if execSvc.broadcastCount != 0 {
		t.Errorf("expected 0 executions before explicit confirmation, got %d", execSvc.broadcastCount)
	}
}

// I. Wrong network configuration -> execution blocked
func TestNegativePath_I_WrongNetworkConfiguration(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: true,
		ArcChainID:          "5042",
		ArcRPCURL:           "https://rpc.mainnet.arc.io",
		ExecutorPrivateKey:  "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
	}

	// Mock client reporting wrong chain ID (e.g., Ethereum Mainnet = 1)
	mockClient := &mockNegativeClient{
		chainID: big.NewInt(1),
	}
	execSvc := execution.NewExecutionService(cfg, mockClient, nil)

	req := blockchain.PaymentExecutionRequest{
		RequestID:    "req_wrong_chain",
		VaultAddress: "0x1111111111111111111111111111111111111111",
		Recipient:    "0x2222222222222222222222222222222222222222",
		Amount:       "100000",
		Purpose:      "test",
	}

	_, err := execSvc.ExecutePayment(context.Background(), req)
	if err == nil {
		t.Error("expected error for wrong chain ID, got nil")
	}
	var netMismatch *blockchain.NetworkMismatchError
	if !errors.As(err, &netMismatch) {
		t.Errorf("expected NetworkMismatchError, got %T: %v", err, err)
	}
}

// J. Live execution disabled -> transaction blocked (returns EXECUTION_DISABLED)
func TestNegativePath_J_LiveExecutionDisabled(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: false,
		ArcChainID:          "5042",
		ArcRPCURL:           "https://rpc.mainnet.arc.io",
	}
	mockClient := &mockNegativeClient{
		chainID: big.NewInt(5042),
	}
	execSvc := execution.NewExecutionService(cfg, mockClient, nil)

	req := blockchain.PaymentExecutionRequest{
		RequestID:    "req_live_disabled",
		VaultAddress: "0x1111111111111111111111111111111111111111",
		Recipient:    "0x2222222222222222222222222222222222222222",
		Amount:       "100000",
		Purpose:      "test",
	}

	res, err := execSvc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Status != blockchain.StateExecutionDisabled {
		t.Errorf("expected status EXECUTION_DISABLED, got %s", res.Status)
	}
	if res.TransactionHash != "" {
		t.Errorf("expected empty transaction hash when execution disabled, got %s", res.TransactionHash)
	}
}

type mockNegativeClient struct {
	chainID *big.Int
}

func (m *mockNegativeClient) ChainID(ctx context.Context) (*big.Int, error) {
	return m.chainID, nil
}
func (m *mockNegativeClient) BalanceAt(ctx context.Context, account common.Address) (*big.Int, error) {
	return big.NewInt(1000000000000000000), nil
}
func (m *mockNegativeClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	return 0, nil
}
func (m *mockNegativeClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	return big.NewInt(2000000000), nil
}
func (m *mockNegativeClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	return big.NewInt(1000000000), nil
}
func (m *mockNegativeClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	return 100000, nil
}
func (m *mockNegativeClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return nil
}
func (m *mockNegativeClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	return &types.Receipt{Status: types.ReceiptStatusSuccessful, BlockNumber: big.NewInt(100)}, nil
}
func (m *mockNegativeClient) Close() {}
