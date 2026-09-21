use crate::domain::{PaymentRequest, Policy, RiskLevel, RuleCheck};
use serde::{Deserialize, Serialize};

/// Deterministic context signals provided to the risk engine.
///
/// All values are objective counts/integers collected from historical data.
/// Zero floating-point math, zero external network calls, zero stochastic models.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct RiskContext {
    /// Number of prior successful transactions to this recipient in the past 30 days.
    #[serde(default)]
    pub recipient_prior_tx_count: u32,
    /// Number of prior transactions to this service.
    #[serde(default)]
    pub service_prior_tx_count: u32,
    /// Consecutive failed/denied intents in the trailing 1-hour window.
    #[serde(default)]
    pub recent_failures_count: u32,
    /// Number of payments in the trailing 15-minute window.
    #[serde(default)]
    pub recent_15m_tx_count: u32,
}

/// Result of a deterministic risk evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RiskEvaluationResult {
    pub level: RiskLevel,
    pub score: u32,
    pub checks: Vec<RuleCheck>,
}

/// Pure deterministic risk evaluation function.
///
/// Evaluates 5 deterministic factors:
/// 1. Budget Utilization (0, 15, or 30 points)
/// 2. Policy Proximity (0, 10, or 25 points)
/// 3. Recipient Familiarity (0, 5, or 20 points)
/// 4. Spending Velocity (0, 10, or 15 points)
/// 5. Failure Burst (0, 5, or 10 points)
///
/// Score is strictly bounded between 0 and 100:
/// - 0 - 29: LOW
/// - 30 - 59: MEDIUM
/// - 60 - 100: HIGH
pub fn evaluate_risk(
    request: &PaymentRequest,
    policy: &Policy,
    context: &RiskContext,
) -> RiskEvaluationResult {
    let mut total_score: u32 = 0;
    let mut checks = Vec::new();

    // 1. Budget Utilization
    let budget_pts = if policy.daily_limit > 0 {
        let projected = policy.daily_spent.saturating_add(request.amount);
        let pct = (projected.saturating_mul(100)) / policy.daily_limit;
        if pct >= 85 {
            30
        } else if pct >= 50 {
            15
        } else {
            0
        }
    } else {
        0
    };
    total_score = total_score.saturating_add(budget_pts);
    checks.push(RuleCheck {
        rule: "risk_budget_utilization".to_string(),
        passed: budget_pts < 30,
        message: format!("Budget utilization risk score: +{} pts", budget_pts),
    });

    // 2. Policy Proximity
    let proximity_pts = if policy.per_transaction_limit > 0 {
        let pct = (request.amount.saturating_mul(100)) / policy.per_transaction_limit;
        if pct >= 90 {
            25
        } else if pct >= 70 {
            10
        } else {
            0
        }
    } else {
        0
    };
    total_score = total_score.saturating_add(proximity_pts);
    checks.push(RuleCheck {
        rule: "risk_policy_proximity".to_string(),
        passed: proximity_pts < 25,
        message: format!("Policy proximity risk score: +{} pts", proximity_pts),
    });

    // 3. Recipient Familiarity
    let recipient_pts = if context.recipient_prior_tx_count >= 5 {
        0
    } else if context.recipient_prior_tx_count >= 1 {
        5
    } else {
        20
    };
    total_score = total_score.saturating_add(recipient_pts);
    checks.push(RuleCheck {
        rule: "risk_recipient_familiarity".to_string(),
        passed: recipient_pts == 0,
        message: format!(
            "Recipient familiarity (prior txs: {}): +{} pts",
            context.recipient_prior_tx_count, recipient_pts
        ),
    });

    // 4. Spending Velocity (15-min window)
    let velocity_pts = if context.recent_15m_tx_count >= 5 {
        15
    } else if context.recent_15m_tx_count >= 3 {
        10
    } else {
        0
    };
    total_score = total_score.saturating_add(velocity_pts);
    checks.push(RuleCheck {
        rule: "risk_spending_velocity".to_string(),
        passed: velocity_pts < 15,
        message: format!(
            "Spending velocity (15m count: {}): +{} pts",
            context.recent_15m_tx_count, velocity_pts
        ),
    });

    // 5. Failure Burst (1-hour window)
    let failure_pts = if context.recent_failures_count >= 3 {
        10
    } else if context.recent_failures_count == 2 {
        5
    } else {
        0
    };
    total_score = total_score.saturating_add(failure_pts);
    checks.push(RuleCheck {
        rule: "risk_failure_burst".to_string(),
        passed: failure_pts == 0,
        message: format!(
            "Recent failures (1h count: {}): +{} pts",
            context.recent_failures_count, failure_pts
        ),
    });

    // 6. Service Familiarity & Novelty (if service_id is provided)
    let service_pts = if request.service_id.is_some() {
        if context.service_prior_tx_count >= 5 {
            0
        } else if context.service_prior_tx_count >= 1 {
            5
        } else {
            10 // First time using this service adds novelty points
        }
    } else {
        0
    };
    total_score = total_score.saturating_add(service_pts);
    if request.service_id.is_some() {
        checks.push(RuleCheck {
            rule: "risk_service_novelty".to_string(),
            passed: service_pts == 0,
            message: format!(
                "Service familiarity (prior txs: {}): +{} pts",
                context.service_prior_tx_count, service_pts
            ),
        });
    }

    // Bounded between 0 and 100
    let final_score = total_score.min(100);

    let level = if final_score >= 60 {
        RiskLevel::High
    } else if final_score >= 30 {
        RiskLevel::Medium
    } else {
        RiskLevel::Low
    };

    RiskEvaluationResult {
        level,
        score: final_score,
        checks,
    }
}
