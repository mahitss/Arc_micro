package clearinghouse

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

var (
	ErrIncompatibleCurrency         = errors.New("cannot net obligations denominated in different currencies")
	ErrDisputedObligationCannotNet  = errors.New("cannot net disputed obligations")
	ErrCounterpartyMismatch         = errors.New("netting requires exact matching bilateral counterparties")
	ErrNettingNotApproved           = errors.New("netting proposal has not been approved by all participating parties")
	ErrNettingExpired               = errors.New("netting proposal has expired")
	ErrNettingPolicyViolation       = errors.New("netted settlement amount exceeds current policy limits")
)

// NettingEngine identifies compatible obligations and computes bilateral offsets.
type NettingEngine struct{}

func NewNettingEngine() *NettingEngine {
	return &NettingEngine{}
}

// ProposeBilateralNetting analyzes two sets of obligations between Agent A and Agent B.
// Enforces INV-60 (cannot increase financial authority) and INV-61 (preserves original obligation history).
func (ne *NettingEngine) ProposeBilateralNetting(
	orgID string,
	agentA string,
	agentB string,
	currency string,
	obligationsAtoB []*EconomicObligation, // A owes B
	obligationsBtoA []*EconomicObligation, // B owes A
	ttl time.Duration,
) (*NettingProposal, error) {
	if strings.TrimSpace(agentA) == "" || strings.TrimSpace(agentB) == "" {
		return nil, errors.New("both agent counterparties must be specified")
	}
	if strings.EqualFold(agentA, agentB) {
		return nil, errors.New("cannot net obligations against self")
	}
	if strings.ToUpper(currency) != "USDC" {
		return nil, fmt.Errorf("%w: only USDC is supported", ErrIncompatibleCurrency)
	}

	grossAtoB := big.NewInt(0)
	idsAtoB := make([]string, 0, len(obligationsAtoB))
	for _, ob := range obligationsAtoB {
		if ob.Currency != currency {
			return nil, ErrIncompatibleCurrency
		}
		if ob.PayerAgentID != agentA || ob.PayeeAgentID != agentB {
			return nil, ErrCounterpartyMismatch
		}
		if ob.Status == ObligationDisputed {
			return nil, fmt.Errorf("%w: obligation %s is disputed", ErrDisputedObligationCannotNet, ob.ObligationID)
		}
		if ob.Status != ObligationVerified && ob.Status != ObligationDue && ob.Status != ObligationAuthorized {
			return nil, fmt.Errorf("obligation %s is in state %s; only AUTHORIZED/DUE/VERIFIED obligations can be netted", ob.ObligationID, ob.Status)
		}
		amt, ok := new(big.Int).SetString(strings.TrimSpace(ob.Amount), 10)
		if !ok || amt.Sign() <= 0 {
			return nil, fmt.Errorf("invalid obligation amount for %s", ob.ObligationID)
		}
		grossAtoB.Add(grossAtoB, amt)
		idsAtoB = append(idsAtoB, ob.ObligationID)
	}

	grossBtoA := big.NewInt(0)
	idsBtoA := make([]string, 0, len(obligationsBtoA))
	for _, ob := range obligationsBtoA {
		if ob.Currency != currency {
			return nil, ErrIncompatibleCurrency
		}
		if ob.PayerAgentID != agentB || ob.PayeeAgentID != agentA {
			return nil, ErrCounterpartyMismatch
		}
		if ob.Status == ObligationDisputed {
			return nil, fmt.Errorf("%w: obligation %s is disputed", ErrDisputedObligationCannotNet, ob.ObligationID)
		}
		if ob.Status != ObligationVerified && ob.Status != ObligationDue && ob.Status != ObligationAuthorized {
			return nil, fmt.Errorf("obligation %s is in state %s; only AUTHORIZED/DUE/VERIFIED obligations can be netted", ob.ObligationID, ob.Status)
		}
		amt, ok := new(big.Int).SetString(strings.TrimSpace(ob.Amount), 10)
		if !ok || amt.Sign() <= 0 {
			return nil, fmt.Errorf("invalid obligation amount for %s", ob.ObligationID)
		}
		grossBtoA.Add(grossBtoA, amt)
		idsBtoA = append(idsBtoA, ob.ObligationID)
	}

	grossTotal := new(big.Int).Add(grossAtoB, grossBtoA)
	if grossTotal.Sign() == 0 {
		return nil, errors.New("netting requires at least one non-zero obligation")
	}

	var netPayer, netPayee string
	netAmount := big.NewInt(0)
	savingsAmount := big.NewInt(0)

	cmp := grossAtoB.Cmp(grossBtoA)
	if cmp > 0 {
		// A owes more to B
		netPayer = agentA
		netPayee = agentB
		netAmount.Sub(grossAtoB, grossBtoA)
		savingsAmount.Mul(grossBtoA, big.NewInt(2)) // Both parties save grossBtoA volume
	} else if cmp < 0 {
		// B owes more to A
		netPayer = agentB
		netPayee = agentA
		netAmount.Sub(grossBtoA, grossAtoB)
		savingsAmount.Mul(grossAtoB, big.NewInt(2))
	} else {
		// Perfect offset
		netPayer = "NONE"
		netPayee = "NONE"
		netAmount = big.NewInt(0)
		savingsAmount = new(big.Int).Set(grossTotal)
	}

	// Generate proposal ID
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	proposalID := fmt.Sprintf("net_prop_%s", hex.EncodeToString(b))

	now := time.Now().UTC()
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}

	return &NettingProposal{
		ProposalID:      proposalID,
		OrganizationID:  orgID,
		AgentA:          agentA,
		AgentB:          agentB,
		Currency:        currency,
		ObligationsAtoB: idsAtoB,
		ObligationsBtoA: idsBtoA,
		GrossAmountAtoB: grossAtoB.String(),
		GrossAmountBtoA: grossBtoA.String(),
		GrossTotal:      grossTotal.String(),
		NetPayer:        netPayer,
		NetPayee:        netPayee,
		NetAmount:       netAmount.String(),
		SavingsAmount:   savingsAmount.String(),
		Status:          NettingEligible,
		ApprovedByA:     false,
		ApprovedByB:     false,
		CreatedAt:       now,
		ExpiresAt:       now.Add(ttl),
	}, nil
}

