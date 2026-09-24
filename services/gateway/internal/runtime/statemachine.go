package runtime

import (
	"errors"
	"fmt"
)

var (
	ErrInvalidWorkflowTransition = errors.New("illegal workflow state transition")
	ErrInvalidStepTransition     = errors.New("illegal execution step state transition")
	ErrWorkflowIsTerminal        = errors.New("workflow is in a terminal state and cannot transition")
	ErrStepIsTerminal            = errors.New("step is in a terminal state and cannot transition")
)

// ValidateWorkflowTransition validates whether a workflow state transition is allowed.
func ValidateWorkflowTransition(from, to WorkflowState) error {
	if from == to {
		return nil
	}

	// Terminal states cannot transition to active states
	if from.IsTerminal() {
		return fmt.Errorf("%w: cannot transition from terminal state %s to %s", ErrWorkflowIsTerminal, from, to)
	}

	switch from {
	case WorkflowCreated:
		if to == WorkflowReady || to == WorkflowCancelled || to == WorkflowAborted {
			return nil
		}
	case WorkflowReady:
		if to == WorkflowRunning || to == WorkflowPaused || to == WorkflowCancelled || to == WorkflowAborted {
			return nil
		}
	case WorkflowRunning:
		if to == WorkflowWaiting || to == WorkflowPaused || to == WorkflowRetrying ||
			to == WorkflowCompleted || to == WorkflowFailed || to == WorkflowCancelled ||
			to == WorkflowExpired || to == WorkflowAborted {
			return nil
		}
	case WorkflowWaiting:
		if to == WorkflowRunning || to == WorkflowPaused || to == WorkflowFailed ||
			to == WorkflowCancelled || to == WorkflowExpired || to == WorkflowAborted {
			return nil
		}
	case WorkflowPaused:
		if to == WorkflowReady || to == WorkflowRunning || to == WorkflowCancelled || to == WorkflowAborted {
			return nil
		}
	case WorkflowRetrying:
		if to == WorkflowRunning || to == WorkflowFailed || to == WorkflowCancelled ||
			to == WorkflowExpired || to == WorkflowAborted {
			return nil
		}
	}

	return fmt.Errorf("%w: invalid transition from %s to %s", ErrInvalidWorkflowTransition, from, to)
}

// ValidateStepTransition validates whether an execution step state transition is allowed.
func ValidateStepTransition(from, to StepState) error {
	if from == to {
		return nil
	}

	if from.IsTerminal() {
		return fmt.Errorf("%w: cannot transition from terminal step state %s to %s", ErrStepIsTerminal, from, to)
	}

	switch from {
	case StepPending:
		if to == StepClaimed || to == StepCancelled || to == StepExpired {
			return nil
		}
	case StepClaimed:
		if to == StepRunning || to == StepPending || to == StepCancelled || to == StepExpired {
			return nil
		}
	case StepRunning:
		if to == StepWaiting || to == StepSucceeded || to == StepRetryableFailure ||
			to == StepPermanentFailure || to == StepCancelled || to == StepExpired {
			return nil
		}
	case StepWaiting:
		if to == StepRunning || to == StepSucceeded || to == StepRetryableFailure ||
			to == StepPermanentFailure || to == StepCancelled || to == StepExpired {
			return nil
		}
	case StepRetryableFailure:
		if to == StepPending || to == StepClaimed || to == StepPermanentFailure ||
			to == StepCancelled || to == StepExpired {
			return nil
		}
	}

	return fmt.Errorf("%w: invalid step transition from %s to %s", ErrInvalidStepTransition, from, to)
}
