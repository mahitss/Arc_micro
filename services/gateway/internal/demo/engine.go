package demo

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// MissionState represents the 21 explicit deterministic states of the mission.
type MissionState string

const (
	StateCreated             MissionState = "CREATED"
	StatePlanning            MissionState = "PLANNING"
	StateDiscovering         MissionState = "DISCOVERING"
	StateQuoting             MissionState = "QUOTING"
	StateSelecting           MissionState = "SELECTING"
	StateNegotiating         MissionState = "NEGOTIATING"
	StatePolicyCheck         MissionState = "POLICY_CHECK"
	StateRiskCheck           MissionState = "RISK_CHECK"
	StateApprovalCheck       MissionState = "APPROVAL_CHECK"
	StateTreasuryReservation MissionState = "TREASURY_RESERVATION"
	StateExecuting           MissionState = "EXECUTING"
	StateProviderFailure     MissionState = "PROVIDER_FAILURE"
	StateSecurityBlock       MissionState = "SECURITY_BLOCK"
	StateReplanning          MissionState = "REPLANNING"
	StateRecovery            MissionState = "RECOVERY"
	StateValidating          MissionState = "VALIDATING"
	StateSynthesis           MissionState = "SYNTHESIS"
	StateClearing            MissionState = "CLEARING"
	StateSettlementReady     MissionState = "SETTLEMENT_READY"
	StateCompleted           MissionState = "COMPLETED"
	StateFailed              MissionState = "FAILED"
)

// CanonicalEventName represents the canonical event types in the timeline.
type CanonicalEventName string

const (
	EventMissionCreated              CanonicalEventName = "MISSION_CREATED"
	EventPlanGenerated               CanonicalEventName = "PLAN_GENERATED"
	EventAgentDiscovered             CanonicalEventName = "AGENT_DISCOVERED"
	EventQuoteReceived               CanonicalEventName = "QUOTE_RECEIVED"
	EventQuoteCompared               CanonicalEventName = "QUOTE_COMPARED"
	EventServiceSelected             CanonicalEventName = "SERVICE_SELECTED"
	EventNegotiationCompleted        CanonicalEventName = "NEGOTIATION_COMPLETED"
	EventPolicyEvaluated             CanonicalEventName = "POLICY_EVALUATED"
	EventRiskEvaluated               CanonicalEventName = "RISK_EVALUATED"
	EventTreasuryReserved            CanonicalEventName = "TREASURY_RESERVED"
	EventPaymentRequested            CanonicalEventName = "PAYMENT_REQUESTED"
	EventSecurityViolationDetected   CanonicalEventName = "SECURITY_VIOLATION_DETECTED"
	EventPaymentBlocked              CanonicalEventName = "PAYMENT_BLOCKED"
	EventProviderFailed              CanonicalEventName = "PROVIDER_FAILED"
	EventReplanRequested             CanonicalEventName = "REPLAN_REQUESTED"
	EventAlternativeProviderSelected CanonicalEventName = "ALTERNATIVE_PROVIDER_SELECTED"
	EventPaymentReauthorized         CanonicalEventName = "PAYMENT_REAUTHORIZED"
	EventResultReceived              CanonicalEventName = "RESULT_RECEIVED"
	EventResultValidated             CanonicalEventName = "RESULT_VALIDATED"
	EventClearingRecorded            CanonicalEventName = "CLEARING_RECORDED"
	EventSettlementSimulated         CanonicalEventName = "SETTLEMENT_SIMULATED"
	EventMissionCompleted            CanonicalEventName = "MISSION_COMPLETED"
)

// MissionEvent represents a single canonical mission event.
type MissionEvent struct {
	EventID        string                 `json:"event_id"`
	MissionID      string                 `json:"mission_id"`
	Timestamp      string                 `json:"timestamp"`
	State          MissionState           `json:"state"`
	Actor          string                 `json:"actor"`
	Action         string                 `json:"action"`
	Status         string                 `json:"status"`
	Amount         float64                `json:"amount"`
	Currency       string                 `json:"currency"`
	CorrelationID  string                 `json:"correlation_id"`
	CausationID    string                 `json:"causation_id"`
	Source         string                 `json:"source"`
	SimulationLive string                 `json:"simulation_live"`
	Metadata       map[string]interface{} `json:"metadata"`
}

// ProviderInfo holds quote and metadata for marketplace providers.
type ProviderInfo struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Capability      string  `json:"capability"`
	QuoteUSDC       float64 `json:"quote_usdc"`
	LatencySeconds  float64 `json:"latency_seconds"`
	Reliability     string  `json:"reliability"`
	IsMalicious     bool    `json:"is_malicious,omitempty"`
	AttemptedAttack string  `json:"attempted_attack,omitempty"`
	Status          string  `json:"status"` // "AVAILABLE", "SELECTED", "BLOCKED", "FAILED", "SUPERSEDED", "SETTLED"
}

// ClearingObligation represents an obligation in the clearinghouse.
type ClearingObligation struct {
	ObligationID string  `json:"obligation_id"`
	ProviderID   string  `json:"provider_id"`
	ProviderName string  `json:"provider_name"`
	AmountUSDC   float64 `json:"amount_usdc"`
	Status       string  `json:"status"` // "AUTHORIZED", "BLOCKED_NOT_SETTLED", "SIMULATED_SETTLED"
	Reason       string  `json:"reason,omitempty"`
}

