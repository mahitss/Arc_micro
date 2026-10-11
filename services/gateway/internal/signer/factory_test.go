package signer_test

import (
	"context"
	"errors"
	"testing"

	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

// 1. Explicit KMSProvider injection produces functional KMSSigner
func TestFactory_ExplicitKMSProviderInjection(t *testing.T) {
	keyID := "arn:aws:kms:us-east-1:123456789012:key/test-key-factory"
	mockProv, err := NewMockKMSProvider(keyID, testHexKey1, "spki")
	if err != nil {
		t.Fatalf("failed to create mock provider: %v", err)
	}

	cfg := &config.Config{
		SignerBackend: "kms",
		KMSKeyID:      keyID,
		KMSRegion:     "us-east-1",
		ArcChainID:    "5042",
	}

	opts := signer.FactoryOptions{
		KMSProvider: mockProv,
	}

	s, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, opts)
	if err != nil {
		t.Fatalf("expected successful signer initialization with injected provider, got: %v", err)
	}
	if s == nil {
		t.Fatal("expected non-nil signer, got nil")
	}
	if s.Backend() != "kms" {
		t.Errorf("expected backend 'kms', got %q", s.Backend())
	}
	if s.Address().Hex() == "" {
		t.Error("expected non-empty signer address")
	}
}

// 2. SIGNER_BACKEND=kms without injected provider strictly fails closed without fallback
func TestFactory_MissingKMSProviderFailsClosed(t *testing.T) {
	cfg := &config.Config{
		SignerBackend:      "kms",
		KMSKeyID:           "arn:aws:kms:us-east-1:123456789012:key/test-key-factory",
		KMSRegion:          "us-east-1",
		ArcChainID:         "5042",
		ExecutorPrivateKey: testHexKey1, // Present, but must NOT fall back!
	}

	// Case A: NewSignerFromConfig (default options, nil provider)
	s1, err1 := signer.NewSignerFromConfig(cfg, nil)
	if s1 != nil {
		t.Fatalf("expected nil signer, got %v", s1)
	}
	if !errors.Is(err1, signer.ErrKMSSignerUnavailable) {
		t.Errorf("expected ErrKMSSignerUnavailable, got: %v", err1)
	}

	// Case B: NewSignerFromConfigWithOptions with explicit nil KMSProvider
	s2, err2 := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{KMSProvider: nil})
	if s2 != nil {
		t.Fatalf("expected nil signer, got %v", s2)
	}
	if !errors.Is(err2, signer.ErrKMSSignerUnavailable) {
		t.Errorf("expected ErrKMSSignerUnavailable, got: %v", err2)
	}
}

// 3. Safe mode defaults to local and never calls KMS/cloud APIs
func TestFactory_SafeModeOffline(t *testing.T) {
	// A: Explicit backend "local"
	cfgLocal := &config.Config{
		SignerBackend:      "local",
		ExecutorPrivateKey: testHexKey1,
		ArcChainID:         "5042",
	}
	sLocal, err := signer.NewSignerFromConfig(cfgLocal, nil)
	if err != nil {
		t.Fatalf("unexpected error for local signer: %v", err)
	}
	if sLocal.Backend() != "local" {
		t.Errorf("expected backend 'local', got %q", sLocal.Backend())
	}

	// B: Empty backend defaults to "local"
	cfgDefault := &config.Config{
		SignerBackend:      "",
		ExecutorPrivateKey: testHexKey1,
		ArcChainID:         "5042",
	}
	sDefault, err := signer.NewSignerFromConfig(cfgDefault, nil)
	if err != nil {
		t.Fatalf("unexpected error for default signer: %v", err)
	}
	if sDefault.Backend() != "local" {
		t.Errorf("expected backend 'local', got %q", sDefault.Backend())
	}
}

// 4. Invalid configurations fail closed
func TestFactory_InvalidConfigurationsFailClosed(t *testing.T) {
	// A: nil config
	_, err := signer.NewSignerFromConfig(nil, nil)
	if !errors.Is(err, signer.ErrSignerNotConfigured) {
		t.Errorf("expected ErrSignerNotConfigured for nil cfg, got: %v", err)
	}

	// B: invalid chain ID
	cfgInvalidChain := &config.Config{
		SignerBackend:      "local",
		ExecutorPrivateKey: testHexKey1,
		ArcChainID:         "-1",
	}
	_, err = signer.NewSignerFromConfig(cfgInvalidChain, nil)
	if !errors.Is(err, signer.ErrInvalidChainID) {
		t.Errorf("expected ErrInvalidChainID, got: %v", err)
	}

	// C: unsupported backend
	cfgUnsupported := &config.Config{
		SignerBackend: "azure_keyvault",
		ArcChainID:    "5042",
	}
	_, err = signer.NewSignerFromConfig(cfgUnsupported, nil)
	if !errors.Is(err, signer.ErrSignerBackendUnsupported) {
		t.Errorf("expected ErrSignerBackendUnsupported, got: %v", err)
	}
}

