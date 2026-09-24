package fabric

import (
	"fmt"
)

// EconomicAuthorityBoundary classifies and guards autonomous operations
type EconomicAuthorityBoundary struct{}

// NewEconomicAuthorityBoundary creates a new guardrail instance
func NewEconomicAuthorityBoundary() *EconomicAuthorityBoundary {
	return &EconomicAuthorityBoundary{}
}

// ClassifyAction maps an operational request to its strict authority level
func (g *EconomicAuthorityBoundary) ClassifyAction(actionType string) ActionAuthorityLevel {
	switch actionType {
	case "DISCOVER_AGENTS", "EVALUATE_CAPABILITIES", "OBSERVE_METRICS", "REPLAY_WORKFLOW":
		return AuthorityNonFinancial

	case "GET_TREASURY_BALANCE", "CHECK_LIQUIDITY", "READ_POLICY", "QUERY_SNAPSHOT":
		return AuthorityFinancialRead

	case "PROPOSE_OBLIGATION", "REQUEST_QUOTE", "CREATE_PAYMENT_PROPOSAL", "PROPOSE_NETTING":
		return AuthorityFinancialProposal

	case "LOCK_TREASURY_RESERVATION", "POLICY_ALLOW", "HUMAN_APPROVAL_GRANTED":
		return AuthorityFinancialAuthorized

	case "SIGN_BLOCKCHAIN_TX", "RELEASE_ESCROW", "CONFIRM_PAYMENT", "SETTLE_NETTING_BATCH":
		return AuthorityFinancialExecution

	default:
		return AuthorityNonFinancial
	}
}

// ValidateTransition ensures that an autonomous component cannot bypass authorization
func (g *EconomicAuthorityBoundary) ValidateTransition(from ActionAuthorityLevel, to ActionAuthorityLevel, domainAuthorized bool) error {
	// Elevating from PROPOSAL to EXECUTION requires affirmative domain authorization
	if (from == AuthorityFinancialProposal || from == AuthorityNonFinancial) && to == AuthorityFinancialExecution {
		if !domainAuthorized {
			return fmt.Errorf("economic authority boundary violation: cannot transition %s to %s without authoritative domain authorization", from, to)
		}
	}
	return nil
}