// EconomicTraceNode represents a node in the financial trace.
type EconomicTraceNode struct {
	Stage       string  `json:"stage"`
	Label       string  `json:"label"`
	State       string  `json:"state"`
	Authority   string  `json:"authority"` // "ADVISORY" vs "AUTHORITATIVE"
	ImpactUSDC  float64 `json:"impact_usdc"`
	Description string  `json:"description"`
}

// AITraceNode represents an action taken by an AI model.
type AITraceNode struct {
	StepID        string  `json:"step_id"`
	Model         string  `json:"model"`
	Task          string  `json:"task"`
	PromptVersion string  `json:"prompt_version"`
	RequestID     string  `json:"request_id"`
	Tokens        int     `json:"tokens"`
	LatencyMs     int     `json:"latency_ms"`
	EstimatedCost float64 `json:"estimated_cost_usdc"`
	Status        string  `json:"status"`
}

// AuthorityTraceStage represents a gateway authority checkpoint.
type AuthorityTraceStage struct {
	Gate         string  `json:"gate"`
	InputState   string  `json:"input_state"`
	Evaluator    string  `json:"evaluator"`
	Decision     string  `json:"decision"` // "PASS", "FAIL", "HARD_DENY", "PENDING"
	EnforcedRule string  `json:"enforced_rule"`
	FundsMoved   float64 `json:"funds_moved_usdc"`
}

// FlagshipMissionSummary captures the complete deterministic scenario state.
type FlagshipMissionSummary struct {
	MissionID          string                 `json:"mission_id"`
	Name               string                 `json:"name"`
	Objective          string                 `json:"objective"`
	BudgetCapUSDC      float64                `json:"budget_cap_usdc"`
	AuthorizedUSDC     float64                `json:"authorized_usdc"`
	BlockedUSDC        float64                `json:"blocked_usdc"`
	RemainingUSDC      float64                `json:"remaining_usdc"`
	Mode               string                 `json:"mode"`
	ModeNotice         string                 `json:"mode_notice"`
	Seed               string                 `json:"seed"`
	CurrentState       MissionState           `json:"current_state"`
	CurrentStepIndex   int                    `json:"current_step_index"`
	TotalSteps         int                    `json:"total_steps"`
	IsPaused           bool                   `json:"is_paused"`
	IsCompleted        bool                   `json:"is_completed"`
	AgentsCount        int                    `json:"agents_count"`
	SecurityViolations int                    `json:"security_violations_count"`
	RecoveredFailures  int                    `json:"recovered_failures_count"`
	ArcSettlement      map[string]interface{} `json:"arc_settlement"`
	Events             []MissionEvent         `json:"events"`
	Providers          []ProviderInfo         `json:"providers"`
	ClearingSummary    struct {
		TotalAuthorized  float64              `json:"total_authorized_usdc"`
		TotalBlocked     float64              `json:"total_blocked_usdc"`
		SimulatedSettled float64              `json:"simulated_settled_usdc"`
		Obligations      []ClearingObligation `json:"obligations"`
	} `json:"clearing_summary"`
	EconomicTrace     []EconomicTraceNode    `json:"economic_trace"`
	AITrace           []AITraceNode          `json:"ai_trace"`
	AuthorityTrace    []AuthorityTraceStage  `json:"authority_trace"`
	WhyExplanation    map[string]interface{} `json:"why_explanation"`
	WhyNotExplanation map[string]interface{} `json:"why_not_explanation"`
}

// MissionReplayEngine manages deterministic execution and replay of the flagship mission.
type MissionReplayEngine struct {
	mu           sync.RWMutex
	seed         string
	missionID    string
	currentIndex int
	isPaused     bool
	allEvents    []MissionEvent
	summary      FlagshipMissionSummary
}

const (
	CanonicalSeed      = "agentpay-demo-001"
	CanonicalMissionID = "msn_market_intel_001"
)

// NewMissionReplayEngine constructs a fresh deterministic mission engine with the canonical seed.
func NewMissionReplayEngine() *MissionReplayEngine {
	engine := &MissionReplayEngine{
		seed:         CanonicalSeed,
		missionID:    CanonicalMissionID,
		currentIndex: 0,
		isPaused:     false,
	}
	engine.buildCanonicalTimeline()
	return engine
}

// Reset resets the engine back to step 0.
func (e *MissionReplayEngine) Reset() *FlagshipMissionSummary {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.currentIndex = 0
	e.isPaused = false
	e.buildCanonicalTimeline()
	return e.getSummaryLocked()
}

// Start resumes playback.
func (e *MissionReplayEngine) Start() *FlagshipMissionSummary {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.isPaused = false
	return e.getSummaryLocked()
}

// Pause pauses playback.
func (e *MissionReplayEngine) Pause() *FlagshipMissionSummary {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.isPaused = true
	return e.getSummaryLocked()
}

// Step advances by one event.
func (e *MissionReplayEngine) Step() *FlagshipMissionSummary {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.currentIndex < len(e.allEvents)-1 {
		e.currentIndex++
	}
	return e.getSummaryLocked()
}

