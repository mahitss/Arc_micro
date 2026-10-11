package signer

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/asn1"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

// KMSProvider abstracts the cloud hardware security module (AWS KMS, GCP Cloud KMS, etc.).
// It restricts capabilities strictly to SECP256K1 public key retrieval and 32-byte digest signing.
type KMSProvider interface {
	// ProviderName returns the identifier of the underlying KMS provider (e.g., "aws_kms", "gcp_kms", "mock_kms").
	ProviderName() string

	// GetPublicKey retrieves the SECP256K1 public key in ASN.1 SubjectPublicKeyInfo (SPKI) DER or 65-byte uncompressed format.
	GetPublicKey(ctx context.Context, keyID string) ([]byte, error)

	// SignDigest requests the HSM to sign a pre-computed 32-byte digest (Keccak-256 of the EIP-1559 tx).
	// Returns the ASN.1 DER-encoded ECDSA signature: SEQUENCE { r INTEGER, s INTEGER }.
	SignDigest(ctx context.Context, keyID string, digest []byte) ([]byte, error)
}

// KMSSigner implements TransactionSigner using a cloud KMS / HSM provider.
type KMSSigner struct {
	keyID    string
	region   string
	chainID  *big.Int
	address  common.Address
	recorder AuditRecorder
	provider KMSProvider
}

// asn1ECDSASig represents the ASN.1 DER sequence returned by AWS KMS / GCP KMS.
type asn1ECDSASig struct {
	R, S *big.Int
}

// NewKMSSigner initializes a KMSSigner without an explicit provider.
// This strictly fails closed with ErrKMSSignerUnavailable to prevent silent fallback or fake responses.
func NewKMSSigner(keyID, region string, chainID *big.Int, recorder AuditRecorder) (*KMSSigner, error) {
	return NewKMSSignerWithProvider(keyID, region, chainID, recorder, nil)
}

// NewKMSSignerWithProvider initializes a KMSSigner with an explicit KMSProvider.
// If provider is nil, it strictly fails closed with ErrKMSSignerUnavailable.
func NewKMSSignerWithProvider(keyID, region string, chainID *big.Int, recorder AuditRecorder, provider KMSProvider) (*KMSSigner, error) {
	if chainID == nil || chainID.Sign() <= 0 {
		return nil, ErrInvalidChainID
	}

	trimmedKeyID := strings.TrimSpace(keyID)
	trimmedRegion := strings.TrimSpace(region)

	if provider == nil {
		return nil, fmt.Errorf("%w (key_id: %q, region: %q)", ErrKMSSignerUnavailable, trimmedKeyID, trimmedRegion)
	}

	if trimmedKeyID == "" {
		return nil, ErrInvalidKMSKeyID
	}

	if trimmedRegion == "" {
		return nil, ErrInvalidKMSRegion
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pubBytes, err := provider.GetPublicKey(ctx, trimmedKeyID)
	if err != nil {
		return nil, fmt.Errorf("%w: failed to retrieve KMS public key: %v", ErrInvalidKMSPublicKey, err)
	}

	address, err := ParseKMSPublicKey(pubBytes)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidKMSPublicKey, err)
	}

	return &KMSSigner{
		keyID:    trimmedKeyID,
		region:   trimmedRegion,
		chainID:  new(big.Int).Set(chainID),
		address:  address,
		recorder: recorder,
		provider: provider,
	}, nil
}

// Address returns the public Ethereum address of the KMS key.
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

// ProviderName returns the name of the underlying KMS provider.
func (k *KMSSigner) ProviderName() string {
	if k.provider == nil {
		return "none"
	}
	return k.provider.ProviderName()
}

// String implements fmt.Stringer to ensure keys/credentials are NEVER revealed via reflection, prints, or logs.
func (k *KMSSigner) String() string {
	return fmt.Sprintf("KMSSigner{address: %s, chain_id: %s, backend: kms, provider: %s}",
		k.address.Hex(), k.chainID.String(), k.ProviderName())
}

