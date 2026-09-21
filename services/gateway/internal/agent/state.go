package agent

import (
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
)

// AgentState represents explicit lifecycle states of the reference autonomous agent.
type AgentState string

const (
	StateIdle                AgentState = "IDLE"
	StateThinking            AgentState = "THINKING"
	StateDiscoveringServices AgentState = "DISCOVERING_SERVICES"
	StateNeedsService        AgentState = "NEEDS_SERVICE"
	StatePaymentRequested    AgentState = "PAYMENT_REQUESTED"
	StateWaitingForPayment   AgentState = "WAITING_FOR_PAYMENT"
	StateWaitingForApproval  AgentState = "WAITING_FOR_APPROVAL"
	StateExecuting           AgentState = "EXECUTING"
	StateContinuing          AgentState = "CONTINUING"
	StateCompleted           AgentState = "COMPLETED"
	StateFailed              AgentState = "FAILED"
)

// AgentStepRecord captures an immutable record of an individual tool call or decision.
type AgentStepRecord struct {
	StepIndex   int        `json:"step_index"`
	State       AgentState `json:"state"`
	ToolName    string     `json:"tool_name,omitempty"`
	Description string     `json:"description"`
	Input       string     `json:"input,omitempty"`
	Output      string     `json:"output,omitempty"`
	Timestamp   time.Time  `json:"timestamp"`
	DurationMs  int64      `json:"duration_ms"`
}

// AgentTaskExecutionResult holds the comprehensive result of an autonomous agent run.
type AgentTaskExecutionResult struct {
	TaskID          string               `json:"task_id"`
	AgentID         string               `json:"agent_id"`
	State           AgentState           `json:"state"`
	Task            string               `json:"task"`
	Steps           []AgentStepRecord    `json:"steps"`
	PaymentIntentID string               `json:"payment_intent_id,omitempty"`
	PaymentIntent   *intent.PaymentIntent `json:"payment_intent,omitempty"`
	ServiceUsed     string                `json:"service_used,omitempty"`
	ExternalData    string                `json:"external_data,omitempty"`
	FinalReport     string                `json:"final_report,omitempty"`
	BudgetRemaining string                `json:"budget_remaining,omitempty"`
	Decisions       []EconomicDecisionLog `json:"decisions,omitempty"`
	Error           string                `json:"error,omitempty"`
	StartedAt       time.Time             `json:"started_at"`
	CompletedAt     *time.Time            `json:"completed_at,omitempty"`
}
