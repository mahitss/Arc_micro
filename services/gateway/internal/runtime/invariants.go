package runtime

import (
	"errors"
	"fmt"
	"time"
)

var (
	ErrInv101 = errors.New("INV-101: stale worker cannot commit after lease fencing token mismatch")
	ErrInv102 = errors.New("INV-102: workflow recovery cannot create financial authority")
	ErrInv103 = errors.New("INV-103: retry cannot bypass deterministic policy HARD_DENY")
	ErrInv104 = errors.New("INV-104: retry cannot bypass required human approval")
	ErrInv105 = errors.New("INV-105: retry cannot bypass treasury liquidity reservation")
	ErrInv106 = errors.New("INV-106: ambiguous blockchain execution cannot be blindly rebroadcast")
	ErrInv107 = errors.New("INV-107: simulation workflows can never broadcast live blockchain transactions")
	ErrInv108 = errors.New("INV-108: runtime cannot directly invoke AgentVault smart contract")
	ErrInv109 = errors.New("INV-109: runtime cannot modify deterministic policy rules")
	ErrInv110 = errors.New("INV-110: runtime cannot modify constitutional authority")
	ErrInv111 = errors.New("INV-111: workflow state transitions require optimistic version correctness")
	ErrInv112 = errors.New("INV-112: duplicate external callbacks must be idempotent")
	ErrInv113 = errors.New("INV-113: duplicate financial commands cannot create duplicate payment intents")
	ErrInv114 = errors.New("INV-114: expired approvals cannot authorize execution")
	ErrInv115 = errors.New("INV-115: expired leases cannot authorize commits")
	ErrInv116 = errors.New("INV-116: cross-tenant workflow access is strictly prohibited")
	ErrInv117 = errors.New("INV-117: operator commands require valid role-based authorization")
	ErrInv118 = errors.New("INV-118: dangerous operator commands require idempotency keys")
	ErrInv119 = errors.New("INV-119: financial state must be derived from durable facts")
	ErrInv120 = errors.New("INV-120: in-memory runtime state is never financial truth")
)

// CheckLeaseFencing enforces INV-101: worker token must match active lease token.
func CheckLeaseFencing(workerToken, activeLeaseToken int64) error {
	if workerToken != activeLeaseToken {
		return fmt.Errorf("%w: worker token %d != active token %d", ErrInv101, workerToken, activeLeaseToken)
	}
	return nil
}

// CheckZeroRecoveryAuthority enforces INV-102: recovery never elevates spending permissions.
func CheckZeroRecoveryAuthority(isRecovering bool, elevatedPrivilegesRequested bool) error {
	if isRecovering && elevatedPrivilegesRequested {
		return ErrInv102
	}
	return nil
}

// CheckPolicyDenyRetry enforces INV-103: hard DENY cannot be converted to a retry.
func CheckPolicyDenyRetry(decision string, isRetryAttempt bool) error {
	if decision == "DENY" && isRetryAttempt {
		return ErrInv103
	}
	return nil
}

// CheckApprovalRequirement enforces INV-104 & INV-114: approvals cannot be bypassed or expired.
func CheckApprovalRequirement(requiresApproval bool, approved bool, approvalExpiry *time.Time) error {
	if requiresApproval && !approved {
		return ErrInv104
	}
	if approved && approvalExpiry != nil && time.Now().UTC().After(*approvalExpiry) {
		return ErrInv114
	}
	return nil
}

// CheckTreasuryReservation enforces INV-105: execution requires an active, unexpired reservation.
func CheckTreasuryReservation(reservationID string, reservationExpired bool) error {
	if reservationID == "" || reservationExpired {
		return ErrInv105
	}
	return nil
}

// CheckAmbiguousExecution enforces INV-106: ambiguous blockchain status must route to reconciliation, never rebroadcast.
func CheckAmbiguousExecution(executionStatus string, rebroadcastRequested bool) error {
	if executionStatus == "AMBIGUOUS" && rebroadcastRequested {
		return ErrInv106
	}
	return nil
}

// CheckSimulationLiveBoundary enforces INV-107: simulation mode cannot broadcast on-chain.
func CheckSimulationLiveBoundary(isSimulation bool, broadcastRequested bool) error {
	if isSimulation && broadcastRequested {
		return ErrInv107
	}
	return nil
}

// CheckNoDirectVaultAccess enforces INV-108: runtime orchestrator cannot hold private keys or call vault directly.
func CheckNoDirectVaultAccess(callerComponent string) error {
	if callerComponent == "DURABLE_RUNTIME" || callerComponent == "WORKFLOW_COORDINATOR" {
		return ErrInv108
	}
	return nil
}

// CheckOptimisticVersion enforces INV-111: state mutation requires expected version match.
func CheckOptimisticVersion(currentVersion, expectedVersion int) error {
	if currentVersion != expectedVersion {
		return fmt.Errorf("%w: current %d != expected %d", ErrInv111, currentVersion, expectedVersion)
	}
	return nil
}

// CheckLeaseValidity enforces INV-115: expired leases cannot commit work.
func CheckLeaseValidity(expiresAt time.Time) error {
	if time.Now().UTC().After(expiresAt) {
		return ErrInv115
	}
	return nil
}

// CheckTenantIsolation enforces INV-116: requests must match authenticated tenant.
func CheckTenantIsolation(requestTenant, resourceTenant string) error {
	if requestTenant == "" || resourceTenant == "" || requestTenant != resourceTenant {
		return fmt.Errorf("%w: request tenant '%s' does not match resource tenant '%s'", ErrInv116, requestTenant, resourceTenant)
	}
	return nil
}

// CheckOperatorAuthorization enforces INV-117: role must be permitted for action.
func CheckOperatorAuthorization(role string, action string) error {
	switch action {
	case "VIEW":
		return nil // All roles permitted
	case "PAUSE", "RESUME", "RETRY":
		if role == "OPERATOR" || role == "ADMIN" || role == "SECURITY_OPERATOR" {
			return nil
		}
		return fmt.Errorf("%w: role '%s' unauthorized for %s", ErrInv117, role, action)
	case "CANCEL", "RECONCILE":
		if role == "ADMIN" || role == "SECURITY_OPERATOR" || role == "OPERATOR" {
			return nil
		}
		return fmt.Errorf("%w: role '%s' unauthorized for %s", ErrInv117, role, action)
	default:
		return fmt.Errorf("%w: unknown action %s", ErrInv117, action)
	}
}

// CheckCommandIdempotency enforces INV-118: dangerous commands require non-empty idempotency key.
func CheckCommandIdempotency(idempotencyKey string) error {
	if idempotencyKey == "" {
		return ErrInv118
	}
	return nil
}
