use super::address::Address;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Deterministic spending policy configured for an agent.
///
/// All monetary values are integer base units (micro-USDC).
/// Floating-point math is strictly forbidden.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Policy {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,
    pub agent_id: String,
    pub enabled: bool,

    // Emergency and administrative pause controls
    #[serde(default)]
    pub global_paused: bool,
    #[serde(default)]
    pub agent_paused: bool,
    #[serde(default)]
    pub organization_paused: bool,

    // Core Limits (Micro-USDC base units)
    pub per_transaction_limit: u64,
    pub daily_limit: u64,
    pub daily_spent: u64,
    /// Amounts >= approval_threshold require human authorization.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub approval_threshold: Option<u64>,

    // Velocity Controls
    pub max_transactions_per_day: u32,
    pub daily_transaction_count: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hourly_limit: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hourly_spent: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_transactions_per_hour: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hourly_transaction_count: Option<u32>,

    // Allow/Block Lists
    pub allowed_assets: HashSet<String>,
    #[serde(default)]
    pub blocked_assets: HashSet<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_recipients: Option<HashSet<Address>>,
    pub blocked_recipients: HashSet<Address>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_services: Option<HashSet<String>>,
    #[serde(default)]
    pub blocked_services: HashSet<String>,
}
