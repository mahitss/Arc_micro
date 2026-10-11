package integration_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/asn1"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/execution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

type wiringMockKMSProvider struct {
	keyID      string
	privateKey *ecdsa.PrivateKey
}

func (m *wiringMockKMSProvider) ProviderName() string {
	return "aws_kms"
}

func (m *wiringMockKMSProvider) GetPublicKey(ctx context.Context, keyID string) ([]byte, error) {
	if keyID != m.keyID {
		return nil, fmt.Errorf("key %q not found", keyID)
	}
	return crypto.FromECDSAPub(&m.privateKey.PublicKey), nil
}

type asn1Sig struct {
	R, S *big.Int
}

func (m *wiringMockKMSProvider) SignDigest(ctx context.Context, keyID string, digest []byte) ([]byte, error) {
	if keyID != m.keyID {
		return nil, fmt.Errorf("key %q not found", keyID)
	}
	r, s, err := ecdsa.Sign(rand.Reader, m.privateKey, digest)
	if err != nil {
		return nil, err
	}
	return asn1.Marshal(asn1Sig{R: r, S: s})
}

// 1. KMS backend with valid explicit provider injection connects to execution service
func TestWiring_KMSBackendExplicitProvider(t *testing.T) {
	testPriv, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate test key: %v", err)
	}
	expectedAddr := crypto.PubkeyToAddress(testPriv.PublicKey)
	canonicalKeyARN := "arn:aws:kms:us-east-1:123456789012:key/test-key-wiring-001"

	mockProv := &wiringMockKMSProvider{
		keyID:      canonicalKeyARN,
		privateKey: testPriv,
	}

	cfg := &config.Config{
		EnableLiveExecution:     true,
		ArcChainID:              "5042",
		SignerBackend:           "kms",
		KMSKeyID:                canonicalKeyARN,
		KMSRegion:               "us-east-1",
		ExpectedExecutorAddress: expectedAddr.Hex(),
	}

	opts := signer.FactoryOptions{
		KMSProvider:     mockProv,
		ExpectedAddress: expectedAddr.Hex(),
	}

	auditRec := &signer.MemoryAuditRecorder{}
	s, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, auditRec, opts)
	if err != nil {
		t.Fatalf("failed to initialize signer with explicit provider: %v", err)
	}

	if s.Backend() != "kms" {
		t.Errorf("expected backend 'kms', got %q", s.Backend())
	}
	if s.Address() != expectedAddr {
		t.Errorf("expected address %s, got %s", expectedAddr.Hex(), s.Address().Hex())
	}

	// Verify the wired signer functions correctly in execution service
	vault := common.HexToAddress("0x2222222222222222222222222222222222222222")
	calldata := []byte("agentpay-wiring-test")
	txData := &types.DynamicFeeTx{
		ChainID:   big.NewInt(5042),
		Nonce:     0,
		GasTipCap: big.NewInt(1000000000),
		GasFeeCap: big.NewInt(2000000000),
		Gas:       100000,
		To:        &vault,
		Value:     big.NewInt(0),
		Data:      calldata,
	}
	tx := types.NewTx(txData)

	binding := &signer.TransactionBinding{
		RequestID:        "req_wiring_001",
		ChainID:          big.NewInt(5042),
		TargetVault:      vault,
		ExpectedCalldata: calldata,
	}

	signedTx, err := s.SignTransaction(context.Background(), tx, binding)
	if err != nil {
		t.Fatalf("signing failed: %v", err)
	}

	recoveredSender, err := types.Sender(types.NewLondonSigner(big.NewInt(5042)), signedTx)
	if err != nil {
		t.Fatalf("failed to recover sender: %v", err)
	}
	if recoveredSender != expectedAddr {
		t.Errorf("recovered sender %s does not match expected %s", recoveredSender.Hex(), expectedAddr.Hex())
	}
}

