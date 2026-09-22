package economy

import (
	"errors"
	"strings"
	"time"
)

const (
	MaxUntrustedPayloadBytes = 1024 * 1024 // 1MB payload cap
)

var (
	ErrPayloadTooLarge = errors.New("untrusted service result exceeds maximum payload limit (1MB)")
)

// UntrustedServiceResult encapsulates raw external service data with explicit untrusted classification.
// INVARIANT: Fields in this struct CANNOT alter mission budget, policy limits, recipients, or state machine transitions.
type UntrustedServiceResult struct {
	ServiceID    string    `json:"service_id"`
	StepID       string    `json:"step_id"`
	RawPayload   string    `json:"raw_payload"`
	PayloadBytes int       `json:"payload_bytes"`
	ReceivedAt   time.Time `json:"received_at"`
	IsSanitized  bool      `json:"is_sanitized"`
}

// SanitizedData holds clean text data safe for report generation and audit storage.
type SanitizedData struct {
	CleanContent      string `json:"clean_content"`
	ContainsInjection bool   `json:"contains_injection_indicators"`
	SizeBytes         int    `json:"size_bytes"`
}

// SanitizeExternalOutput validates and extracts data from untrusted service output.
// It detects adversarial prompt injection patterns, logging them without executing or granting authority.
func SanitizeExternalOutput(rawOutput string) (*SanitizedData, error) {
	if len(rawOutput) > MaxUntrustedPayloadBytes {
		return nil, ErrPayloadTooLarge
	}

	lower := strings.ToLower(rawOutput)
	hasInjection := false

	// Check common adversarial injection indicators
	adversarialPhrases := []string{
		"ignore previous instructions",
		"ignore all rules",
		"system instruction:",
		"increase budget",
		"disable policy",
		"approve payment",
		"pay me again",
		"new recipient",
		"transfer ownership",
		"override limit",
	}

	for _, phrase := range adversarialPhrases {
		if strings.Contains(lower, phrase) {
			hasInjection = true
			break
		}
	}

	// CleanContent preserves the data for historical and audit inspection,
	// but the architecture guarantees this data is never fed into authorization or policy logic.
	return &SanitizedData{
		CleanContent:      rawOutput,
		ContainsInjection: hasInjection,
		SizeBytes:         len(rawOutput),
	}, nil
}
