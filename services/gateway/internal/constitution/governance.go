package constitution

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrChangeNotApproved       = errors.New("cannot activate change request: status must be APPROVED")
	ErrInvalidProposer         = errors.New("proposer actor identity is required")
	ErrInvalidApprover         = errors.New("approver actor identity is required")
	ErrStalePolicyAuthorization = errors.New("stale policy authorization detected: policy has advanced since intent was authorized (INV-49)")
)

// GovernanceService manages the constitutional lifecycle and 12-step activation checklist.
type GovernanceService struct {
	store      Store
	diffEngine *PolicyDiffEngine
	testRunner *TestRunner
	evaluator  Evaluator
}

// NewGovernanceService creates a new GovernanceService.
func NewGovernanceService(store Store) *GovernanceService {
	eval := NewEvaluator()
	return &GovernanceService{
		store:      store,
		diffEngine: NewPolicyDiffEngine(),
		testRunner: NewTestRunner(eval),
		evaluator:  eval,
	}
}

// ProposeChange initiates a new policy revision workflow.
func (s *GovernanceService) ProposeChange(ctx context.Context, orgID string, candidate EconomicConstitution, proposer string) (*PolicyChangeRequest, error) {
	if proposer == "" {
		return nil, ErrInvalidProposer
	}

	active, err := s.store.GetActiveConstitution(ctx, orgID)
	if err != nil && !errors.Is(err, ErrNoActiveConstitution) {
		return nil, err
	}

	var currentVer uint64
	if active != nil {
		currentVer = active.Version
	}

	// Invariant: Version must be currentVer + 1
	if candidate.Version != currentVer+1 {
		candidate.Version = currentVer + 1
	}
	candidate.OrganizationID = orgID
	candidate.Status = StatusDraft
	candidate.CreatedAt = time.Now().UTC()
	candidate.CreatedBy = proposer
	candidate.PreviousVersion = currentVer
	candidate.PolicyHash = candidate.CalculatePolicyHash()

	// Compute diff & authority delta
	var diff PolicyDiff
	if active != nil {
		diff = s.diffEngine.Diff(active, &candidate)
	} else {
		diff = PolicyDiff{
			OldVersion:     0,
			NewVersion:     candidate.Version,
			AuthorityDelta: AuthorityDelta{Classification: "MORE_PERMISSIVE", Explanation: "Initial genesis constitution"},
		}
	}

	// Persist proposed draft version
	if err := s.store.SaveConstitution(ctx, &candidate); err != nil {
		return nil, err
	}

	reqID := generateID("pcr")
	req := &PolicyChangeRequest{
		RequestID:            reqID,
		OrganizationID:       orgID,
		CurrentVersion:       currentVer,
		ProposedVersion:      candidate.Version,
		ProposedConstitution: candidate,
		AuthorityDelta:       diff.AuthorityDelta,
		RiskSummary:          fmt.Sprintf("Classification: %s. %s", diff.AuthorityDelta.Classification, diff.AuthorityDelta.Explanation),
		Proposer:             proposer,
		Status:               "DRAFT",
		CreatedAt:            time.Now().UTC(),
	}

	if err := s.store.SaveChangeRequest(ctx, req); err != nil {
		return nil, err
	}
	return req, nil
}

// ReviewChange records an operator's formal governance review.
func (s *GovernanceService) ReviewChange(ctx context.Context, reqID, reviewer string, approve bool, notes string) (*PolicyChangeRequest, error) {
	cr, err := s.store.GetChangeRequest(ctx, reqID)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	cr.Reviewer = reviewer
	cr.ReviewedAt = &now

	if approve {
		cr.Status = "APPROVED"
		cr.Approver = reviewer
		cr.ApprovedAt = &now
	} else {
		cr.Status = "REJECTED"
	}

	if notes != "" {
		cr.RiskSummary = fmt.Sprintf("%s | Reviewer Notes: %s", cr.RiskSummary, notes)
	}

	if err := s.store.SaveChangeRequest(ctx, cr); err != nil {
		return nil, err
	}
	return cr, nil
}

