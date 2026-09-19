package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrModelExecutionFailed = errors.New("ai model execution failed")
	ErrMalformedModelOutput = errors.New("ai model returned malformed output")
)

// AgentTask represents a high-level task submitted to an agent.
type AgentTask struct {
	AgentID      string `json:"agent_id"`
	Task         string `json:"task"`
	VaultAddress string `json:"vault_address,omitempty"`
}

// AIIntentResponse represents the raw structured JSON output returned by the AI model.
type AIIntentResponse struct {
	RequiresPayment bool   `json:"requires_payment"`
	Service         string `json:"service,omitempty"`
	Recipient       string `json:"recipient,omitempty"`
	Amount          string `json:"amount,omitempty"`
	Asset           string `json:"asset,omitempty"`
	Purpose         string `json:"purpose,omitempty"`
	Justification   string `json:"justification,omitempty"`
}

// AgentModel is the pluggable interface for AI reasoning engines.
type AgentModel interface {
	GeneratePaymentIntent(ctx context.Context, task AgentTask) (*AIIntentResponse, error)
}

// MockAgentModel is a deterministic implementation for testing and development.
type MockAgentModel struct {
	CustomResponse *AIIntentResponse
	CustomErr      error
	HandlerFunc    func(ctx context.Context, task AgentTask) (*AIIntentResponse, error)
}

// GeneratePaymentIntent evaluates the task using the mock rules or custom handler.
func (m *MockAgentModel) GeneratePaymentIntent(ctx context.Context, task AgentTask) (*AIIntentResponse, error) {
	if m.CustomErr != nil {
		return nil, m.CustomErr
	}
	if m.CustomResponse != nil {
		return m.CustomResponse, nil
	}
	if m.HandlerFunc != nil {
		return m.HandlerFunc(ctx, task)
	}

	// Default heuristic: tasks mentioning "Arc", "research", or "data" require web-research payment
	lower := strings.ToLower(task.Task)
	if strings.Contains(lower, "arc") || strings.Contains(lower, "research") || strings.Contains(lower, "data") || strings.Contains(lower, "find") {
		return &AIIntentResponse{
			RequiresPayment: true,
			Service:         "web-research",
			Recipient:       "0x1111111111111111111111111111111111111111",
			Amount:          "180000",
			Asset:           "USDC",
			Purpose:         "api_usage",
			Justification:   "External web research is required to complete the task.",
		}, nil
	}

	return &AIIntentResponse{
		RequiresPayment: false,
	}, nil
}

// HTTPModel interacts with an OpenAI-compatible JSON-mode LLM endpoint.
type HTTPModel struct {
	endpoint   string
	model      string
	apiKey     string
	systemText string
	client     *http.Client
}

// NewHTTPModel creates an HTTP-based AgentModel.
func NewHTTPModel(endpoint, model, apiKey, systemPrompt string) *HTTPModel {
	if endpoint == "" {
		endpoint = "https://api.openai.com/v1/chat/completions"
	}
	return &HTTPModel{
		endpoint:   endpoint,
		model:      model,
		apiKey:     apiKey,
		systemText: systemPrompt,
		client:     &http.Client{Timeout: 30 * time.Second},
	}
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatRequest struct {
	Model          string              `json:"model"`
	Messages       []openAIChatMessage `json:"messages"`
	ResponseFormat map[string]string   `json:"response_format,omitempty"`
	Temperature    float64             `json:"temperature"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// GeneratePaymentIntent sends the prompt with isolated user input to the LLM.
func (h *HTTPModel) GeneratePaymentIntent(ctx context.Context, task AgentTask) (*AIIntentResponse, error) {
	// Prompt injection defense: isolate untrusted user task within clear XML delimiters
	userContent := fmt.Sprintf("<user_task>\n%s\n</user_task>", task.Task)

	reqBody := openAIChatRequest{
		Model: h.model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: h.systemText},
			{Role: "user", Content: userContent},
		},
		ResponseFormat: map[string]string{"type": "json_object"},
		Temperature:    0.0, // Maximum determinism
	}

	reqBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal LLM request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.endpoint, bytes.NewReader(reqBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create LLM request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if h.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+h.apiKey)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrModelExecutionFailed, err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read LLM response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d: %s", ErrModelExecutionFailed, resp.StatusCode, string(bodyBytes))
	}

	var chatResp openAIChatResponse
	if err := json.Unmarshal(bodyBytes, &chatResp); err != nil {
		return nil, fmt.Errorf("%w: invalid JSON response: %v", ErrMalformedModelOutput, err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("%w: no choices returned", ErrMalformedModelOutput)
	}

	rawContent := chatResp.Choices[0].Message.Content
	var intentResp AIIntentResponse
	if err := json.Unmarshal([]byte(rawContent), &intentResp); err != nil {
		return nil, fmt.Errorf("%w: failed to parse structured output: %v", ErrMalformedModelOutput, err)
	}

	return &intentResp, nil
}
