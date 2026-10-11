package signer_test

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
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

// =========================================================================
// MOCK KMS PROVIDER FOR LOCAL CRYPTOGRAPHIC VERIFICATION
// NOTICE: This mock provider is strictly for local unit/integration testing
// of ASN.1 DER decoding, low-S normalization, recovery ID candidate search,
// and transaction construction. IT DOES NOT CONSTITUTE PROOF OF REAL CLOUD
// AWS/GCP KMS CONNECTIVITY.
// =========================================================================

type asn1Sig struct {
	R, S *big.Int
}

type MockKMSProvider struct {
	keyID          string
	privateKey     *ecdsa.PrivateKey
	pubKeyEncoding string // "spki" or "raw"
	forceHighS     bool
	signError      error
	getPubError    error
	signDelay      time.Duration
}

func NewMockKMSProvider(keyID string, hexKey string, pubKeyEncoding string) (*MockKMSProvider, error) {
	priv, err := crypto.HexToECDSA(hexKey)
	if err != nil {
		return nil, err
	}
	if pubKeyEncoding == "" {
		pubKeyEncoding = "spki"
	}
	return &MockKMSProvider{
		keyID:          keyID,
		privateKey:     priv,
		pubKeyEncoding: pubKeyEncoding,
	}, nil
}

func (m *MockKMSProvider) ProviderName() string {
	return "mock_kms_hsm"
}

var (
	oidEcPublicKey = asn1.ObjectIdentifier{1, 2, 840, 10045, 2, 1}
	oidSecp256k1   = asn1.ObjectIdentifier{1, 3, 132, 0, 10}
)

type spkiAlgorithmIdentifier struct {
	Algorithm  asn1.ObjectIdentifier
	Parameters asn1.ObjectIdentifier
}

type spkiPublicKey struct {
	Algorithm        spkiAlgorithmIdentifier
	SubjectPublicKey asn1.BitString
}

func (m *MockKMSProvider) GetPublicKey(ctx context.Context, keyID string) ([]byte, error) {
	if m.getPubError != nil {
		return nil, m.getPubError
	}
	if keyID != m.keyID {
		return nil, fmt.Errorf("KMS key %q not found", keyID)
	}

	if m.pubKeyEncoding == "raw" {
		return crypto.FromECDSAPub(&m.privateKey.PublicKey), nil
	}

	// Canonical ASN.1 PKIX SubjectPublicKeyInfo DER format as returned by AWS KMS / GCP KMS
	pubBytes := crypto.FromECDSAPub(&m.privateKey.PublicKey)
	spki := spkiPublicKey{
		Algorithm: spkiAlgorithmIdentifier{
			Algorithm:  oidEcPublicKey,
			Parameters: oidSecp256k1,
		},
		SubjectPublicKey: asn1.BitString{
			Bytes:     pubBytes,
			BitLength: len(pubBytes) * 8,
		},
	}
	return asn1.Marshal(spki)
}

