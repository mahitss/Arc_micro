package storage

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/economy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/webhook"
)

var (
	ErrNotFound      = errors.New("record not found")
	ErrAlreadyExists = errors.New("record already exists")
)

// Organization represents a tenant boundary.
type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Agent represents an autonomous virtual economic actor.
type Agent struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	PolicyID       string    `json:"policy_id,omitempty"`
	VaultAddress   string    `json:"vault_address,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Policy defines spending rules persisted for an agent/org.
type Policy struct {
	ID                    string    `json:"id"`
	OrganizationID        string    `json:"organization_id"`
	AgentID               string    `json:"agent_id"`
	Enabled               bool      `json:"enabled"`
	PerTransactionLimit   string    `json:"per_transaction_limit"`
	DailyLimit            string    `json:"daily_limit"`
	MaxTransactionsPerDay int       `json:"max_transactions_per_day"`
	ApprovalThreshold     string    `json:"approval_threshold"`
	AllowedAssets         string    `json:"allowed_assets"`
	AllowedRecipients     string    `json:"allowed_recipients,omitempty"`
	BlockedRecipients     string    `json:"blocked_recipients,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// Approval represents a human authorization record.
type Approval struct {
	ID              string     `json:"id"`
	OrganizationID  string     `json:"organization_id"`
	PaymentIntentID string     `json:"payment_intent_id"`
	Required        bool       `json:"required"`
	Status          string     `json:"status"` // "PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED"
	RequestedAt     time.Time  `json:"requested_at"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty"`
	ApprovedBy      string     `json:"approved_by,omitempty"`
	RejectionReason string     `json:"rejection_reason,omitempty"`
	ExpiresAt       time.Time  `json:"expires_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

// TreasuryReservation represents an off-chain application-level lock on available vault funds.
type TreasuryReservation struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	VaultAddress   string    `json:"vault_address"`
	IntentID       string    `json:"intent_id"`
	Amount         string    `json:"amount"` // micro-USDC integer string
	Status         string    `json:"status"` // "RESERVED", "SETTLED", "RELEASED"
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// SystemState tracks operational runtime flags such as the global execution kill switch.
type SystemState struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"` // e.g. "ACTIVE", "PAUSED"
	UpdatedBy string    `json:"updated_by"`
	UpdatedAt time.Time `json:"updated_at"`
}

// AuditEvent represents an append-only audit record.
type AuditEvent struct {
	ID              string    `json:"id"`
	OrganizationID  string    `json:"organization_id"`
	EventType       string    `json:"event_type"`
	ActorType       string    `json:"actor_type"`
	ActorID         string    `json:"actor_id"`
	ResourceType    string    `json:"resource_type"`
	ResourceID      string    `json:"resource_id"`
	RequestID       string    `json:"request_id"`
	CorrelationID   string    `json:"correlation_id,omitempty"`
	CausationID     string    `json:"causation_id,omitempty"`
	AgentID         string    `json:"agent_id,omitempty"`
	PaymentIntentID string    `json:"payment_intent_id,omitempty"`
	ExecutionID     string    `json:"execution_id,omitempty"`
	ApprovalID      string    `json:"approval_id,omitempty"`
	Version         int       `json:"version,omitempty"`
	Timestamp       time.Time `json:"timestamp"`
	Metadata        string    `json:"metadata"`
}

// APIKey represents an authorized developer platform credential in storage.
type APIKey struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	KeyHash        string     `json:"key_hash"`
	Name           string     `json:"name"`
	MaskedKey      string     `json:"masked_key"`
	Scopes         string     `json:"scopes"` // Comma-separated
	Status         string     `json:"status"` // "ACTIVE", "REVOKED"
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// Repository defines storage operations for the AgentPay domain.
type Repository interface {
	// Organization operations
	SaveOrganization(ctx context.Context, o *Organization) error
	GetOrganization(ctx context.Context, id string) (*Organization, error)
	GetOrganizationStatus(ctx context.Context, id string) (string, error)
	ListOrganizations(ctx context.Context) ([]*Organization, error)

	// Agent operations
	SaveAgent(ctx context.Context, a *Agent) error
	GetAgent(ctx context.Context, id string) (*Agent, error)
	GetAgentStatus(ctx context.Context, id string) (string, error)
	ListAgents(ctx context.Context) ([]*Agent, error)

	// Service operations
	SaveService(ctx context.Context, s *registry.Service) error
	GetService(ctx context.Context, id string) (*registry.Service, error)
	ListServices(ctx context.Context) ([]*registry.Service, error)

	// Policy operations
	SavePolicy(ctx context.Context, p *Policy) error
	GetPolicy(ctx context.Context, id string) (*Policy, error)
	GetPolicyByAgent(ctx context.Context, orgID, agentID string) (*Policy, error)

	// PaymentIntent operations
	SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error
	GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error)
	GetIntentByRequestID(ctx context.Context, orgID, requestID string) (*intent.PaymentIntent, error)
	ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error)
	UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error
	CompareAndSwapIntentStatus(ctx context.Context, id string, expectedStatus intent.IntentStatus, newStatus intent.IntentStatus, updatedAt time.Time) (bool, error)

	// PaymentExecution operations
	SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error
	GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error)
	ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error)

	// Approval operations
	SaveApproval(ctx context.Context, app *Approval) error
	GetApproval(ctx context.Context, id string) (*Approval, error)
	GetApprovalByIntent(ctx context.Context, intentID string) (*Approval, error)
	ListApprovals(ctx context.Context, orgID string) ([]*Approval, error)
	UpdateApprovalStatus(ctx context.Context, id string, status string, approver string, reason string, resolvedAt time.Time) error
	CompareAndSwapApprovalStatus(ctx context.Context, id string, expectedStatus string, newStatus string, approver string, reason string, resolvedAt time.Time) (bool, error)

	// Treasury Reservation operations
	CreateReservation(ctx context.Context, res *TreasuryReservation) error
	GetReservationByIntent(ctx context.Context, intentID string) (*TreasuryReservation, error)
	UpdateReservationStatus(ctx context.Context, id string, status string, updatedAt time.Time) error
	GetTotalReservedAmount(ctx context.Context, organizationID string, vaultAddress string) (uint64, error)

	// SystemState operations (Global execution kill switch)
	GetSystemState(ctx context.Context, key string) (string, error)
	SetSystemState(ctx context.Context, key string, value string, updatedBy string, updatedAt time.Time) error

	// AuditEvent operations (Append-only)
	// AuditEvent operations (Append-only)
	SaveAuditEvent(ctx context.Context, evt *AuditEvent) error
	GetAuditEvent(ctx context.Context, id, orgID string) (*AuditEvent, error)
	ListAuditEvents(ctx context.Context, orgID string) ([]*AuditEvent, error)
	ListAuditEventsWithFilter(ctx context.Context, orgID, eventType, paymentIntentID, agentID string, limit int) ([]*AuditEvent, error)

	// APIKey operations (Day 5)
	SaveAPIKey(ctx context.Context, key *APIKey) error
	GetAPIKeyByHash(ctx context.Context, hash string) (*APIKey, error)
	ListAPIKeys(ctx context.Context, orgID string) ([]*APIKey, error)
	RevokeAPIKey(ctx context.Context, id, orgID string, revokedAt time.Time) error
	UpdateAPIKeyLastUsed(ctx context.Context, id string, lastUsed time.Time) error

	// Webhook Endpoint operations (Day 6)
	SaveWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error
	GetWebhookEndpoint(ctx context.Context, id, orgID string) (*webhook.WebhookEndpoint, error)
	ListWebhookEndpoints(ctx context.Context, orgID string) ([]*webhook.WebhookEndpoint, error)
	UpdateWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error
	DeleteWebhookEndpoint(ctx context.Context, id, orgID string) error
	UpdateWebhookEndpointStatus(ctx context.Context, id, orgID string, failureCount int, lastDelivery time.Time) error

	// Webhook Delivery operations (Day 6)
	SaveWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error
	GetWebhookDelivery(ctx context.Context, id, orgID string) (*webhook.WebhookDelivery, error)
	ListWebhookDeliveries(ctx context.Context, endpointID, orgID string, limit int) ([]*webhook.WebhookDelivery, error)
	UpdateWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error

	// Outbox & Event operations (Day 6)
	SaveOutboxEvent(ctx context.Context, outbox *webhook.OutboxEvent) error
	GetPendingOutboxEvents(ctx context.Context, limit int) ([]*webhook.OutboxEvent, error)
	MarkOutboxEventProcessed(ctx context.Context, id string, processedAt time.Time) error
	SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error

	// Mission & Autonomous Economy operations (Day 11)
	SaveMission(ctx context.Context, m *economy.Mission) error
	GetMission(ctx context.Context, id string) (*economy.Mission, error)
	ListMissions(ctx context.Context, orgID string) ([]*economy.Mission, error)
	UpdateMissionStatus(ctx context.Context, id string, status economy.MissionStatus, updatedAt time.Time) error
	UpdateMissionBudget(ctx context.Context, id string, spent, remaining string, updatedAt time.Time) error
	SaveMissionStep(ctx context.Context, step *economy.MissionStep) error
	GetMissionStep(ctx context.Context, missionID, stepID string) (*economy.MissionStep, error)
	ListMissionSteps(ctx context.Context, missionID string) ([]*economy.MissionStep, error)
	UpdateMissionStep(ctx context.Context, step *economy.MissionStep) error
}

// MemoryRepository provides a thread-safe in-memory implementation of Repository.
type MemoryRepository struct {
	mu            sync.RWMutex
	organizations map[string]*Organization
	agents        map[string]*Agent
	services      map[string]*registry.Service
	policies      map[string]*Policy
	intents       map[string]*intent.PaymentIntent
	executions    map[string]*intent.PaymentExecutionRecord
	approvals     map[string]*Approval
	reservations  map[string]*TreasuryReservation
	systemStates      map[string]*SystemState
	auditEvents       []*AuditEvent
	apiKeys           map[string]*APIKey
	webhookEndpoints  map[string]*webhook.WebhookEndpoint
	webhookDeliveries map[string]*webhook.WebhookDelivery
	outboxEvents      map[string]*webhook.OutboxEvent
	missions          map[string]*economy.Mission
	missionSteps      map[string]map[string]*economy.MissionStep
}

