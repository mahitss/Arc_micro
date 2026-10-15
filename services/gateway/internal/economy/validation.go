package economy

import (
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"strings"
)

var (
	ErrEmptyObjective          = errors.New("mission objective cannot be empty")
	ErrObjectiveTooLong        = errors.New("mission objective exceeds 2048 character limit")
	ErrUntrustedPromptInject   = errors.New("mission objective contains adversarial prompt injection indicators")
	ErrInvalidBudget           = errors.New("budget must be a positive integer base unit string")
	ErrUnsupportedCurrency     = errors.New("unsupported currency: only USDC is permitted")
	ErrInvalidAgentID          = errors.New("invalid agent ID format: alphanumeric with dashes/underscores required")
	ErrInvalidMaxExecution     = errors.New("max_execution_amount must be a positive integer base unit string not exceeding budget")
	ErrInvalidDeadlineMinutes  = errors.New("deadline_minutes must be between 1 and 10080 (7 days)")
	ErrInvalidCapabilityFormat = errors.New("capability format invalid: must be lowercase alphanumeric with underscores")
)

var validIdentifierRegex = regexp.MustCompile(`^[a-zA-Z0-9_\-]+$`)
var validCapabilityRegex = regexp.MustCompile(`^[a-z0-9_\-]+$`)

// ValidateMissionParams performs strict untrusted input validation on incoming mission creation requests.
func ValidateMissionParams(p CreateMissionParams) error {
	// 1. Objective Validation
	trimmedObj := strings.TrimSpace(p.Objective)
	if trimmedObj == "" {
		return ErrEmptyObjective
	}
	if len(trimmedObj) > 2048 {
		return ErrObjectiveTooLong
	}

	// Treat mission description as untrusted data: sanitize and detect prompt injection attempts
	sanitized, err := SanitizeExternalOutput(trimmedObj)
	if err != nil {
		return fmt.Errorf("objective payload invalid: %w", err)
	}
	if sanitized.ContainsInjection {
		return ErrUntrustedPromptInject
	}

	// 2. Budget Validation
	if strings.TrimSpace(p.Budget) == "" {
		return ErrInvalidBudget
	}
	budgetInt, ok := new(big.Int).SetString(strings.TrimSpace(p.Budget), 10)
	if !ok || budgetInt.Sign() <= 0 {
		return ErrInvalidBudget
	}

	// 3. Currency Validation
	if p.Currency != "" && !strings.EqualFold(p.Currency, "USDC") {
		return ErrUnsupportedCurrency
	}

	// 4. Agent ID Validation
	if strings.TrimSpace(p.AgentID) == "" || !validIdentifierRegex.MatchString(p.AgentID) {
		return ErrInvalidAgentID
	}

	// 5. Max Execution Amount Validation
	if p.MaxExecutionAmount != "" {
		maxExecInt, ok := new(big.Int).SetString(strings.TrimSpace(p.MaxExecutionAmount), 10)
		if !ok || maxExecInt.Sign() <= 0 || maxExecInt.Cmp(budgetInt) > 0 {
			return ErrInvalidMaxExecution
		}
	}

	// 6. Deadline Validation
	if p.DeadlineMinutes < 0 || p.DeadlineMinutes > 10080 {
		return ErrInvalidDeadlineMinutes
	}

	// 7. Required Capabilities Validation
	for _, cap := range p.RequiredCapabilities {
		trimmedCap := strings.TrimSpace(cap)
		if trimmedCap == "" || !validCapabilityRegex.MatchString(trimmedCap) {
			return fmt.Errorf("%w: '%s'", ErrInvalidCapabilityFormat, cap)
		}
	}

	return nil
}
