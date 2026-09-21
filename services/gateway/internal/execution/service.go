package execution

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

// Service defines the interface for blockchain payment execution.
type Service interface {
	ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
	ReconcileTransaction(ctx context.Context, requestID string) (*blockchain.PaymentExecutionResult, error)
}

// ExecutionService implements the Service interface for executing payments against AgentVault.
type ExecutionService struct {
	cfg              *config.Config
	blockchainClient blockchain.Client
	store            Store
	signer           signer.TransactionSigner
	auditRecorder    signer.AuditRecorder
}

// NewExecutionService creates a new ExecutionService instance with default signer resolution.
func NewExecutionService(cfg *config.Config, client blockchain.Client, store Store) *ExecutionService {
	if store == nil {
		store = NewMemoryStore()
	}
	return &ExecutionService{
		cfg:              cfg,
		blockchainClient: client,
		store:            store,
	}
}

// NewExecutionServiceWithSigner creates a new ExecutionService with an explicit TransactionSigner and AuditRecorder.
func NewExecutionServiceWithSigner(cfg *config.Config, client blockchain.Client, store Store, txSigner signer.TransactionSigner, auditRecorder signer.AuditRecorder) *ExecutionService {
	if store == nil {
		store = NewMemoryStore()
	}
	return &ExecutionService{
		cfg:              cfg,
		blockchainClient: client,
		store:            store,
		signer:           txSigner,
		auditRecorder:    auditRecorder,
	}
}

// SetSigner sets or overrides the transaction signer.
func (s *ExecutionService) SetSigner(txSigner signer.TransactionSigner) {
	s.signer = txSigner
}

// SetAuditRecorder sets the audit recorder.
func (s *ExecutionService) SetAuditRecorder(recorder signer.AuditRecorder) {
	s.auditRecorder = recorder
}

// Signer returns the configured transaction signer, if any.
func (s *ExecutionService) Signer() signer.TransactionSigner {
	return s.signer
}

func (s *ExecutionService) getSigner() (signer.TransactionSigner, error) {
	if s.signer != nil {
		return s.signer, nil
	}
	txSigner, err := signer.NewSignerFromConfig(s.cfg, s.auditRecorder)
	if err != nil {
		return nil, &blockchain.ConfigurationError{Reason: err.Error()}
	}
	s.signer = txSigner
	return s.signer, nil
}

// BlockchainClient returns the underlying blockchain client.
func (s *ExecutionService) BlockchainClient() blockchain.Client {
	return s.blockchainClient
}

