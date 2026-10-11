package signer_test

import (
	"context"
	"errors"
	"testing"

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
