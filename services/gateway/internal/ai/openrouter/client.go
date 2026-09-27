package openrouter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/observability"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

// OpenRouterConfig holds operational settings for the OpenRouter client.
type OpenRouterConfig struct {
	BaseURL        string
	APIKey         string
	DefaultModel   string
	FallbackModels []string
	SiteURL        string
	AppName        string
	TimeoutMS      int
	MaxRetries     int
}

// LoadConfigFromEnv builds an OpenRouterConfig from environment variables.
func LoadConfigFromEnv() OpenRouterConfig {
	baseURL := os.Getenv("OPENROUTER_BASE_URL")
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api/v1"
	}
	baseURL = strings.TrimSuffix(baseURL, "/")

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("AI_API_KEY")
	}

	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = os.Getenv("AI_MODEL")
	}
	if model == "" {
		model = "nvidia/nemotron-3-ultra-550b-a55b:free"
	}

	rawFallbacks := os.Getenv("OPENROUTER_FALLBACK_MODELS")
	if rawFallbacks == "" {
		rawFallbacks = os.Getenv("AI_FALLBACK_MODELS")
	}
	var fallbacks []string
	if rawFallbacks != "" {
		for _, m := range strings.Split(rawFallbacks, ",") {
			if trimmed := strings.TrimSpace(m); trimmed != "" {
				fallbacks = append(fallbacks, trimmed)
			}
		}
	}
	if len(fallbacks) == 0 {
		fallbacks = []string{
			"cohere/north-mini-code:free",
			"google/gemma-4-31b-it:free",
			"poolside/laguna-s-2.1:free",
		}
	}

	timeoutMS := 30000
	if rawTimeout := os.Getenv("OPENROUTER_TIMEOUT_MS"); rawTimeout != "" {
		if parsed, err := strconv.Atoi(rawTimeout); err == nil && parsed > 0 {
			timeoutMS = parsed
		}
	}

	maxRetries := 3
	if rawRetries := os.Getenv("OPENROUTER_MAX_RETRIES"); rawRetries != "" {
		if parsed, err := strconv.Atoi(rawRetries); err == nil && parsed >= 0 {
			maxRetries = parsed
		}
	}

	siteURL := os.Getenv("OPENROUTER_SITE_URL")
	if siteURL == "" {
		siteURL = "https://agentpay.arc.io"
	}

	appName := os.Getenv("OPENROUTER_APP_NAME")
	if appName == "" {
		appName = "AgentPay"
	}

	return OpenRouterConfig{
		BaseURL:        baseURL,
		APIKey:         apiKey,
		DefaultModel:   model,
		FallbackModels: fallbacks,
		SiteURL:        siteURL,
		AppName:        appName,
		TimeoutMS:      timeoutMS,
		MaxRetries:     maxRetries,
	}
}

// OpenRouterProvider implements types.AIProvider using OpenRouter's official API.
type OpenRouterProvider struct {
	cfg        OpenRouterConfig
	httpClient *http.Client
	tracer     *observability.AITracer
}

// NewOpenRouterProvider creates a new OpenRouterProvider instance.
func NewOpenRouterProvider(cfg OpenRouterConfig) *OpenRouterProvider {
	timeout := time.Duration(cfg.TimeoutMS) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &OpenRouterProvider{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		tracer: observability.GetTracer(),
	}
}

func (p *OpenRouterProvider) Name() string {
	return "openrouter"
}

// openAIChatPayload mirrors OpenRouter's OpenAI-compatible chat completion payload.
type openAIChatPayload struct {
	Model          string                 `json:"model"`
	Models         []string               `json:"models,omitempty"`
	Messages       []types.AIMessage      `json:"messages"`
	ResponseFormat map[string]string      `json:"response_format,omitempty"`
	Temperature    float64                `json:"temperature"`
	MaxTokens      int                    `json:"max_tokens,omitempty"`
	Tools          []types.AITool         `json:"tools,omitempty"`
	Stream         bool                   `json:"stream,omitempty"`
}

