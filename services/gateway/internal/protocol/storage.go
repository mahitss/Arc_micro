package protocol

import (
	"context"
	"errors"
	"sync"
	"time"
)

var (
	ErrContractNotFound  = errors.New("protocol contract not found")
	ErrQuoteNotFound     = errors.New("protocol quote not found")
	ErrAgentNotFound     = errors.New("agent manifest not found")
	ErrCapabilityMissing = errors.New("capability not found")
	ErrOperationNotFound = errors.New("async operation not found")
)

// ProtocolStore abstracts protocol persistence.
type ProtocolStore interface {
	SaveMessage(ctx context.Context, msg *ProtocolMessage) error
	GetMessageByIdempotency(ctx context.Context, tenantID, key string) (*ProtocolMessage, error)

	SaveManifest(ctx context.Context, manifest *AgentManifest) error
	GetManifest(ctx context.Context, agentID string) (*AgentManifest, error)
	ListManifests(ctx context.Context, capability string) ([]*AgentManifest, error)

	SaveQuote(ctx context.Context, quote *ProtocolQuote) error
	GetQuote(ctx context.Context, quoteID string) (*ProtocolQuote, error)

	SaveContract(ctx context.Context, contract *ProtocolContract) error
	GetContract(ctx context.Context, contractID string) (*ProtocolContract, error)
	ListContracts(ctx context.Context, tenantID string) ([]*ProtocolContract, error)

	SaveOperation(ctx context.Context, opID, opType, status string, result, errData interface{}) error
	GetOperation(ctx context.Context, opID string) (map[string]interface{}, error)

	RecordTraffic(ctx context.Context, entry *ProtocolTrafficEntry) error
	GetTraffic(ctx context.Context, tenantID string, limit int) ([]*ProtocolTrafficEntry, error)
}

// MemoryProtocolStore implements in-memory protocol persistence.
type MemoryProtocolStore struct {
	mu          sync.RWMutex
	messages    map[string]*ProtocolMessage
	idempotency map[string]*ProtocolMessage // tenant:key -> msg
	manifests   map[string]*AgentManifest
	quotes      map[string]*ProtocolQuote
	contracts   map[string]*ProtocolContract
	operations  map[string]map[string]interface{}
	traffic     []*ProtocolTrafficEntry
}

// NewMemoryProtocolStore constructs an in-memory store initialized with default fixtures.
func NewMemoryProtocolStore() *MemoryProtocolStore {
	store := &MemoryProtocolStore{
		messages:    make(map[string]*ProtocolMessage),
		idempotency: make(map[string]*ProtocolMessage),
		manifests:   make(map[string]*AgentManifest),
		quotes:      make(map[string]*ProtocolQuote),
		contracts:   make(map[string]*ProtocolContract),
		operations:  make(map[string]map[string]interface{}),
		traffic:     make([]*ProtocolTrafficEntry, 0),
	}
	store.seedDefaultFixtures()
	return store
}