// NewMemoryRepository creates a new in-memory repository instance seeded with defaults.
func NewMemoryRepository() *MemoryRepository {
	now := time.Now()
	repo := &MemoryRepository{
		organizations:     make(map[string]*Organization),
		agents:            make(map[string]*Agent),
		services:          make(map[string]*registry.Service),
		policies:          make(map[string]*Policy),
		intents:           make(map[string]*intent.PaymentIntent),
		executions:        make(map[string]*intent.PaymentExecutionRecord),
		approvals:         make(map[string]*Approval),
		reservations:      make(map[string]*TreasuryReservation),
		systemStates:      make(map[string]*SystemState),
		auditEvents:       make([]*AuditEvent, 0),
		apiKeys:           make(map[string]*APIKey),
		webhookEndpoints:  make(map[string]*webhook.WebhookEndpoint),
		webhookDeliveries: make(map[string]*webhook.WebhookDelivery),
		outboxEvents:      make(map[string]*webhook.OutboxEvent),
		missions:          make(map[string]*economy.Mission),
		missionSteps:      make(map[string]map[string]*economy.MissionStep),
	}

	// Seed default demo API key (apk_live_demo1234567890abcdef1234567890abcdef)
	demoSecret := "apk_live_demo1234567890abcdef1234567890abcdef"
	demoHashBytes := sha256.Sum256([]byte(demoSecret))
	demoHash := hex.EncodeToString(demoHashBytes[:])
	repo.apiKeys["key_default_demo"] = &APIKey{
		ID:             "key_default_demo",
		OrganizationID: "org_default",
		KeyHash:        demoHash,
		Name:           "Default Developer Key",
		MaskedKey:      "apk_live_...cdef",
		Scopes:         "payments:read,payments:create,payments:approve,agents:read,services:read,treasury:read",
		Status:         "ACTIVE",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Seed global execution state as ACTIVE
	repo.systemStates["global_execution"] = &SystemState{
		Key:       "global_execution",
		Value:     "ACTIVE",
		UpdatedBy: "system",
		UpdatedAt: now,
	}

	// Seed default organization
	repo.organizations["org_default"] = &Organization{
		ID:        "org_default",
		Name:      "Default Organization",
		Status:    "ACTIVE",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Seed default policy for research-agent
	repo.policies["pol_research_default"] = &Policy{
		ID:                    "pol_research_default",
		OrganizationID:        "org_default",
		AgentID:               "research-agent",
		Enabled:               true,
		PerTransactionLimit:   "500000",  // 0.50 USDC
		DailyLimit:            "5000000", // 5.00 USDC
		MaxTransactionsPerDay: 20,
		ApprovalThreshold:     "1000000", // 1.00 USDC
		AllowedAssets:         "USDC",
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	// Seed default research-agent
	repo.agents["research-agent"] = &Agent{
		ID:             "research-agent",
		OrganizationID: "org_default",
		Name:           "Arc Research Agent",
		Description:    "Autonomous intelligence and data retrieval agent",
		Status:         "ACTIVE",
		PolicyID:       "pol_research_default",
		VaultAddress:   "0x1111111111111111111111111111111111111111",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Seed default approved services
	repo.services["web-research"] = &registry.Service{
		ID:        "web-research",
		Name:      "Web Research & Intelligence API",
		Recipient: "0x1111111111111111111111111111111111111111",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "500000",
	}
	repo.services["compute-cluster"] = &registry.Service{
		ID:        "compute-cluster",
		Name:      "GPU Inference Compute Cluster",
		Recipient: "0x2222222222222222222222222222222222222222",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "2000000",
	}
	repo.services["data-feed"] = &registry.Service{
		ID:        "data-feed",
		Name:      "Real-time Financial Data Feed",
		Recipient: "0x3333333333333333333333333333333333333333",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "100000",
	}
	repo.services["archived-service"] = &registry.Service{
		ID:        "archived-service",
		Name:      "Deprecated Legacy Data Service",
		Recipient: "0x4444444444444444444444444444444444444444",
		Asset:     "USDC",
		Enabled:   false,
		MaxPrice:  "100000",
	}

	return repo
}

// --- Organization Methods ---

func (m *MemoryRepository) SaveOrganization(ctx context.Context, o *Organization) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyO := *o
	m.organizations[o.ID] = &copyO
	return nil
}

func (m *MemoryRepository) GetOrganization(ctx context.Context, id string) (*Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	o, ok := m.organizations[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyO := *o
	return &copyO, nil
}

func (m *MemoryRepository) GetOrganizationStatus(ctx context.Context, id string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	o, ok := m.organizations[id]
	if !ok {
		return "ACTIVE", nil
	}
	return o.Status, nil
}

func (m *MemoryRepository) ListOrganizations(ctx context.Context) ([]*Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*Organization, 0, len(m.organizations))
	for _, o := range m.organizations {
		copyO := *o
		res = append(res, &copyO)
	}
	return res, nil
}

// --- Agent Methods ---

func (m *MemoryRepository) SaveAgent(ctx context.Context, a *Agent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyA := *a
	if copyA.OrganizationID == "" {
		copyA.OrganizationID = "org_default"
	}
	m.agents[a.ID] = &copyA
	return nil
}

func (m *MemoryRepository) GetAgent(ctx context.Context, id string) (*Agent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.agents[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyA := *a
	return &copyA, nil
}

func (m *MemoryRepository) GetAgentStatus(ctx context.Context, id string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	a, ok := m.agents[id]
	if !ok {
		return "", ErrNotFound
	}
	return a.Status, nil
}

func (m *MemoryRepository) ListAgents(ctx context.Context) ([]*Agent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*Agent, 0, len(m.agents))
	for _, a := range m.agents {
		copyA := *a
		res = append(res, &copyA)
	}
	return res, nil
}

// --- Service Methods ---

func (m *MemoryRepository) SaveService(ctx context.Context, s *registry.Service) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyS := *s
	m.services[s.ID] = &copyS
	return nil
}

func (m *MemoryRepository) GetService(ctx context.Context, id string) (*registry.Service, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.services[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyS := *s
	return &copyS, nil
}

func (m *MemoryRepository) ListServices(ctx context.Context) ([]*registry.Service, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*registry.Service, 0, len(m.services))
	for _, s := range m.services {
		copyS := *s
		res = append(res, &copyS)
	}
	return res, nil
}

// --- Policy Methods ---

func (m *MemoryRepository) SavePolicy(ctx context.Context, p *Policy) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyP := *p
	if copyP.OrganizationID == "" {
		copyP.OrganizationID = "org_default"
	}
	m.policies[p.ID] = &copyP
	return nil
}

func (m *MemoryRepository) GetPolicy(ctx context.Context, id string) (*Policy, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.policies[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyP := *p
	return &copyP, nil
}

func (m *MemoryRepository) GetPolicyByAgent(ctx context.Context, orgID, agentID string) (*Policy, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.policies {
		if (orgID == "" || p.OrganizationID == orgID) && p.AgentID == agentID {
			copyP := *p
			return &copyP, nil
		}
	}
	return nil, ErrNotFound
}

// --- PaymentIntent Methods ---

func (m *MemoryRepository) SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.intents[pi.IntentID]; exists {
		return ErrAlreadyExists
	}
	copyPI := *pi
	if copyPI.OrganizationID == "" {
		copyPI.OrganizationID = "org_default"
	}
	if copyPI.RequestID != "" {
		for _, existing := range m.intents {
			if existing.OrganizationID == copyPI.OrganizationID && existing.RequestID == copyPI.RequestID {
				return ErrAlreadyExists
			}
		}
	}
	m.intents[pi.IntentID] = &copyPI
	return nil
}

func (m *MemoryRepository) GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pi, ok := m.intents[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyPI := *pi
	return &copyPI, nil
}

func (m *MemoryRepository) GetIntentByRequestID(ctx context.Context, orgID, requestID string) (*intent.PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if requestID == "" {
		return nil, ErrNotFound
	}
	for _, pi := range m.intents {
		if (orgID == "" || pi.OrganizationID == orgID) && pi.RequestID == requestID {
			copyPI := *pi
			return &copyPI, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*intent.PaymentIntent, 0, len(m.intents))
	for _, pi := range m.intents {
		copyPI := *pi
		res = append(res, &copyPI)
	}
	return res, nil
}

func (m *MemoryRepository) UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	pi, ok := m.intents[id]
	if !ok {
		return ErrNotFound
	}
	pi.Status = status
	pi.UpdatedAt = updatedAt
	return nil
}

func (m *MemoryRepository) CompareAndSwapIntentStatus(ctx context.Context, id string, expectedStatus intent.IntentStatus, newStatus intent.IntentStatus, updatedAt time.Time) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	pi, ok := m.intents[id]
	if !ok {
		return false, ErrNotFound
	}
	if pi.Status != expectedStatus {
		return false, nil
	}
	pi.Status = newStatus
	pi.UpdatedAt = updatedAt
	return true, nil
}

// --- PaymentExecution Methods ---

func (m *MemoryRepository) SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyEx := *ex
	m.executions[ex.IntentID] = &copyEx
	return nil
}

func (m *MemoryRepository) GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ex, ok := m.executions[intentID]
	if !ok {
		return nil, ErrNotFound
	}
	copyEx := *ex
	return &copyEx, nil
}

func (m *MemoryRepository) ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*intent.PaymentExecutionRecord, 0, len(m.executions))
	for _, ex := range m.executions {
		copyEx := *ex
		res = append(res, &copyEx)
	}
	return res, nil
}

// --- Approval Methods ---

func (m *MemoryRepository) SaveApproval(ctx context.Context, app *Approval) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyApp := *app
	if copyApp.OrganizationID == "" {
		copyApp.OrganizationID = "org_default"
	}
	m.approvals[app.ID] = &copyApp
	return nil
}

