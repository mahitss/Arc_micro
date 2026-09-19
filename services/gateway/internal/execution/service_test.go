package execution_test

import (
	"context"
	"math/big"
	"testing"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
)

// mockBlockchainClient simulates an EVM node for execution service tests.
type mockBlockchainClient struct {
	chainIDFn            func(ctx context.Context) (*big.Int, error)
	balanceAtFn          func(ctx context.Context, account common.Address) (*big.Int, error)
	pendingNonceAtFn     func(ctx context.Context, account common.Address) (uint64, error)
	suggestGasPriceFn    func(ctx context.Context) (*big.Int, error)
	suggestGasTipCapFn   func(ctx context.Context) (*big.Int, error)
	estimateGasFn        func(ctx context.Context, msg ethereum.CallMsg) (uint64, error)
	sendTransactionFn    func(ctx context.Context, tx *types.Transaction) error
	transactionReceiptFn func(ctx context.Context, txHash common.Hash) (*types.Receipt, error)
}

func (m *mockBlockchainClient) ChainID(ctx context.Context) (*big.Int, error) {
	if m.chainIDFn != nil {
		return m.chainIDFn(ctx)
	}
	return big.NewInt(5042), nil
}

func (m *mockBlockchainClient) BalanceAt(ctx context.Context, account common.Address) (*big.Int, error) {
	if m.balanceAtFn != nil {
		return m.balanceAtFn(ctx, account)
	}
	return big.NewInt(1000000000000000000), nil // 1 ETH/USDC gas
}

func (m *mockBlockchainClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	if m.pendingNonceAtFn != nil {
		return m.pendingNonceAtFn(ctx, account)
	}
	return 0, nil
}

func (m *mockBlockchainClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	if m.suggestGasPriceFn != nil {
		return m.suggestGasPriceFn(ctx)
	}
	return big.NewInt(2000000000), nil
}

func (m *mockBlockchainClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	if m.suggestGasTipCapFn != nil {
		return m.suggestGasTipCapFn(ctx)
	}
	return big.NewInt(1000000000), nil
}

func (m *mockBlockchainClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	if m.estimateGasFn != nil {
		return m.estimateGasFn(ctx, msg)
	}
	return 100000, nil
}

func (m *mockBlockchainClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	if m.sendTransactionFn != nil {
		return m.sendTransactionFn(ctx, tx)
	}
	return nil
}

func (m *mockBlockchainClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	if m.transactionReceiptFn != nil {
		return m.transactionReceiptFn(ctx, txHash)
	}
	return &types.Receipt{
		Status:      types.ReceiptStatusSuccessful,
		BlockNumber: big.NewInt(100),
		TxHash:      txHash,
	}, nil
}

func (m *mockBlockchainClient) Close() {}

func validExecRequest(reqID string) blockchain.PaymentExecutionRequest {
	return blockchain.PaymentExecutionRequest{
		RequestID:    reqID,
		AgentID:      "research-agent",
		VaultAddress: "0x2222222222222222222222222222222222222222",
		Recipient:    "0x1111111111111111111111111111111111111111",
		Amount:       "180000",
		Purpose:      "api_usage",
	}
}

// 1. When ENABLE_LIVE_EXECUTION == false, returns StateExecutionDisabled
func TestExecutionService_ExecutionDisabled(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: false,
		ArcChainID:          "5042",
		ArcExplorerURL:      "https://explorer.arc.io",
	}
	mockClient := &mockBlockchainClient{}
	store := execution.NewMemoryStore()
	svc := execution.NewExecutionService(cfg, mockClient, store)

	req := validExecRequest("req_disabled_1")
	result, err := svc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Status != blockchain.StateExecutionDisabled {
		t.Errorf("expected EXECUTION_DISABLED status, got %s", result.Status)
	}
	if result.Vault != req.VaultAddress {
		t.Errorf("vault mismatch: expected %s, got %s", req.VaultAddress, result.Vault)
	}
	if result.Recipient != req.Recipient {
		t.Errorf("recipient mismatch: expected %s, got %s", req.Recipient, result.Recipient)
	}
	if result.Amount != req.Amount {
		t.Errorf("amount mismatch: expected %s, got %s", req.Amount, result.Amount)
	}
}

