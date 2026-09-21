use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use policy_engine::{
    domain::{Address, Decision, PaymentRequest, Policy, ReasonCode, RiskLevel},

    engine::{
        authorize, authorize_with_context, compose_policies, evaluate_risk, simulate, RiskContext,
    },
    http::create_router,
};
use serde_json::{json, Value};
use std::collections::HashSet;
use tower::ServiceExt;


fn sample_policy() -> Policy {
    let mut allowed_recipients = HashSet::new();
    allowed_recipients
        .insert(Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap());
    allowed_recipients
        .insert(Address::parse("0x2546bcd3279c0b1060285661688744d9f7518777").unwrap());

    let mut blocked_recipients = HashSet::new();
    blocked_recipients
        .insert(Address::parse("0xdead000000000000000000000000000000000000").unwrap());

    let mut allowed_assets = HashSet::new();
    allowed_assets.insert("USDC".to_string());

    Policy {
        policy_id: Some("pol_test_01".to_string()),
        organization_id: Some("org_test".to_string()),
        agent_id: "test-agent".to_string(),
        enabled: true,
        global_paused: false,
        agent_paused: false,
        organization_paused: false,
        per_transaction_limit: 500_000, // 0.50 USDC
        daily_limit: 5_000_000,         // 5.00 USDC
        daily_spent: 1_000_000,         // 1.00 USDC already spent
        approval_threshold: None,
        max_transactions_per_day: 10,
        daily_transaction_count: 2,
        hourly_limit: None,
        hourly_spent: None,
        max_transactions_per_hour: None,
        hourly_transaction_count: None,
        allowed_recipients: Some(allowed_recipients),
        blocked_recipients,
        allowed_assets,
        allowed_services: None,
        blocked_services: HashSet::new(),
        blocked_assets: HashSet::new(),
        policy_version: Some("v1.0.0".to_string()),
    }
}

fn sample_request() -> PaymentRequest {
    PaymentRequest {
        request_id: "req_001".to_string(),
        agent_id: "test-agent".to_string(),
        organization_id: Some("org_test".to_string()),
        service_id: None,
        recipient: Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap(),
        amount: 250_000,
        asset: "USDC".to_string(),
        purpose: "compute_api".to_string(),
        timestamp: Some(1726833600),
    }
}


// -----------------------------------------------------------------------------
// Pure Authorization Engine Unit Tests
// -----------------------------------------------------------------------------

#[test]
fn test_01_valid_payment_allows() {
    let policy = sample_policy();
    let req = sample_request();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
    assert_eq!(decision.request_id, "req_001");
}

#[test]
fn test_02_zero_amount_denies() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = 0;
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::InvalidAmount);
}

#[test]
fn test_04_amount_above_per_transaction_limit_denies() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = 500_001; // Limit is 500_000
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(
        decision.reason_code,
        ReasonCode::AmountExceedsTransactionLimit
    );
}

#[test]
fn test_05_payment_exactly_equal_to_per_transaction_limit_allows() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = 500_000;
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_06_payment_making_daily_spending_exactly_equal_daily_limit_allows() {
    let mut policy = sample_policy();
    policy.per_transaction_limit = 4_000_000;
    policy.daily_limit = 5_000_000;
    policy.daily_spent = 1_000_000;

    let mut req = sample_request();
    req.amount = 4_000_000; // 1M + 4M = exactly 5M
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_07_payment_exceeding_daily_limit_denies() {
    let policy = sample_policy(); // Daily limit: 5M, Daily spent: 1M, remaining: 4M
    let mut req = sample_request();
    req.amount = 400_001;
    // Set daily_spent so that req.amount exceeds remaining budget
    let mut policy = policy;
    policy.daily_spent = 4_800_000; // remaining is 200_000
    req.amount = 300_000; // 300_000 > 200_000

    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::DailyLimitExceeded);
}

#[test]
fn test_08_blocked_recipient_denies() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.recipient = Address::parse("0xdead000000000000000000000000000000000000").unwrap();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::RecipientBlocked);
}

#[test]
fn test_09_recipient_not_on_allowlist_denies() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.recipient = Address::parse("0x1111111111111111111111111111111111111111").unwrap();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::RecipientNotAllowed);
}