// SignTransaction signs an EIP-1559 transaction via the KMS provider after validating transaction bindings.
func (k *KMSSigner) SignTransaction(ctx context.Context, tx *types.Transaction, binding *TransactionBinding) (*types.Transaction, error) {
	now := time.Now()

	// 1. Transaction validity checks
	if tx == nil {
		k.recordAudit(ctx, binding, nil, false, ErrNilTransaction.Error(), now)
		return nil, ErrNilTransaction
	}

	// 2. Chain ID validation
	if tx.ChainId().Cmp(k.chainID) != 0 {
		err := fmt.Errorf("%w: transaction has chain ID %s, signer configured for %s",
			ErrInvalidChainID, tx.ChainId().String(), k.chainID.String())
		k.recordAudit(ctx, binding, tx, false, err.Error(), now)
		return nil, err
	}

	// 3. Transaction Binding Verification (Defense-in-depth against mutation)
	if binding != nil {
		if err := k.verifyBinding(tx, binding); err != nil {
			k.recordAudit(ctx, binding, tx, false, err.Error(), now)
			return nil, err
		}
	}

	// 4. Ensure provider is operational
	if k.provider == nil {
		k.recordAudit(ctx, binding, tx, false, ErrKMSSignerUnavailable.Error(), now)
		return nil, ErrKMSSignerUnavailable
	}

	// 5. Compute EIP-1559 Keccak-256 transaction digest
	londonSigner := types.NewLondonSigner(k.chainID)
	txHash := londonSigner.Hash(tx)

	// 6. Request signature from KMS HSM
	derSignature, err := k.provider.SignDigest(ctx, k.keyID, txHash.Bytes())
	if err != nil {
		signingErr := fmt.Errorf("%w: %v", ErrKMSProviderFailed, err)
		k.recordAudit(ctx, binding, tx, false, signingErr.Error(), now)
		return nil, signingErr
	}

	// 7. Decode ASN.1 DER and apply low-S canonical malleability normalization
	r, s, err := DecodeAndNormalizeDERSignature(derSignature)
	if err != nil {
		k.recordAudit(ctx, binding, tx, false, err.Error(), now)
		return nil, err
	}

	// 8. Derive Recovery ID (V) by matching candidate public key against k.address
	sig65, err := DeriveRecoveryID(txHash.Bytes(), r, s, k.address)
	if err != nil {
		k.recordAudit(ctx, binding, tx, false, err.Error(), now)
		return nil, err
	}

	// 9. Attach cryptographic signature to transaction
	signedTx, err := tx.WithSignature(londonSigner, sig65)
	if err != nil {
		signingErr := fmt.Errorf("%w: failed to attach signature: %v", ErrSigningFailed, err)
		k.recordAudit(ctx, binding, tx, false, signingErr.Error(), now)
		return nil, signingErr
	}

	// 10. Verify cryptographic sender matches expected KMS address
	sender, err := types.Sender(londonSigner, signedTx)
	if err != nil || sender != k.address {
		errMismatch := fmt.Errorf("%w: recovered %s, expected %s", ErrSignerAddressMismatch, sender.Hex(), k.address.Hex())
		k.recordAudit(ctx, binding, tx, false, errMismatch.Error(), now)
		return nil, errMismatch
	}

	// 11. Record successful signing audit event
	k.recordAudit(ctx, binding, signedTx, true, "", now)

	return signedTx, nil
}

