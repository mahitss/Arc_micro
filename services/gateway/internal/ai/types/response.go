package types

// AIUsage captures token utilization and estimated cost for an AI generation.
type AIUsage struct {
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TotalTokens      int     `json:"total_tokens"`
	EstimatedCostUSD float64 `json:"estimated_cost_usd"`
}

// AIResponse represents a unified response from any AI provider.
type AIResponse struct {
	ID           string       `json:"id"`
	Provider     string       `json:"provider"`
	Model        string       `json:"model"`
	Content      string       `json:"content"`
	ToolCalls    []AIToolCall `json:"tool_calls,omitempty"`
	Usage        AIUsage      `json:"usage"`
	LatencyMS    int64        `json:"latency_ms"`
	FinishReason string       `json:"finish_reason"`
	RawJSON      []byte       `json:"raw_json,omitempty"`
}

// AIStreamChunk represents a streaming delta from an AI provider.
type AIStreamChunk struct {
	ID           string       `json:"id"`
	Model        string       `json:"model"`
	Delta        string       `json:"delta"`
	ToolCalls    []AIToolCall `json:"tool_calls,omitempty"`
	FinishReason string       `json:"finish_reason,omitempty"`
	Error        error        `json:"error,omitempty"`
}
