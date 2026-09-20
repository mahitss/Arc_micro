package domain

import (
	"time"
)

// --- 1. Organization ---

// Organization represents a tenant boundary.
type Organization struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"` // "ACTIVE", "SUSPENDED"
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// --- 2. Agent ---

type AgentStatus string

const (
	AgentStatusActive   AgentStatus = "ACTIVE"
	AgentStatusPaused   AgentStatus = "PAUSED"
	AgentStatusDisabled AgentStatus = "DISABLED"
)

// Agent represents an autonomous virtual economic actor.
type Agent struct {
	ID             string      `json:"id"`
	OrganizationID string      `json:"organization_id"`
	Name           string      `json:"name"`
	Description    string      `json:"description"`
	Status         AgentStatus `json:"status"`
	PolicyID       string      `json:"policy_id,omitempty"`
	VaultAddress   string      `json:"vault_address,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

// --- 3. Service ---

type ServiceStatus string

const (
	ServiceStatusActive     ServiceStatus = "ACTIVE"
	ServiceStatusSuspended  ServiceStatus = "SUSPENDED"
	ServiceStatusDeprecated ServiceStatus = "DEPRECATED"
)

// Service represents a pre-approved economic destination in the Service Registry.
type Service struct {
	ID             string        `json:"id"`
	OrganizationID string        `json:"organization_id"`
	Name           string        `json:"name"`
	Description    string        `json:"description"`
	Recipient      string        `json:"recipient"` // Server-resolved approved recipient
	Asset          string        `json:"asset"`     // Default "USDC"
	Status         ServiceStatus `json:"status"`
	Enabled        bool          `json:"enabled"`
	MaxPrice       string        `json:"max_price"`            // micro-USDC integer string
	FixedPrice     string        `json:"fixed_price,omitempty"` // micro-USDC integer string
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

// --- 4. Policy ---

// Policy defines deterministic financial spending rules for an agent.
// All monetary values are integer base units (micro-USDC).
type Policy struct {
	ID                    string    `json:"id"`
	OrganizationID        string    `json:"organization_id"`
	AgentID               string    `json:"agent_id"`
	Enabled               bool      `json:"enabled"`
	PerTransactionLimit   string    `json:"per_transaction_limit"`   // micro-USDC integer string
	DailyLimit            string    `json:"daily_limit"`             // micro-USDC integer string
	MaxTransactionsPerDay int       `json:"max_transactions_per_day"`
	ApprovalThreshold     string    `json:"approval_threshold"`       // micro-USDC integer string
	AllowedAssets         []string  `json:"allowed_assets"`
	AllowedRecipients     []string  `json:"allowed_recipients,omitempty"`
	BlockedRecipients     []string  `json:"blocked_recipients,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// --- 5. Approval ---

type ApprovalStatus string

const (
	ApprovalStatusPending  ApprovalStatus = "PENDING"
	ApprovalStatusApproved ApprovalStatus = "APPROVED"
	ApprovalStatusRejected ApprovalStatus = "REJECTED"
	ApprovalStatusExpired  ApprovalStatus = "EXPIRED"
)

// Approval represents a human-in-the-loop authorization gate.
type Approval struct {
	ID              string         `json:"id"`
	OrganizationID  string         `json:"organization_id"`
	PaymentIntentID string         `json:"payment_intent_id"`
	Required        bool           `json:"required"`
	Status          ApprovalStatus `json:"status"`
	RequestedAt     time.Time      `json:"requested_at"`
	ResolvedAt      *time.Time     `json:"resolved_at,omitempty"`
	ApprovedBy      string         `json:"approved_by,omitempty"`
	RejectionReason string         `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
}

// --- 6. Audit Event ---

type AuditEventType string

const (
	AuditEventAgentCreated         AuditEventType = "agent.created"
	AuditEventAgentUpdated         AuditEventType = "agent.updated"
	AuditEventAgentPaused          AuditEventType = "agent.paused"
	AuditEventAgentResumed         AuditEventType = "agent.resumed"
	AuditEventServiceCreated       AuditEventType = "service.created"
	AuditEventServiceUpdated       AuditEventType = "service.updated"
	AuditEventServicePaused        AuditEventType = "service.paused"
	AuditEventPolicyUpdated        AuditEventType = "policy.updated"
	AuditEventPaymentCreated       AuditEventType = "payment.created"
	AuditEventPaymentAuthorized    AuditEventType = "payment.authorized"
	AuditEventPaymentDenied        AuditEventType = "payment.denied"
	AuditEventPaymentApprovalReq   AuditEventType = "payment.approval_required"
	AuditEventPaymentApproved      AuditEventType = "payment.approved"
	AuditEventPaymentRejected      AuditEventType = "payment.rejected"
	AuditEventPaymentSubmitted     AuditEventType = "payment.submitted"
	AuditEventPaymentConfirmed     AuditEventType = "payment.confirmed"
	AuditEventPaymentFailed        AuditEventType = "payment.failed"
)

// AuditEvent represents an append-only, tamper-evident audit record.
type AuditEvent struct {
	ID             string         `json:"id"`
	OrganizationID string         `json:"organization_id"`
	EventType      AuditEventType `json:"event_type"`
	ActorType      string         `json:"actor_type"` // "AGENT", "USER", "SYSTEM"
	ActorID        string         `json:"actor_id"`
	ResourceType   string         `json:"resource_type"` // "PAYMENT_INTENT", "AGENT", "SERVICE", "POLICY"
	ResourceID     string         `json:"resource_id"`
	RequestID      string         `json:"request_id"`
	Timestamp      time.Time      `json:"timestamp"`
	Metadata       string         `json:"metadata"` // JSON string
}