// DecodeAndNormalizeDERSignature parses an ASN.1 DER ECDSA signature and enforces canonical low-S (EIP-2).
func DecodeAndNormalizeDERSignature(derBytes []byte) (*big.Int, *big.Int, error) {
	if len(derBytes) == 0 {
		return nil, nil, fmt.Errorf("%w: empty signature bytes", ErrMalformedKMSSignature)
	}

	var sig asn1ECDSASig
	rest, err := asn1.Unmarshal(derBytes, &sig)
	if err != nil || len(rest) > 0 {
		return nil, nil, fmt.Errorf("%w: failed to unmarshal ASN.1 DER: %v", ErrMalformedKMSSignature, err)
	}

	if sig.R == nil || sig.S == nil {
		return nil, nil, fmt.Errorf("%w: nil R or S in signature", ErrMalformedKMSSignature)
	}

	curveOrder := crypto.S256().Params().N

	// R and S must be in range [1, N-1]
	if sig.R.Sign() <= 0 || sig.S.Sign() <= 0 || sig.R.Cmp(curveOrder) >= 0 || sig.S.Cmp(curveOrder) >= 0 {
		return nil, nil, fmt.Errorf("%w: R or S out of valid secp256k1 range", ErrMalformedKMSSignature)
	}

	// EIP-2 / Canonical malleability protection:
	// S must be in the lower half of the curve order: s <= N/2. If s > N/2, s = N - s.
	halfOrder := new(big.Int).Rsh(curveOrder, 1)
	if sig.S.Cmp(halfOrder) > 0 {
		sig.S = new(big.Int).Sub(curveOrder, sig.S)
	}

	return sig.R, sig.S, nil
}

// DeriveRecoveryID evaluates candidate recovery IDs (0 and 1) to determine which candidate
// reconstructs the expected Ethereum address from the 32-byte digest and (R, S).
func DeriveRecoveryID(digest []byte, r, s *big.Int, expectedAddress common.Address) ([]byte, error) {
	if len(digest) != 32 {
		return nil, fmt.Errorf("%w: digest must be 32 bytes, got %d", ErrSigningFailed, len(digest))
	}
	if r == nil || s == nil {
		return nil, fmt.Errorf("%w: nil R or S", ErrSigningFailed)
	}

	rBytes := common.LeftPadBytes(r.Bytes(), 32)
	sBytes := common.LeftPadBytes(s.Bytes(), 32)

	sig65 := make([]byte, 65)
	copy(sig65[0:32], rBytes)
	copy(sig65[32:64], sBytes)

	// Try both recovery ID candidates: 0 and 1
	for v := byte(0); v <= 1; v++ {
		sig65[64] = v

		recoveredPubKeyBytes, err := crypto.Ecrecover(digest, sig65)
		if err != nil {
			continue
		}

		recoveredPubKey, err := crypto.UnmarshalPubkey(recoveredPubKeyBytes)
		if err != nil {
			continue
		}

		recoveredAddr := crypto.PubkeyToAddress(*recoveredPubKey)
		if recoveredAddr == expectedAddress {
			result := make([]byte, 65)
			copy(result, sig65)
			return result, nil
		}
	}

	return nil, fmt.Errorf("%w: neither recovery candidate (v=0, v=1) matched address %s",
		ErrSignatureRecoveryFailed, expectedAddress.Hex())
}

// subjectPublicKeyInfo represents the ASN.1 SubjectPublicKeyInfo structure (RFC 5280).
type subjectPublicKeyInfo struct {
	Algorithm        pkixAlgorithmIdentifier
	SubjectPublicKey asn1.BitString
}

type pkixAlgorithmIdentifier struct {
	Algorithm  asn1.ObjectIdentifier
	Parameters asn1.RawValue
}

