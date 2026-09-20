package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrOrganizationMismatch        = errors.New("cross-organization access denied: resource does not belong to organization")
	ErrAgentNotActive              = errors.New("agent is not active")
	ErrServiceNotActive            = errors.New("service is not active")
	ErrInvalidAmount               = errors.New("invalid amount: must be positive integer base units (micro-USDC)")
	ErrCannotApproveDenied         = errors.New("cannot approve: intent was denied by policy engine")
	ErrIntentNotPendingAppr        = errors.New("intent does not require approval or is not in pending approval state")
	ErrIntentExpired               = errors.New("intent has expired")
	ErrAgentSelfApprovalProhibited = errors.New("agent cannot approve its own payment")
	ErrApprovalConflict            = errors.New("concurrent approval conflict: state already modified")
	ErrApprovalExpired             = errors.New("approval has expired")
)

// CreateIntentParams encapsulates all parameters for creating a payment intent.
type CreateIntentParams struct {
	OrganizationID string
	AgentID        string
	ServiceID      string
	VaultAddress   string
	Amount         string // Micro-USDC integer string
	Asset          string // "USDC"
	Purpose        string
	Justification  string
	RequestID      string // Idempotency key
	ActorID        string
}

// DomainService exposes high-level domain operations with strict validation and audit logging.
type DomainService interface {
	CreateOrganization(ctx context.Context, o *domain.Organization) error
	GetOrganization(ctx context.Context, id string) (*domain.Organization, error)

	CreateAgent(ctx context.Context, a *domain.Agent) error
	UpdateAgent(ctx context.Context, a *domain.Agent) error
	PauseAgent(ctx context.Context, orgID, agentID, actorID string) error

	CreateService(ctx context.Context, s *domain.Service) error
	UpdateService(ctx context.Context, s *domain.Service) error
	PauseService(ctx context.Context, orgID, serviceID, actorID string) error

	CreatePolicy(ctx context.Context, p *domain.Policy) error
	GetPolicy(ctx context.Context, orgID, agentID string) (*domain.Policy, error)

	CreatePaymentIntent(ctx context.Context, params CreateIntentParams) (*intent.PaymentIntent, error)
	RecordPolicyDecision(ctx context.Context, intentID string, decision domain.Decision, reasonCode domain.ReasonCode, reason string, requiresApproval bool) (*intent.PaymentIntent, error)
	RecordApproval(ctx context.Context, orgID, intentID, approverID string, approved bool, reason string) (*intent.PaymentIntent, *domain.Approval, error)
	RecordExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error
	RecordAuditEvent(ctx context.Context, evt *domain.AuditEvent) error
}

type DefaultDomainService struct {
	repo storage.Repository
}

func NewDomainService(repo storage.Repository) *DefaultDomainService {
	return &DefaultDomainService{repo: repo}
}

// --- 1. Organization Operations ---

func (s *DefaultDomainService) CreateOrganization(ctx context.Context, o *domain.Organization) error {
	if strings.TrimSpace(o.ID) == "" {
		return errors.New("missing organization id")
	}
	if strings.TrimSpace(o.Name) == "" {
		return errors.New("missing organization name")
	}
	now := time.Now()
	o.CreatedAt = now
	o.UpdatedAt = now
	if o.Status == "" {
		o.Status = "ACTIVE"
	}

	storageOrg := &storage.Organization{
		ID:        o.ID,
		Name:      o.Name,
		Status:    o.Status,
		CreatedAt: o.CreatedAt,
		UpdatedAt: o.UpdatedAt,
	}
	return s.repo.SaveOrganization(ctx, storageOrg)
}

func (s *DefaultDomainService) GetOrganization(ctx context.Context, id string) (*domain.Organization, error) {
	so, err := s.repo.GetOrganization(ctx, id)
	if err != nil {
		return nil, err
	}
	return &domain.Organization{
		ID:        so.ID,
		Name:      so.Name,
		Status:    so.Status,
		CreatedAt: so.CreatedAt,
		UpdatedAt: so.UpdatedAt,
	}, nil
}

// --- 2. Agent Operations ---

