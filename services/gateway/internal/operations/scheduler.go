package operations

import (
	"errors"
	"sync"
	"time"
)

var (
	ErrTenantQuotaExceeded = errors.New("tenant operational quota exceeded")
	ErrGlobalCapacityFull  = errors.New("global operational capacity reached")
	ErrRateLimitExceeded   = errors.New("external API or provider rate limit exceeded")
)

// TenantQuota configures per-tenant operational limits.
type TenantQuota struct {
	MaxConcurrentWorkflows int `json:"max_concurrent_workflows"`
	MaxConcurrentTasks     int `json:"max_concurrent_tasks"`
	MaxRequestsPerMinute   int `json:"max_requests_per_minute"`
}

// DefaultTenantQuota provides balanced fair-share defaults.
func DefaultTenantQuota() TenantQuota {
	return TenantQuota{
		MaxConcurrentWorkflows: 20,
		MaxConcurrentTasks:     5,
		MaxRequestsPerMinute:   120,
	}
}

// TenantUsage tracks real-time resource consumption by a tenant.
type TenantUsage struct {
	ActiveWorkflows int
	ActiveTasks     int
	RequestCount    int
	WindowStart     time.Time
}

// ResourceScheduler manages bounded execution capacity and enforces tenant fairness.
type ResourceScheduler struct {
	mu           sync.Mutex
	globalSlots  int
	activeSlots  int
	defaultQuota TenantQuota
	tenantQuotas map[string]TenantQuota
	tenantUsage  map[string]*TenantUsage
}

// NewResourceScheduler creates an instance of ResourceScheduler.
func NewResourceScheduler(totalGlobalSlots int) *ResourceScheduler {
	if totalGlobalSlots <= 0 {
		totalGlobalSlots = 100
	}
	return &ResourceScheduler{
		globalSlots:  totalGlobalSlots,
		defaultQuota: DefaultTenantQuota(),
		tenantQuotas: make(map[string]TenantQuota),
		tenantUsage:  make(map[string]*TenantUsage),
	}
}

// SetTenantQuota overrides quota for a specific tenant.
func (s *ResourceScheduler) SetTenantQuota(tenantID string, quota TenantQuota) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tenantQuotas[tenantID] = quota
}

// getUsage returns or initializes tenant usage. Must be called with lock held.
func (s *ResourceScheduler) getUsage(tenantID string) *TenantUsage {
	usage, exists := s.tenantUsage[tenantID]
	if !exists {
		usage = &TenantUsage{
			WindowStart: time.Now().UTC(),
		}
		s.tenantUsage[tenantID] = usage
	}
	// Reset rate window if expired
	if time.Since(usage.WindowStart) > time.Minute {
		usage.RequestCount = 0
		usage.WindowStart = time.Now().UTC()
	}
	return usage
}

// getQuota returns the quota for a tenant. Must be called with lock held.
func (s *ResourceScheduler) getQuota(tenantID string) TenantQuota {
	if q, exists := s.tenantQuotas[tenantID]; exists {
		return q
	}
	return s.defaultQuota
}

// AcquireSlot attempts to allocate a concurrency slot for a tenant workflow/task.
// Enforces INV-126 & INV-127 fair-share isolation so one tenant cannot starve others.
func (s *ResourceScheduler) AcquireSlot(tenantID string, isWorkflow bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	usage := s.getUsage(tenantID)
	quota := s.getQuota(tenantID)

	// 1. Rate limit check
	if usage.RequestCount >= quota.MaxRequestsPerMinute {
		return ErrRateLimitExceeded
	}

	// 2. Tenant concurrency limit check
	if isWorkflow {
		if usage.ActiveWorkflows >= quota.MaxConcurrentWorkflows {
			return ErrTenantQuotaExceeded
		}
	} else {
		if usage.ActiveTasks >= quota.MaxConcurrentTasks {
			return ErrTenantQuotaExceeded
		}
	}

	// 3. Global capacity check
	if s.activeSlots >= s.globalSlots {
		return ErrGlobalCapacityFull
	}

	// Allocate slot
	s.activeSlots++
	usage.RequestCount++
	if isWorkflow {
		usage.ActiveWorkflows++
	} else {
		usage.ActiveTasks++
	}

	return nil
}

// ReleaseSlot releases a previously allocated concurrency slot.
func (s *ResourceScheduler) ReleaseSlot(tenantID string, isWorkflow bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	usage, exists := s.tenantUsage[tenantID]
	if exists {
		if isWorkflow {
			if usage.ActiveWorkflows > 0 {
				usage.ActiveWorkflows--
			}
		} else {
			if usage.ActiveTasks > 0 {
				usage.ActiveTasks--
			}
		}
	}

	if s.activeSlots > 0 {
		s.activeSlots--
	}
}

// GetCapacityMetrics returns real-time slot utilization.
func (s *ResourceScheduler) GetCapacityMetrics() (int, int, float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	util := 0.0
	if s.globalSlots > 0 {
		util = float64(s.activeSlots) / float64(s.globalSlots)
	}
	return s.activeSlots, s.globalSlots, util
}
