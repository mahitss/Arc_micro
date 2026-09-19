package integration

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// Mock execution service that atomically tracks execution attempts
type atomicExecutionService struct {
	executionCount atomic.Int64
}

func (m *atomicExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	m.executionCount.Add(1)
	// Simulate brief network delay
	time.Sleep(10 * time.Millisecond)
	return &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
		Vault:           req.VaultAddress,
		Recipient:       req.Recipient,
		Amount:          req.Amount,
	}, nil
}

// TestConcurrency_ConcurrentConfirmIntent verifies that simultaneous confirm requests
// for the same payment intent NEVER cause duplicate on-chain executions.
func TestConcurrency_ConcurrentConfirmIntent(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &atomicExecutionService{}

	pClient := &testPolicyClient{
		decisionFunc: func(req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
			return domain.AuthorizationDecision{
				RequestID:  req.RequestID,
				Decision:   domain.DecisionAllow,
				ReasonCode: domain.ReasonApproved,
				Reason:     "Policy approved",
			}, nil
		},
	}

	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	// Create and authorize an intent
	it, err := svc.CreateIntent(context.Background(), intent.CreateIntentParams{
		AgentID:       "research-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "100000",
		Asset:         "USDC",
		Purpose:       "concurrent_test",
		Justification: "testing race condition defense",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	_, _, err = svc.AuthorizeIntent(context.Background(), it.IntentID)
	if err != nil {
		t.Fatalf("failed to authorize intent: %v", err)
	}

	// Launch 10 simultaneous confirmation goroutines
	numGoroutines := 10
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	type result struct {
		pi  *intent.PaymentIntent
		res *blockchain.PaymentExecutionResult
		err error
	}
	results := make([]result, numGoroutines)

	startSignal := make(chan struct{})

	for i := 0; i < numGoroutines; i++ {
		go func(idx int) {
			defer wg.Done()
			<-startSignal // ensure all goroutines start at the exact same instant
			pi, res, err := svc.ConfirmIntent(context.Background(), it.IntentID)
			results[idx] = result{pi: pi, res: res, err: err}
		}(i)
	}

	// Release all goroutines concurrently
	close(startSignal)
	wg.Wait()

	// INVARIANT: Exactly ONE execution was triggered
	totalExecutions := execSvc.executionCount.Load()
	if totalExecutions != 1 {
		t.Fatalf("CRITICAL DOUBLE-SPEND BUG: expected exactly 1 execution, got %d", totalExecutions)
	}

	// Check results: every request must have either succeeded (with the single tx) or failed with already-executing
	successfulConfirmations := 0
	for _, r := range results {
		if r.err == nil && r.res != nil && r.res.Status == blockchain.StateConfirmed {
			successfulConfirmations++
			if r.res.TransactionHash != "0x9999999999999999999999999999999999999999999999999999999999999999" {
				t.Errorf("unexpected tx hash: %s", r.res.TransactionHash)
			}
		}
	}

	if successfulConfirmations < 1 {
		t.Errorf("expected at least 1 successful confirmation, got %d", successfulConfirmations)
	}
}
