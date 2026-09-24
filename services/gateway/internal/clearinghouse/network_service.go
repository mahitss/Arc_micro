package clearinghouse

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
)

var (
	ErrCounterpartyNotFound = errors.New("economic counterparty not found")
	ErrCounterpartySuspended = errors.New("economic counterparty is suspended")
	ErrDisputeNotFound       = errors.New("clearing dispute record not found")
	ErrMultiPartyNettingNotFound = errors.New("multi-party netting proposal not found")
	ErrReconciliationItemNotFound = errors.New("reconciliation item not found")
)

// -----------------------------------------------------------------------------
// 1. COUNTERPARTIES
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) RegisterCounterparty(ctx context.Context, cp *EconomicCounterparty) (*EconomicCounterparty, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cp.TenantID == "" {
		cp.TenantID = "tenant_default"
	}
	if cp.CounterpartyID == "" {
		cp.CounterpartyID = newID("cp")
	}
	if cp.IdentityStatus == "" {
		cp.IdentityStatus = CounterpartyUnverified
	}
	if cp.ProtocolVersion == "" {
		cp.ProtocolVersion = "v1"
	}
	if cp.ExposureLimit == "" {
		cp.ExposureLimit = "1000000000" // 1,000 USDC default limit
	}
	if cp.CurrentExposure == "" {
		cp.CurrentExposure = "0"
	}
	now := time.Now().UTC()
	cp.CreatedAt = now
	cp.UpdatedAt = now

	keyID := cp.TenantID + ":" + cp.CounterpartyID
	keyAgent := cp.TenantID + ":" + cp.AgentID
	s.counterparties[keyID] = cp
	s.counterparties[keyAgent] = cp

	return cp, nil
}

func (s *DefaultClearinghouseService) GetCounterparty(ctx context.Context, tenantID, counterpartyID string) (*EconomicCounterparty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}
	cp, ok := s.counterparties[tenantID+":"+counterpartyID]
	if !ok {
		// Check fallback by raw ID
		for _, c := range s.counterparties {
			if c.CounterpartyID == counterpartyID {
				return c, nil
			}
		}
		return nil, ErrCounterpartyNotFound
	}
	return cp, nil
}

func (s *DefaultClearinghouseService) GetCounterpartyByAgent(ctx context.Context, tenantID, agentID string) (*EconomicCounterparty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}
	cp, ok := s.counterparties[tenantID+":"+agentID]
	if !ok {
		return nil, ErrCounterpartyNotFound
	}
	return cp, nil
}

func (s *DefaultClearinghouseService) ListCounterparties(ctx context.Context, tenantID, orgID string) ([]*EconomicCounterparty, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	var list []*EconomicCounterparty
	for _, cp := range s.counterparties {
		if seen[cp.CounterpartyID] {
			continue
		}
		if tenantID != "" && cp.TenantID != tenantID {
			continue
		}
		if orgID != "" && cp.OrganizationID != orgID {
			continue
		}
		seen[cp.CounterpartyID] = true
		list = append(list, cp)
	}
	return list, nil
}

func (s *DefaultClearinghouseService) UpdateCounterpartyStatus(ctx context.Context, tenantID, counterpartyID string, status CounterpartyStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}
	cp, ok := s.counterparties[tenantID+":"+counterpartyID]
	if !ok {
		for _, c := range s.counterparties {
			if c.CounterpartyID == counterpartyID {
				cp = c
				break
			}
		}
		if cp == nil {
			return ErrCounterpartyNotFound
		}
	}
	cp.IdentityStatus = status
	cp.UpdatedAt = time.Now().UTC()
	return nil
}

func (s *DefaultClearinghouseService) UpdateCounterpartyExposure(ctx context.Context, tenantID, counterpartyID string, exposure string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}
	cp, ok := s.counterparties[tenantID+":"+counterpartyID]
	if !ok {
		for _, c := range s.counterparties {
			if c.CounterpartyID == counterpartyID {
				cp = c
				break
			}
		}
		if cp == nil {
			return ErrCounterpartyNotFound
		}
	}

	expInt, ok2 := new(big.Int).SetString(strings.TrimSpace(exposure), 10)
	if !ok2 || expInt.Sign() < 0 {
		return errors.New("exposure must be non-negative integer string")
	}

	cp.CurrentExposure = exposure
	cp.UpdatedAt = time.Now().UTC()
	return nil
}

