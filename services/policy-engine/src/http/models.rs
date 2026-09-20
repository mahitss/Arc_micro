use crate::domain::{AuthorizationDecision, Decision, ReasonCode, RiskLevel, RuleCheck};
use crate::engine::RiskContext;
use serde::{Deserialize, Serialize};

/// Incoming HTTP request payload for authorization.
///
/// NOTE: Amount is represented as a string to avoid JSON number precision issues.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorizeHttpRequest {
    pub request_id: String,
    pub agent_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_id: Option<String>,
    pub recipient: String,
    pub amount: String,
    pub asset: String,
    pub purpose: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub risk_context: Option<RiskContext>,
}

/// Outgoing HTTP response payload for authorization decisions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorizeHttpResponse {
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

impl From<AuthorizationDecision> for AuthorizeHttpResponse {
    fn from(dec: AuthorizationDecision) -> Self {
        Self {
            request_id: dec.request_id,
            decision: dec.decision,
            reason_code: dec.reason_code,
            reason: dec.reason,
            policy_id: dec.policy_id,
            evaluated_at: dec.evaluated_at,
            risk_level: dec.risk_level,
            risk_score: dec.risk_score,
            checks: dec.checks,
            remaining_daily_limit: dec.remaining_daily_limit,
            simulation: dec.simulation,
        }
    }
}

/// Standard error response payload for malformed requests.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

