use crate::domain::{Address, Policy};
use std::collections::HashSet;

/// Returns an isolated deterministic demo policy for local development and testing.
///
/// NOTE: This is for local demonstration only and NOT for production use.
/// Production policy persistence will be integrated with PostgreSQL in later tasks.
pub fn get_demo_policy() -> Policy {
    let mut allowed_recipients = HashSet::new();
    // Demo allowlist of test recipient addresses
    allowed_recipients.insert(
        Address::parse("0x71c678d311516474809e39842c12f44b20a32508").expect("valid demo address 1"),
    );
    allowed_recipients.insert(
        Address::parse("0x2546bcd3279c0b1060285661688744d9f7518777").expect("valid demo address 2"),
    );
    // Intended development recipient for seeded web-research service from service registry
    allowed_recipients.insert(
        Address::parse("0x1111111111111111111111111111111111111111")
            .expect("valid demo address web-research"),
    );

    let mut blocked_recipients = HashSet::new();
    // Demo blacklist address
    blocked_recipients.insert(
        Address::parse("0xdead000000000000000000000000000000000000")
            .expect("valid demo blocked address"),
    );

    let mut allowed_assets = HashSet::new();
    allowed_assets.insert("USDC".to_string());

    Policy {
        policy_id: Some("pol_demo_research".to_string()),
        policy_version: Some("v1.0.0".to_string()),
        organization_id: Some("org_default".to_string()),
        agent_id: "research-agent".to_string(),
        enabled: true,
        global_paused: false,
        agent_paused: false,
        organization_paused: false,
        per_transaction_limit: 500_000, // $0.50 USDC (6 decimals)
        daily_limit: 5_000_000,         // $5.00 USDC
        daily_spent: 0,
        approval_threshold: Some(400_000), // $0.40 USDC triggers approval requirement
        max_transactions_per_day: 20,
        daily_transaction_count: 0,
        hourly_limit: Some(2_000_000), // $2.00 USDC per hour
        hourly_spent: Some(0),
        max_transactions_per_hour: Some(10),
        hourly_transaction_count: Some(0),
        allowed_recipients: Some(allowed_recipients),
        blocked_recipients,
        allowed_assets,
        blocked_assets: HashSet::new(),
        allowed_services: None,
        blocked_services: HashSet::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Decision, PaymentRequest, ReasonCode};
    use crate::engine::authorize;

    #[test]
    fn test_demo_policy_web_research_recipient_allowed() {
        let policy = get_demo_policy();
        let req = PaymentRequest {
            request_id: "req_demo_01".to_string(),
            agent_id: "research-agent".to_string(),
            organization_id: Some("org_default".to_string()),
            service_id: Some("web-research".to_string()),
            recipient: Address::parse("0x1111111111111111111111111111111111111111").unwrap(),
            amount: 250_000,
            asset: "USDC".to_string(),
            purpose: "web_search".to_string(),
            timestamp: Some(1726833600),
        };
        let decision = authorize(&req, &policy);
        assert_eq!(decision.decision, Decision::Allow);
        assert_eq!(decision.reason_code, ReasonCode::Approved);
    }

    #[test]
    fn test_demo_policy_blacklisted_recipient_denied() {
        let policy = get_demo_policy();
        let req = PaymentRequest {
            request_id: "req_demo_02".to_string(),
            agent_id: "research-agent".to_string(),
            organization_id: Some("org_default".to_string()),
            service_id: Some("web-research".to_string()),
            recipient: Address::parse("0xdead000000000000000000000000000000000000").unwrap(),
            amount: 250_000,
            asset: "USDC".to_string(),
            purpose: "web_search".to_string(),
            timestamp: Some(1726833600),
        };
        let decision = authorize(&req, &policy);
        assert_eq!(decision.decision, Decision::Deny);
        assert_eq!(decision.reason_code, ReasonCode::RecipientBlocked);
    }

    #[test]
    fn test_demo_policy_unallowlisted_recipient_denied() {
        let policy = get_demo_policy();
        let req = PaymentRequest {
            request_id: "req_demo_03".to_string(),
            agent_id: "research-agent".to_string(),
            organization_id: Some("org_default".to_string()),
            service_id: Some("web-research".to_string()),
            recipient: Address::parse("0x9999999999999999999999999999999999999999").unwrap(),
            amount: 250_000,
            asset: "USDC".to_string(),
            purpose: "web_search".to_string(),
            timestamp: Some(1726833600),
        };
        let decision = authorize(&req, &policy);
        assert_eq!(decision.decision, Decision::Deny);
        assert_eq!(decision.reason_code, ReasonCode::RecipientNotAllowed);
    }

    #[test]
    fn test_production_policy_allowlist_isolation() {
        // Production policies constructed with explicit allowlists remain strict and unaffected
        let mut prod_allowlist = HashSet::new();
        prod_allowlist.insert(Address::parse("0x2546bcd3279c0b1060285661688744d9f7518777").unwrap());

        let prod_policy = Policy {
            policy_id: Some("pol_prod_strict".to_string()),
            policy_version: Some("v1.0.0".to_string()),
            organization_id: Some("org_production".to_string()),
            agent_id: "prod-agent".to_string(),
            enabled: true,
            global_paused: false,
            agent_paused: false,
            organization_paused: false,
            per_transaction_limit: 10_000_000,
            daily_limit: 100_000_000,
            daily_spent: 0,
            approval_threshold: None,
            max_transactions_per_day: 100,
            daily_transaction_count: 0,
            hourly_limit: None,
            hourly_spent: None,
            max_transactions_per_hour: None,
            hourly_transaction_count: None,
            allowed_recipients: Some(prod_allowlist),
            blocked_recipients: HashSet::new(),
            allowed_assets: HashSet::from(["USDC".to_string()]),
            blocked_assets: HashSet::new(),
            allowed_services: None,
            blocked_services: HashSet::new(),
        };

        // 0x1111... is not in prod_policy allowlist -> must be denied
        let req = PaymentRequest {
            request_id: "req_prod_01".to_string(),
            agent_id: "prod-agent".to_string(),
            organization_id: Some("org_production".to_string()),
            service_id: None,
            recipient: Address::parse("0x1111111111111111111111111111111111111111").unwrap(),
            amount: 100_000,
            asset: "USDC".to_string(),
            purpose: "prod_settlement".to_string(),
            timestamp: Some(1726833600),
        };
        let decision = authorize(&req, &prod_policy);
        assert_eq!(decision.decision, Decision::Deny);
        assert_eq!(decision.reason_code, ReasonCode::RecipientNotAllowed);
    }
}