// 2. KMS backend with no provider fails closed without fallback
func TestWiring_KMSBackendNoProviderFailsClosed(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: true,
		ArcChainID:          "5042",
		SignerBackend:       "kms",
		KMSKeyID:            "arn:aws:kms:us-east-1:123456789012:key/test-key-wiring-002",
		KMSRegion:           "us-east-1",
		ExecutorPrivateKey:  "4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d", // Present, must NOT fallback
	}

	s, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{KMSProvider: nil})
	if s != nil {
		t.Fatalf("expected nil signer, got %v", s)
	}
	if !errors.Is(err, signer.ErrKMSSignerUnavailable) {
		t.Errorf("expected ErrKMSSignerUnavailable, got: %v", err)
	}
}

// 3. Expected executor address mismatch fails closed
func TestWiring_ExpectedExecutorAddressMismatchFailsClosed(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	canonicalKeyARN := "arn:aws:kms:us-east-1:123456789012:key/test-key-wiring-003"
	mockProv := &wiringMockKMSProvider{
		keyID:      canonicalKeyARN,
		privateKey: testPriv,
	}

	attackerAddr := "0xdead00000000000000000000000000000000dead"

	cfg := &config.Config{
		ArcChainID:              "5042",
		SignerBackend:           "kms",
		KMSKeyID:                canonicalKeyARN,
		KMSRegion:               "us-east-1",
		ExpectedExecutorAddress: attackerAddr, // Config demands attacker address
	}

	_, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		KMSProvider: mockProv,
	})
	if !errors.Is(err, signer.ErrSignerAddressMismatch) {
		t.Errorf("expected ErrSignerAddressMismatch, got: %v", err)
	}
}

// 4. Alias rejection in configuration validation
func TestWiring_AliasARNRejectedInConfig(t *testing.T) {
	cfgAliasName := &config.Config{
		EnableLiveExecution: true,
		ArcRPCURL:           "https://rpc.mainnet.arc.io",
		ArcChainID:          "5042",
		ArcUSDCAddress:      "0x3600000000000000000000000000000000000000",
		AgentVaultAddress:   "0x2222222222222222222222222222222222222222",
		SignerBackend:       "kms",
		KMSKeyID:            "alias/my-key-alias",
		KMSRegion:           "us-east-1",
	}

	err := cfgAliasName.ValidateLiveExecutionRequirements()
	if err == nil || !strings.Contains(err.Error(), "mutable KMS key aliases and alias ARNs are not permitted") {
		t.Errorf("expected alias rejection error, got: %v", err)
	}

	cfgAliasARN := &config.Config{
		EnableLiveExecution: true,
		ArcRPCURL:           "https://rpc.mainnet.arc.io",
		ArcChainID:          "5042",
		ArcUSDCAddress:      "0x3600000000000000000000000000000000000000",
		AgentVaultAddress:   "0x2222222222222222222222222222222222222222",
		SignerBackend:       "kms",
		KMSKeyID:            "arn:aws:kms:us-east-1:123456789012:alias/my-key-alias",
		KMSRegion:           "us-east-1",
	}

	err = cfgAliasARN.ValidateLiveExecutionRequirements()
	if err == nil || !strings.Contains(err.Error(), "mutable KMS key aliases and alias ARNs are not permitted") {
		t.Errorf("expected alias ARN rejection error, got: %v", err)
	}
}

// 5. Safe mode (ENABLE_LIVE_EXECUTION=false) never attempts signing or contacts AWS
func TestWiring_SafeModeNeverContactsAWS(t *testing.T) {
	cfg := &config.Config{
		EnableLiveExecution: false,
		ArcChainID:          "5042",
		SignerBackend:       "kms",
		KMSKeyID:            "arn:aws:kms:us-east-1:123456789012:key/test-safe",
		KMSRegion:           "us-east-1",
	}

	svc := execution.NewExecutionService(cfg, nil, nil)

	req := blockchain.PaymentExecutionRequest{
		RequestID:    "req_safe_mode",
		AgentID:      "agent_1",
		VaultAddress: "0x2222222222222222222222222222222222222222",
		Recipient:    "0x1111111111111111111111111111111111111111",
		Amount:       "1000000",
	}

	res, err := svc.ExecutePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error in safe mode: %v", err)
	}
	if res.Status != blockchain.StateExecutionDisabled {
		t.Errorf("expected StateExecutionDisabled, got %s", res.Status)
	}
}
