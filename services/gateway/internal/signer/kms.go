package signer

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// KMSSigner provides the architectural adapter boundary for AWS KMS, Google Cloud KMS,
// or hardware security modules (HSM) implementing SECP256K1 signing.
//
// PRODUCTION READINESS STATUS: NOT IMPLEMENTED
//
// Cryptographic Signing Requirements for KMS Implementation:
// 1. Key Spec: ECC_SECG_P256K1 (secp256k1) with KeyUsage = SIGN_VERIFY.
// 2. Hash Algorithm: Keccak-256 (pre-computed off-KMS before calling Sign API with MessageType=DIGEST).
// 3. Signature Conversion: AWS KMS returns an ASN.1 DER-encoded ECDSA signature. Ethereum EIP-1559
//    requires 65-byte (R, S, V) format where S must be low-S (canonical malleable check) and V is the recovery ID (0 or 1).
// 4. Recovery ID Calculation: Must be derived by recovering the public key from (R, S) and checking which candidate (v=0 or v=1)
//    matches the KMS public key.
//
// In accordance with Day 3 instructions, this adapter refuses to fabricate fake KMS responses
// and strictly fails closed when configured.
type KMSSigner struct {
	keyID    string
	region   string
	chainID  *big.Int
	address  common.Address
	recorder AuditRecorder
}

// NewKMSSigner initializes the KMS signer boundary.
// Always returns ErrKMSSignerUnavailable in this version to prevent silent fallback or fake responses.
func NewKMSSigner(keyID, region string, chainID *big.Int, recorder AuditRecorder) (*KMSSigner, error) {
	return nil, fmt.Errorf("%w (key_id: %q, region: %q)", ErrKMSSignerUnavailable, keyID, region)
}

// Address returns the public address of the KMS key.
func (k *KMSSigner) Address() common.Address {
	return k.address
}

// ChainID returns the configured chain ID.
func (k *KMSSigner) ChainID() *big.Int {
	return new(big.Int).Set(k.chainID)
}

// Backend returns "kms".
func (k *KMSSigner) Backend() string {
	return "kms"
}

// SignTransaction implements TransactionSigner.
func (k *KMSSigner) SignTransaction(ctx context.Context, tx *types.Transaction, binding *TransactionBinding) (*types.Transaction, error) {
	return nil, ErrKMSSignerUnavailable
}
