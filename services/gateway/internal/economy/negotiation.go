package economy

import (
	"context"
	"errors"
	"math/big"
	"sync"
	"time"
)

var (
	ErrMaxRoundsReached  = errors.New("maximum negotiation rounds reached (max 3 rounds)")
	ErrQuoteNotNegotiable = errors.New("quote cannot be negotiated in current status")
	ErrCounterExceedsCap = errors.New("counter-offer price exceeds allowable limit or budget")
	ErrInvalidCounterPrice = errors.New("counter price must be a valid positive integer string")
)

// NegotiationEngine governs structured multi-round price and terms negotiation.
// INVARIANT: An AI agent can propose or negotiate, but AgentPay strictly authorizes the quote.
type NegotiationEngine struct {
	mu         sync.Mutex
	agentCoord *AgentCoordinator
	budgetCtrl *BudgetController
}

// NewNegotiationEngine constructs a new structured negotiation engine.
func NewNegotiationEngine(agentCoord *AgentCoordinator, budgetCtrl *BudgetController) *NegotiationEngine {
	return &NegotiationEngine{
		agentCoord: agentCoord,
		budgetCtrl: budgetCtrl,
	}
}

// CounterOfferParams holds arguments for an agent proposing a counter-offer.
type CounterOfferParams struct {
	QuoteID         string            `json:"quote_id"`
	ProposerAgentID string            `json:"proposer_agent_id"`
	ProposedPrice   string            `json:"proposed_price"` // micro-USDC
	Terms           map[string]string `json:"terms,omitempty"`
}

// ProposeCounter evaluates and records an economic counter-offer within an active quote.
func (ne *NegotiationEngine) ProposeCounter(ctx context.Context, p CounterOfferParams) (*AgentQuote, error) {
	ne.mu.Lock()
	defer ne.mu.Unlock()

	quote, err := ne.agentCoord.GetQuote(p.QuoteID)
	if err != nil {
		return nil, err
	}

	if quote.Status != QuoteStatusOffered {
		return nil, ErrQuoteNotNegotiable
	}

	if time.Now().UTC().After(quote.ValidUntil) {
		quote.Status = QuoteStatusExpired
		return nil, errors.New("quote has expired")
	}

	// Maximum 3 negotiation rounds allowed to prevent negotiation loops
	currentRounds := len(quote.NegotiationRounds)
	if currentRounds >= 3 {
		return nil, ErrMaxRoundsReached
	}

	counterPriceInt, ok := new(big.Int).SetString(p.ProposedPrice, 10)
	if !ok || counterPriceInt.Sign() <= 0 {
		return nil, ErrInvalidCounterPrice
	}

	// Get seller agent service limits
	svc, err := ne.agentCoord.GetAgentService(quote.ServiceID)
	if err != nil {
		return nil, err
	}

	basePriceInt, _ := new(big.Int).SetString(svc.BasePrice, 10)
	maxPriceInt, _ := new(big.Int).SetString(svc.MaxPrice, 10)

	// If proposed price is below the seller's absolute base floor, reject or counter at base floor
	newRound := currentRounds + 1
	var sellerResponsePrice string
	var roundStatus string

	if counterPriceInt.Cmp(basePriceInt) < 0 {
		// Buyer proposed below floor: seller counters with basePrice
		sellerResponsePrice = svc.BasePrice
		roundStatus = "COUNTERED"
	} else if counterPriceInt.Cmp(maxPriceInt) > 0 {
		return nil, ErrCounterExceedsCap
	} else {
		// Buyer proposed within acceptable band [BasePrice, MaxPrice]: Seller accepts buyer's counter!
		sellerResponsePrice = p.ProposedPrice
		roundStatus = "ACCEPTED"
		quote.Price = p.ProposedPrice
	}

	proposal := NegotiationProposal{
		Round:           newRound,
		ProposerAgentID: p.ProposerAgentID,
		ProposedPrice:   sellerResponsePrice,
		Terms:           p.Terms,
		Status:          roundStatus,
		CreatedAt:       time.Now().UTC(),
	}

	// Persist updated quote in coordinator
	ne.agentCoord.mu.Lock()
	defer ne.agentCoord.mu.Unlock()

	actualQ, ok := ne.agentCoord.quotes[quote.QuoteID]
	if !ok {
		return nil, errors.New("quote not found in coordinator")
	}

	actualQ.NegotiationRounds = append(actualQ.NegotiationRounds, proposal)
	actualQ.Price = sellerResponsePrice
	if roundStatus == "ACCEPTED" {
		actualQ.Status = QuoteStatusAccepted
	}

	copyQ := *actualQ
	return &copyQ, nil
}
