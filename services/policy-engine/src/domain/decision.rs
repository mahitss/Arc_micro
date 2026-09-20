use serde::{Deserialize, Serialize};

/// High-level authorization decision.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Decision {
    Allow,
    Deny,
    #[serde(rename = "APPROVAL_REQUIRED")]
    ApprovalRequired,
}

/// Explicit, deterministic reason codes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReasonCode {
    Approved,
    ApprovalRequired,
    AboveApprovalThreshold,
    PolicyDisabled,
    AgentPaused,
    OrganizationPaused,
    GlobalPaused,
    InvalidAmount,
    AmountExceedsTransactionLimit,
    DailyLimitExceeded,
    RecipientNotAllowed,
    RecipientBlocked,
    ServiceNotAllowed,
    AssetNotAllowed,
    DailyTransactionLimitExceeded,
    HourlyVelocityExceeded,
    RiskLow,
    RiskMedium,
    RiskHigh,
    InvalidRequest,
}

impl ReasonCode {
    /// Provide human-readable explanation for the reason code.
    pub fn default_message(&self) -> &'static str {
        match self {
            ReasonCode::Approved => "Payment satisfies the configured policy.",
            ReasonCode::ApprovalRequired => {
                "Payment requires human approval before it can be executed."
            }
            ReasonCode::AboveApprovalThreshold => {
                "Payment amount meets or exceeds the autonomous approval threshold."
            }
            ReasonCode::PolicyDisabled => "The policy for this agent is currently disabled.",
            ReasonCode::AgentPaused => "The agent is currently paused by operator.",
            ReasonCode::OrganizationPaused => "The organization is currently paused by administrator.",
            ReasonCode::GlobalPaused => "AgentPay policy engine is under emergency global pause.",
            ReasonCode::InvalidAmount => "Payment amount must be greater than zero.",
            ReasonCode::AmountExceedsTransactionLimit => {
                "Payment exceeds the single-transaction spending limit."
            }
            ReasonCode::DailyLimitExceeded => {
                "Payment would exceed the agent daily spending limit."
            }
            ReasonCode::RecipientNotAllowed => {
                "Recipient address is not on the allowed recipient list."
            }
            ReasonCode::RecipientBlocked => "Recipient address is on the blocked recipient list.",
            ReasonCode::ServiceNotAllowed => "Service is not on the allowed service list.",
            ReasonCode::AssetNotAllowed => "Asset is not supported or authorized by this policy.",
            ReasonCode::DailyTransactionLimitExceeded => {
                "Agent has reached its maximum authorized transactions for today."
            }
            ReasonCode::HourlyVelocityExceeded => {
                "Payment would exceed the configured hourly velocity limit."
            }
            ReasonCode::RiskLow => "Deterministic risk evaluation returned LOW risk.",
            ReasonCode::RiskMedium => "Deterministic risk evaluation returned MEDIUM risk.",
            ReasonCode::RiskHigh => "Deterministic risk evaluation returned HIGH risk.",
            ReasonCode::InvalidRequest => {
                "Payment request is invalid or missing required parameters."
            }
        }
    }
}

/// Deterministic rule check outcome for transparent explainability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuleCheck {
    pub rule: String,
    pub passed: bool,
    pub message: String,
}

/// Deterministic risk classification levels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

/// The result of an authorization evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuthorizationDecision {
    pub request_id: String,
    pub decision: Decision,
    pub reason_code: ReasonCode,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evaluated_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub risk_level: Option<RiskLevel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub risk_score: Option<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub checks: Vec<RuleCheck>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_daily_limit: Option<u64>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub simulation: bool,
}

impl AuthorizationDecision {
    /// Create an ALLOW decision with default approved reason.
    pub fn allow(request_id: impl Into<String>) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::Allow,
            reason_code: ReasonCode::Approved,
            reason: ReasonCode::Approved.default_message().to_string(),
            policy_id: None,
            evaluated_at: None,
            risk_level: Some(RiskLevel::Low),
            risk_score: Some(0),
            checks: Vec::new(),
            remaining_daily_limit: None,
            simulation: false,
        }
    }

    /// Create a DENY decision with a specific reason code.
    pub fn deny(request_id: impl Into<String>, code: ReasonCode) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::Deny,
            reason_code: code,
            reason: code.default_message().to_string(),
            policy_id: None,
            evaluated_at: None,
            risk_level: None,
            risk_score: None,
            checks: Vec::new(),
            remaining_daily_limit: None,
            simulation: false,
        }
    }

    /// Create a DENY decision with a custom reason explanation.
    pub fn deny_with_message(
        request_id: impl Into<String>,
        code: ReasonCode,
        message: impl Into<String>,
    ) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::Deny,
            reason_code: code,
            reason: message.into(),
            policy_id: None,
            evaluated_at: None,
            risk_level: None,
            risk_score: None,
            checks: Vec::new(),
            remaining_daily_limit: None,
            simulation: false,
        }
    }

    /// Create an APPROVAL_REQUIRED decision.
    pub fn approval_required(request_id: impl Into<String>, code: ReasonCode) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::ApprovalRequired,
            reason_code: code,
            reason: code.default_message().to_string(),
            policy_id: None,
            evaluated_at: None,
            risk_level: None,
            risk_score: None,
            checks: Vec::new(),
            remaining_daily_limit: None,
            simulation: false,
        }
    }

    /// Create an APPROVAL_REQUIRED decision with custom reason explanation.
    pub fn approval_required_with_message(
        request_id: impl Into<String>,
        code: ReasonCode,
        message: impl Into<String>,
    ) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::ApprovalRequired,
            reason_code: code,
            reason: message.into(),
            policy_id: None,
            evaluated_at: None,
            risk_level: None,
            risk_score: None,
            checks: Vec::new(),
            remaining_daily_limit: None,
            simulation: false,
        }
    }
}
