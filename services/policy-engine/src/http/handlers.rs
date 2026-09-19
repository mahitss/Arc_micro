use crate::domain::{Address, PaymentRequest, Policy};
use crate::engine::{authorize, get_demo_policy};
use crate::http::models::{AuthorizeHttpRequest, AuthorizeHttpResponse, ErrorResponse};
use axum::{http::StatusCode, Json};

/// Handler for POST /v1/authorize
///
/// HTTP Semantics:
/// - 200: Successfully evaluated authorization (both ALLOW and DENY).
/// - 400: Malformed requests that cannot be evaluated.
/// - 500: Genuine server failures.
pub async fn authorize_handler(
    Json(payload): Json<AuthorizeHttpRequest>,
) -> Result<Json<AuthorizeHttpResponse>, (StatusCode, Json<ErrorResponse>)> {
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
    // Amounts must be base-10 unsigned integer strings without decimal points or signs.
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
        // Unknown agent defaults to a disabled policy
        Policy {
            agent_id: payload.agent_id.clone(),
            enabled: false,
            per_transaction_limit: 0,
            daily_limit: 0,
            daily_spent: 0,
            allowed_recipients: None,
            blocked_recipients: std::collections::HashSet::new(),
            allowed_assets: std::collections::HashSet::new(),
            max_transactions_per_day: 0,
            daily_transaction_count: 0,
        }
    };

    // 6. Construct domain payment request
    let domain_req = PaymentRequest {
        request_id: payload.request_id,
        agent_id: payload.agent_id,
        recipient,
        amount,
        asset: payload.asset,
        purpose: payload.purpose,
    };

    // 7. Pure deterministic evaluation
    let decision = authorize(&domain_req, &policy);

    // 8. Structured logging (never log secrets or private keys)
    tracing::info!(
        request_id = %decision.request_id,
        agent_id = %domain_req.agent_id,
        decision = ?decision.decision,
        reason_code = ?decision.reason_code,
        "Evaluated authorization decision"
    );

    // 9. Return HTTP 200 with evaluated decision
    Ok(Json(decision.into()))
}