// JumpToStep sets the playback cursor to a specific event index.
func (e *MissionReplayEngine) JumpToStep(idx int) *FlagshipMissionSummary {
	e.mu.Lock()
	defer e.mu.Unlock()
	if idx >= 0 && idx < len(e.allEvents) {
		e.currentIndex = idx
	}
	return e.getSummaryLocked()
}

// GetSummary returns the current snapshot of the mission.
func (e *MissionReplayEngine) GetSummary() *FlagshipMissionSummary {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.getSummaryLocked()
}

// GetEvents returns the list of events up to the current index.
func (e *MissionReplayEngine) GetEvents() []MissionEvent {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if len(e.allEvents) == 0 {
		return []MissionEvent{}
	}
	limit := e.currentIndex + 1
	if limit > len(e.allEvents) {
		limit = len(e.allEvents)
	}
	res := make([]MissionEvent, limit)
	copy(res, e.allEvents[:limit])
	return res
}

// GetTrace returns the complete economic trace nodes.
func (e *MissionReplayEngine) GetTrace() []EconomicTraceNode {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.summary.EconomicTrace
}

func (e *MissionReplayEngine) getSummaryLocked() *FlagshipMissionSummary {
	cp := e.summary
	cp.CurrentStepIndex = e.currentIndex
	cp.IsPaused = e.isPaused
	cp.IsCompleted = (e.currentIndex >= len(e.allEvents)-1)
	if e.currentIndex < len(e.allEvents) {
		cp.CurrentState = e.allEvents[e.currentIndex].State
	}

	limit := e.currentIndex + 1
	if limit > len(e.allEvents) {
		limit = len(e.allEvents)
	}
	cp.Events = make([]MissionEvent, limit)
	copy(cp.Events, e.allEvents[:limit])
	return &cp
}