func (m *MemoryRepository) GetApproval(ctx context.Context, id string) (*Approval, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	app, ok := m.approvals[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyApp := *app
	return &copyApp, nil
}

func (m *MemoryRepository) GetApprovalByIntent(ctx context.Context, intentID string) (*Approval, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, app := range m.approvals {
		if app.PaymentIntentID == intentID {
			copyApp := *app
			return &copyApp, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) ListApprovals(ctx context.Context, orgID string) ([]*Approval, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*Approval, 0, len(m.approvals))
	for _, app := range m.approvals {
		if orgID == "" || app.OrganizationID == orgID {
			copyApp := *app
			res = append(res, &copyApp)
		}
	}
	return res, nil
}

func (m *MemoryRepository) UpdateApprovalStatus(ctx context.Context, id string, status string, approver string, reason string, resolvedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	app, ok := m.approvals[id]
	if !ok {
		return ErrNotFound
	}
	app.Status = status
	app.ApprovedBy = approver
	app.RejectionReason = reason
	app.ResolvedAt = &resolvedAt
	return nil
}

func (m *MemoryRepository) CompareAndSwapApprovalStatus(ctx context.Context, id string, expectedStatus string, newStatus string, approver string, reason string, resolvedAt time.Time) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	app, ok := m.approvals[id]
	if !ok {
		return false, ErrNotFound
	}
	if app.Status != expectedStatus {
		return false, nil
	}
	app.Status = newStatus
	app.ApprovedBy = approver
	app.RejectionReason = reason
	app.ResolvedAt = &resolvedAt
	return true, nil
}

// --- Treasury Reservation Methods ---

func (m *MemoryRepository) CreateReservation(ctx context.Context, res *TreasuryReservation) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.reservations {
		if existing.IntentID == res.IntentID {
			*res = *existing
			return nil
		}
	}
	copyRes := *res
	if copyRes.OrganizationID == "" {
		copyRes.OrganizationID = "org_default"
	}
	m.reservations[res.ID] = &copyRes
	return nil
}

func (m *MemoryRepository) GetReservationByIntent(ctx context.Context, intentID string) (*TreasuryReservation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, r := range m.reservations {
		if r.IntentID == intentID {
			copyRes := *r
			return &copyRes, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) UpdateReservationStatus(ctx context.Context, id string, status string, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	res, ok := m.reservations[id]
	if !ok {
		return ErrNotFound
	}
	res.Status = status
	res.UpdatedAt = updatedAt
	return nil
}

func (m *MemoryRepository) GetTotalReservedAmount(ctx context.Context, organizationID string, vaultAddress string) (uint64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var total uint64
	for _, r := range m.reservations {
		if (organizationID == "" || r.OrganizationID == organizationID) &&
			(vaultAddress == "" || strings.EqualFold(r.VaultAddress, vaultAddress)) &&
			r.Status == "RESERVED" {
			var amt uint64
			_, _ = fmt.Sscan(r.Amount, &amt)
			total += amt
		}
	}
	return total, nil
}

// --- SystemState Methods ---

func (m *MemoryRepository) GetSystemState(ctx context.Context, key string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	st, ok := m.systemStates[key]
	if !ok {
		return "", ErrNotFound
	}
	return st.Value, nil
}

func (m *MemoryRepository) SetSystemState(ctx context.Context, key string, value string, updatedBy string, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.systemStates[key] = &SystemState{
		Key:       key,
		Value:     value,
		UpdatedBy: updatedBy,
		UpdatedAt: updatedAt,
	}
	return nil
}

// --- AuditEvent Methods (Append-only) ---

func (m *MemoryRepository) SaveAuditEvent(ctx context.Context, evt *AuditEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyEvt := *evt
	if copyEvt.OrganizationID == "" {
		copyEvt.OrganizationID = "org_default"
	}
	m.auditEvents = append(m.auditEvents, &copyEvt)
	return nil
}

func (m *MemoryRepository) GetAuditEvent(ctx context.Context, id, orgID string) (*AuditEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, evt := range m.auditEvents {
		if evt.ID == id && (orgID == "" || evt.OrganizationID == orgID) {
			copyEvt := *evt
			return &copyEvt, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) ListAuditEvents(ctx context.Context, orgID string) ([]*AuditEvent, error) {
	return m.ListAuditEventsWithFilter(ctx, orgID, "", "", "", 500)
}

func (m *MemoryRepository) ListAuditEventsWithFilter(ctx context.Context, orgID, eventType, paymentIntentID, agentID string, limit int) ([]*AuditEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	res := make([]*AuditEvent, 0)
	// Iterate backwards for newest first
	for i := len(m.auditEvents) - 1; i >= 0; i-- {
		evt := m.auditEvents[i]
		if orgID != "" && evt.OrganizationID != orgID {
			continue
		}
		if eventType != "" && evt.EventType != eventType {
			continue
		}
		if paymentIntentID != "" && evt.PaymentIntentID != paymentIntentID {
			continue
		}
		if agentID != "" && evt.AgentID != agentID {
			continue
		}
		copyEvt := *evt
		res = append(res, &copyEvt)
		if len(res) >= limit {
			break
		}
	}
	return res, nil
}

// --- Webhook Endpoint Methods (Day 6) ---

func (m *MemoryRepository) SaveWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyEP := *ep
	if copyEP.OrganizationID == "" {
		copyEP.OrganizationID = "org_default"
	}
	m.webhookEndpoints[ep.ID] = &copyEP
	return nil
}

func (m *MemoryRepository) GetWebhookEndpoint(ctx context.Context, id, orgID string) (*webhook.WebhookEndpoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	ep, ok := m.webhookEndpoints[id]
	if !ok {
		return nil, ErrNotFound
	}
	if orgID != "" && ep.OrganizationID != orgID {
		return nil, ErrNotFound
	}
	copyEP := *ep
	return &copyEP, nil
}

func (m *MemoryRepository) ListWebhookEndpoints(ctx context.Context, orgID string) ([]*webhook.WebhookEndpoint, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*webhook.WebhookEndpoint, 0)
	for _, ep := range m.webhookEndpoints {
		if orgID == "" || ep.OrganizationID == orgID {
			copyEP := *ep
			res = append(res, &copyEP)
		}
	}
	return res, nil
}

func (m *MemoryRepository) UpdateWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	existing, ok := m.webhookEndpoints[ep.ID]
	if !ok {
		return ErrNotFound
	}
	if ep.OrganizationID != "" && existing.OrganizationID != ep.OrganizationID {
		return ErrNotFound
	}
	copyEP := *ep
	m.webhookEndpoints[ep.ID] = &copyEP
	return nil
}

func (m *MemoryRepository) DeleteWebhookEndpoint(ctx context.Context, id, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	ep, ok := m.webhookEndpoints[id]
	if !ok {
		return ErrNotFound
	}
	if orgID != "" && ep.OrganizationID != orgID {
		return ErrNotFound
	}
	delete(m.webhookEndpoints, id)
	return nil
}

func (m *MemoryRepository) UpdateWebhookEndpointStatus(ctx context.Context, id, orgID string, failureCount int, lastDelivery time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	ep, ok := m.webhookEndpoints[id]
	if !ok {
		return ErrNotFound
	}
	if orgID != "" && ep.OrganizationID != orgID {
		return ErrNotFound
	}
	ep.FailureCount = failureCount
	ep.LastDeliveryAt = &lastDelivery
	ep.UpdatedAt = time.Now()
	return nil
}

// --- Webhook Delivery Methods (Day 6) ---

func (m *MemoryRepository) SaveWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyDel := *delivery
	if copyDel.OrganizationID == "" {
		copyDel.OrganizationID = "org_default"
	}
	m.webhookDeliveries[delivery.ID] = &copyDel
	return nil
}

func (m *MemoryRepository) GetWebhookDelivery(ctx context.Context, id, orgID string) (*webhook.WebhookDelivery, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	del, ok := m.webhookDeliveries[id]
	if !ok {
		return nil, ErrNotFound
	}
	if orgID != "" && del.OrganizationID != orgID {
		return nil, ErrNotFound
	}
	copyDel := *del
	return &copyDel, nil
}

func (m *MemoryRepository) ListWebhookDeliveries(ctx context.Context, endpointID, orgID string, limit int) ([]*webhook.WebhookDelivery, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	res := make([]*webhook.WebhookDelivery, 0)
	for _, del := range m.webhookDeliveries {
		if orgID != "" && del.OrganizationID != orgID {
			continue
		}
		if endpointID != "" && del.EndpointID != endpointID {
			continue
		}
		copyDel := *del
		res = append(res, &copyDel)
		if len(res) >= limit {
			break
		}
	}
	return res, nil
}

func (m *MemoryRepository) UpdateWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.webhookDeliveries[delivery.ID]
	if !ok {
		return ErrNotFound
	}
	copyDel := *delivery
	m.webhookDeliveries[delivery.ID] = &copyDel
	return nil
}

// --- Outbox Methods (Day 6) ---

func (m *MemoryRepository) SaveOutboxEvent(ctx context.Context, outbox *webhook.OutboxEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyOut := *outbox
	if copyOut.OrganizationID == "" {
		copyOut.OrganizationID = "org_default"
	}
	m.outboxEvents[outbox.ID] = &copyOut
	return nil
}

func (m *MemoryRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*webhook.OutboxEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	res := make([]*webhook.OutboxEvent, 0)
	for _, ev := range m.outboxEvents {
		if ev.Status == "PENDING" {
			copyEv := *ev
			res = append(res, &copyEv)
			if len(res) >= limit {
				break
			}
		}
	}
	return res, nil
}

func (m *MemoryRepository) MarkOutboxEventProcessed(ctx context.Context, id string, processedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	ev, ok := m.outboxEvents[id]
	if !ok {
		return ErrNotFound
	}
	ev.Status = "PROCESSED"
	ev.ProcessedAt = &processedAt
	return nil
}

