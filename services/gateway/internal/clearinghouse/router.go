package clearinghouse

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrZeroAmountPayment         = errors.New("cannot route payment with zero amount")
	ErrObligationNotExecutable   = errors.New("obligation state does not permit routing to settlement")
	ErrBatchObligationInvalid   = errors.New("one or more obligations in settlement batch failed pre-flight verification")
)

// IntentCreator defines the interface for creating and initiating canonical payment intents.
type IntentCreator interface {
	CreateIntent(ctx context.Context, params intent.CreateIntentParams) (*intent.PaymentIntent, error)
	AuthorizeIntent(ctx context.Context, intentID string) (*intent.PaymentIntent, *domain.AuthorizationDecision, error)
	ConfirmIntent(ctx context.Context, intentID string) (*intent.PaymentIntent, *blockchain.PaymentExecutionResult, error)
}

// SettlementRouter orchestrates financial settlement by invoking the CANONICAL AgentPay control plane.
// CRITICAL ARCHITECTURAL INVARIANT:
// The clearinghouse never calls AgentVault or broadcasts raw transactions directly.
// Path: Clearinghouse -> PaymentIntent -> Policy -> Risk -> Approval -> Treasury -> Execution Gate -> AgentVault -> Arc.
type SettlementRouter struct {
	intentService IntentCreator
	registry      *registry.Registry
	targetVault   string
}

func NewSettlementRouter(svc IntentCreator, reg *registry.Registry, targetVault string) *SettlementRouter {
	return &SettlementRouter{
		intentService: svc,
		registry:      reg,
		targetVault:   targetVault,
	}
}

// RouteMilestoneSettlement routes a verified milestone to the canonical payment intent pipeline.
// Enforces INV-57: Milestone must be in VERIFIED status before payment can be initiated.
func (sr *SettlementRouter) RouteMilestoneSettlement(
	ctx context.Context,
	obligation *EconomicObligation,
	milestone *PaymentMilestone,
	idempotencyKey string,
) (*intent.PaymentIntent, error) {
	if milestone.Status != MilestoneVerified {
		return nil, fmt.Errorf("%w: milestone %s is in state %s; must be VERIFIED",
			ErrObligationNotExecutable, milestone.MilestoneID, milestone.Status)
	}

	amtInt, ok := new(big.Int).SetString(strings.TrimSpace(milestone.Amount), 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, ErrZeroAmountPayment
	}

	// 1. Resolve destination service/recipient
	serviceID := obligation.Capability
	if serviceID == "" {
		serviceID = "web-research" // Fallback canonical service
	}

	// 2. Construct canonical PaymentIntent parameters
	params := intent.CreateIntentParams{
		OrganizationID: obligation.OrganizationID,
		AgentID:        obligation.PayerAgentID,
		VaultAddress:   sr.targetVault,
		ServiceID:      serviceID,
		Amount:         milestone.Amount,
		Asset:          "USDC",
		Purpose:        fmt.Sprintf("Milestone settlement: %s (%s)", milestone.MilestoneID, milestone.Description),
		Justification:  fmt.Sprintf("Contract %s Milestone #%d verified", milestone.ContractID, milestone.Sequence),
		RequestID:      idempotencyKey,
	}

	// 3. Create Intent
	pi, err := sr.intentService.CreateIntent(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment intent for milestone: %w", err)
	}

	// 4. Trigger Policy Authorization (Rust policy engine + deterministic risk)
	authorizedPI, authRes, err := sr.intentService.AuthorizeIntent(ctx, pi.IntentID)
	if err != nil {
		return pi, fmt.Errorf("policy evaluation failed for milestone: %w", err)
	}

	// If requires human approval, leave in approval state
	if authRes != nil && authRes.Decision == domain.DecisionApprovalRequired {
		return authorizedPI, nil
	}

	// 5. If authorized and auto-executable, confirm through Execution Gate -> Signer -> Arc
	if authorizedPI.Status == intent.StatusAuthorized {
		confirmedPI, _, err := sr.intentService.ConfirmIntent(ctx, authorizedPI.IntentID)
		if err != nil {
			return authorizedPI, fmt.Errorf("execution confirmation failed for milestone: %w", err)
		}
		return confirmedPI, nil
	}

	return authorizedPI, nil
}