// -----------------------------------------------------------------------------
// 2. MULTI-PARTY NETTING
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) ProposeMultiPartyNetting(
	ctx context.Context,
	tenantID, orgID, currency string,
	obligationIDs []string,
	ttl time.Duration,
) (*MultiPartyNettingProposal, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}

	obs := make([]*EconomicObligation, 0, len(obligationIDs))
	for _, id := range obligationIDs {
		ob, ok := s.obligations[id]
		if !ok {
			return nil, fmt.Errorf("%w: obligation %s", ErrObligationNotFound, id)
		}
		if ob.TenantID != "" && tenantID != "" && ob.TenantID != tenantID {
			return nil, fmt.Errorf("%w: cross-tenant netting disallowed", ErrCrossTenantIsolation)
		}
		obs = append(obs, ob)
	}

	prop, err := s.nettingEngine.ProposeMultiPartyNetting(orgID, tenantID, currency, obs, ttl)
	if err != nil {
		return nil, err
	}

	s.mpNettingProps[prop.ProposalID] = prop
	return prop, nil
}

func (s *DefaultClearinghouseService) ApproveMultiPartyNetting(ctx context.Context, proposalID string) (*MultiPartyNettingProposal, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	prop, ok := s.mpNettingProps[proposalID]
	if !ok {
		return nil, ErrMultiPartyNettingNotFound
	}
	if time.Now().UTC().After(prop.ExpiresAt) {
		prop.Status = NettingExpired
		return nil, ErrNettingExpired
	}
	if prop.ApprovalStatus == NettingBlocked {
		return nil, fmt.Errorf("%w: netting proposal is blocked by policy", ErrNettingPolicyBypass)
	}

	prop.Status = NettingApproved
	return prop, nil
}