// buildCanonicalTimeline populates the bitwise-deterministic 22 events and traces.
func (e *MissionReplayEngine) buildCanonicalTimeline() {
	baseTime := time.Date(2026, 9, 28, 12, 0, 0, 0, time.UTC)
	corrID := "corr_demo_" + e.seed

	events := []MissionEvent{
		// 1. OBJECTIVE CREATED
		{
			EventID:        "evt_01_created",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(0 * time.Second).Format(time.RFC3339),
			State:          StateCreated,
			Actor:          "Operator",
			Action:         "Initialize Autonomous Objective",
			Status:         "SUCCESS",
			Amount:         25.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "op_intent_init",
			Source:         "ECONOMIC_FABRIC",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"title":           "Autonomous Market Intelligence",
				"objective":       "Produce a high-confidence market intelligence report using autonomous agents while staying within a strict economic policy.",
				"budget_envelope": 25.00,
				"deadline":        "10 minutes",
				"risk_envelope":   "LOW",
				"thesis":          "AI proposals are advisory. Financial authority remains deterministic.",
			},
		},
		// 2. PLAN GENERATED
		{
			EventID:        "evt_02_plan",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(2 * time.Second).Format(time.RFC3339),
			State:          StatePlanning,
			Actor:          "AI Planner Layer",
			Action:         "Decompose Objective into Task Graph",
			Status:         "SUCCESS",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_01_created",
			Source:         "AI_PROVIDER_OPENROUTER",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"model":             "anthropic/claude-3.5-sonnet",
				"tasks":             []string{"Research", "Market Data", "Analysis", "Critic", "Synthesis"},
				"dag_dependencies":  "Research -> Analysis; Market Data -> Analysis; Analysis + Critic -> Synthesis",
				"policy_validation": "PASS",
				"authority_impact":  "UNCHANGED",
			},
		},
		// 3. AGENT DISCOVERED
		{
			EventID:        "evt_03_discovery",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(4 * time.Second).Format(time.RFC3339),
			State:          StateDiscovering,
			Actor:          "A2A Marketplace Registry",
			Action:         "Discover Specialist Agents",
			Status:         "SUCCESS",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_02_plan",
			Source:         "MARKETPLACE_REGISTRY",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"capability":          "market-intel",
				"candidates_found":    4,
				"discovered_entities": []string{"Provider A (High SLA)", "Provider B (Cost Opt)", "Provider C (Ultra Low Latency)", "Malicious Provider (Adversarial)"},
			},
		},
		// 4. QUOTE RECEIVED
		{
			EventID:        "evt_04_quotes",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(6 * time.Second).Format(time.RFC3339),
			State:          StateQuoting,
			Actor:          "Marketplace Ingestion",
			Action:         "Receive Structured Service Quotes",
			Status:         "SUCCESS",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_03_discovery",
			Source:         "ECONOMIC_FABRIC",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"quotes": []map[string]interface{}{
					{"provider": "Provider A", "quote_usdc": 4.00, "latency_s": 2.1, "reliability": "HIGH"},
					{"provider": "Provider B", "quote_usdc": 3.60, "latency_s": 1.8, "reliability": "MEDIUM"},
					{"provider": "Provider C", "quote_usdc": 4.50, "latency_s": 1.4, "reliability": "HIGH"},
				},
				"provenance": "SIMULATED MARKET DATA",
			},
		},
		// 5. QUOTE COMPARED
		{
			EventID:        "evt_05_compare",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(8 * time.Second).Format(time.RFC3339),
			State:          StateSelecting,
			Actor:          "AI Advisory Layer",
			Action:         "Compare Quotes & Recommend Candidate",
			Status:         "SUCCESS",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_04_quotes",
			Source:         "AI_RECOMMENDATION",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"recommended_provider": "Provider B",
				"reason":               "Lowest expected cost ($3.60) within SLA deadline envelope.",
				"ai_recommendation":    "Provider B",
				"agentpay_status":      "PENDING_AUTHORITY_GATE",
			},
		},
		// 6. SERVICE SELECTED
		{
			EventID:        "evt_06_select",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(10 * time.Second).Format(time.RFC3339),
			State:          StateSelecting,
			Actor:          "AgentPay Gate",
			Action:         "Authorize Candidate Provider B",
			Status:         "SUCCESS",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_05_compare",
			Source:         "ECONOMIC_FABRIC",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"selected_provider":    "Provider B",
				"recipient_resolution": "REGISTRY_RESOLVED (service_registry:provider-b)",
				"budget_check":         "3.60 <= 25.00 USDC (PASS)",
				"authority_decision":   "AUTHORIZED",
			},
		},
		// 7. NEGOTIATION COMPLETED
		{
			EventID:        "evt_07_negotiate",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(12 * time.Second).Format(time.RFC3339),
			State:          StateNegotiating,
			Actor:          "A2A Protocol",
			Action:         "Finalize Service Level Agreement",
			Status:         "SUCCESS",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_06_select",
			Source:         "PROTOCOL_SERVICE",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"sla_max_latency_s": 2.5,
				"retry_policy":      "MAX_RETRIES_1",
				"escrow_mode":       "SIMULATED_RESERVATION",
			},
		},
		// 8. POLICY EVALUATED
		{
			EventID:        "evt_08_policy",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(14 * time.Second).Format(time.RFC3339),
			State:          StatePolicyCheck,
			Actor:          "Rust Policy Engine",
			Action:         "Deterministic Policy Evaluation",
			Status:         "ALLOW",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_07_negotiate",
			Source:         "POLICY_ENGINE_RUST",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"policy_decision": "ALLOW",
				"eval_duration":   "6.36us",
				"rules_checked":   []string{"ALLOWLIST", "PER_TX_LIMIT", "DAILY_LIMIT", "SERVICE_ALLOWED", "RECIPIENT_ALLOWED"},
			},
		},
		// 9. RISK EVALUATED
		{
			EventID:        "evt_09_risk",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(16 * time.Second).Format(time.RFC3339),
			State:          StateRiskCheck,
			Actor:          "Risk Engine",
			Action:         "Assess Counterparty & Concentration Risk",
			Status:         "PASS",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_08_policy",
			Source:         "RISK_ENGINE",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"risk_score":          18,
				"risk_tier":           "LOW",
				"concentration_ratio": "0.144 (safe < 0.30)",
				"approval_required":   false,
			},
		},
		// 10. TREASURY RESERVED
		{
			EventID:        "evt_10_treasury",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(18 * time.Second).Format(time.RFC3339),
			State:          StateTreasuryReservation,
			Actor:          "Treasury Orchestrator",
			Action:         "Encumber Simulated Liquidity",
			Status:         "RESERVED",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_09_risk",
			Source:         "TREASURY_ORCHESTRATOR",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"reservation_id":    "res_sim_001_b",
				"encumbered_amount": 3.60,
				"buffer_solvency":   "86.4% HEALTHY",
				"invariant_check":   "INV-76 (reservation isolated)",
			},
		},
		// 11. PAYMENT REQUESTED
		{
			EventID:        "evt_11_payment_req",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(20 * time.Second).Format(time.RFC3339),
			State:          StateExecuting,
			Actor:          "Execution Gate",
			Action:         "Construct PaymentIntent for Provider B",
			Status:         "PENDING_DISPATCH",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_10_treasury",
			Source:         "INTENT_SERVICE",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"intent_id":  "pi_sim_prov_b_01",
				"recipient":  "service_registry:provider-b",
				"amount_raw": "3600000",
			},
		},
		// 12. SECURITY VIOLATION DETECTED (SIGNATURE ATTACK MOMENT)
		{
			EventID:        "evt_12_sec_violation",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(22 * time.Second).Format(time.RFC3339),
			State:          StateSecurityBlock,
			Actor:          "Malicious Provider Interceptor",
			Action:         "Attack #1: Recipient Substitution Attempt",
			Status:         "ATTACK_DETECTED",
			Amount:         3.60,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_11_payment_req",
			Source:         "SECURITY_GUARDRAILS",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"attack_vector":       "Recipient Substitution",
				"requested_recipient": "0xdead00000000000000000000000000000000beef (attacker-wallet)",
				"allowed_recipient":   "service_registry:provider-b",
				"reason":              "RECIPIENT_MISMATCH: Unauthorized recipient swap attempted mid-flight",
				"enforced_rule":       "INV-186 (raw hex destination blocked; recipient must be verified registry entry) & INV-146",
			},
		},
		// 13. PAYMENT BLOCKED
		{
			EventID:        "evt_13_pay_blocked",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(24 * time.Second).Format(time.RFC3339),
			State:          StateSecurityBlock,
			Actor:          "AgentPay Security Guardrail",
			Action:         "HARD DENY: Block Payment to Attacker",
			Status:         "BLOCKED",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_12_sec_violation",
			Source:         "SECURITY_GUARDRAILS",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"decision":            "HARD DENY",
				"funds_moved":         "0.00 USDC",
				"override_possible":   false,
				"treasury_protection": "Reservation revoked; zero unreserved exposure.",
			},
		},
		// 14. PROVIDER FAILED
		{
			EventID:        "evt_14_prov_fail",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(26 * time.Second).Format(time.RFC3339),
			State:          StateProviderFailure,
			Actor:          "Durable Runtime Monitor",
			Action:         "Detect Provider B Lease Heartbeat Timeout",
			Status:         "TIMEOUT_DETECTED",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_13_pay_blocked",
			Source:         "RUNTIME_SUPERVISOR",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"failed_provider": "Provider B",
				"failure_reason":  "Heartbeat missed (>2000ms lease expired)",
				"mission_state":   "RECOVERY REQUIRED",
				"invariant_check": "INV-101 (stale worker fenced) & INV-103 (no blind retry)",
			},
		},
		// 15. REPLAN REQUESTED
		{
			EventID:        "evt_15_replan_req",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(28 * time.Second).Format(time.RFC3339),
			State:          StateReplanning,
			Actor:          "AI Adaptive Loop",
			Action:         "Propose Autonomous Replan: Switch to Provider C",
			Status:         "PROPOSAL_SUBMITTED",
			Amount:         4.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_14_prov_fail",
			Source:         "AI_ADAPTIVE_LOOP",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"original_provider":    "Provider B ($3.60)",
				"replacement_provider": "Provider C ($4.50)",
				"marginal_cost":        "+0.90 USDC",
				"new_total_cost":       "8.50 USDC (Provider A $4.00 + Provider C $4.50)",
				"budget_check":         "8.50 <= 25.00 USDC (PASS)",
				"authority_expansion":  "NONE",
			},
		},
		// 16. ALTERNATIVE PROVIDER SELECTED
		{
			EventID:        "evt_16_alt_select",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(30 * time.Second).Format(time.RFC3339),
			State:          StateRecovery,
			Actor:          "AgentPay Gate",
			Action:         "Authorize Replacement Provider C",
			Status:         "AUTHORIZED",
			Amount:         4.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_15_replan_req",
			Source:         "ECONOMIC_FABRIC",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"provider":            "Provider C",
				"policy_validation":   "PASS",
				"risk_validation":     "PASS",
				"recipient_validated": "service_registry:provider-c",
				"envelope_bound":      "INV-143 & INV-148 PRESERVED",
			},
		},
		// 17. PAYMENT REAUTHORIZED
		{
			EventID:        "evt_17_pay_reauth",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(32 * time.Second).Format(time.RFC3339),
			State:          StateExecuting,
			Actor:          "Treasury & Intent Service",
			Action:         "Reserve and Authorize Payment to Provider C",
			Status:         "AUTHORIZED",
			Amount:         4.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_16_alt_select",
			Source:         "TREASURY_ORCHESTRATOR",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"reservation_id": "res_sim_002_c",
				"total_reserved": 8.50,
				"buffer_status":  "HEALTHY",
			},
		},
		// 18. RESULT RECEIVED
		{
			EventID:        "evt_18_result_rec",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(35 * time.Second).Format(time.RFC3339),
			State:          StateValidating,
			Actor:          "Provider C Deliverable Service",
			Action:         "Deliver Research & Market Intel Report",
			Status:         "DELIVERED",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_17_pay_reauth",
			Source:         "SERVICE_DELIVERY",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"payload_hash":   "0x3f8a912e74d8123bf018a092147acb84179321de82e81190bc1f4a9b0cde3281",
				"latency_actual": "1.38s",
				"items_analyzed": 142,
			},
		},
		// 19. RESULT VALIDATED
		{
			EventID:        "evt_19_result_val",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(37 * time.Second).Format(time.RFC3339),
			State:          StateValidating,
			Actor:          "Critic Agent",
			Action:         "Validate Deliverable Quality & Schema",
			Status:         "PASS",
			Amount:         0.00,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_18_result_rec",
			Source:         "CRITIC_AGENT",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"critic_score":      94,
				"quality_threshold": 80,
				"schema_check":      "VALID",
				"source_metadata":   "VERIFIED",
			},
		},
		// 20. CLEARING RECORDED
		{
			EventID:        "evt_20_clearing",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(39 * time.Second).Format(time.RFC3339),
			State:          StateClearing,
			Actor:          "Autonomous Clearinghouse",
			Action:         "Record Netting & Bilateral Obligations",
			Status:         "RECORDED",
			Amount:         8.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_19_result_val",
			Source:         "CLEARINGHOUSE_ENGINE",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"obligations": []map[string]interface{}{
					{"provider": "Provider A", "amount_usdc": 4.00, "status": "AUTHORIZED"},
					{"provider": "Provider B", "amount_usdc": 3.60, "status": "BLOCKED_NOT_SETTLED"},
					{"provider": "Provider C", "amount_usdc": 4.50, "status": "AUTHORIZED"},
				},
				"total_authorized": 8.50,
				"total_blocked":    3.60,
			},
		},
		// 21. SETTLEMENT SIMULATED
		{
			EventID:        "evt_21_settlement",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(41 * time.Second).Format(time.RFC3339),
			State:          StateSettlementReady,
			Actor:          "Arc Simulator",
			Action:         "Generate Projected Arc Settlement Trace",
			Status:         "SIMULATED",
			Amount:         8.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_20_clearing",
			Source:         "ARC_SIMULATOR",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"chain_id":               5042,
				"network":                "Arc Mainnet",
				"broadcast":              "NONE",
				"settlement_state":       "SIMULATED — NO FUNDS MOVED",
				"agent_vault_deployment": "UNDEPLOYED",
				"funds_disbursed_usdc":   0.00,
			},
		},
		// 22. MISSION COMPLETED
		{
			EventID:        "evt_22_complete",
			MissionID:      e.missionID,
			Timestamp:      baseTime.Add(43 * time.Second).Format(time.RFC3339),
			State:          StateCompleted,
			Actor:          "Autonomous Economic Fabric",
			Action:         "Finalize Mission & Release Unencumbered Budget",
			Status:         "SUCCESS",
			Amount:         16.50,
			Currency:       "USDC",
			CorrelationID:  corrID,
			CausationID:    "evt_21_settlement",
			Source:         "ECONOMIC_FABRIC",
			SimulationLive: "SIMULATION",
			Metadata: map[string]interface{}{
				"budget_cap_usdc":           25.00,
				"authorized_spend_usdc":     8.50,
				"blocked_adversarial_usdc":  3.60,
				"unencumbered_return_usdc":  16.50,
				"total_agents":              5,
				"security_violations_count": 1,
				"recovered_failures_count":  1,
				"validation_result":         "PASS (Quality Score 94)",
				"thesis_verification":       "Autonomy expanded to recover from provider failure. Financial authority remained locked within 25.00 USDC cap.",
			},
		},
	}

	e.allEvents = events

	// Providers info
	providers := []ProviderInfo{
		{
			ID:             "provider_a",
			Name:           "Provider A",
			Capability:     "Market Data Aggregation",
			QuoteUSDC:      4.00,
			LatencySeconds: 2.1,
			Reliability:    "HIGH",
			Status:         "SETTLED",
		},
		{
			ID:              "provider_b",
			Name:            "Provider B",
			Capability:      "Fast Market Feed",
			QuoteUSDC:       3.60,
			LatencySeconds:  1.8,
			Reliability:     "MEDIUM",
			IsMalicious:     true,
			AttemptedAttack: "Recipient Substitution to attacker-wallet",
			Status:          "BLOCKED",
		},
		{
			ID:             "provider_c",
			Name:           "Provider C",
			Capability:     "Deep Market Intelligence",
			QuoteUSDC:      4.50,
			LatencySeconds: 1.4,
			Reliability:    "HIGH",
			Status:         "SETTLED",
		},
		{
			ID:              "provider_malicious",
			Name:            "Malicious Interceptor",
			Capability:      "Adversarial Calldata / Spoof",
			QuoteUSDC:       0.50,
			LatencySeconds:  0.1,
			Reliability:     "ZERO",
			IsMalicious:     true,
			AttemptedAttack: "Arbitrary Calldata Injection",
			Status:          "BLOCKED",
		},
	}

	// Clearing summary
	obligations := []ClearingObligation{
		{
			ObligationID: "obl_prov_a_001",
			ProviderID:   "provider_a",
			ProviderName: "Provider A",
			AmountUSDC:   4.00,
			Status:       "SIMULATED_SETTLED",
			Reason:       "Task completed and validated by Critic Agent",
		},
		{
			ObligationID: "obl_prov_b_002",
			ProviderID:   "provider_b",
			ProviderName: "Provider B",
			AmountUSDC:   3.60,
			Status:       "BLOCKED_NOT_SETTLED",
			Reason:       "Attack #1 blocked: Recipient substitution attempted to unauthorized wallet",
		},
		{
			ObligationID: "obl_prov_c_003",
			ProviderID:   "provider_c",
			ProviderName: "Provider C",
			AmountUSDC:   4.50,
			Status:       "SIMULATED_SETTLED",
			Reason:       "Replacement provider completed task; critic score 94/100",
		},
	}

	// Economic trace
	econTrace := []EconomicTraceNode{
		{Stage: "OBJECTIVE", Label: "Autonomous Market Intelligence", State: "INITIALIZED", Authority: "ADVISORY", ImpactUSDC: 25.00, Description: "Operator sets intent with strict $25.00 USDC cap"},
		{Stage: "PLAN", Label: "DAG Task Compilation", State: "COMPILED", Authority: "ADVISORY", ImpactUSDC: 0.00, Description: "Claude 3.5 Sonnet generates 5-stage dependency graph"},
		{Stage: "MARKET", Label: "Marketplace Discovery", State: "DISCOVERED", Authority: "ADVISORY", ImpactUSDC: 0.00, Description: "Registry returns 4 specialist candidates"},
		{Stage: "QUOTE", Label: "Quote Comparison", State: "RANKED", Authority: "ADVISORY", ImpactUSDC: 3.60, Description: "Provider B proposed at $3.60"},
		{Stage: "CONTRACT", Label: "SLA Formation", State: "FORMED", Authority: "ADVISORY", ImpactUSDC: 3.60, Description: "Bilateral SLA terms locked"},
		{Stage: "POLICY", Label: "Rust Policy Engine", State: "ALLOW", Authority: "AUTHORITATIVE", ImpactUSDC: 3.60, Description: "Pre-check evaluates allowlist & budget"},
		{Stage: "RISK", Label: "Risk & Concentration", State: "PASS", Authority: "AUTHORITATIVE", ImpactUSDC: 3.60, Description: "Risk score 18 (Low) under 30% concentration cap"},
		{Stage: "RESERVATION", Label: "Treasury Encumbrance", State: "RESERVED", Authority: "AUTHORITATIVE", ImpactUSDC: 3.60, Description: "Treasury ledger reserves $3.60"},
		{Stage: "SECURITY", Label: "Recipient Substitution Gate", State: "HARD_DENY", Authority: "AUTHORITATIVE", ImpactUSDC: 0.00, Description: "Attacker wallet blocked. Zero funds moved."},
		{Stage: "RECOVERY", Label: "Autonomous Replan", State: "EXPANDED_PLAN", Authority: "ADVISORY", ImpactUSDC: 4.50, Description: "Switched to Provider C (+$0.90) within $25 cap"},
		{Stage: "RESULT", Label: "Critic Evaluation", State: "VALIDATED", Authority: "AUTHORITATIVE", ImpactUSDC: 0.00, Description: "Critic verifies quality score 94/100"},
		{Stage: "CLEARING", Label: "Obligations Ledger", State: "NETTED", Authority: "AUTHORITATIVE", ImpactUSDC: 8.50, Description: "Net obligations $8.50 ($16.50 returned to treasury)"},
		{Stage: "SETTLEMENT", Label: "Arc Settlement Simulator", State: "SIMULATED", Authority: "AUTHORITATIVE", ImpactUSDC: 8.50, Description: "Chain 5042 simulated trace; unbroadcast"},
	}

	// AI Trace
	aiTrace := []AITraceNode{
		{StepID: "ai_plan_01", Model: "anthropic/claude-3.5-sonnet", Task: "Objective Decomposition", PromptVersion: "v2.1", RequestID: "req_ai_91283", Tokens: 642, LatencyMs: 412, EstimatedCost: 0.002, Status: "SUCCESS"},
		{StepID: "ai_quote_02", Model: "anthropic/claude-3.5-sonnet", Task: "Quote Comparison & Selection", PromptVersion: "v1.4", RequestID: "req_ai_91284", Tokens: 310, LatencyMs: 290, EstimatedCost: 0.001, Status: "SUCCESS"},
		{StepID: "ai_replan_03", Model: "anthropic/claude-3.5-sonnet", Task: "Failure Recovery & Provider Replan", PromptVersion: "v3.0", RequestID: "req_ai_91285", Tokens: 512, LatencyMs: 388, EstimatedCost: 0.002, Status: "SUCCESS"},
		{StepID: "ai_eval_04", Model: "meta-llama/llama-3.3-70b-instruct", Task: "Critic Quality Scoring", PromptVersion: "v2.0", RequestID: "req_ai_91286", Tokens: 720, LatencyMs: 450, EstimatedCost: 0.001, Status: "SUCCESS"},
		{StepID: "ai_synth_05", Model: "anthropic/claude-3.5-sonnet", Task: "Multi-Agent Intelligence Synthesis", PromptVersion: "v2.5", RequestID: "req_ai_91287", Tokens: 1240, LatencyMs: 820, EstimatedCost: 0.004, Status: "SUCCESS"},
	}

	// Authority Trace
	authTrace := []AuthorityTraceStage{
		{Gate: "AI_PROPOSAL", InputState: "AI proposes Provider B ($3.60)", Evaluator: "AI Layer (Advisory)", Decision: "PROPOSED", EnforcedRule: "AI cannot authorize funds", FundsMoved: 0.00},
		{Gate: "POLICY_GATE", InputState: "Validate spend against policies", Evaluator: "Rust Policy Engine", Decision: "PASS", EnforcedRule: "Rule #1 (Allowlist) & Rule #2 (Spend <= $25)", FundsMoved: 0.00},
		{Gate: "RISK_GATE", InputState: "Check concentration ratio", Evaluator: "Risk Engine", Decision: "PASS", EnforcedRule: "Concentration < 30% envelope", FundsMoved: 0.00},
		{Gate: "APPROVAL_GATE", InputState: "Check single-tx human threshold", Evaluator: "Approval Engine", Decision: "NOT_REQUIRED", EnforcedRule: "Amount $3.60 < $50.00 threshold", FundsMoved: 0.00},
		{Gate: "TREASURY_GATE", InputState: "Lock liquidity in ledger", Evaluator: "Treasury Ledger Mutex", Decision: "RESERVED", EnforcedRule: "INV-76 (Zero unreserved spend)", FundsMoved: 0.00},
		{Gate: "SECURITY_INTERCEPT", InputState: "Recipient altered to attacker-wallet", Evaluator: "Security Guardrails", Decision: "HARD_DENY", EnforcedRule: "INV-186 & INV-146 (Recipient mismatch)", FundsMoved: 0.00},
		{Gate: "REPLAN_VALIDATION", InputState: "Provider C proposed at $4.50", Evaluator: "Economic Fabric Gate", Decision: "PASS", EnforcedRule: "INV-143 (Replan within original budget)", FundsMoved: 0.00},
		{Gate: "EXECUTION_GATE", InputState: "Authorize final payment intent", Evaluator: "Signer Pipeline", Decision: "SIMULATED", EnforcedRule: "INV-156 (Zero broadcast in simulation)", FundsMoved: 8.50},
	}

	// Why Explanation
	why := map[string]interface{}{
		"title":             "WHY DID AGENTPAY DO THIS?",
		"decision":          "Provider C Selected as Final Service Provider",
		"ai_recommendation": "Provider C (Replacement for failed Provider B)",
		"agentpay_decision": "AUTHORIZED",
		"reasons": []string{
			"Provider B experienced heartbeat timeout (>2000ms lease expiry) and was fenced.",
			"Provider C satisfied required capability ('market-intel') with 1.4s latency and HIGH reliability.",
			"Total mission cost ($8.50) remained well within the $25.00 USDC economic envelope.",
			"Deterministic recipient matched canonical registry entry (service_registry:provider-c).",
			"No financial authority expansion occurred: autonomy adapted the plan while budget limits remained immutable.",
		},
	}

	// Why Not Explanation
	whyNot := map[string]interface{}{
		"title":              "WHY WAS MALICIOUS PROVIDER REJECTED?",
		"attempted_action":   "Substitute payment destination to unauthorized address 0xdead...beef",
		"requested":          "recipient = attacker-wallet",
		"allowed":            "recipient = registry-resolved provider-b",
		"decision":           "HARD DENY",
		"override_possible":  false,
		"funds_moved":        "0.00 USDC",
		"enforced_invariant": "INV-186 (raw hex recipient prohibited) & INV-146 (unauthorized recipient substitution blocked)",
	}

	e.summary = FlagshipMissionSummary{
		MissionID:          e.missionID,
		Name:               "Autonomous Market Intelligence",
		Objective:          "Produce a high-confidence market intelligence report using autonomous agents while staying within a strict economic policy.",
		BudgetCapUSDC:      25.00,
		AuthorizedUSDC:     8.50,
		BlockedUSDC:        3.60,
		RemainingUSDC:      16.50,
		Mode:               "SIMULATION",
		ModeNotice:         "SIMULATION — NO FUNDS MOVED",
		Seed:               e.seed,
		CurrentState:       StateCreated,
		CurrentStepIndex:   0,
		TotalSteps:         len(events),
		IsPaused:           false,
		IsCompleted:        false,
		AgentsCount:        5,
		SecurityViolations: 1,
		RecoveredFailures:  1,
		ArcSettlement: map[string]interface{}{
			"network":                "Arc Mainnet",
			"chain_id":               5042,
			"agent_vault_deployment": "UNDEPLOYED",
			"live_execution":         "DISABLED",
			"broadcast":              "NONE",
			"real_settlements":       0,
			"statement":              "SIMULATION — NO FUNDS MOVED",
		},
		Events:    events[:1],
		Providers: providers,
		ClearingSummary: struct {
			TotalAuthorized  float64              `json:"total_authorized_usdc"`
			TotalBlocked     float64              `json:"total_blocked_usdc"`
			SimulatedSettled float64              `json:"simulated_settled_usdc"`
			Obligations      []ClearingObligation `json:"obligations"`
		}{
			TotalAuthorized:  8.50,
			TotalBlocked:     3.60,
			SimulatedSettled: 8.50,
			Obligations:      obligations,
		},
		EconomicTrace:     econTrace,
		AITrace:           aiTrace,
		AuthorityTrace:    authTrace,
		WhyExplanation:    why,
		WhyNotExplanation: whyNot,
	}
}

// ComputeDeterministicChecksum computes a SHA-256 hash of the entire event sequence to verify determinism.
func (e *MissionReplayEngine) ComputeDeterministicChecksum() string {
	e.mu.RLock()
	defer e.mu.RUnlock()

	raw, err := json.Marshal(e.allEvents)
	if err != nil {
		return ""
	}
	hash := sha256.Sum256(raw)
	return hex.EncodeToString(hash[:])
}

// ExportJSON exports the full mission trace as a serialized JSON string.
func (e *MissionReplayEngine) ExportJSON() (string, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	data := map[string]interface{}{
		"export_type":      "AGENTPAY_FLAGSHIP_MISSION_TRACE",
		"export_version":   "2.0",
		"timestamp":        time.Now().UTC().Format(time.RFC3339),
		"seed":             e.seed,
		"thesis":           "AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.",
		"secondary_thesis": "AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.",
		"mission_summary":  e.summary,
		"all_events":       e.allEvents,
		"checksum_sha256":  e.ComputeDeterministicChecksum(),
	}

	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to export trace: %w", err)
	}
	return string(bytes), nil
}
