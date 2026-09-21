use crate::domain::Policy;
use std::collections::HashSet;

/// Deterministically compose an organization-level policy with an agent-level policy.
///
/// HIERARCHY RULE:
/// A lower-level policy (Agent) can tighten constraints, but can NEVER weaken constraints
/// established by a higher-level policy (Organization).
///
/// Precedence:
/// - Limits: Minimum of (Org, Agent)
/// - Paused: True if either is paused
/// - Enabled: True only if BOTH are enabled
/// - Blocklists: Union (if either blocks, recipient is blocked)
/// - Allowlists: Intersection (must be allowed by both levels)
pub fn compose_policies(org_policy: &Policy, agent_policy: &Policy) -> Policy {
    // 1. Paused flags: if either is paused, the composed policy is paused
    let global_paused = org_policy.global_paused || agent_policy.global_paused;
    let organization_paused = org_policy.organization_paused || agent_policy.organization_paused;
    let agent_paused = org_policy.agent_paused || agent_policy.agent_paused;

    // 2. Enabled: both must be enabled
    let enabled = org_policy.enabled && agent_policy.enabled;

    // 3. Limits: strictly minimum of limits
    let per_transaction_limit =
        std::cmp::min(org_policy.per_transaction_limit, agent_policy.per_transaction_limit);
    let daily_limit = std::cmp::min(org_policy.daily_limit, agent_policy.daily_limit);
    let daily_spent = std::cmp::max(org_policy.daily_spent, agent_policy.daily_spent);

    // 4. Approval threshold: minimum of configured thresholds
    let approval_threshold = match (org_policy.approval_threshold, agent_policy.approval_threshold) {
        (Some(ot), Some(at)) => Some(std::cmp::min(ot, at)),
        (Some(ot), None) => Some(ot),
        (None, Some(at)) => Some(at),
        (None, None) => None,
    };

    // 5. Transaction counts and daily limit
    let max_transactions_per_day = std::cmp::min(
        org_policy.max_transactions_per_day,
        agent_policy.max_transactions_per_day,
    );
    let daily_transaction_count = std::cmp::max(
        org_policy.daily_transaction_count,
        agent_policy.daily_transaction_count,
    );

    // 6. Hourly velocity limits
    let hourly_limit = match (org_policy.hourly_limit, agent_policy.hourly_limit) {
        (Some(oh), Some(ah)) => Some(std::cmp::min(oh, ah)),
        (Some(oh), None) => Some(oh),
        (None, Some(ah)) => Some(ah),
        (None, None) => None,
    };

    let hourly_spent = match (org_policy.hourly_spent, agent_policy.hourly_spent) {
        (Some(os), Some(as_)) => Some(std::cmp::max(os, as_)),
        (Some(os), None) => Some(os),
        (None, Some(as_)) => Some(as_),
        (None, None) => None,
    };

    let max_transactions_per_hour = match (
        org_policy.max_transactions_per_hour,
        agent_policy.max_transactions_per_hour,
    ) {
        (Some(om), Some(am)) => Some(std::cmp::min(om, am)),
        (Some(om), None) => Some(om),
        (None, Some(am)) => Some(am),
        (None, None) => None,
    };

    let hourly_transaction_count = match (
        org_policy.hourly_transaction_count,
        agent_policy.hourly_transaction_count,
    ) {
        (Some(oc), Some(ac)) => Some(std::cmp::max(oc, ac)),
        (Some(oc), None) => Some(oc),
        (None, Some(ac)) => Some(ac),
        (None, None) => None,
    };

    // 7. Allowed assets: intersection
    let allowed_assets: HashSet<String> = org_policy
        .allowed_assets
        .intersection(&agent_policy.allowed_assets)
        .cloned()
        .collect();

    // 7b. Blocked assets: union (if either blocks, asset is blocked)
    let blocked_assets: HashSet<String> = org_policy
        .blocked_assets
        .union(&agent_policy.blocked_assets)
        .cloned()
        .collect();

    // 8. Blocked recipients: union (if either blocks, recipient is blocked)
    let blocked_recipients: HashSet<_> = org_policy
        .blocked_recipients
        .union(&agent_policy.blocked_recipients)
        .cloned()
        .collect();

    // 9. Allowed recipients: intersection if both present
    let allowed_recipients = match (&org_policy.allowed_recipients, &agent_policy.allowed_recipients) {
        (Some(or_), Some(ar)) => Some(or_.intersection(ar).cloned().collect()),
        (Some(or_), None) => Some(or_.clone()),
        (None, Some(ar)) => Some(ar.clone()),
        (None, None) => None,
    };

    // 10. Allowed services: intersection if both present
    let allowed_services = match (&org_policy.allowed_services, &agent_policy.allowed_services) {
        (Some(os), Some(as_)) => Some(os.intersection(as_).cloned().collect()),
        (Some(os), None) => Some(os.clone()),
        (None, Some(as_)) => Some(as_.clone()),
        (None, None) => None,
    };

    // 11. Blocked services: union (if either blocks, service is blocked)
    let blocked_services: HashSet<String> = org_policy
        .blocked_services
        .union(&agent_policy.blocked_services)
        .cloned()
        .collect();

    let policy_version = agent_policy
        .policy_version
        .clone()
        .or_else(|| org_policy.policy_version.clone());

    Policy {
        policy_id: agent_policy.policy_id.clone().or_else(|| org_policy.policy_id.clone()),
        policy_version,
        organization_id: org_policy
            .organization_id
            .clone()
            .or_else(|| agent_policy.organization_id.clone()),
        agent_id: agent_policy.agent_id.clone(),
        enabled,
        global_paused,
        agent_paused,
        organization_paused,
        per_transaction_limit,
        daily_limit,
        daily_spent,
        approval_threshold,
        max_transactions_per_day,
        daily_transaction_count,
        hourly_limit,
        hourly_spent,
        max_transactions_per_hour,
        hourly_transaction_count,
        allowed_assets,
        blocked_assets,
        allowed_recipients,
        blocked_recipients,
        allowed_services,
        blocked_services,
    }
}
