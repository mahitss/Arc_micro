package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var (
	ErrInvalidSignatureHeader = errors.New("invalid webhook signature header format")
	ErrSignatureMismatch      = errors.New("webhook signature mismatch")
	ErrTimestampExpired       = errors.New("webhook signature timestamp is outside the allowed tolerance window")
)

const (
	DefaultTolerance = 5 * time.Minute
)

// SignPayload computes the HMAC-SHA256 signature for a webhook payload.
// Returns a signature header string in standard format: t=<unix>,v1=<signature>
func SignPayload(secret string, timestamp int64, payload []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	// Canonical signed string: timestamp.payload
	canonical := fmt.Sprintf("%d.%s", timestamp, string(payload))
	mac.Write([]byte(canonical))
	sigHex := hex.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("t=%d,v1=%s", timestamp, sigHex)
}

// VerifySignature validates a webhook signature header against the payload and secret.
// Enforces constant-time comparison and replay attack tolerance.
func VerifySignature(secret string, header string, payload []byte, tolerance time.Duration) error {
	if tolerance <= 0 {
		tolerance = DefaultTolerance
	}

	parts := strings.Split(header, ",")
	var timestampStr, signatureStr string

	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestampStr = kv[1]
		case "v1":
			signatureStr = kv[1]
		}
	}

	if timestampStr == "" || signatureStr == "" {
		return ErrInvalidSignatureHeader
	}

	timestampUnix, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		return ErrInvalidSignatureHeader
	}

	// Verify timestamp is within tolerance window (replay attack protection)
	eventTime := time.Unix(timestampUnix, 0)
	now := time.Now().UTC()
	diff := now.Sub(eventTime)
	if diff < -tolerance || diff > tolerance {
		return ErrTimestampExpired
	}

	// Re-compute expected signature
	expectedHeader := SignPayload(secret, timestampUnix, payload)
	expectedParts := strings.Split(expectedHeader, ",")
	var expectedSig string
	for _, part := range expectedParts {
		if strings.HasPrefix(part, "v1=") {
			expectedSig = strings.TrimPrefix(part, "v1=")
		}
	}

	expectedBytes, err := hex.DecodeString(expectedSig)
	if err != nil {
		return ErrSignatureMismatch
	}
	actualBytes, err := hex.DecodeString(signatureStr)
	if err != nil {
		return ErrSignatureMismatch
	}

	if !hmac.Equal(expectedBytes, actualBytes) {
		return ErrSignatureMismatch
	}

	return nil
}
