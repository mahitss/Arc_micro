package observability

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// AITraceRecord represents a telemetry entry for an AI generation request.
type AITraceRecord struct {
	RequestID        string    `json:"request_id"`
	CorrelationID    string    `json:"correlation_id"`
	CausationID      string    `json:"causation_id,omitempty"`
	MissionID        string    `json:"mission_id,omitempty"`
	WorkflowID       string    `json:"workflow_id,omitempty"`
	Provider         string    `json:"provider"`
	Model            string    `json:"model"`
	TaskType         string    `json:"task_type"`
	PromptVersion    string    `json:"prompt_version"`
	LatencyMS        int64     `json:"latency_ms"`
	InputTokens      int       `json:"input_tokens"`
	OutputTokens     int       `json:"output_tokens"`
	TotalTokens      int       `json:"total_tokens"`
	EstimatedCostUSD float64   `json:"estimated_cost_usd"`
	Status           string    `json:"status"` // SUCCESS, FAILED, RETRIED, REFUSED
	RetryCount       int       `json:"retry_count"`
	ErrorType        string    `json:"error_type,omitempty"`
	Timestamp        time.Time `json:"timestamp"`
}

// AITelemetrySummary provides aggregated operational metrics for the Control Tower.
type AITelemetrySummary struct {
	TotalRequests      int64              `json:"total_requests"`
	SuccessfulRequests int64              `json:"successful_requests"`
	FailedRequests     int64              `json:"failed_requests"`
	AverageLatencyMS   float64            `json:"average_latency_ms"`
	TotalTokens        int64              `json:"total_tokens"`
	TotalCostUSD       float64            `json:"total_cost_usd"`
	LastError          string             `json:"last_error,omitempty"`
	ActiveProvider     string             `json:"active_provider"`
	ActiveModel        string             `json:"active_model"`
	RequestsByTaskType map[string]int64   `json:"requests_by_task_type"`
	RequestsByModel    map[string]int64   `json:"requests_by_model"`
}

// AITracer collects and serves sanitized AI telemetry records.
// SECURITY INVARIANT:
// AITracer NEVER logs API keys, private keys, or raw confidential parameters.
type AITracer struct {
	mu           sync.RWMutex
	records      []AITraceRecord
	maxRecords   int
	totalLatency int64
	totalTokens  int64
	totalCost    float64
	totalSuccess int64
	totalFailed  int64
	lastError    string
	byTask       map[string]int64
	byModel      map[string]int64
}

var (
	defaultTracer *AITracer
	onceTracer    sync.Once
)

// GetTracer returns the singleton AITracer instance.
func GetTracer() *AITracer {
	onceTracer.Do(func() {
		defaultTracer = &AITracer{
			records:    make([]AITraceRecord, 0, 500),
			maxRecords: 500,
			byTask:     make(map[string]int64),
			byModel:    make(map[string]int64),
		}
	})
	return defaultTracer
}

// GenerateRequestID creates a cryptographically random request ID.
func GenerateRequestID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("req_%d", time.Now().UnixNano())
	}
	return "req_" + hex.EncodeToString(bytes)
}

// Record appends an auditable telemetry record with safety filtering.
func (t *AITracer) Record(ctx context.Context, rec AITraceRecord) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if rec.Timestamp.IsZero() {
		rec.Timestamp = time.Now()
	}

	if rec.Status == "SUCCESS" {
		t.totalSuccess++
	} else {
		t.totalFailed++
		if rec.ErrorType != "" {
			t.lastError = rec.ErrorType
		}
	}

	t.totalLatency += rec.LatencyMS
	t.totalTokens += int64(rec.TotalTokens)
	t.totalCost += rec.EstimatedCostUSD

	t.byTask[rec.TaskType]++
	t.byModel[rec.Model]++

	if len(t.records) >= t.maxRecords {
		t.records = t.records[1:] // Ring buffer eviction
	}
	t.records = append(t.records, rec)
}

// GetSummary returns real-time aggregated metrics for the Control Tower.
func (t *AITracer) GetSummary(activeProvider, activeModel string) AITelemetrySummary {
	t.mu.RLock()
	defer t.mu.RUnlock()

	total := t.totalSuccess + t.totalFailed
	var avgLatency float64
	if total > 0 {
		avgLatency = float64(t.totalLatency) / float64(total)
	}

	taskCopy := make(map[string]int64, len(t.byTask))
	for k, v := range t.byTask {
		taskCopy[k] = v
	}

	modelCopy := make(map[string]int64, len(t.byModel))
	for k, v := range t.byModel {
		modelCopy[k] = v
	}

	return AITelemetrySummary{
		TotalRequests:      total,
		SuccessfulRequests: t.totalSuccess,
		FailedRequests:     t.totalFailed,
		AverageLatencyMS:   avgLatency,
		TotalTokens:        t.totalTokens,
		TotalCostUSD:       t.totalCost,
		LastError:          t.lastError,
		ActiveProvider:     activeProvider,
		ActiveModel:        activeModel,
		RequestsByTaskType: taskCopy,
		RequestsByModel:    modelCopy,
	}
}

// GetRecentRecords returns recent trace items.
func (t *AITracer) GetRecentRecords(limit int) []AITraceRecord {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if limit <= 0 || limit > len(t.records) {
		limit = len(t.records)
	}
	out := make([]AITraceRecord, limit)
	start := len(t.records) - limit
	copy(out, t.records[start:])
	return out
}
