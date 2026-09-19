mod config;
mod health;

use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn app() -> Router {
    Router::new()
        .route("/health", get(health::health_handler))
        .layer(TraceLayer::new_for_http())
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,policy_engine=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::load();
    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));

    tracing::info!("[AgentPay Policy Engine] Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener");

    axum::serve(listener, app())
        .await
        .expect("Policy engine server failed");
}
