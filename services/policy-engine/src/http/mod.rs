pub mod handlers;
pub mod models;

use crate::health::health_handler;
use axum::{
    routing::{get, post},
    Router,
};
use handlers::{authorize_handler, simulate_handler};
use tower_http::trace::TraceLayer;

/// Construct the Axum application router.
pub fn create_router() -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/v1/authorize", post(authorize_handler))
        .route("/v1/simulate", post(simulate_handler))
        .layer(TraceLayer::new_for_http())
}

