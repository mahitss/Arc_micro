package treasury

import (
	"context"
	"fmt"
)

// Router evaluates and selects the optimal treasury with sufficient capacity.
type Router interface {
	RouteLiquidity(ctx context.Context, orgID string, currency string, amountBase string, mode ExecutionMode) (*TreasuryState, error)
}

// DefaultTreasuryRouter implements Router.
type DefaultTreasuryRouter struct {
	orchestrator Orchestrator
}

// NewTreasuryRouter creates a new DefaultTreasuryRouter.
func NewTreasuryRouter(orch Orchestrator) *DefaultTreasuryRouter {
	return &DefaultTreasuryRouter{
		orchestrator: orch,
	}
}

// RouteLiquidity selects an eligible treasury possessing safe unencumbered capacity.
func (r *DefaultTreasuryRouter) RouteLiquidity(ctx context.Context, orgID string, currency string, amountBase string, mode ExecutionMode) (*TreasuryState, error) {
	if currency != "USDC" && currency != "" {
		return nil, fmt.Errorf("unsupported currency: %s (Arc treasury natively settles in USDC)", currency)
	}

	state, err := r.orchestrator.GetTreasuryState(ctx, orgID, mode)
	if err != nil {
		return nil, err
	}

	reqAmt, err := ParseBigInt(amountBase)
	if err != nil || reqAmt.Sign() <= 0 {
		return nil, ErrInvalidAmount
	}

	envelope, err := r.orchestrator.GetLiquidityEnvelope(ctx, orgID, ScopeOrganization, orgID, mode)
	if err != nil {
		return nil, err
	}

	safeCap, _ := ParseBigInt(envelope.SafeCommitmentCapacity)
	if reqAmt.Cmp(safeCap) > 0 {
		return nil, fmt.Errorf("%w: requested %s exceeds safe capacity %s", ErrReservationExceedsAvailable, amountBase, safeCap.String())
	}

	return state, nil
}