func (s *DefaultDomainService) CreateAgent(ctx context.Context, a *domain.Agent) error {
	if strings.TrimSpace(a.ID) == "" {
		return errors.New("missing agent id")
	}
	if strings.TrimSpace(a.OrganizationID) == "" {
		a.OrganizationID = "org_default"
	}
	if strings.TrimSpace(a.Name) == "" {
		return errors.New("missing agent name")
	}
	now := time.Now()
	a.CreatedAt = now
	a.UpdatedAt = now
	if a.Status == "" {
		a.Status = domain.AgentStatusActive
	}

	storageAgent := &storage.Agent{
		ID:             a.ID,
		OrganizationID: a.OrganizationID,
		Name:           a.Name,
		Description:    a.Description,
		Status:         string(a.Status),
		PolicyID:       a.PolicyID,
		VaultAddress:   a.VaultAddress,
		CreatedAt:      a.CreatedAt,
		UpdatedAt:      a.UpdatedAt,
	}
	if err := s.repo.SaveAgent(ctx, storageAgent); err != nil {
		return err
	}

	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: a.OrganizationID,
		EventType:      domain.AuditEventAgentCreated,
		ActorType:      "SYSTEM",
		ActorID:        "admin",
		ResourceType:   "AGENT",
		ResourceID:     a.ID,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"name":"%s"}`, a.Name),
	})

	return nil
}

func (s *DefaultDomainService) UpdateAgent(ctx context.Context, a *domain.Agent) error {
	existing, err := s.repo.GetAgent(ctx, a.ID)
	if err != nil {
		return err
	}
	if existing.OrganizationID != a.OrganizationID && a.OrganizationID != "" {
		return ErrOrganizationMismatch
	}

	now := time.Now()
	a.UpdatedAt = now
	storageAgent := &storage.Agent{
		ID:             a.ID,
		OrganizationID: existing.OrganizationID,
		Name:           a.Name,
		Description:    a.Description,
		Status:         string(a.Status),
		PolicyID:       a.PolicyID,
		VaultAddress:   a.VaultAddress,
		CreatedAt:      existing.CreatedAt,
		UpdatedAt:      now,
	}
	return s.repo.SaveAgent(ctx, storageAgent)
}

func (s *DefaultDomainService) PauseAgent(ctx context.Context, orgID, agentID, actorID string) error {
	ag, err := s.repo.GetAgent(ctx, agentID)
	if err != nil {
		return err
	}
	if orgID != "" && ag.OrganizationID != orgID {
		return ErrOrganizationMismatch
	}

	ag.Status = string(domain.AgentStatusPaused)
	ag.UpdatedAt = time.Now()
	if err := s.repo.SaveAgent(ctx, ag); err != nil {
		return err
	}

	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: ag.OrganizationID,
		EventType:      domain.AuditEventAgentPaused,
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "AGENT",
		ResourceID:     ag.ID,
		RequestID:      generateID("req_"),
		Timestamp:      ag.UpdatedAt,
		Metadata:       `{"status":"PAUSED"}`,
	})

	return nil
}

// --- 3. Service Operations ---

func (s *DefaultDomainService) CreateService(ctx context.Context, srv *domain.Service) error {
	if strings.TrimSpace(srv.ID) == "" {
		return errors.New("missing service id")
	}
	if strings.TrimSpace(srv.OrganizationID) == "" {
		srv.OrganizationID = "org_default"
	}
	if strings.TrimSpace(srv.Recipient) == "" || !strings.HasPrefix(srv.Recipient, "0x") || len(srv.Recipient) != 42 {
		return errors.New("invalid recipient address: expected 42-character hex string")
	}
	if err := validateAmount(srv.MaxPrice); err != nil {
		return fmt.Errorf("invalid max_price: %w", err)
	}

	now := time.Now()
	srv.CreatedAt = now
	srv.UpdatedAt = now
	if srv.Status == "" {
		srv.Status = domain.ServiceStatusActive
	}
	srv.Enabled = true

	regService := &registry.Service{
		ID:         srv.ID,
		Name:       srv.Name,
		Recipient:  srv.Recipient,
		Asset:      srv.Asset,
		Enabled:    srv.Enabled,
		MaxPrice:   srv.MaxPrice,
		FixedPrice: srv.FixedPrice,
	}
	return s.repo.SaveService(ctx, regService)
}

func (s *DefaultDomainService) UpdateService(ctx context.Context, srv *domain.Service) error {
	existing, err := s.repo.GetService(ctx, srv.ID)
	if err != nil {
		return err
	}

	if srv.Recipient != "" && (!strings.HasPrefix(srv.Recipient, "0x") || len(srv.Recipient) != 42) {
		return errors.New("invalid recipient address format")
	}
	if srv.MaxPrice != "" {
		if err := validateAmount(srv.MaxPrice); err != nil {
			return fmt.Errorf("invalid max_price: %w", err)
		}
	}

	regService := &registry.Service{
		ID:         existing.ID,
		Name:       srv.Name,
		Recipient:  srv.Recipient,
		Asset:      srv.Asset,
		Enabled:    srv.Enabled,
		MaxPrice:   srv.MaxPrice,
		FixedPrice: srv.FixedPrice,
	}
	return s.repo.SaveService(ctx, regService)
}

func (s *DefaultDomainService) PauseService(ctx context.Context, orgID, serviceID, actorID string) error {
	srv, err := s.repo.GetService(ctx, serviceID)
	if err != nil {
		return err
	}

	srv.Enabled = false
	if err := s.repo.SaveService(ctx, srv); err != nil {
		return err
	}

	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: orgID,
		EventType:      domain.AuditEventServicePaused,
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "SERVICE",
		ResourceID:     srv.ID,
		RequestID:      generateID("req_"),
		Timestamp:      time.Now(),
		Metadata:       `{"enabled":false}`,
	})

	return nil
}

// --- 4. Policy Operations ---

func (s *DefaultDomainService) CreatePolicy(ctx context.Context, p *domain.Policy) error {
	if strings.TrimSpace(p.ID) == "" {
		return errors.New("missing policy id")
	}
	if strings.TrimSpace(p.OrganizationID) == "" {
		p.OrganizationID = "org_default"
	}
	if strings.TrimSpace(p.AgentID) == "" {
		return errors.New("missing agent id for policy")
	}
	if err := validateAmount(p.PerTransactionLimit); err != nil {
		return fmt.Errorf("invalid per_transaction_limit: %w", err)
	}
	if err := validateAmount(p.DailyLimit); err != nil {
		return fmt.Errorf("invalid daily_limit: %w", err)
	}

	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now

	storagePolicy := &storage.Policy{
		ID:                    p.ID,
		OrganizationID:        p.OrganizationID,
		AgentID:               p.AgentID,
		Enabled:               p.Enabled,
		PerTransactionLimit:   p.PerTransactionLimit,
		DailyLimit:            p.DailyLimit,
		MaxTransactionsPerDay: p.MaxTransactionsPerDay,
		ApprovalThreshold:     p.ApprovalThreshold,
		AllowedAssets:         strings.Join(p.AllowedAssets, ","),
		AllowedRecipients:     strings.Join(p.AllowedRecipients, ","),
		BlockedRecipients:     strings.Join(p.BlockedRecipients, ","),
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	return s.repo.SavePolicy(ctx, storagePolicy)
}

func (s *DefaultDomainService) GetPolicy(ctx context.Context, orgID, agentID string) (*domain.Policy, error) {
	sp, err := s.repo.GetPolicyByAgent(ctx, orgID, agentID)
	if err != nil {
		return nil, err
	}

	var allowedAssets []string
	if sp.AllowedAssets != "" {
		allowedAssets = strings.Split(sp.AllowedAssets, ",")
	}
	var allowedRecipients []string
	if sp.AllowedRecipients != "" {
		allowedRecipients = strings.Split(sp.AllowedRecipients, ",")
	}
	var blockedRecipients []string
	if sp.BlockedRecipients != "" {
		blockedRecipients = strings.Split(sp.BlockedRecipients, ",")
	}

	return &domain.Policy{
		ID:                    sp.ID,
		OrganizationID:        sp.OrganizationID,
		AgentID:               sp.AgentID,
		Enabled:               sp.Enabled,
		PerTransactionLimit:   sp.PerTransactionLimit,
		DailyLimit:            sp.DailyLimit,
		MaxTransactionsPerDay: sp.MaxTransactionsPerDay,
		ApprovalThreshold:     sp.ApprovalThreshold,
		AllowedAssets:         allowedAssets,
		AllowedRecipients:     allowedRecipients,
		BlockedRecipients:     blockedRecipients,
		CreatedAt:             sp.CreatedAt,
		UpdatedAt:             sp.UpdatedAt,
	}, nil
}

// --- 5. PaymentIntent Operations ---

func (s *DefaultDomainService) CreatePaymentIntent(ctx context.Context, params CreateIntentParams) (*intent.PaymentIntent, error) {
	orgID := params.OrganizationID
	if orgID == "" {
		orgID = "org_default"
	}

	// 1. Idempotency Check: if request_id provided, look up existing intent
	if params.RequestID != "" {
		existing, err := s.repo.GetIntentByRequestID(ctx, orgID, params.RequestID)
		if err == nil && existing != nil {
			return existing, nil
		}
	}

	// 2. Validate Amount
	if err := validateAmount(params.Amount); err != nil {
		return nil, err
	}

	// 3. Validate Agent exists, belongs to organization, and is ACTIVE
	ag, err := s.repo.GetAgent(ctx, params.AgentID)
	if err != nil {
		return nil, fmt.Errorf("agent validation failed: %w", err)
	}
	if ag.OrganizationID != orgID && orgID != "org_default" {
		return nil, ErrOrganizationMismatch
	}
	if ag.Status != string(domain.AgentStatusActive) {
		return nil, ErrAgentNotActive
	}

	// 4. Validate Service exists, is ACTIVE, and resolve recipient
	srv, err := s.repo.GetService(ctx, params.ServiceID)
	if err != nil {
		return nil, fmt.Errorf("service validation failed: %w", err)
	}
	if !srv.Enabled {
		return nil, ErrServiceNotActive
	}

	// 5. Generate secure intent
	intentID := generateID("pi_")
	now := time.Now()
	expiresAt := now.Add(15 * time.Minute)

	pi := &intent.PaymentIntent{
		IntentID:         intentID,
		OrganizationID:   orgID,
		AgentID:          params.AgentID,
		VaultAddress:     params.VaultAddress,
		Recipient:        srv.Recipient, // Server-resolved approved recipient
		Amount:           params.Amount,
		Asset:            params.Asset,
		Purpose:          params.Purpose,
		ServiceID:        params.ServiceID,
		Justification:    params.Justification,
		RequestID:        params.RequestID,
		Status:           intent.StatusCreated,
		RequiresApproval: false,
		CreatedAt:        now,
		ExpiresAt:        expiresAt,
		UpdatedAt:        now,
	}

	if err := s.repo.SaveIntent(ctx, pi); err != nil {
		return nil, fmt.Errorf("failed to save payment intent: %w", err)
	}

	// 6. Record Audit Event
	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: orgID,
		EventType:      domain.AuditEventPaymentCreated,
		ActorType:      "AGENT",
		ActorID:        params.AgentID,
		ResourceType:   "PAYMENT_INTENT",
		ResourceID:     intentID,
		RequestID:      params.RequestID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"amount":"%s","service_id":"%s"}`, params.Amount, params.ServiceID),
	})

	return pi, nil
}

