use crate::domain::{Address, PaymentRequest, Policy};
use crate::engine::{authorize_with_context, get_demo_policy, simulate};
use crate::http::models::{AuthorizeHttpRequest, AuthorizeHttpResponse, ErrorResponse};
use axum::{http::StatusCode, Json};

fn parse_authorize_request(
    payload: AuthorizeHttpRequest,
) -> Result<(PaymentRequest, Policy), (StatusCode, Json<ErrorResponse>)> {
    // 1. Validate request ID
    if payload.request_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "INVALID_REQUEST_ID".to_string(),
                message: "Field 'request_id' must not be empty.".to_string(),
            }),
        ));
    }

    // 2. Validate agent ID
    if payload.agent_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "INVALID_AGENT_ID".to_string(),
                message: "Field 'agent_id' must not be empty.".to_string(),
            }),
        ));
    }

    // 3. Validate recipient address syntax and normalization
    let recipient = match Address::parse(&payload.recipient) {
        Ok(addr) => addr,
        Err(err) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "INVALID_RECIPIENT_ADDRESS".to_string(),
                    message: format!("Field 'recipient' is not a valid address: {err}"),
                }),
            ));
        }
    };

    // 4. Validate and parse amount string
    let amount_str = payload.amount.trim();
    if amount_str.is_empty() || !amount_str.chars().all(|c| c.is_ascii_digit()) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "MALFORMED_AMOUNT".to_string(),
                message: format!(
                    "Field 'amount' must be an unsigned integer string in token base units. Got: '{}'.",
                    payload.amount
                ),
            }),
        ));
    }

    let amount = match amount_str.parse::<u64>() {
        Ok(val) => val,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "AMOUNT_OVERFLOW".to_string(),
                    message: "Field 'amount' exceeds maximum supported integer value.".to_string(),
                }),
            ));
        }
    };

    // 5. Resolve policy for agent (demo policy for development)
    let policy = if payload.agent_id == "research-agent" {
        get_demo_policy()
    } else {
        Policy {
            policy_id: None,
            organization_id: payload.organization_id.clone(),
            agent_id: payload.agent_id.clone(),
            enabled: false,
            global_paused: false,
            agent_paused: false,
            organization_paused: false,
            per_transaction_limit: 0,
            daily_limit: 0,
            daily_spent: 0,
            approval_threshold: None,
            max_transactions_per_day: 0,
            daily_transaction_count: 0,
            hourly_limit: None,
            hourly_spent: None,
            max_transactions_per_hour: None,
            hourly_transaction_count: None,
            allowed_assets: std::collections::HashSet::new(),
            allowed_recipients: None,
            blocked_recipients: std::collections::HashSet::new(),
            allowed_services: None,
        }
    };

    // 6. Construct domain payment request
    let domain_req = PaymentRequest {
        request_id: payload.request_id,
        agent_id: payload.agent_id,
        organization_id: payload.organization_id,
        service_id: payload.service_id,
        recipient,
        amount,
        asset: payload.asset,
        purpose: payload.purpose,
        timestamp: payload.timestamp,
    };

    Ok((domain_req, policy))
}

/// Handler for POST /v1/authorize
///
/// HTTP Semantics:
/// - 200: Successfully evaluated authorization (ALLOW, DENY, or APPROVAL_REQUIRED).
/// - 400: Malformed requests that cannot be evaluated.
/// - 500: Genuine server failures.
pub async fn authorize_handler(
    Json(payload): Json<AuthorizeHttpRequest>,
) -> Result<Json<AuthorizeHttpResponse>, (StatusCode, Json<ErrorResponse>)> {
    let risk_context = payload.risk_context.clone();
    let (domain_req, policy) = parse_authorize_request(payload)?;

    // Pure deterministic evaluation
    let decision = authorize_with_context(&domain_req, &policy, risk_context.as_ref());

    // Structured logging (never log secrets or private keys)
    tracing::info!(
        request_id = %decision.request_id,
        agent_id = %domain_req.agent_id,
        decision = ?decision.decision,
        reason_code = ?decision.reason_code,
        "Evaluated authorization decision"
    );

    // Return HTTP 200 with evaluated decision
    Ok(Json(decision.into()))
}

/// Handler for POST /v1/simulate
///
/// Simulates policy and risk evaluation without mutating state or triggering real executions.
pub async fn simulate_handler(
    Json(payload): Json<AuthorizeHttpRequest>,
) -> Result<Json<AuthorizeHttpResponse>, (StatusCode, Json<ErrorResponse>)> {
    let risk_context = payload.risk_context.clone();
    let (domain_req, policy) = parse_authorize_request(payload)?;

    // Pure deterministic simulation
    let decision = simulate(&domain_req, &policy, risk_context.as_ref());

    tracing::info!(
        request_id = %decision.request_id,
        agent_id = %domain_req.agent_id,
        decision = ?decision.decision,
        reason_code = ?decision.reason_code,
        "Evaluated policy simulation"
    );

    Ok(Json(decision.into()))
}