// ExecutePayment processes a payment execution request.
func (s *ExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	// 1. Idempotency & Recovery check: return existing result or check chain if already broadcast
	if existing, ok := s.store.Get(req.RequestID); ok {
		if existing.Status == blockchain.StateConfirmed || existing.Status == blockchain.StateExecutionDisabled {
			return existing, nil
		}
		// If transaction was already broadcast or is ambiguous, re-query chain receipt rather than creating a duplicate transaction
		if existing.TransactionHash != "" && s.blockchainClient != nil {
			log.Printf("[BLOCKCHAIN] Found existing submitted/ambiguous tx=%s for req_id=%s. Checking chain receipt...",
				existing.TransactionHash, req.RequestID)
			return s.ReconcileTransaction(ctx, req.RequestID)
		}
		return existing, nil
	}

	// 2. Validate input parameters
	vaultAddr, err := blockchain.ValidateAddress("vault_address", req.VaultAddress)
	if err != nil {
		return nil, err
	}

	recipientAddr, err := blockchain.ValidateAddress("recipient", req.Recipient)
	if err != nil {
		return nil, err
	}

	amountInt, ok := new(big.Int).SetString(req.Amount, 10)
	if !ok || amountInt.Sign() <= 0 {
		return nil, &blockchain.ValidationError{Field: "amount", Reason: "must be a positive integer base unit string"}
	}

	// 3. Check live execution safety gate
	if !s.cfg.EnableLiveExecution {
		result := &blockchain.PaymentExecutionResult{
			RequestID: req.RequestID,
			Status:    blockchain.StateExecutionDisabled,
			Vault:     vaultAddr.Hex(),
			Recipient: recipientAddr.Hex(),
			Amount:    req.Amount,
		}
		s.store.Set(req.RequestID, result)
		return result, nil
	}

	// 4. Live execution path
	if s.blockchainClient == nil {
		return nil, &blockchain.ConfigurationError{Reason: "blockchain client is not initialized"}
	}

	txSigner, err := s.getSigner()
	if err != nil {
		return nil, err
	}

	// 5. Validate Arc chain ID against connected RPC and signer
	actualChainID, err := s.blockchainClient.ChainID(ctx)
	if err != nil {
		return nil, err
	}
	if err := blockchain.ValidateChainID(s.cfg.ArcChainID, actualChainID); err != nil {
		return nil, err
	}
	if actualChainID.Cmp(txSigner.ChainID()) != 0 {
		return nil, fmt.Errorf("%w: RPC chain ID %s does not match signer configured chain ID %s",
			signer.ErrInvalidChainID, actualChainID.String(), txSigner.ChainID().String())
	}

	// 6. Verify executor account balance
	fromAddress := txSigner.Address()
	balance, err := s.blockchainClient.BalanceAt(ctx, fromAddress)
	if err != nil {
		return nil, err
	}
	if balance.Sign() <= 0 {
		return nil, &blockchain.RPCError{
			Operation: "check executor balance",
			Err:       fmt.Errorf("executor %s has zero balance for gas", fromAddress.Hex()),
		}
	}

	// 7. Pack calldata for AgentVault.executePayment(recipient, amount, purpose)
	purposeBytes := blockchain.PurposeToBytes32(req.Purpose)
	calldata, err := blockchain.PackExecutePayment(recipientAddr, amountInt, purposeBytes)
	if err != nil {
		return nil, err
	}

	// 8. Construct EIP-1559 transaction
	nonce, err := s.blockchainClient.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return nil, err
	}

	gasTipCap, err := s.blockchainClient.SuggestGasTipCap(ctx)
	if err != nil {
		gasTipCap = big.NewInt(1000000000) // 1 gwei fallback
	}

	gasPrice, err := s.blockchainClient.SuggestGasPrice(ctx)
	if err != nil {
		gasPrice = big.NewInt(2000000000) // 2 gwei fallback
	}
	gasFeeCap := new(big.Int).Add(gasPrice, gasTipCap)

	msg := ethereum.CallMsg{
		From:      fromAddress,
		To:        &vaultAddr,
		GasFeeCap: gasFeeCap,
		GasTipCap: gasTipCap,
		Data:      calldata,
	}
	gasLimit, err := s.blockchainClient.EstimateGas(ctx, msg)
	if err != nil {
		// Conservative fallback gas limit for AgentVault.executePayment
		gasLimit = 250000
	} else {
		// Add 20% buffer to estimated gas
		gasLimit = gasLimit * 120 / 100
	}

	txData := &types.DynamicFeeTx{
		ChainID:   actualChainID,
		Nonce:     nonce,
		GasTipCap: gasTipCap,
		GasFeeCap: gasFeeCap,
		Gas:       gasLimit,
		To:        &vaultAddr,
		Value:     big.NewInt(0),
		Data:      calldata,
	}
	unsignedTx := types.NewTx(txData)

	// Transaction Binding: enforces that only the exact authorized destination, amount, calldata, and chain are signed
	binding := &signer.TransactionBinding{
		RequestID:        req.RequestID,
		ChainID:          actualChainID,
		TargetVault:      vaultAddr,
		ExpectedCalldata: calldata,
		ExpectedAmount:   req.Amount,
	}

	signedTx, err := txSigner.SignTransaction(ctx, unsignedTx, binding)
	if err != nil {
		return nil, &blockchain.TransactionSubmissionError{Err: fmt.Errorf("failed to sign transaction: %w", err)}
	}

	// 9. Broadcast transaction
	txHash := signedTx.Hash()
	log.Printf("[BLOCKCHAIN] Broadcasting tx=%s from=%s to_vault=%s req_id=%s",
		txHash.Hex(), fromAddress.Hex(), vaultAddr.Hex(), req.RequestID)

	if err := s.blockchainClient.SendTransaction(ctx, signedTx); err != nil {
		return nil, &blockchain.TransactionSubmissionError{Err: fmt.Errorf("failed to broadcast transaction: %w", err)}
	}

	// Immediately record SUBMITTED state with txHash to prevent duplicate submissions on retry
	submittedResult := &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateSubmitted,
		TransactionHash: txHash.Hex(),
		Vault:           vaultAddr.Hex(),
		Recipient:       recipientAddr.Hex(),
		Amount:          req.Amount,
		ExplorerURL:     blockchain.BuildExplorerTxURL(s.cfg.ArcExplorerURL, txHash.Hex()),
	}
	s.store.Set(req.RequestID, submittedResult)

	// 10. Wait for confirmation
	receipt, err := s.waitForReceipt(ctx, txHash)
	if err != nil {
		// If confirmation times out or encounters network error, the transaction WAS broadcast to Arc,
		// but receipt status cannot be verified within the deadline.
		// Transition to StateAmbiguous so the transaction is never prematurely failed or double-broadcast.
		ambiguousResult := &blockchain.PaymentExecutionResult{
			RequestID:       req.RequestID,
			Status:          blockchain.StateAmbiguous,
			TransactionHash: txHash.Hex(),
			Vault:           vaultAddr.Hex(),
			Recipient:       recipientAddr.Hex(),
			Amount:          req.Amount,
			ExplorerURL:     blockchain.BuildExplorerTxURL(s.cfg.ArcExplorerURL, txHash.Hex()),
			Error:           err.Error(),
		}
		s.store.Set(req.RequestID, ambiguousResult)
		log.Printf("[BLOCKCHAIN] Transaction %s in AMBIGUOUS state due to confirmation timeout: %v", txHash.Hex(), err)
		return ambiguousResult, err
	}

	if receipt.Status != types.ReceiptStatusSuccessful {
		failResult := &blockchain.PaymentExecutionResult{
			RequestID:       req.RequestID,
			Status:          blockchain.StateFailed,
			TransactionHash: txHash.Hex(),
			BlockNumber:     receipt.BlockNumber.String(),
			Vault:           vaultAddr.Hex(),
			Recipient:       recipientAddr.Hex(),
			Amount:          req.Amount,
			ExplorerURL:     blockchain.BuildExplorerTxURL(s.cfg.ArcExplorerURL, txHash.Hex()),
			Error:           "transaction reverted on-chain",
		}
		s.store.Set(req.RequestID, failResult)
		return failResult, &blockchain.ReceiptVerificationError{
			TxHash: txHash.Hex(),
			Status: receipt.Status,
			Reason: "transaction execution reverted on-chain",
		}
	}

	// 11. Success confirmation
	result := &blockchain.PaymentExecutionResult{
		RequestID:       req.RequestID,
		Status:          blockchain.StateConfirmed,
		TransactionHash: txHash.Hex(),
		BlockNumber:     receipt.BlockNumber.String(),
		Vault:           vaultAddr.Hex(),
		Recipient:       recipientAddr.Hex(),
		Amount:          req.Amount,
		ExplorerURL:     blockchain.BuildExplorerTxURL(s.cfg.ArcExplorerURL, txHash.Hex()),
	}

	s.store.Set(req.RequestID, result)
	log.Printf("[BLOCKCHAIN] Confirmed tx=%s block=%s req_id=%s",
		txHash.Hex(), receipt.BlockNumber.String(), req.RequestID)

	return result, nil
}

