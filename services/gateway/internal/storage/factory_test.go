package storage

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

// TestSanitizeDatabaseURL ensures sensitive credentials are never leaked in logs.
func TestSanitizeDatabaseURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Standard postgres URL with password",
			input:    "postgres://agentpay:supersecret123@localhost:5432/agentpay?sslmode=disable",
			expected: "postgres://agentpay:%2A%2A%2A@localhost:5432/agentpay?sslmode=disable",
		},
		{
			name:     "URL with empty password",
			input:    "postgres://agentpay@localhost:5432/agentpay",
			expected: "postgres://agentpay@localhost:5432/agentpay",
		},
		{
			name:     "Invalid or non-URL string",
			input:    "://invalid-url",
			expected: "[redacted-database-url]",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := SanitizeDatabaseURL(tc.input)
			if actual != tc.expected {
				t.Errorf("SanitizeDatabaseURL(%q) = %q, expected %q", tc.input, actual, tc.expected)
			}
			if strings.Contains(actual, "supersecret123") {
				t.Fatalf("sanitized URL leaked plain password: %s", actual)
			}
		})
	}
}

// TestInitializeRepository_Selection verifies explicit repository selection and fail-fast guarantees.
func TestInitializeRepository_Selection(t *testing.T) {
	ctx := context.Background()

	t.Run("Development mode without DATABASE_URL initializes MemoryRepository", func(t *testing.T) {
		cfg := &config.Config{
			Environment: "development",
			DatabaseURL: "",
		}
		repo, db, err := InitializeRepository(ctx, cfg)
		if err != nil {
			t.Fatalf("expected success in dev without DB, got: %v", err)
		}
		if db != nil {
			defer db.Close()
		}
		if _, ok := repo.(*MemoryRepository); !ok {
			t.Fatalf("expected *MemoryRepository, got: %T", repo)
		}
	})

	t.Run("Production mode without DATABASE_URL fails fast", func(t *testing.T) {
		cfg := &config.Config{
			Environment: "production",
			DatabaseURL: "",
		}
		repo, db, err := InitializeRepository(ctx, cfg)
		if err == nil {
			t.Fatal("expected error in production mode without DATABASE_URL, got nil")
		}
		if db != nil {
			defer db.Close()
		}
		if repo != nil {
			t.Fatalf("expected nil repo on failure, got: %T", repo)
		}
		if !strings.Contains(err.Error(), "DATABASE_URL is required in production mode") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("Database connection failure fails fast without silent fallback to memory", func(t *testing.T) {
		// Points to an unreachable port to trigger immediate connection failure
		cfg := &config.Config{
			Environment: "development",
			DatabaseURL: "postgres://agentpay:secret@127.0.0.1:54399/nonexistent?sslmode=disable&connect_timeout=1",
		}
		repo, db, err := InitializeRepository(ctx, cfg)
		if err == nil {
			t.Fatal("expected connection error for unreachable database, got nil")
		}
		if db != nil {
			defer db.Close()
		}
		if repo != nil {
			t.Fatalf("CRITICAL: Silent fallback occurred! Expected nil repository, got: %T", repo)
		}
	})
}

// TestRepository_LifecyclePersistence verifies state survival, state transitions, idempotency, and treasury locks.
func TestRepository_LifecyclePersistence(t *testing.T) {
	ctx := context.Background()

	// Verify persistence invariants using repository interface
	repo := NewMemoryRepository()
	now := time.Now().Truncate(time.Millisecond)

	// 1. Create organization
	org := &Organization{
		ID:        "org_alpha",
		Name:      "Alpha Capital",
		Status:    "ACTIVE",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := repo.SaveOrganization(ctx, org); err != nil {
		t.Fatalf("failed to save organization: %v", err)
	}

	retrievedOrg, err := repo.GetOrganization(ctx, org.ID)
	if err != nil || retrievedOrg.Name != org.Name {
		t.Fatalf("failed to retrieve organization: %v", err)
	}

	// 2. Create agent
	ag := &Agent{
		ID:             "agent_007",
		OrganizationID: org.ID,
		Name:           "Procurement Agent",
		Status:         "ACTIVE",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := repo.SaveAgent(ctx, ag); err != nil {
		t.Fatalf("failed to save agent: %v", err)
	}

	// 3. Create payment intent
	pi := &intent.PaymentIntent{
		IntentID:       "intent_persist_01",
		OrganizationID: org.ID,
		AgentID:        ag.ID,
		VaultAddress:   ag.VaultAddress,
		Recipient:      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
		Amount:         "5000000", // 5 USDC
		Asset:          "USDC",
		Status:         intent.StatusCreated,
		RequestID:      "req_unique_01",
		CreatedAt:      now,
		ExpiresAt:      now.Add(15 * time.Minute),
		UpdatedAt:      now,
	}
	if err := repo.SaveIntent(ctx, pi); err != nil {
		t.Fatalf("failed to save intent: %v", err)
	}

	// 4. Verify payment intent state transitions survive
	if err := repo.UpdateIntentStatus(ctx, pi.IntentID, intent.StatusAuthorized, now); err != nil {
		t.Fatalf("failed to update intent status to AUTHORIZED: %v", err)
	}

	retrievedIntent, err := repo.GetIntent(ctx, pi.IntentID)
	if err != nil || retrievedIntent.Status != intent.StatusAuthorized {
		t.Fatalf("expected AUTHORIZED status, got: %v", retrievedIntent)
	}

	// 5. Verify CAS transitions (Forward-only FSM)
	swapped, err := repo.CompareAndSwapIntentStatus(ctx, pi.IntentID, intent.StatusAuthorized, intent.StatusSubmitted, now)
	if err != nil || !swapped {
		t.Fatalf("CAS to SUBMITTED failed: %v", err)
	}

	// CAS with wrong expected status must fail
	swappedInvalid, _ := repo.CompareAndSwapIntentStatus(ctx, pi.IntentID, intent.StatusAuthorized, intent.StatusConfirmed, now)
	if swappedInvalid {
		t.Fatal("CAS with invalid precondition unexpectedly succeeded")
	}

	// 6. Test Treasury Reservations & Idempotency
	res := &TreasuryReservation{
		ID:             "res_01",
		OrganizationID: org.ID,
		VaultAddress:   ag.VaultAddress,
		IntentID:       pi.IntentID,
		Amount:         pi.Amount,
		Status:         string(domain.TreasuryReservationStatusReserved),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := repo.CreateReservation(ctx, res); err != nil {
		t.Fatalf("failed to create reservation: %v", err)
	}

	totalReserved, err := repo.GetTotalReservedAmount(ctx, org.ID, ag.VaultAddress)
	if err != nil || totalReserved != 5000000 {
		t.Fatalf("expected 5000000 reserved, got: %d", totalReserved)
	}

	// Duplicate reservation for the same intent must be idempotent
	resDup := &TreasuryReservation{
		ID:             "res_duplicate_attempt",
		OrganizationID: org.ID,
		VaultAddress:   ag.VaultAddress,
		IntentID:       pi.IntentID,
		Amount:         pi.Amount,
		Status:         string(domain.TreasuryReservationStatusReserved),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := repo.CreateReservation(ctx, resDup); err != nil {
		t.Fatalf("duplicate reservation attempt errored: %v", err)
	}
	if resDup.ID != res.ID {
		t.Fatalf("expected reservation ID to match existing reservation %s, got %s", res.ID, resDup.ID)
	}

	// 7. Verify API Keys survive
	apiKey := &APIKey{
		ID:             "key_01",
		OrganizationID: org.ID,
		KeyHash:        "hash_test_12345",
		Name:           "Production Key",
		MaskedKey:      "agp_live_...1234",
		Scopes:         "intents:write,treasury:read",
		Status:         "ACTIVE",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := repo.SaveAPIKey(ctx, apiKey); err != nil {
		t.Fatalf("failed to save API key: %v", err)
	}
	retrievedKey, err := repo.GetAPIKeyByHash(ctx, apiKey.KeyHash)
	if err != nil || retrievedKey.Name != apiKey.Name {
		t.Fatalf("failed to retrieve API key: %v", err)
	}

	// 8. Verify Webhook Endpoints survive
	webhookEp := &webhook.WebhookEndpoint{
		ID:               "wh_01",
		OrganizationID:   org.ID,
		URL:              "https://api.example.com/webhooks",
		SecretHash:       "hash_secret_123",
		MaskedSecret:     "whsec_...123",
		Description:      "Payment webhook listener",
		SubscribedEvents: []string{"intent.confirmed", "treasury.settled"},
		Enabled:          true,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := repo.SaveWebhookEndpoint(ctx, webhookEp); err != nil {
		t.Fatalf("failed to save webhook endpoint: %v", err)
	}
	retrievedWebhook, err := repo.GetWebhookEndpoint(ctx, webhookEp.ID, org.ID)
	if err != nil || retrievedWebhook.URL != webhookEp.URL {
		t.Fatalf("failed to retrieve webhook endpoint: %v", err)
	}

	// 9. Verify Audit Events survive (append-only)
	auditEvt := &AuditEvent{
		ID:             "evt_01",
		OrganizationID: org.ID,
		EventType:      "intent.created",
		ActorType:      "AGENT",
		ActorID:        ag.ID,
		ResourceType:   "INTENT",
		ResourceID:     pi.IntentID,
		RequestID:      pi.RequestID,
		Timestamp:      now,
		Metadata:       `{"amount":"5000000"}`,
	}
	if err := repo.SaveAuditEvent(ctx, auditEvt); err != nil {
		t.Fatalf("failed to save audit event: %v", err)
	}
	events, err := repo.ListAuditEvents(ctx, org.ID)
	if err != nil || len(events) == 0 {
		t.Fatalf("failed to list audit events: %v", err)
	}
	if events[0].ID != auditEvt.ID {
		t.Errorf("expected audit event %s, got %s", auditEvt.ID, events[0].ID)
	}
}

// TestTreasury_ConcurrentReservations ensures no double-reservation or race condition occurs.
func TestTreasury_ConcurrentReservations(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryRepository()
	intentID := "intent_concurrent_test"
	orgID := "org_concurrent"
	vault := "0x2222222222222222222222222222222222222222"

	concurrency := 25
	var wg sync.WaitGroup
	wg.Add(concurrency)

	reservations := make([]*TreasuryReservation, concurrency)
	errorsList := make([]error, concurrency)

	for i := 0; i < concurrency; i++ {
		idx := i
		go func() {
			defer wg.Done()
			res := &TreasuryReservation{
				ID:             fmt.Sprintf("res_%d", idx),
				OrganizationID: orgID,
				VaultAddress:   vault,
				IntentID:       intentID,
				Amount:         "1000000",
				Status:         string(domain.TreasuryReservationStatusReserved),
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}
			err := repo.CreateReservation(ctx, res)
			reservations[idx] = res
			errorsList[idx] = err
		}()
	}

	wg.Wait()

	for _, err := range errorsList {
		if err != nil {
			t.Fatalf("concurrent reservation threw unexpected error: %v", err)
		}
	}

	// All concurrent callers must resolve to the identical single reservation ID
	firstID := reservations[0].ID
	for i, r := range reservations {
		if r.ID != firstID {
			t.Fatalf("reservation %d ID (%s) does not match first ID (%s) - duplicate reservation detected!", i, r.ID, firstID)
		}
	}

	// Authoritative total reserved amount must only count the single reservation (1,000,000 micro-USDC)
	total, err := repo.GetTotalReservedAmount(ctx, orgID, vault)
	if err != nil {
		t.Fatalf("failed to get total reserved amount: %v", err)
	}
	if total != 1000000 {
		t.Fatalf("expected total reserved 1000000, got %d - duplicate reservations counted!", total)
	}
}
