package economy

import (
	"fmt"
)

// ErrInvalidMissionTransition is returned when an illegal state change is requested.
type ErrInvalidMissionTransition struct {
	From MissionStatus
	To   MissionStatus
}

func (e ErrInvalidMissionTransition) Error() string {
	return fmt.Sprintf("invalid mission state transition from %s to %s", e.From, e.To)
}

// validMissionTransitions specifies all permissible state transitions.
var validMissionTransitions = map[MissionStatus][]MissionStatus{
	StatusCreated: {
		StatusPlanning,
		StatusCancelled,
		StatusFailed,
	},
	StatusPlanning: {
		StatusDiscovering,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	StatusDiscovering: {
		StatusEvaluating,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	StatusEvaluating: {
		StatusSelecting,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	StatusSelecting: {
		StatusAwaitingApproval,
		StatusExecuting,
		StatusBudgetExhausted,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	StatusAwaitingApproval: {
		StatusExecuting,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	StatusExecuting: {
		StatusWaitingForResult,
		StatusFailed,
	},
	StatusWaitingForResult: {
		StatusEvaluatingResult,
		StatusFailed,
		StatusExpired,
	},
	StatusEvaluatingResult: {
		StatusContinuing,
		StatusCompleted,
		StatusFailed,
	},
	StatusContinuing: {
		StatusPlanning,
		StatusDiscovering,
		StatusCompleted,
		StatusBudgetExhausted,
		StatusFailed,
		StatusCancelled,
		StatusExpired,
	},
	// Terminal states: strictly empty
	StatusCompleted:       {},
	StatusFailed:          {},
	StatusCancelled:       {},
	StatusBudgetExhausted: {},
	StatusExpired:         {},
}

// ValidateTransition verifies whether transitioning from `from` to `to` is permitted.
func ValidateTransition(from, to MissionStatus) error {
	allowed, exists := validMissionTransitions[from]
	if !exists {
		return ErrInvalidMissionTransition{From: from, To: to}
	}

	for _, s := range allowed {
		if s == to {
			return nil
		}
	}

	return ErrInvalidMissionTransition{From: from, To: to}
}

// IsTerminal returns true if the status is a terminal state.
func IsTerminal(s MissionStatus) bool {
	switch s {
	case StatusCompleted, StatusFailed, StatusCancelled, StatusBudgetExhausted, StatusExpired:
		return true
	default:
		return false
	}
}

// IsActive returns true if the mission is currently in an active operational state.
func IsActive(s MissionStatus) bool {
	return !IsTerminal(s)
}
