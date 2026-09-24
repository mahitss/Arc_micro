package operations

// NextActionResolver computes a deterministic prediction of the next operational action.
// It explicitly models operational workflow progression, NOT future blockchain outcomes.
type NextActionResolver struct{}

// NewNextActionResolver creates an instance of NextActionResolver.
func NewNextActionResolver() *NextActionResolver {
	return &NextActionResolver{}
}

// Resolve predicts what will happen next for a workflow and its current step.
func (r *NextActionResolver) Resolve(
	workflowState string,
	currentStepState string,
	isFinancial bool,
	approvalPending bool,
	isAmbiguous bool,
	attempts int,
	maxAttempts int,
) NextAction {
	// 1. Terminal Workflow States
	if workflowState == "COMPLETED" {
		return NextAction{
			Action:                "COMPLETE",
			Reason:                "Workflow reached terminal success; all planned steps verified",
			EstimatedDelaySeconds: 0,
			RequiresHuman:         false,
		}
	}
	if workflowState == "CANCELLED" || workflowState == "ABORTED" {
		return NextAction{
			Action:                DecisionCancel,
			Reason:                "Workflow terminated; no further steps will execute",
			EstimatedDelaySeconds: 0,
			RequiresHuman:         false,
		}
	}
	if workflowState == "PAUSED" {
		return NextAction{
			Action:                DecisionWait,
			Reason:                "Workflow execution paused; awaiting operator resume command",
			EstimatedDelaySeconds: 0,
			RequiresHuman:         true,
		}
	}

	// 2. Ambiguous Blockchain / External Side Effect
	if isAmbiguous {
		return NextAction{
			Action:                DecisionReconcile,
			Reason:                "Blockchain transaction or external side effect is unconfirmed; reconciliation required",
			EstimatedDelaySeconds: 30,
			RequiresHuman:         true,
		}
	}

	// 3. Approval Block
	if isFinancial && approvalPending {
		return NextAction{
			Action:                DecisionWait,
			Reason:                "Financial step flagged for human approval; awaiting signature",
			EstimatedDelaySeconds: 300,
			RequiresHuman:         true,
		}
	}

	// 4. Recovery Required
	if currentStepState == "RECOVERY_REQUIRED" {
		return NextAction{
			Action:                DecisionRecover,
			Reason:                "Prior worker lease expired; step ready for reassignment and recovery",
			EstimatedDelaySeconds: 5,
			RequiresHuman:         false,
		}
	}

	// 5. Retryable Failure
	if currentStepState == "RETRYABLE_FAILURE" {
		if attempts < maxAttempts {
			return NextAction{
				Action:                DecisionRetry,
				Reason:                "Transient failure encountered; scheduled for exponential backoff retry",
				EstimatedDelaySeconds: 10,
				RequiresHuman:         false,
			}
		}
		return NextAction{
			Action:                DecisionEscalate,
			Reason:                "Retry budget exhausted; escalating to supervisor or dead-letter queue",
			EstimatedDelaySeconds: 0,
			RequiresHuman:         true,
		}
	}

	// 6. Running / In-Flight
	if currentStepState == "RUNNING" {
		return NextAction{
			Action:                DecisionWait,
			Reason:                "Worker currently executing step; awaiting completion or heartbeat",
			EstimatedDelaySeconds: 15,
			RequiresHuman:         false,
		}
	}

	// 7. Ready to execute
	return NextAction{
		Action:                DecisionRun,
		Reason:                "Step dependencies satisfied; ready to be claimed by available worker",
		EstimatedDelaySeconds: 2,
		RequiresHuman:         false,
	}
}
