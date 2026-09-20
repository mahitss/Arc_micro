package integration

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// trackingPolicyClient simulates a policy engine tracking remaining daily budget.
type trackingPolicyClient struct {
	mu           sync.Mutex
	dailyLimit   uint64
	dailySpent   uint64
	allowedCount atomic.Int64
	deniedCount  atomic.Int64
}

func (c *trackingPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var amt uint64
	for _, ch := range req.Amount {
		amt = amt*10 + uint64(ch-'0')
	}

	if c.dailySpent+amt <= c.dailyLimit {
		c.dailySpent += amt
		c.allowedCount.Add(1)
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   domain.DecisionAllow,
			ReasonCode: domain.ReasonApproved,
			Reason:     "Within remaining daily budget",
		}, nil
	}

	c.deniedCount.Add(1)
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionDeny,
		ReasonCode: domain.ReasonDailyLimitExceeded,
		Reason:     "Daily spending limit exceeded",
	}, nil
}

func (c *trackingPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var amt uint64
	for _, ch := range req.Amount {
		amt = amt*10 + uint64(ch-'0')
	}

	if c.dailySpent+amt <= c.dailyLimit {
		return domain.AuthorizationDecision{
			RequestID:  req.RequestID,
			Decision:   domain.DecisionAllow,
			ReasonCode: domain.ReasonApproved,
			Reason:     "Within remaining daily budget",
			Simulation: true,
		}, nil
	}

	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionDeny,
		ReasonCode: domain.ReasonDailyLimitExceeded,
		Reason:     "Daily spending limit exceeded",
		Simulation: true,
	}, nil
}

func (c *trackingPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

// TestConcurrency_ConcurrentAuthorizationAgainstDailyLimit verifies that two simultaneous
// payment requests against a limited daily budget cannot both authorize if their sum exceeds the limit.
func TestConcurrency_ConcurrentAuthorizationAgainstDailyLimit(t *testing.T) {
	repo := storage.NewMemoryRepository()
	reg := registry.NewDefaultRegistry()
	execSvc := &atomicExecutionService{}

	// Daily budget: 500,000 base units ($0.50 USDC). Already spent: 400,000 ($0.40).
	// Remaining: 100,000 ($0.10).
	pClient := &trackingPolicyClient{
		dailyLimit: 500000,
		dailySpent: 400000,
	}

	svc := intent.NewService(repo, pClient, execSvc, reg, nil, 300*time.Second, false)

	// Create two independent intents for $0.08 USDC (80,000 base units) each.
	// 80k + 80k = 160k > 100k remaining.
	ctx := context.Background()
	it1, err := svc.CreateIntent(ctx, intent.CreateIntentParams{
		AgentID:       "research-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "80000",
		Asset:         "USDC",
		Purpose:       "concurrent_spend_1",
		Justification: "budget race test 1",
	})
	if err != nil {
		t.Fatalf("failed to create intent 1: %v", err)
	}

	it2, err := svc.CreateIntent(ctx, intent.CreateIntentParams{
		AgentID:       "research-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Amount:        "80000",
		Asset:         "USDC",
		Purpose:       "concurrent_spend_2",
		Justification: "budget race test 2",
	})
	if err != nil {
		t.Fatalf("failed to create intent 2: %v", err)
	}

	// Authorize both intents concurrently
	var wg sync.WaitGroup
	wg.Add(2)

	var dec1, dec2 *domain.AuthorizationDecision
	var err1, err2 error

	startSignal := make(chan struct{})

	go func() {
		defer wg.Done()
		<-startSignal
		_, dec1, err1 = svc.AuthorizeIntent(context.Background(), it1.IntentID)
	}()

	go func() {
		defer wg.Done()
		<-startSignal
		_, dec2, err2 = svc.AuthorizeIntent(context.Background(), it2.IntentID)
	}()

	close(startSignal)
	wg.Wait()

	if err1 != nil || err2 != nil {
		t.Fatalf("unexpected authorization errors: err1=%v, err2=%v", err1, err2)
	}

	// Exactly ONE must be ALLOW and ONE must be DENY
	allowed := 0
	denied := 0

	if dec1.Decision == domain.DecisionAllow {
		allowed++
	} else if dec1.Decision == domain.DecisionDeny {
		denied++
	}

	if dec2.Decision == domain.DecisionAllow {
		allowed++
	} else if dec2.Decision == domain.DecisionDeny {
		denied++
	}

	if allowed != 1 || denied != 1 {
		t.Fatalf("CRITICAL BUDGET OVERSHOOT: expected 1 ALLOW and 1 DENY, got allowed=%d, denied=%d", allowed, denied)
	}

	t.Logf("Concurrency limit test PASSED: 1 allowed, 1 denied. Total spent: %d / %d", pClient.dailySpent, pClient.dailyLimit)
}