// RecordPolicyDecision records the outcome of policy evaluation.
func (s *DefaultDomainService) RecordPolicyDecision(ctx context.Context, intentID string, decision domain.Decision, reasonCode domain.ReasonCode, reason string, requiresApproval bool) (*intent.PaymentIntent, error) {
	pi, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	pi.PolicyDecision = string(decision)
	pi.PolicyReason = string(reasonCode)
	pi.RequiresApproval = requiresApproval
	pi.UpdatedAt = now

	if decision == domain.DecisionDeny {
		pi.Status = intent.StatusDenied
	} else if requiresApproval {
		pi.Status = intent.StatusApprovalRequired
		// Create pending Approval record
		approval := &storage.Approval{
			ID:              generateID("appr_"),
			OrganizationID:  pi.OrganizationID,
			PaymentIntentID: pi.IntentID,
			Required:        true,
			Status:          string(domain.ApprovalStatusPending),
			RequestedAt:     now,
			CreatedAt:       now,
		}
		_ = s.repo.SaveApproval(ctx, approval)
	} else {
		pi.Status = intent.StatusAuthorized
	}

	if err := s.repo.UpdateIntentStatus(ctx, pi.IntentID, pi.Status, now); err != nil {
		return nil, err
	}

	// Record corresponding audit event
	eventType := domain.AuditEventPaymentAuthorized
	if decision == domain.DecisionDeny {
		eventType = domain.AuditEventPaymentDenied
	} else if requiresApproval {
		eventType = domain.AuditEventPaymentApprovalReq
	}

	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: pi.OrganizationID,
		EventType:      eventType,
		ActorType:      "SYSTEM",
		ActorID:        "policy_engine",
		ResourceType:   "PAYMENT_INTENT",
		ResourceID:     pi.IntentID,
		RequestID:      pi.RequestID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"decision":"%s","reason_code":"%s"}`, decision, reasonCode),
	})

	return pi, nil
}

// RecordApproval processes human approval or rejection.
// CRITICAL: Approval can authorize execution ONLY after deterministic policy authorization.
// Approval must NEVER turn a DENIED policy result into an executable payment.
func (s *DefaultDomainService) RecordApproval(ctx context.Context, orgID, intentID, approverID string, approved bool, reason string) (*intent.PaymentIntent, *domain.Approval, error) {
	pi, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, nil, err
	}

	if orgID != "" && pi.OrganizationID != orgID {
		return nil, nil, ErrOrganizationMismatch
	}

	// 1. Prohibit Agent Self-Approval (AI cannot approve its own payment)
	if strings.EqualFold(approverID, pi.AgentID) {
		return nil, nil, ErrAgentSelfApprovalProhibited
	}

	// 2. CRITICAL INVARIANT: Cannot approve a DENIED policy outcome
	if pi.PolicyDecision == string(domain.DecisionDeny) || pi.Status == intent.StatusDenied {
		return nil, nil, ErrCannotApproveDenied
	}

	// 3. Must be in APPROVAL_REQUIRED state
	if pi.Status != intent.StatusApprovalRequired {
		return nil, nil, ErrIntentNotPendingAppr
	}

	// 4. Intent Expiration Check
	now := time.Now()
	if now.After(pi.ExpiresAt) {
		_ = s.repo.UpdateIntentStatus(ctx, intentID, intent.StatusExpired, now)
		_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
			ID:             generateID("evt_"),
			OrganizationID: pi.OrganizationID,
			EventType:      domain.AuditEventPaymentApprovalExpired,
			ActorType:      "SYSTEM",
			ActorID:        "domain_service",
			ResourceType:   "PAYMENT_INTENT",
			ResourceID:     pi.IntentID,
			RequestID:      pi.RequestID,
			Timestamp:      now,
			Metadata:       `{"reason":"intent_expired_during_approval"}`,
		})
		return nil, nil, ErrIntentExpired
	}

	// 5. Check Approval Record Expiration
	appRec, _ := s.repo.GetApprovalByIntent(ctx, intentID)
	if appRec != nil && !appRec.ExpiresAt.IsZero() && now.After(appRec.ExpiresAt) {
		_ = s.repo.UpdateApprovalStatus(ctx, appRec.ID, string(domain.ApprovalStatusExpired), "", "Approval TTL elapsed", now)
		_ = s.repo.UpdateIntentStatus(ctx, intentID, intent.StatusExpired, now)
		_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
			ID:             generateID("evt_"),
			OrganizationID: pi.OrganizationID,
			EventType:      domain.AuditEventPaymentApprovalExpired,
			ActorType:      "SYSTEM",
			ActorID:        "domain_service",
			ResourceType:   "PAYMENT_INTENT",
			ResourceID:     pi.IntentID,
			RequestID:      pi.RequestID,
			Timestamp:      now,
			Metadata:       `{"reason":"approval_ttl_expired"}`,
		})
		return nil, nil, ErrApprovalExpired
	}

	var newStatus intent.IntentStatus
	var appStatus domain.ApprovalStatus
	var auditType domain.AuditEventType

	if approved {
		newStatus = intent.StatusApproved
		appStatus = domain.ApprovalStatusApproved
		auditType = domain.AuditEventPaymentApproved
	} else {
		newStatus = intent.StatusRejected
		appStatus = domain.ApprovalStatusRejected
		auditType = domain.AuditEventPaymentRejected
	}

	// 6. Atomic CAS Update on Intent Status to prevent concurrent approval races
	swapped, err := s.repo.CompareAndSwapIntentStatus(ctx, pi.IntentID, intent.StatusApprovalRequired, newStatus, now)
	if err != nil {
		return nil, nil, err
	}
	if !swapped {
		return nil, nil, ErrApprovalConflict
	}
	pi.Status = newStatus
	pi.UpdatedAt = now

	// 7. Atomic CAS Update or Save on Approval Record
	if appRec != nil {
		swappedApp, err := s.repo.CompareAndSwapApprovalStatus(ctx, appRec.ID, string(domain.ApprovalStatusPending), string(appStatus), approverID, reason, now)
		if err != nil {
			return nil, nil, err
		}
		if !swappedApp {
			return nil, nil, ErrApprovalConflict
		}
		appRec.Status = string(appStatus)
		appRec.ApprovedBy = approverID
		appRec.RejectionReason = reason
		appRec.ResolvedAt = &now
	} else {
		appRec = &storage.Approval{
			ID:              generateID("appr_"),
			OrganizationID:  pi.OrganizationID,
			PaymentIntentID: pi.IntentID,
			Required:        true,
			Status:          string(appStatus),
			RequestedAt:     now,
			ResolvedAt:      &now,
			ApprovedBy:      approverID,
			RejectionReason: reason,
			ExpiresAt:       now.Add(1 * time.Hour),
			CreatedAt:       now,
		}
		_ = s.repo.SaveApproval(ctx, appRec)
	}

	// 8. Record Audit Event
	_ = s.RecordAuditEvent(ctx, &domain.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: pi.OrganizationID,
		EventType:      auditType,
		ActorType:      "USER",
		ActorID:        approverID,
		ResourceType:   "PAYMENT_INTENT",
		ResourceID:     pi.IntentID,
		RequestID:      pi.RequestID,
		Timestamp:      now,
		Metadata:       fmt.Sprintf(`{"approved":%t,"reason":"%s"}`, approved, reason),
	})

	approvalResult := &domain.Approval{
		ID:              appRec.ID,
		OrganizationID:  appRec.OrganizationID,
		PaymentIntentID: appRec.PaymentIntentID,
		Required:        appRec.Required,
		Status:          appStatus,
		RequestedAt:     appRec.RequestedAt,
		ResolvedAt:      appRec.ResolvedAt,
		ApprovedBy:      appRec.ApprovedBy,
		RejectionReason: appRec.RejectionReason,
		ExpiresAt:       appRec.ExpiresAt,
		CreatedAt:       appRec.CreatedAt,
	}

	return pi, approvalResult, nil
}

// RecordExecution stores verified execution information.
func (s *DefaultDomainService) RecordExecution(ctx context.Context, ex *intent.PaymentExecutionRecord) error {
	return s.repo.SaveExecution(ctx, ex)
}

// RecordAuditEvent stores an append-only audit record.
func (s *DefaultDomainService) RecordAuditEvent(ctx context.Context, evt *domain.AuditEvent) error {
	storageEvt := &storage.AuditEvent{
		ID:             evt.ID,
		OrganizationID: evt.OrganizationID,
		EventType:      string(evt.EventType),
		ActorType:      evt.ActorType,
		ActorID:        evt.ActorID,
		ResourceType:   evt.ResourceType,
		ResourceID:     evt.ResourceID,
		RequestID:      evt.RequestID,
		Timestamp:      evt.Timestamp,
		Metadata:       evt.Metadata,
	}
	return s.repo.SaveAuditEvent(ctx, storageEvt)
}

// --- Helper Functions ---

func validateAmount(amtStr string) error {
	trimmed := strings.TrimSpace(amtStr)
	if trimmed == "" {
		return ErrInvalidAmount
	}
	val, ok := new(big.Int).SetString(trimmed, 10)
	if !ok || val.Sign() <= 0 {
		return ErrInvalidAmount
	}
	return nil
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}
