use super::address::Address;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Deterministic spending policy configured for an agent.
///
/// All monetary values are integer base units.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Policy {
    pub agent_id: String,
    pub enabled: bool,
    pub per_transaction_limit: u64,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub allowed_recipients: Option<HashSet<Address>>,
    pub blocked_recipients: HashSet<Address>,
    pub allowed_assets: HashSet<String>,
    pub max_transactions_per_day: u32,
    pub daily_transaction_count: u32,
}
