package constitution

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

// ConstitutionStatus defines the formal lifecycle states of an Economic Constitution.
type ConstitutionStatus string

const (
	StatusDraft       ConstitutionStatus = "DRAFT"
	StatusSimulated   ConstitutionStatus = "SIMULATED"
	StatusUnderReview ConstitutionStatus = "UNDER_REVIEW"
	StatusApproved    ConstitutionStatus = "APPROVED"
	StatusActive      ConstitutionStatus = "ACTIVE"
	StatusSuperseded  ConstitutionStatus = "SUPERSEDED"
	StatusRevoked     ConstitutionStatus = "REVOKED"
)

// RuleType categorizes explicit constitutional policy rules.
type RuleType string

const (
	RuleTypeSpendingLimit  RuleType = "SPENDING_LIMIT"
	RuleTypeRecipientRule  RuleType = "RECIPIENT_RULE"
	RuleTypeAssetRule      RuleType = "ASSET_RULE"
	RuleTypeTimeRule       RuleType = "TIME_RULE"
	RuleTypeRiskRule       RuleType = "RISK_RULE"
	RuleTypeApprovalRule   RuleType = "APPROVAL_RULE"
	RuleTypeDelegationRule RuleType = "DELEGATION_RULE"
	RuleTypeMissionRule    RuleType = "MISSION_RULE"
	RuleTypeSwarmRule      RuleType = "SWARM_RULE"
	RuleTypeHardDeny       RuleType = "HARD_DENY"
)

// RuleScope defines the hierarchical application boundary of a rule.
type RuleScope string

const (
	ScopeGlobal       RuleScope = "GLOBAL"
	ScopeOrganization RuleScope = "ORGANIZATION"
	ScopeAgent        RuleScope = "AGENT"
	ScopeMission      RuleScope = "MISSION"
	ScopeSwarm        RuleScope = "SWARM"
	ScopeTask         RuleScope = "TASK"
	ScopePayment      RuleScope = "PAYMENT"
)

// SpendingLimitRule defines deterministic financial spend ceilings in base units (e.g., micro-USDC).
type SpendingLimitRule struct {
	MaxSinglePayment   string `json:"max_single_payment,omitempty"`   // Maximum allowable spend for a single transaction
	DailyBudgetLimit   string `json:"daily_budget_limit,omitempty"`   // Daily spend ceiling
	HourlyVelocityLimit string `json:"hourly_velocity_limit,omitempty"` // Hourly velocity spend ceiling
	MaxMissionSpend    string `json:"max_mission_spend,omitempty"`    // Max budget for an autonomous mission
	MaxSwarmSpend      string `json:"max_swarm_spend,omitempty"`      // Max collective budget for a swarm
	MaxAgentDailySpend string `json:"max_agent_daily_spend,omitempty"`// Max daily spend per agent
	Currency           string `json:"currency"`                      // Authorized asset (e.g., "USDC")
}

// RecipientRule defines allowlists and denylists for Counterparties, Services, and Organizations.
type RecipientRule struct {
	AllowedServices      []string `json:"allowed_services,omitempty"`
	BlockedServices      []string `json:"blocked_services,omitempty"`
	AllowedOrganizations []string `json:"allowed_organizations,omitempty"`
	BlockedOrganizations []string `json:"blocked_organizations,omitempty"`
	AllowedCapabilities  []string `json:"allowed_capabilities,omitempty"`
	BlockedCapabilities  []string `json:"blocked_capabilities,omitempty"`
	AllowedAgents        []string `json:"allowed_agents,omitempty"`
	BlockedAgents        []string `json:"blocked_agents,omitempty"`
}

// AssetRule restricts settlement currencies.
type AssetRule struct {
	AllowedAssets []string `json:"allowed_assets"` // Strictly ["USDC"] by default
	DefaultAsset  string   `json:"default_asset"`
}

// TimeRule sets allowed execution schedules and maintenance windows.
type TimeRule struct {
	AllowedHoursUTC []int      `json:"allowed_hours_utc,omitempty"` // 0-23
	BlackoutStart   *time.Time `json:"blackout_start,omitempty"`
	BlackoutEnd     *time.Time `json:"blackout_end,omitempty"`
	ExpiresAt       *time.Time `json:"expires_at,omitempty"`
}

// RiskRule establishes deterministic risk and anomaly thresholds.
type RiskRule struct {
	MaxRiskScore         uint32  `json:"max_risk_score"`                    // 0-100
	MaxRiskLevel         string  `json:"max_risk_level"`                    // "LOW", "MEDIUM", "HIGH"
	MaxAnomalyScore      float64 `json:"max_anomaly_score,omitempty"`       // Max anomaly score (0.0 - 1.0)
	MinTrustScoreBps     uint32  `json:"min_trust_score_bps,omitempty"`     // Minimum counterparty trust score in basis points (0-10000)
	MaxExternalAgentRisk string  `json:"max_external_agent_risk,omitempty"` // "LOW" or "MEDIUM"
}

