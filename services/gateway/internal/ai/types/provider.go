package types

import (
	"context"
	"time"
)

// AIModel encapsulates metadata regarding an available model supported by an AI provider.
type AIModel struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Provider      string   `json:"provider"`
	ContextWindow int      `json:"context_window"`
	PricingInput  float64  `json:"pricing_input_per_m"`
	PricingOutput float64  `json:"pricing_output_per_m"`
	SupportsTools bool     `json:"supports_tools"`
	SupportsJSON  bool     `json:"supports_json"`
	IsFree        bool     `json:"is_free"`
	Capabilities  []string `json:"capabilities"`
}

// AIProviderStatus represents the health status of an AI provider.
type AIProviderStatus string

const (
	StatusConnected AIProviderStatus = "CONNECTED"
	StatusDegraded  AIProviderStatus = "DEGRADED"
	StatusOffline   AIProviderStatus = "OFFLINE"
)

// AIProviderHealth reports latency and availability metrics for an AI provider.
type AIProviderHealth struct {
	Provider        string           `json:"provider"`
	Status          AIProviderStatus `json:"status"`
	LatencyMS       int64            `json:"latency_ms"`
	LastChecked     time.Time        `json:"last_checked"`
	LastError       string           `json:"last_error,omitempty"`
	ConfiguredModel string           `json:"configured_model"`
	FallbackEnabled bool             `json:"fallback_enabled"`
}

// AIProvider defines the canonical, provider-agnostic interface for AI generation in AgentPay.
// ARCHITECTURAL MANDATE:
// All application components (missions, marketplace, swarms, control tower) MUST depend
// strictly on this interface, never directly on OpenRouter or any proprietary provider SDK.
type AIProvider interface {
	// Name returns the identifier of the provider (e.g. "openrouter", "mock", "gemini").
	Name() string

	// Generate executes a standard textual completion or chat generation.
	Generate(ctx context.Context, req AIRequest) (*AIResponse, error)

	// GenerateStructured enforces strict JSON-schema decoding against target output.
	GenerateStructured(ctx context.Context, req AIRequest, target interface{}) (*AIResponse, error)

	// GenerateWithTools provides execution with isolated, read-only external tool calls.
	GenerateWithTools(ctx context.Context, req AIRequest, tools []AITool) (*AIResponse, error)

	// Stream provides real-time token streaming delta events.
	Stream(ctx context.Context, req AIRequest) (<-chan AIStreamChunk, error)

	// Health reports live connection status and latency.
	Health(ctx context.Context) (*AIProviderHealth, error)
}
