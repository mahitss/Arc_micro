package blockchain

import "fmt"

// ConfigurationError indicates invalid or missing blockchain configuration.
type ConfigurationError struct {
	Reason string
}

func (e ConfigurationError) Error() string {
	return fmt.Sprintf("blockchain configuration error: %s", e.Reason)
}

// NetworkMismatchError indicates connected RPC chain ID does not match configured chain ID.
type NetworkMismatchError struct {
	Expected string
	Actual   string
}

func (e NetworkMismatchError) Error() string {
	return fmt.Sprintf("network mismatch: expected chain ID %s, RPC returned %s", e.Expected, e.Actual)
}

// RPCError indicates failure communicating with the blockchain RPC node.
type RPCError struct {
	Operation string
	Err       error
}

func (e RPCError) Error() string {
	return fmt.Sprintf("rpc error during %s: %v", e.Operation, e.Err)
}

func (e RPCError) Unwrap() error {
	return e.Err
}

// ValidationError indicates invalid input parameters (e.g. invalid hex address or negative amount).
type ValidationError struct {
	Field  string
	Reason string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation error for %s: %s", e.Field, e.Reason)
}

// AuthorizationError indicates that authorization was denied or failed.
type AuthorizationError struct {
	ReasonCode string
	Message    string
}

func (e AuthorizationError) Error() string {
	return fmt.Sprintf("authorization failed [%s]: %s", e.ReasonCode, e.Message)
}

// TransactionSubmissionError indicates failure when signing or broadcasting the transaction.
type TransactionSubmissionError struct {
	Err error
}

func (e TransactionSubmissionError) Error() string {
	return fmt.Sprintf("transaction submission failed: %v", e.Err)
}

func (e TransactionSubmissionError) Unwrap() error {
	return e.Err
}

// ConfirmationTimeoutError indicates the transaction was submitted but not confirmed within deadline.
type ConfirmationTimeoutError struct {
	TxHash string
}

func (e ConfirmationTimeoutError) Error() string {
	return fmt.Sprintf("transaction %s was submitted but confirmation timed out", e.TxHash)
}

// ReceiptVerificationError indicates transaction mined with failure status or unexpected logs.
type ReceiptVerificationError struct {
	TxHash string
	Status uint64
	Reason string
}

func (e ReceiptVerificationError) Error() string {
	return fmt.Sprintf("receipt verification failed for %s (status %d): %s", e.TxHash, e.Status, e.Reason)
}

// ExecutionDisabledError indicates live blockchain execution is disabled by configuration.
type ExecutionDisabledError struct{}

func (e ExecutionDisabledError) Error() string {
	return "live blockchain execution is disabled (ENABLE_LIVE_EXECUTION=false)"
}

// IdempotencyError indicates duplicate execution attempt on an active or confirmed request.
type IdempotencyError struct {
	RequestID string
	Status    ExecutionState
}

func (e IdempotencyError) Error() string {
	return fmt.Sprintf("request %s already processed with status %s", e.RequestID, e.Status)
}