// ApprovalRule establishes deterministic triggers for mandatory human authorization.
type ApprovalRule struct {
	AmountThreshold              string `json:"amount_threshold,omitempty"`                // Amount in base units requiring approval
	RequireOnNewRecipient        bool   `json:"require_on_new_recipient,omitempty"`         // Require approval if counterparty has no prior tx
	RequireOnExternalAgent       bool   `json:"require_on_external_agent,omitempty"`        // Require approval for any third-party agent
	RequireOnHighRiskCapability  bool   `json:"require_on_high_risk_capability,omitempty"` // Require approval for high-risk capabilities
}

// DelegationRule enforces bounded subcontracting invariants.
type DelegationRule struct {
	MaxDelegationDepth         int      `json:"max_delegation_depth"`                   // Strictly <= 3
	MaxInheritedBudgetPct      int      `json:"max_inherited_budget_pct"`               // Percentage of parent budget (0-100)
	AllowedSubcontractCaps     []string `json:"allowed_subcontract_caps,omitempty"`     // Authorized capabilities for delegation
	ProhibitUnverifiedProvider bool     `json:"prohibit_unverified_provider,omitempty"` // Reject providers without attestation
}

// MissionRule configures constraints for autonomous multi-step missions.
type MissionRule struct {
	MaxDurationSeconds int    `json:"max_duration_seconds,omitempty"` // Timeout
	MaxBudget          string `json:"max_budget,omitempty"`           // Overall cap
	MaxExternalAgents  int    `json:"max_external_agents,omitempty"`  // Concurrency cap on external agents
	MaxParallelTasks   int    `json:"max_parallel_tasks,omitempty"`   // Parallelism cap
}

// SwarmRule configures constraints for agent collectives.
type SwarmRule struct {
	MaxSwarmBudget     string `json:"max_swarm_budget,omitempty"`     // Swarm budget ceiling
	MaxTaskFanOut      int    `json:"max_task_fan_out,omitempty"`      // Max fan-out factor
	MaxConcurrentAgents int   `json:"max_concurrent_agents,omitempty"`// Max active agents
	MaxDelegatedSpend  string `json:"max_delegated_spend,omitempty"`  // Max spend across subcontracts
}

// HardDenyRule represents an absolute prohibition that CANNOT be overridden by human approval.
type HardDenyRule struct {
	RuleID         string `json:"rule_id"`
	Description    string `json:"description"`
	MatchCondition string `json:"match_condition"` // E.g. "BLOCKED_SERVICE", "UNAUTHORIZED_TOKEN", "ARBITRARY_CODE", "EXCEED_DELEGATION_DEPTH_3", "ZERO_AUTHORITY_VIOLATION"
	ReasonCode     string `json:"reason_code"`
}

// ConstitutionRule wraps a concrete rule definition with scope, priority, and metadata.
type ConstitutionRule struct {
	RuleID         string             `json:"rule_id"`
	Type           RuleType           `json:"type"`
	Scope          RuleScope          `json:"scope"`
	Description    string             `json:"description"`
	HardDeny       bool               `json:"hard_deny"`
	Priority       int                `json:"priority"` // Higher evaluates first
	SpendingLimit  *SpendingLimitRule  `json:"spending_limit,omitempty"`
	RecipientRule  *RecipientRule     `json:"recipient_rule,omitempty"`
	AssetRule      *AssetRule         `json:"asset_rule,omitempty"`
	TimeRule       *TimeRule          `json:"time_rule,omitempty"`
	RiskRule       *RiskRule          `json:"risk_rule,omitempty"`
	ApprovalRule   *ApprovalRule      `json:"approval_rule,omitempty"`
	DelegationRule *DelegationRule    `json:"delegation_rule,omitempty"`
	MissionRule    *MissionRule       `json:"mission_rule,omitempty"`
	SwarmRule      *SwarmRule         `json:"swarm_rule,omitempty"`
	HardDenyRule   *HardDenyRule      `json:"hard_deny_rule,omitempty"`
}