#[test]
fn test_10_allowed_recipient_allows() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.recipient = Address::parse("0x2546bcd3279c0b1060285661688744d9f7518777").unwrap();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_11_unsupported_asset_denies() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.asset = "ETH".to_string();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::AssetNotAllowed);
}

#[test]
fn test_12_daily_transaction_count_at_limit_denies() {
    let mut policy = sample_policy();
    policy.max_transactions_per_day = 10;
    policy.daily_transaction_count = 10; // At limit

    let req = sample_request();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(
        decision.reason_code,
        ReasonCode::DailyTransactionLimitExceeded
    );
}

#[test]
fn test_13_daily_transaction_count_below_limit_allows() {
    let mut policy = sample_policy();
    policy.max_transactions_per_day = 10;
    policy.daily_transaction_count = 9; // Below limit

    let req = sample_request();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_14_disabled_policy_denies() {
    let mut policy = sample_policy();
    policy.enabled = false;

    let req = sample_request();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::PolicyDisabled);
}

#[test]
fn test_15_determinism_identical_inputs_produce_identical_decisions() {
    let policy = sample_policy();
    let req = sample_request();

    let decision1 = authorize(&req, &policy);
    let decision2 = authorize(&req, &policy);
    let decision3 = authorize(&req, &policy);

    assert_eq!(decision1, decision2);
    assert_eq!(decision2, decision3);
}

#[test]
fn test_16_large_integer_overflow_protection() {
    let mut policy = sample_policy();
    policy.daily_spent = u64::MAX - 100;
    policy.daily_limit = u64::MAX;

    let mut req = sample_request();
    req.amount = 200; // u64::MAX - 100 + 200 would overflow u64

    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::DailyLimitExceeded);
}

#[test]
fn test_17_request_id_validation() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.request_id = "   ".to_string(); // whitespace only

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::InvalidRequest);
}

#[test]
fn test_18_agent_id_validation() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.agent_id = "different-agent".to_string();

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::InvalidRequest);
}

// -----------------------------------------------------------------------------
// Invariant / Property Tests
// -----------------------------------------------------------------------------

#[test]
fn test_invariant_payment_above_limit_never_allows() {
    let policy = sample_policy();
    for amount in [500_001, 1_000_000, 10_000_000, u64::MAX] {
        let mut req = sample_request();
        req.amount = amount;
        let decision = authorize(&req, &policy);
        assert_ne!(decision.decision, Decision::Allow);
    }
}

#[test]
fn test_invariant_blocked_recipient_never_allows() {
    let policy = sample_policy();
    let blocked_addr = Address::parse("0xdead000000000000000000000000000000000000").unwrap();
    let mut req = sample_request();
    req.recipient = blocked_addr;
    req.amount = 1; // Minimal amount
    let decision = authorize(&req, &policy);
    assert_ne!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::RecipientBlocked);
}

#[test]
fn test_invariant_unsupported_asset_never_allows() {
    let policy = sample_policy();
    for asset in ["BTC", "ETH", "DAI", "USDT", ""] {
        let mut req = sample_request();
        req.asset = asset.to_string();
        let decision = authorize(&req, &policy);
        assert_ne!(decision.decision, Decision::Allow);
        assert_eq!(decision.reason_code, ReasonCode::AssetNotAllowed);
    }
}

// -----------------------------------------------------------------------------
// HTTP Integration Tests (POST /v1/authorize & GET /health)
// -----------------------------------------------------------------------------

