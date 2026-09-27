package types

// AIRole defines the role of a message in an AI conversation.
type AIRole string

const (
	RoleSystem    AIRole = "system"
	RoleUser      AIRole = "user"
	RoleAssistant AIRole = "assistant"
	RoleTool      AIRole = "tool"
)

// AIMessage represents a single message in an AI interaction.
type AIMessage struct {
	Role       AIRole        `json:"role"`
	Content    string        `json:"content"`
	Name       string        `json:"name,omitempty"`
	ToolCalls  []AIToolCall  `json:"tool_calls,omitempty"`
	ToolCallID string        `json:"tool_call_id,omitempty"`
}

// AIRequest represents a canonical request to the universal AI provider layer.
type AIRequest struct {
	TaskType          string            `json:"task_type"`
	Model             string            `json:"model,omitempty"`
	FallbackModels    []string          `json:"fallback_models,omitempty"`
	Messages          []AIMessage       `json:"messages"`
	SystemInstruction string            `json:"system_instruction,omitempty"`
	ResponseFormat    map[string]string `json:"response_format,omitempty"`
	Temperature       float64           `json:"temperature"`
	MaxTokens         int               `json:"max_tokens,omitempty"`
	Tools             []AITool          `json:"tools,omitempty"`
	TimeoutMS         int               `json:"timeout_ms,omitempty"`
	CorrelationID     string            `json:"correlation_id,omitempty"`
	CausationID       string            `json:"causation_id,omitempty"`
	PromptVersion     string            `json:"prompt_version,omitempty"`
	Metadata          map[string]string `json:"metadata,omitempty"`
}
