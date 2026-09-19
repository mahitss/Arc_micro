package blockchain

// ExecutionState represents the lifecycle status of a blockchain payment execution.
type ExecutionState string

const (
	StatePrepared          ExecutionState = "PREPARED"
	StateSubmitted         ExecutionState = "SUBMITTED"
	StateConfirmed         ExecutionState = "CONFIRMED"
	StateFailed            ExecutionState = "FAILED"
	StateExecutionDisabled ExecutionState = "EXECUTION_DISABLED"
)

// PaymentExecutionRequest holds parameters for initiating an on-chain payment from AgentVault.
type PaymentExecutionRequest struct {
	RequestID    string `json:"request_id"`
	AgentID      string `json:"agent_id"`
	VaultAddress string `json:"vault_address"`
	Recipient    string `json:"recipient"`
	Amount       string `json:"amount"`
	Purpose      string `json:"purpose"`
}

// PaymentExecutionResult contains the outcome of an execution attempt.
type PaymentExecutionResult struct {
	RequestID       string         `json:"request_id"`
	Status          ExecutionState `json:"status"`
	TransactionHash string         `json:"transaction_hash,omitempty"`
	BlockNumber     string         `json:"block_number,omitempty"`
	Vault           string         `json:"vault,omitempty"`
	Recipient       string         `json:"recipient,omitempty"`
	Amount          string         `json:"amount,omitempty"`
	ExplorerURL     string         `json:"explorer_url,omitempty"`
	Error           string         `json:"error,omitempty"`
}
