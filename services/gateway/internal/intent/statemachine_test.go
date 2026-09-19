package intent

import (
	"testing"
)

// TestStateMachine_ValidTransitions verifies all legal state transitions (Test Case 21).
func TestStateMachine_ValidTransitions(t *testing.T) {
	validTransitions := []struct {
		from IntentStatus
		to   IntentStatus
	}{
		{StatusCreated, StatusAuthorized},
		{StatusCreated, StatusDenied},
		{StatusCreated, StatusExpired},
		{StatusAuthorized, StatusExecuting},
		{StatusAuthorized, StatusExpired},
		{StatusExecuting, StatusSubmitted},
		{StatusExecuting, StatusFailed},
		{StatusSubmitted, StatusConfirmed},
		{StatusSubmitted, StatusFailed},
	}

	for _, tt := range validTransitions {
		t.Run(string(tt.from)+"->"+string(tt.to), func(t *testing.T) {
			if err := ValidateTransition(tt.from, tt.to); err != nil {
				t.Fatalf("expected valid transition from %s to %s, got error: %v", tt.from, tt.to, err)
			}
		})
	}
}

// TestStateMachine_InvalidTransitionsRejected verifies illegal transitions are rejected (Test Case 22).
func TestStateMachine_InvalidTransitionsRejected(t *testing.T) {
	invalidTransitions := []struct {
		from IntentStatus
		to   IntentStatus
	}{
		{StatusCreated, StatusConfirmed},
		{StatusCreated, StatusExecuting},
		{StatusCreated, StatusSubmitted},
		{StatusAuthorized, StatusCreated},
		{StatusExecuting, StatusCreated},
		{StatusFailed, StatusExecuting},
	}

	for _, tt := range invalidTransitions {
		t.Run(string(tt.from)+"->"+string(tt.to), func(t *testing.T) {
			if err := ValidateTransition(tt.from, tt.to); err == nil {
				t.Fatalf("expected error for illegal transition from %s to %s, got nil", tt.from, tt.to)
			}
		})
	}
}

// TestStateMachine_DeniedCannotBecomeConfirmed verifies DENIED cannot transition to CONFIRMED (Test Case 23).
func TestStateMachine_DeniedCannotBecomeConfirmed(t *testing.T) {
	err := ValidateTransition(StatusDenied, StatusConfirmed)
	if err == nil {
		t.Fatal("expected error: DENIED must never transition to CONFIRMED")
	}
}

// TestStateMachine_ExpiredCannotExecute verifies EXPIRED cannot transition to EXECUTING (Test Case 24).
func TestStateMachine_ExpiredCannotExecute(t *testing.T) {
	err := ValidateTransition(StatusExpired, StatusExecuting)
	if err == nil {
		t.Fatal("expected error: EXPIRED must never transition to EXECUTING")
	}
}

// TestStateMachine_ConfirmedCannotExecuteAgain verifies CONFIRMED cannot transition to EXECUTING (Test Case 25).
func TestStateMachine_ConfirmedCannotExecuteAgain(t *testing.T) {
	err := ValidateTransition(StatusConfirmed, StatusExecuting)
	if err == nil {
		t.Fatal("expected error: CONFIRMED must never transition to EXECUTING again")
	}
}

// TestStateMachine_DeniedCannotExecute verifies DENIED cannot transition to EXECUTING.
func TestStateMachine_DeniedCannotExecute(t *testing.T) {
	err := ValidateTransition(StatusDenied, StatusExecuting)
	if err == nil {
		t.Fatal("expected error: DENIED must never transition to EXECUTING")
	}
}

// TestStateMachine_FailedCannotBecomeConfirmed verifies FAILED cannot transition to CONFIRMED.
func TestStateMachine_FailedCannotBecomeConfirmed(t *testing.T) {
	err := ValidateTransition(StatusFailed, StatusConfirmed)
	if err == nil {
		t.Fatal("expected error: FAILED must never transition to CONFIRMED")
	}
}