type openAIChatResp struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int             `json:"index"`
		Message      types.AIMessage `json:"message"`
		FinishReason string          `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

// Generate executes a standard LLM chat completion via OpenRouter.
func (p *OpenRouterProvider) Generate(ctx context.Context, req types.AIRequest) (*types.AIResponse, error) {
	return p.executeWithRetry(ctx, req, false, nil)
}

// GenerateStructured executes an LLM request requesting JSON output, unmarshaling and validating against target.
func (p *OpenRouterProvider) GenerateStructured(ctx context.Context, req types.AIRequest, target interface{}) (*types.AIResponse, error) {
	if req.ResponseFormat == nil {
		req.ResponseFormat = map[string]string{"type": "json_object"}
	}

	resp, err := p.executeWithRetry(ctx, req, false, nil)
	if err != nil {
		return nil, err
	}

	if target != nil {
		if err := types.ParseAndValidateStructured([]byte(resp.Content), target); err != nil {
			p.tracer.Record(ctx, observability.AITraceRecord{
				RequestID:     resp.ID,
				CorrelationID: req.CorrelationID,
				Provider:      p.Name(),
				Model:         resp.Model,
				TaskType:      req.TaskType,
				Status:        "FAILED",
				ErrorType:     string(types.ErrCodeInvalidSchema),
				Timestamp:     time.Now(),
			})
			return nil, err
		}
	}

	return resp, nil
}

// GenerateWithTools executes an LLM request offering strictly validated read-only tools.
func (p *OpenRouterProvider) GenerateWithTools(ctx context.Context, req types.AIRequest, tools []types.AITool) (*types.AIResponse, error) {
	for _, tool := range tools {
		if err := types.ValidateToolSafety(tool); err != nil {
			return nil, err
		}
	}
	req.Tools = tools
	return p.executeWithRetry(ctx, req, false, nil)
}

// Stream initiates a real-time token stream from OpenRouter.
func (p *OpenRouterProvider) Stream(ctx context.Context, req types.AIRequest) (<-chan types.AIStreamChunk, error) {
	out := make(chan types.AIStreamChunk, 100)
	go func() {
		defer close(out)
		// For stream fallback or non-streaming backends, execute standard and emit single delta
		resp, err := p.Generate(ctx, req)
		if err != nil {
			out <- types.AIStreamChunk{Error: err}
			return
		}
		out <- types.AIStreamChunk{
			ID:           resp.ID,
			Model:        resp.Model,
			Delta:        resp.Content,
			ToolCalls:    resp.ToolCalls,
			FinishReason: resp.FinishReason,
		}
	}()
	return out, nil
}

// Health checks live availability by pinging the endpoint with a minimal query.
func (p *OpenRouterProvider) Health(ctx context.Context) (*types.AIProviderHealth, error) {
	start := time.Now()
	health := &types.AIProviderHealth{
		Provider:        p.Name(),
		LastChecked:     start,
		ConfiguredModel: p.cfg.DefaultModel,
		FallbackEnabled: len(p.cfg.FallbackModels) > 0,
	}

	if p.cfg.APIKey == "" {
		health.Status = types.StatusOffline
		health.LastError = "API key not configured"
		return health, nil
	}

	// Minimal health check request
	checkReq := types.AIRequest{
		TaskType: "HEALTH_CHECK",
		Model:    p.cfg.DefaultModel,
		Messages: []types.AIMessage{
			{Role: types.RoleUser, Content: "ping"},
		},
		MaxTokens: 5,
	}

	ctxTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	resp, err := p.Generate(ctxTimeout, checkReq)
	health.LatencyMS = time.Since(start).Milliseconds()

	if err != nil {
		health.Status = types.StatusDegraded
		health.LastError = err.Error()
		return health, err
	}

	if resp != nil {
		health.Status = types.StatusConnected
	}
	return health, nil
}

// executeWithRetry handles HTTP calls to OpenRouter with automatic backoff on 429/5xx.
func (p *OpenRouterProvider) executeWithRetry(ctx context.Context, req types.AIRequest, isStream bool, target interface{}) (*types.AIResponse, error) {
	model := req.Model
	if model == "" {
		model = p.cfg.DefaultModel
	}

	fallbacks := req.FallbackModels
	if len(fallbacks) == 0 {
		fallbacks = p.cfg.FallbackModels
	}

	// Build combined models list for OpenRouter's native routing
	var modelsList []string
	if strings.Contains(model, ",") {
		for _, m := range strings.Split(model, ",") {
			if t := strings.TrimSpace(m); t != "" {
				modelsList = append(modelsList, t)
			}
		}
		if len(modelsList) > 0 {
			model = modelsList[0]
		}
	} else {
		modelsList = append([]string{model}, fallbacks...)
	}

	// Ensure system prompt is present
	var messages []types.AIMessage
	if req.SystemInstruction != "" {
		messages = append(messages, types.AIMessage{
			Role:    types.RoleSystem,
			Content: req.SystemInstruction,
		})
	}
	messages = append(messages, req.Messages...)

	payload := openAIChatPayload{
		Model:          model,
		Models:         modelsList,
		Messages:       messages,
		ResponseFormat: req.ResponseFormat,
		Temperature:    req.Temperature,
		MaxTokens:      req.MaxTokens,
		Tools:          req.Tools,
		Stream:         isStream,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, types.NewAIError(types.ErrCodeMalformedOutput, "failed to marshal request payload", false, err)
	}

	endpoint := p.cfg.BaseURL + "/chat/completions"
	var lastErr error
	var respObj *types.AIResponse

	retries := p.cfg.MaxRetries
	if retries < 0 {
		retries = 0
	}

	requestID := observability.GenerateRequestID()
	startOverall := time.Now()

	for attempt := 0; attempt <= retries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 500ms, 1000ms, 2000ms...
			backoff := time.Duration(1<<attempt) * 250 * time.Millisecond
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return nil, types.NewAIError(types.ErrCodeTimeout, "context canceled during retry backoff", false, ctx.Err())
			}
		}

		httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payloadBytes))
		if err != nil {
			return nil, types.NewAIError(types.ErrCodeProviderUnavailable, "failed to build HTTP request", false, err)
		}

		httpReq.Header.Set("Content-Type", "application/json")
		if p.cfg.APIKey != "" {
			httpReq.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)
		}
		httpReq.Header.Set("HTTP-Referer", p.cfg.SiteURL)
		httpReq.Header.Set("X-Title", p.cfg.AppName)

		startReq := time.Now()
		httpResp, err := p.httpClient.Do(httpReq)
		latency := time.Since(startReq).Milliseconds()

		if err != nil {
			lastErr = types.NewAIError(types.ErrCodeProviderUnavailable, fmt.Sprintf("HTTP transport error: %v", err), true, err)
			continue
		}

		bodyBytes, readErr := io.ReadAll(httpResp.Body)
		httpResp.Body.Close()
		if readErr != nil {
			lastErr = types.NewAIError(types.ErrCodeMalformedOutput, fmt.Sprintf("failed to read response body: %v", readErr), true, readErr)
			continue
		}

		// Handle HTTP status codes
		if httpResp.StatusCode == http.StatusTooManyRequests {
			lastErr = types.NewAIError(types.ErrCodeRateLimited, fmt.Sprintf("OpenRouter rate limit (429): %s", string(bodyBytes)), true, nil)
			continue
		}
		if httpResp.StatusCode >= 500 {
			lastErr = types.NewAIError(types.ErrCodeProviderUnavailable, fmt.Sprintf("OpenRouter server error (%d): %s", httpResp.StatusCode, string(bodyBytes)), true, nil)
			continue
		}
		if httpResp.StatusCode != http.StatusOK {
			lastErr = types.NewAIError(types.ErrCodeProviderUnavailable, fmt.Sprintf("OpenRouter rejected request (%d): %s", httpResp.StatusCode, string(bodyBytes)), false, nil)
			break // Non-retryable 4xx error (e.g. 401 unauthorized, 400 bad request)
		}

		var chatResp openAIChatResp
		if err := json.Unmarshal(bodyBytes, &chatResp); err != nil {
			lastErr = types.NewAIError(types.ErrCodeMalformedOutput, fmt.Sprintf("invalid JSON from OpenRouter: %v", err), false, err)
			break
		}

		if chatResp.Error != nil {
			lastErr = types.NewAIError(types.ErrCodeProviderUnavailable, chatResp.Error.Message, false, nil)
			break
		}

		if len(chatResp.Choices) == 0 {
			lastErr = types.NewAIError(types.ErrCodeEmptyResponse, "OpenRouter returned empty choices array", true, nil)
			continue
		}

		choice := chatResp.Choices[0]
		actualModel := chatResp.Model
		if actualModel == "" {
			actualModel = model
		}

		respObj = &types.AIResponse{
			ID:           chatResp.ID,
			Provider:     p.Name(),
			Model:        actualModel,
			Content:      choice.Message.Content,
			ToolCalls:    choice.Message.ToolCalls,
			Usage: types.AIUsage{
				PromptTokens:     chatResp.Usage.PromptTokens,
				CompletionTokens: chatResp.Usage.CompletionTokens,
				TotalTokens:      chatResp.Usage.TotalTokens,
				EstimatedCostUSD: 0.0, // Free tier models calculate as $0.00
			},
			LatencyMS:    latency,
			FinishReason: choice.FinishReason,
			RawJSON:      bodyBytes,
		}

		// Record telemetry
		p.tracer.Record(ctx, observability.AITraceRecord{
			RequestID:        requestID,
			CorrelationID:    req.CorrelationID,
			CausationID:      req.CausationID,
			Provider:         p.Name(),
			Model:            actualModel,
			TaskType:         req.TaskType,
			PromptVersion:    req.PromptVersion,
			LatencyMS:        time.Since(startOverall).Milliseconds(),
			InputTokens:      chatResp.Usage.PromptTokens,
			OutputTokens:     chatResp.Usage.CompletionTokens,
			TotalTokens:      chatResp.Usage.TotalTokens,
			EstimatedCostUSD: 0.0,
			Status:           "SUCCESS",
			RetryCount:       attempt,
			Timestamp:        time.Now(),
		})

		return respObj, nil
	}

	// If all retries failed, record failure
	p.tracer.Record(ctx, observability.AITraceRecord{
		RequestID:     requestID,
		CorrelationID: req.CorrelationID,
		Provider:      p.Name(),
		Model:         model,
		TaskType:      req.TaskType,
		Status:        "FAILED",
		RetryCount:    retries,
		ErrorType:     lastErr.Error(),
		Timestamp:     time.Now(),
	})

	return nil, lastErr
}
