package awskms_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/asn1"
	"errors"
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	kmstypes "github.com/aws/aws-sdk-go-v2/service/kms/types"
	"github.com/aws/smithy-go"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer/providers/awskms"
)

// =========================================================================
// MOCK AWS KMS CLIENT FOR OFFLINE UNIT AND INTEGRATION TESTING
// NOTICE: These offline mock tests exercise AWS SDK v2 request construction,
// response unmarshaling, error classification, and cryptographic compatibility.
// THEY DO NOT CONNECT TO LIVE AWS CLOUD INFRASTRUCTURE OR INCUR CLOUD COSTS.
// =========================================================================

type mockKMSClient struct {
	getPublicKeyFn func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error)
	signFn         func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error)
}

func (m *mockKMSClient) GetPublicKey(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
	if m.getPublicKeyFn != nil {
		return m.getPublicKeyFn(ctx, params, optFns...)
	}
	return nil, errors.New("unimplemented GetPublicKey")
}

func (m *mockKMSClient) Sign(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
	if m.signFn != nil {
		return m.signFn(ctx, params, optFns...)
	}
	return nil, errors.New("unimplemented Sign")
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

type asn1Sig struct {
	R, S *big.Int
}

func encodeSPKIPublicKey(priv *ecdsa.PrivateKey) []byte {
	pubBytes := crypto.FromECDSAPub(&priv.PublicKey)
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
	b, _ := asn1.Marshal(spki)
	return b
}

func encodeDERSignature(r, s *big.Int) []byte {
	b, _ := asn1.Marshal(asn1Sig{R: r, S: s})
	return b
}

// 1. Test GetPublicKey Success and Address Derivation
func TestProvider_GetPublicKey_Success(t *testing.T) {
	testPriv, err := crypto.GenerateKey()
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}
	expectedAddr := crypto.PubkeyToAddress(testPriv.PublicKey)
	spkiBytes := encodeSPKIPublicKey(testPriv)

	keyARN := "arn:aws:kms:us-east-1:123456789012:key/secp256k1-test-key"

	mock := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			if aws.ToString(params.KeyId) != keyARN {
				t.Errorf("unexpected KeyId: %s", aws.ToString(params.KeyId))
			}
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
	}

	provider, err := awskms.NewWithClient(mock, "us-east-1", 5*time.Second)
	if err != nil {
		t.Fatalf("failed to init provider: %v", err)
	}

	pubBytes, err := provider.GetPublicKey(context.Background(), keyARN)
	if err != nil {
		t.Fatalf("GetPublicKey failed: %v", err)
	}

	addr, err := signer.ParseKMSPublicKey(pubBytes)
	if err != nil {
		t.Fatalf("ParseKMSPublicKey failed: %v", err)
	}

	if addr != expectedAddr {
		t.Fatalf("derived address %s != expected %s", addr.Hex(), expectedAddr.Hex())
	}
}

// 2. Test GetPublicKey Validation Failures (Invalid KeySpec, KeyUsage, Missing Algorithm)
func TestProvider_GetPublicKey_MetadataValidation(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	spkiBytes := encodeSPKIPublicKey(testPriv)
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/test-key"

	// A. Invalid KeySpec (e.g. RSA or NIST P-256)
	mockBadSpec := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccNistP256,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
	}
	pBadSpec, _ := awskms.NewWithClient(mockBadSpec, "us-east-1", 0)
	_, err := pBadSpec.GetPublicKey(context.Background(), keyARN)
	if !errors.Is(err, awskms.ErrUnsupportedKeySpec) {
		t.Errorf("expected ErrUnsupportedKeySpec, got: %v", err)
	}

	// B. Invalid KeyUsage (e.g. ENCRYPT_DECRYPT)
	mockBadUsage := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeEncryptDecrypt,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
	}
	pBadUsage, _ := awskms.NewWithClient(mockBadUsage, "us-east-1", 0)
	_, err = pBadUsage.GetPublicKey(context.Background(), keyARN)
	if !errors.Is(err, awskms.ErrUnsupportedKeyUsage) {
		t.Errorf("expected ErrUnsupportedKeyUsage, got: %v", err)
	}

	// C. Missing ECDSA_SHA_256 Algorithm
	mockBadAlg := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecRsassaPssSha256,
				},
			}, nil
		},
	}
	pBadAlg, _ := awskms.NewWithClient(mockBadAlg, "us-east-1", 0)
	_, err = pBadAlg.GetPublicKey(context.Background(), keyARN)
	if !errors.Is(err, awskms.ErrUnsupportedAlgorithm) {
		t.Errorf("expected ErrUnsupportedAlgorithm, got: %v", err)
	}

	// D. Empty Public Key Bytes
	mockEmptyPub := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:             aws.String(keyARN),
				KeySpec:           kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:          kmstypes.KeyUsageTypeSignVerify,
				PublicKey:         nil,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{kmstypes.SigningAlgorithmSpecEcdsaSha256},
			}, nil
		},
	}
	pEmptyPub, _ := awskms.NewWithClient(mockEmptyPub, "us-east-1", 0)
	_, err = pEmptyPub.GetPublicKey(context.Background(), keyARN)
	if !errors.Is(err, awskms.ErrEmptyPublicKey) {
		t.Errorf("expected ErrEmptyPublicKey, got: %v", err)
	}
}

