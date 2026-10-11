package awskms

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	kmstypes "github.com/aws/aws-sdk-go-v2/service/kms/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
)

// Ensure Provider satisfies signer.KMSProvider at compile time.
var _ signer.KMSProvider = (*Provider)(nil)

const (
	DefaultTimeout     = 10 * time.Second
	ProviderIdentifier = "aws_kms"
)

// Config specifies parameters for AWS KMS client initialization.
type Config struct {
	Region   string
	Endpoint string        // Optional custom endpoint (e.g. for LocalStack or VPC endpoints)
	Timeout  time.Duration // Default timeout for KMS operations if context lacks deadline
}

// Provider implements signer.KMSProvider using AWS SDK for Go v2.
type Provider struct {
	client  KMSClientAPI
	region  string
	timeout time.Duration
}

// New constructs a Provider using the standard AWS SDK configuration chain and explicit region.
func New(ctx context.Context, cfg Config, optFns ...func(*awsconfig.LoadOptions) error) (*Provider, error) {
	trimmedRegion := strings.TrimSpace(cfg.Region)
	if trimmedRegion == "" {
		return nil, ErrEmptyRegion
	}

	loadOpts := append([]func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(trimmedRegion),
	}, optFns...)

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config for region %q: %w", trimmedRegion, err)
	}

	var kmsOptFns []func(*kms.Options)
	if cfg.Endpoint != "" {
		kmsOptFns = append(kmsOptFns, func(o *kms.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		})
	}

	client := kms.NewFromConfig(awsCfg, kmsOptFns...)
	return NewWithClient(client, trimmedRegion, cfg.Timeout)
}

// NewWithClient constructs a Provider using a pre-configured KMSClientAPI (useful for dependency injection and tests).
func NewWithClient(client KMSClientAPI, region string, timeout time.Duration) (*Provider, error) {
	if client == nil {
		return nil, ErrNilClient
	}
	trimmedRegion := strings.TrimSpace(region)
	if trimmedRegion == "" {
		return nil, ErrEmptyRegion
	}
	if timeout <= 0 {
		timeout = DefaultTimeout
	}

	return &Provider{
		client:  client,
		region:  trimmedRegion,
		timeout: timeout,
	}, nil
}

// ProviderName returns "aws_kms".
func (p *Provider) ProviderName() string {
	return ProviderIdentifier
}

// Region returns the configured AWS region.
func (p *Provider) Region() string {
	return p.region
}

// GetPublicKey fetches the SECP256K1 public key from AWS KMS and strictly validates its metadata.
func (p *Provider) GetPublicKey(ctx context.Context, keyID string) ([]byte, error) {
	trimmedKeyID := strings.TrimSpace(keyID)
	if trimmedKeyID == "" {
		return nil, ErrEmptyKeyID
	}

	callCtx := ctx
	if _, hasDeadline := ctx.Deadline(); !hasDeadline && p.timeout > 0 {
		var cancel context.CancelFunc
		callCtx, cancel = context.WithTimeout(ctx, p.timeout)
		defer cancel()
	}

	input := &kms.GetPublicKeyInput{
		KeyId: aws.String(trimmedKeyID),
	}

	output, err := p.client.GetPublicKey(callCtx, input)
	if err != nil {
		return nil, ClassifyKMSError("GetPublicKey", trimmedKeyID, err)
	}

	if output == nil || len(output.PublicKey) == 0 {
		return nil, ErrEmptyPublicKey
	}

	// Validate KeySpec: Must be ECC_SECG_P256K1
	if output.KeySpec != kmstypes.KeySpecEccSecgP256k1 &&
		output.CustomerMasterKeySpec != kmstypes.CustomerMasterKeySpecEccSecgP256k1 {
		return nil, fmt.Errorf("%w: key has spec %q", ErrUnsupportedKeySpec, output.KeySpec)
	}

	// Validate KeyUsage: Must be SIGN_VERIFY
	if output.KeyUsage != kmstypes.KeyUsageTypeSignVerify {
		return nil, fmt.Errorf("%w: key usage is %q", ErrUnsupportedKeyUsage, output.KeyUsage)
	}

	// Validate SigningAlgorithms: Must include ECDSA_SHA_256
	hasECDSA := false
	for _, alg := range output.SigningAlgorithms {
		if alg == kmstypes.SigningAlgorithmSpecEcdsaSha256 {
			hasECDSA = true
			break
		}
	}
	if !hasECDSA {
		return nil, fmt.Errorf("%w: key algorithms %v do not include %s",
			ErrUnsupportedAlgorithm, output.SigningAlgorithms, kmstypes.SigningAlgorithmSpecEcdsaSha256)
	}

	return output.PublicKey, nil
}

// SignDigest signs a precomputed 32-byte Keccak-256 digest using AWS KMS asymmetric signing.
func (p *Provider) SignDigest(ctx context.Context, keyID string, digest []byte) ([]byte, error) {
	trimmedKeyID := strings.TrimSpace(keyID)
	if trimmedKeyID == "" {
		return nil, ErrEmptyKeyID
	}

	if len(digest) != 32 {
		return nil, fmt.Errorf("%w: expected 32 bytes, got %d", ErrInvalidDigestLength, len(digest))
	}

	callCtx := ctx
	if _, hasDeadline := ctx.Deadline(); !hasDeadline && p.timeout > 0 {
		var cancel context.CancelFunc
		callCtx, cancel = context.WithTimeout(ctx, p.timeout)
		defer cancel()
	}

	input := &kms.SignInput{
		KeyId:            aws.String(trimmedKeyID),
		Message:          digest,
		MessageType:      kmstypes.MessageTypeDigest,
		SigningAlgorithm: kmstypes.SigningAlgorithmSpecEcdsaSha256,
	}

	output, err := p.client.Sign(callCtx, input)
	if err != nil {
		return nil, ClassifyKMSError("Sign", trimmedKeyID, err)
	}

	if output == nil || len(output.Signature) == 0 {
		return nil, ErrEmptySignature
	}

	return output.Signature, nil
}
