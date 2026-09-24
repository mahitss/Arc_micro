package control

import (
	"strings"
	"time"
)

// CheckNonAuthoritative (INV-86): Verifies that read models cannot claim financial authority.
func CheckNonAuthoritative(isReadModel bool, attemptedFinancialMutation bool) error {
	if isReadModel && attemptedFinancialMutation {
		return ErrInv86
	}
	return nil
}

// CheckZeroUIFinancialAuthority (INV-87): Ensures the frontend cannot issue direct settlement orders.
func CheckZeroUIFinancialAuthority(callerType string) error {
	if strings.ToLower(callerType) == "frontend_direct_transfer" {
		return ErrInv87
	}
	return nil
}

// CheckZeroRecipientOverride (INV-88): Prohibits arbitrary recipient overriding.
func CheckZeroRecipientOverride(recipient string, isAllowlisted bool) error {
	if recipient == "" || !isAllowlisted {
		return ErrInv88
	}
	return nil
}

// CheckInviolablePolicy (INV-89): Prohibits UI requests from bypassing the policy engine.
func CheckInviolablePolicy(policyEvaluated bool, decision string) error {
	if !policyEvaluated || decision == "" {
		return ErrInv89
	}
	return nil
}

// CheckApprovalInviolability (INV-90): Ensures approval-requiring intents cannot execute without approval.
func CheckApprovalInviolability(requiresApproval bool, isApproved bool) error {
	if requiresApproval && !isApproved {
		return ErrInv90
	}
	return nil
}

// CheckStrictTreasuryReservation (INV-91): Ensures payment execution requires active reservation.
func CheckStrictTreasuryReservation(reservationID string, reservationStatus string) error {
	if reservationID == "" || strings.ToUpper(reservationStatus) != "ACTIVE" {
		return ErrInv91
	}
	return nil
}

// CheckStrictSimulationSeparation (INV-92): Prohibits simulation items from holding real Arc hashes.
func CheckStrictSimulationSeparation(mode string, txHash string) error {
	if strings.ToUpper(mode) == "SIMULATION" && txHash != "" && !strings.HasPrefix(txHash, "sim_") {
		return ErrInv92
	}
	return nil
}

// CheckStaleDataWarning (INV-93): Flags data older than 30 seconds.
func CheckStaleDataWarning(timestamp time.Time, threshold time.Duration) string {
	if timestamp.IsZero() {
		return "UNAVAILABLE"
	}
	age := time.Since(timestamp)
	if age > threshold {
		return "STALE"
	}
	if age > 10*time.Second {
		return "RECENT"
	}
	return "LIVE"
}

// CheckTenantIsolation (INV-94): Enforces strict organization isolation.
func CheckTenantIsolation(contextOrgID string, targetOrgID string) error {
	if contextOrgID == "" || targetOrgID == "" || contextOrgID != targetOrgID {
		return ErrInv94
	}
	return nil
}

// CheckCommandAuthorization (INV-95): Ensures operator command possesses authorized role.
func CheckCommandAuthorization(role string, requiredRoles ...string) error {
	if role == "" {
		return ErrInv95
	}
	roleUpper := strings.ToUpper(role)
	for _, req := range requiredRoles {
		if roleUpper == strings.ToUpper(req) || roleUpper == "ORG_ADMIN" {
			return nil
		}
	}
	return ErrInv95
}

// CheckCommandIdempotency (INV-96): Enforces non-empty idempotency key for mutations.
func CheckCommandIdempotency(idempotencyKey string) error {
	if strings.TrimSpace(idempotencyKey) == "" {
		return ErrInv96
	}
	return nil
}

// CheckHardDenyInviolability (INV-97): Guarantees that a hard DENY cannot be approved.
func CheckHardDenyInviolability(decision string, attemptedApproval bool) error {
	if strings.ToUpper(decision) == "DENY" && attemptedApproval {
		return ErrInv97
	}
	return nil
}

// CheckCryptographicSettlementTruth (INV-98): Ensures displayed tx hash corresponds to verified format.
func CheckCryptographicSettlementTruth(mode string, txHash string, verifiedOnChain bool) error {
	if strings.ToUpper(mode) == "REAL" && txHash != "" {
		if !strings.HasPrefix(txHash, "0x") || len(txHash) != 66 || !verifiedOnChain {
			return ErrInv98
		}
	}
	return nil
}

// CheckPureReadModel (INV-99): Prevents read model endpoints from performing writes.
func CheckPureReadModel(isWriteOperation bool) error {
	if isWriteOperation {
		return ErrInv99
	}
	return nil
}

// CheckZeroAuthorityAggregation (INV-100): Confirms views do not synthesize execution authority.
func CheckZeroAuthorityAggregation(viewName string, hasSignerPrivilege bool) error {
	if viewName != "" && hasSignerPrivilege {
		return ErrInv100
	}
	return nil
}