// ParseKMSPublicKey parses a public key from either ASN.1 SubjectPublicKeyInfo (SPKI) DER
// or standard 65-byte uncompressed point format (0x04 || X || Y) into an Ethereum address.
func ParseKMSPublicKey(pubBytes []byte) (common.Address, error) {
	if len(pubBytes) == 0 {
		return common.Address{}, fmt.Errorf("empty public key bytes")
	}

	// 1. Try standard uncompressed 65-byte point (0x04 || X || Y)
	if len(pubBytes) == 65 && pubBytes[0] == 0x04 {
		pubKey, err := crypto.UnmarshalPubkey(pubBytes)
		if err == nil {
			return crypto.PubkeyToAddress(*pubKey), nil
		}
	}

	// 2. Try raw compressed 33-byte point (0x02 or 0x03)
	if len(pubBytes) == 33 && (pubBytes[0] == 0x02 || pubBytes[0] == 0x03) {
		pubKey, err := crypto.DecompressPubkey(pubBytes)
		if err == nil {
			return crypto.PubkeyToAddress(*pubKey), nil
		}
	}

	// 3. Try ASN.1 SubjectPublicKeyInfo (X.509 SPKI) DER format (standard AWS KMS / GCP KMS response)
	var spki subjectPublicKeyInfo
	rest, err := asn1.Unmarshal(pubBytes, &spki)
	if err == nil && len(rest) == 0 {
		keyBytes := spki.SubjectPublicKey.Bytes
		if len(keyBytes) == 65 && keyBytes[0] == 0x04 {
			pubKey, err := crypto.UnmarshalPubkey(keyBytes)
			if err == nil {
				return crypto.PubkeyToAddress(*pubKey), nil
			}
		} else if len(keyBytes) == 33 && (keyBytes[0] == 0x02 || keyBytes[0] == 0x03) {
			pubKey, err := crypto.DecompressPubkey(keyBytes)
			if err == nil {
				return crypto.PubkeyToAddress(*pubKey), nil
			}
		}
	}

	// 4. Try standard x509.ParsePKIXPublicKey if standard curve
	parsed, err := x509.ParsePKIXPublicKey(pubBytes)
	if err == nil {
		if ecdsaPub, ok := parsed.(*ecdsa.PublicKey); ok {
			return crypto.PubkeyToAddress(*ecdsaPub), nil
		}
	}

	return common.Address{}, fmt.Errorf("unrecognized or invalid SECP256K1 public key encoding")
}

func (k *KMSSigner) verifyBinding(tx *types.Transaction, b *TransactionBinding) error {
	// Chain ID match
	if b.ChainID != nil && tx.ChainId().Cmp(b.ChainID) != 0 {
		return fmt.Errorf("%w: binding chain ID %s != tx chain ID %s",
			ErrTransactionBindingMismatch, b.ChainID.String(), tx.ChainId().String())
	}

	// Target Vault match
	if tx.To() == nil || *tx.To() != b.TargetVault {
		expected := b.TargetVault.Hex()
		got := "nil"
		if tx.To() != nil {
			got = tx.To().Hex()
		}
		return fmt.Errorf("%w: destination address mismatch (expected %s, got %s)",
			ErrTransactionBindingMismatch, expected, got)
	}

	// Value must be 0 for AgentVault payments
	if tx.Value() != nil && tx.Value().Sign() != 0 {
		return fmt.Errorf("%w: unexpected native token value %s in transaction (expected 0)",
			ErrTransactionBindingMismatch, tx.Value().String())
	}

	// Calldata hash match
	if len(b.ExpectedCalldata) > 0 && !bytes.Equal(tx.Data(), b.ExpectedCalldata) {
		return fmt.Errorf("%w: transaction calldata mismatch (calldata was mutated post-authorization)",
			ErrTransactionBindingMismatch)
	}

	return nil
}

func (k *KMSSigner) recordAudit(ctx context.Context, b *TransactionBinding, tx *types.Transaction, success bool, errMsg string, t time.Time) {
	if k.recorder == nil {
		return
	}

	reqID := "unknown"
	dest := common.Address{}
	amount := ""
	var calldata []byte

	if b != nil {
		reqID = b.RequestID
		dest = b.TargetVault
		amount = b.ExpectedAmount
		calldata = b.ExpectedCalldata
	} else if tx != nil {
		if tx.To() != nil {
			dest = *tx.To()
		}
		calldata = tx.Data()
	}

	event := &SigningAuditEvent{
		ID:                 generateAuditID("sig_evt_"),
		RequestID:          reqID,
		SignerBackend:      k.Backend(),
		SignerAddress:      k.address,
		ChainID:            k.chainID,
		DestinationVault:   dest,
		CalldataSHA256Hash: HashCalldata(calldata),
		Amount:             amount,
		Success:            success,
		ErrorMessage:       errMsg,
		Timestamp:          t,
	}

	_ = k.recorder.RecordSigningEvent(ctx, event)
}
