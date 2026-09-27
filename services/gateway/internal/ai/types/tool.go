package types

import (
	"encoding/json"
	"strings"
)

// AITool encapsulates an external callable tool provided to an AI model.
// CRITICAL SECURITY INVARIANT:
// AI tools may ONLY be READ-ONLY information queries.
// No tool may ever execute payment, sign transactions, mutate policy, or access private keys.
type AITool struct {
	Type     string        `json:"type"` // typically "function"
	Function AIFunctionDef `json:"function"`
}

// AIFunctionDef defines the JSON schema parameters for an AI tool function.
type AIFunctionDef struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// AIToolCall represents a tool call emitted by the LLM.
type AIToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

// AIToolResult represents the execution result of an AI tool.
type AIToolResult struct {
	ToolCallID string `json:"tool_call_id"`
	ToolName   string `json:"tool_name"`
	Content    string `json:"content"`
	IsError    bool   `json:"is_error"`
}

// ProhibitedToolPatterns contains substring indicators of financial mutation or key access.
var ProhibitedToolPatterns = []string{
	"sign",
	"execute",
	"transfer",
	"pay",
	"send",
	"withdraw",
	"private_key",
	"privatekey",
	"seed",
	"vault",
	"pause",
	"unpause",
	"mutate_policy",
	"increase_limit",
	"override",
}

// ValidateToolSafety ensures the tool function adheres to the read-only security boundary.
func ValidateToolSafety(tool AITool) error {
	nameLower := strings.ToLower(tool.Function.Name)
	descLower := strings.ToLower(tool.Function.Description)

	for _, pattern := range ProhibitedToolPatterns {
		if strings.Contains(nameLower, pattern) || strings.Contains(descLower, pattern) {
			return NewAIError(
				ErrCodeSecurityViolation,
				"prohibited tool name or description: tools must never perform financial mutation, signing, or key access: "+pattern,
				false,
				nil,
			)
		}
	}

	// Also check parameter names if present
	if paramsJSON, err := json.Marshal(tool.Function.Parameters); err == nil {
		paramsLower := strings.ToLower(string(paramsJSON))
		for _, pattern := range []string{"private_key", "secret_key", "raw_tx", "sign_tx"} {
			if strings.Contains(paramsLower, pattern) {
				return NewAIError(
					ErrCodeSecurityViolation,
					"prohibited tool parameter: tool parameters must never request sensitive cryptographic keys: "+pattern,
					false,
					nil,
				)
			}
		}
	}

	return nil
}