// RouteNettedSettlement routes the net residual balance between two peer agents.
// Enforces INV-60 (cannot increase financial authority) and INV-61 (preserves obligation references).
func (sr *SettlementRouter) RouteNettedSettlement(
	ctx context.Context,
	proposal *NettingProposal,
	idempotencyKey string,
) (*intent.PaymentIntent, error) {
	if proposal.Status != NettingApproved {
		return nil, fmt.Errorf("%w: netting proposal %s must be APPROVED by both counterparties",
			ErrObligationNotExecutable, proposal.ProposalID)
	}

	netAmtInt, ok := new(big.Int).SetString(strings.TrimSpace(proposal.NetAmount), 10)
	if !ok || netAmtInt.Sign() <= 0 {
		return nil, fmt.Errorf("net amount is zero or invalid: no payment transfer required")
	}

	params := intent.CreateIntentParams{
		OrganizationID: proposal.OrganizationID,
		AgentID:        proposal.NetPayer,
		VaultAddress:   sr.targetVault,
		ServiceID:      "web-research",
		Amount:         proposal.NetAmount,
		Asset:          "USDC",
		Purpose:        fmt.Sprintf("Bilateral netting residual: %s -> %s", proposal.NetPayer, proposal.NetPayee),
		Justification:  fmt.Sprintf("Netting proposal %s covering %d obligations", proposal.ProposalID, len(proposal.ObligationsAtoB)+len(proposal.ObligationsBtoA)),
		RequestID:      idempotencyKey,
	}

	pi, err := sr.intentService.CreateIntent(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment intent for netting: %w", err)
	}

	authorizedPI, authRes, err := sr.intentService.AuthorizeIntent(ctx, pi.IntentID)
	if err != nil {
		return pi, fmt.Errorf("policy evaluation failed for netting: %w", err)
	}

	if authRes != nil && authRes.Decision == domain.DecisionApprovalRequired {
		return authorizedPI, nil
	}

	if authorizedPI.Status == intent.StatusAuthorized {
		confirmedPI, _, err := sr.intentService.ConfirmIntent(ctx, authorizedPI.IntentID)
		if err != nil {
			return authorizedPI, fmt.Errorf("execution confirmation failed for netting: %w", err)
		}
		return confirmedPI, nil
	}

	return authorizedPI, nil
}

// RouteBatchSettlement iterates through a verified batch and executes each item through the canonical pipeline.
// Enforces INV-62: Batches cannot bypass individual policy checks.
func (sr *SettlementRouter) RouteBatchSettlement(
	ctx context.Context,
	batch *SettlementBatch,
	obligations []*EconomicObligation,
) ([]*intent.PaymentIntent, error) {
	results := make([]*intent.PaymentIntent, 0, len(obligations))

	for i, ob := range obligations {
		if ob.Status != ObligationVerified && ob.Status != ObligationAuthorized && ob.Status != ObligationDue {
			return results, fmt.Errorf("%w: obligation %s is in state %s", ErrBatchObligationInvalid, ob.ObligationID, ob.Status)
		}

		itemKey := fmt.Sprintf("%s_item_%d_%s", batch.BatchID, i, ob.ObligationID)
		params := intent.CreateIntentParams{
			OrganizationID: ob.OrganizationID,
			AgentID:        ob.PayerAgentID,
			VaultAddress:   sr.targetVault,
			ServiceID:      ob.Capability,
			Amount:         ob.Amount,
			Asset:          "USDC",
			Purpose:        fmt.Sprintf("Batch %s obligation %s", batch.BatchID, ob.ObligationID),
			Justification:  fmt.Sprintf("Settlement Batch %s", batch.BatchID),
			RequestID:      itemKey,
		}

		pi, err := sr.intentService.CreateIntent(ctx, params)
		if err != nil {
			return results, fmt.Errorf("failed creating intent for batch item %s: %w", ob.ObligationID, err)
		}

		authorizedPI, _, err := sr.intentService.AuthorizeIntent(ctx, pi.IntentID)
		if err != nil {
			return results, fmt.Errorf("policy check failed for batch item %s (INV-62 enforced): %w", ob.ObligationID, err)
		}

		if authorizedPI.Status == intent.StatusAuthorized {
			confirmedPI, _, err := sr.intentService.ConfirmIntent(ctx, authorizedPI.IntentID)
			if err != nil {
				return results, fmt.Errorf("confirmation failed for batch item %s: %w", ob.ObligationID, err)
			}
			results = append(results, confirmedPI)
		} else {
			results = append(results, authorizedPI)
		}
	}

	return results, nil
}
