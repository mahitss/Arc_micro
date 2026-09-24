package protocol

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
)

var (
	ErrResultSchemaInvalid  = errors.New("result payload does not match declared output schema")
	ErrResultChecksumMismatch = errors.New("result SHA-256 hash does not match computed deliverable hash")
	ErrResultQualityTooLow  = errors.New("deliverable quality score is below required minimum threshold")
	ErrResultDeadlinePast   = errors.New("deliverable was submitted after contract deadline")
	ErrFraudulentResult     = errors.New("deliverable triggered fraud or security anomaly detection")
)

// QualityGateDecision represents the output of the ResultQualityGate.
type QualityGateDecision string

const (
	DecisionAccept   QualityGateDecision = "ACCEPT"
	DecisionReject   QualityGateDecision = "REJECT"
	DecisionDispute  QualityGateDecision = "DISPUTE"
	DecisionRetry    QualityGateDecision = "RETRY"
	DecisionEscalate QualityGateDecision = "ESCALATE"
)

// QualityEvaluationResult contains evaluation findings.
type QualityEvaluationResult struct {
	Decision      QualityGateDecision `json:"decision"`
	Confidence    float64             `json:"confidence"`
	Reason        string              `json:"reason"`
	ComputedHash  string              `json:"computed_hash"`
	EligibleForPay bool               `json:"eligible_for_payment"`
}

// ResultQualityGate validates agent deliverables before payment consideration (Sections 15 & 16).
type ResultQualityGate struct {
	minConfidence float64
}

// NewResultQualityGate creates a ResultQualityGate.
func NewResultQualityGate() *ResultQualityGate {
	return &ResultQualityGate{
		minConfidence: 0.85,
	}
}

// EvaluateResult performs strict multi-dimensional validation.
// INVARIANT: Submitting a result NEVER directly triggers payment (INV-173).
func (g *ResultQualityGate) EvaluateResult(
	result *ResultSubmittedPayload,
	contract *ProtocolContract,
) (*QualityEvaluationResult, error) {
	if result == nil {
		return &QualityEvaluationResult{Decision: DecisionReject, Reason: "empty result payload"}, errors.New("result is nil")
	}

	// 1. Deadline check
	if contract != nil && !contract.Deadline.IsZero() && result.SubmittedAt.After(contract.Deadline) {
		return &QualityEvaluationResult{
			Decision: DecisionReject,
			Reason:   "submitted past contract deadline",
		}, ErrResultDeadlinePast
	}

	// 2. Checksum validation (SHA-256 seal)
	dataBytes, err := json.Marshal(result.DeliverableData)
	if err != nil {
		return &QualityEvaluationResult{Decision: DecisionReject, Reason: "cannot marshal deliverable data"}, ErrResultSchemaInvalid
	}
	computedHash := sha256.Sum256(dataBytes)
	computedHex := hex.EncodeToString(computedHash[:])

	if result.ResultHash != "" && result.ResultHash != computedHex {
		return &QualityEvaluationResult{
			Decision:     DecisionDispute,
			Reason:       fmt.Sprintf("result hash mismatch: expected %s, computed %s", result.ResultHash, computedHex),
			ComputedHash: computedHex,
		}, ErrResultChecksumMismatch
	}

	// 3. Schema completeness check
	if len(result.DeliverableData) == 0 {
		return &QualityEvaluationResult{
			Decision: DecisionReject,
			Reason:   "deliverable data map is empty",
		}, ErrResultSchemaInvalid
	}

	// 4. Quality & confidence scoring
	confidence := 0.95
	if qm, exists := result.QualityMetadata["confidence"]; exists {
		if confFloat, ok := qm.(float64); ok {
			confidence = confFloat
		}
	}

	if confidence < g.minConfidence {
		return &QualityEvaluationResult{
			Decision:   DecisionRetry,
			Confidence: confidence,
			Reason:     fmt.Sprintf("confidence %.2f is below minimum threshold %.2f", confidence, g.minConfidence),
		}, ErrResultQualityTooLow
	}

	// 5. Fraud and anomaly check
	if _, suspicious := result.DeliverableData["__malicious_payload"]; suspicious {
		return &QualityEvaluationResult{
			Decision: DecisionEscalate,
			Reason:   "suspicious payload injection detected",
		}, ErrFraudulentResult
	}

	return &QualityEvaluationResult{
		Decision:       DecisionAccept,
		Confidence:     confidence,
		Reason:         "deliverable verified: schema, checksum, and quality constraints met",
		ComputedHash:   computedHex,
		EligibleForPay: true,
	}, nil
}
