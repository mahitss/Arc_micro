package intent

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

type mockRepo struct {
	mu         sync.RWMutex
	intents    map[string]*PaymentIntent
	executions map[string]*PaymentExecutionRecord
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		intents:    make(map[string]*PaymentIntent),
		executions: make(map[string]*PaymentExecutionRecord),
	}
}

func (m *mockRepo) SaveIntent(ctx context.Context, pi *PaymentIntent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyPI := *pi
	m.intents[pi.IntentID] = &copyPI
	return nil
}

func (m *mockRepo) GetIntent(ctx context.Context, id string) (*PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pi, ok := m.intents[id]
	if !ok {
		return nil, ErrIntentNotFound
	}
	copyPI := *pi
	return &copyPI, nil
}

func (m *mockRepo) UpdateIntentStatus(ctx context.Context, id string, status IntentStatus, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	pi, ok := m.intents[id]
	if !ok {
		return ErrIntentNotFound
	}
	pi.Status = status
	pi.UpdatedAt = updatedAt
	return nil
}

func (m *mockRepo) SaveExecution(ctx context.Context, ex *PaymentExecutionRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyEx := *ex
	m.executions[ex.IntentID] = &copyEx
	return nil
}

func (m *mockRepo) GetExecution(ctx context.Context, intentID string) (*PaymentExecutionRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ex, ok := m.executions[intentID]
	if !ok {
		return nil, errors.New("not found")
	}
	copyEx := *ex
	return &copyEx, nil
}

// MockClock provides controllable time for deterministic tests.
type MockClock struct {
	CurrentTime time.Time
}

func (m *MockClock) Now() time.Time {
	return m.CurrentTime
}

func (m *MockClock) Advance(d time.Duration) {
	m.CurrentTime = m.CurrentTime.Add(d)
}

// MockPolicyClient implements policy.Client for testing.
type MockPolicyClient struct {
	Decision *domain.AuthorizationDecision
	Err      error
}

func (m *MockPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	if m.Err != nil {
		return domain.AuthorizationDecision{}, m.Err
	}
	if m.Decision != nil {
		return *m.Decision, nil
	}
	return domain.AuthorizationDecision{
		RequestID:  req.RequestID,
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Approved by mock policy",
	}, nil
}

func (m *MockPolicyClient) CheckHealth(ctx context.Context) error {
	return nil
}

// MockExecutionService implements ExecutionService for testing.
type MockExecutionService struct {
	Result *blockchain.PaymentExecutionResult
	Err    error
	Calls  int
}

func (m *MockExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	m.Calls++
	if m.Err != nil {
		return nil, m.Err
	}
	if m.Result != nil {
		return m.Result, nil
	}
	return &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
		Vault:           req.VaultAddress,
		Recipient:       req.Recipient,
		Amount:          req.Amount,
	}, nil
}

func setupIntentTestEnv(policyErr error, decision *domain.AuthorizationDecision, execErr error, autoExec bool) (*Service, *mockRepo, *MockClock, *MockExecutionService) {
	repo := newMockRepo()
	reg := registry.NewDefaultRegistry()
	clk := &MockClock{CurrentTime: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)}

	pClient := &MockPolicyClient{Err: policyErr, Decision: decision}
	execSvc := &MockExecutionService{Err: execErr}

	svc := NewService(repo, pClient, execSvc, reg, clk, 5*time.Minute, autoExec)
	return svc, repo, clk, execSvc
}

// Test 10: Expired intent.
func TestIntentService_ExpiredIntent(t *testing.T) {
	svc, _, clk, _ := setupIntentTestEnv(nil, nil, nil, false)
	ctx := context.Background()

	intent, err := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:       "research-agent",
		ServiceID:     "web-research",
		Amount:        "180000",
		Asset:         "USDC",
		Purpose:       "api_usage",
		Justification: "Test",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	// Advance time past expiration TTL (5 minutes)
	clk.Advance(6 * time.Minute)

	_, _, err = svc.AuthorizeIntent(ctx, intent.IntentID)
	if !errors.Is(err, ErrIntentExpired) {
		t.Fatalf("expected ErrIntentExpired, got: %v", err)
	}

	// Verify status updated to EXPIRED
	got, _, _ := svc.GetIntent(ctx, intent.IntentID)
	if got.Status != StatusExpired {
		t.Fatalf("expected status EXPIRED, got: %s", got.Status)
	}
}

// Test 11: Valid intent authorization.
func TestIntentService_ValidIntentAuthorization(t *testing.T) {
	allowDecision := &domain.AuthorizationDecision{
		Decision:   domain.DecisionAllow,
		ReasonCode: domain.ReasonApproved,
		Reason:     "Policy check passed",
	}
	svc, _, _, _ := setupIntentTestEnv(nil, allowDecision, nil, false)
	ctx := context.Background()

	intent, err := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}

	authIntent, dec, err := svc.AuthorizeIntent(ctx, intent.IntentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if authIntent.Status != StatusAuthorized {
		t.Fatalf("expected AUTHORIZED status, got: %s", authIntent.Status)
	}
	if dec.Decision != domain.DecisionAllow {
		t.Fatalf("expected ALLOW decision, got: %s", dec.Decision)
	}
}