#[tokio::test]
async fn test_19_malformed_http_request_returns_400() {
    let app = create_router();

    // Case 1: Invalid amount format (float string "1.5")
    let payload = json!({
        "request_id": "req_100",
        "agent_id": "research-agent",
        "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
        "amount": "1.5",
        "asset": "USDC",
        "purpose": "test"
    });

    let req = Request::builder()
        .uri("/v1/authorize")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    // Case 2: Negative amount string "-100"
    let app = create_router();
    let payload = json!({
        "request_id": "req_101",
        "agent_id": "research-agent",
        "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
        "amount": "-100",
        "asset": "USDC",
        "purpose": "test"
    });

    let req = Request::builder()
        .uri("/v1/authorize")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    // Case 3: Invalid recipient address length
    let app = create_router();
    let payload = json!({
        "request_id": "req_102",
        "agent_id": "research-agent",
        "recipient": "0xinvalid",
        "amount": "100000",
        "asset": "USDC",
        "purpose": "test"
    });

    let req = Request::builder()
        .uri("/v1/authorize")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_20_valid_http_request_returning_deny_returns_200() {
    let app = create_router();

    // Payment exceeding per-transaction limit (limit for research-agent is 500_000)
    let payload = json!({
        "request_id": "req_200",
        "agent_id": "research-agent",
        "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
        "amount": "999999",
        "asset": "USDC",
        "purpose": "oversized_purchase"
    });

    let req = Request::builder()
        .uri("/v1/authorize")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json_resp: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json_resp["request_id"], "req_200");
    assert_eq!(json_resp["decision"], "DENY");
    assert_eq!(json_resp["reason_code"], "AMOUNT_EXCEEDS_TRANSACTION_LIMIT");
}

#[tokio::test]
async fn test_valid_http_request_returning_allow_returns_200() {
    let app = create_router();

    // Valid payment for research-agent (amount <= 500_000, allowed recipient)
    let payload = json!({
        "request_id": "req_201",
        "agent_id": "research-agent",
        "recipient": "0x71C678d311516474809e39842c12f44b20a32508", // Mixed case normalized
        "amount": "180000",
        "asset": "USDC",
        "purpose": "api_usage"
    });

    let req = Request::builder()
        .uri("/v1/authorize")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json_resp: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json_resp["request_id"], "req_201");
    assert_eq!(json_resp["decision"], "ALLOW");
    assert_eq!(json_resp["reason_code"], "APPROVED");
}

#[tokio::test]
async fn test_health_endpoint() {
    let app = create_router();

    let req = Request::builder()
        .uri("/health")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json_resp: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json_resp["status"], "ok");
    assert_eq!(json_resp["service"], "policy-engine");
}

#[test]
fn test_21_one_base_unit_payment_allows() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = 1; // Minimum positive integer base unit
    let decision = authorize(&req, &policy);

    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_22_daily_limit_plus_one_denies() {
    let mut policy = sample_policy();
    policy.per_transaction_limit = 2_000_000;
    policy.daily_limit = 5_000_000;
    policy.daily_spent = 4_000_000;

    let mut req = sample_request();
    req.amount = 1_000_001; // remaining (1_000_000) + 1

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::DailyLimitExceeded);
}

#[test]
fn test_23_max_u64_amount_denies_safely() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = u64::MAX;

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(
        decision.reason_code,
        ReasonCode::AmountExceedsTransactionLimit
    );
}

// -----------------------------------------------------------------------------
// Day 2 Extended Tests: Approval Threshold, Velocity, Pauses, Risk, Composition, Simulation
// -----------------------------------------------------------------------------

#[test]
fn test_24_approval_threshold_triggers_approval_required() {
    let mut policy = sample_policy();
    policy.approval_threshold = Some(200_000); // 0.20 USDC

    let mut req = sample_request();
    req.amount = 250_000; // Above threshold 200_000

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::ApprovalRequired);
    assert_eq!(decision.reason_code, ReasonCode::AboveApprovalThreshold);
    assert!(decision.checks.iter().any(|c| c.rule == "approval_threshold" && !c.passed));
}

#[test]
fn test_25_below_approval_threshold_allows() {
    let mut policy = sample_policy();
    policy.approval_threshold = Some(300_000);

    let mut req = sample_request();
    req.amount = 250_000; // Below threshold 300_000

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_26_hourly_velocity_limit_exceeded_denies() {
    let mut policy = sample_policy();
    policy.hourly_limit = Some(300_000);
    policy.hourly_spent = Some(100_000);

    let mut req = sample_request();
    req.amount = 250_000; // 100k + 250k = 350k > 300k

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::HourlyVelocityExceeded);
}

#[test]
fn test_27_hourly_transaction_count_exceeded_denies() {
    let mut policy = sample_policy();
    policy.max_transactions_per_hour = Some(5);
    policy.hourly_transaction_count = Some(5);

    let req = sample_request();
    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::HourlyVelocityExceeded);
}

