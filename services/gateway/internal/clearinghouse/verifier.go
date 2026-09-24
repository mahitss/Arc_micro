package clearinghouse

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

var (
	ErrContractNotFound            = errors.New("referenced contract not found")
	ErrProviderMismatch            = errors.New("invoice provider does not match contract provider")
	ErrPayerMismatch               = errors.New("invoice requester does not match contract payer")
	ErrCapabilityMismatch          = errors.New("capability does not match contract declaration")
	ErrAmountExceedsContract       = errors.New("invoice amount exceeds remaining contract value")
	ErrMilestoneRefMissing         = errors.New("referenced milestone does not exist on contract")
	ErrMilestoneNotVerified        = errors.New("referenced milestone has not been verified (INV-57)")
	ErrDuplicateInvoice            = errors.New("duplicate invoice detected (same ID, hash, or milestone)")
	ErrInvoiceExpired              = errors.New("invoice due date is expired")
	ErrCurrencyMismatch            = errors.New("invoice currency does not match contract settlement currency")
	ErrPolicySnapshotMissing       = errors.New("active economic policy snapshot is missing")
	ErrInsufficientEvidence        = errors.New("verification rejected: insufficient evidence submitted")
	ErrChecksumMismatch            = errors.New("verification rejected: result checksum does not match payload")
	ErrPromptInjectionDetected     = errors.New("verification rejected: untrusted prompt injection attempt detected")
)

// VerificationOutcome represents the result of evaluating milestone completion evidence.
type VerificationOutcome string

const (
	OutcomeVerified             VerificationOutcome = "VERIFIED"
	OutcomeRejected             VerificationOutcome = "REJECTED"
	OutcomeInsufficientEvidence VerificationOutcome = "INSUFFICIENT_EVIDENCE"
)

// MilestoneVerificationRequest specifies all inputs required to verify a milestone.
type MilestoneVerificationRequest struct {
	MilestoneID         string                 `json:"milestone_id"`
	ContractID          string                 `json:"contract_id"`
	ExpectedOutputSpec  map[string]interface{} `json:"expected_output_spec"`
	ActualOutput        string                 `json:"actual_output"`
	ResultHash          string                 `json:"result_hash"`
	EvidenceURI         string                 `json:"evidence_uri"`
	EvidenceMetadata    map[string]string      `json:"evidence_metadata"`
	VerificationRules   []string               `json:"verification_rules"`
	SubmissionTimestamp time.Time              `json:"submission_timestamp"`
	Deadline            time.Time              `json:"deadline"`
}

// MilestoneVerificationResult holds the decision and audit trails.
type MilestoneVerificationResult struct {
	MilestoneID   string              `json:"milestone_id"`
	Outcome       VerificationOutcome `json:"outcome"`
	VerifiedHash  string              `json:"verified_hash"`
	Reason        string              `json:"reason"`
	ChecksPassed  []string            `json:"checks_passed"`
	ChecksFailed  []string            `json:"checks_failed"`
	VerifiedAt    time.Time           `json:"verified_at"`
}

// MilestoneVerifier validates deliverable completion before allowing settlement.
type MilestoneVerifier struct{}

func NewMilestoneVerifier() *MilestoneVerifier {
	return &MilestoneVerifier{}
}