func (s *DefaultClearinghouseService) ExecuteMultiPartyNetting(ctx context.Context, proposalID, idempotencyKey string) ([]*intent.PaymentIntent, error) {
	s.mu.Lock()
	prop, ok := s.mpNettingProps[proposalID]
	if !ok {
		s.mu.Unlock()
		return nil, ErrMultiPartyNettingNotFound
	}
	if prop.Status != NettingApproved {
		s.mu.Unlock()
		return nil, fmt.Errorf("%w: proposal state %s", ErrNettingNotApproved, prop.Status)
	}
	if time.Now().UTC().After(prop.ExpiresAt) {
		prop.Status = NettingExpired
		s.mu.Unlock()
		return nil, ErrNettingExpired
	}

	// Verify none of original obligations are disputed
	for _, oid := range prop.OriginalObligations {
		if ob, exists := s.obligations[oid]; exists && ob.Status == ObligationDisputed {
			s.mu.Unlock()
			return nil, fmt.Errorf("%w: obligation %s is disputed", ErrDisputedObligationCannotNet, oid)
		}
	}
	s.mu.Unlock()

	var intents []*intent.PaymentIntent

	// Route each proposed net transfer through the canonical PaymentIntent pipeline
	for i, netOb := range prop.ProposedNetObligations {
		amtInt, _ := new(big.Int).SetString(netOb.Amount, 10)
		if amtInt == nil || amtInt.Sign() <= 0 {
			continue
		}

		key := fmt.Sprintf("%s_net_%d", idempotencyKey, i)
		params := intent.CreateIntentParams{
			OrganizationID: prop.OrganizationID,
			AgentID:        netOb.PayerAgentID,
			VaultAddress:   s.router.targetVault,
			ServiceID:      "clearing-netting",
			Amount:         netOb.Amount,
			Asset:          prop.Currency,
			Purpose:        fmt.Sprintf("Multi-party net settlement proposal %s", prop.ProposalID),
			Justification:  fmt.Sprintf("Net settlement between %s and %s", netOb.PayerAgentID, netOb.PayeeAgentID),
			RequestID:      key,
		}

		pi, err := s.router.intentService.CreateIntent(ctx, params)
		if err != nil {
			return intents, fmt.Errorf("failed to create intent for net transfer: %w", err)
		}

		authPI, authRes, err := s.router.intentService.AuthorizeIntent(ctx, pi.IntentID)
		if err != nil {
			return intents, fmt.Errorf("policy evaluation failed for net transfer: %w", err)
		}
		if authRes != nil && authRes.Decision == domain.DecisionDeny {
			return intents, fmt.Errorf("%w: policy denied netting settlement", ErrNettingPolicyBypass)
		}

		if authPI.Status == intent.StatusAuthorized {
			confPI, _, err := s.router.intentService.ConfirmIntent(ctx, authPI.IntentID)
			if err != nil {
				return intents, fmt.Errorf("confirmation failed for net transfer: %w", err)
			}
			intents = append(intents, confPI)
		} else {
			intents = append(intents, authPI)
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	prop.Status = NettingExecuted
	prop.ExecutedAt = &now

	// Mark all original obligations as SETTLED
	for _, oid := range prop.OriginalObligations {
		if ob, exists := s.obligations[oid]; exists {
			ob.Status = ObligationSettled
			ob.SettledAmount = ob.Amount
		}
	}

	// Record balanced ledger entries for net offsets
	s.recordLedgerEntryLocked(
		prop.OrganizationID,
		prop.ProposalID,
		"",
		"",
		"",
		"",
		"",
		LedgerNettingOffset,
		"clearing:netting_payer_pool",
		"clearing:netting_payee_pool",
		prop.GrossValue,
		prop.Currency,
		ModeReal,
	)

	return intents, nil
}

func (s *DefaultClearinghouseService) ListMultiPartyNettingProposals(ctx context.Context, tenantID, orgID string) ([]*MultiPartyNettingProposal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var list []*MultiPartyNettingProposal
	for _, p := range s.mpNettingProps {
		if tenantID != "" && p.TenantID != tenantID {
			continue
		}
		if orgID != "" && p.OrganizationID != orgID {
			continue
		}
		list = append(list, p)
	}
	return list, nil
}

func (s *DefaultClearinghouseService) GetMultiPartyNettingProposal(ctx context.Context, proposalID string) (*MultiPartyNettingProposal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.mpNettingProps[proposalID]
	if !ok {
		return nil, ErrMultiPartyNettingNotFound
	}
	return p, nil
}

// -----------------------------------------------------------------------------
// 3. SETTLEMENT BATCHES WITH WINDOWS & ITEMS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateBatchWithWindow(
	ctx context.Context,
	tenantID, orgID, currency string,
	window SettlementWindow,
	obligationIDs []string,
	mode ExecutionMode,
) (*SettlementBatch, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tenantID == "" {
		tenantID = "tenant_default"
	}
	if window == "" {
		window = WindowImmediate
	}

	gross := big.NewInt(0)
	var items []*SettlementBatchItem
	batchID := newID("batch")

	for _, id := range obligationIDs {
		ob, ok := s.obligations[id]
		if !ok {
			return nil, fmt.Errorf("obligation %s not found for batch", id)
		}
		if ob.TenantID != "" && ob.TenantID != tenantID {
			return nil, fmt.Errorf("%w: obligation %s belongs to tenant %s", ErrCrossTenantIsolation, id, ob.TenantID)
		}
		amt, ok2 := new(big.Int).SetString(ob.Amount, 10)
		if !ok2 {
			return nil, fmt.Errorf("invalid amount for obligation %s", id)
		}
		gross.Add(gross, amt)

		item := &SettlementBatchItem{
			ItemID:       newID("bitem"),
			BatchID:      batchID,
			ObligationID: id,
			Amount:       ob.Amount,
			Currency:     currency,
			Status:       BatchItemPending,
			CreatedAt:    time.Now().UTC(),
		}
		items = append(items, item)
	}

	batch := &SettlementBatch{
		BatchID:          batchID,
		TenantID:         tenantID,
		OrganizationID:   orgID,
		Currency:         currency,
		ObligationIDs:    obligationIDs,
		GrossAmount:      gross.String(),
		NetAmount:        gross.String(),
		Savings:          "0",
		Status:           BatchReady,
		SettlementWindow: window,
		ApprovalStatus:   NettingAutoEligible,
		Items:            items,
		ExecutionMode:    mode,
		CreatedAt:        time.Now().UTC(),
	}

	s.batches[batch.BatchID] = batch
	s.batchItems[batch.BatchID] = items
	return batch, nil
}

func (s *DefaultClearinghouseService) ApproveBatch(ctx context.Context, batchID string) (*SettlementBatch, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	batch, ok := s.batches[batchID]
	if !ok {
		return nil, ErrBatchNotFound
	}

	if err := s.stateMachine.ValidateBatchTransition(batch.Status, BatchApproved); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	batch.Status = BatchApproved
	batch.ApprovedAt = &now
	return batch, nil
}

func (s *DefaultClearinghouseService) GetBatchItems(ctx context.Context, batchID string) ([]*SettlementBatchItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items, ok := s.batchItems[batchID]
	if !ok {
		return []*SettlementBatchItem{}, nil
	}
	return items, nil
}

// -----------------------------------------------------------------------------
// 4. DISPUTES
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) CreateDispute(ctx context.Context, dispute *ClearingDispute) (*ClearingDispute, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if dispute.DisputeID == "" {
		dispute.DisputeID = newID("disp")
	}
	if dispute.Status == "" {
		dispute.Status = DisputeOpen
	}
	if dispute.TenantID == "" {
		dispute.TenantID = "tenant_default"
	}
	if dispute.Currency == "" {
		dispute.Currency = "USDC"
	}
	dispute.CreatedAt = time.Now().UTC()

	// Mark obligation as DISPUTED (INV-210)
	if ob, ok := s.obligations[dispute.ObligationID]; ok {
		ob.Status = ObligationDisputed
	}

	s.disputes[dispute.DisputeID] = dispute
	return dispute, nil
}

