package signer

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// FactoryOptions provides explicit dependency injection hooks for signer construction.
// This ensures that the production KMS provider is explicitly provided rather than
// silently initialized or falling back to local signers.
type FactoryOptions struct {
	// KMSProvider allows explicit injection of an initialized, validated KMS provider (e.g. awskms.Provider).
	// If SIGNER_BACKEND=kms and KMSProvider is nil, factory strictly fails closed with ErrKMSSignerUnavailable.
	KMSProvider KMSProvider

	// ExpectedAddress, if non-empty, enforces that the derived signer address matches this address.
	ExpectedAddress string
}

// NewSignerFromConfig constructs the configured TransactionSigner according to explicit configuration.
// Failure behavior: Strictly fails closed without silent fallback between backends.
func NewSignerFromConfig(cfg *config.Config, recorder AuditRecorder) (TransactionSigner, error) {
	return NewSignerFromConfigWithOptions(context.Background(), cfg, recorder, FactoryOptions{})
}

// NewSignerFromConfigWithContext constructs the configured TransactionSigner with a caller-provided context.
// Failure behavior: Strictly fails closed without silent fallback between backends.
func NewSignerFromConfigWithContext(ctx context.Context, cfg *config.Config, recorder AuditRecorder) (TransactionSigner, error) {
	return NewSignerFromConfigWithOptions(ctx, cfg, recorder, FactoryOptions{})
}

// NewSignerFromConfigWithOptions constructs the configured TransactionSigner with explicit factory options.
// Failure behavior: Strictly fails closed without silent fallback between backends.
func NewSignerFromConfigWithOptions(ctx context.Context, cfg *config.Config, recorder AuditRecorder, opts FactoryOptions) (TransactionSigner, error) {
	if cfg == nil {
		return nil, ErrSignerNotConfigured
	}

	chainIDStr := strings.TrimSpace(cfg.ArcChainID)
	if chainIDStr == "" {
		chainIDStr = "5042"
	}
	chainID, ok := new(big.Int).SetString(chainIDStr, 10)
	if !ok || chainID.Sign() <= 0 {
		return nil, fmt.Errorf("%w: invalid configured chain ID %q", ErrInvalidChainID, chainIDStr)
	}

	backend := strings.ToLower(strings.TrimSpace(cfg.SignerBackend))
	if backend == "" {
		backend = "local"
	}

	var s TransactionSigner
	switch backend {
	case "local":
		localSigner, err := NewLocalSigner(cfg.ExecutorPrivateKey, chainID, recorder)
		if err != nil {
			return nil, err
		}
		s = localSigner
	case "kms":
		// Production KMS/HSM boundary — requires explicitly injected, approved KMSProvider.
		// Never silently creates cloud clients or connects to cloud endpoints.
		if opts.KMSProvider == nil {
			return nil, fmt.Errorf("%w: SIGNER_BACKEND=kms requires an explicitly configured, approved KMSProvider (key_id: %q, region: %q)",
				ErrKMSSignerUnavailable, cfg.KMSKeyID, cfg.KMSRegion)
		}
		kmsSigner, err := NewKMSSignerWithContext(ctx, cfg.KMSKeyID, cfg.KMSRegion, chainID, recorder, opts.KMSProvider)
		if err != nil {
			return nil, err
		}
		s = kmsSigner
	default:
		return nil, fmt.Errorf("%w: %q", ErrSignerBackendUnsupported, backend)
	}

	// Address identity verification: verify signer matches expected deployer/executor address if configured
	expectedAddrStr := strings.TrimSpace(opts.ExpectedAddress)
	if expectedAddrStr == "" {
		expectedAddrStr = strings.TrimSpace(cfg.ExpectedExecutorAddress)
	}
	if expectedAddrStr != "" {
		if !common.IsHexAddress(expectedAddrStr) {
			return nil, fmt.Errorf("%w: invalid expected executor address %q", ErrSignerAddressMismatch, expectedAddrStr)
		}
		expectedAddr := common.HexToAddress(expectedAddrStr)
		if s.Address() != expectedAddr {
			return nil, fmt.Errorf("%w: derived signer address %s does not match expected address %s",
				ErrSignerAddressMismatch, s.Address().Hex(), expectedAddr.Hex())
		}
	}

	return s, nil
}

// StorageAuditRecorder adapts a storage.Repository to record signing audit events.
type StorageAuditRecorder struct {
	repo storage.Repository
}

// NewStorageAuditRecorder creates an AuditRecorder that persists events via storage.Repository.
func NewStorageAuditRecorder(repo storage.Repository) *StorageAuditRecorder {
	return &StorageAuditRecorder{repo: repo}
}

// RecordSigningEvent saves a safe audit event record to the repository.
func (r *StorageAuditRecorder) RecordSigningEvent(ctx context.Context, evt *SigningAuditEvent) error {
	if r.repo == nil || evt == nil {
		return nil
	}

	metaJSON, _ := json.Marshal(map[string]interface{}{
		"signer_backend":       evt.SignerBackend,
		"signer_address":       evt.SignerAddress.Hex(),
		"chain_id":             evt.ChainID.String(),
		"destination_vault":    evt.DestinationVault.Hex(),
		"calldata_sha256_hash": evt.CalldataSHA256Hash,
		"amount":               evt.Amount,
		"success":              evt.Success,
		"error":                evt.ErrorMessage,
	})

	eventType := "transaction.signed"
	if !evt.Success {
		eventType = "transaction.signing_failed"
	}

	storageEvt := &storage.AuditEvent{
		ID:             evt.ID,
		OrganizationID: "org_system",
		EventType:      eventType,
		ActorType:      "SIGNER",
		ActorID:        evt.SignerAddress.Hex(),
		ResourceType:   "TRANSACTION",
		ResourceID:     evt.RequestID,
		RequestID:      evt.RequestID,
		Timestamp:      evt.Timestamp,
		Metadata:       string(metaJSON),
	}

	return r.repo.SaveAuditEvent(ctx, storageEvt)
}

// MemoryAuditRecorder stores signing audit events in memory for testing and inspection.
type MemoryAuditRecorder struct {
	Events []*SigningAuditEvent
}

// RecordSigningEvent stores the event in an in-memory slice.
func (m *MemoryAuditRecorder) RecordSigningEvent(ctx context.Context, evt *SigningAuditEvent) error {
	if evt != nil {
		copyEvt := *evt
		m.Events = append(m.Events, &copyEvt)
	}
	return nil
}

// LastEvent returns the most recently recorded event, or nil.
func (m *MemoryAuditRecorder) LastEvent() *SigningAuditEvent {
	if len(m.Events) == 0 {
		return nil
	}
	return m.Events[len(m.Events)-1]
}