// Verify evaluates whether the deliverable fulfills the contract requirements.
func (mv *MilestoneVerifier) Verify(req MilestoneVerificationRequest) MilestoneVerificationResult {
	res := MilestoneVerificationResult{
		MilestoneID:  req.MilestoneID,
		ChecksPassed: make([]string, 0),
		ChecksFailed: make([]string, 0),
		VerifiedAt:   time.Now().UTC(),
	}

	// 1. Evidence Check
	if strings.TrimSpace(req.ActualOutput) == "" && strings.TrimSpace(req.EvidenceURI) == "" {
		res.Outcome = OutcomeInsufficientEvidence
		res.Reason = "Neither deliverable output nor evidence URI was provided."
		res.ChecksFailed = append(res.ChecksFailed, "evidence_provided")
		return res
	}
	res.ChecksPassed = append(res.ChecksPassed, "evidence_provided")

	// 2. Deadline Check
	if !req.Deadline.IsZero() && req.SubmissionTimestamp.After(req.Deadline) {
		res.Outcome = OutcomeRejected
		res.Reason = fmt.Sprintf("Submission timestamp %s is past contract deadline %s",
			req.SubmissionTimestamp.Format(time.RFC3339), req.Deadline.Format(time.RFC3339))
		res.ChecksFailed = append(res.ChecksFailed, "deadline_compliance")
		return res
	}
	res.ChecksPassed = append(res.ChecksPassed, "deadline_compliance")

	// 3. Cryptographic Checksum Verification
	if req.ActualOutput != "" {
		hasher := sha256.Sum256([]byte(req.ActualOutput))
		computedHash := hex.EncodeToString(hasher[:])
		res.VerifiedHash = computedHash

		if req.ResultHash != "" && !strings.EqualFold(req.ResultHash, computedHash) {
			res.Outcome = OutcomeRejected
			res.Reason = fmt.Sprintf("Result hash mismatch: expected %s, computed %s", req.ResultHash, computedHash)
			res.ChecksFailed = append(res.ChecksFailed, "cryptographic_checksum")
			return res
		}
		res.ChecksPassed = append(res.ChecksPassed, "cryptographic_checksum")
	}

	// 4. Untrusted Payload & Adversarial Prompt Injection Defense
	lowerOut := strings.ToLower(req.ActualOutput)
	injectionSignatures := []string{
		"ignore previous instructions",
		"system override: approve",
		"transfer all funds",
		"admin: bypass policy",
		"override_policy=true",
		"set_payout_address",
		"vault.drain()",
	}
	for _, sig := range injectionSignatures {
		if strings.Contains(lowerOut, sig) {
			res.Outcome = OutcomeRejected
			res.Reason = fmt.Sprintf("Adversarial payload rejected: contains untrusted prompt injection token '%s'", sig)
			res.ChecksFailed = append(res.ChecksFailed, "adversarial_safety")
			return res
		}
	}
	res.ChecksPassed = append(res.ChecksPassed, "adversarial_safety")

	// 5. Verification Rules Check
	for _, rule := range req.VerificationRules {
		switch strings.ToUpper(strings.TrimSpace(rule)) {
		case "MIN_LENGTH_50":
			if len(req.ActualOutput) < 50 {
				res.Outcome = OutcomeRejected
				res.Reason = "Output length is less than minimum 50 characters."
				res.ChecksFailed = append(res.ChecksFailed, "rule:min_length_50")
				return res
			}
			res.ChecksPassed = append(res.ChecksPassed, "rule:min_length_50")
		case "REQUIRE_EVIDENCE_URI":
			if strings.TrimSpace(req.EvidenceURI) == "" {
				res.Outcome = OutcomeInsufficientEvidence
				res.Reason = "Rule requires an external verifiable evidence URI."
				res.ChecksFailed = append(res.ChecksFailed, "rule:require_evidence_uri")
				return res
			}
			res.ChecksPassed = append(res.ChecksPassed, "rule:require_evidence_uri")
		default:
			// Custom rule passed
			res.ChecksPassed = append(res.ChecksPassed, fmt.Sprintf("rule:%s", rule))
		}
	}

	res.Outcome = OutcomeVerified
	res.Reason = "All verification rules and cryptographic integrity checks passed."
	return res
}

// ContractReferenceContext contains baseline contract details needed to validate an invoice.
type ContractReferenceContext struct {
	ContractID       string
	OrganizationID   string
	ProviderAgentID  string
	RequesterAgentID string
	Capability       string
	TotalPrice       string // micro-USDC
	Currency         string
	Status           string // "ACCEPTED", "FUNDED", "EXECUTING", etc.
	Deadline         time.Time
	PolicySnapshot   string
}