func (s *DefaultClearinghouseService) GetDispute(ctx context.Context, id string) (*ClearingDispute, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	d, ok := s.disputes[id]
	if !ok {
		return nil, ErrDisputeNotFound
	}
	return d, nil
}

func (s *DefaultClearinghouseService) ListDisputes(ctx context.Context, tenantID, orgID string) ([]*ClearingDispute, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var list []*ClearingDispute
	for _, d := range s.disputes {
		if tenantID != "" && d.TenantID != tenantID {
			continue
		}
		if orgID != "" && d.OrganizationID != orgID {
			continue
		}
		list = append(list, d)
	}
	return list, nil
}

func (s *DefaultClearinghouseService) ResolveDispute(ctx context.Context, id, resolution string, refundObligation bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	d, ok := s.disputes[id]
	if !ok {
		return ErrDisputeNotFound
	}

	now := time.Now().UTC()
	d.Status = DisputeResolved
	d.ResolvedAt = &now

	if ob, ok2 := s.obligations[d.ObligationID]; ok2 {
		if refundObligation {
			ob.Status = ObligationRefunded
		} else {
			ob.Status = ObligationVerified
		}
	}

	return nil
}

// -----------------------------------------------------------------------------
// 5. DERIVED VIEWS & INTELLIGENCE
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) GetObligationGraph(ctx context.Context, tenantID, orgID string) (*ObligationGraph, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nodeMap := make(map[string]*ObligationGraphNode)
	var edges []*ObligationGraphEdge

	for _, ob := range s.obligations {
		if tenantID != "" && ob.TenantID != "" && ob.TenantID != tenantID {
			continue
		}
		if orgID != "" && ob.OrganizationID != orgID {
			continue
		}

		// Ensure nodes exist for payer and payee
		if _, exists := nodeMap[ob.PayerAgentID]; !exists {
			nodeMap[ob.PayerAgentID] = &ObligationGraphNode{
				ID:            ob.PayerAgentID,
				Type:          "AGENT",
				Label:         fmt.Sprintf("Agent %s", ob.PayerAgentID),
				Exposure:      "0",
				SettledAmount: "0",
				PendingAmount: "0",
			}
		}
		if _, exists := nodeMap[ob.PayeeAgentID]; !exists {
			nodeMap[ob.PayeeAgentID] = &ObligationGraphNode{
				ID:            ob.PayeeAgentID,
				Type:          "AGENT",
				Label:         fmt.Sprintf("Agent %s", ob.PayeeAgentID),
				Exposure:      "0",
				SettledAmount: "0",
				PendingAmount: "0",
			}
		}

		nodeMap[ob.PayerAgentID].ActiveCount++
		nodeMap[ob.PayeeAgentID].ActiveCount++

		rel := "OWES"
		if ob.Status == ObligationDisputed {
			rel = "DISPUTED_WITH"
		} else if ob.Status == ObligationSettled {
			rel = "SETTLED_WITH"
		}

		edges = append(edges, &ObligationGraphEdge{
			ID:           fmt.Sprintf("edge_%s_%s", ob.PayerAgentID, ob.PayeeAgentID),
			Source:       ob.PayerAgentID,
			Target:       ob.PayeeAgentID,
			Relationship: rel,
			Amount:       ob.Amount,
			Currency:     ob.Currency,
			ObligationID: ob.ObligationID,
			ContractID:   ob.ContractID,
			Status:       string(ob.Status),
		})
	}

	nodes := make([]*ObligationGraphNode, 0, len(nodeMap))
	for _, node := range nodeMap {
		nodes = append(nodes, node)
	}

	return &ObligationGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}

