package metrics

import (
	"encoding/json"
	"net/http"
	"sync/atomic"
)

// Metrics collects lightweight operational counters.
type Metrics struct {
	AuthAttempts              uint64 `json:"auth_attempts_total"`
	AuthDenials               uint64 `json:"auth_denials_total"`
	ExecAttempts              uint64 `json:"exec_attempts_total"`
	ExecFailures              uint64 `json:"exec_failures_total"`
	ConfirmedTxs              uint64 `json:"confirmed_txs_total"`
	RPCFailures               uint64 `json:"rpc_failures_total"`
	PolicyFailures            uint64 `json:"policy_engine_failures_total"`
	MissionsCreated           uint64 `json:"missions_created_total"`
	MissionsCompleted         uint64 `json:"missions_completed_total"`
	MissionsFailed            uint64 `json:"missions_failed_total"`
	ServicesDiscovered        uint64 `json:"services_discovered_total"`
	QuotesGenerated           uint64 `json:"quotes_generated_total"`
	QuotesSelected            uint64 `json:"quotes_selected_total"`
	PaymentsProposed          uint64 `json:"payments_proposed_total"`
	PaymentsAllowed           uint64 `json:"payments_allowed_total"`
	PaymentsDenied            uint64 `json:"payments_denied_total"`
	PaymentsApprovalRequired  uint64 `json:"payments_approval_required_total"`
	MissionSpend              uint64 `json:"mission_spend_total"`
	ServiceSpend              uint64 `json:"service_spend_total"`
	ServiceSuccess            uint64 `json:"service_success_total"`
	ServiceFailure            uint64 `json:"service_failure_total"`
	// Phase 25: Agent-to-Agent Metrics
	A2AQuotesTotal           uint64 `json:"a2a_quotes_total"`
	A2AQuotesAcceptedTotal   uint64 `json:"a2a_quotes_accepted_total"`
	A2AQuotesRejectedTotal   uint64 `json:"a2a_quotes_rejected_total"`
	A2AQuotesExpiredTotal    uint64 `json:"a2a_quotes_expired_total"`
	HiresCreatedTotal        uint64 `json:"hires_created_total"`
	HiresCompletedTotal      uint64 `json:"hires_completed_total"`
	HiresFailedTotal         uint64 `json:"hires_failed_total"`
	AgentPaymentsTotal       uint64 `json:"agent_payments_total"`
	AgentPaymentVolume       uint64 `json:"agent_payment_volume"`
	AgentResultFailuresTotal uint64 `json:"agent_result_failures_total"`
	AgentDepthLimitTotal     uint64 `json:"agent_depth_limit_total"`
	NegotiationRoundsTotal   uint64 `json:"negotiation_rounds_total"`
}

// Global default metrics tracker
var DefaultMetrics = &MetricsTracker{}

// MetricsTracker provides atomic increment operations.
type MetricsTracker struct {
	authAttempts             atomic.Uint64
	authDenials              atomic.Uint64
	execAttempts             atomic.Uint64
	execFailures             atomic.Uint64
	confirmedTxs             atomic.Uint64
	rpcFailures              atomic.Uint64
	policyFailures           atomic.Uint64
	missionsCreated          atomic.Uint64
	missionsCompleted        atomic.Uint64
	missionsFailed           atomic.Uint64
	servicesDiscovered       atomic.Uint64
	quotesGenerated          atomic.Uint64
	quotesSelected           atomic.Uint64
	paymentsProposed         atomic.Uint64
	paymentsAllowed          atomic.Uint64
	paymentsDenied           atomic.Uint64
	paymentsApprovalRequired atomic.Uint64
	missionSpend             atomic.Uint64
	serviceSpend             atomic.Uint64
	serviceSuccess           atomic.Uint64
	serviceFailure           atomic.Uint64
	a2aQuotesTotal           atomic.Uint64
	a2aQuotesAcceptedTotal   atomic.Uint64
	a2aQuotesRejectedTotal   atomic.Uint64
	a2aQuotesExpiredTotal    atomic.Uint64
	hiresCreatedTotal        atomic.Uint64
	hiresCompletedTotal      atomic.Uint64
	hiresFailedTotal         atomic.Uint64
	agentPaymentsTotal       atomic.Uint64
	agentPaymentVolume       atomic.Uint64
	agentResultFailuresTotal atomic.Uint64
	agentDepthLimitTotal     atomic.Uint64
	negotiationRoundsTotal   atomic.Uint64
}