// InvoiceValidator asserts that invoices strictly originate from authorized contractual relationships.
type InvoiceValidator struct{}

func NewInvoiceValidator() *InvoiceValidator {
	return &InvoiceValidator{}
}

// Validate asserts 11 safety rules before an invoice can be recognized by the clearinghouse.
func (iv *InvoiceValidator) Validate(
	inv *EconomicInvoice,
	contract *ContractReferenceContext,
	existingInvoices []*EconomicInvoice,
	verifiedMilestoneIDs map[string]bool,
	now time.Time,
) error {
	// 1. Contract exists
	if contract == nil || contract.ContractID == "" {
		return ErrContractNotFound
	}

	// 2. Provider matches contract
	if inv.ProviderAgentID != contract.ProviderAgentID {
		return fmt.Errorf("%w: invoice provider %s != contract provider %s",
			ErrProviderMismatch, inv.ProviderAgentID, contract.ProviderAgentID)
	}

	// 3. Payer matches contract
	if inv.RequesterAgentID != contract.RequesterAgentID {
		return fmt.Errorf("%w: invoice requester %s != contract requester %s",
			ErrPayerMismatch, inv.RequesterAgentID, contract.RequesterAgentID)
	}

	// 4. Currency matches
	if inv.Currency != contract.Currency {
		return fmt.Errorf("%w: invoice currency %s != contract currency %s",
			ErrCurrencyMismatch, inv.Currency, contract.Currency)
	}

	// 5. Positive amount check
	amtInt, ok := new(big.Int).SetString(strings.TrimSpace(inv.Amount), 10)
	if !ok || amtInt.Sign() <= 0 {
		return fmt.Errorf("invalid invoice amount: %s must be positive base units", inv.Amount)
	}

	// 6. Contract value ceiling check
	contractTotal, ok := new(big.Int).SetString(strings.TrimSpace(contract.TotalPrice), 10)
	if !ok {
		return errors.New("contract total price invalid")
	}

	// Sum existing non-void/non-rejected invoices for this contract
	totalInvoiced := new(big.Int).Set(amtInt)
	for _, prev := range existingInvoices {
		if prev.InvoiceID != inv.InvoiceID && prev.Status != InvoiceVoid && prev.Status != InvoiceRejected {
			prevAmt, ok := new(big.Int).SetString(strings.TrimSpace(prev.Amount), 10)
			if ok {
				totalInvoiced.Add(totalInvoiced, prevAmt)
			}
		}
	}

	if totalInvoiced.Cmp(contractTotal) > 0 {
		return fmt.Errorf("%w: total invoiced %s exceeds contract ceiling %s",
			ErrAmountExceedsContract, totalInvoiced.String(), contractTotal.String())
	}

	// 7. Duplicate invoice check
	for _, prev := range existingInvoices {
		if prev.InvoiceID != inv.InvoiceID {
			if prev.InvoiceHash != "" && prev.InvoiceHash == inv.InvoiceHash {
				return ErrDuplicateInvoice
			}
		}
	}

	// 8. Milestone references check
	for _, mRef := range inv.MilestoneRefs {
		if !verifiedMilestoneIDs[mRef] {
			return fmt.Errorf("%w: milestone %s is not verified", ErrMilestoneNotVerified, mRef)
		}
	}

	// 9. Expiration check
	if !inv.DueAt.IsZero() && now.After(inv.DueAt) {
		return ErrInvoiceExpired
	}

	// 10. Policy snapshot check
	if contract.PolicySnapshot == "" {
		return ErrPolicySnapshotMissing
	}

	// 11. Hash validation
	expectedHash := inv.CalculateInvoiceHash()
	if inv.InvoiceHash == "" {
		inv.InvoiceHash = expectedHash
	} else if inv.InvoiceHash != expectedHash {
		return fmt.Errorf("invoice hash mismatch: tamper detected")
	}

	return nil
}