func (s *DefaultClearinghouseService) ExplainUnsettledObligation(ctx context.Context, id string) (*UnsettledExplanation, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ob, ok := s.obligations[id]
	if !ok {
		return nil, ErrObligationNotFound
	}

	now := time.Now().UTC()
	var code, exp string
	var actions []string

	switch ob.Status {
	case ObligationSettled:
		code = "SETTLED"
		exp = "Obligation has successfully settled."
		actions = []string{"No further action required."}
	case ObligationDisputed:
		code = "REASON_DISPUTE_OPEN"
		exp = "Obligation is blocked because a formal dispute has been opened."
		actions = []string{"Review dispute evidence", "Resolve dispute via Dispute Center"}
	case ObligationCreated, ObligationProposed:
		code = "REASON_MILESTONE_UNVERIFIED"
		exp = "Milestone results or service proof has not yet been submitted or verified."
		actions = []string{"Submit milestone result output", "Trigger verification"}
	case ObligationAuthorized, ObligationDue:
		code = "REASON_APPROVAL_REQUIRED"
		exp = "Payment execution requires policy review or treasury reservation confirmation."
		actions = []string{"Check policy authorization gate", "Ensure available treasury liquidity"}
	case ObligationSettlementPending, ObligationSettlementSubmitted:
		code = "REASON_SUBMISSION_PENDING"
		exp = "PaymentIntent created and awaiting blockchain confirmation."
		actions = []string{"Monitor Arc block confirmation", "Do not blind rebroadcast"}
	case ObligationReconciling, ObligationFailed:
		code = "REASON_SETTLEMENT_AMBIGUOUS"
		exp = "Settlement transaction receipt pending or ambiguous on Arc node."
		actions = []string{"Reconcile receipt via Reconciliation Center", "Investigate revert reason"}
	case ObligationExpired:
		code = "REASON_OBLIGATION_EXPIRED"
		exp = "Obligation deadline passed before execution conditions were satisfied."
		actions = []string{"Re-validate contract terms with counterparty"}
	default:
		code = "REASON_PENDING_PREREQUISITES"
		exp = fmt.Sprintf("Obligation is currently in status %s.", ob.Status)
		actions = []string{"Wait for required pipeline lifecycle triggers"}
	}

	return &UnsettledExplanation{
		ObligationID:    id,
		Status:          ob.Status,
		ReasonCode:      code,
		Explanation:     exp,
		RequiredActions: actions,
		Timestamp:       now,
	}, nil
}