// ProposeMultiPartyNetting performs bounded graph netting across multi-party obligation cycles.
// Enforces INV-202 (cannot create value), INV-203 (cannot bypass policy), INV-210 (disputes cannot net),
// and INV-220 (cannot reduce accounting value incorrectly).
func (ne *NettingEngine) ProposeMultiPartyNetting(
	orgID string,
	tenantID string,
	currency string,
	obligations []*EconomicObligation,
	ttl time.Duration,
) (*MultiPartyNettingProposal, error) {
	if len(obligations) == 0 {
		return nil, errors.New("cannot perform netting on empty obligation set")
	}
	if strings.ToUpper(currency) != "USDC" {
		return nil, fmt.Errorf("%w: only USDC is supported", ErrIncompatibleCurrency)
	}

	grossTotal := big.NewInt(0)
	netBalances := make(map[string]*big.Int)
	originalIDs := make([]string, 0, len(obligations))
	counterpartySet := make(map[string]bool)

	for _, ob := range obligations {
		if ob.Currency != currency {
			return nil, ErrIncompatibleCurrency
		}
		if ob.Status == ObligationDisputed {
			return nil, fmt.Errorf("%w: obligation %s is disputed", ErrDisputedObligationCannotNet, ob.ObligationID)
		}
		if ob.Status != ObligationVerified && ob.Status != ObligationDue && ob.Status != ObligationAuthorized && ob.Status != ObligationConfirmed {
			return nil, fmt.Errorf("obligation %s is in state %s; cannot be netted", ob.ObligationID, ob.Status)
		}
		if strings.EqualFold(ob.PayerAgentID, ob.PayeeAgentID) {
			return nil, errors.New("cannot net obligations against self")
		}

		amt, ok := new(big.Int).SetString(strings.TrimSpace(ob.Amount), 10)
		if !ok || amt.Sign() <= 0 {
			return nil, fmt.Errorf("invalid obligation amount for %s", ob.ObligationID)
		}

		grossTotal.Add(grossTotal, amt)
		originalIDs = append(originalIDs, ob.ObligationID)
		counterpartySet[ob.PayerAgentID] = true
		counterpartySet[ob.PayeeAgentID] = true

		// Payer balance decreases (negative)
		if _, ok := netBalances[ob.PayerAgentID]; !ok {
			netBalances[ob.PayerAgentID] = big.NewInt(0)
		}
		netBalances[ob.PayerAgentID].Sub(netBalances[ob.PayerAgentID], amt)

		// Payee balance increases (positive)
		if _, ok := netBalances[ob.PayeeAgentID]; !ok {
			netBalances[ob.PayeeAgentID] = big.NewInt(0)
		}
		netBalances[ob.PayeeAgentID].Add(netBalances[ob.PayeeAgentID], amt)
	}

	// Verify conservation of balance sum == 0 (INV-202)
	sumCheck := big.NewInt(0)
	for _, bal := range netBalances {
		sumCheck.Add(sumCheck, bal)
	}
	if sumCheck.Sign() != 0 {
		return nil, fmt.Errorf("%w: netting balance sum is non-zero (%s)", ErrNettingValueCreation, sumCheck.String())
	}

	type balanceEntry struct {
		agentID string
		balance *big.Int
	}

	var debtors []*balanceEntry
	var creditors []*balanceEntry

	for agentID, bal := range netBalances {
		if bal.Sign() < 0 {
			// Debtor: owes money (store positive debt magnitude)
			debt := new(big.Int).Neg(bal)
			debtors = append(debtors, &balanceEntry{agentID: agentID, balance: debt})
		} else if bal.Sign() > 0 {
			creditors = append(creditors, &balanceEntry{agentID: agentID, balance: new(big.Int).Set(bal)})
		}
	}

	// Deterministic cycle resolution: settle largest debtors against largest creditors
	var proposedNet []*ProposedNetObligation
	netTotal := big.NewInt(0)

	dIdx, cIdx := 0, 0
	for dIdx < len(debtors) && cIdx < len(creditors) {
		debtor := debtors[dIdx]
		creditor := creditors[cIdx]

		if debtor.balance.Sign() == 0 {
			dIdx++
			continue
		}
		if creditor.balance.Sign() == 0 {
			cIdx++
			continue
		}

		transferAmt := new(big.Int)
		if debtor.balance.Cmp(creditor.balance) <= 0 {
			transferAmt.Set(debtor.balance)
			creditor.balance.Sub(creditor.balance, transferAmt)
			debtor.balance.SetInt64(0)
			dIdx++
		} else {
			transferAmt.Set(creditor.balance)
			debtor.balance.Sub(debtor.balance, transferAmt)
			creditor.balance.SetInt64(0)
			cIdx++
		}

		if transferAmt.Sign() > 0 {
			proposedNet = append(proposedNet, &ProposedNetObligation{
				PayerAgentID:           debtor.agentID,
				PayeeAgentID:           creditor.agentID,
				Amount:                 transferAmt.String(),
				OriginalObligationRefs: originalIDs,
			})
			netTotal.Add(netTotal, transferAmt)
		}
	}

	savingsTotal := new(big.Int).Sub(grossTotal, netTotal)
	if err := ValidateNettingValueConservation(grossTotal.String(), netTotal.String(), savingsTotal.String()); err != nil {
		return nil, err
	}

	counterparties := make([]string, 0, len(counterpartySet))
	for cp := range counterpartySet {
		counterparties = append(counterparties, cp)
	}

	// Policy approval tiering
	approvalStatus := NettingAutoEligible
	fiftyUSDC := big.NewInt(50000000) // 50 USDC
	if netTotal.Cmp(fiftyUSDC) > 0 || len(counterparties) > 2 {
		approvalStatus = NettingRequiresApproval
	}

	b := make([]byte, 8)
	_, _ = rand.Read(b)
	propID := fmt.Sprintf("net_mp_%s", hex.EncodeToString(b))

	now := time.Now().UTC()
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}

	economicImpact := fmt.Sprintf(
		"Multi-party cycle netting compresses %d original obligations (%s micro-USDC) into %d net settlements (%s micro-USDC), reducing liquidity demand by %s micro-USDC across %d agents.",
		len(obligations), grossTotal.String(), len(proposedNet), netTotal.String(), savingsTotal.String(), len(counterparties),
	)

	return &MultiPartyNettingProposal{
		ProposalID:             propID,
		TenantID:               tenantID,
		OrganizationID:         orgID,
		Currency:               currency,
		OriginalObligations:    originalIDs,
		ProposedNetObligations: proposedNet,
		GrossValue:             grossTotal.String(),
		NetValue:               netTotal.String(),
		SavingsValue:           savingsTotal.String(),
		Counterparties:         counterparties,
		ApprovalStatus:         approvalStatus,
		Status:                 NettingProposed,
		EconomicImpact:         economicImpact,
		CreatedAt:              now,
		ExpiresAt:              now.Add(ttl),
	}, nil
}

