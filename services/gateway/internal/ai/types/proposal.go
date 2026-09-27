package types

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// ProposalType defines the category of action proposed by the AI model.
type ProposalType string

const (
	ProposalTypePlan                   ProposalType = "PLAN"
	ProposalTypeServiceSelection       ProposalType = "SERVICE_SELECTION"
	ProposalTypeNegotiation            ProposalType = "NEGOTIATION"
	ProposalTypeReplan                 ProposalType = "REPLAN"
	ProposalTypeSwarmAssignment        ProposalType = "SWARM_ASSIGNMENT"
	ProposalTypeResultEvaluation       ProposalType = "RESULT_EVALUATION"
	ProposalTypeMarketplaceMatch       ProposalType = "MARKETPLACE_MATCH"
	ProposalTypeEconomicRecommendation ProposalType = "ECONOMIC_RECOMMENDATION"
)

// ProposalStatus tracks the lifecycle status of an AI proposal.
type ProposalStatus string

const (
	ProposalStatusProposed      ProposalStatus = "PROPOSED"
	ProposalStatusValidating    ProposalStatus = "VALIDATING"
	ProposalStatusRejected      ProposalStatus = "REJECTED"
	ProposalStatusPolicyAllowed ProposalStatus = "POLICY_ALLOWED"
	ProposalStatusPolicyDenied  ProposalStatus = "POLICY_DENIED"
	ProposalStatusApproved      ProposalStatus = "APPROVED"
	ProposalStatusConsumed      ProposalStatus = "CONSUMED"
	ProposalStatusExpired       ProposalStatus = "EXPIRED"
)

// AIProposal represents a formal, immutable proposal emitted by the AI provider layer.
// ARCHITECTURAL RULE:
// An AIProposal is ADVISORY. It has ZERO authority to execute funds directly.
// To move funds, an AIProposal MUST be validated by deterministic Go rules,
// checked by the Rust Policy Engine, evaluated by Risk Engine, authorized by Approval Engine,
// reserved by Treasury, and submitted to the isolated Execution Relayer.
type AIProposal struct {
	ProposalID           string                 `json:"proposal_id"`
	ProposalHash         string                 `json:"proposal_hash,omitempty"`
	MissionID            string                 `json:"mission_id"`
	AgentID              string                 `json:"agent_id"`
	ProposalType         ProposalType           `json:"proposal_type"`
	RequestedAction      string                 `json:"requested_action"`
	ReasoningSummary     string                 `json:"reasoning_summary"`
	StructuredParameters map[string]interface{} `json:"structured_parameters"`
	Model                string                 `json:"model"`
	Provider             string                 `json:"provider"`
	PromptVersion        string                 `json:"prompt_version"`
	RequestID            string                 `json:"request_id"`
	CorrelationID        string                 `json:"correlation_id"`
	Status               ProposalStatus         `json:"status"`
	CreatedAt            time.Time              `json:"created_at"`
	ExpiresAt            time.Time              `json:"expires_at"`
	RejectionReason      string                 `json:"rejection_reason,omitempty"`
}

// ComputeHash computes a deterministic SHA-256 fingerprint of the proposal content to prevent replay attacks.
func (p *AIProposal) ComputeHash() (string, error) {
	canonicalData := struct {
		MissionID       string                 `json:"mission_id"`
		AgentID         string                 `json:"agent_id"`
		ProposalType    ProposalType           `json:"proposal_type"`
		RequestedAction string                 `json:"requested_action"`
		Params          map[string]interface{} `json:"params"`
	}{
		MissionID:       p.MissionID,
		AgentID:         p.AgentID,
		ProposalType:    p.ProposalType,
		RequestedAction: p.RequestedAction,
		Params:          p.StructuredParameters,
	}

	bytes, err := json.Marshal(canonicalData)
	if err != nil {
		return "", fmt.Errorf("failed to marshal proposal for hashing: %w", err)
	}

	hash := sha256.Sum256(bytes)
	return hex.EncodeToString(hash[:]), nil
}

// IsExpired checks if the proposal has passed its validity window.
func (p *AIProposal) IsExpired(now time.Time) bool {
	return !p.ExpiresAt.IsZero() && now.After(p.ExpiresAt)
}

// ValidateIntegrity performs baseline schema and safety checks on the proposal.
func (p *AIProposal) ValidateIntegrity() error {
	if p.ProposalID == "" {
		return NewAIError(ErrCodeInvalidSchema, "proposal_id is required", false, nil)
	}
	if p.AgentID == "" {
		return NewAIError(ErrCodeInvalidSchema, "agent_id is required", false, nil)
	}
	if p.ProposalType == "" {
		return NewAIError(ErrCodeInvalidSchema, "proposal_type is required", false, nil)
	}
	if p.ReasoningSummary == "" {
		return NewAIError(ErrCodeInvalidSchema, "reasoning_summary is required", false, nil)
	}
	if p.StructuredParameters == nil {
		return NewAIError(ErrCodeInvalidSchema, "structured_parameters cannot be nil", false, nil)
	}
	return nil
}