func (s *MemoryProtocolStore) seedDefaultFixtures() {
	// Seed Agent A: Research Agent
	s.manifests["agent_research_01"] = &AgentManifest{
		ProtocolVersion: ProtocolVersion,
		AgentID:         "agent_research_01",
		OrganizationID:  "org_alpha",
		DisplayName:     "Sentinel Research Agent",
		Capabilities: []CapabilityDescriptor{
			{
				CapabilityID:       "market-research@1.0",
				Name:               "Market & Threat Research",
				Version:            "1.0",
				Description:        "Comprehensive decentralized compute & threat scanning",
				EstimatedLatencyMs: 350,
				PricingModel:       "FIXED",
				SupportedAssets:    []string{"USDC"},
				RequiredTrustLevel: TrustVerified,
			},
		},
		Endpoints: map[string]string{
			"task": "https://agents.agentpay.arc/research/task",
		},
		SupportedProtocols: []string{"agentpay.protocol.v1"},
		Pricing: []ManifestPricing{
			{Capability: "market-research@1.0", Model: "FIXED", BasePrice: "10.00", Currency: "USDC"},
		},
		Availability:    "AVAILABLE",
		ReputationScore: 95,
		Authentication: map[string]string{
			"type": "api_key",
		},
		ResultFormats: []string{"application/json"},
	}

	// Seed Agent B: Security Analysis Agent
	s.manifests["agent_security_02"] = &AgentManifest{
		ProtocolVersion: ProtocolVersion,
		AgentID:         "agent_security_02",
		OrganizationID:  "org_beta",
		DisplayName:     "VigilSec Analysis Agent",
		Capabilities: []CapabilityDescriptor{
			{
				CapabilityID:       "security-audit@1.0",
				Name:               "Automated Security Audit",
				Version:            "1.0",
				Description:        "Static and dynamic smart contract analysis",
				EstimatedLatencyMs: 450,
				PricingModel:       "VARIABLE",
				SupportedAssets:    []string{"USDC"},
				RequiredTrustLevel: TrustTrusted,
			},
		},
		Endpoints: map[string]string{
			"task": "https://agents.agentpay.arc/security/task",
		},
		SupportedProtocols: []string{"agentpay.protocol.v1"},
		Pricing: []ManifestPricing{
			{Capability: "security-audit@1.0", Model: "VARIABLE", BasePrice: "18.50", MaxPrice: "25.00", Currency: "USDC"},
		},
		Availability:    "AVAILABLE",
		ReputationScore: 95,
		Authentication: map[string]string{
			"type": "signature",
		},
		ResultFormats: []string{"application/json", "sha256_sealed"},
	}

	// Seed Agent C: Verification Agent
	s.manifests["agent_verifier_03"] = &AgentManifest{
		ProtocolVersion: ProtocolVersion,
		AgentID:         "agent_verifier_03",
		OrganizationID:  "org_gamma",
		DisplayName:     "Quorum Verification Agent",
		Capabilities: []CapabilityDescriptor{
			{
				CapabilityID:       "verification@1.0",
				Name:               "Result & Evidence Verification",
				Version:            "1.0",
				Description:        "Independent cryptographic deliverable checksum validation",
				EstimatedLatencyMs: 150,
				PricingModel:       "FIXED",
				SupportedAssets:    []string{"USDC"},
				RequiredTrustLevel: TrustTrusted,
			},
		},
		Endpoints: map[string]string{
			"task": "https://agents.agentpay.arc/verifier/task",
		},
		SupportedProtocols: []string{"agentpay.protocol.v1"},
		Pricing: []ManifestPricing{
			{Capability: "verification@1.0", Model: "FIXED", BasePrice: "5.00", Currency: "USDC"},
		},
		Availability:    "AVAILABLE",
		ReputationScore: 95,
		Authentication: map[string]string{
			"type": "signature",
		},
		ResultFormats: []string{"application/json"},
	}

	// Seed Active Contract ($110.00 USDC Total with Multi-Milestone Deliverables)
	s.contracts["contract_live_01"] = &ProtocolContract{
		ContractID:         "contract_live_01",
		TenantID:           "tenant_default",
		RequesterID:        "agent_research_01",
		ProviderID:         "agent_security_02",
		Capability:         "security-audit@1.0",
		Deliverables:       []string{"audit_report_full.pdf", "vulnerability_matrix.json"},
		TotalAmount:        "110.00",
		Currency:           "USDC",
		PolicySnapshotHash: "c81729b4892019ab76ce0f42337a898112bc55210fa1402390aebce0984f11e2",
		State:              ContractActive,
		CreatedAt:          time.Now().UTC().Add(-6 * time.Hour),
		ExpiresAt:          time.Now().UTC().Add(48 * time.Hour),
		Milestones: []ContractMilestone{
			{
				MilestoneID:        "m1_initial_scan",
				Title:              "Static Analysis & Initial Scan",
				DeliverableSpec:    "SHA-256 seal of static analysis findings",
				Amount:             "35.00",
				VerificationMethod: "CRYPTO_HASH_AND_SCHEMA",
				DueAt:              time.Now().UTC().Add(-2 * time.Hour),
				Status:             "PAID",
			},
			{
				MilestoneID:        "m2_final_audit",
				Title:              "Comprehensive Verification & Exploit Proof",
				DeliverableSpec:    "Signed security report deliverable",
				Amount:             "75.00",
				VerificationMethod: "INDEPENDENT_VERIFIER_CONSENSUS",
				DueAt:              time.Now().UTC().Add(24 * time.Hour),
				Status:             "SUBMITTED",
			},
		},
	}

	// Seed Quote
	s.quotes["quote_audit_100"] = &ProtocolQuote{
		QuoteID:                 "quote_audit_100",
		ProviderID:              "agent_security_02",
		RequestID:               "req_demo_01",
		Amount:                  "5.00",
		Currency:                "USDC",
		Expiration:              time.Now().UTC().Add(2 * time.Hour),
		ExpectedDurationSeconds: 30,
		Deliverables:            []string{"vulnerability_scan_report"},
		PolicySnapshotHash:      "policy_sha256_mock_001",
	}

	// Seed Canonical Traffic Telemetry
	now := time.Now().UTC()
	s.traffic = []*ProtocolTrafficEntry{
		{
			TrafficID:     "trf_001",
			Timestamp:     now.Add(-6 * time.Minute),
			MessageType:   "service.request",
			SenderID:      "agent_research_01",
			RecipientID:   "agentpay_gateway",
			Status:        "PROCESSED",
			CorrelationID: "corr_req_101",
			LatencyMs:     6,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_002",
			Timestamp:     now.Add(-5 * time.Minute),
			MessageType:   "protocol.quote",
			SenderID:      "agent_security_02",
			RecipientID:   "agent_research_01",
			Status:        "DELIVERED",
			CorrelationID: "corr_req_101",
			LatencyMs:     12,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_003",
			Timestamp:     now.Add(-4 * time.Minute),
			MessageType:   "contract.negotiation",
			SenderID:      "agent_research_01",
			RecipientID:   "agent_security_02",
			Status:        "PROCESSED",
			CorrelationID: "corr_neg_202",
			LatencyMs:     8,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_004",
			Timestamp:     now.Add(-3 * time.Minute),
			MessageType:   "contract.proposal",
			SenderID:      "agent_security_02",
			RecipientID:   "agentpay_gateway",
			Status:        "VALIDATED",
			CorrelationID: "corr_con_303",
			LatencyMs:     15,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_005",
			Timestamp:     now.Add(-2 * time.Minute),
			MessageType:   "result.submitted",
			SenderID:      "agent_security_02",
			RecipientID:   "agentpay_gateway",
			Status:        "QUALITY_GATE_PASS",
			CorrelationID: "corr_res_404",
			LatencyMs:     22,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_006",
			Timestamp:     now.Add(-1 * time.Minute),
			MessageType:   "payment.request",
			SenderID:      "agent_security_02",
			RecipientID:   "agentpay_clearinghouse",
			Status:        "INTENT_FORMED",
			CorrelationID: "corr_pay_505",
			LatencyMs:     18,
			TenantID:      "tenant_default",
		},
		{
			TrafficID:     "trf_007",
			Timestamp:     now.Add(-30 * time.Second),
			MessageType:   "payment.decision",
			SenderID:      "agentpay_clearinghouse",
			RecipientID:   "agent_security_02",
			Status:        "APPROVED",
			CorrelationID: "corr_pay_505",
			LatencyMs:     34,
			TenantID:      "tenant_default",
		},
	}
}

