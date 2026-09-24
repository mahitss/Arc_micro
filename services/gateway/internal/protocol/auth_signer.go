package protocol

import (
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"
)

var (
	ErrMissingSignature = errors.New("missing cryptographic message signature")
	ErrSignatureMismatch = errors.New("cryptographic signature mismatch")
	ErrReplayedNonce    = errors.New("replay attack detected: nonce already utilized")
	ErrExpiredTimestamp = errors.New("message timestamp expired outside tolerance window")
)

const (
	DefaultMessageTolerance = 5 * time.Minute
	MaxMessagePayloadBytes  = 10 * 1024 * 1024 // 10 MB limit (Section 44)
)

// NonceStore tracks used nonces per sender to prevent replay attacks (Section 19).
type NonceStore interface {
	CheckAndRecordNonce(senderID string, nonce string, expiry time.Time) error
}

// MemoryNonceStore provides in-memory replay protection.
type MemoryNonceStore struct {
	mu     sync.Mutex
	nonces map[string]time.Time // key: senderID:nonce -> expiry
}

// NewMemoryNonceStore creates a new in-memory nonce store.
func NewMemoryNonceStore() *MemoryNonceStore {
	store := &MemoryNonceStore{
		nonces: make(map[string]time.Time),
	}
	go store.cleanupLoop()
	return store
}

func (s *MemoryNonceStore) CheckAndRecordNonce(senderID string, nonce string, expiry time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := fmt.Sprintf("%s:%s", senderID, nonce)
	if exp, exists := s.nonces[key]; exists {
		if time.Now().UTC().Before(exp) {
			return ErrReplayedNonce
		}
	}

	s.nonces[key] = expiry
	return nil
}

func (s *MemoryNonceStore) cleanupLoop() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now().UTC()
		for k, exp := range s.nonces {
			if now.After(exp) {
				delete(s.nonces, k)
			}
		}
		s.mu.Unlock()
	}
}

// ProtocolSigner handles message signing and verification.
type ProtocolSigner struct {
	nonceStore NonceStore
	tolerance  time.Duration
}

// NewProtocolSigner constructs a ProtocolSigner.
func NewProtocolSigner(nonces NonceStore) *ProtocolSigner {
	if nonces == nil {
		nonces = NewMemoryNonceStore()
	}
	return &ProtocolSigner{
		nonceStore: nonces,
		tolerance:  DefaultMessageTolerance,
	}
}

// SignMessageHMAC computes an HMAC-SHA256 signature for a protocol message envelope.
func SignMessageHMAC(msg *ProtocolMessage, secret string) string {
	canonical := msg.CanonicalSigningString()
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(canonical))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyMessageHMAC verifies an HMAC-SHA256 signature on an incoming message.
func (ps *ProtocolSigner) VerifyMessageHMAC(msg *ProtocolMessage, secret string) error {
	if msg.Signature == "" {
		return ErrMissingSignature
	}

	// 1. Check timestamp freshness (INV-171)
	if err := ValidateINV171(msg.Timestamp, ps.tolerance); err != nil {
		return ErrExpiredTimestamp
	}

	// 2. Check nonce replay (INV-170)
	if msg.Nonce != "" {
		expiry := msg.Timestamp.Add(ps.tolerance)
		if err := ps.nonceStore.CheckAndRecordNonce(msg.SenderID, msg.Nonce, expiry); err != nil {
			return ErrReplayedNonce
		}
	}

	// 3. Verify HMAC signature
	expected := SignMessageHMAC(msg, secret)
	if !hmac.Equal([]byte(msg.Signature), []byte(expected)) {
		return ErrSignatureMismatch
	}

	return nil
}

// VerifyMessageEd25519 verifies an Ed25519 signature on an incoming message.
func (ps *ProtocolSigner) VerifyMessageEd25519(msg *ProtocolMessage, publicKey ed25519.PublicKey) error {
	if msg.Signature == "" {
		return ErrMissingSignature
	}

	if err := ValidateINV171(msg.Timestamp, ps.tolerance); err != nil {
		return ErrExpiredTimestamp
	}

	if msg.Nonce != "" {
		expiry := msg.Timestamp.Add(ps.tolerance)
		if err := ps.nonceStore.CheckAndRecordNonce(msg.SenderID, msg.Nonce, expiry); err != nil {
			return ErrReplayedNonce
		}
	}

	sigBytes, err := hex.DecodeString(msg.Signature)
	if err != nil {
		return ErrSignatureMismatch
	}

	canonical := msg.CanonicalSigningString()
	if !ed25519.Verify(publicKey, []byte(canonical), sigBytes) {
		return ErrSignatureMismatch
	}

	return nil
}
