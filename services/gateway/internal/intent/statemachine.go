package intent

import (
	"fmt"
)

// ErrInvalidTransition indicates an illegal state transition attempt.
type ErrInvalidTransition struct {
	From IntentStatus
	To   IntentStatus
}

func (e ErrInvalidTransition) Error() string {
	return fmt.Sprintf("invalid payment intent transition from %s to %s", e.From, e.To)
}

// validTransitions defines allowed state machine transitions.
var validTransitions = map[IntentStatus][]IntentStatus{
	StatusCreated: {
		StatusAuthorized,
		StatusDenied,
		StatusExpired,
	},
	StatusAuthorized: {
		StatusExecuting,
		StatusExpired,
	},
	StatusExecuting: {
		StatusSubmitted,
		StatusFailed,
	},
	StatusSubmitted: {
		StatusConfirmed,
		StatusFailed,
	},
	// Terminal states:
	StatusDenied:    {},
	StatusConfirmed: {},
	StatusFailed:    {},
	StatusExpired:   {},
}

// ValidateTransition verifies whether transitioning from 'from' to 'to' is permitted.
func ValidateTransition(from, to IntentStatus) error {
	allowed, exists := validTransitions[from]
	if !exists {
		return ErrInvalidTransition{From: from, To: to}
	}

	for _, s := range allowed {
		if s == to {
			return nil
		}
	}

	return ErrInvalidTransition{From: from, To: to}
}

// CanExecute returns true if the intent is in an executable state (AUTHORIZED).
func CanExecute(status IntentStatus) bool {
	return status == StatusAuthorized
}
