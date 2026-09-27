package security

import (
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/ai/types"
)

func TestValidateToolRegistry_AllowedToolsPass(t *testing.T) {
	tools := []types.AITool{
		{
			Type: "function",
			Function: types.AIFunctionDef{
				Name:        "list_available_services",
				Description: "Query service registry for active merchants and metadata",
			},
		},
		{
			Type: "function",
			Function: types.AIFunctionDef{
				Name:        "get_service_capabilities",
				Description: "Inspect specific merchant SLA and capability descriptors",
			},
		},
		{
			Type: "function",
			Function: types.AIFunctionDef{
				Name:        "check_treasury_availability",
				Description: "Check available balance without reserving or allocating",
			},
		},
		{
			Type: "function",
			Function: types.AIFunctionDef{
				Name:        "explain_policy_rules",
				Description: "Query static spending limits and allowlisted categories",
			},
		},
	}

	if err := ValidateToolRegistry(tools); err != nil {
		t.Fatalf("expected allowed tools to pass validation, got err: %v", err)
	}
}

func TestValidateToolRegistry_ProhibitedToolsFail(t *testing.T) {
	prohibitedNames := []string{
		"execute_vault",
		"sign_transaction",
		"transfer_funds",
		"withdraw_funds",
		"mutate_policy",
		"override_limits",
		"emergency_pause",
	}

	for _, name := range prohibitedNames {
		tools := []types.AITool{
			{
				Type: "function",
				Function: types.AIFunctionDef{
					Name:        name,
					Description: "Perform unauthorized financial mutation",
				},
			},
		}

		err := ValidateToolRegistry(tools)
		if err == nil {
			t.Fatalf("expected tool %q to be blocked by security validator, but it passed", name)
		}
	}
}

func TestValidateToolRegistry_ProhibitedParametersFail(t *testing.T) {
	prohibitedParams := []string{
		"private_key",
		"secret_key",
		"raw_tx",
		"sign_tx",
	}

	for _, param := range prohibitedParams {
		tool := types.AITool{
			Type: "function",
			Function: types.AIFunctionDef{
				Name:        "get_external_data",
				Description: "Read external data with unauthorized param",
				Parameters: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						param: map[string]string{"type": "string"},
					},
				},
			},
		}

		err := types.ValidateToolSafety(tool)
		if err == nil {
			t.Fatalf("expected tool with parameter %q to fail safety check, but it passed", param)
		}
	}
}

func TestEnforceProposalBoundary_ValidProposalPasses(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_valid_01",
		AgentID:          "agent_planner_01",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Valid multi-stage decomposition within budget cap",
		StructuredParameters: map[string]interface{}{
			"estimated_cost": 150000,
			"target_service": "web-research",
		},
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	prop.ProposalHash, _ = prop.ComputeHash()

	if err := EnforceProposalBoundary(prop); err != nil {
		t.Fatalf("expected valid proposal to pass boundary, got: %v", err)
	}
}

func TestEnforceProposalBoundary_ExpiredProposalFails(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_expired_01",
		AgentID:          "agent_selector_01",
		ProposalType:     types.ProposalTypeServiceSelection,
		RequestedAction:  "SELECT_SERVICE",
		ReasoningSummary: "Service selection proposal",
		StructuredParameters: map[string]interface{}{
			"service_id": "compute-cluster",
		},
		CreatedAt: time.Now().Add(-20 * time.Minute),
		ExpiresAt: time.Now().Add(-10 * time.Minute),
	}
	prop.ProposalHash, _ = prop.ComputeHash()

	err := EnforceProposalBoundary(prop)
	if err == nil {
		t.Fatalf("expected expired proposal to be rejected, but it passed")
	}
	if !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expected expiration error, got: %v", err)
	}
}

func TestEnforceProposalBoundary_ProhibitedActionFails(t *testing.T) {
	prohibitedActions := []string{
		"SIGN_TRANSACTION",
		"TRANSFER_FUNDS",
		"EXECUTE_VAULT",
		"MUTATE_POLICY",
	}

	for _, act := range prohibitedActions {
		prop := &types.AIProposal{
			ProposalID:       "prop_prohibited_" + act,
			AgentID:          "agent_malicious_01",
			ProposalType:     types.ProposalTypePlan,
			RequestedAction:  act,
			ReasoningSummary: "Attempting privileged action",
			StructuredParameters: map[string]interface{}{
				"amount": 1000,
			},
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(10 * time.Minute),
		}
		prop.ProposalHash, _ = prop.ComputeHash()

		err := EnforceProposalBoundary(prop)
		if err == nil {
			t.Fatalf("expected action %q to be blocked by proposal boundary, but it passed", act)
		}
	}
}

func TestEnforceProposalBoundary_ForbiddenParameterFails(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_leak_01",
		AgentID:          "agent_leaker_01",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Suspicious proposal with secret param",
		StructuredParameters: map[string]interface{}{
			"private_key": "0x1234567890abcdef",
		},
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	prop.ProposalHash, _ = prop.ComputeHash()

	err := EnforceProposalBoundary(prop)
	if err == nil {
		t.Fatalf("expected proposal with private_key parameter to be blocked, but it passed")
	}
}

func TestEnforceProposalBoundary_IntegrityTamperFails(t *testing.T) {
	prop := &types.AIProposal{
		ProposalID:       "prop_tamper_01",
		AgentID:          "agent_tamperer_01",
		ProposalType:     types.ProposalTypePlan,
		RequestedAction:  "RECOMMEND_PLAN",
		ReasoningSummary: "Original reasoning",
		StructuredParameters: map[string]interface{}{
			"max_budget": 50000,
		},
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	// Compute valid hash
	prop.ProposalHash, _ = prop.ComputeHash()

	// Tamper with parameters after hash computation
	prop.StructuredParameters["max_budget"] = 9999999

	err := EnforceProposalBoundary(prop)
	if err == nil {
		t.Fatalf("expected tampered proposal to fail integrity check, but it passed")
	}
}
