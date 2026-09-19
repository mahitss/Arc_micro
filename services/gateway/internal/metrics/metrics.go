package metrics

import (
	"encoding/json"
	"net/http"
	"sync/atomic"
)

// Metrics collects lightweight operational counters.
type Metrics struct {
	AuthAttempts   uint64 `json:"auth_attempts_total"`
	AuthDenials    uint64 `json:"auth_denials_total"`
	ExecAttempts   uint64 `json:"exec_attempts_total"`
	ExecFailures   uint64 `json:"exec_failures_total"`
	ConfirmedTxs   uint64 `json:"confirmed_txs_total"`
	RPCFailures    uint64 `json:"rpc_failures_total"`
	PolicyFailures uint64 `json:"policy_engine_failures_total"`
}

// Global default metrics tracker
var DefaultMetrics = &MetricsTracker{}

// MetricsTracker provides atomic increment operations.
type MetricsTracker struct {
	authAttempts   atomic.Uint64
	authDenials    atomic.Uint64
	execAttempts   atomic.Uint64
	execFailures   atomic.Uint64
	confirmedTxs   atomic.Uint64
	rpcFailures    atomic.Uint64
	policyFailures atomic.Uint64
}

func (m *MetricsTracker) IncrAuthAttempts()   { m.authAttempts.Add(1) }
func (m *MetricsTracker) IncrAuthDenials()    { m.authDenials.Add(1) }
func (m *MetricsTracker) IncrExecAttempts()   { m.execAttempts.Add(1) }
func (m *MetricsTracker) IncrExecFailures()   { m.execFailures.Add(1) }
func (m *MetricsTracker) IncrConfirmedTxs()   { m.confirmedTxs.Add(1) }
func (m *MetricsTracker) IncrRPCFailures()    { m.rpcFailures.Add(1) }
func (m *MetricsTracker) IncrPolicyFailures() { m.policyFailures.Add(1) }

// Snapshot returns a point-in-time copy of metrics counters.
func (m *MetricsTracker) Snapshot() Metrics {
	return Metrics{
		AuthAttempts:   m.authAttempts.Load(),
		AuthDenials:    m.authDenials.Load(),
		ExecAttempts:   m.execAttempts.Load(),
		ExecFailures:   m.execFailures.Load(),
		ConfirmedTxs:   m.confirmedTxs.Load(),
		RPCFailures:    m.rpcFailures.Load(),
		PolicyFailures: m.policyFailures.Load(),
	}
}

// Handler handles GET /metrics requests.
func (m *MetricsTracker) Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(m.Snapshot())
}
