package middleware

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// clientLimiter tracks request timestamps for a single client IP.
type clientLimiter struct {
	tokens     float64
	lastRefill time.Time
}

// RateLimiter implements an in-process token-bucket rate limiter.
type RateLimiter struct {
	mu          sync.Mutex
	clients     map[string]*clientLimiter
	rate        float64 // tokens per second
	burst       float64 // maximum token capacity
	cleanupFreq time.Duration
}

// NewRateLimiter creates a new in-process RateLimiter.
// rate: sustained requests per second; burst: maximum allowed burst.
func NewRateLimiter(rate float64, burst float64) *RateLimiter {
	rl := &RateLimiter{
		clients:     make(map[string]*clientLimiter),
		rate:        rate,
		burst:       burst,
		cleanupFreq: 5 * time.Minute,
	}

	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cl, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = &clientLimiter{
			tokens:     rl.burst - 1,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(cl.lastRefill).Seconds()
	cl.tokens += elapsed * rl.rate
	if cl.tokens > rl.burst {
		cl.tokens = rl.burst
	}
	cl.lastRefill = now

	if cl.tokens >= 1.0 {
		cl.tokens -= 1.0
		return true
	}

	return false
}

func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.cleanupFreq)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for ip, cl := range rl.clients {
			if cl.lastRefill.Before(cutoff) {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Middleware returns an HTTP middleware enforcing rate limits per client IP.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip rate limiting for internal health and readiness checks
		if r.URL.Path == "/health" || r.URL.Path == "/ready" || r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		ip := extractIP(r)
		if !rl.allow(ip) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(domain.ErrorResponse{
				Error: domain.ErrorDetail{
					Code:    "RATE_LIMIT_EXCEEDED",
					Message: "Too many requests. Please slow down.",
				},
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func extractIP(r *http.Request) string {
	// Check X-Forwarded-For if behind proxy
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