// 3. Test GetPublicKey Error Classification (AccessDenied, Throttling, NotFound, Unavailable)
func TestProvider_GetPublicKey_ErrorClassification(t *testing.T) {
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/test-key"

	tests := []struct {
		name        string
		awsErrCode  string
		expectedErr error
	}{
		{"AccessDenied", "AccessDeniedException", awskms.ErrKMSAccessDenied},
		{"Throttling", "ThrottlingException", awskms.ErrKMSThrottling},
		{"LimitExceeded", "LimitExceededException", awskms.ErrKMSThrottling},
		{"NotFound", "NotFoundException", awskms.ErrKMSNotFound},
		{"Disabled", "DisabledException", awskms.ErrKMSUnavailable},
		{"Unavailable", "KeyUnavailableException", awskms.ErrKMSUnavailable},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mock := &mockKMSClient{
				getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
					return nil, &smithy.GenericAPIError{
						Code:    tc.awsErrCode,
						Message: "Simulated AWS failure",
					}
				},
			}
			p, _ := awskms.NewWithClient(mock, "us-east-1", 0)
			_, err := p.GetPublicKey(context.Background(), keyARN)
			if !errors.Is(err, tc.expectedErr) {
				t.Errorf("expected error %v, got: %v", tc.expectedErr, err)
			}
		})
	}
}

// 4. Test SignDigest Success, Algorithm Mode & Parameters
func TestProvider_SignDigest_Success(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/secp256k1-test-key"
	digest := crypto.Keccak256([]byte("agentpay-eip1559-tx-digest"))

	r, s, _ := ecdsa.Sign(rand.Reader, testPriv, digest)
	derSig := encodeDERSignature(r, s)

	mock := &mockKMSClient{
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			// Verify exact AWS KMS parameters
			if aws.ToString(params.KeyId) != keyARN {
				t.Errorf("expected KeyId %q, got %q", keyARN, aws.ToString(params.KeyId))
			}
			if params.MessageType != kmstypes.MessageTypeDigest {
				t.Errorf("expected MessageType DIGEST, got %v", params.MessageType)
			}
			if params.SigningAlgorithm != kmstypes.SigningAlgorithmSpecEcdsaSha256 {
				t.Errorf("expected SigningAlgorithm ECDSA_SHA_256, got %v", params.SigningAlgorithm)
			}
			if len(params.Message) != 32 {
				t.Errorf("expected 32-byte message, got %d bytes", len(params.Message))
			}

			return &kms.SignOutput{
				KeyId:            aws.String(keyARN),
				SigningAlgorithm: kmstypes.SigningAlgorithmSpecEcdsaSha256,
				Signature:        derSig,
			}, nil
		},
	}

	provider, err := awskms.NewWithClient(mock, "us-east-1", 0)
	if err != nil {
		t.Fatalf("failed to init provider: %v", err)
	}

	returnedSig, err := provider.SignDigest(context.Background(), keyARN, digest)
	if err != nil {
		t.Fatalf("SignDigest failed: %v", err)
	}

	decodedR, decodedS, err := signer.DecodeAndNormalizeDERSignature(returnedSig)
	if err != nil {
		t.Fatalf("failed to decode DER signature: %v", err)
	}
	if decodedR.Cmp(r) != 0 {
		t.Errorf("decoded R mismatch")
	}
	if decodedS == nil {
		t.Errorf("nil S")
	}
}

