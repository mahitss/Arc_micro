use super::risk::{evaluate_risk, RiskContext};
use crate::domain::{
    AuthorizationDecision, Decision, PaymentRequest, Policy, ReasonCode, RiskLevel, RuleCheck,
};

/// Pure, deterministic authorization evaluation function.
///
/// This function acts as the core security boundary of AgentPay.
///
/// INVARIANTS:
/// - Pure function: NO network calls, database queries, filesystem access, or external clocks.
/// - Deterministic: The identical `(request, policy, context)` tuple ALWAYS produces the identical decision.
/// - Zero float: All monetary arithmetic uses checked integer math (micro-USDC base units).
pub fn authorize(request: &PaymentRequest, policy: &Policy) -> AuthorizationDecision {
    authorize_with_context(request, policy, None)
}

/// Extended authorization evaluation supporting optional deterministic risk signals.
pub fn authorize_with_context(
    request: &PaymentRequest,
    policy: &Policy,
    risk_context: Option<&RiskContext>,
) -> AuthorizationDecision {
    let mut checks = Vec::new();

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

    // 3. Emergency / Administrative Pauses
    if policy.global_paused {
        checks.push(RuleCheck {
            rule: "global_paused".to_string(),
            passed: false,
            message: "System is in emergency global pause.".to_string(),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::GlobalPaused);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }

    if policy.organization_paused {
        checks.push(RuleCheck {
            rule: "organization_paused".to_string(),
            passed: false,
            message: "Organization is currently paused.".to_string(),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::OrganizationPaused);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }

    if policy.agent_paused {
        checks.push(RuleCheck {
            rule: "agent_paused".to_string(),
            passed: false,
            message: "Agent is currently paused.".to_string(),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::AgentPaused);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }

    if !policy.enabled {
        checks.push(RuleCheck {
            rule: "policy_enabled".to_string(),
            passed: false,
            message: "Policy is disabled.".to_string(),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::PolicyDisabled);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "policy_enabled".to_string(),
        passed: true,
        message: "Policy is active and unpaused.".to_string(),
    });

    // 4. Validate amount > 0
    if request.amount == 0 {
        checks.push(RuleCheck {
            rule: "valid_amount".to_string(),
            passed: false,
            message: "Amount must be strictly greater than zero.".to_string(),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::InvalidAmount);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "valid_amount".to_string(),
        passed: true,
        message: format!("Amount {} is positive base units.", request.amount),
    });

    // 5. Validate asset
    if !policy.allowed_assets.contains(&request.asset) {
        checks.push(RuleCheck {
            rule: "allowed_asset".to_string(),
            passed: false,
            message: format!("Asset '{}' is not allowed.", request.asset),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::AssetNotAllowed);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "allowed_asset".to_string(),
        passed: true,
        message: format!("Asset '{}' is authorized.", request.asset),
    });

    // 6. Check blocked recipient (blacklist takes precedence)
    if policy.blocked_recipients.contains(&request.recipient) {
        checks.push(RuleCheck {
            rule: "recipient_blocked".to_string(),
            passed: false,
            message: format!("Recipient '{}' is blacklisted.", request.recipient),
        });
        let mut d = AuthorizationDecision::deny(&request.request_id, ReasonCode::RecipientBlocked);
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "recipient_blocked".to_string(),
        passed: true,
        message: "Recipient is not blacklisted.".to_string(),
    });

    // 7. Check allowed recipients if allowlist is configured
    if let Some(ref allowed) = policy.allowed_recipients {
        if !allowed.contains(&request.recipient) {
            checks.push(RuleCheck {
                rule: "recipient_allowed".to_string(),
                passed: false,
                message: format!("Recipient '{}' is not on the allowlist.", request.recipient),
            });
            let mut d = AuthorizationDecision::deny(
                &request.request_id,
                ReasonCode::RecipientNotAllowed,
            );
            d.policy_id = policy.policy_id.clone();
            d.checks = checks;
            return d;
        }
    }
    checks.push(RuleCheck {
        rule: "recipient_allowed".to_string(),
        passed: true,
        message: "Recipient is permitted by policy.".to_string(),
    });

    // 8. Check allowed services if allowlist is configured
    if let Some(ref allowed_services) = policy.allowed_services {
        match &request.service_id {
            Some(sid) if allowed_services.contains(sid) => {
                checks.push(RuleCheck {
                    rule: "service_allowed".to_string(),
                    passed: true,
                    message: format!("Service '{}' is authorized.", sid),
                });
            }
            Some(sid) => {
                checks.push(RuleCheck {
                    rule: "service_allowed".to_string(),
                    passed: false,
                    message: format!("Service '{}' is not on the allowed services list.", sid),
                });
                let mut d = AuthorizationDecision::deny(
                    &request.request_id,
                    ReasonCode::ServiceNotAllowed,
                );
                d.policy_id = policy.policy_id.clone();
                d.checks = checks;
                return d;
            }
            None => {
                checks.push(RuleCheck {
                    rule: "service_allowed".to_string(),
                    passed: false,
                    message: "Policy requires an authorized service_id, but none was provided.".to_string(),
                });
                let mut d = AuthorizationDecision::deny_with_message(
                    &request.request_id,
                    ReasonCode::ServiceNotAllowed,
                    "Policy requires an authorized service_id.",
                );
                d.policy_id = policy.policy_id.clone();
                d.checks = checks;
                return d;
            }
        }
    }

    // 9. Check per-transaction limit
    if request.amount > policy.per_transaction_limit {
        checks.push(RuleCheck {
            rule: "per_transaction_limit".to_string(),
            passed: false,
            message: format!(
                "Amount {} exceeds per-transaction limit {}.",
                request.amount, policy.per_transaction_limit
            ),
        });
        let mut d = AuthorizationDecision::deny(
            &request.request_id,
            ReasonCode::AmountExceedsTransactionLimit,
        );
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "per_transaction_limit".to_string(),
        passed: true,
        message: format!("Amount {} is within per-transaction limit.", request.amount),
    });

    // 10. Check daily transaction count
    if policy.daily_transaction_count >= policy.max_transactions_per_day {
        checks.push(RuleCheck {
            rule: "daily_transaction_count".to_string(),
            passed: false,
            message: format!(
                "Daily transaction count {} reached maximum of {}.",
                policy.daily_transaction_count, policy.max_transactions_per_day
            ),
        });
        let mut d = AuthorizationDecision::deny(
            &request.request_id,
            ReasonCode::DailyTransactionLimitExceeded,
        );
        d.policy_id = policy.policy_id.clone();
        d.checks = checks;
        return d;
    }
    checks.push(RuleCheck {
        rule: "daily_transaction_count".to_string(),
        passed: true,
        message: format!(
            "Daily transaction count {} within limit of {}.",
            policy.daily_transaction_count, policy.max_transactions_per_day
        ),
    });

    // 11. Check daily spending limit with overflow protection
    let projected_daily = match policy.daily_spent.checked_add(request.amount) {
        Some(spent) if spent <= policy.daily_limit => spent,
        _ => {
            checks.push(RuleCheck {
                rule: "daily_spending_limit".to_string(),
                passed: false,
                message: format!(
                    "Payment of {} would exceed daily limit {} (already spent: {}).",
                    request.amount, policy.daily_limit, policy.daily_spent
                ),
            });
            let mut d = AuthorizationDecision::deny(
                &request.request_id,
                ReasonCode::DailyLimitExceeded,
            );
            d.policy_id = policy.policy_id.clone();
            d.checks = checks;
            return d;
        }
    };
    checks.push(RuleCheck {
        rule: "daily_spending_limit".to_string(),
        passed: true,
        message: format!(
            "Daily spending {}/{} within budget.",
            projected_daily, policy.daily_limit
        ),
    });

    // 12. Check hourly velocity limit if configured
    if let Some(hourly_limit) = policy.hourly_limit {
        let current_hourly = policy.hourly_spent.unwrap_or(0);
        match current_hourly.checked_add(request.amount) {
            Some(projected_hourly) if projected_hourly <= hourly_limit => {
                checks.push(RuleCheck {
                    rule: "hourly_velocity_limit".to_string(),
                    passed: true,
                    message: format!(
                        "Hourly spending {}/{} within velocity limit.",
                        projected_hourly, hourly_limit
                    ),
                });
            }
            _ => {
                checks.push(RuleCheck {
                    rule: "hourly_velocity_limit".to_string(),
                    passed: false,
                    message: format!(
                        "Payment of {} exceeds hourly limit {} (spent: {}).",
                        request.amount, hourly_limit, current_hourly
                    ),
                });
                let mut d = AuthorizationDecision::deny(
                    &request.request_id,
                    ReasonCode::HourlyVelocityExceeded,
                );
                d.policy_id = policy.policy_id.clone();
                d.checks = checks;
                return d;
            }
        }
    }

    // 13. Check hourly transaction count if configured
    if let Some(max_hourly_txs) = policy.max_transactions_per_hour {
        let current_hourly_txs = policy.hourly_transaction_count.unwrap_or(0);
        if current_hourly_txs >= max_hourly_txs {
            checks.push(RuleCheck {
                rule: "hourly_transaction_count".to_string(),
                passed: false,
                message: format!(
                    "Hourly transaction count {} reached maximum of {}.",
                    current_hourly_txs, max_hourly_txs
                ),
            });
            let mut d = AuthorizationDecision::deny(
                &request.request_id,
                ReasonCode::HourlyVelocityExceeded,
            );
            d.policy_id = policy.policy_id.clone();
            d.checks = checks;
            return d;
        }
    }

    // 14. Deterministic Risk Evaluation
    let remaining_daily = policy.daily_limit.saturating_sub(projected_daily);
    let (risk_level, risk_score) = if let Some(ctx) = risk_context {

        let risk_eval = evaluate_risk(request, policy, ctx);
        checks.extend(risk_eval.checks);

        // If deterministic risk is HIGH -> APPROVAL_REQUIRED
        if risk_eval.level == RiskLevel::High {
            checks.push(RuleCheck {
                rule: "risk_gate".to_string(),
                passed: false,
                message: format!(
                    "Deterministic risk score {} is HIGH (>= 60). Human approval required.",
                    risk_eval.score
                ),
            });
            return AuthorizationDecision {
                request_id: request.request_id.clone(),
                decision: Decision::ApprovalRequired,
                reason_code: ReasonCode::RiskHigh,
                reason: format!(
                    "Deterministic risk score is HIGH ({}). Human approval required.",
                    risk_eval.score
                ),
                policy_id: policy.policy_id.clone(),
                evaluated_at: request.timestamp,
                risk_level: Some(risk_eval.level),
                risk_score: Some(risk_eval.score),
                checks,
                remaining_daily_limit: Some(remaining_daily),
                simulation: false,
            };
        }
        (Some(risk_eval.level), Some(risk_eval.score))
    } else {
        (Some(RiskLevel::Low), Some(0))
    };

    // 15. Approval threshold check: if amount >= approval_threshold -> APPROVAL_REQUIRED
    if let Some(threshold) = policy.approval_threshold {
        if request.amount >= threshold {
            checks.push(RuleCheck {
                rule: "approval_threshold".to_string(),
                passed: false,
                message: format!(
                    "Amount {} meets or exceeds approval threshold {}.",
                    request.amount, threshold
                ),
            });
            return AuthorizationDecision {
                request_id: request.request_id.clone(),
                decision: Decision::ApprovalRequired,
                reason_code: ReasonCode::AboveApprovalThreshold,
                reason: format!(
                    "Payment amount {} meets or exceeds autonomous approval threshold {}.",
                    request.amount, threshold
                ),
                policy_id: policy.policy_id.clone(),
                evaluated_at: request.timestamp,
                risk_level,
                risk_score,
                checks,
                remaining_daily_limit: Some(remaining_daily),
                simulation: false,
            };
        }
    }

    checks.push(RuleCheck {
        rule: "approval_threshold".to_string(),
        passed: true,
        message: "Amount is below approval threshold.".to_string(),
    });

    // 16. Return ALLOW
    AuthorizationDecision {
        request_id: request.request_id.clone(),
        decision: Decision::Allow,
        reason_code: ReasonCode::Approved,
        reason: ReasonCode::Approved.default_message().to_string(),
        policy_id: policy.policy_id.clone(),
        evaluated_at: request.timestamp,
        risk_level,
        risk_score,
        checks,
        remaining_daily_limit: Some(remaining_daily),
        simulation: false,
    }
}