// EconomicConstitution is the first-class, versioned financial charter of an organization.
type EconomicConstitution struct {
	ConstitutionID  string             `json:"constitution_id"`
	OrganizationID  string             `json:"organization_id"`
	Name            string             `json:"name"`
	Description     string             `json:"description"`
	Version         uint64             `json:"version"`
	Status          ConstitutionStatus `json:"status"`
	EffectiveAt     *time.Time         `json:"effective_at,omitempty"`
	CreatedAt       time.Time          `json:"created_at"`
	CreatedBy       string             `json:"created_by"`
	PreviousVersion uint64             `json:"previous_version"`
	PolicyHash      string             `json:"policy_hash"` // SHA-256 of canonical JSON
	Rules           []ConstitutionRule `json:"rules"`
	HardDenyRules   []HardDenyRule     `json:"hard_deny_rules,omitempty"`
	Metadata        map[string]string  `json:"metadata,omitempty"`
}

// CalculatePolicyHash computes a deterministic SHA-256 fingerprint over canonical constitution contents.
func (c *EconomicConstitution) CalculatePolicyHash() string {
	// Sort rules deterministically by RuleID before hashing
	sortedRules := make([]ConstitutionRule, len(c.Rules))
	copy(sortedRules, c.Rules)
	sort.Slice(sortedRules, func(i, j int) bool {
		return sortedRules[i].RuleID < sortedRules[j].RuleID
	})

	canonicalObj := struct {
		ConstitutionID  string             `json:"constitution_id"`
		OrganizationID  string             `json:"organization_id"`
		Version         uint64             `json:"version"`
		Rules           []ConstitutionRule `json:"rules"`
		HardDenyRules   []HardDenyRule     `json:"hard_deny_rules,omitempty"`
		PreviousVersion uint64             `json:"previous_version"`
	}{
		ConstitutionID:  c.ConstitutionID,
		OrganizationID:  c.OrganizationID,
		Version:         c.Version,
		Rules:           sortedRules,
		HardDenyRules:   c.HardDenyRules,
		PreviousVersion: c.PreviousVersion,
	}

	bytes, _ := json.Marshal(canonicalObj)
	hash := sha256.Sum256(bytes)
	return hex.EncodeToString(hash[:])
}

// PolicyEvaluationContext contains all parameters necessary to deterministically evaluate an action.
type PolicyEvaluationContext struct {
	OrganizationID        string    `json:"organization_id"`
	AgentID               string    `json:"agent_id"`
	MissionID             string    `json:"mission_id,omitempty"`
	SwarmID               string    `json:"swarm_id,omitempty"`
	TaskID                string    `json:"task_id,omitempty"`
	ServiceID             string    `json:"service_id,omitempty"`
	ExternalAgentID       string    `json:"external_agent_id,omitempty"`
	Capability            string    `json:"capability,omitempty"`
	PaymentIntentID       string    `json:"payment_intent_id,omitempty"`
	Amount                string    `json:"amount"` // Base units (e.g. "1000000" = 1 USDC)
	Currency              string    `json:"currency"`
	RecipientAddress      string    `json:"recipient_address"`
	RiskLevel             string    `json:"risk_level,omitempty"` // "LOW", "MEDIUM", "HIGH"
	RiskScore             uint32    `json:"risk_score,omitempty"` // 0 - 100
	TrustScoreBps         uint32    `json:"trust_score_bps,omitempty"` // 0 - 10000
	AnomalyScore          float64   `json:"anomaly_score,omitempty"`
	DelegationDepth       int       `json:"delegation_depth"`
	HistoricalDailySpend  string    `json:"historical_daily_spend,omitempty"`
	HistoricalHourlySpend string    `json:"historical_hourly_spend,omitempty"`
	CurrentMissionSpend   string    `json:"current_mission_spend,omitempty"`
	CurrentSwarmSpend     string    `json:"current_swarm_spend,omitempty"`
	IsGlobalPaused        bool      `json:"is_global_paused"`
	IsOrganizationPaused  bool      `json:"is_organization_paused"`
	IsAgentPaused         bool      `json:"is_agent_paused"`
	ConstitutionVersion   uint64    `json:"constitution_version"`
	Timestamp             time.Time `json:"timestamp"`
}

// ConstitutionDecision represents the deterministic authorization verdict.
type ConstitutionDecision struct {
	ConstitutionID string            `json:"constitution_id"`
	Version        uint64            `json:"version"`
	Decision       domain.Decision   `json:"decision"` // ALLOW, DENY, REQUIRE_APPROVAL
	ReasonCode     domain.ReasonCode `json:"reason_code"`
	Reason         string            `json:"reason"`
	MatchedRules   []string          `json:"matched_rules"`
	DeniedRules    []string          `json:"denied_rules"`
	ApprovalRules  []string          `json:"approval_rules"`
	Explanation    string            `json:"explanation"`
	EvaluationHash string            `json:"evaluation_hash"`
	EvaluatedAt    time.Time         `json:"evaluated_at"`
}

