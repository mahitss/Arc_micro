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
        agent_id: "research-agent".to_string(),
        enabled: true,
        per_transaction_limit: 500_000, // $0.50 USDC (6 decimals)
        daily_limit: 5_000_000,         // $5.00 USDC
        daily_spent: 0,
        allowed_recipients: Some(allowed_recipients),
        blocked_recipients,
        allowed_assets,
        max_transactions_per_day: 20,
        daily_transaction_count: 0,
    }
}