// 2. Idempotency: repeated execution of same request_id returns existing result
func TestExecutionService_Idempotency(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: false,
		ArcChainID:          "5042",
	}
	mockClient := &mockBlockchainClient{}
	store := execution.NewMemoryStore()
	svc := execution.NewExecutionService(cfg, mockClient, store)

	req := validExecRequest("req_idem_1")

	// First execution
	res1, err := svc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("first execution failed: %v", err)
	}

	// Second execution with same request ID
	res2, err := svc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("second execution failed: %v", err)
	}

	if res1.RequestID != res2.RequestID || res1.Status != res2.Status {
		t.Errorf("idempotency violated: res1=%+v, res2=%+v", res1, res2)
	}
}

// 3. Validation: rejects invalid vault address
func TestExecutionService_InvalidVaultAddress(t *testing.T) {
	cfg := &config.Config{EnableLiveExecution: false}
	svc := execution.NewExecutionService(cfg, &mockBlockchainClient{}, nil)

	req := validExecRequest("req_bad_vault")
	req.VaultAddress = "invalid_vault"

	_, err := svc.ExecutePayment(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for invalid vault address, got nil")
	}
}

// 4. Validation: rejects invalid recipient address
func TestExecutionService_InvalidRecipient(t *testing.T) {
	cfg := &config.Config{EnableLiveExecution: false}
	svc := execution.NewExecutionService(cfg, &mockBlockchainClient{}, nil)

	req := validExecRequest("req_bad_recip")
	req.Recipient = "0xnothex"

	_, err := svc.ExecutePayment(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for invalid recipient address, got nil")
	}
}

// 5. Validation: rejects non-numeric or negative amount
func TestExecutionService_InvalidAmount(t *testing.T) {
	cfg := &config.Config{EnableLiveExecution: false}
	svc := execution.NewExecutionService(cfg, &mockBlockchainClient{}, nil)

	testAmounts := []string{"0", "-100", "abc", "12.34", ""}
	for _, amt := range testAmounts {
		req := validExecRequest("req_bad_amt")
		req.Amount = amt

		_, err := svc.ExecutePayment(context.Background(), req)
		if err == nil {
			t.Errorf("expected error for invalid amount '%s', got nil", amt)
		}
	}
}

// 6. Chain ID mismatch triggers error when live execution enabled
func TestExecutionService_ChainIDMismatch(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: true,
		ArcChainID:          "5042",
		ExecutorPrivateKey:  "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
	}
	// Mock returns different chain ID (e.g. 1)
	mockClient := &mockBlockchainClient{
		chainIDFn: func(ctx context.Context) (*big.Int, error) {
			return big.NewInt(1), nil
		},
	}
	svc := execution.NewExecutionService(cfg, mockClient, nil)

	req := validExecRequest("req_mismatch")
	_, err := svc.ExecutePayment(context.Background(), req)
	if err == nil {
		t.Fatal("expected NetworkMismatchError, got nil")
	}
}

// 7. Missing private key triggers ConfigurationError when live execution enabled
func TestExecutionService_MissingPrivateKey(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: true,
		ArcChainID:          "5042",
		ExecutorPrivateKey:  "", // empty key
	}
	mockClient := &mockBlockchainClient{}
	svc := execution.NewExecutionService(cfg, mockClient, nil)

	req := validExecRequest("req_no_key")
	_, err := svc.ExecutePayment(context.Background(), req)
	if err == nil {
		t.Fatal("expected ConfigurationError for missing key, got nil")
	}
}

// 8. Live execution successfully signs, broadcasts, and confirms transaction
func TestExecutionService_LiveExecutionSuccess(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution:    true,
		ArcChainID:             "5042",
		ArcExplorerURL:         "https://explorer.arc.io",
		ExecutorPrivateKey:     "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d",
		ArcConfirmationTimeout: 5 * time.Second,
	}
	sent := false
	mockClient := &mockBlockchainClient{
		sendTransactionFn: func(ctx context.Context, tx *types.Transaction) error {
			sent = true
			return nil
		},
	}
	svc := execution.NewExecutionService(cfg, mockClient, nil)

	req := validExecRequest("req_live_success")
	res, err := svc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected execution error: %v", err)
	}

	if !sent {
		t.Error("expected transaction to be broadcast")
	}
	if res.Status != blockchain.StateConfirmed {
		t.Errorf("expected CONFIRMED status, got %s", res.Status)
	}
	if res.TransactionHash == "" {
		t.Error("expected non-empty transaction hash")
	}
	if res.ExplorerURL == "" {
		t.Error("expected non-empty explorer URL")
	}
}
