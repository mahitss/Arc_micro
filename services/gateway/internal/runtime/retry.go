package runtime

import (
	"strings"
	"time"
)

// RetryEngine provides deterministic classification and backoff calculation for operations.
type RetryEngine struct {
	defaultBaseDelay time.Duration
	defaultMaxDelay  time.Duration
}

// NewRetryEngine initializes a RetryEngine.
func NewRetryEngine(baseDelay, maxDelay time.Duration) *RetryEngine {
	if baseDelay <= 0 {
		baseDelay = 1 * time.Second
	}
	if maxDelay <= 0 {
		maxDelay = 60 * time.Second
	}
	return &RetryEngine{
		defaultBaseDelay: baseDelay,
		defaultMaxDelay:  maxDelay,
	}
}

// ClassifyError evaluates an error and returns its deterministic recovery category.
func (re *RetryEngine) ClassifyError(err error, contextHint string) RetryCategory {
	if err == nil {
		return RetryImmediately
	}

	msg := strings.ToLower(err.Error() + " " + contextHint)

	// 1. Policy DENY is inviolable (INV-103)
	if strings.Contains(msg, "policy deny") || strings.Contains(msg, "hard_deny") || strings.Contains(msg, "blocked_recipient") || strings.Contains(msg, "blocked_asset") {
		return RetryDeny
	}

	// 2. Ambiguous Blockchain execution must route to reconciliation (INV-106)
	if strings.Contains(msg, "ambiguous") || strings.Contains(msg, "receipt timeout") || strings.Contains(msg, "unconfirmed") {
		return RetryReconcile
	}

	// 3. Approval required or expired
	if strings.Contains(msg, "approval required") || strings.Contains(msg, "approval expired") {
		return RetryEscalate
	}

	// 4. Invalid input / malformed recipient / permanent failure
	if strings.Contains(msg, "invalid address") || strings.Contains(msg, "bad request") || strings.Contains(msg, "malformed") {
		return RetryPermanentFailure
	}

	// 5. Waiting for external callback or async result
	if strings.Contains(msg, "waiting for callback") || strings.Contains(msg, "pending result") {
		return RetryWaitForExternalEvent
	}

	// 6. Transient network, timeout, or db connection issues
	if strings.Contains(msg, "timeout") || strings.Contains(msg, "connection refused") || strings.Contains(msg, "transient") || strings.Contains(msg, "503") || strings.Contains(msg, "504") {
		return RetryWithBackoff
	}

	// Default fallback
	return RetryWithBackoff
}

// CalculateBackoff computes exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay.
func (re *RetryEngine) CalculateBackoff(attempt int, baseDelay, maxDelay time.Duration) time.Duration {
	if baseDelay <= 0 {
		baseDelay = re.defaultBaseDelay
	}
	if maxDelay <= 0 {
		maxDelay = re.defaultMaxDelay
	}

	if attempt <= 1 {
		return baseDelay
	}

	shift := attempt - 1
	if shift > 30 {
		shift = 30
	}

	delay := baseDelay * (1 << shift)
	if delay > maxDelay || delay <= 0 {
		return maxDelay
	}
	return delay
}

// CheckDeadlineFeasibility returns true if the workflow has sufficient time remaining before its deadline.
func (re *RetryEngine) CheckDeadlineFeasibility(now time.Time, deadline *time.Time, requiredDuration time.Duration) bool {
	if deadline == nil {
		return true // No deadline configured
	}
	return now.Add(requiredDuration).Before(*deadline)
}
