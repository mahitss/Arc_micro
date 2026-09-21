package signer_test

import (
	"bytes"
	"context"
	"errors"
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

// Deterministic test keys and addresses (Hardhat/Anvil well-known test keys - NEVER used in production)
const (
	testHexKey1  = "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
	testHexKey2  = "6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
	testChainID  = int64(5042)
	testVaultHex = "0x2222222222222222222222222222222222222222"
	testRecipHex = "0x1111111111111111111111111111111111111111"
)

func buildSampleTx(chainID *big.Int, to common.Address, value *big.Int, data []byte) *types.Transaction {
	txData := &types.DynamicFeeTx{
		ChainID:   chainID,
		Nonce:     1,
		GasTipCap: big.NewInt(1000000000),
		GasFeeCap: big.NewInt(2000000000),
		Gas:       150000,
		To:        &to,
		Value:     value,
		Data:      data,
	}
	return types.NewTx(txData)
}

// 1. Local signer signs valid transaction
func TestLocalSigner_SignValidTransaction(t *testing.T) {
	chainID := big.NewInt(testChainID)
	rec := &signer.MemoryAuditRecorder{}
	s, err := signer.NewLocalSigner(testHexKey1, chainID, rec)
	if err != nil {
		t.Fatalf("failed to create local signer: %v", err)
	}

	vault := common.HexToAddress(testVaultHex)
	data := []byte{0xde, 0xad, 0xbe, 0xef}
	tx := buildSampleTx(chainID, vault, big.NewInt(0), data)

	binding := &signer.TransactionBinding{
		RequestID:        "req_valid_1",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: data,
		ExpectedAmount:   "100000",
	}

	signedTx, err := s.SignTransaction(context.Background(), tx, binding)
	if err != nil {
		t.Fatalf("signing failed: %v", err)
	}

	if signedTx == nil {
		t.Fatal("expected signed transaction, got nil")
	}

	// 2. Signature recovers expected signer address
	londonSigner := types.NewLondonSigner(chainID)
	recovered, err := types.Sender(londonSigner, signedTx)
	if err != nil {
		t.Fatalf("failed to recover sender from signed tx: %v", err)
	}
	if recovered != s.Address() {
		t.Errorf("recovered address %s does not match signer address %s", recovered.Hex(), s.Address().Hex())
	}
}

// 3. Address derivation matches expected public key
func TestLocalSigner_AddressDerivation(t *testing.T) {
	chainID := big.NewInt(testChainID)
	s, err := signer.NewLocalSigner(testHexKey1, chainID, nil)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	rawPriv, _ := crypto.HexToECDSA(testHexKey1)
	expectedAddr := crypto.PubkeyToAddress(rawPriv.PublicKey)

	if s.Address() != expectedAddr {
		t.Errorf("address mismatch: got %s, expected %s", s.Address().Hex(), expectedAddr.Hex())
	}
}

// 4. Invalid chain ID is rejected
func TestLocalSigner_InvalidChainIDRejected(t *testing.T) {
	chainID := big.NewInt(testChainID)
	s, err := signer.NewLocalSigner(testHexKey1, chainID, nil)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	vault := common.HexToAddress(testVaultHex)
	// Transaction has chain ID 1 instead of 5042
	wrongTx := buildSampleTx(big.NewInt(1), vault, big.NewInt(0), []byte{0x01})

	binding := &signer.TransactionBinding{
		RequestID:        "req_chain_mismatch",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: []byte{0x01},
	}

	_, err = s.SignTransaction(context.Background(), wrongTx, binding)
	if err == nil {
		t.Fatal("expected error for chain ID mismatch, got nil")
	}
	if !errors.Is(err, signer.ErrInvalidChainID) {
		t.Errorf("expected ErrInvalidChainID, got %v", err)
	}
}

// 5. Nil transaction is rejected
func TestLocalSigner_NilTransactionRejected(t *testing.T) {
	chainID := big.NewInt(testChainID)
	s, err := signer.NewLocalSigner(testHexKey1, chainID, nil)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	_, err = s.SignTransaction(context.Background(), nil, nil)
	if err == nil {
		t.Fatal("expected error for nil tx, got nil")
	}
	if !errors.Is(err, signer.ErrNilTransaction) {
		t.Errorf("expected ErrNilTransaction, got %v", err)
	}
}

// 6. Missing or malformed signer configuration fails
func TestLocalSigner_InvalidKeyConfiguration(t *testing.T) {
	chainID := big.NewInt(testChainID)

	// Empty key
	_, err := signer.NewLocalSigner("", chainID, nil)
	if !errors.Is(err, signer.ErrEmptyPrivateKey) {
		t.Errorf("expected ErrEmptyPrivateKey for empty key, got %v", err)
	}

	// Truncated key (not 64 hex characters)
	_, err = signer.NewLocalSigner("deadbeef", chainID, nil)
	if !errors.Is(err, signer.ErrInvalidPrivateKeyLength) {
		t.Errorf("expected ErrInvalidPrivateKeyLength, got %v", err)
	}

	// Non-positive chain ID
	_, err = signer.NewLocalSigner(testHexKey1, big.NewInt(0), nil)
	if !errors.Is(err, signer.ErrInvalidChainID) {
		t.Errorf("expected ErrInvalidChainID for chainID=0, got %v", err)
	}
}

// 7. Unsupported signer backend fails
func TestSignerFactory_UnsupportedBackend(t *testing.T) {
	cfg := &config.Config{
		SignerBackend: "vault_transit",
		ArcChainID:    "5042",
	}

	_, err := signer.NewSignerFromConfig(cfg, nil)
	if err == nil {
		t.Fatal("expected error for unsupported backend, got nil")
	}
	if !errors.Is(err, signer.ErrSignerBackendUnsupported) {
		t.Errorf("expected ErrSignerBackendUnsupported, got %v", err)
	}
}

// 8. KMS backend fails closed without silent fallback to local
func TestSignerFactory_KMSFailsClosedWithoutSilentFallback(t *testing.T) {
	cfg := &config.Config{
		SignerBackend:      "kms",
		KMSKeyID:           "arn:aws:kms:us-east-1:123456789012:key/test-key-id",
		KMSRegion:          "us-east-1",
		ArcChainID:         "5042",
		ExecutorPrivateKey: testHexKey1, // Present, but MUST NOT be used as fallback!
	}

	s, err := signer.NewSignerFromConfig(cfg, nil)
	if err == nil {
		t.Fatal("expected error when SIGNER_BACKEND=kms, got initialized signer")
	}
	if s != nil {
		t.Fatalf("expected nil signer on KMS failure, got %v", s)
	}
	if !errors.Is(err, signer.ErrKMSSignerUnavailable) {
		t.Errorf("expected ErrKMSSignerUnavailable, got: %v", err)
	}
	if !strings.Contains(err.Error(), "KMS signer configured but not available") {
		t.Errorf("error message did not contain required text, got: %v", err)
	}
}

// 9. Signer never modifies transaction fields during signing
func TestLocalSigner_PreservesTransactionFields(t *testing.T) {
	chainID := big.NewInt(testChainID)
	s, err := signer.NewLocalSigner(testHexKey1, chainID, nil)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	vault := common.HexToAddress(testVaultHex)
	data := []byte{0xaa, 0xbb, 0xcc, 0xdd}
	unsignedTx := buildSampleTx(chainID, vault, big.NewInt(0), data)

	binding := &signer.TransactionBinding{
		RequestID:        "req_preserve_fields",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: data,
	}

	signedTx, err := s.SignTransaction(context.Background(), unsignedTx, binding)
	if err != nil {
		t.Fatalf("unexpected signing error: %v", err)
	}

	if signedTx.ChainId().Cmp(unsignedTx.ChainId()) != 0 {
		t.Errorf("chain ID modified: got %s, expected %s", signedTx.ChainId(), unsignedTx.ChainId())
	}
	if signedTx.Nonce() != unsignedTx.Nonce() {
		t.Errorf("nonce modified: got %d, expected %d", signedTx.Nonce(), unsignedTx.Nonce())
	}
	if *signedTx.To() != *unsignedTx.To() {
		t.Errorf("to address modified: got %s, expected %s", signedTx.To().Hex(), unsignedTx.To().Hex())
	}
	if signedTx.Value().Cmp(unsignedTx.Value()) != 0 {
		t.Errorf("value modified: got %s, expected %s", signedTx.Value(), unsignedTx.Value())
	}
	if signedTx.Gas() != unsignedTx.Gas() {
		t.Errorf("gas limit modified: got %d, expected %d", signedTx.Gas(), unsignedTx.Gas())
	}
	if !bytes.Equal(signedTx.Data(), unsignedTx.Data()) {
		t.Errorf("calldata modified: got %x, expected %x", signedTx.Data(), unsignedTx.Data())
	}
}

// 10. Audit event is generated appropriately with safe metadata and SHA-256 hash
func TestLocalSigner_AuditTrailGeneration(t *testing.T) {
	chainID := big.NewInt(testChainID)
	rec := &signer.MemoryAuditRecorder{}
	s, err := signer.NewLocalSigner(testHexKey1, chainID, rec)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	vault := common.HexToAddress(testVaultHex)
	calldata := []byte("agentpay-safe-calldata")
	tx := buildSampleTx(chainID, vault, big.NewInt(0), calldata)

	binding := &signer.TransactionBinding{
		RequestID:        "req_audit_test",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: calldata,
		ExpectedAmount:   "500000",
	}

	_, err = s.SignTransaction(context.Background(), tx, binding)
	if err != nil {
		t.Fatalf("unexpected signing error: %v", err)
	}

	if len(rec.Events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(rec.Events))
	}

	evt := rec.LastEvent()
	if evt.RequestID != "req_audit_test" {
		t.Errorf("audit event request ID mismatch: %s", evt.RequestID)
	}
	if evt.SignerBackend != "local" {
		t.Errorf("audit backend mismatch: %s", evt.SignerBackend)
	}
	if evt.SignerAddress != s.Address() {
		t.Errorf("audit signer address mismatch: got %s, expected %s", evt.SignerAddress.Hex(), s.Address().Hex())
	}
	if evt.DestinationVault != vault {
		t.Errorf("audit destination vault mismatch: %s", evt.DestinationVault.Hex())
	}
	if !evt.Success {
		t.Errorf("expected audit event success=true, got false")
	}

	expectedHash := signer.HashCalldata(calldata)
	if evt.CalldataSHA256Hash != expectedHash {
		t.Errorf("audit calldata hash mismatch: got %s, expected %s", evt.CalldataSHA256Hash, expectedHash)
	}
}

