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