func (m *MemoryRepository) SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error {
	payloadBytes, _ := json.Marshal(event.Data)
	now := event.OccurredAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	auditEvt := &AuditEvent{
		ID:              event.ID,
		OrganizationID:  event.OrganizationID,
		EventType:       string(event.Type),
		ActorType:       event.ActorType,
		ActorID:         event.ActorID,
		ResourceType:    "DOMAIN_EVENT",
		ResourceID:      event.ID,
		RequestID:       event.RequestID,
		CorrelationID:   event.CorrelationID,
		CausationID:     event.CausationID,
		AgentID:         event.AgentID,
		PaymentIntentID: event.PaymentIntentID,
		ExecutionID:     event.ExecutionID,
		ApprovalID:      event.ApprovalID,
		Version:         event.Version,
		Timestamp:       now,
		Metadata:        string(payloadBytes),
	}
	_ = m.SaveAuditEvent(ctx, auditEvt)

	outboxPayload, _ := json.Marshal(event)
	outboxEvt := &webhook.OutboxEvent{
		ID:             webhook.GenerateOutboxID(),
		EventID:        event.ID,
		OrganizationID: event.OrganizationID,
		EventType:      string(event.Type),
		Payload:        string(outboxPayload),
		Status:         webhook.OutboxStatusPending,
		CreatedAt:      now,
	}
	return m.SaveOutboxEvent(ctx, outboxEvt)
}

// --- APIKey Methods (Day 5) ---

func (m *MemoryRepository) SaveAPIKey(ctx context.Context, key *APIKey) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyKey := *key
	if copyKey.OrganizationID == "" {
		copyKey.OrganizationID = "org_default"
	}
	m.apiKeys[key.ID] = &copyKey
	return nil
}

func (m *MemoryRepository) GetAPIKeyByHash(ctx context.Context, hash string) (*APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, k := range m.apiKeys {
		if k.KeyHash == hash {
			copyKey := *k
			return &copyKey, nil
		}
	}
	return nil, ErrNotFound
}

func (m *MemoryRepository) ListAPIKeys(ctx context.Context, orgID string) ([]*APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	res := make([]*APIKey, 0)
	for _, k := range m.apiKeys {
		if orgID == "" || k.OrganizationID == orgID {
			copyKey := *k
			res = append(res, &copyKey)
		}
	}
	return res, nil
}

func (m *MemoryRepository) RevokeAPIKey(ctx context.Context, id, orgID string, revokedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k, ok := m.apiKeys[id]
	if !ok {
		return ErrNotFound
	}
	if orgID != "" && k.OrganizationID != orgID {
		return ErrNotFound
	}
	k.Status = "REVOKED"
	k.UpdatedAt = revokedAt
	return nil
}

func (m *MemoryRepository) UpdateAPIKeyLastUsed(ctx context.Context, id string, lastUsed time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k, ok := m.apiKeys[id]
	if !ok {
		return ErrNotFound
	}
	k.LastUsedAt = &lastUsed
	return nil
}

// --- Mission & Autonomous Economy Methods ---

func (m *MemoryRepository) SaveMission(ctx context.Context, msn *economy.Mission) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	copyMsn := *msn
	m.missions[msn.ID] = &copyMsn
	return nil
}

func (m *MemoryRepository) GetMission(ctx context.Context, id string) (*economy.Mission, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	msn, ok := m.missions[id]
	if !ok {
		return nil, ErrNotFound
	}
	copyMsn := *msn
	return &copyMsn, nil
}

func (m *MemoryRepository) ListMissions(ctx context.Context, orgID string) ([]*economy.Mission, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list := make([]*economy.Mission, 0, len(m.missions))
	for _, msn := range m.missions {
		if orgID != "" && msn.OrganizationID != orgID {
			continue
		}
		copyMsn := *msn
		list = append(list, &copyMsn)
	}
	return list, nil
}

func (m *MemoryRepository) UpdateMissionStatus(ctx context.Context, id string, status economy.MissionStatus, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	msn, ok := m.missions[id]
	if !ok {
		return ErrNotFound
	}
	msn.Status = status
	return nil
}

func (m *MemoryRepository) UpdateMissionBudget(ctx context.Context, id string, spent, remaining string, updatedAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	msn, ok := m.missions[id]
	if !ok {
		return ErrNotFound
	}
	msn.Spent = spent
	msn.RemainingBudget = remaining
	return nil
}

func (m *MemoryRepository) SaveMissionStep(ctx context.Context, step *economy.MissionStep) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.missionSteps[step.MissionID]; !ok {
		m.missionSteps[step.MissionID] = make(map[string]*economy.MissionStep)
	}
	copyStep := *step
	m.missionSteps[step.MissionID][step.StepID] = &copyStep
	return nil
}

func (m *MemoryRepository) GetMissionStep(ctx context.Context, missionID, stepID string) (*economy.MissionStep, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	steps, ok := m.missionSteps[missionID]
	if !ok {
		return nil, ErrNotFound
	}
	step, ok := steps[stepID]
	if !ok {
		return nil, ErrNotFound
	}
	copyStep := *step
	return &copyStep, nil
}

func (m *MemoryRepository) ListMissionSteps(ctx context.Context, missionID string) ([]*economy.MissionStep, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	steps, ok := m.missionSteps[missionID]
	if !ok {
		return []*economy.MissionStep{}, nil
	}
	list := make([]*economy.MissionStep, 0, len(steps))
	for _, st := range steps {
		copySt := *st
		list = append(list, &copySt)
	}
	return list, nil
}

func (m *MemoryRepository) UpdateMissionStep(ctx context.Context, step *economy.MissionStep) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	steps, ok := m.missionSteps[step.MissionID]
	if !ok {
		steps = make(map[string]*economy.MissionStep)
		m.missionSteps[step.MissionID] = steps
	}
	copyStep := *step
	steps[step.StepID] = &copyStep
	return nil
}

// =============================================================================
// PostgreSQL Implementation
// =============================================================================

// PostgresRepository implements Repository using a PostgreSQL connection pool.
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// --- Organization Methods ---