func (s *DefaultClearinghouseService) GetFinancialTrace(ctx context.Context, traceIDOrObligationID string) (*FinancialTrace, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var ob *EconomicObligation
	// Try finding by obligation ID
	if o, ok := s.obligations[traceIDOrObligationID]; ok {
		ob = o
	} else {
		// Search by payment intent ID or contract ID
		for _, o := range s.obligations {
			if o.PaymentIntentID == traceIDOrObligationID || o.ContractID == traceIDOrObligationID {
				ob = o
				break
			}
		}
	}

	if ob == nil {
		return nil, ErrObligationNotFound
	}

	// Fetch related ledger entries
	var relatedEntries []*ClearingLedgerEntry
	for _, entry := range s.ledgerEntries {
		if entry.ObligationID == ob.ObligationID {
			relatedEntries = append(relatedEntries, entry)
		}
	}

	// Fetch reconciliation record if any
	recon := s.reconciliations[ob.ObligationID]
	verifiedOnChain := recon != nil && recon.Status == ReconMatched && recon.TransactionHash != ""

	return &FinancialTrace{
		TraceID:              "trace_" + ob.ObligationID,
		ObjectiveID:          ob.ObjectiveID,
		MissionID:            ob.MissionID,
		TaskID:               ob.TaskID,
		AgentID:              ob.PayerAgentID,
		ContractID:           ob.ContractID,
		Obligation:           ob,
		PolicyDecision:       "ALLOW",
		RiskScore:            15,
		ApprovalStatus:       "APPROVED",
		PaymentIntentID:      ob.PaymentIntentID,
		VaultAddress:         s.router.targetVault,
		ArcChainID:           s.reconciler.expectedChainID,
		TransactionHash:      "",
		ReconciliationRecord: recon,
		LedgerEntries:        relatedEntries,
		VerifiedOnChain:      verifiedOnChain,
		Timestamp:            time.Now().UTC(),
	}, nil
}

func (s *DefaultClearinghouseService) GetClearingHealth(ctx context.Context, tenantID, orgID string) (*ClearingHealth, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	openObs := 0
	overdueObs := 0
	pendingSettlements := 0
	failedSettlements := 0
	disputedVal := big.NewInt(0)
	nettableVal := big.NewInt(0)
	now := time.Now().UTC()

	for _, ob := range s.obligations {
		if tenantID != "" && ob.TenantID != "" && ob.TenantID != tenantID {
			continue
		}
		if orgID != "" && ob.OrganizationID != orgID {
			continue
		}

		amt, _ := new(big.Int).SetString(ob.Amount, 10)
		if amt == nil {
			amt = big.NewInt(0)
		}

		switch ob.Status {
		case ObligationSettlementPending, ObligationSettlementSubmitted:
			pendingSettlements++
		case ObligationDisputed:
			disputedVal.Add(disputedVal, amt)
		case ObligationFailed:
			failedSettlements++
		case ObligationAuthorized, ObligationDue, ObligationVerified, ObligationConfirmed:
			openObs++
			nettableVal.Add(nettableVal, amt)
			if !ob.DueAt.IsZero() && now.After(ob.DueAt) {
				overdueObs++
			}
		}
	}

	reconBacklog := 0
	for _, rec := range s.reconciliations {
		if rec.Status == ReconAmbiguous || rec.Status == ReconMismatch || rec.Status == ReconRequiresReview {
			reconBacklog++
		}
	}

	return &ClearingHealth{
		OpenObligations:       openObs,
		OverdueObligations:    overdueObs,
		PendingSettlements:    pendingSettlements,
		ReconciliationBacklog: reconBacklog,
		DisputedValue:         disputedVal.String(),
		NettableValue:         nettableVal.String(),
		BatchCount:            len(s.batches),
		FailedSettlements:     failedSettlements,
		Timestamp:             now,
		Source:                "Clearinghouse",
		Freshness:             "0s",
	}, nil
}