func (s *MemoryProtocolStore) SaveMessage(ctx context.Context, msg *ProtocolMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages[msg.MessageID] = msg
	if msg.IdempotencyKey != "" {
		key := msg.TenantID + ":" + msg.IdempotencyKey
		s.idempotency[key] = msg
	}
	return nil
}

func (s *MemoryProtocolStore) GetMessageByIdempotency(ctx context.Context, tenantID, key string) (*ProtocolMessage, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	lookup := tenantID + ":" + key
	if msg, ok := s.idempotency[lookup]; ok {
		return msg, nil
	}
	return nil, nil
}

func (s *MemoryProtocolStore) SaveManifest(ctx context.Context, manifest *AgentManifest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.manifests[manifest.AgentID] = manifest
	return nil
}

func (s *MemoryProtocolStore) GetManifest(ctx context.Context, agentID string) (*AgentManifest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.manifests[agentID]
	if !ok {
		return nil, ErrAgentNotFound
	}
	return m, nil
}

func (s *MemoryProtocolStore) ListManifests(ctx context.Context, capability string) ([]*AgentManifest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []*AgentManifest
	for _, m := range s.manifests {
		if capability == "" {
			list = append(list, m)
			continue
		}
		for _, cap := range m.Capabilities {
			if cap.CapabilityID == capability || cap.Name == capability {
				list = append(list, m)
				break
			}
		}
	}
	return list, nil
}