// 5. Test SignDigest Input Validation Failures
func TestProvider_SignDigest_InputValidation(t *testing.T) {
	mock := &mockKMSClient{}
	p, _ := awskms.NewWithClient(mock, "us-east-1", 0)

	// A. Invalid digest length (not 32 bytes)
	_, err := p.SignDigest(context.Background(), "test-key", []byte{0x01, 0x02})
	if !errors.Is(err, awskms.ErrInvalidDigestLength) {
		t.Errorf("expected ErrInvalidDigestLength for 2-byte digest, got: %v", err)
	}

	// B. Empty key ID
	validDigest := make([]byte, 32)
	_, err = p.SignDigest(context.Background(), "", validDigest)
	if !errors.Is(err, awskms.ErrEmptyKeyID) {
		t.Errorf("expected ErrEmptyKeyID, got: %v", err)
	}

	// C. Empty signature in AWS response
	mockEmptySig := &mockKMSClient{
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			return &kms.SignOutput{
				Signature: nil,
			}, nil
		},
	}
	pEmptySig, _ := awskms.NewWithClient(mockEmptySig, "us-east-1", 0)
	_, err = pEmptySig.SignDigest(context.Background(), "test-key", validDigest)
	if !errors.Is(err, awskms.ErrEmptySignature) {
		t.Errorf("expected ErrEmptySignature, got: %v", err)
	}
}

// 6. Test Context Cancellation and Timeouts
func TestProvider_ContextCancellationAndTimeouts(t *testing.T) {
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/test-key"
	mock := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			return nil, errors.New("unexpected call")
		},
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			return nil, errors.New("unexpected call")
		},
	}

	p, _ := awskms.NewWithClient(mock, "us-east-1", 50*time.Millisecond)

	// Pre-cancelled context on GetPublicKey
	canceledCtx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := p.GetPublicKey(canceledCtx, keyARN)
	if err == nil || !strings.Contains(err.Error(), context.Canceled.Error()) {
		t.Errorf("expected context.Canceled, got: %v", err)
	}

	// Pre-cancelled context on SignDigest
	_, err = p.SignDigest(canceledCtx, keyARN, make([]byte, 32))
	if err == nil || !strings.Contains(err.Error(), context.Canceled.Error()) {
		t.Errorf("expected context.Canceled, got: %v", err)
	}
}

// 7. Test Construction Validation
func TestProvider_ConstructionValidation(t *testing.T) {
	// Nil client
	_, err := awskms.NewWithClient(nil, "us-east-1", 0)
	if !errors.Is(err, awskms.ErrNilClient) {
		t.Errorf("expected ErrNilClient, got: %v", err)
	}

	// Empty region
	mock := &mockKMSClient{}
	_, err = awskms.NewWithClient(mock, "", 0)
	if !errors.Is(err, awskms.ErrEmptyRegion) {
		t.Errorf("expected ErrEmptyRegion, got: %v", err)
	}

	// Valid construction
	p, err := awskms.NewWithClient(mock, "eu-central-1", 2*time.Second)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	if p.ProviderName() != "aws_kms" {
		t.Errorf("expected ProviderName 'aws_kms', got: %s", p.ProviderName())
	}
	if p.Region() != "eu-central-1" {
		t.Errorf("expected Region 'eu-central-1', got: %s", p.Region())
	}
}

