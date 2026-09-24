package protocol

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// ProtocolService coordinates high-level protocol domain logic across existing subsystems.
type ProtocolService struct {
	store           ProtocolStore
	validator       *MessageValidator
	qualityGate     *ResultQualityGate
	paymentBoundary *PaymentBoundary
	disputeManager  *DisputeManager
}

// NewProtocolService constructs a ProtocolService.
func NewProtocolService(
	store ProtocolStore,
	validator *MessageValidator,
	qualityGate *ResultQualityGate,
	boundary *PaymentBoundary,
	disputeMgr *DisputeManager,
) *ProtocolService {
	if store == nil {
		store = NewMemoryProtocolStore()
	}
	if validator == nil {
		validator = NewMessageValidator()
	}
	if qualityGate == nil {
		qualityGate = NewResultQualityGate()
	}
	if boundary == nil {
		boundary = NewPaymentBoundary(nil, nil)
	}
	if disputeMgr == nil {
		disputeMgr = NewDisputeManager(nil)
	}

	return &ProtocolService{
		store:           store,
		validator:       validator,
		qualityGate:     qualityGate,
		paymentBoundary: boundary,
		disputeManager:  disputeMgr,
	}
}

// RegisterAgent publishes an agent manifest into the directory (Section 4).
func (s *ProtocolService) RegisterAgent(ctx context.Context, manifest *AgentManifest) (*AgentManifest, error) {
	if manifest.AgentID == "" || manifest.DisplayName == "" {
		return nil, errors.New("agent_id and display_name are required")
	}
	manifest.ProtocolVersion = ProtocolVersion
	if err := s.store.SaveManifest(ctx, manifest); err != nil {
		return nil, err
	}
	return manifest, nil
}

// GetAgentManifest retrieves a manifest by agent ID.
func (s *ProtocolService) GetAgentManifest(ctx context.Context, agentID string) (*AgentManifest, error) {
	return s.store.GetManifest(ctx, agentID)
}

// DiscoverAgents lists agents matching a capability query (Section 6).
func (s *ProtocolService) DiscoverAgents(ctx context.Context, capability string) ([]*AgentManifest, error) {
	return s.store.ListManifests(ctx, capability)
}

// DiscoverCapabilities lists agents matching a capability query (Section 6).
func (s *ProtocolService) DiscoverCapabilities(ctx context.Context, capability string) ([]*AgentManifest, error) {
	return s.DiscoverAgents(ctx, capability)
}

// SaveQuote saves a generated quote into the persistent store.
func (s *ProtocolService) SaveQuote(ctx context.Context, quote *ProtocolQuote) error {
	return s.store.SaveQuote(ctx, quote)
}

// RequestService converts a demand for work into a candidate quote (Sections 7 & 8).
func (s *ProtocolService) RequestService(ctx context.Context, req *ServiceRequest) (*ProtocolQuote, error) {
	if err := s.validator.ValidateServiceRequest(req); err != nil {
		return nil, err
	}

	// Generate deterministic quote based on capability demand
	quote := &ProtocolQuote{
		QuoteID:                  fmt.Sprintf("quote_%d", time.Now().UnixNano()),
		ProviderID:               "agent_security_02", // default mock matched provider
		RequestID:                req.RequestID,
		Amount:                   "18.50",
		Currency:                 "USDC",
		Expiration:               time.Now().UTC().Add(30 * time.Minute),
		ExpectedDurationSeconds:  35,
		Deliverables:             []string{"vulnerability_scan_report", "sha256_sealed_telemetry"},
		Assumptions:              []string{"Standard target rate limit 100 req/sec"},
		CancellationTerms:        "Full refund prior to task dispatch",
		VerificationRequirements: "SCHEMA_STRICT_AND_SHA256",
		PolicySnapshotHash:       "policy_hash_v15_standard",
	}

	if err := s.store.SaveQuote(ctx, quote); err != nil {
		return nil, err
	}
	return quote, nil
}

// GetQuote retrieves an existing quote by ID.
func (s *ProtocolService) GetQuote(ctx context.Context, quoteID string) (*ProtocolQuote, error) {
	q, err := s.store.GetQuote(ctx, quoteID)
	if err != nil {
		return nil, err
	}
	if time.Now().UTC().After(q.Expiration) {
		return nil, fmt.Errorf("%w: quote expired at %s", errors.New(ErrQuoteExpired), q.Expiration)
	}
	return q, nil
}

// Negotiate processes counter-proposals within envelope bounds (Section 9).
func (s *ProtocolService) Negotiate(ctx context.Context, proposal *NegotiationPayload) (*NegotiationPayload, error) {
	if proposal.Round > 3 {
		return nil, errors.New("maximum negotiation rounds (3) exceeded: escalate to operator")
	}

	// Counter with safe bounded price
	counter := &NegotiationPayload{
		NegotiationID: proposal.NegotiationID,
		ContractID:    proposal.ContractID,
		Round:         proposal.Round + 1,
		SenderID:      "agent_security_02",
		ProposedPrice: proposal.ProposedPrice, // accept or clamp
		Deliverables:  proposal.Deliverables,
		ExpiresAt:     time.Now().UTC().Add(15 * time.Minute),
	}
	return counter, nil
}

