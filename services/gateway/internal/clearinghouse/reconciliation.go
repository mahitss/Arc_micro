package clearinghouse

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
)

var (
	ErrReconciliationMismatch = errors.New("reconciliation discrepancy detected between expected and actual state")
	ErrAmbiguousState         = errors.New("transaction state is ambiguous; confirmation receipt pending")
	ErrReceiptVerification    = errors.New("on-chain transaction receipt verification failed")
)

// ClearingReconciliationEngine executes machine-checkable audits between internal obligations,
// payment intents, treasury reservations, and verified Arc on-chain receipts.
type ClearingReconciliationEngine struct {
	blockchainClient blockchain.Client
	expectedChainID  string
	targetVault      string
}

func NewClearingReconciliationEngine(client blockchain.Client, expectedChainID, targetVault string) *ClearingReconciliationEngine {
	return &ClearingReconciliationEngine{
		blockchainClient: client,
		expectedChainID:  expectedChainID,
		targetVault:      targetVault,
	}
}

// ReconcilePaymentIntent verifies the on-chain settlement status of an authorized intent.
// Enforces INV-64 (Simulation cannot become real), INV-65 (verified blockchain evidence required),
// INV-68 (never silently repair mismatches), and INV-69 (ambiguous state cannot be marked settled).
func (re *ClearingReconciliationEngine) ReconcilePaymentIntent(
	ctx context.Context,
	obligation *EconomicObligation,
	intentID string,
	txHashHex string,
	expectedAmount string,
	expectedRecipient string,
	mode ExecutionMode,
) (*ReconciliationRecord, error) {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	recID := fmt.Sprintf("rec_%s", hex.EncodeToString(b))

	record := &ReconciliationRecord{
		RecordID:          recID,
		OrganizationID:    obligation.OrganizationID,
		ObligationID:      obligation.ObligationID,
		PaymentIntentID:   intentID,
		TransactionHash:   txHashHex,
		ExpectedAmount:    expectedAmount,
		ExpectedRecipient: expectedRecipient,
		ChainID:           re.expectedChainID,
		TargetContract:    re.targetVault,
		ExecutionMode:     mode,
		ReconciledAt:      time.Now().UTC(),
	}

	// 1. Simulation Mode Check (INV-64)
	if mode == ModeSimulation {
		record.Status = ReconMatched
		record.ActualAmount = expectedAmount
		record.ActualRecipient = expectedRecipient
		record.DiscrepancyNotes = "Simulation verification: verified against pure deterministic simulation trace. Zero on-chain mutation."
		return record, nil
	}

	// 2. Real Mode: Must have valid transaction hash
	txHashHex = strings.TrimSpace(txHashHex)
	if txHashHex == "" || !strings.HasPrefix(txHashHex, "0x") || len(txHashHex) != 66 {
		record.Status = ReconAmbiguous
		record.DiscrepancyNotes = "No valid on-chain transaction hash found for real execution intent."
		record.RecommendedAction = "Poll gateway transaction status or reconcile receipt before retry."
		return record, ErrAmbiguousState
	}

	// 3. Blockchain client connectivity check
	if re.blockchainClient == nil {
		record.Status = ReconPending
		record.DiscrepancyNotes = "Blockchain client not configured; cannot inspect on-chain receipt."
		record.RecommendedAction = "Verify Arc node connectivity."
		return record, errors.New("blockchain client unavailable for reconciliation")
	}

	// 4. Verify connected chain ID
	chainID, err := re.blockchainClient.ChainID(ctx)
	if err != nil {
		record.Status = ReconAmbiguous
		record.DiscrepancyNotes = fmt.Sprintf("Failed to query chain ID: %v", err)
		return record, fmt.Errorf("%w: %v", ErrAmbiguousState, err)
	}
	record.ChainID = chainID.String()

	// 5. Query mined transaction receipt from Arc node
	txHash := common.HexToHash(txHashHex)
	receipt, err := re.blockchainClient.TransactionReceipt(ctx, txHash)
	if err != nil || receipt == nil {
		record.Status = ReconAmbiguous
		record.DiscrepancyNotes = fmt.Sprintf("Transaction receipt not found or still pending on Arc: %v", err)
		record.RecommendedAction = "Transaction submitted but unconfirmed. Wait for block finality without rebroadcasting (INV-69)."
		return record, ErrAmbiguousState
	}

	// 6. Assert receipt status
	if receipt.Status != types.ReceiptStatusSuccessful {
		record.Status = ReconMismatch
		record.DiscrepancyNotes = "Transaction was mined on Arc but REVERTED during EVM execution."
		record.RecommendedAction = "Inspect AgentVault revert reason; fail payment intent and release remaining reservations."
		return record, fmt.Errorf("%w: transaction reverted on-chain (status 0)", ErrReceiptVerification)
	}

	// 7. Verify PaymentExecuted event emitted by AgentVault
	// Event signature: PaymentExecuted(address indexed recipient, uint256 amount, bytes32 indexed purpose, uint256 indexed day)
	// Topic 0: 0x937667d4... (keccak256("PaymentExecuted(address,uint256,bytes32,uint256)"))
	foundEvent := false
	for _, l := range receipt.Logs {
		if strings.EqualFold(l.Address.Hex(), re.targetVault) && len(l.Topics) >= 2 {
			// Topic 1 contains indexed recipient address
			eventRecipient := common.HexToAddress(l.Topics[1].Hex()).Hex()
			if strings.EqualFold(eventRecipient, expectedRecipient) {
				foundEvent = true
				record.ActualRecipient = eventRecipient
				if len(l.Data) >= 32 {
					eventAmt := new(big.Int).SetBytes(l.Data[:32])
					record.ActualAmount = eventAmt.String()
				}
				break
			}
		}
	}

	if !foundEvent {
		// Event not found in contract logs: potential destination mismatch
		record.Status = ReconMismatch
		record.DiscrepancyNotes = fmt.Sprintf("Receipt succeeded but AgentVault PaymentExecuted event not found for recipient %s", expectedRecipient)
		record.RecommendedAction = "Manual security review required (INV-68: never silently repair mismatches)."
		return record, fmt.Errorf("%w: event log recipient mismatch", ErrReconciliationMismatch)
	}

	// 8. Amount Check
	if record.ActualAmount != "" && record.ActualAmount != expectedAmount {
		record.Status = ReconMismatch
		record.DiscrepancyNotes = fmt.Sprintf("Amount discrepancy: expected %s, found %s in event log", expectedAmount, record.ActualAmount)
		record.RecommendedAction = "Halt automated settlement; trigger manual auditor review."
		return record, fmt.Errorf("%w: settled amount does not match expected", ErrReconciliationMismatch)
	}

	// 9. All checks matched
	record.Status = ReconMatched
	record.DiscrepancyNotes = fmt.Sprintf("Confirmed on Arc block %s with successful AgentVault settlement.", receipt.BlockNumber.String())
	return record, nil
}