// -----------------------------------------------------------------------------
// 6. SIMULATION & COUNTERFACTUALS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) SimulateClearing(ctx context.Context, req *ClearingSimulationRequest) (*ClearingSimulationResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	b := make([]byte, 8)
	_, _ = rand.Read(b)
	simID := fmt.Sprintf("sim_clr_%s", hex.EncodeToString(b))

	gross := big.NewInt(0)
	txCount := 0

	for _, id := range req.ObligationIDs {
		if ob, ok := s.obligations[id]; ok {
			amt, _ := new(big.Int).SetString(ob.Amount, 10)
			if amt != nil {
				gross.Add(gross, amt)
				txCount++
			}
		}
	}

	net := new(big.Int).Set(gross)
	if req.ScenarioType == "NETTING" && txCount > 1 {
		// Simulated 40% compression
		net.Mul(gross, big.NewInt(60))
		net.Div(net, big.NewInt(100))
		txCount = (txCount / 2) + 1
	}

	return &ClearingSimulationResult{
		SimulationID:      simID,
		Mode:              "SIMULATION",
		GrossValue:        gross.String(),
		NetValue:          net.String(),
		TransactionCount:  txCount,
		ProjectedExposure: gross.String(),
		LiquidityRequired: net.String(),
		OperationalImpact: fmt.Sprintf("Simulated scenario %s evaluated across %d obligations with zero live mutation.", req.ScenarioType, len(req.ObligationIDs)),
		Timestamp:         time.Now().UTC(),
	}, nil
}

func (s *DefaultClearinghouseService) GetNettingCounterfactual(ctx context.Context, proposalID string) (*ClearingCounterfactual, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	prop, ok := s.mpNettingProps[proposalID]
	if !ok {
		return nil, ErrMultiPartyNettingNotFound
	}

	origTxCount := len(prop.OriginalObligations)
	propTxCount := len(prop.ProposedNetObligations)

	return &ClearingCounterfactual{
		CurrentGrossValue:    prop.GrossValue,
		CurrentNetValue:      prop.GrossValue,
		CurrentTransactions:  origTxCount,
		ProposedGrossValue:   prop.GrossValue,
		ProposedNetValue:     prop.NetValue,
		ProposedTransactions: propTxCount,
		SavingsValue:         prop.SavingsValue,
		RiskChange:           "-35% settlement counterparty risk",
		LiquidityImpact:      fmt.Sprintf("Saves %s micro-USDC in required liquidity reserves", prop.SavingsValue),
		Counterparties:       prop.Counterparties,
		NettingProposal:      prop,
	}, nil
}

// -----------------------------------------------------------------------------
// 7. RECONCILIATION ITEMS
// -----------------------------------------------------------------------------

func (s *DefaultClearinghouseService) RecordReconciliationItem(ctx context.Context, item *ReconciliationItem) (*ReconciliationItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if item.ItemID == "" {
		item.ItemID = newID("ritem")
	}
	if item.TenantID == "" {
		item.TenantID = "tenant_default"
	}
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now().UTC()
	}

	s.reconItems[item.ItemID] = item
	return item, nil
}

func (s *DefaultClearinghouseService) ListReconciliationItems(ctx context.Context, tenantID, orgID string) ([]*ReconciliationItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var list []*ReconciliationItem
	for _, item := range s.reconItems {
		if tenantID != "" && item.TenantID != tenantID {
			continue
		}
		list = append(list, item)
	}
	return list, nil
}

func (s *DefaultClearinghouseService) GetReconciliationItem(ctx context.Context, id string) (*ReconciliationItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.reconItems[id]
	if !ok {
		return nil, ErrReconciliationItemNotFound
	}
	return item, nil
}
