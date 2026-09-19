use axum::{http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

pub async fn health_handler() -> (StatusCode, Json<HealthResponse>) {
    let response = HealthResponse {
        status: "ok".to_string(),
        service: "policy-engine".to_string(),
    };

    (StatusCode::OK, Json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_response_payload() {
        let (status, Json(response)) = health_handler().await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(response.status, "ok");
        assert_eq!(response.service, "policy-engine");
    }
}