// ReconcileTransaction queries the blockchain for an in-flight or ambiguous transaction,
// verifies the mined receipt, and reconciles the state to CONFIRMED or FAILED.
func (s *ExecutionService) ReconcileTransaction(ctx context.Context, requestID string) (*blockchain.PaymentExecutionResult, error) {
	existing, ok := s.store.Get(requestID)
	if !ok {
		return nil, fmt.Errorf("execution record not found for request_id %s", requestID)
	}

	if existing.Status == blockchain.StateConfirmed || existing.Status == blockchain.StateExecutionDisabled {
		return existing, nil
	}

	if existing.TransactionHash == "" {
		return existing, fmt.Errorf("cannot reconcile: no transaction hash recorded for request_id %s", requestID)
	}

	if s.blockchainClient == nil {
		return existing, fmt.Errorf("cannot reconcile: blockchain client is not initialized")
	}

	txHash := common.HexToHash(existing.TransactionHash)
	receipt, err := s.blockchainClient.TransactionReceipt(ctx, txHash)
	if err != nil || receipt == nil {
		// Still unconfirmed or receipt not yet indexed by node: preserve AMBIGUOUS status
		return existing, fmt.Errorf("receipt not yet available for tx %s: %w", existing.TransactionHash, err)
	}

	if receipt.Status == types.ReceiptStatusSuccessful {
		existing.Status = blockchain.StateConfirmed
		existing.BlockNumber = receipt.BlockNumber.String()
		existing.Error = ""
		s.store.Set(requestID, existing)
		log.Printf("[BLOCKCHAIN] Reconciled tx=%s to CONFIRMED at block=%s req_id=%s",
			existing.TransactionHash, existing.BlockNumber, requestID)
		return existing, nil
	}

	existing.Status = blockchain.StateFailed
	existing.BlockNumber = receipt.BlockNumber.String()
	existing.Error = "transaction reverted on-chain"
	s.store.Set(requestID, existing)
	log.Printf("[BLOCKCHAIN] Reconciled tx=%s to FAILED (reverted) at block=%s req_id=%s",
		existing.TransactionHash, existing.BlockNumber, requestID)
	return existing, &blockchain.ReceiptVerificationError{
		TxHash: existing.TransactionHash,
		Status: receipt.Status,
		Reason: "transaction execution reverted on-chain",
	}
}

// waitForReceipt polls for transaction confirmation until receipt is found or deadline expires.
func (s *ExecutionService) waitForReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, s.cfg.ArcConfirmationTimeout)
	defer cancel()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctxWithTimeout.Done():
			return nil, &blockchain.ConfirmationTimeoutError{TxHash: txHash.Hex()}
		case <-ticker.C:
			receipt, err := s.blockchainClient.TransactionReceipt(ctxWithTimeout, txHash)
			if err == nil && receipt != nil {
				return receipt, nil
			}
			// Not found yet, continue polling
		}
	}
}
