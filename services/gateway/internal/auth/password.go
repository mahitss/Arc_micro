package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrPasswordTooShort = errors.New("password must be at least 8 characters")
	ErrInvalidEmail     = errors.New("invalid email address")
)

const SessionTokenPrefix = "aps_"

// HashPassword hashes a raw password using bcrypt with standard cost.
func HashPassword(password string) (string, error) {
	if len(strings.TrimSpace(password)) < 8 {
		return "", ErrPasswordTooShort
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPassword verifies a raw password against a bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateSessionToken generates a cryptographically secure session token and its SHA-256 digest.
func GenerateSessionToken() (token string, tokenHash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("failed to generate random bytes for session: %w", err)
	}
	token = fmt.Sprintf("%s%s", SessionTokenPrefix, hex.EncodeToString(b))
	tokenHash = HashSecret(token)
	return token, tokenHash, nil
}