#[test]
fn test_28_global_paused_denies() {
    let mut policy = sample_policy();
    policy.global_paused = true;

    let req = sample_request();
    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::GlobalPaused);
}

#[test]
fn test_29_organization_paused_denies() {
    let mut policy = sample_policy();
    policy.organization_paused = true;

    let req = sample_request();
    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::OrganizationPaused);
}

#[test]
fn test_30_agent_paused_denies() {
    let mut policy = sample_policy();
    policy.agent_paused = true;

    let req = sample_request();
    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::AgentPaused);
}

#[test]
fn test_31_service_not_allowed_denies() {
    let mut policy = sample_policy();
    let mut allowed_services = HashSet::new();
    allowed_services.insert("svc_approved_01".to_string());
    policy.allowed_services = Some(allowed_services);

    let mut req = sample_request();
    req.service_id = Some("svc_unapproved_99".to_string());

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::ServiceNotAllowed);
}

#[test]
fn test_32_service_allowed_allows() {
    let mut policy = sample_policy();
    let mut allowed_services = HashSet::new();
    allowed_services.insert("svc_approved_01".to_string());
    policy.allowed_services = Some(allowed_services);

    let mut req = sample_request();
    req.service_id = Some("svc_approved_01".to_string());

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Allow);
    assert_eq!(decision.reason_code, ReasonCode::Approved);
}

#[test]
fn test_33_risk_engine_low_score() {
    let policy = sample_policy();
    let req = sample_request();
    let ctx = RiskContext {
        recipient_prior_tx_count: 10,
        service_prior_tx_count: 5,
        recent_failures_count: 0,
        recent_15m_tx_count: 1,
    };

    let risk_eval = evaluate_risk(&req, &policy, &ctx);
    assert_eq!(risk_eval.level, RiskLevel::Low);
    assert!(risk_eval.score < 30);
}

#[test]
fn test_34_risk_engine_medium_score() {
    let mut policy = sample_policy();
    policy.daily_limit = 1_000_000;
    policy.daily_spent = 500_000; // 50% utilization (+15)
    let mut req = sample_request();
    req.amount = 350_000; // 500k + 350k = 850k (85% utilization => +30)
    policy.per_transaction_limit = 400_000; // 350k / 400k = 87% (+10)

    let ctx = RiskContext {
        recipient_prior_tx_count: 2, // (+5)
        service_prior_tx_count: 1,
        recent_failures_count: 0,
        recent_15m_tx_count: 1,
    };

    let risk_eval = evaluate_risk(&req, &policy, &ctx);
    assert_eq!(risk_eval.level, RiskLevel::Medium);
    assert!(risk_eval.score >= 30 && risk_eval.score < 60);
}

#[test]
fn test_35_risk_engine_high_triggers_approval_required() {
    let mut policy = sample_policy();
    policy.daily_limit = 1_000_000;
    policy.daily_spent = 600_000;
    policy.per_transaction_limit = 400_000;

    let mut req = sample_request();
    req.amount = 380_000; // 95% of per-tx limit (+25), 98% of daily limit (+30)

    let ctx = RiskContext {
        recipient_prior_tx_count: 0, // new recipient (+20)
        service_prior_tx_count: 0,
        recent_failures_count: 3,    // failure burst (+10)
        recent_15m_tx_count: 5,      // high velocity (+15)
    };

    let decision = authorize_with_context(&req, &policy, Some(&ctx));
    assert_eq!(decision.decision, Decision::ApprovalRequired);
    assert_eq!(decision.reason_code, ReasonCode::RiskHigh);
    assert_eq!(decision.risk_level, Some(RiskLevel::High));
    assert!(decision.risk_score.unwrap() >= 60);
}

#[test]
fn test_36_policy_composition_tightens_limits() {
    let mut org_policy = sample_policy();
    org_policy.per_transaction_limit = 300_000;
    org_policy.daily_limit = 3_000_000;
    org_policy.approval_threshold = Some(250_000);

    let mut agent_policy = sample_policy();
    agent_policy.per_transaction_limit = 500_000;
    agent_policy.daily_limit = 2_000_000;
    agent_policy.approval_threshold = Some(400_000);

    let composite = compose_policies(&org_policy, &agent_policy);

    // Stricter limits must prevail
    assert_eq!(composite.per_transaction_limit, 300_000); // min(300k, 500k)
    assert_eq!(composite.daily_limit, 2_000_000);         // min(3M, 2M)
    assert_eq!(composite.approval_threshold, Some(250_000)); // min(250k, 400k)
}

