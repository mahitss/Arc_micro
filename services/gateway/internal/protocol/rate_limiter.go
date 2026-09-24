package protocol

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

var ErrRateLimitExceeded = errors.New("rate limit exceeded: message flood rejected (INV-161)")

// RateLimiter enforces per-agent, per-tenant, and per-endpoint limits (Section 43).
type RateLimiter struct {
	mu       sync.Mutex
	limits   map[string]*tokenBucket
	capacity int
	refill   time.Duration
}

type tokenBucket struct {
	tokens    int
	lastCheck time.Time
}

// NewRateLimiter creates a RateLimiter with default capacity and refill rate.
func NewRateLimiter(capacity int, refillInterval time.Duration) *RateLimiter {
	if capacity <= 0 {
		capacity = 100 // default 100 requests per minute
	}
	if refillInterval <= 0 {
		refillInterval = time.Minute
	}
	return &RateLimiter{
		limits:   make(map[string]*tokenBucket),
		capacity: capacity,
		refill:   refillInterval,
	}
}

// Allow checks if a request from the given key (e.g. "tenant:agent:endpoint") is permitted.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now().UTC()
	tb, exists := rl.limits[key]
	if !exists {
		rl.limits[key] = &tokenBucket{
			tokens:    rl.capacity - 1,
			lastCheck: now,
		}
		return true
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(tb.lastCheck)
	if elapsed >= rl.refill {
		tb.tokens = rl.capacity
		tb.lastCheck = now
	}

	if tb.tokens > 0 {
		tb.tokens--
		return true
	}

	return false
}

// CheckLimit returns ErrRateLimitExceeded if the key exceeds its rate quota.
func (rl *RateLimiter) CheckLimit(tenantID, agentID, endpoint string) error {
	key := fmt.Sprintf("%s:%s:%s", tenantID, agentID, endpoint)
	if !rl.Allow(key) {
		return fmt.Errorf("%w for agent %s on %s", ErrRateLimitExceeded, agentID, endpoint)
	}
	return nil
}
