package network

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
)

var (
	ErrMaxNegotiationRoundsExceeded = errors.New("maximum negotiation rounds exceeded (limit: 3)")
	ErrNegotiationAlreadyClosed     = errors.New("negotiation is already accepted, rejected, or expired")
	ErrInvalidNegotiationMessage    = errors.New("invalid negotiation message or counterparty")
	ErrCounterQuoteExceedsCeiling   = errors.New("proposed price exceeds budget ceiling or service maximum price")
	ErrQuoteExpired                 = errors.New("quote has expired")
)

// NegotiationEngine manages structured, tamper-proof economic bargaining between peer agents.
// INVARIANT: Natural-language messages cannot mutate treasury, spending limits, or recipient addresses.
type NegotiationEngine struct {
	repo StorageRepository
}

// NewNegotiationEngine creates a new NegotiationEngine.
func NewNegotiationEngine(repo StorageRepository) *NegotiationEngine {
	return &NegotiationEngine{repo: repo}
}

// StartNegotiation initiates a structured negotiation session for a service contract.
func (e *NegotiationEngine) StartNegotiation(
	ctx context.Context,
	contractID string,
	requesterID string,
	providerID string,
	initialPriceBaseUnits string,
	ttl time.Duration,
) (*NegotiationMessage, error) {
	if strings.TrimSpace(contractID) == "" || strings.TrimSpace(requesterID) == "" || strings.TrimSpace(providerID) == "" {
		return nil, errors.New("contract_id, requester_id, and provider_id are required")
	}

	now := time.Now().UTC()
	msg := &NegotiationMessage{
		ID:              fmt.Sprintf("neg_msg_%d", now.UnixNano()),
		ContractID:      contractID,
		Round:           1,
		MessageType:     MsgServiceRequest,
		SenderAgentID:   requesterID,
		ReceiverAgentID: providerID,
		ProposedPrice:   initialPriceBaseUnits,
		ExpiresAt:       now.Add(ttl),
		CreatedAt:       now,
	}

	_ = e.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:         domain.GenerateEventID(),
		Type:       domain.EventNetworkNegotiationStarted,
		Version:    1,
		OccurredAt: now,
		ActorType:  "AGENT",
		ActorID:    requesterID,
		AgentID:    requesterID,
		Data: map[string]interface{}{
			"contract_id":    contractID,
			"requester_id":   requesterID,
			"provider_id":    providerID,
			"proposed_price": initialPriceBaseUnits,
		},
	})

	return msg, nil
}

// SubmitCounterQuote processes a structured counter-offer from either party.
func (e *NegotiationEngine) SubmitCounterQuote(
	ctx context.Context,
	prevMsg *NegotiationMessage,
	proposerID string,
	counterPriceBaseUnits string,
	budgetCeilingBaseUnits string,
	ttl time.Duration,
) (*NegotiationMessage, error) {
	if prevMsg == nil {
		return nil, errors.New("previous message cannot be nil")
	}
	if time.Now().UTC().After(prevMsg.ExpiresAt) {
		return nil, ErrQuoteExpired
	}
	if prevMsg.Round >= MaxNegotiationRounds {
		return nil, ErrMaxNegotiationRoundsExceeded
	}

	// Verify price ceiling
	cPrice, ok1 := new(big.Int).SetString(counterPriceBaseUnits, 10)
	cCeil, ok2 := new(big.Int).SetString(budgetCeilingBaseUnits, 10)
	if ok1 && ok2 && cCeil.Sign() > 0 && cPrice.Cmp(cCeil) > 0 {
		return nil, fmt.Errorf("%w: proposed %s exceeds budget ceiling %s", ErrCounterQuoteExceedsCeiling, counterPriceBaseUnits, budgetCeilingBaseUnits)
	}

	now := time.Now().UTC()
	receiverID := prevMsg.SenderAgentID
	if proposerID == prevMsg.SenderAgentID {
		receiverID = prevMsg.ReceiverAgentID
	}

	newMsg := &NegotiationMessage{
		ID:              fmt.Sprintf("neg_msg_%d", now.UnixNano()),
		ContractID:      prevMsg.ContractID,
		Round:           prevMsg.Round + 1,
		MessageType:     MsgCounterQuote,
		SenderAgentID:   proposerID,
		ReceiverAgentID: receiverID,
		ProposedPrice:   counterPriceBaseUnits,
		ExpiresAt:       now.Add(ttl),
		CreatedAt:       now,
	}

	_ = e.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:         domain.GenerateEventID(),
		Type:       domain.EventNetworkQuoteRequested,
		Version:    1,
		OccurredAt: now,
		ActorType:  "AGENT",
		ActorID:    proposerID,
		AgentID:    proposerID,
		Data: map[string]interface{}{
			"contract_id":   prevMsg.ContractID,
			"round":         newMsg.Round,
			"counter_price": counterPriceBaseUnits,
		},
	})

	return newMsg, nil
}

// FinalizeNegotiation marks the proposal accepted or rejected.
func (e *NegotiationEngine) FinalizeNegotiation(
	ctx context.Context,
	lastMsg *NegotiationMessage,
	acceptorID string,
	accepted bool,
) (*NegotiationMessage, error) {
	if lastMsg == nil {
		return nil, errors.New("last message cannot be nil")
	}
	now := time.Now().UTC()
	if now.After(lastMsg.ExpiresAt) {
		return nil, ErrQuoteExpired
	}

	msgType := MsgAccept
	eventType := domain.EventNetworkNegotiationCompleted
	if !accepted {
		msgType = MsgReject
	}

	finalMsg := &NegotiationMessage{
		ID:              fmt.Sprintf("neg_msg_%d", now.UnixNano()),
		ContractID:      lastMsg.ContractID,
		Round:           lastMsg.Round,
		MessageType:     msgType,
		SenderAgentID:   acceptorID,
		ReceiverAgentID: lastMsg.SenderAgentID,
		ProposedPrice:   lastMsg.ProposedPrice,
		ExpiresAt:       lastMsg.ExpiresAt,
		CreatedAt:       now,
	}

	_ = e.repo.SaveDomainEvent(ctx, &domain.DomainEvent{
		ID:         domain.GenerateEventID(),
		Type:       eventType,
		Version:    1,
		OccurredAt: now,
		ActorType:  "AGENT",
		ActorID:    acceptorID,
		AgentID:    acceptorID,
		Data: map[string]interface{}{
			"contract_id":    lastMsg.ContractID,
			"accepted":       accepted,
			"finalized_price": lastMsg.ProposedPrice,
		},
	})

	return finalMsg, nil
}
