package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrInvalidKeyFormat  = errors.New("invalid API key format")
	ErrKeyRevoked        = errors.New("API key has been revoked")
	ErrKeyExpired        = errors.New("API key has expired")
	ErrInsufficientScope = errors.New("insufficient API key scope")
)

const (
	KeyPrefixLive = "ap_live_"
	KeyPrefixDemo = "apk_live_"
)

// GenerateAPIKey creates a cryptographically secure API key and its hashed metadata.
// The plaintext secret is returned ONLY once and must NEVER be stored or logged.
func GenerateAPIKey(orgID, name string, scopes []string) (string, *domain.APIKey, error) {
	if orgID == "" {
		orgID = "org_default"
	}
	if name == "" {
		name = "Default Agent Key"
	}

	// Default to least-privilege agent scopes if none specified
	if len(scopes) == 0 {
		scopes = []string{
			domain.ScopePaymentsRead,
			domain.ScopePaymentsCreate,
			domain.ScopeAgentsRead,
			domain.ScopeServicesRead,
		}
	}

	// 1. Generate 32 bytes of cryptographic randomness for the secret
	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		return "", nil, fmt.Errorf("failed to generate secure random bytes: %w", err)
	}
	secret := fmt.Sprintf("%s%s", KeyPrefixLive, hex.EncodeToString(secretBytes))

	// 2. Generate key ID
	idBytes := make([]byte, 8)
	if _, err := rand.Read(idBytes); err != nil {
		return "", nil, fmt.Errorf("failed to generate key ID: %w", err)
	}
	keyID := fmt.Sprintf("key_%s", hex.EncodeToString(idBytes))

	// 3. Compute secure SHA-256 hash
	keyHash := HashSecret(secret)

	// 4. Create masked representation for safe display
	masked := MaskSecret(secret)

	now := time.Now().UTC()
	apiKey := &domain.APIKey{
		ID:             keyID,
		OrganizationID: orgID,
		KeyHash:        keyHash,
		MaskedKey:      masked,
		Name:           name,
		Scopes:         scopes,
		Status:         domain.APIKeyStatusActive,
		CreatedAt:      now,
	}

	return secret, apiKey, nil
}

// HashSecret computes the SHA-256 hex digest of a key secret.
func HashSecret(secret string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(secret)))
	return hex.EncodeToString(sum[:])
}

// VerifySecret compares a provided secret with a stored hash using constant-time comparison.
func VerifySecret(providedSecret, storedHash string) bool {
	providedHash := HashSecret(providedSecret)
	return subtle.ConstantTimeCompare([]byte(providedHash), []byte(storedHash)) == 1
}

// MaskSecret returns a safe, redacted representation of an API key (e.g. ap_live_...1a2b).
func MaskSecret(secret string) string {
	s := strings.TrimSpace(secret)
	if len(s) < 16 {
		return "ap_live_...xxxx"
	}
	prefix := s[:8]
	suffix := s[len(s)-4:]
	return fmt.Sprintf("%s...%s", prefix, suffix)
}

// HasScope checks whether the granted scopes contain the required scope or wildcard (*).
func HasScope(grantedScopes []string, requiredScope string) bool {
	for _, s := range grantedScopes {
		if s == "*" || s == requiredScope {
			return true
		}
	}
	return false
}
