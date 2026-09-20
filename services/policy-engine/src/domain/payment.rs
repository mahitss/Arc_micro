use super::address::Address;
use serde::{Deserialize, Serialize};

/// Strongly-typed domain representation of an incoming payment request.
///
/// CRITICAL INVARIANT:
/// Amount is strictly an unsigned integer representing token base units (e.g. micro-USDC).
/// No floating-point types (f32, f64) are permitted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub request_id: String,
    pub agent_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_id: Option<String>,
    pub recipient: Address,
    pub amount: u64,
    pub asset: String,
    pub purpose: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
}