// PolicySnapshot captures immutable policy state at transaction authorization time.
type PolicySnapshot struct {
	SnapshotID             string            `json:"snapshot_id"`
	ConstitutionID         string            `json:"constitution_id"`
	Version                uint64            `json:"version"`
	PolicyHash             string            `json:"policy_hash"`
	Decision               domain.Decision   `json:"decision"`
	EvaluationContextHash  string            `json:"evaluation_context_hash"`
	EffectiveLimits        map[string]string `json:"effective_limits"`
	MatchedRules           []string          `json:"matched_rules"`
	EvaluatedAt            time.Time         `json:"evaluated_at"`
}

// AuthorityDelta summarizes the quantitative shift in financial authority between two policy versions.
type AuthorityDelta struct {
	SpendingDelta       string `json:"spending_delta"`        // E.g. "+30.00 USDC" or "-10.00 USDC"
	RecipientDelta      string `json:"recipient_delta"`       // E.g. "+2 services, -1 organization"
	DelegationDelta     string `json:"delegation_delta"`      // E.g. "Depth 2 -> 4"
	RiskToleranceDelta  string `json:"risk_tolerance_delta"`  // E.g. "Max Risk 80 -> 90"
	ApprovalDelta       string `json:"approval_delta"`        // E.g. "Threshold 10 -> 25 USDC"
	Classification      string `json:"classification"`        // "MORE_RESTRICTIVE", "UNCHANGED", "MORE_PERMISSIVE"
	Explanation         string `json:"explanation"`
}

// RuleModification tracks diff details for a specific rule.
type RuleModification struct {
	RuleID      string `json:"rule_id"`
	Type        RuleType `json:"type"`
	Description string `json:"description"`
	OldDetails  string `json:"old_details"`
	NewDetails  string `json:"new_details"`
	ChangeType  string `json:"change_type"` // "AUTHORITY_INCREASE", "AUTHORITY_DECREASE", "NEUTRAL"
}

// PolicyDiff details structural differences between Constitution A and Constitution B.
type PolicyDiff struct {
	OldVersion     uint64             `json:"old_version"`
	NewVersion     uint64             `json:"new_version"`
	AddedRules     []ConstitutionRule `json:"added_rules"`
	RemovedRules   []ConstitutionRule `json:"removed_rules"`
	ModifiedRules  []RuleModification `json:"modified_rules"`
	UnchangedRules []ConstitutionRule `json:"unchanged_rules"`
	AuthorityDelta AuthorityDelta     `json:"authority_delta"`
}

// PolicyChangeRequest governs the proposal, review, simulation, and activation lifecycle of a policy revision.
type PolicyChangeRequest struct {
	RequestID            string                 `json:"request_id"`
	OrganizationID       string                 `json:"organization_id"`
	CurrentVersion       uint64                 `json:"current_version"`
	ProposedVersion      uint64                 `json:"proposed_version"`
	ProposedConstitution EconomicConstitution   `json:"proposed_constitution"`
	AuthorityDelta       AuthorityDelta         `json:"authority_delta"`
	SimulationSummary    map[string]interface{} `json:"simulation_summary,omitempty"`
	RiskSummary          string                 `json:"risk_summary"`
	Proposer             string                 `json:"proposer"`
	Reviewer             string                 `json:"reviewer,omitempty"`
	Approver             string                 `json:"approver,omitempty"`
	Status               string                 `json:"status"` // "DRAFT", "UNDER_REVIEW", "REJECTED", "APPROVED", "ACTIVATED", "EXPIRED", "CANCELLED"
	CreatedAt            time.Time              `json:"created_at"`
	ReviewedAt           *time.Time             `json:"reviewed_at,omitempty"`
	ApprovedAt           *time.Time             `json:"approved_at,omitempty"`
	ActivatedAt          *time.Time             `json:"activated_at,omitempty"`
}

// PolicyTestCase defines a test scenario used to validate a constitution prior to activation.
type PolicyTestCase struct {
	Name               string                  `json:"name"`
	Description        string                  `json:"description"`
	Context            PolicyEvaluationContext `json:"context"`
	ExpectedDecision   domain.Decision         `json:"expected_decision"`
	ExpectedReasonCode domain.ReasonCode       `json:"expected_reason_code"`
	ExpectedRules      []string                `json:"expected_rules,omitempty"`
}