#[test]
fn test_37_policy_composition_preserves_strictest_blocklist() {
    let mut org_policy = sample_policy();
    let blocked_org = Address::parse("0x1111111111111111111111111111111111111111").unwrap();
    org_policy.blocked_recipients.insert(blocked_org.clone());

    let mut agent_policy = sample_policy();
    let blocked_agent = Address::parse("0x2222222222222222222222222222222222222222").unwrap();
    agent_policy.blocked_recipients.insert(blocked_agent.clone());

    let composite = compose_policies(&org_policy, &agent_policy);

    assert!(composite.blocked_recipients.contains(&blocked_org));
    assert!(composite.blocked_recipients.contains(&blocked_agent));
}

#[test]
fn test_38_policy_simulation_does_not_mutate_and_flags_simulation() {
    let policy = sample_policy();
    let req = sample_request();

    let decision = simulate(&req, &policy, None);
    assert!(decision.simulation);
    assert_eq!(decision.decision, Decision::Allow);
}

#[tokio::test]
async fn test_39_http_simulate_endpoint() {
    let app = create_router();

    let req_body = json!({
        "request_id": "req_sim_01",
        "agent_id": "research-agent",
        "recipient": "0x71c678d311516474809e39842c12f44b20a32508",
        "amount": "100000",
        "asset": "USDC",
        "purpose": "simulation_test"
    });

    let req = Request::builder()
        .uri("/v1/simulate")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_vec(&req_body).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json_resp: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json_resp["decision"], "ALLOW");
    assert_eq!(json_resp["simulation"], true);
}

#[test]
fn test_40_explainability_checks_contain_all_rules() {
    let policy = sample_policy();
    let req = sample_request();
    let ctx = RiskContext::default();

    let decision = authorize_with_context(&req, &policy, Some(&ctx));
    assert!(!decision.checks.is_empty());

    let rule_names: Vec<&str> = decision.checks.iter().map(|c| c.rule.as_str()).collect();
    assert!(rule_names.contains(&"policy_enabled"));
    assert!(rule_names.contains(&"valid_amount"));
    assert!(rule_names.contains(&"allowed_asset"));
    assert!(rule_names.contains(&"recipient_blocked"));
    assert!(rule_names.contains(&"recipient_allowed"));
    assert!(rule_names.contains(&"per_transaction_limit"));
    assert!(rule_names.contains(&"daily_transaction_count"));
    assert!(rule_names.contains(&"daily_spending_limit"));
    assert!(rule_names.contains(&"risk_budget_utilization"));
    assert!(rule_names.contains(&"approval_threshold"));
}

#[test]
fn test_41_blocked_service_denies() {
    let mut policy = sample_policy();
    policy.blocked_services.insert("banned-service".to_string());

    let mut req = sample_request();
    req.service_id = Some("banned-service".to_string());

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::ServiceBlocked);
}

#[test]
fn test_42_blocked_asset_denies() {
    let mut policy = sample_policy();
    policy.blocked_assets.insert("USDT".to_string());

    let mut req = sample_request();
    req.asset = "USDT".to_string();

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::AssetBlocked);
}

#[test]
fn test_43_service_novelty_risk() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.service_id = Some("novel-service".to_string());

    let mut ctx_novel = RiskContext::default();
    ctx_novel.service_prior_tx_count = 0; // Brand new service

    let mut ctx_established = RiskContext::default();
    ctx_established.service_prior_tx_count = 15; // Familiar service

    let eval_novel = evaluate_risk(&req, &policy, &ctx_novel);
    let eval_est = evaluate_risk(&req, &policy, &ctx_established);

    assert!(eval_novel.score > eval_est.score);
    assert!(eval_novel.checks.iter().any(|c| c.rule == "risk_service_novelty" && c.message.contains("+10 pts")));
    assert!(eval_est.checks.iter().any(|c| c.rule == "risk_service_novelty" && c.message.contains("+0 pts")));
}

