use crate::domain::{AuthorizationDecision, PaymentRequest, Policy, ReasonCode};

/// Pure, deterministic authorization evaluation function.
///
/// This function acts as the core security boundary of AgentPay.
///
/// INVARIANTS:
/// - Pure function: NO network calls, database queries, filesystem access, or external clocks.
/// - Deterministic: The identical `(request, policy)` pair ALWAYS produces the identical decision.
/// - Zero float: All monetary arithmetic uses checked integer math.
///
/// EVALUATION ORDER:
/// 1. Validate request ID
/// 2. Validate agent / policy state (policy enabled, agent match)
/// 3. Validate amount > 0
/// 4. Validate asset
/// 5. Check blocked recipient (blacklist takes precedence)
/// 6. Check allowed recipients if allowlist is configured
/// 7. Check per-transaction limit
/// 8. Check daily transaction count
/// 9. Check daily spending limit (with overflow validation)
/// 10. Return ALLOW
pub fn authorize(request: &PaymentRequest, policy: &Policy) -> AuthorizationDecision {
    // 1. Validate request ID
    if request.request_id.trim().is_empty() {
        return AuthorizationDecision::deny_with_message(
            &request.request_id,
            ReasonCode::InvalidRequest,
            "Request ID cannot be empty.",
        );
    }

    // 2. Validate agent / policy state
    if request.agent_id.trim().is_empty() || request.agent_id != policy.agent_id {
        return AuthorizationDecision::deny_with_message(
            &request.request_id,
            ReasonCode::InvalidRequest,
            format!(
                "Agent ID mismatch or invalid: request has '{}', policy is for '{}'.",
                request.agent_id, policy.agent_id
            ),
        );
    }

    if !policy.enabled {
        return AuthorizationDecision::deny(&request.request_id, ReasonCode::PolicyDisabled);
    }

    // 3. Validate amount > 0
    if request.amount == 0 {
        return AuthorizationDecision::deny(&request.request_id, ReasonCode::InvalidAmount);
    }

    // 4. Validate asset
    if !policy.allowed_assets.contains(&request.asset) {
        return AuthorizationDecision::deny(&request.request_id, ReasonCode::AssetNotAllowed);
    }

    // 5. Check blocked recipient (blacklist takes precedence)
    if policy.blocked_recipients.contains(&request.recipient) {
        return AuthorizationDecision::deny(&request.request_id, ReasonCode::RecipientBlocked);
    }

    // 6. Check allowed recipients if allowlist is configured
    if let Some(ref allowed) = policy.allowed_recipients {
        if !allowed.contains(&request.recipient) {
            return AuthorizationDecision::deny(
                &request.request_id,
                ReasonCode::RecipientNotAllowed,
            );
        }
    }

    // 7. Check per-transaction limit
    if request.amount > policy.per_transaction_limit {
        return AuthorizationDecision::deny(
            &request.request_id,
            ReasonCode::AmountExceedsTransactionLimit,
        );
    }

    // 8. Check daily transaction count
    if policy.daily_transaction_count >= policy.max_transactions_per_day {
        return AuthorizationDecision::deny(
            &request.request_id,
            ReasonCode::DailyTransactionLimitExceeded,
        );
    }

    // 9. Check daily spending limit with overflow protection
    match policy.daily_spent.checked_add(request.amount) {
        Some(projected_spent) if projected_spent <= policy.daily_limit => {
            // Within budget
        }
        _ => {
            return AuthorizationDecision::deny(
                &request.request_id,
                ReasonCode::DailyLimitExceeded,
            );
        }
    }

    // 10. Return ALLOW
    AuthorizationDecision::allow(&request.request_id)
}
