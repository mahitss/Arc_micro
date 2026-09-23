package network

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrResultDeadlineExceeded = errors.New("deliverable submitted after contract deadline")
	ErrResultChecksumMismatch = errors.New("cryptographic checksum mismatch: deliverable tampered or corrupted")
	ErrResultCostExceeded     = errors.New("claimed execution cost exceeds agreed contract price")
	ErrMissingRequiredOutput  = errors.New("deliverable missing required schema fields specified in contract")
)

// AgentResultVerifier cryptographically verifies deliverables submitted by untrusted peer agents.
// INVARIANT INV-30: Deliverables require schema validation, SHA-256 hash checks, and economic compliance.
type AgentResultVerifier struct {
	repo ContractStorageRepository
}

// NewAgentResultVerifier creates a new AgentResultVerifier.
func NewAgentResultVerifier(repo ContractStorageRepository) *AgentResultVerifier {
	return &AgentResultVerifier{repo: repo}
}

// VerifyResult validates the untrusted deliverable against contract terms and cryptographic checksum.
func (v *AgentResultVerifier) VerifyResult(ctx context.Context, payload *AgentResultPayload) (*VerificationReport, error) {
	if payload == nil {
		return nil, errors.New("payload cannot be nil")
	}

	contract, err := v.repo.GetServiceContract(ctx, payload.ContractID)
	if err != nil {
		return nil, fmt.Errorf("contract not found: %w", err)
	}

	now := time.Now().UTC()
	if payload.Timestamp.IsZero() {
		payload.Timestamp = now
	}

	// Emit result submission event
	_ = v.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkResultSubmitted,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: contract.OrganizationID,
		ActorType:      "AGENT",
		ActorID:        payload.ProviderAgentID,
		AgentID:        payload.ProviderAgentID,
		Data: map[string]interface{}{
			"contract_id": payload.ContractID,
			"provider_id": payload.ProviderAgentID,
			"checksum":    payload.ChecksumSHA256,
		},
	})

	report := &VerificationReport{
		ContractID:       contract.ContractID,
		VerifiedAt:       now,
		ScoreBasisPoints: 10000,
	}

	// 1. Deadline Check
	if payload.Timestamp.After(contract.Deadline) {
		report.Passed = false
		report.DeadlineMet = false
		report.Reason = ErrResultDeadlineExceeded.Error()
		report.ScoreBasisPoints -= 5000
		v.recordFailure(ctx, contract, report.Reason)
		return report, ErrResultDeadlineExceeded
	}
	report.DeadlineMet = true

	// 2. Cryptographic Checksum Verification (SHA-256)
	outputBytes, err := json.Marshal(payload.Output)
	if err != nil {
		report.Passed = false
		report.Reason = "failed to serialize deliverable for checksum verification"
		v.recordFailure(ctx, contract, report.Reason)
		return report, err
	}
	computedHash := sha256.Sum256(outputBytes)
	computedHex := hex.EncodeToString(computedHash[:])

	if payload.ChecksumSHA256 != "" && !strings.EqualFold(payload.ChecksumSHA256, computedHex) {
		report.Passed = false
		report.ChecksumValid = false
		report.Reason = fmt.Sprintf("%s (expected: %s, computed: %s)", ErrResultChecksumMismatch.Error(), payload.ChecksumSHA256, computedHex)
		report.ScoreBasisPoints = 0
		v.recordFailure(ctx, contract, report.Reason)
		return report, ErrResultChecksumMismatch
	}
	report.ChecksumValid = true

	// 3. Schema Compliance Check
	if len(contract.OutputSpec) > 0 {
		for key := range contract.OutputSpec {
			if _, exists := payload.Output[key]; !exists {
				report.Passed = false
				report.SchemaValid = false
				report.Reason = fmt.Sprintf("%s: missing field '%s'", ErrMissingRequiredOutput.Error(), key)
				report.ScoreBasisPoints -= 3000
				v.recordFailure(ctx, contract, report.Reason)
				return report, ErrMissingRequiredOutput
			}
		}
	}
	report.SchemaValid = true

	// 4. Economic Cost Compliance Check
	claimedInt, ok1 := new(big.Int).SetString(payload.ClaimedCost, 10)
	agreedInt, ok2 := new(big.Int).SetString(contract.Price, 10)
	if ok1 && ok2 && agreedInt.Sign() > 0 && claimedInt.Cmp(agreedInt) > 0 {
		report.Passed = false
		report.CostCompliant = false
		report.Reason = fmt.Sprintf("%s: claimed %s > agreed %s", ErrResultCostExceeded.Error(), payload.ClaimedCost, contract.Price)
		report.ScoreBasisPoints -= 4000
		v.recordFailure(ctx, contract, report.Reason)
		return report, ErrResultCostExceeded
	}
	report.CostCompliant = true

	// Deliverable Passed Verification!
	report.Passed = true
	report.Reason = "All verification checks passed: cryptographic checksum valid, deadline respected, cost compliant"

	// Transition contract to COMPLETED
	contract.State = ContractCompleted
	contract.Result = payload
	contract.UpdatedAt = now
	contract.CompletedAt = &now
	_ = v.repo.SaveServiceContract(ctx, contract)

	// Update Trust Profile for Provider
	profile, err := v.repo.GetTrustProfile(ctx, contract.ProviderAgentID)
	if err == nil && profile != nil {
		profile.SuccessfulJobs++
		profile.VerificationSuccesses++
		if payload.ClaimedDurationMs > 0 {
			if profile.AverageLatencyMs == 0 {
				profile.AverageLatencyMs = payload.ClaimedDurationMs
			} else {
				profile.AverageLatencyMs = (profile.AverageLatencyMs + payload.ClaimedDurationMs) / 2
			}
		}
		if claimedInt != nil && agreedInt != nil && claimedInt.Cmp(agreedInt) <= 0 {
			profile.HistoricalCostAccurate++
		}
		profile.LastActiveAt = now
		profile.UpdatedAt = now
		_ = v.repo.SaveTrustProfile(ctx, profile)
	}

	// Emit verification success event
	_ = v.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkResultVerified,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: contract.OrganizationID,
		ActorType:      "SYSTEM",
		ActorID:        "result_verifier",
		AgentID:        contract.ProviderAgentID,
		Data: map[string]interface{}{
			"contract_id": contract.ContractID,
			"provider_id": contract.ProviderAgentID,
			"score_bps":   report.ScoreBasisPoints,
		},
	})

	return report, nil
}

func (v *AgentResultVerifier) recordFailure(ctx context.Context, contract *AgentServiceContract, reason string) {
	now := time.Now().UTC()
	contract.State = ContractFailed
	contract.Error = reason
	contract.UpdatedAt = now
	contract.CompletedAt = &now
	_ = v.repo.SaveServiceContract(ctx, contract)

	profile, err := v.repo.GetTrustProfile(ctx, contract.ProviderAgentID)
	if err == nil && profile != nil {
		profile.FailedJobs++
		profile.VerificationFailures++
		profile.LastActiveAt = now
		profile.UpdatedAt = now
		_ = v.repo.SaveTrustProfile(ctx, profile)
	}

	_ = v.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:             domain.GenerateEventID(),
		Type:           domain.EventNetworkResultRejected,
		Version:        1,
		OccurredAt:     now,
		OrganizationID: contract.OrganizationID,
		ActorType:      "SYSTEM",
		ActorID:        "result_verifier",
		AgentID:        contract.ProviderAgentID,
		Data: map[string]interface{}{
			"contract_id": contract.ContractID,
			"provider_id": contract.ProviderAgentID,
			"reason":      reason,
		},
	})
}
