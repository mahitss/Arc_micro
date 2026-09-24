package fabric

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// QualityValidationInput contains the deliverable evidence to be checked before payment release
type QualityValidationInput struct {
	DeliverableContent []byte
	ExpectedHash       string
	ConfidenceScore    float64
	MinimumConfidence  float64
	RequiredOutputs    []string
	ActualOutputs      map[string]bool
	SecurityFlagged    bool
}

// ResultQualityGate validates task deliverables before financial settlement release
type ResultQualityGate struct{}

// NewResultQualityGate creates a new quality gate instance
func NewResultQualityGate() *ResultQualityGate {
	return &ResultQualityGate{}
}

// ValidateDeliverable performs cryptographic, structural, and confidence validation
func (q *ResultQualityGate) ValidateDeliverable(ctx context.Context, in QualityValidationInput) error {
	// 1. Completeness Check
	if len(in.DeliverableContent) == 0 {
		return fmt.Errorf("quality check failed: deliverable content is empty")
	}

	// 2. Cryptographic Hash Verification if expected hash is provided
	if in.ExpectedHash != "" {
		h := sha256.Sum256(in.DeliverableContent)
		actualHash := hex.EncodeToString(h[:])
		if actualHash != in.ExpectedHash {
			return fmt.Errorf("quality check failed: deliverable hash mismatch (actual: %s, expected: %s)", actualHash, in.ExpectedHash)
		}
	}

	// 3. Confidence Threshold Check
	if in.ConfidenceScore < in.MinimumConfidence {
		return fmt.Errorf("quality check failed: confidence score %.2f is below threshold %.2f", in.ConfidenceScore, in.MinimumConfidence)
	}

	// 4. Required Output Fields
	for _, reqOutput := range in.RequiredOutputs {
		if !in.ActualOutputs[reqOutput] {
			return fmt.Errorf("quality check failed: missing required deliverable output '%s'", reqOutput)
		}
	}

	// 5. Fraud / Security Screening Check
	if in.SecurityFlagged {
		return fmt.Errorf("quality check failed: security analysis flagged anomaly in deliverable")
	}

	return nil
}
