package domain

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

// EventType represents the canonical event type identifier.
type EventType string

// Canonical Event Taxonomy
const (
	EventPaymentIntentCreated          EventType = "payment_intent.created"
	EventPaymentIntentAuthorized       EventType = "payment_intent.authorized"
	EventPaymentIntentDenied           EventType = "payment_intent.denied"
	EventPaymentIntentApprovalRequired EventType = "payment_intent.approval_required"
	EventPaymentIntentExecuting        EventType = "payment_intent.executing"
	EventPaymentIntentAmbiguous        EventType = "payment_intent.ambiguous"
	EventPaymentIntentConfirmed        EventType = "payment_intent.confirmed"
	EventPaymentIntentFailed           EventType = "payment_intent.failed"
	EventApprovalCreated               EventType = "approval.created"
	EventApprovalApproved              EventType = "approval.approved"
	EventApprovalRejected              EventType = "approval.rejected"
	EventTreasuryReserved              EventType = "treasury.reserved"
	EventTreasuryReleased              EventType = "treasury.released"
	EventTreasurySettled               EventType = "treasury.settled"
	EventAgentPaused                   EventType = "agent.paused"
	EventAgentResumed                  EventType = "agent.resumed"
	EventAPIKeyCreated                 EventType = "api_key.created"
	EventAPIKeyRevoked                 EventType = "api_key.revoked"
	EventTestPing                      EventType = "test.ping"
	// Agent-to-Agent (A2A) Canonical Events
	EventAgentDiscovered        EventType = "agent.discovered"
	EventQuoteRequested         EventType = "quote.requested"
	EventQuoteOffered           EventType = "quote.offered"
	EventQuoteCountered         EventType = "quote.countered"
	EventQuoteAccepted          EventType = "quote.accepted"
	EventQuoteExpired           EventType = "quote.expired"
	EventHireCreated            EventType = "hire.created"
	EventHireAccepted           EventType = "hire.accepted"
	EventHireExecuting          EventType = "hire.executing"
	EventHireResultReceived     EventType = "hire.result_received"
	EventHireCompleted          EventType = "hire.completed"
	EventHireFailed             EventType = "hire.failed"
	EventAgentPaymentAuthorized EventType = "agent.payment.authorized"
	// Intelligence Layer & Adaptive Replanning Events
	EventIntelligenceObservationCreated    EventType = "intelligence.observation_created"
	EventIntelligenceOutcomeEvaluated      EventType = "intelligence.outcome_evaluated"
	EventIntelligenceAnomalyDetected       EventType = "intelligence.anomaly_detected"
	EventIntelligenceRecommendationCreated EventType = "intelligence.recommendation_created"
	EventMissionReplanProposed             EventType = "mission.replan_proposed"
	EventMissionReplanAccepted             EventType = "mission.replan_accepted"
	EventMissionRecoveryStarted            EventType = "mission.recovery_started"
	EventMissionRecoveryCompleted          EventType = "mission.recovery_completed"
	EventMissionRecoveryFailed             EventType = "mission.recovery_failed"
)

// DomainEvent represents a versioned, immutable, and correlated event envelope.
type DomainEvent struct {
	ID              string                 `json:"id"`
	Type            EventType              `json:"type"`
	Version         int                    `json:"version"`
	OccurredAt      time.Time              `json:"occurred_at"`
	OrganizationID  string                 `json:"organization_id"`
	ActorType       string                 `json:"actor_type"`
	ActorID         string                 `json:"actor_id"`
	AgentID         string                 `json:"agent_id,omitempty"`
	PaymentIntentID string                 `json:"payment_intent_id,omitempty"`
	ExecutionID     string                 `json:"execution_id,omitempty"`
	ApprovalID      string                 `json:"approval_id,omitempty"`
	TransactionID   string                 `json:"transaction_id,omitempty"`
	RequestID       string                 `json:"request_id"`
	CorrelationID   string                 `json:"correlation_id"`
	CausationID     string                 `json:"causation_id,omitempty"`
	Data            map[string]interface{} `json:"data"`
}

// GenerateEventID produces a random event identifier with "evt_" prefix.
func GenerateEventID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return fmt.Sprintf("evt_%s", hex.EncodeToString(b))
}

// NewDomainEvent constructs a new canonical DomainEvent with default version and timestamp.
func NewDomainEvent(
	eventType EventType,
	orgID string,
	actorType string,
	actorID string,
	requestID string,
	correlationID string,
	data map[string]interface{},
) *DomainEvent {
	if orgID == "" {
		orgID = "org_default"
	}
	if correlationID == "" {
		correlationID = requestID
	}
	if data == nil {
		data = make(map[string]interface{})
	}

	return &DomainEvent{
		ID:             GenerateEventID(),
		Type:           eventType,
		Version:        1,
		OccurredAt:     time.Now().UTC(),
		OrganizationID: orgID,
		ActorType:      actorType,
		ActorID:        actorID,
		RequestID:      requestID,
		CorrelationID:  correlationID,
		Data:           data,
	}
}