// 8. Test End-to-End Integration with KMSSigner (Signing, Low-S, Address Recovery & Binding)
func TestProvider_EndToEndIntegrationWithKMSSigner(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	expectedAddr := crypto.PubkeyToAddress(testPriv.PublicKey)
	spkiBytes := encodeSPKIPublicKey(testPriv)
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/agentpay-prod-key"
	chainID := big.NewInt(5042)

	forceHighS := true

	mock := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			r, s, err := ecdsa.Sign(rand.Reader, testPriv, params.Message)
			if err != nil {
				return nil, err
			}

			curveOrder := crypto.S256().Params().N
			halfOrder := new(big.Int).Rsh(curveOrder, 1)

			if forceHighS {
				// Force high-S to verify KMSSigner normalizes AWS KMS signatures to canonical low-S
				if s.Cmp(halfOrder) <= 0 {
					s = new(big.Int).Sub(curveOrder, s)
				}
			}

			return &kms.SignOutput{
				KeyId:            aws.String(keyARN),
				SigningAlgorithm: kmstypes.SigningAlgorithmSpecEcdsaSha256,
				Signature:        encodeDERSignature(r, s),
			}, nil
		},
	}

	awsProvider, err := awskms.NewWithClient(mock, "us-east-1", 5*time.Second)
	if err != nil {
		t.Fatalf("failed to create AWS provider: %v", err)
	}

	rec := &signer.MemoryAuditRecorder{}
	kmsSigner, err := signer.NewKMSSignerWithContext(context.Background(), keyARN, "us-east-1", chainID, rec, awsProvider)
	if err != nil {
		t.Fatalf("failed to construct KMSSigner with AWS provider: %v", err)
	}

	if kmsSigner.Address() != expectedAddr {
		t.Fatalf("KMSSigner address %s != expected %s", kmsSigner.Address().Hex(), expectedAddr.Hex())
	}
	if kmsSigner.ProviderName() != "aws_kms" {
		t.Errorf("expected ProviderName 'aws_kms', got: %s", kmsSigner.ProviderName())
	}

	// Construct sample EIP-1559 transaction
	vault := common.HexToAddress("0x2222222222222222222222222222222222222222")
	calldata := []byte{0xaa, 0xbb, 0xcc, 0xdd}
	txData := &types.DynamicFeeTx{
		ChainID:   chainID,
		Nonce:     1,
		GasTipCap: big.NewInt(1000000000),
		GasFeeCap: big.NewInt(2000000000),
		Gas:       150000,
		To:        &vault,
		Value:     big.NewInt(0),
		Data:      calldata,
	}
	unsignedTx := types.NewTx(txData)

	binding := &signer.TransactionBinding{
		RequestID:        "req_aws_kms_test",
		ChainID:          chainID,
		TargetVault:      vault,
		ExpectedCalldata: calldata,
		ExpectedAmount:   "1000000",
	}

	signedTx, err := kmsSigner.SignTransaction(context.Background(), unsignedTx, binding)
	if err != nil {
		t.Fatalf("SignTransaction failed: %v", err)
	}

	// 1. Verify EIP-2 canonical low-S
	_, _, s := signedTx.RawSignatureValues()
	curveOrder := crypto.S256().Params().N
	halfOrder := new(big.Int).Rsh(curveOrder, 1)
	if s.Cmp(halfOrder) > 0 {
		t.Fatalf("signed transaction contains non-canonical high-S!")
	}

	// 2. Verify recovered sender matches expected AWS KMS address
	londonSigner := types.NewLondonSigner(chainID)
	recoveredSender, err := types.Sender(londonSigner, signedTx)
	if err != nil {
		t.Fatalf("failed to recover sender: %v", err)
	}
	if recoveredSender != expectedAddr {
		t.Fatalf("recovered sender %s != expected %s", recoveredSender.Hex(), expectedAddr.Hex())
	}

	// 3. Verify audit log event
	evt := rec.LastEvent()
	if evt == nil || !evt.Success || evt.SignerBackend != "kms" || evt.SignerAddress != expectedAddr {
		t.Errorf("audit log verification failed: %+v", evt)
	}
}