// DefaultConstitution generates the canonical initial Constitution (v1) for an organization.
func DefaultConstitution(orgID string) EconomicConstitution {
	now := time.Now().UTC()
	c := EconomicConstitution{
		ConstitutionID:  fmt.Sprintf("const_%s", orgID),
		OrganizationID:  orgID,
		Name:            "Standard Organization Financial Constitution",
		Description:     "Deterministic baseline controls for autonomous agent spending, bounded delegation, and Arc USDC settlement.",
		Version:         1,
		Status:          StatusActive,
		EffectiveAt:     &now,
		CreatedAt:       now,
		CreatedBy:       "system_genesis",
		PreviousVersion: 0,
		Metadata: map[string]string{
			"standard": "AgentPay RFC 003 Constitutional Governance",
			"tier":     "Production Enterprise",
		},
		Rules: []ConstitutionRule{
			{
				RuleID:      "SPEND_BASE_01",
				Type:        RuleTypeSpendingLimit,
				Scope:       ScopeOrganization,
				Description: "Maximum 10 USDC per single payment, 100 USDC daily cap, 50 USDC hourly velocity cap",
				HardDeny:    false,
				Priority:    100,
				SpendingLimit: &SpendingLimitRule{
					MaxSinglePayment:    "10000000",  // 10 USDC
					DailyBudgetLimit:    "100000000", // 100 USDC
					HourlyVelocityLimit: "50000000",  // 50 USDC
					MaxMissionSpend:     "50000000",  // 50 USDC
					MaxSwarmSpend:       "100000000", // 100 USDC
					MaxAgentDailySpend:  "25000000",  // 25 USDC
					Currency:            "USDC",
				},
			},
			{
				RuleID:      "ASSET_USDC_01",
				Type:        RuleTypeAssetRule,
				Scope:       ScopeGlobal,
				Description: "Strictly allow USDC settlement on Arc",
				HardDeny:    true,
				Priority:    200,
				AssetRule: &AssetRule{
					AllowedAssets: []string{"USDC"},
					DefaultAsset:  "USDC",
				},
			},
			{
				RuleID:      "APPROVAL_HIGH_VALUE_01",
				Type:        RuleTypeApprovalRule,
				Scope:       ScopeOrganization,
				Description: "Mandate human approval for payments exceeding 10 USDC or involving external unverified counterparties",
				HardDeny:    false,
				Priority:    90,
				ApprovalRule: &ApprovalRule{
					AmountThreshold:             "10000000", // 10 USDC
					RequireOnNewRecipient:       true,
					RequireOnExternalAgent:      true,
					RequireOnHighRiskCapability: true,
				},
			},
			{
				RuleID:      "DELEGATION_BOUND_01",
				Type:        RuleTypeDelegationRule,
				Scope:       ScopeOrganization,
				Description: "Enforce strict delegation depth limit <= 3 and anti-cycle DAG",
				HardDeny:    true,
				Priority:    150,
				DelegationRule: &DelegationRule{
					MaxDelegationDepth:         3,
					MaxInheritedBudgetPct:      50,
					ProhibitUnverifiedProvider: true,
				},
			},
			{
				RuleID:      "RISK_CEILING_01",
				Type:        RuleTypeRiskRule,
				Scope:       ScopeOrganization,
				Description: "Block any transaction exceeding risk score 80 or anomaly score 0.85",
				HardDeny:    false,
				Priority:    80,
				RiskRule: &RiskRule{
					MaxRiskScore:         80,
					MaxRiskLevel:         "MEDIUM",
					MaxAnomalyScore:      0.85,
					MinTrustScoreBps:     7000, // 70% minimum trust
					MaxExternalAgentRisk: "MEDIUM",
				},
			},
		},
		HardDenyRules: []HardDenyRule{
			{
				RuleID:         "HARD_DENY_UNAUTHORIZED_TOKEN",
				Description:    "Zero execution of unlisted or arbitrary ERC-20 tokens",
				MatchCondition: "UNAUTHORIZED_TOKEN",
				ReasonCode:     "ASSET_BLOCKED",
			},
			{
				RuleID:         "HARD_DENY_DELEGATION_OVERFLOW",
				Description:    "Subcontracts exceeding delegation depth 3 are unconditionally rejected",
				MatchCondition: "EXCEED_DELEGATION_DEPTH_3",
				ReasonCode:     "DELEGATION_DEPTH_EXCEEDED",
			},
			{
				RuleID:         "HARD_DENY_AGENT_KEY_MUTATION",
				Description:    "AI agents holding or attempting direct vault balance mutation",
				MatchCondition: "ZERO_AUTHORITY_VIOLATION",
				ReasonCode:     "AGENT_ZERO_AUTHORITY_VIOLATED",
			},
		},
	}
	c.PolicyHash = c.CalculatePolicyHash()
	return c
}