func (m *MockKMSProvider) SignDigest(ctx context.Context, keyID string, digest []byte) ([]byte, error) {
	if m.signDelay > 0 {
		select {
		case <-time.After(m.signDelay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	if m.signError != nil {
		return nil, m.signError
	}
	if keyID != m.keyID {
		return nil, fmt.Errorf("KMS key %q not found", keyID)
	}
	if len(digest) != 32 {
		return nil, fmt.Errorf("digest must be 32 bytes")
	}

	r, s, err := ecdsa.Sign(rand.Reader, m.privateKey, digest)
	if err != nil {
		return nil, err
	}

	curveOrder := crypto.S256().Params().N
	halfOrder := new(big.Int).Rsh(curveOrder, 1)

	if m.forceHighS {
		// Ensure S is in the upper half (high-S)
		if s.Cmp(halfOrder) <= 0 {
			s = new(big.Int).Sub(curveOrder, s)
		}
	}

	sig := asn1Sig{R: r, S: s}
	return asn1.Marshal(sig)
}

// 1. Test KMS Signer successfully signs EIP-1559 transaction and recovers correct address
func TestKMSSigner_SignValidTransaction_SPKIEncoding(t *testing.T) {
	chainID := big.NewInt(testChainID)
	mockProvider, err := NewMockKMSProvider("arn:aws:kms:us-east-1:123456789012:key/test-key", testHexKey1, "spki")
	if err != nil {
		t.Fatalf("failed to create mock KMS provider: %v", err)
	}

	rec := &signer.MemoryAuditRecorder{}
	kmsSigner, err := signer.NewKMSSignerWithProvider("arn:aws:kms:us-east-1:123456789012:key/test-key", "us-east-1", chainID, rec, mockProvider)
	if err != nil {
		t.Fatalf("failed to initialize KMSSigner: %v", err)
	}

	expectedPriv, _ := crypto.HexToECDSA(testHexKey1)
	expectedAddress := crypto.PubkeyToAddress(expectedPriv.PublicKey)
	if kmsSigner.Address() != expectedAddress {
		t.Fatalf("derived address %s != expected %s", kmsSigner.Address().Hex(), expectedAddress.Hex())
	}

	vault := common.HexToAddress(testVaultHex)
	data := []byte{0xaa, 0xbb, 0xcc, 0xdd}
	tx := buildSampleTx(chainID, vault, big.NewInt(0), data)

	binding := &signer.TransactionBinding{
		RequestID:        "req_kms_valid_1",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: data,
		ExpectedAmount:   "500000",
	}

	signedTx, err := kmsSigner.SignTransaction(context.Background(), tx, binding)
	if err != nil {
		t.Fatalf("KMS signing failed: %v", err)
	}

	// Verify cryptographic recovery
	londonSigner := types.NewLondonSigner(chainID)
	recoveredSender, err := types.Sender(londonSigner, signedTx)
	if err != nil {
		t.Fatalf("failed to recover sender: %v", err)
	}
	if recoveredSender != expectedAddress {
		t.Fatalf("recovered sender %s != expected %s", recoveredSender.Hex(), expectedAddress.Hex())
	}

	// Verify audit logging
	if len(rec.Events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(rec.Events))
	}
	evt := rec.LastEvent()
	if !evt.Success || evt.SignerBackend != "kms" || evt.SignerAddress != expectedAddress {
		t.Errorf("audit event attributes invalid: %+v", evt)
	}
}

// 2. Test KMS Signer with raw uncompressed 65-byte public key format
func TestKMSSigner_SignValidTransaction_RawEncoding(t *testing.T) {
	chainID := big.NewInt(testChainID)
	mockProvider, err := NewMockKMSProvider("test-key-raw", testHexKey2, "raw")
	if err != nil {
		t.Fatalf("failed to create mock KMS provider: %v", err)
	}

	kmsSigner, err := signer.NewKMSSignerWithProvider("test-key-raw", "eu-west-1", chainID, nil, mockProvider)
	if err != nil {
		t.Fatalf("failed to initialize KMSSigner with raw pubkey: %v", err)
	}

	expectedPriv, _ := crypto.HexToECDSA(testHexKey2)
	expectedAddress := crypto.PubkeyToAddress(expectedPriv.PublicKey)
	if kmsSigner.Address() != expectedAddress {
		t.Fatalf("derived address %s != expected %s", kmsSigner.Address().Hex(), expectedAddress.Hex())
	}

	vault := common.HexToAddress(testVaultHex)
	tx := buildSampleTx(chainID, vault, big.NewInt(0), []byte{0x01})
	signedTx, err := kmsSigner.SignTransaction(context.Background(), tx, nil)
	if err != nil {
		t.Fatalf("signing failed: %v", err)
	}

	londonSigner := types.NewLondonSigner(chainID)
	recovered, err := types.Sender(londonSigner, signedTx)
	if err != nil || recovered != expectedAddress {
		t.Fatalf("recovery failed or address mismatch: %v", err)
	}
}

// 3. Test High-S Normalization (EIP-2 malleability compliance)
func TestKMSSigner_HighSNormalizationEnforced(t *testing.T) {
	chainID := big.NewInt(testChainID)
	mockProvider, err := NewMockKMSProvider("test-key-high-s", testHexKey1, "spki")
	if err != nil {
		t.Fatalf("failed to create mock provider: %v", err)
	}
	mockProvider.forceHighS = true // Force high-S signature from HSM

	kmsSigner, err := signer.NewKMSSignerWithProvider("test-key-high-s", "us-east-1", chainID, nil, mockProvider)
	if err != nil {
		t.Fatalf("failed to initialize KMSSigner: %v", err)
	}

	vault := common.HexToAddress(testVaultHex)
	tx := buildSampleTx(chainID, vault, big.NewInt(0), []byte{0x42})

	signedTx, err := kmsSigner.SignTransaction(context.Background(), tx, nil)
	if err != nil {
		t.Fatalf("KMS signing should succeed after low-S normalization, got error: %v", err)
	}

	// Verify the signature on the signed transaction adheres to canonical low-S
	v, r, s := signedTx.RawSignatureValues()
	if v == nil || r == nil || s == nil {
		t.Fatal("nil signature values on signed tx")
	}

	curveOrder := crypto.S256().Params().N
	halfOrder := new(big.Int).Rsh(curveOrder, 1)
	if s.Cmp(halfOrder) > 0 {
		t.Fatalf("CRITICAL SECURITY FAILURE: signed transaction contains high-S value! S: %s, halfOrder: %s", s.String(), halfOrder.String())
	}

	// Verify address recovery succeeds with normalized S
	londonSigner := types.NewLondonSigner(chainID)
	recovered, err := types.Sender(londonSigner, signedTx)
	if err != nil || recovered != kmsSigner.Address() {
		t.Fatalf("recovery failed after high-S normalization: recovered %s, expected %s, err: %v",
			recovered.Hex(), kmsSigner.Address().Hex(), err)
	}
}

// 4. Test Malformed ASN.1 Signatures from KMS
func TestKMSSigner_MalformedSignaturesRejected(t *testing.T) {
	// A. Empty signature bytes
	_, _, err := signer.DecodeAndNormalizeDERSignature([]byte{})
	if !errors.Is(err, signer.ErrMalformedKMSSignature) {
		t.Errorf("expected ErrMalformedKMSSignature for empty bytes, got: %v", err)
	}

	// B. Truncated ASN.1 DER sequence
	_, _, err = signer.DecodeAndNormalizeDERSignature([]byte{0x30, 0x05, 0x02, 0x01})
	if !errors.Is(err, signer.ErrMalformedKMSSignature) {
		t.Errorf("expected ErrMalformedKMSSignature for truncated bytes, got: %v", err)
	}

	// C. Zero R or S values
	zeroSig, _ := asn1.Marshal(asn1Sig{R: big.NewInt(0), S: big.NewInt(100)})
	_, _, err = signer.DecodeAndNormalizeDERSignature(zeroSig)
	if !errors.Is(err, signer.ErrMalformedKMSSignature) {
		t.Errorf("expected ErrMalformedKMSSignature for zero R, got: %v", err)
	}

	// D. R >= curve order
	curveOrder := crypto.S256().Params().N
	overflowSig, _ := asn1.Marshal(asn1Sig{R: curveOrder, S: big.NewInt(100)})
	_, _, err = signer.DecodeAndNormalizeDERSignature(overflowSig)
	if !errors.Is(err, signer.ErrMalformedKMSSignature) {
		t.Errorf("expected ErrMalformedKMSSignature for overflow R, got: %v", err)
	}
}

// 5. Test Signature Recovery Failure on Tampered Signature
func TestKMSSigner_RecoveryFailureOnTamperedSignature(t *testing.T) {
	digest := crypto.Keccak256([]byte("agentpay-test-digest"))
	r := big.NewInt(123456789)
	s := big.NewInt(987654321)
	expectedAddress := common.HexToAddress(testVaultHex) // Arbitrary address that won't match (r, s)

	_, err := signer.DeriveRecoveryID(digest, r, s, expectedAddress)
	if err == nil {
		t.Fatal("expected recovery failure for non-matching signature, got nil")
	}
	if !errors.Is(err, signer.ErrSignatureRecoveryFailed) {
		t.Errorf("expected ErrSignatureRecoveryFailed, got: %v", err)
	}
}

// 6. Test Provider Errors & Timeouts
func TestKMSSigner_ProviderErrorsHandledFailClosed(t *testing.T) {
	chainID := big.NewInt(testChainID)

	// A. Provider returns error on SignDigest
	providerErr, _ := NewMockKMSProvider("key-err", testHexKey1, "spki")
	providerErr.signError = errors.New("AWS KMS ThrottlingException: rate exceeded")

	kmsSigner, err := signer.NewKMSSignerWithProvider("key-err", "us-east-1", chainID, nil, providerErr)
	if err != nil {
		t.Fatalf("failed to init signer: %v", err)
	}

	tx := buildSampleTx(chainID, common.HexToAddress(testVaultHex), big.NewInt(0), []byte{0x01})
	_, err = kmsSigner.SignTransaction(context.Background(), tx, nil)
	if !errors.Is(err, signer.ErrKMSProviderFailed) {
		t.Errorf("expected ErrKMSProviderFailed, got: %v", err)
	}

	// B. Provider times out
	providerTimeout, _ := NewMockKMSProvider("key-timeout", testHexKey1, "spki")
	providerTimeout.signDelay = 100 * time.Millisecond

	kmsSignerTimeout, _ := signer.NewKMSSignerWithProvider("key-timeout", "us-east-1", chainID, nil, providerTimeout)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	_, err = kmsSignerTimeout.SignTransaction(ctx, tx, nil)
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
	if !errors.Is(err, signer.ErrKMSProviderFailed) {
		t.Errorf("expected ErrKMSProviderFailed wrapping timeout, got: %v", err)
	}
}

// 7. Test Construction Validation & Fail-Closed Constructor
func TestKMSSigner_ConstructionValidation(t *testing.T) {
	chainID := big.NewInt(testChainID)
	mockProvider, _ := NewMockKMSProvider("valid-key", testHexKey1, "spki")

	// Nil provider strictly fails closed
	_, err := signer.NewKMSSigner("valid-key", "us-east-1", chainID, nil)
	if !errors.Is(err, signer.ErrKMSSignerUnavailable) {
		t.Errorf("expected ErrKMSSignerUnavailable for nil provider, got: %v", err)
	}

	// Empty key ID
	_, err = signer.NewKMSSignerWithProvider("", "us-east-1", chainID, nil, mockProvider)
	if !errors.Is(err, signer.ErrInvalidKMSKeyID) {
		t.Errorf("expected ErrInvalidKMSKeyID for empty key ID, got: %v", err)
	}

	// Empty region
	_, err = signer.NewKMSSignerWithProvider("valid-key", "", chainID, nil, mockProvider)
	if !errors.Is(err, signer.ErrInvalidKMSRegion) {
		t.Errorf("expected ErrInvalidKMSRegion for empty region, got: %v", err)
	}

	// Invalid chain ID
	_, err = signer.NewKMSSignerWithProvider("valid-key", "us-east-1", big.NewInt(0), nil, mockProvider)
	if !errors.Is(err, signer.ErrInvalidChainID) {
		t.Errorf("expected ErrInvalidChainID for chainID=0, got: %v", err)
	}

	// Provider returns error on GetPublicKey
	providerBadKey, _ := NewMockKMSProvider("valid-key", testHexKey1, "spki")
	providerBadKey.getPubError = errors.New("AccessDeniedException: KMS key not found")
	_, err = signer.NewKMSSignerWithProvider("valid-key", "us-east-1", chainID, nil, providerBadKey)
	if !errors.Is(err, signer.ErrInvalidKMSPublicKey) {
		t.Errorf("expected ErrInvalidKMSPublicKey on pubkey fetch failure, got: %v", err)
	}
}

// 8. Test Zero Secrets in String() and Error Representation
func TestKMSSigner_ZeroSecretLeakage(t *testing.T) {
	chainID := big.NewInt(testChainID)
	mockProvider, _ := NewMockKMSProvider("test-key-id-secret-arn", testHexKey1, "spki")
	kmsSigner, err := signer.NewKMSSignerWithProvider("test-key-id-secret-arn", "us-east-1", chainID, nil, mockProvider)
	if err != nil {
		t.Fatalf("failed to init: %v", err)
	}

	strRepr := kmsSigner.String()
	if strings.Contains(strRepr, testHexKey1) {
		t.Fatalf("CRITICAL SECURITY VULNERABILITY: String() exposed private key: %s", strRepr)
	}
	if !strings.Contains(strRepr, "KMSSigner") || !strings.Contains(strRepr, "backend: kms") {
		t.Errorf("unexpected string representation: %s", strRepr)
	}
}
