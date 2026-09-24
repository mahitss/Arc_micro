package operations

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// CircuitBreakerRegistry manages circuit breakers for external service providers and agents.
type CircuitBreakerRegistry struct {
	mu       sync.RWMutex
	breakers map[string]*CircuitBreaker // keyed by "tenant_id:target_type:target_id"
}

// NewCircuitBreakerRegistry creates an instance of CircuitBreakerRegistry.
func NewCircuitBreakerRegistry() *CircuitBreakerRegistry {
	return &CircuitBreakerRegistry{
		breakers: make(map[string]*CircuitBreaker),
	}
}

// key generates the lookup key.
func (r *CircuitBreakerRegistry) key(tenantID, targetType, targetID string) string {
	return fmt.Sprintf("%s:%s:%s", tenantID, targetType, targetID)
}

// GetOrCreate returns an existing breaker or initializes a default CLOSED breaker.
func (r *CircuitBreakerRegistry) GetOrCreate(tenantID, targetType, targetID string) *CircuitBreaker {
	r.mu.Lock()
	defer r.mu.Unlock()

	k := r.key(tenantID, targetType, targetID)
	if cb, exists := r.breakers[k]; exists {
		return cb
	}

	cb := &CircuitBreaker{
		BreakerID:       "cb_" + uuid.NewString()[:8],
		TenantID:        tenantID,
		TargetType:      targetType,
		TargetID:        targetID,
		State:           CircuitClosed,
		Threshold:       5,
		CooldownSeconds: 60,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
	}
	r.breakers[k] = cb
	return cb
}

// AllowExecution checks if the target provider/agent can accept new work.
func (r *CircuitBreakerRegistry) AllowExecution(tenantID, targetType, targetID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	k := r.key(tenantID, targetType, targetID)
	cb, exists := r.breakers[k]
	if !exists {
		return true // Closed by default
	}

	now := time.Now().UTC()
	if cb.State == CircuitOpen {
		if cb.NextProbeAt != nil && now.After(*cb.NextProbeAt) {
			// Transition to Half-Open to probe health
			cb.State = CircuitHalfOpen
			cb.UpdatedAt = now
			return true
		}
		return false
	}

	return true
}

// RecordSuccess records a successful call, resetting half-open or closed breakers.
func (r *CircuitBreakerRegistry) RecordSuccess(tenantID, targetType, targetID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	k := r.key(tenantID, targetType, targetID)
	cb, exists := r.breakers[k]
	if !exists {
		return
	}

	now := time.Now().UTC()
	cb.SuccessCount++
	cb.UpdatedAt = now

	if cb.State == CircuitHalfOpen {
		cb.State = CircuitClosed
		cb.FailureCount = 0
		cb.SuccessCount = 0
		cb.NextProbeAt = nil
	}
}

// RecordFailure records a failure, tripping breaker to OPEN if threshold exceeded.
func (r *CircuitBreakerRegistry) RecordFailure(tenantID, targetType, targetID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	k := r.key(tenantID, targetType, targetID)
	cb, exists := r.breakers[k]
	if !exists {
		cb = &CircuitBreaker{
			BreakerID:       "cb_" + uuid.NewString()[:8],
			TenantID:        tenantID,
			TargetType:      targetType,
			TargetID:        targetID,
			State:           CircuitClosed,
			Threshold:       5,
			CooldownSeconds: 60,
			CreatedAt:       time.Now().UTC(),
		}
		r.breakers[k] = cb
	}

	now := time.Now().UTC()
	cb.FailureCount++
	cb.LastFailureAt = &now
	cb.UpdatedAt = now

	if cb.FailureCount >= cb.Threshold || cb.State == CircuitHalfOpen {
		cb.State = CircuitOpen
		probeAt := now.Add(time.Duration(cb.CooldownSeconds) * time.Second)
		cb.NextProbeAt = &probeAt
	}
}

// ListBreakers returns all circuit breakers for a tenant.
func (r *CircuitBreakerRegistry) ListBreakers(tenantID string) []*CircuitBreaker {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var list []*CircuitBreaker
	for _, cb := range r.breakers {
		if cb.TenantID == tenantID {
			list = append(list, cb)
		}
	}
	return list
}