func (s *MemoryProtocolStore) SaveQuote(ctx context.Context, quote *ProtocolQuote) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.quotes[quote.QuoteID] = quote
	return nil
}

func (s *MemoryProtocolStore) GetQuote(ctx context.Context, quoteID string) (*ProtocolQuote, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q, ok := s.quotes[quoteID]
	if !ok {
		return nil, ErrQuoteNotFound
	}
	return q, nil
}

func (s *MemoryProtocolStore) SaveContract(ctx context.Context, contract *ProtocolContract) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.contracts[contract.ContractID] = contract
	return nil
}

func (s *MemoryProtocolStore) GetContract(ctx context.Context, contractID string) (*ProtocolContract, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, ok := s.contracts[contractID]
	if !ok {
		return nil, ErrContractNotFound
	}
	return c, nil
}

func (s *MemoryProtocolStore) ListContracts(ctx context.Context, tenantID string) ([]*ProtocolContract, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var list []*ProtocolContract
	for _, c := range s.contracts {
		if tenantID == "" || c.TenantID == tenantID {
			list = append(list, c)
		}
	}
	return list, nil
}

func (s *MemoryProtocolStore) SaveOperation(ctx context.Context, opID, opType, status string, result, errData interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.operations[opID] = map[string]interface{}{
		"operation_id":   opID,
		"operation_type": opType,
		"status":         status,
		"result":         result,
		"error":          errData,
		"updated_at":     time.Now().UTC(),
	}
	return nil
}

func (s *MemoryProtocolStore) GetOperation(ctx context.Context, opID string) (map[string]interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	op, ok := s.operations[opID]
	if !ok {
		return nil, ErrOperationNotFound
	}
	return op, nil
}

func (s *MemoryProtocolStore) RecordTraffic(ctx context.Context, entry *ProtocolTrafficEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.traffic = append(s.traffic, entry)
	if len(s.traffic) > 1000 {
		s.traffic = s.traffic[1:] // retain last 1000 entries
	}
	return nil
}

func (s *MemoryProtocolStore) GetTraffic(ctx context.Context, tenantID string, limit int) ([]*ProtocolTrafficEntry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if limit <= 0 || limit > len(s.traffic) {
		limit = len(s.traffic)
	}

	result := make([]*ProtocolTrafficEntry, 0, limit)
	for i := len(s.traffic) - 1; i >= 0 && len(result) < limit; i-- {
		entry := s.traffic[i]
		if tenantID == "" || entry.TenantID == tenantID {
			result = append(result, entry)
		}
	}
	return result, nil
}
