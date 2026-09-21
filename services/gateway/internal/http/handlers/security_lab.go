package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/adversarial"
)

// SecurityLabHandler serves Adversarial Agent Lab reporting and live execution.
type SecurityLabHandler struct {
	runner       *adversarial.LabRunner
	mu           sync.RWMutex
	cachedReport *adversarial.SecurityLabReport
	lastRunAt    time.Time
}

// NewSecurityLabHandler constructs a new SecurityLabHandler.
func NewSecurityLabHandler(runner *adversarial.LabRunner) *SecurityLabHandler {
	if runner == nil {
		runner = adversarial.NewLabRunner()
	}
	return &SecurityLabHandler{
		runner: runner,
	}
}

// HandleGetReport returns the latest cached or initial security report.
func (h *SecurityLabHandler) HandleGetReport(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	report := h.cachedReport
	h.mu.RUnlock()

	if report == nil {
		// Run initial suite if not cached yet
		res := h.runner.RunAll(r.Context())
		h.mu.Lock()
		h.cachedReport = &res
		h.lastRunAt = time.Now()
		report = &res
		h.mu.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(report)
}

// HandleRunSuite triggers a fresh execution of all 20 adversarial attack scenarios.
func (h *SecurityLabHandler) HandleRunSuite(w http.ResponseWriter, r *http.Request) {
	res := h.runner.RunAll(r.Context())

	h.mu.Lock()
	h.cachedReport = &res
	h.lastRunAt = time.Now()
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}
