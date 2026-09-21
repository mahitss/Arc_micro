package signer

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// NewSignerFromConfig constructs the configured TransactionSigner according to explicit configuration.
// Failure behavior: Strictly fails closed without silent fallback between backends.
func NewSignerFromConfig(cfg *config.Config, recorder AuditRecorder) (TransactionSigner, error) {
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

	switch backend {
	case "local":
		s, err := NewLocalSigner(cfg.ExecutorPrivateKey, chainID, recorder)
		if err != nil {
			return nil, err
		}
		return s, nil
	case "kms":
		// Production KMS/HSM boundary — fails fast if not available, NO SILENT FALLBACK.
		s, err := NewKMSSigner(cfg.KMSKeyID, cfg.KMSRegion, chainID, recorder)
		if err != nil {
			return nil, err
		}
		return s, nil
	default:
		return nil, fmt.Errorf("%w: %q", ErrSignerBackendUnsupported, backend)
	}
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
