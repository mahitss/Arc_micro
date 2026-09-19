package http

import (
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/health"
)

// NewRouter sets up and returns the HTTP mux for the Gateway.
func NewRouter(cfg *config.Config) http.Handler {
	mux := http.NewServeMux()

	// Register health check endpoint
	mux.HandleFunc("GET /health", health.Handler)

	return mux
}
