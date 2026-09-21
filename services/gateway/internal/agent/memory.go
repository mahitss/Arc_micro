package agent

import (
	"math/big"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

// EconomicDecisionLog records a single cost-aware decision made by the agent.
type EconomicDecisionLog struct {
	TaskContext         string   `json:"task_context"`
	RequiredCapability  string   `json:"required_capability"`
	Candidates          []string `json:"candidates"`
	SelectedServiceID   string   `json:"selected_service_id"`
	SelectedQuoteID     string   `json:"selected_quote_id,omitempty"`
	CostBaseUnits       string   `json:"cost_base_units"`
	BudgetBefore        string   `json:"budget_before"`
	BudgetAfter         string   `json:"budget_after"`
	DecisionExplanation string   `json:"decision_explanation"`
	Timestamp           time.Time `json:"timestamp"`
}

// TaskEconomicMemory captures bounded, in-memory economic state for a single autonomous task run.
type TaskEconomicMemory struct {
	mu                      sync.RWMutex
	TaskID                  string                 `json:"task_id"`
	AgentID                 string                 `json:"agent_id"`
	InitialBudget           *big.Int               `json:"initial_budget"`
	ServicesConsidered      []DiscoveredService    `json:"services_considered"`
	QuotesReceived          []*registry.Quote      `json:"quotes_received"`
	SelectedServices        []string               `json:"selected_services"`
	TotalSpent              *big.Int               `json:"total_spent"`
	PaymentAttempts         []string               `json:"payment_attempts"` // IntentIDs
	FailedPayments          []string               `json:"failed_payments"`
	CompletedServiceResults []UntrustedExternalData `json:"completed_service_results"`
	Decisions               []EconomicDecisionLog  `json:"decisions"`
}

// NewTaskEconomicMemory initializes memory for a task.
func NewTaskEconomicMemory(taskID, agentID string, initialBudget *big.Int) *TaskEconomicMemory {
	initB := big.NewInt(0)
	if initialBudget != nil {
		initB.Set(initialBudget)
	}
	return &TaskEconomicMemory{
		TaskID:                  taskID,
		AgentID:                 agentID,
		InitialBudget:           initB,
		ServicesConsidered:      make([]DiscoveredService, 0),
		QuotesReceived:          make([]*registry.Quote, 0),
		SelectedServices:        make([]string, 0),
		TotalSpent:              big.NewInt(0),
		PaymentAttempts:         make([]string, 0),
		FailedPayments:          make([]string, 0),
		CompletedServiceResults: make([]UntrustedExternalData, 0),
		Decisions:               make([]EconomicDecisionLog, 0),
	}
}

// RecordDiscovered adds discovered services to memory.
func (m *TaskEconomicMemory) RecordDiscovered(services []DiscoveredService) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ServicesConsidered = append(m.ServicesConsidered, services...)
}

// RecordQuote logs a received quote.
func (m *TaskEconomicMemory) RecordQuote(q *registry.Quote) {
	if q == nil {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.QuotesReceived = append(m.QuotesReceived, q)
}

// RecordDecision logs an economic choice.
func (m *TaskEconomicMemory) RecordDecision(d EconomicDecisionLog) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Decisions = append(m.Decisions, d)
	m.SelectedServices = append(m.SelectedServices, d.SelectedServiceID)
}

// RecordPaymentOutcome updates spending or failure history.
func (m *TaskEconomicMemory) RecordPaymentOutcome(intentID string, amount *big.Int, success bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.PaymentAttempts = append(m.PaymentAttempts, intentID)
	if success && amount != nil {
		m.TotalSpent.Add(m.TotalSpent, amount)
	} else if !success {
		m.FailedPayments = append(m.FailedPayments, intentID)
	}
}

// RecordResult stores untrusted external data retrieved.
func (m *TaskEconomicMemory) RecordResult(res UntrustedExternalData) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.CompletedServiceResults = append(m.CompletedServiceResults, res)
}