// 11. Private key is NEVER exposed in String() or errors
func TestLocalSigner_NoPrivateKeyLeakage(t *testing.T) {
	chainID := big.NewInt(testChainID)
	s, err := signer.NewLocalSigner(testHexKey1, chainID, nil)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	strRepr := s.String()
	if strings.Contains(strRepr, testHexKey1) {
		t.Fatalf("CRITICAL SECURITY VULNERABILITY: LocalSigner.String() leaked private key: %s", strRepr)
	}

	// Trigger error on mismatched chain ID and check error text
	vault := common.HexToAddress(testVaultHex)
	wrongTx := buildSampleTx(big.NewInt(9999), vault, big.NewInt(0), []byte{0x01})
	_, signErr := s.SignTransaction(context.Background(), wrongTx, nil)
	if signErr != nil {
		if strings.Contains(signErr.Error(), testHexKey1) {
			t.Fatalf("CRITICAL SECURITY VULNERABILITY: sign error leaked private key: %v", signErr)
		}
	}
}

// ============================================================
// PHASE 13 — SECURITY TEST: TRANSACTION BINDING ENFORCEMENT
// ============================================================
// Proves: An attacker or rogue middleware that attempts to alter the
// recipient, destination vault, value, or calldata after the execution gate
// is unequivocally REJECTED by the signer boundary.
func TestSecurity_TransactionBindingRejectsPostGateMutation(t *testing.T) {
	chainID := big.NewInt(testChainID)
	rec := &signer.MemoryAuditRecorder{}
	s, err := signer.NewLocalSigner(testHexKey1, chainID, rec)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}

	approvedVault := common.HexToAddress(testVaultHex)
	approvedRecipient := common.HexToAddress(testRecipHex)
	approvedAmount := big.NewInt(5000000) // 5 USDC
	approvedPurpose := blockchain.PurposeToBytes32("agent_compute_allowance")

	authorizedCalldata, err := blockchain.PackExecutePayment(approvedRecipient, approvedAmount, approvedPurpose)
	if err != nil {
		t.Fatalf("failed to pack authorized calldata: %v", err)
	}

	// Baseline authorized binding established by the execution gate
	authorizedBinding := &signer.TransactionBinding{
		RequestID:        "sec_req_001",
		ChainID:          chainID,
		TargetVault:      approvedVault,
		ExpectedCalldata: authorizedCalldata,
		ExpectedAmount:   "5000000",
	}

	t.Run("Mutated_Recipient_In_Calldata_Rejected", func(t *testing.T) {
		attackerRecipient := common.HexToAddress("0xdead00000000000000000000000000000000dead")
		mutatedCalldata, _ := blockchain.PackExecutePayment(attackerRecipient, approvedAmount, approvedPurpose)

		// Adversary attempts to sign a transaction with mutated calldata pointing to attacker
		tamperedTx := buildSampleTx(chainID, approvedVault, big.NewInt(0), mutatedCalldata)

		_, err := s.SignTransaction(context.Background(), tamperedTx, authorizedBinding)
		if err == nil {
			t.Fatal("SECURITY FAILURE: Signer signed transaction with mutated recipient calldata!")
		}
		if !errors.Is(err, signer.ErrTransactionBindingMismatch) {
			t.Errorf("expected ErrTransactionBindingMismatch, got: %v", err)
		}
		if !strings.Contains(err.Error(), "calldata was mutated post-authorization") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("Mutated_Destination_Vault_Rejected", func(t *testing.T) {
		attackerVault := common.HexToAddress("0x6666666666666666666666666666666666666666")
		tamperedTx := buildSampleTx(chainID, attackerVault, big.NewInt(0), authorizedCalldata)

		_, err := s.SignTransaction(context.Background(), tamperedTx, authorizedBinding)
		if err == nil {
			t.Fatal("SECURITY FAILURE: Signer signed transaction targeting unauthorized contract address!")
		}
		if !errors.Is(err, signer.ErrTransactionBindingMismatch) {
			t.Errorf("expected ErrTransactionBindingMismatch, got: %v", err)
		}
		if !strings.Contains(err.Error(), "destination address mismatch") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("Mutated_Native_Ether_Value_Rejected", func(t *testing.T) {
		// Adversary attempts to drain native gas token by setting tx.Value > 0
		tamperedTx := buildSampleTx(chainID, approvedVault, big.NewInt(1000000000000000000), authorizedCalldata)

		_, err := s.SignTransaction(context.Background(), tamperedTx, authorizedBinding)
		if err == nil {
			t.Fatal("SECURITY FAILURE: Signer signed transaction with non-zero native ether value!")
		}
		if !errors.Is(err, signer.ErrTransactionBindingMismatch) {
			t.Errorf("expected ErrTransactionBindingMismatch, got: %v", err)
		}
		if !strings.Contains(err.Error(), "unexpected native token value") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	t.Run("Mutated_Chain_ID_In_Binding_Rejected", func(t *testing.T) {
		tamperedBinding := *authorizedBinding
		tamperedBinding.ChainID = big.NewInt(1) // Ethereum Mainnet instead of Arc Mainnet

		tx := buildSampleTx(chainID, approvedVault, big.NewInt(0), authorizedCalldata)

		_, err := s.SignTransaction(context.Background(), tx, &tamperedBinding)
		if err == nil {
			t.Fatal("SECURITY FAILURE: Signer signed transaction with mismatched binding chain ID!")
		}
		if !errors.Is(err, signer.ErrTransactionBindingMismatch) {
			t.Errorf("expected ErrTransactionBindingMismatch, got: %v", err)
		}
	})
}
