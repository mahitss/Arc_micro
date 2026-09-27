package provider

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/openrouter"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

// ProviderFactory is a constructor function returning an AIProvider.
type ProviderFactory func() (types.AIProvider, error)

var (
	registryMu sync.RWMutex
	factories  = make(map[string]ProviderFactory)
)

func init() {
	// Register default OpenRouter provider
	Register("openrouter", func() (types.AIProvider, error) {
		cfg := openrouter.LoadConfigFromEnv()
		return openrouter.NewOpenRouterProvider(cfg), nil
	})

	// Register deterministic Mock provider for tests & offline dev
	Register("mock", func() (types.AIProvider, error) {
		return NewMockProvider(), nil
	})
}

// Register adds a named provider factory.
func Register(name string, factory ProviderFactory) {
	registryMu.Lock()
	defer registryMu.Unlock()
	factories[strings.ToLower(strings.TrimSpace(name))] = factory
}

// Create builds an AIProvider instance by registered name.
func Create(name string) (types.AIProvider, error) {
	registryMu.RLock()
	defer registryMu.RUnlock()

	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		normalized = "openrouter"
	}

	factory, exists := factories[normalized]
	if !exists {
		return nil, types.NewAIError(
			types.ErrCodeProviderUnavailable,
			fmt.Sprintf("unknown AI provider '%s'. Extensible architecture supports: openrouter, mock (placeholders for gemini, openai, anthropic)", name),
			false,
			nil,
		)
	}
	return factory()
}

// MockProvider is a deterministic in-memory AI provider for unit tests and simulation.
type MockProvider struct {
	mu           sync.Mutex
	NameStr      string
	CannedOutput string
	CannedError  error
	CallCount    int
	LastRequest  types.AIRequest
}

// NewMockProvider creates a new deterministic mock provider.
func NewMockProvider() *MockProvider {
	return &MockProvider{
		NameStr: "mock",
		CannedOutput: `{
			"objective": "Research AI market intelligence",
			"stages": [
				{
					"stage_index": 0,
					"name": "Data Retrieval",
					"required_service": "web-research",
					"max_budget_usdc": 180000,
					"acceptance_criteria": ["20 verified reports"]
				}
			],
			"service_id": "web-research",
			"recipient": "0x1111111111111111111111111111111111111111",
			"amount": "180000",
			"requires_payment": true,
			"confidence": 0.95,
			"reasoning": "Deterministic research task execution",
			"risk_assessment": "Deterministic low-risk research task execution",
			"estimated_cost_max": 180000,
			"estimated_time_sec": 60,
			"metadata": { "query": "Arc compute metrics" }
		}`,
	}
}

func (m *MockProvider) Name() string {
	if m.NameStr != "" {
		return m.NameStr
	}
	return "mock"
}

func (m *MockProvider) Generate(ctx context.Context, req types.AIRequest) (*types.AIResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.CallCount++
	m.LastRequest = req

	if m.CannedError != nil {
		return nil, m.CannedError
	}

	return &types.AIResponse{
		ID:       fmt.Sprintf("mock_resp_%d", m.CallCount),
		Provider: m.Name(),
		Model:    "mock-deterministic-v1",
		Content:  m.CannedOutput,
		Usage: types.AIUsage{
			PromptTokens:     100,
			CompletionTokens: 50,
			TotalTokens:      150,
			EstimatedCostUSD: 0.0,
		},
		LatencyMS:    5,
		FinishReason: "stop",
		RawJSON:      []byte(m.CannedOutput),
	}, nil
}

func (m *MockProvider) GenerateStructured(ctx context.Context, req types.AIRequest, target interface{}) (*types.AIResponse, error) {
	resp, err := m.Generate(ctx, req)
	if err != nil {
		return nil, err
	}
	if target != nil {
		if err := types.ParseAndValidateStructured([]byte(resp.Content), target); err != nil {
			return nil, err
		}
	}
	return resp, nil
}

func (m *MockProvider) GenerateWithTools(ctx context.Context, req types.AIRequest, tools []types.AITool) (*types.AIResponse, error) {
	for _, tool := range tools {
		if err := types.ValidateToolSafety(tool); err != nil {
			return nil, err
		}
	}
	return m.Generate(ctx, req)
}

func (m *MockProvider) Stream(ctx context.Context, req types.AIRequest) (<-chan types.AIStreamChunk, error) {
	ch := make(chan types.AIStreamChunk, 1)
	resp, err := m.Generate(ctx, req)
	if err != nil {
		ch <- types.AIStreamChunk{Error: err}
	} else {
		ch <- types.AIStreamChunk{
			ID:           resp.ID,
			Model:        resp.Model,
			Delta:        resp.Content,
			FinishReason: resp.FinishReason,
		}
	}
	close(ch)
	return ch, nil
}

func (m *MockProvider) Health(ctx context.Context) (*types.AIProviderHealth, error) {
	return &types.AIProviderHealth{
		Provider:        m.Name(),
		Status:          types.StatusConnected,
		LatencyMS:       1,
		LastChecked:     time.Now(),
		ConfiguredModel: "mock-deterministic-v1",
		FallbackEnabled: false,
	}, nil
}