// ActivateChange executes the 12-step validation checklist and atomically activates the constitution.
// INVARIANT INV-47: Autonomous agents cannot activate policy.
// INVARIANT INV-50: Exactly one active constitution per organization.
// INVARIANT INV-52: Unauthorized policy changes are rejected.
func (s *GovernanceService) ActivateChange(ctx context.Context, reqID, approver string, testCases []PolicyTestCase) (*EconomicConstitution, error) {
	if approver == "" {
		return nil, ErrInvalidApprover
	}

	cr, err := s.store.GetChangeRequest(ctx, reqID)
	if err != nil {
		return nil, err
	}

	// 1. Status Check
	if cr.Status != "APPROVED" {
		return nil, fmt.Errorf("%w: current status is %s", ErrChangeNotApproved, cr.Status)
	}

	candidate := cr.ProposedConstitution

	// 2. Validate Version Monotonicity
	active, _ := s.store.GetActiveConstitution(ctx, cr.OrganizationID)
	var expectedPrev uint64
	if active != nil {
		expectedPrev = active.Version
	}
	if candidate.Version != expectedPrev+1 {
		return nil, fmt.Errorf("activation safety check failed: version %d is not monotonically next after %d", candidate.Version, expectedPrev)
	}

	// 3. Verify Policy Hash Integrity
	computedHash := candidate.CalculatePolicyHash()
	if candidate.PolicyHash != "" && candidate.PolicyHash != computedHash {
		return nil, fmt.Errorf("activation safety check failed: policy hash mismatch")
	}
	candidate.PolicyHash = computedHash

	// 4. Run Automated Policy Test Cases
	if len(testCases) > 0 {
		report := s.testRunner.RunTestSuite(&candidate, testCases)
		if !report.Passed {
			return nil, fmt.Errorf("activation safety check failed: policy test suite failed (%d/%d passed, failures: %v)", report.PassedTests, report.TotalTests, report.Failures)
		}
	}

	// 5. Atomic Compare-And-Swap Activation
	activated, err := s.store.ActivateConstitution(ctx, cr.OrganizationID, candidate.Version, expectedPrev, approver)
	if err != nil {
		return nil, fmt.Errorf("atomic activation failed: %w", err)
	}

	now := time.Now().UTC()
	cr.Status = "ACTIVATED"
	cr.ActivatedAt = &now
	_ = s.store.SaveChangeRequest(ctx, cr)

	return activated, nil
}

// RollbackPolicy reverts an organization's active constitution to a prior approved version.
// INVARIANT INV-51: Policy rollback is auditable.
func (s *GovernanceService) RollbackPolicy(ctx context.Context, orgID string, targetVersion uint64, actor string) (*EconomicConstitution, error) {
	if actor == "" {
		return nil, errors.New("actor identity required for policy rollback")
	}

	active, err := s.store.GetActiveConstitution(ctx, orgID)
	if err != nil {
		return nil, err
	}

	if active.Version == targetVersion {
		return nil, fmt.Errorf("constitution version %d is already active", targetVersion)
	}

	rolledBack, err := s.store.RollbackConstitution(ctx, orgID, targetVersion, actor)
	if err != nil {
		return nil, err
	}

	return rolledBack, nil
}

// VerifyPolicyFreshness verifies whether a payment authorization's constitution version is still current.
// INVARIANT INV-49: Stale policy authorization cannot silently execute without revalidation.
func (s *GovernanceService) VerifyPolicyFreshness(ctx context.Context, orgID string, policyVersionAtIntent uint64) (bool, error) {
	active, err := s.store.GetActiveConstitution(ctx, orgID)
	if err != nil {
		return false, err
	}
	if active.Version != policyVersionAtIntent {
		return false, fmt.Errorf("%w: intent authorized under v%d, currently active is v%d", ErrStalePolicyAuthorization, policyVersionAtIntent, active.Version)
	}
	return true, nil
}

func generateID(prefix string) string {
	bytes := make([]byte, 8)
	_, _ = rand.Read(bytes)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}
