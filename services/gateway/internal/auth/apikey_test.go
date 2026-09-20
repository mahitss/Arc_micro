package auth

import (
	"strings"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

func TestGenerateAPIKey(t *testing.T) {
	secret, key, err := GenerateAPIKey("org_test", "Test Key", []string{domain.ScopePaymentsCreate, domain.ScopePaymentsRead})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.HasPrefix(secret, KeyPrefixLive) {
		t.Errorf("expected secret to start with %s, got %s", KeyPrefixLive, secret)
	}

	if key.ID == "" || !strings.HasPrefix(key.ID, "key_") {
		t.Errorf("expected key ID to start with key_, got %s", key.ID)
	}

	if key.KeyHash == "" || key.KeyHash == secret {
		t.Errorf("key hash must not be empty or equal to secret")
	}

	if key.OrganizationID != "org_test" {
		t.Errorf("expected org_test, got %s", key.OrganizationID)
	}

	if key.Status != domain.APIKeyStatusActive {
		t.Errorf("expected ACTIVE status, got %s", key.Status)
	}

	if !VerifySecret(secret, key.KeyHash) {
		t.Errorf("VerifySecret should succeed for generated secret")
	}

	// Tampered secret must fail
	if VerifySecret(secret+"tamper", key.KeyHash) {
		t.Errorf("VerifySecret should fail for tampered secret")
	}
}

func TestMaskSecret(t *testing.T) {
	secret := "ap_live_0123456789abcdef0123456789abcdef"
	masked := MaskSecret(secret)
	if !strings.HasPrefix(masked, "ap_live_...") || !strings.HasSuffix(masked, "cdef") {
		t.Errorf("unexpected masked format: %s", masked)
	}
}

func TestHasScope(t *testing.T) {
	scopes := []string{domain.ScopePaymentsRead, domain.ScopePaymentsCreate}

	if !HasScope(scopes, domain.ScopePaymentsRead) {
		t.Errorf("expected to have payments:read")
	}
	if !HasScope(scopes, domain.ScopePaymentsCreate) {
		t.Errorf("expected to have payments:create")
	}
	if HasScope(scopes, domain.ScopePaymentsApprove) {
		t.Errorf("should NOT have payments:approve")
	}

	wildcard := []string{"*"}
	if !HasScope(wildcard, domain.ScopePaymentsApprove) {
		t.Errorf("wildcard should match any scope")
	}
}
