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
    pub recipient: Address,
    pub amount: u64,
    pub asset: String,
    pub purpose: String,
}