func (m *MetricsTracker) IncrAuthAttempts()              { m.authAttempts.Add(1) }
func (m *MetricsTracker) IncrAuthDenials()               { m.authDenials.Add(1) }
func (m *MetricsTracker) IncrExecAttempts()              { m.execAttempts.Add(1) }
func (m *MetricsTracker) IncrExecFailures()              { m.execFailures.Add(1) }
func (m *MetricsTracker) IncrConfirmedTxs()              { m.confirmedTxs.Add(1) }
func (m *MetricsTracker) IncrRPCFailures()               { m.rpcFailures.Add(1) }
func (m *MetricsTracker) IncrPolicyFailures()            { m.policyFailures.Add(1) }
func (m *MetricsTracker) IncrMissionsCreated()           { m.missionsCreated.Add(1) }
func (m *MetricsTracker) IncrMissionsCompleted()         { m.missionsCompleted.Add(1) }
func (m *MetricsTracker) IncrMissionsFailed()            { m.missionsFailed.Add(1) }
func (m *MetricsTracker) IncrServicesDiscovered()        { m.servicesDiscovered.Add(1) }
func (m *MetricsTracker) IncrQuotesGenerated()           { m.quotesGenerated.Add(1) }
func (m *MetricsTracker) IncrQuotesSelected()            { m.quotesSelected.Add(1) }
func (m *MetricsTracker) IncrPaymentsProposed()          { m.paymentsProposed.Add(1) }
func (m *MetricsTracker) IncrPaymentsAllowed()           { m.paymentsAllowed.Add(1) }
func (m *MetricsTracker) IncrPaymentsDenied()            { m.paymentsDenied.Add(1) }
func (m *MetricsTracker) IncrPaymentsApprovalRequired()  { m.paymentsApprovalRequired.Add(1) }
func (m *MetricsTracker) AddMissionSpend(amt uint64)     { m.missionSpend.Add(amt) }
func (m *MetricsTracker) AddServiceSpend(amt uint64)     { m.serviceSpend.Add(amt) }
func (m *MetricsTracker) IncrServiceSuccess()            { m.serviceSuccess.Add(1) }
func (m *MetricsTracker) IncrServiceFailure()            { m.serviceFailure.Add(1) }

// A2A metric increments
func (m *MetricsTracker) IncrA2AQuotes()                 { m.a2aQuotesTotal.Add(1) }
func (m *MetricsTracker) IncrA2AQuotesAccepted()         { m.a2aQuotesAcceptedTotal.Add(1) }
func (m *MetricsTracker) IncrA2AQuotesRejected()         { m.a2aQuotesRejectedTotal.Add(1) }
func (m *MetricsTracker) IncrA2AQuotesExpired()          { m.a2aQuotesExpiredTotal.Add(1) }
func (m *MetricsTracker) IncrHiresCreated()              { m.hiresCreatedTotal.Add(1) }
func (m *MetricsTracker) IncrHiresCompleted()            { m.hiresCompletedTotal.Add(1) }
func (m *MetricsTracker) IncrHiresFailed()               { m.hiresFailedTotal.Add(1) }
func (m *MetricsTracker) IncrAgentPayments()             { m.agentPaymentsTotal.Add(1) }
func (m *MetricsTracker) AddAgentPaymentVolume(amt uint64) { m.agentPaymentVolume.Add(amt) }
func (m *MetricsTracker) IncrAgentResultFailures()       { m.agentResultFailuresTotal.Add(1) }
func (m *MetricsTracker) IncrAgentDepthLimit()           { m.agentDepthLimitTotal.Add(1) }
func (m *MetricsTracker) IncrNegotiationRounds()         { m.negotiationRoundsTotal.Add(1) }

// Snapshot returns a point-in-time copy of metrics counters.
func (m *MetricsTracker) Snapshot() Metrics {
	return Metrics{
		AuthAttempts:             m.authAttempts.Load(),
		AuthDenials:              m.authDenials.Load(),
		ExecAttempts:             m.execAttempts.Load(),
		ExecFailures:             m.execFailures.Load(),
		ConfirmedTxs:             m.confirmedTxs.Load(),
		RPCFailures:              m.rpcFailures.Load(),
		PolicyFailures:           m.policyFailures.Load(),
		MissionsCreated:          m.missionsCreated.Load(),
		MissionsCompleted:        m.missionsCompleted.Load(),
		MissionsFailed:           m.missionsFailed.Load(),
		ServicesDiscovered:       m.servicesDiscovered.Load(),
		QuotesGenerated:          m.quotesGenerated.Load(),
		QuotesSelected:           m.quotesSelected.Load(),
		PaymentsProposed:         m.paymentsProposed.Load(),
		PaymentsAllowed:          m.paymentsAllowed.Load(),
		PaymentsDenied:           m.paymentsDenied.Load(),
		PaymentsApprovalRequired: m.paymentsApprovalRequired.Load(),
		MissionSpend:             m.missionSpend.Load(),
		ServiceSpend:             m.serviceSpend.Load(),
		ServiceSuccess:           m.serviceSuccess.Load(),
		ServiceFailure:           m.serviceFailure.Load(),
		A2AQuotesTotal:           m.a2aQuotesTotal.Load(),
		A2AQuotesAcceptedTotal:   m.a2aQuotesAcceptedTotal.Load(),
		A2AQuotesRejectedTotal:   m.a2aQuotesRejectedTotal.Load(),
		A2AQuotesExpiredTotal:    m.a2aQuotesExpiredTotal.Load(),
		HiresCreatedTotal:        m.hiresCreatedTotal.Load(),
		HiresCompletedTotal:      m.hiresCompletedTotal.Load(),
		HiresFailedTotal:         m.hiresFailedTotal.Load(),
		AgentPaymentsTotal:       m.agentPaymentsTotal.Load(),
		AgentPaymentVolume:       m.agentPaymentVolume.Load(),
		AgentResultFailuresTotal: m.agentResultFailuresTotal.Load(),
		AgentDepthLimitTotal:     m.agentDepthLimitTotal.Load(),
		NegotiationRoundsTotal:   m.negotiationRoundsTotal.Load(),
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
