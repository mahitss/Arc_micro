use criterion::{black_box, criterion_group, criterion_main, Criterion};
use policy_engine::{
    domain::{Address, Decision, PaymentRequest, Policy},
    engine::{authorize, compose_policies},
};
use std::collections::HashSet;

fn base_policy() -> Policy {
    let mut allowed_recipients = HashSet::new();
    allowed_recipients.insert(Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap());
    allowed_recipients.insert(Address::parse("0x2546bcd3279c0b1060285661688744d9f7518777").unwrap());

    let mut blocked_recipients = HashSet::new();
    blocked_recipients.insert(Address::parse("0xdead000000000000000000000000000000000000").unwrap());

    let mut allowed_assets = HashSet::new();
    allowed_assets.insert("USDC".to_string());

    Policy {
        policy_id: Some("pol_bench_01".to_string()),
        organization_id: Some("org_bench".to_string()),
        agent_id: "bench-agent".to_string(),
        enabled: true,
        global_paused: false,
        agent_paused: false,
        organization_paused: false,
        per_transaction_limit: 1_000_000, // 1.00 USDC
        daily_limit: 10_000_000,          // 10.00 USDC
        daily_spent: 1_000_000,          // 1.00 USDC
        approval_threshold: Some(5_000_000), // 5.00 USDC
        max_transactions_per_day: 100,
        daily_transaction_count: 5,
        hourly_limit: Some(3_000_000),
        hourly_spent: Some(500_000),
        max_transactions_per_hour: Some(20),
        hourly_transaction_count: Some(2),
        allowed_recipients: Some(allowed_recipients),
        blocked_recipients,
        allowed_assets,
        allowed_services: None,
        blocked_services: HashSet::new(),
        blocked_assets: HashSet::new(),
        policy_version: Some("v1.0.0".to_string()),
    }
}

fn base_request() -> PaymentRequest {
    PaymentRequest {
        request_id: "req_bench_001".to_string(),
        agent_id: "bench-agent".to_string(),
        organization_id: Some("org_bench".to_string()),
        service_id: None,
        recipient: Address::parse("0x71c678d311516474809e39842c12f44b20a32508").unwrap(),
        amount: 250_000, // 0.25 USDC
        asset: "USDC".to_string(),
        purpose: "api_compute".to_string(),
        timestamp: Some(1726833600),
    }
}

fn bench_scenarios(c: &mut Criterion) {
    let mut group = c.benchmark_group("policy_engine_pure_evaluation");

    // 1. Simple ALLOW
    {
        let policy = base_policy();
        let req = base_request();
        group.bench_function("01_simple_allow", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::Allow);
            })
        });
    }

    // 2. Amount DENY
    {
        let policy = base_policy();
        let mut req = base_request();
        req.amount = 2_000_000; // Exceeds per_transaction_limit of 1_000_000
        group.bench_function("02_amount_deny", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::Deny);
            })
        });
    }

    // 3. Velocity DENY
    {
        let mut policy = base_policy();
        policy.daily_transaction_count = 100; // Matches max_transactions_per_day
        let req = base_request();
        group.bench_function("03_velocity_deny", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::Deny);
            })
        });
    }

    // 4. Blocklist DENY
    {
        let policy = base_policy();
        let mut req = base_request();
        req.recipient = Address::parse("0xdead000000000000000000000000000000000000").unwrap();
        group.bench_function("04_blocklist_deny", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::Deny);
            })
        });
    }

    // 5. High-risk APPROVAL_REQUIRED
    {
        let mut policy = base_policy();
        policy.per_transaction_limit = 10_000_000;
        policy.approval_threshold = Some(500_000); // 0.50 USDC threshold
        let mut req = base_request();
        req.amount = 1_000_000; // 1.00 USDC >= 0.50 USDC threshold
        group.bench_function("05_high_risk_approval_required", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::ApprovalRequired);
            })
        });
    }

    // 6. Complex Composed Policy
    {
        let org_policy = base_policy();
        let mut agent_policy = base_policy();
        agent_policy.policy_id = Some("pol_bench_agent".to_string());
        agent_policy.per_transaction_limit = 800_000;
        let req = base_request();

        group.bench_function("06_complex_composed_policy", |b| {
            b.iter(|| {
                let composed = compose_policies(black_box(&org_policy), black_box(&agent_policy));
                let decision = authorize(black_box(&req), black_box(&composed));
                assert_eq!(decision.decision, Decision::Allow);
            })
        });
    }

    // 7. Blocked Service DENY
    {
        let mut policy = base_policy();
        policy.blocked_services.insert("evil-service".to_string());
        let mut req = base_request();
        req.service_id = Some("evil-service".to_string());

        group.bench_function("07_service_blocked_deny", |b| {
            b.iter(|| {
                let decision = authorize(black_box(&req), black_box(&policy));
                assert_eq!(decision.decision, Decision::Deny);
            })
        });
    }

    group.finish();
}

criterion_group!(benches, bench_scenarios);
criterion_main!(benches);
