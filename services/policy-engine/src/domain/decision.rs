use serde::{Deserialize, Serialize};

/// High-level authorization decision.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Decision {
    Allow,
    Deny,
}

/// Explicit, deterministic reason codes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReasonCode {
    Approved,
    PolicyDisabled,
    InvalidAmount,
    AmountExceedsTransactionLimit,
    DailyLimitExceeded,
    RecipientNotAllowed,
    RecipientBlocked,
    AssetNotAllowed,
    DailyTransactionLimitExceeded,
    InvalidRequest,
}

impl ReasonCode {
    /// Provide human-readable explanation for the reason code.
    pub fn default_message(&self) -> &'static str {
        match self {
            ReasonCode::Approved => "Payment satisfies the configured policy.",
            ReasonCode::PolicyDisabled => "The policy for this agent is currently disabled.",
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
            ReasonCode::AssetNotAllowed => "Asset is not supported or authorized by this policy.",
            ReasonCode::DailyTransactionLimitExceeded => {
                "Agent has reached its maximum authorized transactions for today."
            }
            ReasonCode::InvalidRequest => {
                "Payment request is invalid or missing required parameters."
            }
        }
    }
}

/// The result of an authorization evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuthorizationDecision {
    pub request_id: String,
    pub decision: Decision,
    pub reason_code: ReasonCode,
    pub reason: String,
}

impl AuthorizationDecision {
    /// Create an ALLOW decision with default approved reason.
    pub fn allow(request_id: impl Into<String>) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::Allow,
            reason_code: ReasonCode::Approved,
            reason: ReasonCode::Approved.default_message().to_string(),
        }
    }

    /// Create a DENY decision with a specific reason code.
    pub fn deny(request_id: impl Into<String>, code: ReasonCode) -> Self {
        Self {
            request_id: request_id.into(),
            decision: Decision::Deny,
            reason_code: code,
            reason: code.default_message().to_string(),
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
        }
    }
}