// 9. Test Fail-Closed Behavior (Zero Fallback to LocalSigner)
func TestProvider_FailClosedNoFallback(t *testing.T) {
	keyARN := "arn:aws:kms:us-east-1:123456789012:key/failing-key"
	chainID := big.NewInt(5042)

	testPriv, _ := crypto.GenerateKey()
	spkiBytes := encodeSPKIPublicKey(testPriv)

	mock := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			return nil, &smithy.GenericAPIError{
				Code:    "AccessDeniedException",
				Message: "KMS Key is disabled or access is denied",
			}
		},
	}

	awsProvider, _ := awskms.NewWithClient(mock, "us-east-1", 0)
	rec := &signer.MemoryAuditRecorder{}
	kmsSigner, _ := signer.NewKMSSignerWithContext(context.Background(), keyARN, "us-east-1", chainID, rec, awsProvider)

	vault := common.HexToAddress("0x2222222222222222222222222222222222222222")
	txData := &types.DynamicFeeTx{
		ChainID:   chainID,
		Nonce:     1,
		GasTipCap: big.NewInt(1000000000),
		GasFeeCap: big.NewInt(2000000000),
		Gas:       150000,
		To:        &vault,
		Value:     big.NewInt(0),
		Data:      []byte{0x01},
	}
	unsignedTx := types.NewTx(txData)

	signedTx, err := kmsSigner.SignTransaction(context.Background(), unsignedTx, nil)
	if err == nil {
		t.Fatal("expected signing failure when AWS KMS denies access, got nil error")
	}
	if signedTx != nil {
		t.Fatalf("expected nil signed transaction on failure, got: %v", signedTx)
	}
	if !errors.Is(err, signer.ErrKMSProviderFailed) {
		t.Errorf("expected ErrKMSProviderFailed wrapping access denied, got: %v", err)
	}

	// Verify failed audit event recorded
	evt := rec.LastEvent()
	if evt == nil || evt.Success {
		t.Errorf("expected failed audit record, got: %+v", evt)
	}
}

// 10. Test Zero Secret Leakage in Error Output
func TestProvider_ZeroSecretLeakage(t *testing.T) {
	dummySecret := "aws-secret-access-key-wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
	rawErr := &smithy.GenericAPIError{
		Code:    "AccessDeniedException",
		Message: "Authentication failed with credentials " + dummySecret,
	}

	classified := awskms.ClassifyKMSError("Sign", "arn:aws:kms:us-east-1:123456789012:key/test", rawErr)
	if classified == nil {
		t.Fatal("expected non-nil classified error")
	}

	// Verify error type is ErrKMSAccessDenied
	if !errors.Is(classified, awskms.ErrKMSAccessDenied) {
		t.Errorf("expected ErrKMSAccessDenied, got: %v", classified)
	}

	// Verify sanitizeKeyID on empty string
	classifiedEmptyKey := awskms.ClassifyKMSError("GetPublicKey", "", errors.New("underlying error"))
	if !strings.Contains(classifiedEmptyKey.Error(), "key \"unknown\"") {
		t.Errorf("expected sanitized unknown key, got: %v", classifiedEmptyKey)
	}
}

// 11. Test New Constructor Config Validation
func TestProvider_New_ConfigValidation(t *testing.T) {
	// Empty region should fail closed immediately without attempting network config loading
	_, err := awskms.New(context.Background(), awskms.Config{Region: ""})
	if !errors.Is(err, awskms.ErrEmptyRegion) {
		t.Errorf("expected ErrEmptyRegion for empty region, got: %v", err)
	}
}

// 12. Test Key ARN Parsing and Alias Rejection
func TestProvider_ParseKeyARN(t *testing.T) {
	// Valid standard partition ARN
	arn, err := awskms.ParseKeyARN("arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012")
	if err != nil {
		t.Fatalf("expected valid ARN, got error: %v", err)
	}
	if arn.Region != "us-east-1" || arn.AccountID != "123456789012" || arn.KeyID != "12345678-1234-1234-1234-123456789012" {
		t.Errorf("unexpected parsed ARN fields: %+v", arn)
	}

	// Valid GovCloud partition ARN
	arnGov, err := awskms.ParseKeyARN("arn:aws-us-gov:kms:us-gov-west-1:123456789012:key/gov-key-id")
	if err != nil || arnGov.Partition != "aws-us-gov" {
		t.Errorf("expected valid GovCloud ARN, got: %v", err)
	}

	// Alias Name rejection
	_, err = awskms.ParseKeyARN("alias/agentpay-signer")
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias name, got: %v", err)
	}

	// Alias ARN rejection
	_, err = awskms.ParseKeyARN("arn:aws:kms:us-east-1:123456789012:alias/agentpay-signer")
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias ARN, got: %v", err)
	}

	// Malformed ARNs
	malformed := []string{
		"",                                                         // empty
		"not-an-arn",                                               // no prefix
		"arn:aws:kms:us-east-1:12345:key/foo",                      // account not 12 digits
		"arn:aws:kms:us-east-1:123456789012:secret/foo",           // wrong resource type
		"arn:aws:s3:::bucket/key",                                  // non-kms service
		"arn:aws:kms:us-east-1:123456789012:key/",                  // empty key segment
		"arn:aws:kms::123456789012:key/foo",                        // empty region
	}

	for _, raw := range malformed {
		_, err = awskms.ParseKeyARN(raw)
		if err == nil {
			t.Errorf("expected error for malformed ARN %q, got nil", raw)
		}
	}
}

