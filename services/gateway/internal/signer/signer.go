package signer

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// TransactionSigner abstracts cryptographic signing of EIP-1559 transactions for AgentPay.
// Implementations include LocalSigner (for development/testing) and KMSSigner (for production HSMs).
type TransactionSigner interface {
	// Address returns the public Ethereum address of the signing identity.
	Address() common.Address

	// ChainID returns the authoritative chain ID for which this signer is configured.
	ChainID() *big.Int

	// Backend returns the signer identifier (e.g. "local", "kms").
	Backend() string

	// SignTransaction signs the transaction after verifying its transaction binding.
	SignTransaction(ctx context.Context, tx *types.Transaction, binding *TransactionBinding) (*types.Transaction, error)
}

// TransactionBinding enforces defense-in-depth: the signer will only sign transactions
// that strictly match the immutable parameters authorized by the AgentPay execution gate.
type TransactionBinding struct {
	RequestID        string
	ChainID          *big.Int
	TargetVault      common.Address
	ExpectedCalldata []byte
	ExpectedAmount   string
}

// SigningAuditEvent records safe, auditable metadata regarding a signing attempt.
// Invariant: NEVER contains private keys, secret credentials, or raw unverified signatures.
type SigningAuditEvent struct {
	ID                 string         `json:"id"`
	RequestID          string         `json:"request_id"`
	SignerBackend      string         `json:"signer_backend"`
	SignerAddress      common.Address `json:"signer_address"`
	ChainID            *big.Int       `json:"chain_id"`
	DestinationVault   common.Address `json:"destination_vault"`
	CalldataSHA256Hash string         `json:"calldata_sha256_hash"`
	Amount             string         `json:"amount"`
	Success            bool           `json:"success"`
	ErrorMessage       string         `json:"error_message,omitempty"`
	Timestamp          time.Time      `json:"timestamp"`
}

// AuditRecorder is an interface implemented by audit loggers / storage repositories.
type AuditRecorder interface {
	RecordSigningEvent(ctx context.Context, event *SigningAuditEvent) error
}

// HashCalldata computes a deterministic SHA-256 digest of transaction calldata.
func HashCalldata(data []byte) string {
	if len(data) == 0 {
		return ""
	}
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
