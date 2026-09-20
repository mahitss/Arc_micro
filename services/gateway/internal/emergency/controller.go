package emergency

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrAgentNotFound        = errors.New("agent not found")
	ErrOrganizationNotFound = errors.New("organization not found")
	ErrInvalidActor         = errors.New("invalid actor: actor_id is required for emergency operations")
)

const GlobalExecutionKey = "global_execution"

// Controller manages the multi-tier emergency control plane (Agent, Organization, Global).
type Controller interface {
	PauseAgent(ctx context.Context, orgID, agentID, actorID string) error
	ResumeAgent(ctx context.Context, orgID, agentID, actorID string) error

	PauseOrganization(ctx context.Context, orgID, actorID string) error
	ResumeOrganization(ctx context.Context, orgID, actorID string) error

	PauseGlobalExecution(ctx context.Context, actorID string) error
	ResumeGlobalExecution(ctx context.Context, actorID string) error
	IsGlobalExecutionPaused(ctx context.Context) (bool, error)
}

// DefaultController implements Controller.
type DefaultController struct {
	repo storage.Repository
}

// NewController creates a new emergency DefaultController.
func NewController(repo storage.Repository) *DefaultController {
	return &DefaultController{repo: repo}
}

// PauseAgent halts payment execution for a specific agent.
// Note: Existing blockchain transactions already submitted cannot be reversed.
func (c *DefaultController) PauseAgent(ctx context.Context, orgID, agentID, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	ag, err := c.repo.GetAgent(ctx, agentID)
	if err != nil {
		return ErrAgentNotFound
	}

	if orgID != "" && ag.OrganizationID != orgID && ag.OrganizationID != "" {
		return fmt.Errorf("cross-organization access denied")
	}

	now := time.Now()
	ag.Status = string(domain.AgentStatusPaused)
	ag.UpdatedAt = now

	if err := c.repo.SaveAgent(ctx, ag); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: ag.OrganizationID,
		EventType:      string(domain.AuditEventAgentPaused),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "AGENT",
		ResourceID:     agentID,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"pause_agent","status":"PAUSED"}`,
	})

	return nil
}

// ResumeAgent restores an agent to ACTIVE status.
func (c *DefaultController) ResumeAgent(ctx context.Context, orgID, agentID, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	ag, err := c.repo.GetAgent(ctx, agentID)
	if err != nil {
		return ErrAgentNotFound
	}

	if orgID != "" && ag.OrganizationID != orgID && ag.OrganizationID != "" {
		return fmt.Errorf("cross-organization access denied")
	}

	now := time.Now()
	ag.Status = string(domain.AgentStatusActive)
	ag.UpdatedAt = now

	if err := c.repo.SaveAgent(ctx, ag); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: ag.OrganizationID,
		EventType:      string(domain.AuditEventAgentResumed),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "AGENT",
		ResourceID:     agentID,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"resume_agent","status":"ACTIVE"}`,
	})

	return nil
}

// PauseOrganization halts payment execution for all agents under this organization.
func (c *DefaultController) PauseOrganization(ctx context.Context, orgID, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	org, err := c.repo.GetOrganization(ctx, orgID)
	if err != nil {
		return ErrOrganizationNotFound
	}

	now := time.Now()
	org.Status = "PAUSED"
	org.UpdatedAt = now

	if err := c.repo.SaveOrganization(ctx, org); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: orgID,
		EventType:      string(domain.AuditEventOrgPaused),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "ORGANIZATION",
		ResourceID:     orgID,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"pause_organization","status":"PAUSED"}`,
	})

	return nil
}

// ResumeOrganization restores an organization to ACTIVE status.
func (c *DefaultController) ResumeOrganization(ctx context.Context, orgID, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	org, err := c.repo.GetOrganization(ctx, orgID)
	if err != nil {
		return ErrOrganizationNotFound
	}

	now := time.Now()
	org.Status = "ACTIVE"
	org.UpdatedAt = now

	if err := c.repo.SaveOrganization(ctx, org); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: orgID,
		EventType:      string(domain.AuditEventOrgResumed),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "ORGANIZATION",
		ResourceID:     orgID,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"resume_organization","status":"ACTIVE"}`,
	})

	return nil
}

// PauseGlobalExecution engages the global payment execution kill switch.
// Payment creation and observability remain operational, but NO blockchain execution may occur.
func (c *DefaultController) PauseGlobalExecution(ctx context.Context, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	now := time.Now()
	if err := c.repo.SetSystemState(ctx, GlobalExecutionKey, "PAUSED", actorID, now); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: "system",
		EventType:      string(domain.AuditEventSystemExecutionPaused),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "SYSTEM",
		ResourceID:     GlobalExecutionKey,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"pause_global_execution","status":"PAUSED"}`,
	})

	return nil
}

// ResumeGlobalExecution disengages the global payment execution kill switch.
func (c *DefaultController) ResumeGlobalExecution(ctx context.Context, actorID string) error {
	if actorID == "" {
		return ErrInvalidActor
	}

	now := time.Now()
	if err := c.repo.SetSystemState(ctx, GlobalExecutionKey, "ACTIVE", actorID, now); err != nil {
		return err
	}

	// Audit Event
	_ = c.repo.SaveAuditEvent(ctx, &storage.AuditEvent{
		ID:             generateID("evt_"),
		OrganizationID: "system",
		EventType:      string(domain.AuditEventSystemExecutionResumed),
		ActorType:      "USER",
		ActorID:        actorID,
		ResourceType:   "SYSTEM",
		ResourceID:     GlobalExecutionKey,
		RequestID:      generateID("req_"),
		Timestamp:      now,
		Metadata:       `{"action":"resume_global_execution","status":"ACTIVE"}`,
	})

	return nil
}

// IsGlobalExecutionPaused reports whether the global kill switch is currently engaged.
func (c *DefaultController) IsGlobalExecutionPaused(ctx context.Context) (bool, error) {
	val, err := c.repo.GetSystemState(ctx, GlobalExecutionKey)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			return false, nil // Default is unpaused / ACTIVE
		}
		// Fail closed on error
		return true, err
	}
	return val == "PAUSED", nil
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}
