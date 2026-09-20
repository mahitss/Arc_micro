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
        allowed_services: None,
    }
}