func (p *PostgresRepository) SaveOrganization(ctx context.Context, o *Organization) error {
	query := `INSERT INTO organizations (id, name, status, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5)
	          ON CONFLICT (id) DO UPDATE SET name = $2, status = $3, updated_at = $5`
	_, err := p.db.ExecContext(ctx, query, o.ID, o.Name, o.Status, o.CreatedAt, o.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetOrganization(ctx context.Context, id string) (*Organization, error) {
	query := `SELECT id, name, status, created_at, updated_at FROM organizations WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var o Organization
	if err := row.Scan(&o.ID, &o.Name, &o.Status, &o.CreatedAt, &o.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &o, nil
}

func (p *PostgresRepository) GetOrganizationStatus(ctx context.Context, id string) (string, error) {
	query := `SELECT status FROM organizations WHERE id = $1`
	var status string
	err := p.db.QueryRowContext(ctx, query, id).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "ACTIVE", nil
	}
	if err != nil {
		return "", err
	}
	return status, nil
}

func (p *PostgresRepository) ListOrganizations(ctx context.Context) ([]*Organization, error) {
	query := `SELECT id, name, status, created_at, updated_at FROM organizations ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*Organization
	for rows.Next() {
		var o Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Status, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, &o)
	}
	return res, rows.Err()
}

// --- Agent Methods ---

func (p *PostgresRepository) SaveAgent(ctx context.Context, a *Agent) error {
	orgID := a.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO agents (id, organization_id, name, description, status, policy_id, vault_address, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	          ON CONFLICT (id) DO UPDATE SET name = $3, description = $4, status = $5, policy_id = $6, vault_address = $7, updated_at = $9`
	_, err := p.db.ExecContext(ctx, query, a.ID, orgID, a.Name, a.Description, a.Status, a.PolicyID, a.VaultAddress, a.CreatedAt, a.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetAgent(ctx context.Context, id string) (*Agent, error) {
	query := `SELECT id, COALESCE(organization_id, 'org_default'), name, COALESCE(description, ''), status, COALESCE(policy_id, ''), COALESCE(vault_address, ''), created_at, COALESCE(updated_at, created_at)
	          FROM agents WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var a Agent
	if err := row.Scan(&a.ID, &a.OrganizationID, &a.Name, &a.Description, &a.Status, &a.PolicyID, &a.VaultAddress, &a.CreatedAt, &a.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

func (p *PostgresRepository) GetAgentStatus(ctx context.Context, id string) (string, error) {
	a, err := p.GetAgent(ctx, id)
	if err != nil {
		return "", err
	}
	return a.Status, nil
}

func (p *PostgresRepository) ListAgents(ctx context.Context) ([]*Agent, error) {
	query := `SELECT id, COALESCE(organization_id, 'org_default'), name, COALESCE(description, ''), status, COALESCE(policy_id, ''), COALESCE(vault_address, ''), created_at, COALESCE(updated_at, created_at)
	          FROM agents ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*Agent
	for rows.Next() {
		var a Agent
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.Name, &a.Description, &a.Status, &a.PolicyID, &a.VaultAddress, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, &a)
	}
	return res, rows.Err()
}

// --- Service Methods ---

func (p *PostgresRepository) SaveService(ctx context.Context, s *registry.Service) error {
	query := `INSERT INTO services (id, name, recipient, asset, enabled, max_price, fixed_price, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	          ON CONFLICT (id) DO UPDATE SET name = $2, recipient = $3, asset = $4, enabled = $5, max_price = $6, fixed_price = $7`
	_, err := p.db.ExecContext(ctx, query, s.ID, s.Name, s.Recipient, s.Asset, s.Enabled, s.MaxPrice, s.FixedPrice)
	return err
}

func (p *PostgresRepository) GetService(ctx context.Context, id string) (*registry.Service, error) {
	query := `SELECT id, name, recipient, asset, enabled, max_price, COALESCE(fixed_price, '') FROM services WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var s registry.Service
	if err := row.Scan(&s.ID, &s.Name, &s.Recipient, &s.Asset, &s.Enabled, &s.MaxPrice, &s.FixedPrice); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (p *PostgresRepository) ListServices(ctx context.Context) ([]*registry.Service, error) {
	query := `SELECT id, name, recipient, asset, enabled, max_price, COALESCE(fixed_price, '') FROM services ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*registry.Service
	for rows.Next() {
		var s registry.Service
		if err := rows.Scan(&s.ID, &s.Name, &s.Recipient, &s.Asset, &s.Enabled, &s.MaxPrice, &s.FixedPrice); err != nil {
			return nil, err
		}
		res = append(res, &s)
	}
	return res, rows.Err()
}

// --- Policy Methods ---

func (p *PostgresRepository) SavePolicy(ctx context.Context, pol *Policy) error {
	orgID := pol.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO policies (id, organization_id, agent_id, enabled, per_transaction_limit, daily_limit, max_transactions_per_day, approval_threshold, allowed_assets, allowed_recipients, blocked_recipients, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	          ON CONFLICT (id) DO UPDATE SET enabled = $4, per_transaction_limit = $5, daily_limit = $6, max_transactions_per_day = $7, approval_threshold = $8, allowed_assets = $9, allowed_recipients = $10, blocked_recipients = $11, updated_at = $13`
	_, err := p.db.ExecContext(ctx, query, pol.ID, orgID, pol.AgentID, pol.Enabled, pol.PerTransactionLimit, pol.DailyLimit, pol.MaxTransactionsPerDay, pol.ApprovalThreshold, pol.AllowedAssets, pol.AllowedRecipients, pol.BlockedRecipients, pol.CreatedAt, pol.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetPolicy(ctx context.Context, id string) (*Policy, error) {
	query := `SELECT id, organization_id, agent_id, enabled, per_transaction_limit, daily_limit, max_transactions_per_day, approval_threshold, allowed_assets, COALESCE(allowed_recipients, ''), COALESCE(blocked_recipients, ''), created_at, updated_at
	          FROM policies WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var pol Policy
	if err := row.Scan(&pol.ID, &pol.OrganizationID, &pol.AgentID, &pol.Enabled, &pol.PerTransactionLimit, &pol.DailyLimit, &pol.MaxTransactionsPerDay, &pol.ApprovalThreshold, &pol.AllowedAssets, &pol.AllowedRecipients, &pol.BlockedRecipients, &pol.CreatedAt, &pol.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &pol, nil
}

func (p *PostgresRepository) GetPolicyByAgent(ctx context.Context, orgID, agentID string) (*Policy, error) {
	if orgID == "" {
		orgID = "org_default"
	}
	query := `SELECT id, organization_id, agent_id, enabled, per_transaction_limit, daily_limit, max_transactions_per_day, approval_threshold, allowed_assets, COALESCE(allowed_recipients, ''), COALESCE(blocked_recipients, ''), created_at, updated_at
	          FROM policies WHERE organization_id = $1 AND agent_id = $2 LIMIT 1`
	row := p.db.QueryRowContext(ctx, query, orgID, agentID)
	var pol Policy
	if err := row.Scan(&pol.ID, &pol.OrganizationID, &pol.AgentID, &pol.Enabled, &pol.PerTransactionLimit, &pol.DailyLimit, &pol.MaxTransactionsPerDay, &pol.ApprovalThreshold, &pol.AllowedAssets, &pol.AllowedRecipients, &pol.BlockedRecipients, &pol.CreatedAt, &pol.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &pol, nil
}

// --- PaymentIntent Methods ---

func (p *PostgresRepository) SaveIntent(ctx context.Context, pi *intent.PaymentIntent) error {
	orgID := pi.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO payment_intents (id, organization_id, agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, request_id, status, policy_decision, policy_reason, requires_approval, expires_at, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`
	_, err := p.db.ExecContext(ctx, query, pi.IntentID, orgID, pi.AgentID, pi.VaultAddress, pi.ServiceID, pi.Recipient, pi.Amount, pi.Asset, pi.Purpose, pi.Justification, pi.RequestID, string(pi.Status), pi.PolicyDecision, pi.PolicyReason, pi.RequiresApproval, pi.ExpiresAt, pi.CreatedAt, pi.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetIntent(ctx context.Context, id string) (*intent.PaymentIntent, error) {
	query := `SELECT id, COALESCE(organization_id, 'org_default'), agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, COALESCE(request_id, ''), status, COALESCE(policy_decision, ''), COALESCE(policy_reason, ''), COALESCE(requires_approval, FALSE), expires_at, created_at, updated_at
	          FROM payment_intents WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var pi intent.PaymentIntent
	var statusStr string
	if err := row.Scan(&pi.IntentID, &pi.OrganizationID, &pi.AgentID, &pi.VaultAddress, &pi.ServiceID, &pi.Recipient, &pi.Amount, &pi.Asset, &pi.Purpose, &pi.Justification, &pi.RequestID, &statusStr, &pi.PolicyDecision, &pi.PolicyReason, &pi.RequiresApproval, &pi.ExpiresAt, &pi.CreatedAt, &pi.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	pi.Status = intent.IntentStatus(statusStr)
	return &pi, nil
}

func (p *PostgresRepository) GetIntentByRequestID(ctx context.Context, orgID, requestID string) (*intent.PaymentIntent, error) {
	if orgID == "" {
		orgID = "org_default"
	}
	query := `SELECT id, COALESCE(organization_id, 'org_default'), agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, COALESCE(request_id, ''), status, COALESCE(policy_decision, ''), COALESCE(policy_reason, ''), COALESCE(requires_approval, FALSE), expires_at, created_at, updated_at
	          FROM payment_intents WHERE organization_id = $1 AND request_id = $2 LIMIT 1`
	row := p.db.QueryRowContext(ctx, query, orgID, requestID)
	var pi intent.PaymentIntent
	var statusStr string
	if err := row.Scan(&pi.IntentID, &pi.OrganizationID, &pi.AgentID, &pi.VaultAddress, &pi.ServiceID, &pi.Recipient, &pi.Amount, &pi.Asset, &pi.Purpose, &pi.Justification, &pi.RequestID, &statusStr, &pi.PolicyDecision, &pi.PolicyReason, &pi.RequiresApproval, &pi.ExpiresAt, &pi.CreatedAt, &pi.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	pi.Status = intent.IntentStatus(statusStr)
	return &pi, nil
}

func (p *PostgresRepository) UpdateIntentStatus(ctx context.Context, id string, status intent.IntentStatus, updatedAt time.Time) error {
	query := `UPDATE payment_intents SET status = $1, updated_at = $2 WHERE id = $3`
	res, err := p.db.ExecContext(ctx, query, string(status), updatedAt, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) CompareAndSwapIntentStatus(ctx context.Context, id string, expectedStatus intent.IntentStatus, newStatus intent.IntentStatus, updatedAt time.Time) (bool, error) {
	query := `UPDATE payment_intents SET status = $1, updated_at = $2 WHERE id = $3 AND status = $4`
	res, err := p.db.ExecContext(ctx, query, string(newStatus), updatedAt, id, string(expectedStatus))
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

// --- PaymentExecution Methods ---

func (p *PostgresRepository) SaveExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error {
	query := `INSERT INTO payment_executions (intent_id, transaction_hash, status, submitted_at, confirmed_at, error_code)
	          VALUES ($1, $2, $3, $4, $5, $6)
	          ON CONFLICT (intent_id) DO UPDATE SET transaction_hash = $2, status = $3, submitted_at = $4, confirmed_at = $5, error_code = $6`
	_, err := p.db.ExecContext(ctx, query, ex.IntentID, ex.TransactionHash, ex.Status, ex.SubmittedAt, ex.ConfirmedAt, ex.ErrorCode)
	return err
}

func (p *PostgresRepository) GetExecution(ctx context.Context, intentID string) (*intent.PaymentExecutionRecord, error) {
	query := `SELECT intent_id, COALESCE(transaction_hash, ''), status, submitted_at, confirmed_at, COALESCE(error_code, '')
	          FROM payment_executions WHERE intent_id = $1`
	row := p.db.QueryRowContext(ctx, query, intentID)
	var ex intent.PaymentExecutionRecord
	if err := row.Scan(&ex.IntentID, &ex.TransactionHash, &ex.Status, &ex.SubmittedAt, &ex.ConfirmedAt, &ex.ErrorCode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ex, nil
}

func (p *PostgresRepository) ListIntents(ctx context.Context) ([]*intent.PaymentIntent, error) {
	query := `SELECT id, COALESCE(organization_id, 'org_default'), agent_id, vault_address, service_id, recipient, amount, asset, purpose, justification, COALESCE(request_id, ''), status, COALESCE(policy_decision, ''), COALESCE(policy_reason, ''), COALESCE(requires_approval, FALSE), expires_at, created_at, updated_at
	          FROM payment_intents ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*intent.PaymentIntent
	for rows.Next() {
		var pi intent.PaymentIntent
		var statusStr string
		if err := rows.Scan(&pi.IntentID, &pi.OrganizationID, &pi.AgentID, &pi.VaultAddress, &pi.ServiceID, &pi.Recipient, &pi.Amount, &pi.Asset, &pi.Purpose, &pi.Justification, &pi.RequestID, &statusStr, &pi.PolicyDecision, &pi.PolicyReason, &pi.RequiresApproval, &pi.ExpiresAt, &pi.CreatedAt, &pi.UpdatedAt); err != nil {
			return nil, err
		}
		pi.Status = intent.IntentStatus(statusStr)
		res = append(res, &pi)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) ListExecutions(ctx context.Context) ([]*intent.PaymentExecutionRecord, error) {
	query := `SELECT intent_id, COALESCE(transaction_hash, ''), status, submitted_at, confirmed_at, COALESCE(error_code, '')
	          FROM payment_executions ORDER BY submitted_at DESC NULLS LAST`
	rows, err := p.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*intent.PaymentExecutionRecord
	for rows.Next() {
		var ex intent.PaymentExecutionRecord
		if err := rows.Scan(&ex.IntentID, &ex.TransactionHash, &ex.Status, &ex.SubmittedAt, &ex.ConfirmedAt, &ex.ErrorCode); err != nil {
			return nil, err
		}
		res = append(res, &ex)
	}
	return res, rows.Err()
}

// --- Approval Methods ---

func (p *PostgresRepository) SaveApproval(ctx context.Context, app *Approval) error {
	orgID := app.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	expiresAt := app.ExpiresAt
	if expiresAt.IsZero() {
		expiresAt = time.Now().Add(1 * time.Hour)
	}
	query := `INSERT INTO approvals (id, organization_id, payment_intent_id, required, status, requested_at, resolved_at, approved_by, rejection_reason, expires_at, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	          ON CONFLICT (id) DO UPDATE SET status = $5, resolved_at = $7, approved_by = $8, rejection_reason = $9, expires_at = $10`
	_, err := p.db.ExecContext(ctx, query, app.ID, orgID, app.PaymentIntentID, app.Required, app.Status, app.RequestedAt, app.ResolvedAt, app.ApprovedBy, app.RejectionReason, expiresAt, app.CreatedAt)
	return err
}

func (p *PostgresRepository) GetApproval(ctx context.Context, id string) (*Approval, error) {
	query := `SELECT id, organization_id, payment_intent_id, required, status, requested_at, resolved_at, COALESCE(approved_by, ''), COALESCE(rejection_reason, ''), COALESCE(expires_at, created_at + interval '1 hour'), created_at
	          FROM approvals WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var app Approval
	if err := row.Scan(&app.ID, &app.OrganizationID, &app.PaymentIntentID, &app.Required, &app.Status, &app.RequestedAt, &app.ResolvedAt, &app.ApprovedBy, &app.RejectionReason, &app.ExpiresAt, &app.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &app, nil
}

func (p *PostgresRepository) GetApprovalByIntent(ctx context.Context, intentID string) (*Approval, error) {
	query := `SELECT id, organization_id, payment_intent_id, required, status, requested_at, resolved_at, COALESCE(approved_by, ''), COALESCE(rejection_reason, ''), COALESCE(expires_at, created_at + interval '1 hour'), created_at
	          FROM approvals WHERE payment_intent_id = $1 LIMIT 1`
	row := p.db.QueryRowContext(ctx, query, intentID)
	var app Approval
	if err := row.Scan(&app.ID, &app.OrganizationID, &app.PaymentIntentID, &app.Required, &app.Status, &app.RequestedAt, &app.ResolvedAt, &app.ApprovedBy, &app.RejectionReason, &app.ExpiresAt, &app.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &app, nil
}

func (p *PostgresRepository) ListApprovals(ctx context.Context, orgID string) ([]*Approval, error) {
	query := `SELECT id, organization_id, payment_intent_id, required, status, requested_at, resolved_at, COALESCE(approved_by, ''), COALESCE(rejection_reason, ''), COALESCE(expires_at, created_at + interval '1 hour'), created_at
	          FROM approvals WHERE ($1 = '' OR organization_id = $1) ORDER BY requested_at DESC`
	rows, err := p.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*Approval
	for rows.Next() {
		var app Approval
		if err := rows.Scan(&app.ID, &app.OrganizationID, &app.PaymentIntentID, &app.Required, &app.Status, &app.RequestedAt, &app.ResolvedAt, &app.ApprovedBy, &app.RejectionReason, &app.ExpiresAt, &app.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, &app)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) UpdateApprovalStatus(ctx context.Context, id string, status string, approver string, reason string, resolvedAt time.Time) error {
	query := `UPDATE approvals SET status = $1, approved_by = $2, rejection_reason = $3, resolved_at = $4 WHERE id = $5`
	res, err := p.db.ExecContext(ctx, query, status, approver, reason, resolvedAt, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) CompareAndSwapApprovalStatus(ctx context.Context, id string, expectedStatus string, newStatus string, approver string, reason string, resolvedAt time.Time) (bool, error) {
	query := `UPDATE approvals SET status = $1, approved_by = $2, rejection_reason = $3, resolved_at = $4 WHERE id = $5 AND status = $6`
	res, err := p.db.ExecContext(ctx, query, newStatus, approver, reason, resolvedAt, id, expectedStatus)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	if rows == 0 {
		// Check if record exists
		checkQuery := `SELECT id FROM approvals WHERE id = $1`
		var dummy string
		if err := p.db.QueryRowContext(ctx, checkQuery, id).Scan(&dummy); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return false, ErrNotFound
			}
			return false, err
		}
		return false, nil
	}
	return true, nil
}

// --- Treasury Reservation Methods ---

func (p *PostgresRepository) CreateReservation(ctx context.Context, res *TreasuryReservation) error {
	orgID := res.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO treasury_reservations (id, organization_id, vault_address, payment_intent_id, amount, status, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	          ON CONFLICT (payment_intent_id) DO UPDATE
	          SET updated_at = treasury_reservations.updated_at
	          RETURNING id, organization_id, vault_address, payment_intent_id, amount, status, created_at, updated_at`
	row := p.db.QueryRowContext(ctx, query, res.ID, orgID, res.VaultAddress, res.IntentID, res.Amount, res.Status, res.CreatedAt, res.UpdatedAt)
	return row.Scan(&res.ID, &res.OrganizationID, &res.VaultAddress, &res.IntentID, &res.Amount, &res.Status, &res.CreatedAt, &res.UpdatedAt)
}

func (p *PostgresRepository) GetReservationByIntent(ctx context.Context, intentID string) (*TreasuryReservation, error) {
	query := `SELECT id, organization_id, vault_address, payment_intent_id, amount, status, created_at, updated_at
	          FROM treasury_reservations WHERE payment_intent_id = $1 LIMIT 1`
	row := p.db.QueryRowContext(ctx, query, intentID)
	var res TreasuryReservation
	if err := row.Scan(&res.ID, &res.OrganizationID, &res.VaultAddress, &res.IntentID, &res.Amount, &res.Status, &res.CreatedAt, &res.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &res, nil
}

func (p *PostgresRepository) UpdateReservationStatus(ctx context.Context, id string, status string, updatedAt time.Time) error {
	query := `UPDATE treasury_reservations SET status = $1, updated_at = $2 WHERE id = $3`
	res, err := p.db.ExecContext(ctx, query, status, updatedAt, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) GetTotalReservedAmount(ctx context.Context, organizationID string, vaultAddress string) (uint64, error) {
	query := `SELECT COALESCE(SUM(amount::numeric), 0) FROM treasury_reservations
	          WHERE ($1 = '' OR organization_id = $1)
	            AND ($2 = '' OR LOWER(vault_address) = LOWER($2))
	            AND status = 'RESERVED'`
	row := p.db.QueryRowContext(ctx, query, organizationID, vaultAddress)
	var sumStr string
	if err := row.Scan(&sumStr); err != nil {
		return 0, err
	}
	var total uint64
	_, _ = fmt.Sscan(sumStr, &total)
	return total, nil
}

// --- SystemState Methods ---

func (p *PostgresRepository) GetSystemState(ctx context.Context, key string) (string, error) {
	query := `SELECT value FROM system_state WHERE key = $1`
	row := p.db.QueryRowContext(ctx, query, key)
	var val string
	if err := row.Scan(&val); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return val, nil
}

func (p *PostgresRepository) SetSystemState(ctx context.Context, key string, value string, updatedBy string, updatedAt time.Time) error {
	query := `INSERT INTO system_state (key, value, updated_by, updated_at)
	          VALUES ($1, $2, $3, $4)
	          ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = $4`
	_, err := p.db.ExecContext(ctx, query, key, value, updatedBy, updatedAt)
	return err
}

// --- AuditEvent Methods (Append-only) ---

func (p *PostgresRepository) SaveAuditEvent(ctx context.Context, evt *AuditEvent) error {
	orgID := evt.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	version := evt.Version
	if version <= 0 {
		version = 1
	}
	query := `INSERT INTO audit_events (id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, request_id, timestamp, metadata, correlation_id, causation_id, payment_intent_id, agent_id, version)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
	_, err := p.db.ExecContext(ctx, query, evt.ID, orgID, evt.EventType, evt.ActorType, evt.ActorID, evt.ResourceType, evt.ResourceID, evt.RequestID, evt.Timestamp, evt.Metadata, evt.CorrelationID, evt.CausationID, evt.PaymentIntentID, evt.AgentID, version)
	return err
}

func (p *PostgresRepository) GetAuditEvent(ctx context.Context, id, orgID string) (*AuditEvent, error) {
	query := `SELECT id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, request_id, timestamp, metadata, COALESCE(correlation_id, ''), COALESCE(causation_id, ''), COALESCE(payment_intent_id, ''), COALESCE(agent_id, ''), COALESCE(version, 1)
	          FROM audit_events WHERE id = $1 AND ($2 = '' OR organization_id = $2)`
	row := p.db.QueryRowContext(ctx, query, id, orgID)
	var evt AuditEvent
	if err := row.Scan(&evt.ID, &evt.OrganizationID, &evt.EventType, &evt.ActorType, &evt.ActorID, &evt.ResourceType, &evt.ResourceID, &evt.RequestID, &evt.Timestamp, &evt.Metadata, &evt.CorrelationID, &evt.CausationID, &evt.PaymentIntentID, &evt.AgentID, &evt.Version); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &evt, nil
}

func (p *PostgresRepository) ListAuditEvents(ctx context.Context, orgID string) ([]*AuditEvent, error) {
	return p.ListAuditEventsWithFilter(ctx, orgID, "", "", "", 500)
}

func (p *PostgresRepository) ListAuditEventsWithFilter(ctx context.Context, orgID, eventType, paymentIntentID, agentID string, limit int) ([]*AuditEvent, error) {
	if limit <= 0 || limit > 500 {
		limit = 500
	}
	query := `SELECT id, organization_id, event_type, actor_type, actor_id, resource_type, resource_id, request_id, timestamp, metadata, COALESCE(correlation_id, ''), COALESCE(causation_id, ''), COALESCE(payment_intent_id, ''), COALESCE(agent_id, ''), COALESCE(version, 1)
	          FROM audit_events 
	          WHERE ($1 = '' OR organization_id = $1)
	            AND ($2 = '' OR event_type = $2)
	            AND ($3 = '' OR payment_intent_id = $3)
	            AND ($4 = '' OR agent_id = $4)
	          ORDER BY timestamp DESC LIMIT $5`
	rows, err := p.db.QueryContext(ctx, query, orgID, eventType, paymentIntentID, agentID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*AuditEvent
	for rows.Next() {
		var evt AuditEvent
		if err := rows.Scan(&evt.ID, &evt.OrganizationID, &evt.EventType, &evt.ActorType, &evt.ActorID, &evt.ResourceType, &evt.ResourceID, &evt.RequestID, &evt.Timestamp, &evt.Metadata, &evt.CorrelationID, &evt.CausationID, &evt.PaymentIntentID, &evt.AgentID, &evt.Version); err != nil {
			return nil, err
		}
		res = append(res, &evt)
	}
	return res, rows.Err()
}

// --- APIKey Methods (Day 5) ---

func (p *PostgresRepository) SaveAPIKey(ctx context.Context, key *APIKey) error {
	orgID := key.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO api_keys (id, organization_id, key_hash, name, masked_key, scopes, status, last_used_at, expires_at, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := p.db.ExecContext(ctx, query, key.ID, orgID, key.KeyHash, key.Name, key.MaskedKey, key.Scopes, key.Status, key.LastUsedAt, key.ExpiresAt, key.CreatedAt, key.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetAPIKeyByHash(ctx context.Context, hash string) (*APIKey, error) {
	query := `SELECT id, organization_id, key_hash, name, masked_key, scopes, status, last_used_at, expires_at, created_at, updated_at
	          FROM api_keys WHERE key_hash = $1`
	row := p.db.QueryRowContext(ctx, query, hash)
	var k APIKey
	if err := row.Scan(&k.ID, &k.OrganizationID, &k.KeyHash, &k.Name, &k.MaskedKey, &k.Scopes, &k.Status, &k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt, &k.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &k, nil
}

func (p *PostgresRepository) ListAPIKeys(ctx context.Context, orgID string) ([]*APIKey, error) {
	query := `SELECT id, organization_id, key_hash, name, masked_key, scopes, status, last_used_at, expires_at, created_at, updated_at
	          FROM api_keys WHERE ($1 = '' OR organization_id = $1) ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*APIKey
	for rows.Next() {
		var k APIKey
		if err := rows.Scan(&k.ID, &k.OrganizationID, &k.KeyHash, &k.Name, &k.MaskedKey, &k.Scopes, &k.Status, &k.LastUsedAt, &k.ExpiresAt, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, &k)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) RevokeAPIKey(ctx context.Context, id, orgID string, revokedAt time.Time) error {
	query := `UPDATE api_keys SET status = 'REVOKED', updated_at = $1 WHERE id = $2 AND ($3 = '' OR organization_id = $3)`
	result, err := p.db.ExecContext(ctx, query, revokedAt, id, orgID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) UpdateAPIKeyLastUsed(ctx context.Context, id string, lastUsed time.Time) error {
	query := `UPDATE api_keys SET last_used_at = $1 WHERE id = $2`
	_, err := p.db.ExecContext(ctx, query, lastUsed, id)
	return err
}

// --- Webhook Endpoint Methods (Day 6) ---

func (p *PostgresRepository) SaveWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error {
	orgID := ep.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO webhook_endpoints (id, organization_id, url, description, secret_hash, enabled, subscribed_events, failure_count, last_delivery_at, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := p.db.ExecContext(ctx, query, ep.ID, orgID, ep.URL, ep.Description, ep.SecretHash, ep.Enabled, ep.SubscribedEvents, ep.FailureCount, ep.LastDeliveryAt, ep.CreatedAt, ep.UpdatedAt)
	return err
}

func (p *PostgresRepository) GetWebhookEndpoint(ctx context.Context, id, orgID string) (*webhook.WebhookEndpoint, error) {
	query := `SELECT id, organization_id, url, description, secret_hash, enabled, subscribed_events, failure_count, last_delivery_at, created_at, updated_at
	          FROM webhook_endpoints WHERE id = $1 AND ($2 = '' OR organization_id = $2)`
	row := p.db.QueryRowContext(ctx, query, id, orgID)
	var ep webhook.WebhookEndpoint
	if err := row.Scan(&ep.ID, &ep.OrganizationID, &ep.URL, &ep.Description, &ep.SecretHash, &ep.Enabled, &ep.SubscribedEvents, &ep.FailureCount, &ep.LastDeliveryAt, &ep.CreatedAt, &ep.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &ep, nil
}

func (p *PostgresRepository) ListWebhookEndpoints(ctx context.Context, orgID string) ([]*webhook.WebhookEndpoint, error) {
	query := `SELECT id, organization_id, url, description, secret_hash, enabled, subscribed_events, failure_count, last_delivery_at, created_at, updated_at
	          FROM webhook_endpoints WHERE ($1 = '' OR organization_id = $1) ORDER BY created_at DESC`
	rows, err := p.db.QueryContext(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*webhook.WebhookEndpoint
	for rows.Next() {
		var ep webhook.WebhookEndpoint
		if err := rows.Scan(&ep.ID, &ep.OrganizationID, &ep.URL, &ep.Description, &ep.SecretHash, &ep.Enabled, &ep.SubscribedEvents, &ep.FailureCount, &ep.LastDeliveryAt, &ep.CreatedAt, &ep.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, &ep)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) UpdateWebhookEndpoint(ctx context.Context, ep *webhook.WebhookEndpoint) error {
	query := `UPDATE webhook_endpoints 
	          SET url = $1, description = $2, enabled = $3, subscribed_events = $4, updated_at = $5 
	          WHERE id = $6 AND ($7 = '' OR organization_id = $7)`
	result, err := p.db.ExecContext(ctx, query, ep.URL, ep.Description, ep.Enabled, ep.SubscribedEvents, ep.UpdatedAt, ep.ID, ep.OrganizationID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) DeleteWebhookEndpoint(ctx context.Context, id, orgID string) error {
	query := `DELETE FROM webhook_endpoints WHERE id = $1 AND ($2 = '' OR organization_id = $2)`
	result, err := p.db.ExecContext(ctx, query, id, orgID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) UpdateWebhookEndpointStatus(ctx context.Context, id, orgID string, failureCount int, lastDelivery time.Time) error {
	query := `UPDATE webhook_endpoints SET failure_count = $1, last_delivery_at = $2, updated_at = $3 WHERE id = $4 AND ($5 = '' OR organization_id = $5)`
	_, err := p.db.ExecContext(ctx, query, failureCount, lastDelivery, time.Now(), id, orgID)
	return err
}

// --- Webhook Delivery Methods (Day 6) ---

func (p *PostgresRepository) SaveWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error {
	orgID := delivery.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO webhook_deliveries (id, endpoint_id, event_id, organization_id, event_type, status, http_status, request_payload, response_body, error_message, attempt_count, max_attempts, next_retry_at, latency_ms, delivered_at, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`
	_, err := p.db.ExecContext(ctx, query, delivery.ID, delivery.EndpointID, delivery.EventID, orgID, delivery.EventType, delivery.Status, delivery.HTTPStatus, delivery.RequestPayload, delivery.ResponseBody, delivery.ErrorMessage, delivery.AttemptCount, delivery.MaxAttempts, delivery.NextRetryAt, delivery.LatencyMs, delivery.DeliveredAt, delivery.CreatedAt)
	return err
}

func (p *PostgresRepository) GetWebhookDelivery(ctx context.Context, id, orgID string) (*webhook.WebhookDelivery, error) {
	query := `SELECT id, endpoint_id, event_id, organization_id, event_type, status, http_status, request_payload, response_body, error_message, attempt_count, max_attempts, next_retry_at, latency_ms, delivered_at, created_at
	          FROM webhook_deliveries WHERE id = $1 AND ($2 = '' OR organization_id = $2)`
	row := p.db.QueryRowContext(ctx, query, id, orgID)
	var del webhook.WebhookDelivery
	if err := row.Scan(&del.ID, &del.EndpointID, &del.EventID, &del.OrganizationID, &del.EventType, &del.Status, &del.HTTPStatus, &del.RequestPayload, &del.ResponseBody, &del.ErrorMessage, &del.AttemptCount, &del.MaxAttempts, &del.NextRetryAt, &del.LatencyMs, &del.DeliveredAt, &del.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &del, nil
}

func (p *PostgresRepository) ListWebhookDeliveries(ctx context.Context, endpointID, orgID string, limit int) ([]*webhook.WebhookDelivery, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `SELECT id, endpoint_id, event_id, organization_id, event_type, status, http_status, request_payload, response_body, error_message, attempt_count, max_attempts, next_retry_at, latency_ms, delivered_at, created_at
	          FROM webhook_deliveries 
	          WHERE ($1 = '' OR organization_id = $1)
	            AND ($2 = '' OR endpoint_id = $2)
	          ORDER BY created_at DESC LIMIT $3`
	rows, err := p.db.QueryContext(ctx, query, orgID, endpointID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*webhook.WebhookDelivery
	for rows.Next() {
		var del webhook.WebhookDelivery
		if err := rows.Scan(&del.ID, &del.EndpointID, &del.EventID, &del.OrganizationID, &del.EventType, &del.Status, &del.HTTPStatus, &del.RequestPayload, &del.ResponseBody, &del.ErrorMessage, &del.AttemptCount, &del.MaxAttempts, &del.NextRetryAt, &del.LatencyMs, &del.DeliveredAt, &del.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, &del)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) UpdateWebhookDelivery(ctx context.Context, delivery *webhook.WebhookDelivery) error {
	query := `UPDATE webhook_deliveries 
	          SET status = $1, http_status = $2, response_body = $3, error_message = $4, attempt_count = $5, next_retry_at = $6, latency_ms = $7, delivered_at = $8
	          WHERE id = $9`
	_, err := p.db.ExecContext(ctx, query, delivery.Status, delivery.HTTPStatus, delivery.ResponseBody, delivery.ErrorMessage, delivery.AttemptCount, delivery.NextRetryAt, delivery.LatencyMs, delivery.DeliveredAt, delivery.ID)
	return err
}

// --- Outbox Methods (Day 6) ---

func (p *PostgresRepository) SaveOutboxEvent(ctx context.Context, outbox *webhook.OutboxEvent) error {
	orgID := outbox.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}
	query := `INSERT INTO outbox_events (id, event_id, organization_id, event_type, payload, status, retry_count, next_retry_at, created_at, processed_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := p.db.ExecContext(ctx, query, outbox.ID, outbox.EventID, orgID, outbox.EventType, outbox.Payload, outbox.Status, outbox.RetryCount, outbox.NextRetryAt, outbox.CreatedAt, outbox.ProcessedAt)
	return err
}

func (p *PostgresRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*webhook.OutboxEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `SELECT id, event_id, organization_id, event_type, payload, status, retry_count, next_retry_at, created_at, processed_at
	          FROM outbox_events 
	          WHERE status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= NOW())
	          ORDER BY created_at ASC LIMIT $1`
	rows, err := p.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []*webhook.OutboxEvent
	for rows.Next() {
		var ev webhook.OutboxEvent
		if err := rows.Scan(&ev.ID, &ev.EventID, &ev.OrganizationID, &ev.EventType, &ev.Payload, &ev.Status, &ev.RetryCount, &ev.NextRetryAt, &ev.CreatedAt, &ev.ProcessedAt); err != nil {
			return nil, err
		}
		res = append(res, &ev)
	}
	return res, rows.Err()
}

func (p *PostgresRepository) MarkOutboxEventProcessed(ctx context.Context, id string, processedAt time.Time) error {
	query := `UPDATE outbox_events SET status = 'PROCESSED', processed_at = $1 WHERE id = $2`
	_, err := p.db.ExecContext(ctx, query, processedAt, id)
	return err
}

func (p *PostgresRepository) SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error {
	payloadBytes, _ := json.Marshal(event.Data)
	now := event.OccurredAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	auditEvt := &AuditEvent{
		ID:              event.ID,
		OrganizationID:  event.OrganizationID,
		EventType:       string(event.Type),
		ActorType:       event.ActorType,
		ActorID:         event.ActorID,
		ResourceType:    "DOMAIN_EVENT",
		ResourceID:      event.ID,
		RequestID:       event.RequestID,
		CorrelationID:   event.CorrelationID,
		CausationID:     event.CausationID,
		AgentID:         event.AgentID,
		PaymentIntentID: event.PaymentIntentID,
		ExecutionID:     event.ExecutionID,
		ApprovalID:      event.ApprovalID,
		Version:         event.Version,
		Timestamp:       now,
		Metadata:        string(payloadBytes),
	}
	_ = p.SaveAuditEvent(ctx, auditEvt)

	outboxPayload, _ := json.Marshal(event)
	outboxEvt := &webhook.OutboxEvent{
		ID:             webhook.GenerateOutboxID(),
		EventID:        event.ID,
		OrganizationID: event.OrganizationID,
		EventType:      string(event.Type),
		Payload:        string(outboxPayload),
		Status:         webhook.OutboxStatusPending,
		CreatedAt:      now,
	}
	return p.SaveOutboxEvent(ctx, outboxEvt)
}

// --- Mission & Autonomous Economy Methods (Postgres) ---

func (p *PostgresRepository) SaveMission(ctx context.Context, m *economy.Mission) error {
	metaJSON, _ := json.Marshal(m.Metadata)
	query := `INSERT INTO missions (id, organization_id, agent_id, objective, status, budget, spent, remaining_budget, currency, max_execution_amount, created_at, started_at, completed_at, deadline, current_step, failure_reason, metadata, correlation_id)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	          ON CONFLICT (id) DO UPDATE SET status = $5, spent = $7, remaining_budget = $8, completed_at = $13, failure_reason = $16`
	_, err := p.db.ExecContext(ctx, query, m.ID, m.OrganizationID, m.AgentID, m.Objective, string(m.Status), m.Budget, m.Spent, m.RemainingBudget, m.Currency, m.MaxExecutionAmount, m.CreatedAt, m.StartedAt, m.CompletedAt, m.Deadline, m.CurrentStep, m.FailureReason, string(metaJSON), m.CorrelationID)
	return err
}

func (p *PostgresRepository) GetMission(ctx context.Context, id string) (*economy.Mission, error) {
	query := `SELECT id, organization_id, agent_id, objective, status, budget, spent, remaining_budget, currency, max_execution_amount, created_at, started_at, completed_at, deadline, current_step, failure_reason, metadata, correlation_id
	          FROM missions WHERE id = $1`
	var m economy.Mission
	var statusStr, metaStr string
	err := p.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.OrganizationID, &m.AgentID, &m.Objective, &statusStr, &m.Budget, &m.Spent, &m.RemainingBudget,
		&m.Currency, &m.MaxExecutionAmount, &m.CreatedAt, &m.StartedAt, &m.CompletedAt, &m.Deadline,
		&m.CurrentStep, &m.FailureReason, &metaStr, &m.CorrelationID,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	m.Status = economy.MissionStatus(statusStr)
	if metaStr != "" {
		_ = json.Unmarshal([]byte(metaStr), &m.Metadata)
	}
	return &m, nil
}

func (p *PostgresRepository) ListMissions(ctx context.Context, orgID string) ([]*economy.Mission, error) {
	var rows *sql.Rows
	var err error
	if orgID != "" {
		rows, err = p.db.QueryContext(ctx, `SELECT id, organization_id, agent_id, objective, status, budget, spent, remaining_budget, currency, max_execution_amount, created_at, started_at, completed_at, deadline, current_step, failure_reason, metadata, correlation_id FROM missions WHERE organization_id = $1 ORDER BY created_at DESC`, orgID)
	} else {
		rows, err = p.db.QueryContext(ctx, `SELECT id, organization_id, agent_id, objective, status, budget, spent, remaining_budget, currency, max_execution_amount, created_at, started_at, completed_at, deadline, current_step, failure_reason, metadata, correlation_id FROM missions ORDER BY created_at DESC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*economy.Mission, 0)
	for rows.Next() {
		var m economy.Mission
		var statusStr, metaStr string
		if err := rows.Scan(
			&m.ID, &m.OrganizationID, &m.AgentID, &m.Objective, &statusStr, &m.Budget, &m.Spent, &m.RemainingBudget,
			&m.Currency, &m.MaxExecutionAmount, &m.CreatedAt, &m.StartedAt, &m.CompletedAt, &m.Deadline,
			&m.CurrentStep, &m.FailureReason, &metaStr, &m.CorrelationID,
		); err != nil {
			return nil, err
		}
		m.Status = economy.MissionStatus(statusStr)
		if metaStr != "" {
			_ = json.Unmarshal([]byte(metaStr), &m.Metadata)
		}
		list = append(list, &m)
	}
	return list, nil
}

func (p *PostgresRepository) UpdateMissionStatus(ctx context.Context, id string, status economy.MissionStatus, updatedAt time.Time) error {
	query := `UPDATE missions SET status = $1 WHERE id = $2`
	res, err := p.db.ExecContext(ctx, query, string(status), id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) UpdateMissionBudget(ctx context.Context, id string, spent, remaining string, updatedAt time.Time) error {
	query := `UPDATE missions SET spent = $1, remaining_budget = $2 WHERE id = $3`
	res, err := p.db.ExecContext(ctx, query, spent, remaining, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (p *PostgresRepository) SaveMissionStep(ctx context.Context, step *economy.MissionStep) error {
	query := `INSERT INTO mission_steps (step_id, mission_id, step_index, required_capability, category, max_budget, selected_service_id, selected_quote_id, payment_intent_id, status, result_data, error, started_at, completed_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	          ON CONFLICT (mission_id, step_id) DO UPDATE SET status = $10, result_data = $11, error = $12, completed_at = $14`
	_, err := p.db.ExecContext(ctx, query, step.StepID, step.MissionID, step.Index, step.RequiredCapability, step.Category, step.MaxBudget, step.SelectedServiceID, step.SelectedQuoteID, step.PaymentIntentID, step.Status, step.ResultData, step.Error, step.StartedAt, step.CompletedAt)
	return err
}

func (p *PostgresRepository) GetMissionStep(ctx context.Context, missionID, stepID string) (*economy.MissionStep, error) {
	query := `SELECT step_id, mission_id, step_index, required_capability, category, max_budget, selected_service_id, selected_quote_id, payment_intent_id, status, result_data, error, started_at, completed_at
	          FROM mission_steps WHERE mission_id = $1 AND step_id = $2`
	var step economy.MissionStep
	err := p.db.QueryRowContext(ctx, query, missionID, stepID).Scan(
		&step.StepID, &step.MissionID, &step.Index, &step.RequiredCapability, &step.Category, &step.MaxBudget,
		&step.SelectedServiceID, &step.SelectedQuoteID, &step.PaymentIntentID, &step.Status,
		&step.ResultData, &step.Error, &step.StartedAt, &step.CompletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &step, nil
}

func (p *PostgresRepository) ListMissionSteps(ctx context.Context, missionID string) ([]*economy.MissionStep, error) {
	query := `SELECT step_id, mission_id, step_index, required_capability, category, max_budget, selected_service_id, selected_quote_id, payment_intent_id, status, result_data, error, started_at, completed_at
	          FROM mission_steps WHERE mission_id = $1 ORDER BY step_index ASC`
	rows, err := p.db.QueryContext(ctx, query, missionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*economy.MissionStep, 0)
	for rows.Next() {
		var step economy.MissionStep
		if err := rows.Scan(
			&step.StepID, &step.MissionID, &step.Index, &step.RequiredCapability, &step.Category, &step.MaxBudget,
			&step.SelectedServiceID, &step.SelectedQuoteID, &step.PaymentIntentID, &step.Status,
			&step.ResultData, &step.Error, &step.StartedAt, &step.CompletedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &step)
	}
	return list, nil
}

func (p *PostgresRepository) UpdateMissionStep(ctx context.Context, step *economy.MissionStep) error {
	query := `UPDATE mission_steps SET status = $1, payment_intent_id = $2, result_data = $3, error = $4, completed_at = $5 WHERE mission_id = $6 AND step_id = $7`
	_, err := p.db.ExecContext(ctx, query, step.Status, step.PaymentIntentID, step.ResultData, step.Error, step.CompletedAt, step.MissionID, step.StepID)
	return err
}

// ApplyMigrations executes the initial schema migration statements.
func ApplyMigrations(ctx context.Context, db *sql.DB, migrationSQL string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin migration transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute statements separated by semicolons or as a single block
	for _, stmt := range strings.Split(migrationSQL, ";") {
		cleanStmt := strings.TrimSpace(stmt)
		if cleanStmt == "" {
			continue
		}
		if _, err := tx.ExecContext(ctx, cleanStmt); err != nil {
			return fmt.Errorf("migration execution failed on statement (%s): %w", cleanStmt, err)
		}
	}

	return tx.Commit()
}