// Test 12: Denied intent.
func TestIntentService_DeniedIntent(t *testing.T) {
	denyDecision := &domain.AuthorizationDecision{
		Decision:   domain.DecisionDeny,
		ReasonCode: domain.ReasonDailyLimitExceeded,
		Reason:     "Daily limit exceeded",
	}
	svc, _, _, _ := setupIntentTestEnv(nil, denyDecision, nil, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	authIntent, dec, err := svc.AuthorizeIntent(ctx, intent.IntentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if authIntent.Status != StatusDenied {
		t.Fatalf("expected DENIED status, got: %s", authIntent.Status)
	}
	if dec.Decision != domain.DecisionDeny {
		t.Fatalf("expected DENY decision, got: %s", dec.Decision)
	}
}

// Test 13: Confirmation without authorization.
func TestIntentService_ConfirmationWithoutAuthorization(t *testing.T) {
	svc, _, _, _ := setupIntentTestEnv(nil, nil, nil, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	// Directly attempt confirm while status is CREATED
	_, _, err := svc.ConfirmIntent(ctx, intent.IntentID)
	if !errors.Is(err, ErrNotAuthorized) {
		t.Fatalf("expected ErrNotAuthorized, got: %v", err)
	}
}

// Test 14: Confirmation after expiration.
func TestIntentService_ConfirmationAfterExpiration(t *testing.T) {
	svc, _, clk, _ := setupIntentTestEnv(nil, nil, nil, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	// Authorize first
	_, _, _ = svc.AuthorizeIntent(ctx, intent.IntentID)

	// Advance time past expiration TTL
	clk.Advance(6 * time.Minute)

	_, _, err := svc.ConfirmIntent(ctx, intent.IntentID)
	if !errors.Is(err, ErrIntentExpired) {
		t.Fatalf("expected ErrIntentExpired, got: %v", err)
	}
}

// Test 15 & 16: Duplicate confirmation and already confirmed intent idempotency.
func TestIntentService_DuplicateAndAlreadyConfirmed(t *testing.T) {
	svc, _, _, execSvc := setupIntentTestEnv(nil, nil, nil, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	_, _, _ = svc.AuthorizeIntent(ctx, intent.IntentID)

	// First confirmation
	confirmed1, res1, err := svc.ConfirmIntent(ctx, intent.IntentID)
	if err != nil {
		t.Fatalf("first confirmation failed: %v", err)
	}
	if confirmed1.Status != StatusConfirmed {
		t.Fatalf("expected CONFIRMED status, got: %s", confirmed1.Status)
	}
	if execSvc.Calls != 1 {
		t.Fatalf("expected 1 execution call, got: %d", execSvc.Calls)
	}

	// Second confirmation (duplicate)
	confirmed2, res2, err := svc.ConfirmIntent(ctx, intent.IntentID)
	if err != nil {
		t.Fatalf("second confirmation failed: %v", err)
	}
	if confirmed2.Status != StatusConfirmed {
		t.Fatalf("expected CONFIRMED status, got: %s", confirmed2.Status)
	}
	// Execution service must NOT have been called again (idempotent)
	if execSvc.Calls != 1 {
		t.Fatalf("expected execution call count to remain 1, got: %d", execSvc.Calls)
	}
	if res1.TransactionHash != res2.TransactionHash {
		t.Fatalf("transaction hashes do not match: %s vs %s", res1.TransactionHash, res2.TransactionHash)
	}
}

// Test 17 & 18: Auto-execution disabled vs enabled.
func TestIntentService_AutoExecutionFlags(t *testing.T) {
	// 17. Auto-execution disabled:
	svcDisabled, _, _, execSvcDisabled := setupIntentTestEnv(nil, nil, nil, false)
	intent1, err := svcDisabled.CreateIntent(context.Background(), CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})
	if err != nil {
		t.Fatalf("failed to create intent: %v", err)
	}
	if intent1.Status != StatusCreated {
		t.Fatalf("expected status CREATED when auto-execution is disabled, got: %s", intent1.Status)
	}
	if execSvcDisabled.Calls != 0 {
		t.Fatalf("expected 0 execution calls, got: %d", execSvcDisabled.Calls)
	}

	// 18. Auto-execution enabled via agent.Service:
	// We test that when agent.Service has autoExecution: true, it authorizes and confirms
	// (tested further in integration flow test)
}

// Test 19: Rust policy engine unavailable.
func TestIntentService_RustUnavailable(t *testing.T) {
	svc, _, _, _ := setupIntentTestEnv(policy.ErrUnavailable, nil, nil, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	_, _, err := svc.AuthorizeIntent(ctx, intent.IntentID)
	if !errors.Is(err, policy.ErrUnavailable) {
		t.Fatalf("expected policy.ErrUnavailable, got: %v", err)
	}
}

// Test 20: Execution service unavailable.
func TestIntentService_ExecutionServiceUnavailable(t *testing.T) {
	execErr := errors.New("blockchain node connection refused")
	svc, _, _, _ := setupIntentTestEnv(nil, nil, execErr, false)
	ctx := context.Background()

	intent, _ := svc.CreateIntent(ctx, CreateIntentParams{
		AgentID:   "research-agent",
		ServiceID: "web-research",
		Amount:    "180000",
		Asset:     "USDC",
		Purpose:   "api_usage",
	})

	_, _, _ = svc.AuthorizeIntent(ctx, intent.IntentID)

	_, _, err := svc.ConfirmIntent(ctx, intent.IntentID)
	if err == nil {
		t.Fatal("expected execution error, got nil")
	}
	if !errors.Is(err, ErrExecutionFailed) {
		t.Fatalf("expected ErrExecutionFailed, got: %v", err)
	}

	// Verify status transitioned to FAILED
	got, _, _ := svc.GetIntent(ctx, intent.IntentID)
	if got.Status != StatusFailed {
		t.Fatalf("expected status FAILED, got: %s", got.Status)
	}
}