#[test]
fn test_44_policy_version_propagated() {
    let mut policy = sample_policy();
    policy.policy_version = Some("pol_ver_2026_09_22".to_string());

    let req = sample_request();
    let decision = authorize(&req, &policy);

    assert_eq!(decision.policy_version, Some("pol_ver_2026_09_22".to_string()));
}

#[test]
fn test_45_determinism_1000_iterations() {
    let policy = sample_policy();
    let req = sample_request();
    let ctx = RiskContext::default();

    let baseline = authorize_with_context(&req, &policy, Some(&ctx));

    for _ in 0..1000 {
        let run = authorize_with_context(&req, &policy, Some(&ctx));
        assert_eq!(run.decision, baseline.decision);
        assert_eq!(run.reason_code, baseline.reason_code);
        assert_eq!(run.risk_score, baseline.risk_score);
        assert_eq!(run.risk_level, baseline.risk_level);
        assert_eq!(run.policy_version, baseline.policy_version);
        assert_eq!(run.checks.len(), baseline.checks.len());
        for (a, b) in run.checks.iter().zip(baseline.checks.iter()) {
            assert_eq!(a.rule, b.rule);
            assert_eq!(a.passed, b.passed);
            assert_eq!(a.message, b.message);
        }
    }
}

#[test]
fn test_46_invariant_hard_deny_inviolable() {
    // 1. Recipient blocked: must DENY even if amount is tiny and threshold is huge
    let mut policy = sample_policy();
    let blocked_addr = Address::parse("0xdead000000000000000000000000000000000000").unwrap();
    policy.blocked_recipients.insert(blocked_addr.clone());
    policy.approval_threshold = Some(1_000_000_000);

    let mut req = sample_request();
    req.recipient = blocked_addr;
    req.amount = 1; // 1 base unit

    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::RecipientBlocked);
    // Crucial invariant: never ApprovalRequired or Allow
    assert_ne!(decision.decision, Decision::ApprovalRequired);
    assert_ne!(decision.decision, Decision::Allow);

    // 2. Limit exceeded: must DENY even if risk is zero
    let mut req2 = sample_request();
    req2.amount = policy.per_transaction_limit + 1;
    let decision2 = authorize(&req2, &policy);
    assert_eq!(decision2.decision, Decision::Deny);
    assert_eq!(decision2.reason_code, ReasonCode::AmountExceedsTransactionLimit);
    assert_ne!(decision2.decision, Decision::ApprovalRequired);
}

#[test]
fn test_47_invariant_u64_max_overflow_safety() {
    let policy = sample_policy();
    let mut req = sample_request();
    req.amount = u64::MAX;

    // Must safely evaluate without panic and cleanly DENY
    let decision = authorize(&req, &policy);
    assert_eq!(decision.decision, Decision::Deny);
    assert_eq!(decision.reason_code, ReasonCode::AmountExceedsTransactionLimit);

    // Also test daily_spent overflow safety
    let mut policy_overflow = sample_policy();
    policy_overflow.daily_spent = u64::MAX - 10;
    let mut req_overflow = sample_request();
    req_overflow.amount = 50; // would wrap u64 if unchecked

    let decision_overflow = authorize(&req_overflow, &policy_overflow);
    assert_eq!(decision_overflow.decision, Decision::Deny);
    assert_eq!(decision_overflow.reason_code, ReasonCode::DailyLimitExceeded);
}

#[test]
fn test_48_composition_unions_blocked_assets_and_services() {
    let mut org_policy = sample_policy();
    org_policy.blocked_assets.insert("BTC".to_string());
    org_policy.blocked_services.insert("service-alpha".to_string());

    let mut agent_policy = sample_policy();
    agent_policy.blocked_assets.insert("ETH".to_string());
    agent_policy.blocked_services.insert("service-beta".to_string());

    let composite = compose_policies(&org_policy, &agent_policy);

    assert!(composite.blocked_assets.contains("BTC"));
    assert!(composite.blocked_assets.contains("ETH"));
    assert!(composite.blocked_services.contains("service-alpha"));
    assert!(composite.blocked_services.contains("service-beta"));
}



