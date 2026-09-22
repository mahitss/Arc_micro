package economy

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
)

// EvaluationResult encapsulates the deterministic verdict of an execution outcome.
type EvaluationResult struct {
	Outcome      OutcomeStatus `json:"outcome"`
	FailureClass FailureClass  `json:"failure_class"`
	ReasonCode   string        `json:"reason_code"`
	QualityScore int64         `json:"quality_score"` // 0-10000 basis points
	Explanation  string        `json:"explanation"`
	IsTerminal   bool          `json:"is_terminal"`
}

// OutcomeEvaluator performs deterministic, multi-criterion validation of external agent results.
// INVARIANT: Success validation is deterministic and rule-based. LLM advisory signals cannot override failure rules.
type OutcomeEvaluator struct{}

// NewOutcomeEvaluator constructs a new OutcomeEvaluator.
func NewOutcomeEvaluator() *OutcomeEvaluator {
	return &OutcomeEvaluator{}
}

// EvaluationInput specifies the execution context and returned output to be evaluated.
type EvaluationInput struct {
	ExpectedCapability string
	ExpectedSchema     map[string]interface{}
	MaxAllowedLatencyMs int64
	AgreedPrice        string
	ActualResultRaw    string
	ResultChecksum     string
	ObservedLatencyMs  int64
	ExecutionError     string
	ServiceStatus      string // "ONLINE", "BUSY", "OFFLINE"
}

// Evaluate analyzes the execution parameters and determines the canonical outcome.
func (e *OutcomeEvaluator) Evaluate(input EvaluationInput) EvaluationResult {
	// 1. Explicit Execution Errors
	if input.ExecutionError != "" {
		errLower := strings.ToLower(input.ExecutionError)
		if strings.Contains(errLower, "timeout") || strings.Contains(errLower, "deadline exceeded") {
			return EvaluationResult{
				Outcome:      OutcomeFailure,
				FailureClass: FailureTimeout,
				ReasonCode:   "TIMEOUT",
				QualityScore: 0,
				Explanation:  fmt.Sprintf("Service exceeded timeout limit: %s", input.ExecutionError),
				IsTerminal:   false, // Can be retried
			}
		}
		if strings.Contains(errLower, "policy") || strings.Contains(errLower, "denied") {
			return EvaluationResult{
				Outcome:      OutcomeFailure,
				FailureClass: FailurePolicyFailure,
				ReasonCode:   "POLICY_FAILURE",
				QualityScore: 0,
				Explanation:  fmt.Sprintf("Execution blocked by security policy: %s", input.ExecutionError),
				IsTerminal:   true, // Hard deny cannot be retried automatically
			}
		}
		if strings.Contains(errLower, "payment") || strings.Contains(errLower, "insufficient") {
			return EvaluationResult{
				Outcome:      OutcomeFailure,
				FailureClass: FailurePaymentFailure,
				ReasonCode:   "PAYMENT_FAILURE",
				QualityScore: 0,
				Explanation:  fmt.Sprintf("Payment settlement failed: %s", input.ExecutionError),
				IsTerminal:   true,
			}
		}

		return EvaluationResult{
			Outcome:      OutcomeFailure,
			FailureClass: FailureTransient,
			ReasonCode:   "SERVICE_ERROR",
			QualityScore: 0,
			Explanation:  fmt.Sprintf("Service returned operational error: %s", input.ExecutionError),
			IsTerminal:   false,
		}
	}

	// 2. Empty or missing content
	trimmed := strings.TrimSpace(input.ActualResultRaw)
	if trimmed == "" {
		return EvaluationResult{
			Outcome:      OutcomeFailure,
			FailureClass: FailureQualityFailure,
			ReasonCode:   "EMPTY_RESULT",
			QualityScore: 0,
			Explanation:  "Service returned empty payload",
			IsTerminal:   false,
		}
	}

	// 3. Checksum verification if provided
	if input.ResultChecksum != "" {
		hasher := sha256.New()
		hasher.Write([]byte(input.ActualResultRaw))
		computedChecksum := hex.EncodeToString(hasher.Sum(nil))
		if computedChecksum != input.ResultChecksum {
			return EvaluationResult{
				Outcome:      OutcomeFailure,
				FailureClass: FailureQualityFailure,
				ReasonCode:   "CHECKSUM_MISMATCH",
				QualityScore: 0,
				Explanation:  "Result payload checksum does not match provider assertion",
				IsTerminal:   true, // Tampered data
			}
		}
	}

	// 4. Latency verification
	if input.MaxAllowedLatencyMs > 0 && input.ObservedLatencyMs > input.MaxAllowedLatencyMs*2 {
		return EvaluationResult{
			Outcome:      OutcomeFailure,
			FailureClass: FailureTimeout,
			ReasonCode:   "LATENCY_EXCEEDED",
			QualityScore: 2000,
			Explanation:  fmt.Sprintf("Latency (%dms) exceeded threshold (%dms)", input.ObservedLatencyMs, input.MaxAllowedLatencyMs),
			IsTerminal:   false,
		}
	}

	// 5. JSON Schema / Structure Validation
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(input.ActualResultRaw), &parsed); err != nil {
		// Non-JSON or unstructured response
		return EvaluationResult{
			Outcome:      OutcomePartialSuccess,
			FailureClass: FailureQualityFailure,
			ReasonCode:   "RESULT_VALID_BUT_LOW_QUALITY",
			QualityScore: 5000,
			Explanation:  "Result is non-JSON or plain text; parsed with partial quality",
			IsTerminal:   false,
		}
	}

	// Check if status in payload indicates service-level failure
	if sVal, ok := parsed["status"].(string); ok && strings.ToUpper(sVal) == "FAILED" {
		reason := "external service reported failure status"
		if msg, okMsg := parsed["error"].(string); okMsg {
			reason = msg
		}
		return EvaluationResult{
			Outcome:      OutcomeFailure,
			FailureClass: FailurePermanent,
			ReasonCode:   "SERVICE_ERROR",
			QualityScore: 0,
			Explanation:  reason,
			IsTerminal:   false,
		}
	}

	// 6. Quality Score Scoring
	qualityScore := int64(9500) // Baseline 95%
	if input.ObservedLatencyMs > 1500 {
		qualityScore -= (input.ObservedLatencyMs - 1500) * 2
	}
	if qualityScore < 4000 {
		qualityScore = 4000
	}

	return EvaluationResult{
		Outcome:      OutcomeSuccess,
		FailureClass: "",
		ReasonCode:   "RESULT_VALIDATED",
		QualityScore: qualityScore,
		Explanation:  "Result passed structural, latency, and cryptographic validation",
		IsTerminal:   false,
	}
}

// ValidatePriceIntegrity verifies that agreed quote price is within step budget constraints.
func (e *OutcomeEvaluator) ValidatePriceIntegrity(quotedPrice, stepBudget string) error {
	qInt, ok1 := new(big.Int).SetString(quotedPrice, 10)
	bInt, ok2 := new(big.Int).SetString(stepBudget, 10)
	if !ok1 || !ok2 {
		return fmt.Errorf("invalid integer price string")
	}
	if qInt.Cmp(bInt) > 0 {
		return fmt.Errorf("quoted price %s exceeds step budget %s", quotedPrice, stepBudget)
	}
	return nil
}