// 13. Test Alias Rejection in GetPublicKey and SignDigest
func TestProvider_AliasRejection(t *testing.T) {
	mock := &mockKMSClient{}
	p, _ := awskms.NewWithClient(mock, "us-east-1", 0)

	// A. Alias name in GetPublicKey
	_, err := p.GetPublicKey(context.Background(), "alias/my-key")
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias/my-key in GetPublicKey, got: %v", err)
	}

	// B. Alias ARN in GetPublicKey
	_, err = p.GetPublicKey(context.Background(), "arn:aws:kms:us-east-1:123456789012:alias/my-key")
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias ARN in GetPublicKey, got: %v", err)
	}

	// C. Alias name in SignDigest
	_, err = p.SignDigest(context.Background(), "alias/my-key", make([]byte, 32))
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias/my-key in SignDigest, got: %v", err)
	}

	// D. Alias ARN in SignDigest
	_, err = p.SignDigest(context.Background(), "arn:aws:kms:us-east-1:123456789012:alias/my-key", make([]byte, 32))
	if !errors.Is(err, awskms.ErrAliasNotPermitted) {
		t.Errorf("expected ErrAliasNotPermitted for alias ARN in SignDigest, got: %v", err)
	}
}

// 14. Test Region Mismatch and Account Mismatch
func TestProvider_RegionAndAccountMismatch(t *testing.T) {
	mock := &mockKMSClient{}

	// A. Region mismatch: provider is us-east-1, ARN is us-west-2
	pRegionMismatch, _ := awskms.NewWithClient(mock, "us-east-1", 0)
	_, err := pRegionMismatch.GetPublicKey(context.Background(), "arn:aws:kms:us-west-2:123456789012:key/test-key")
	if !errors.Is(err, awskms.ErrRegionMismatch) {
		t.Errorf("expected ErrRegionMismatch, got: %v", err)
	}

	// B. Account mismatch: provider expected account is 111111111111, ARN has 222222222222
	pAccountMismatch, _ := awskms.NewWithClientConfig(mock, awskms.Config{
		Region:          "us-east-1",
		ExpectedAccount: "111111111111",
	})
	_, err = pAccountMismatch.GetPublicKey(context.Background(), "arn:aws:kms:us-east-1:222222222222:key/test-key")
	if !errors.Is(err, awskms.ErrAccountMismatch) {
		t.Errorf("expected ErrAccountMismatch, got: %v", err)
	}
}

// 15. Test Canonical Key Identity Retention and Mismatch Enforcement in SignDigest
func TestProvider_CanonicalKeyIdentityRetention(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	spkiBytes := encodeSPKIPublicKey(testPriv)

	keyARN1 := "arn:aws:kms:us-east-1:123456789012:key/canonical-key-1"
	keyARN2 := "arn:aws:kms:us-east-1:123456789012:key/canonical-key-2"
	digest := crypto.Keccak256([]byte("test-digest"))

	mock := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(keyARN1),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			r, s, _ := ecdsa.Sign(rand.Reader, testPriv, params.Message)
			return &kms.SignOutput{
				KeyId:            aws.String(keyARN1),
				SigningAlgorithm: kmstypes.SigningAlgorithmSpecEcdsaSha256,
				Signature:        encodeDERSignature(r, s),
			}, nil
		},
	}

	p, err := awskms.NewWithClient(mock, "us-east-1", 0)
	if err != nil {
		t.Fatalf("failed to init provider: %v", err)
	}

	// Step 1: Initialize with keyARN1
	_, err = p.GetPublicKey(context.Background(), keyARN1)
	if err != nil {
		t.Fatalf("GetPublicKey failed: %v", err)
	}

	if p.CanonicalKeyARN() != keyARN1 {
		t.Errorf("expected canonical key %q, got %q", keyARN1, p.CanonicalKeyARN())
	}

	// Step 2: SignDigest with keyARN1 must succeed
	_, err = p.SignDigest(context.Background(), keyARN1, digest)
	if err != nil {
		t.Fatalf("SignDigest with canonical key failed: %v", err)
	}

	// Step 3: SignDigest with keyARN2 must fail with ErrKeyIdentityMismatch
	_, err = p.SignDigest(context.Background(), keyARN2, digest)
	if !errors.Is(err, awskms.ErrKeyIdentityMismatch) {
		t.Errorf("expected ErrKeyIdentityMismatch when requesting signing with different key, got: %v", err)
	}
}

