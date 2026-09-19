use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use policy_engine::{
    domain::{Address, Decision, PaymentRequest, Policy, ReasonCode},
    engine::authorize,
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
        agent_id: "test-agent".to_string(),
        enabled: true,
        per_transaction_limit: 500_000, // 0.50 USDC
        daily_limit: 5_000_000,         // 5.00 USDC
        daily_spent: 1_000_000,         // 1.00 USDC already spent
        allowed_recipients: Some(allowed_recipients),
        blocked_recipients,
        allowed_assets,
        max_transactions_per_day: 10,
        daily_transaction_count: 2,
    }
}

fn sample_request() -> PaymentRequest {
    PaymentRequest {
        request_id: "req_001".to_string(),
        agent_id: "test-agent".to_string(),
        recipient: Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap(),
        amount: 250_000,
        asset: "USDC".to_string(),
        purpose: "compute_api".to_string(),
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
