package execution

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
)

// Service defines the interface for blockchain payment execution.
type Service interface {
	ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error)
}

// ExecutionService implements the Service interface for executing payments against AgentVault.
type ExecutionService struct {
	cfg              *config.Config
	blockchainClient blockchain.Client
	store            Store
}

// NewExecutionService creates a new ExecutionService instance.
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

// ExecutePayment processes a payment execution request.
func (s *ExecutionService) ExecutePayment(ctx context.Context, req blockchain.PaymentExecutionRequest) (*blockchain.PaymentExecutionResult, error) {
	// 1. Idempotency check: return existing result if already processed
	if existing, ok := s.store.Get(req.RequestID); ok {
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

	trimmedKey := strings.TrimSpace(strings.TrimPrefix(s.cfg.ExecutorPrivateKey, "0x"))
	if trimmedKey == "" {
		return nil, &blockchain.ConfigurationError{Reason: "EXECUTOR_PRIVATE_KEY is not configured"}
	}

	privateKey, err := crypto.HexToECDSA(trimmedKey)
	if err != nil {
		return nil, &blockchain.ConfigurationError{Reason: "invalid EXECUTOR_PRIVATE_KEY format"}
	}

	// 5. Validate Arc chain ID against connected RPC
	actualChainID, err := s.blockchainClient.ChainID(ctx)
	if err != nil {
		return nil, err
	}
	if err := blockchain.ValidateChainID(s.cfg.ArcChainID, actualChainID); err != nil {
		return nil, err
	}

	// 6. Verify executor account balance
	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)
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

	signer := types.NewLondonSigner(actualChainID)
	signedTx, err := types.SignTx(types.NewTx(txData), signer, privateKey)
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

	// 10. Wait for confirmation
	receipt, err := s.waitForReceipt(ctx, txHash)
	if err != nil {
		return nil, err
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

func privKeyToAddress(key *ecdsa.PrivateKey) common.Address {
	return crypto.PubkeyToAddress(key.PublicKey)
}