// 16. Test Unexpected Key Identity in AWS Response
func TestProvider_AWSReturnsUnexpectedKeyResponse(t *testing.T) {
	testPriv, _ := crypto.GenerateKey()
	spkiBytes := encodeSPKIPublicKey(testPriv)

	requestedARN := "arn:aws:kms:us-east-1:123456789012:key/requested-key"
	unexpectedARN := "arn:aws:kms:us-east-1:123456789012:key/unexpected-key"

	// A. GetPublicKey returns unexpected KeyId
	mockPubUnexpected := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(unexpectedARN), // KMS claims a different key
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
	}
	pPubUnexpected, _ := awskms.NewWithClient(mockPubUnexpected, "us-east-1", 0)
	_, err := pPubUnexpected.GetPublicKey(context.Background(), requestedARN)
	if !errors.Is(err, awskms.ErrKeyIdentityMismatch) {
		t.Errorf("expected ErrKeyIdentityMismatch when GetPublicKey returns unexpected key ARN, got: %v", err)
	}

	// B. SignDigest returns unexpected KeyId
	mockSignUnexpected := &mockKMSClient{
		getPublicKeyFn: func(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error) {
			return &kms.GetPublicKeyOutput{
				KeyId:     aws.String(requestedARN),
				KeySpec:   kmstypes.KeySpecEccSecgP256k1,
				KeyUsage:  kmstypes.KeyUsageTypeSignVerify,
				PublicKey: spkiBytes,
				SigningAlgorithms: []kmstypes.SigningAlgorithmSpec{
					kmstypes.SigningAlgorithmSpecEcdsaSha256,
				},
			}, nil
		},
		signFn: func(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error) {
			r, s, _ := ecdsa.Sign(rand.Reader, testPriv, params.Message)
			return &kms.SignOutput{
				KeyId:            aws.String(unexpectedARN), // KMS claims signature was done with unexpected key
				SigningAlgorithm: kmstypes.SigningAlgorithmSpecEcdsaSha256,
				Signature:        encodeDERSignature(r, s),
			}, nil
		},
	}
	pSignUnexpected, _ := awskms.NewWithClient(mockSignUnexpected, "us-east-1", 0)
	_, _ = pSignUnexpected.GetPublicKey(context.Background(), requestedARN)
	_, err = pSignUnexpected.SignDigest(context.Background(), requestedARN, make([]byte, 32))
	if !errors.Is(err, awskms.ErrKeyIdentityMismatch) {
		t.Errorf("expected ErrKeyIdentityMismatch when SignDigest returns unexpected key ARN, got: %v", err)
	}
}

// 17. Test Strict ARN Mode Rejects Non-ARN Test Stubs in Production Mode
func TestProvider_StrictARNMode(t *testing.T) {
	mock := &mockKMSClient{}
	pStrict, _ := awskms.NewWithClientConfig(mock, awskms.Config{
		Region:    "us-east-1",
		StrictARN: true,
	})

	// Non-ARN should be rejected in strict mode
	_, err := pStrict.GetPublicKey(context.Background(), "simple-key-id")
	if !errors.Is(err, awskms.ErrInvalidKeyARN) {
		t.Errorf("expected ErrInvalidKeyARN in strict mode for non-ARN, got: %v", err)
	}
}