// 5. Signer identity matches expected deployer/executor address
func TestFactory_AddressIdentityVerification(t *testing.T) {
	keyID := "arn:aws:kms:us-east-1:123456789012:key/test-key-factory"
	mockProv, err := NewMockKMSProvider(keyID, testHexKey1, "spki")
	if err != nil {
		t.Fatalf("failed to create mock provider: %v", err)
	}

	// Derive the expected address for testHexKey1
	priv, _ := crypto.HexToECDSA(testHexKey1)
	expectedAddr := crypto.PubkeyToAddress(priv.PublicKey).Hex()
	attackerAddr := "0xdead00000000000000000000000000000000dead"

	cfg := &config.Config{
		SignerBackend: "kms",
		KMSKeyID:      keyID,
		KMSRegion:     "us-east-1",
		ArcChainID:    "5042",
	}

	// A: Matching address via FactoryOptions passes
	sMatch, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		KMSProvider:     mockProv,
		ExpectedAddress: expectedAddr,
	})
	if err != nil {
		t.Fatalf("expected matching address to succeed, got: %v", err)
	}
	if sMatch.Address().Hex() != expectedAddr {
		t.Errorf("expected address %s, got %s", expectedAddr, sMatch.Address().Hex())
	}

	// B: Mismatched address via FactoryOptions strictly fails with ErrSignerAddressMismatch
	_, err = signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		KMSProvider:     mockProv,
		ExpectedAddress: attackerAddr,
	})
	if !errors.Is(err, signer.ErrSignerAddressMismatch) {
		t.Errorf("expected ErrSignerAddressMismatch for mismatched address, got: %v", err)
	}

	// C: Matching address via Config.ExpectedExecutorAddress passes
	cfgWithAddr := &config.Config{
		SignerBackend:           "kms",
		KMSKeyID:                keyID,
		KMSRegion:               "us-east-1",
		ArcChainID:              "5042",
		ExpectedExecutorAddress: expectedAddr,
	}
	sCfgMatch, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfgWithAddr, nil, signer.FactoryOptions{
		KMSProvider: mockProv,
	})
	if err != nil {
		t.Fatalf("expected matching config address to succeed, got: %v", err)
	}
	if sCfgMatch.Address().Hex() != expectedAddr {
		t.Errorf("expected address %s, got %s", expectedAddr, sCfgMatch.Address().Hex())
	}

	// D: Mismatched address via Config.ExpectedExecutorAddress fails closed
	cfgWithWrongAddr := &config.Config{
		SignerBackend:           "kms",
		KMSKeyID:                keyID,
		KMSRegion:               "us-east-1",
		ArcChainID:              "5042",
		ExpectedExecutorAddress: attackerAddr,
	}
	_, err = signer.NewSignerFromConfigWithOptions(context.Background(), cfgWithWrongAddr, nil, signer.FactoryOptions{
		KMSProvider: mockProv,
	})
	if !errors.Is(err, signer.ErrSignerAddressMismatch) {
		t.Errorf("expected ErrSignerAddressMismatch for wrong config address, got: %v", err)
	}

	// E: Invalid non-hex address string fails closed
	_, err = signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		KMSProvider:     mockProv,
		ExpectedAddress: "not-a-valid-hex-address",
	})
	if !errors.Is(err, signer.ErrSignerAddressMismatch) {
		t.Errorf("expected ErrSignerAddressMismatch for invalid address format, got: %v", err)
	}
}

// 6. LocalSigner also enforces address identity when configured
func TestFactory_LocalSignerAddressIdentityVerification(t *testing.T) {
	priv, _ := crypto.HexToECDSA(testHexKey1)
	expectedAddr := crypto.PubkeyToAddress(priv.PublicKey).Hex()
	attackerAddr := "0xdead00000000000000000000000000000000dead"

	cfg := &config.Config{
		SignerBackend:      "local",
		ExecutorPrivateKey: testHexKey1,
		ArcChainID:         "5042",
	}

	// A: Matching address passes
	_, err := signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		ExpectedAddress: expectedAddr,
	})
	if err != nil {
		t.Fatalf("expected matching local signer address to pass, got: %v", err)
	}

	// B: Mismatched address fails closed
	_, err = signer.NewSignerFromConfigWithOptions(context.Background(), cfg, nil, signer.FactoryOptions{
		ExpectedAddress: attackerAddr,
	})
	if !errors.Is(err, signer.ErrSignerAddressMismatch) {
		t.Errorf("expected ErrSignerAddressMismatch for local signer address mismatch, got: %v", err)
	}
}
