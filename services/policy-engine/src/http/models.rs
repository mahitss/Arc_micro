use crate::domain::{AuthorizationDecision, Decision, ReasonCode};
use serde::{Deserialize, Serialize};

/// Incoming HTTP request payload for authorization.
///
/// NOTE: Amount is represented as a string to avoid JSON number precision issues.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorizeHttpRequest {
    pub request_id: String,
    pub agent_id: String,
    pub recipient: String,
    pub amount: String,
    pub asset: String,
    pub purpose: String,
}

/// Outgoing HTTP response payload for authorization decisions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorizeHttpResponse {
    pub request_id: String,
    pub decision: Decision,
    pub reason_code: ReasonCode,
    pub reason: String,
}

impl From<AuthorizationDecision> for AuthorizeHttpResponse {
    fn from(dec: AuthorizationDecision) -> Self {
        Self {
            request_id: dec.request_id,
            decision: dec.decision,
            reason_code: dec.reason_code,
            reason: dec.reason,
        }
    }
}

/// Standard error response payload for malformed requests.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}
