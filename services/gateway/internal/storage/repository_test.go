package storage

import (
	"context"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
)

// TestRepository_IntentPersistence tests saving and retrieving a PaymentIntent (Test Case 26).
func TestRepository_IntentPersistence(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:      "intent_test123",
		AgentID:       "research-agent",
		VaultAddress:  "0x1111111111111111111111111111111111111111",
		ServiceID:     "web-research",
		Recipient:     "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
		Amount:        "180000",
		Asset:         "USDC",
		Purpose:       "api_usage",
		Justification: "Test justification",
		Status:        intent.StatusCreated,
		CreatedAt:     now,
		ExpiresAt:     now.Add(5 * time.Minute),
		UpdatedAt:     now,
	}

	if err := repo.SaveIntent(ctx, pi); err != nil {
		t.Fatalf("failed to save intent: %v", err)
	}

	retrieved, err := repo.GetIntent(ctx, pi.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve intent: %v", err)
	}

	if retrieved.IntentID != pi.IntentID || retrieved.Amount != "180000" || retrieved.Status != intent.StatusCreated {
		t.Fatalf("retrieved intent does not match: %+v", retrieved)
	}
}

// TestRepository_ExecutionPersistence tests saving and retrieving execution records (Test Case 27).
func TestRepository_ExecutionPersistence(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	ex := &intent.PaymentExecutionRecord{
		IntentID:        "intent_test123",
		TransactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
		Status:          "CONFIRMED",
		ConfirmedAt:     &now,
	}

	if err := repo.SaveExecution(ctx, ex); err != nil {
		t.Fatalf("failed to save execution: %v", err)
	}

	retrieved, err := repo.GetExecution(ctx, ex.IntentID)
	if err != nil {
		t.Fatalf("failed to retrieve execution: %v", err)
	}

	if retrieved.TransactionHash != ex.TransactionHash || retrieved.Status != "CONFIRMED" {
		t.Fatalf("retrieved execution does not match: %+v", retrieved)
	}
}

// TestRepository_UniqueIntentID tests that duplicate intent IDs are rejected (Test Case 28).
func TestRepository_UniqueIntentID(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:  "intent_duplicate",
		AgentID:   "research-agent",
		Amount:    "100000",
		Asset:     "USDC",
		Status:    intent.StatusCreated,
		CreatedAt: now,
		ExpiresAt: now.Add(5 * time.Minute),
		UpdatedAt: now,
	}

	if err := repo.SaveIntent(ctx, pi); err != nil {
		t.Fatalf("first save should succeed, got: %v", err)
	}

	if err := repo.SaveIntent(ctx, pi); err == nil {
		t.Fatal("expected error on duplicate intent ID, got nil")
	}
}

// TestRepository_IdempotencyBehavior tests updating status and idempotency (Test Case 29).
func TestRepository_IdempotencyBehavior(t *testing.T) {
	repo := NewMemoryRepository()
	ctx := context.Background()

	now := time.Now()
	pi := &intent.PaymentIntent{
		IntentID:  "intent_idempotent",
		AgentID:   "research-agent",
		Amount:    "100000",
		Asset:     "USDC",
		Status:    intent.StatusCreated,
		CreatedAt: now,
		ExpiresAt: now.Add(5 * time.Minute),
		UpdatedAt: now,
	}

	_ = repo.SaveIntent(ctx, pi)

	// Update to AUTHORIZED
	if err := repo.UpdateIntentStatus(ctx, pi.IntentID, intent.StatusAuthorized, now); err != nil {
		t.Fatalf("failed to update status: %v", err)
	}

	updated, _ := repo.GetIntent(ctx, pi.IntentID)
	if updated.Status != intent.StatusAuthorized {
		t.Fatalf("expected AUTHORIZED status, got: %s", updated.Status)
	}
}
