use super::authorize::authorize_with_context;
use super::risk::RiskContext;
use crate::domain::{AuthorizationDecision, PaymentRequest, Policy};

/// Pure deterministic policy simulator.
///
/// Simulates evaluation of a hypothetical payment against a policy and risk context
/// without executing any on-chain action, mutating counters, or creating real payment intents.
///
/// CRITICAL INVARIANTS:
/// - Strictly side-effect-free.
/// - Returns `simulation = true` on the AuthorizationDecision.
pub fn simulate(
    request: &PaymentRequest,
    policy: &Policy,
    risk_context: Option<&RiskContext>,
) -> AuthorizationDecision {
    let mut decision = authorize_with_context(request, policy, risk_context);
    decision.simulation = true;
    decision
}
