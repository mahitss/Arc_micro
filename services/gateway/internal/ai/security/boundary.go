package security

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

var (
	ErrProhibitedAction     = errors.New("security violation: AI attempted prohibited financial mutation or key access")
	ErrInvalidProposalState = errors.New("security violation: proposal in invalid state for evaluation")
	ErrProposalExpired      = errors.New("security violation: proposal has expired and cannot be processed")
	ErrProposalReplay       = errors.New("security violation: duplicate proposal replay detected")
)

// AllowedReadTools lists all canonically permitted read-only intelligence tools.
var AllowedReadTools = map[string]string{
	"list_available_services":     "Query service registry for active merchants and metadata",
	"get_service_capabilities":    "Inspect specific merchant SLA and capability descriptors",
	"get_service_quote":           "Request price quote for a bounded service query",
	"get_mission_state":           "Read current stage progress and execution status",
	"get_swarm_state":             "Inspect active sub-agents and role assignments",
	"get_merchant_reputation":     "Retrieve historical verification scores and reliability ratings",
	"explain_policy_rules":        "Query static spending limits and allowlisted categories",
	"check_treasury_availability": "Check available balance without reserving or allocating",
	"get_simulation_metrics":      "Read digital-twin stress simulation results",
	"get_economic_indicators":     "Inspect aggregate network volume, gas trends, and clearing velocity",
	"get_arc_network_status":      "Read current Arc block number and RPC health",
	"get_historical_outcomes":     "Examine past mission execution logs and audit entries",
}

// ProhibitedOperationKeywords contains strict filter tokens that can NEVER appear in AI tools.
var ProhibitedOperationKeywords = []string{
	"sign_transaction",
	"send_payment",
	"execute_vault",
	"transfer_funds",
	"mutate_policy",
	"override_limits",
	"emergency_pause",
	"emergency_unpause",
	"withdraw_funds",
	"get_private_key",
	"export_key",
	"craft_calldata",
}

// ValidateToolRegistry verifies that every tool offered to the AI conforms to the read-only contract.
func ValidateToolRegistry(tools []types.AITool) error {
	for _, tool := range tools {
		name := strings.ToLower(strings.TrimSpace(tool.Function.Name))
		desc := strings.ToLower(tool.Function.Description)

		for _, keyword := range ProhibitedOperationKeywords {
			if strings.Contains(name, keyword) || strings.Contains(desc, keyword) {
				return fmt.Errorf("%w: tool '%s' contains forbidden keyword '%s'", ErrProhibitedAction, tool.Function.Name, keyword)
			}
		}

		// Tool must be explicitly allowlisted or conform strictly to read-only patterns
		if _, isAllowed := AllowedReadTools[name]; !isAllowed {
			if !strings.HasPrefix(name, "get_") && !strings.HasPrefix(name, "list_") && !strings.HasPrefix(name, "check_") && !strings.HasPrefix(name, "explain_") {
				return fmt.Errorf("%w: tool '%s' is not recognized as a safe read-only intelligence tool", ErrProhibitedAction, tool.Function.Name)
			}
		}

		if err := types.ValidateToolSafety(tool); err != nil {
			return err
		}
	}
	return nil
}

// EnforceProposalBoundary ensures an AI proposal cannot bypass deterministic controls.
// CRITICAL FINANCIAL GATE:
// 1. Proposal must not be expired.
// 2. Proposal must not contain raw private keys or transaction hexes.
// 3. Requested amounts must be positive integers (never floating point).
// 4. Must specify valid ProposalType.
func EnforceProposalBoundary(proposal *types.AIProposal) error {
	if err := proposal.ValidateIntegrity(); err != nil {
		return err
	}

	if proposal.IsExpired(time.Now()) {
		return ErrProposalExpired
	}

	if proposal.ProposalHash != "" {
		expectedHash, err := proposal.ComputeHash()
		if err != nil {
			return fmt.Errorf("%w: failed to verify proposal integrity: %v", ErrInvalidProposalState, err)
		}
		if proposal.ProposalHash != expectedHash {
			return fmt.Errorf("%w: proposal hash mismatch (expected %s, got %s)", ErrInvalidProposalState, expectedHash, proposal.ProposalHash)
		}
	}

	// Check for forbidden mutations in requested action or parameters
	actionLower := strings.ToLower(proposal.RequestedAction)
	for _, kw := range ProhibitedOperationKeywords {
		if strings.Contains(actionLower, kw) {
			return fmt.Errorf("%w: proposal requested action contains forbidden operation '%s'", ErrProhibitedAction, kw)
		}
	}

	// Parameter sanitization: ensure no cryptographic keys or arbitrary calldata
	for key, val := range proposal.StructuredParameters {
		keyLower := strings.ToLower(key)
		if strings.Contains(keyLower, "private_key") || strings.Contains(keyLower, "secret") || strings.Contains(keyLower, "calldata") {
			return fmt.Errorf("%w: forbidden parameter '%s' present in AI proposal", ErrProhibitedAction, key)
		}
		if sVal, ok := val.(string); ok {
			if strings.HasPrefix(sVal, "0x") && len(sVal) > 66 {
				// Raw calldata injection defense
				return fmt.Errorf("%w: suspicious calldata hex string detected in parameter '%s'", ErrProhibitedAction, key)
			}
		}
	}

	return nil
}
