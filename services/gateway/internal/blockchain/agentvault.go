package blockchain

import (
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// AgentVaultABIJSON contains the JSON ABI for the AgentVault contract.
const AgentVaultABIJSON = `[
	{
		"type": "function",
		"name": "executePayment",
		"inputs": [
			{"name": "recipient", "type": "address", "internalType": "address"},
			{"name": "amount", "type": "uint256", "internalType": "uint256"},
			{"name": "purpose", "type": "bytes32", "internalType": "bytes32"}
		],
		"outputs": [],
		"stateMutability": "nonpayable"
	},
	{
		"type": "event",
		"name": "PaymentExecuted",
		"inputs": [
			{"name": "recipient", "type": "address", "indexed": true, "internalType": "address"},
			{"name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256"},
			{"name": "purpose", "type": "bytes32", "indexed": true, "internalType": "bytes32"},
			{"name": "day", "type": "uint256", "indexed": true, "internalType": "uint256"}
		],
		"anonymous": false
	}
]`

var parsedAgentVaultABI abi.ABI

func init() {
	var err error
	parsedAgentVaultABI, err = abi.JSON(strings.NewReader(AgentVaultABIJSON))
	if err != nil {
		panic(fmt.Sprintf("failed to parse AgentVault ABI: %v", err))
	}
}

// PaymentExecutedEvent represents the decoded PaymentExecuted event emitted by AgentVault.
type PaymentExecutedEvent struct {
	Recipient common.Address
	Amount    *big.Int
	Purpose   [32]byte
	Day       *big.Int
}

// PackExecutePayment packs calldata for AgentVault.executePayment(recipient, amount, purpose).
func PackExecutePayment(recipient common.Address, amount *big.Int, purpose [32]byte) ([]byte, error) {
	if amount == nil || amount.Sign() <= 0 {
		return nil, &ValidationError{Field: "amount", Reason: "amount must be positive"}
	}
	return parsedAgentVaultABI.Pack("executePayment", recipient, amount, purpose)
}

// UnpackPaymentExecutedEvent extracts the PaymentExecuted event from a transaction receipt log.
func UnpackPaymentExecutedEvent(receiptLog *types.Log) (*PaymentExecutedEvent, error) {
	eventABI, ok := parsedAgentVaultABI.Events["PaymentExecuted"]
	if !ok {
		return nil, fmt.Errorf("PaymentExecuted event not found in ABI")
	}

	if len(receiptLog.Topics) < 4 || receiptLog.Topics[0] != eventABI.ID {
		return nil, fmt.Errorf("log does not match PaymentExecuted event topic")
	}

	// Topic 1: recipient (address)
	recipient := common.BytesToAddress(receiptLog.Topics[1].Bytes())

	// Topic 2: purpose (bytes32)
	var purpose [32]byte
	copy(purpose[:], receiptLog.Topics[2].Bytes())

	// Topic 3: day (uint256)
	day := new(big.Int).SetBytes(receiptLog.Topics[3].Bytes())

	// Data: amount (uint256)
	var nonIndexed struct {
		Amount *big.Int
	}
	err := parsedAgentVaultABI.UnpackIntoInterface(&nonIndexed, "PaymentExecuted", receiptLog.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to unpack PaymentExecuted non-indexed data: %w", err)
	}

	return &PaymentExecutedEvent{
		Recipient: recipient,
		Amount:    nonIndexed.Amount,
		Purpose:   purpose,
		Day:       day,
	}, nil
}