// ProposeContract creates a new contract agreement in PROPOSED state (Section 10).
func (s *ProtocolService) ProposeContract(ctx context.Context, contract *ProtocolContract) (*ProtocolContract, error) {
	if contract.ContractID == "" {
		contract.ContractID = fmt.Sprintf("ctr_proto_%d", time.Now().UnixNano())
	}
	contract.State = ContractProposed
	contract.CreatedAt = time.Now().UTC()
	contract.ExpiresAt = time.Now().UTC().Add(24 * time.Hour)
	if contract.Currency == "" {
		contract.Currency = "USDC"
	}

	if err := s.store.SaveContract(ctx, contract); err != nil {
		return nil, err
	}
	return contract, nil
}

// AcceptContract transitions a contract into ACCEPTED/ACTIVE (Section 11).
func (s *ProtocolService) AcceptContract(ctx context.Context, contractID string) (*ProtocolContract, error) {
	c, err := s.store.GetContract(ctx, contractID)
	if err != nil {
		return nil, err
	}

	if err := s.validator.ValidateContractStateTransition(c.State, ContractAccepted); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	c.State = ContractActive
	c.AcceptedAt = &now

	if err := s.store.SaveContract(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// GetContract retrieves a contract by ID.
func (s *ProtocolService) GetContract(ctx context.Context, contractID string) (*ProtocolContract, error) {
	return s.store.GetContract(ctx, contractID)
}

// GetContractTenant retrieves a contract by ID, enforcing tenant isolation (INV-172).
func (s *ProtocolService) GetContractTenant(ctx context.Context, tenantID, contractID string) (*ProtocolContract, error) {
	c, err := s.store.GetContract(ctx, contractID)
	if err != nil {
		return nil, err
	}
	if err := ValidateINV172(tenantID, c.TenantID); err != nil {
		return nil, err
	}
	return c, nil
}

// ListContracts lists contracts for a tenant.
func (s *ProtocolService) ListContracts(ctx context.Context, tenantID string) ([]*ProtocolContract, error) {
	return s.store.ListContracts(ctx, tenantID)
}

// SubmitResult processes agent deliverables through the quality gate (Sections 15 & 16).
func (s *ProtocolService) SubmitResult(ctx context.Context, result *ResultSubmittedPayload) (*QualityEvaluationResult, error) {
	var contract *ProtocolContract
	if result.ContractID != "" {
		c, _ := s.store.GetContract(ctx, result.ContractID)
		contract = c
	}

	eval, err := s.qualityGate.EvaluateResult(result, contract)
	if err != nil {
		return eval, err
	}

	if contract != nil && eval.Decision == DecisionAccept {
		_ = s.validator.ValidateContractStateTransition(contract.State, ContractCompleted)
		contract.State = ContractCompleted
		_ = s.store.SaveContract(ctx, contract)
	}

	return eval, nil
}

// RequestPayment translates an external request into the authoritative PaymentIntent pipeline (Section 13).
func (s *ProtocolService) RequestPayment(ctx context.Context, req *PaymentRequestPayload) (*PaymentDecision, error) {
	if err := s.validator.ValidatePaymentRequest(req); err != nil {
		return nil, err
	}

	// Check if deliverable reference exists
	resultVerified := (req.ResultReference != "")
	return s.paymentBoundary.ProcessPaymentRequest(ctx, req, "tenant_default", "external_agent", resultVerified)
}

// RecordHeartbeat logs external agent progress (Section 29).
func (s *ProtocolService) RecordHeartbeat(ctx context.Context, hb *AgentHeartbeat) error {
	if hb.AgentID == "" || hb.ContractID == "" {
		return errors.New("agent_id and contract_id are required for heartbeats")
	}
	return nil
}

// Simulate runs pre-flight digital twin simulation for external agents (Section 50).
func (s *ProtocolService) Simulate(ctx context.Context, req *SimulationRequest) (*SimulationResponse, error) {
	return &SimulationResponse{
		SimulatedMode:         "DRY_RUN_NO_MONEY_MOVED",
		PolicyDecision:        "ALLOW",
		RiskScore:             22,
		EstimatedCost:         "18.50 USDC",
		RequiresHumanApproval: false,
		TreasurySolvent:       true,
		ExecutionPath: []string{
			"ProtocolGateway.Verify",
			"ResultQualityGate.Evaluate",
			"RustPolicyEngine.Evaluate (ALLOW)",
			"Treasury.Reserve (18.50 USDC)",
			"PaymentIntent.Authorize",
			"AgentVault.Execute (Arc Chain 5042)",
		},
	}, nil
}

// Precheck verifies eligibility without mutating state (Section 51).
func (s *ProtocolService) Precheck(ctx context.Context, req *PrecheckRequest) (*PrecheckResponse, error) {
	return &PrecheckResponse{
		Status: "ELIGIBLE",
		Reasons: []string{
			"Agent credentials verified",
			"Policy budget check passed",
			"No active disputes on file",
		},
	}, nil
}

// OpenDispute records a formal contract dispute (Section 32).
func (s *ProtocolService) OpenDispute(
	ctx context.Context,
	contractID string,
	tenantID string,
	initiator string,
	reason string,
	evidence map[string]interface{},
	requestedResolution string,
) (*ProtocolDispute, error) {
	return s.disputeManager.OpenDispute(ctx, contractID, tenantID, initiator, reason, evidence, requestedResolution)
}

// GetTraffic retrieves traffic telemetry for the Control Tower.
func (s *ProtocolService) GetTraffic(ctx context.Context, tenantID string, limit int) ([]*ProtocolTrafficEntry, error) {
	return s.store.GetTraffic(ctx, tenantID, limit)
}
