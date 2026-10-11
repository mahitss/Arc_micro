package awskms

import (
	"context"
	"fmt"
	"strings"
	"sync"
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
	Region          string
	Endpoint        string        // Optional custom endpoint (e.g. for LocalStack or VPC endpoints)
	Timeout         time.Duration // Default timeout for KMS operations if context lacks deadline
	ExpectedAccount string        // Optional 12-digit AWS account ID to enforce
	StrictARN       bool          // When true (default in production), strictly requires valid immutable Key ARN
}

// Provider implements signer.KMSProvider using AWS SDK for Go v2.
type Provider struct {
	client          KMSClientAPI
	region          string
	timeout         time.Duration
	expectedAccount string
	strictARN       bool

	mu              sync.RWMutex
	canonicalKeyARN string // Resolved and retained canonical key ARN from GetPublicKey
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
	// In production New constructor, StrictARN defaults to true unless explicitly configured
	if !cfg.StrictARN {
		cfg.StrictARN = true
	}
	return NewWithClientConfig(client, cfg)
}

// NewWithClient constructs a Provider using a pre-configured KMSClientAPI with basic region and timeout.
func NewWithClient(client KMSClientAPI, region string, timeout time.Duration) (*Provider, error) {
	return NewWithClientConfig(client, Config{
		Region:    region,
		Timeout:   timeout,
		StrictARN: false,
	})
}

// NewWithClientConfig constructs a Provider using a pre-configured KMSClientAPI with full Config.
func NewWithClientConfig(client KMSClientAPI, cfg Config) (*Provider, error) {
	if client == nil {
		return nil, ErrNilClient
	}
	trimmedRegion := strings.TrimSpace(cfg.Region)
	if trimmedRegion == "" {
		return nil, ErrEmptyRegion
	}
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	expectedAccount := strings.TrimSpace(cfg.ExpectedAccount)
	if expectedAccount != "" && (len(expectedAccount) != 12 || !isAllDigits(expectedAccount)) {
		return nil, fmt.Errorf("%w: ExpectedAccount must be 12 digits, got %q", ErrAccountMismatch, expectedAccount)
	}

	return &Provider{
		client:          client,
		region:          trimmedRegion,
		timeout:         timeout,
		expectedAccount: expectedAccount,
		strictARN:       cfg.StrictARN,
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

// CanonicalKeyARN returns the resolved, immutable canonical key ARN verified during GetPublicKey.
func (p *Provider) CanonicalKeyARN() string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.canonicalKeyARN
}

func (p *Provider) validateKeyID(keyID string) (*KeyARN, error) {
	trimmed := strings.TrimSpace(keyID)
	if trimmed == "" {
		return nil, ErrEmptyKeyID
	}

	// Unconditionally reject mutable aliases
	if IsAlias(trimmed) {
		return nil, fmt.Errorf("%w: %q", ErrAliasNotPermitted, trimmed)
	}

	// If key starts with arn: OR strictARN is enabled
	if strings.HasPrefix(trimmed, "arn:") || p.strictARN {
		arn, err := ParseKeyARN(trimmed)
		if err != nil {
			return nil, err
		}

		// Enforce region match
		if p.region != "" && !strings.EqualFold(arn.Region, p.region) {
			return nil, fmt.Errorf("%w: ARN region %q does not match configured provider region %q",
				ErrRegionMismatch, arn.Region, p.region)
		}

		// Enforce account match
		if p.expectedAccount != "" && arn.AccountID != p.expectedAccount {
			return nil, fmt.Errorf("%w: ARN account %q does not match expected account %q",
				ErrAccountMismatch, arn.AccountID, p.expectedAccount)
		}

		return arn, nil
	}

	return nil, nil
}

// GetPublicKey fetches the SECP256K1 public key from AWS KMS, validates metadata, and locks canonical key identity.
func (p *Provider) GetPublicKey(ctx context.Context, keyID string) ([]byte, error) {
	trimmedKeyID := strings.TrimSpace(keyID)
	parsedARN, err := p.validateKeyID(trimmedKeyID)
	if err != nil {
		return nil, err
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

	// Validate output.KeyId against requested key and ensure no mutable aliases
	resolvedKey := trimmedKeyID
	if output.KeyId != nil && *output.KeyId != "" {
		returnedKey := strings.TrimSpace(*output.KeyId)
		if IsAlias(returnedKey) {
			return nil, fmt.Errorf("%w: AWS KMS returned mutable alias %q as KeyId", ErrAliasNotPermitted, returnedKey)
		}

		if strings.HasPrefix(returnedKey, "arn:") {
			returnedARN, err := ParseKeyARN(returnedKey)
			if err != nil {
				return nil, fmt.Errorf("%w: AWS KMS returned invalid KeyId ARN %q: %v", ErrInvalidKeyARN, returnedKey, err)
			}

			// If caller requested an ARN, verify that returned ARN matches the requested ARN
			if parsedARN != nil {
				if returnedARN.KeyID != parsedARN.KeyID ||
					!strings.EqualFold(returnedARN.Region, parsedARN.Region) ||
					returnedARN.AccountID != parsedARN.AccountID {
					return nil, fmt.Errorf("%w: AWS KMS returned key ARN %q, expected %q",
						ErrKeyIdentityMismatch, returnedKey, parsedARN.Raw)
				}
			}
			resolvedKey = returnedARN.Raw
		}
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

	// Lock the canonical verified key identity
	p.mu.Lock()
	p.canonicalKeyARN = resolvedKey
	p.mu.Unlock()

	return output.PublicKey, nil
}

// SignDigest signs a precomputed 32-byte Keccak-256 digest using AWS KMS asymmetric signing,
// strictly verifying that the target key matches the canonical key identity established during GetPublicKey.
func (p *Provider) SignDigest(ctx context.Context, keyID string, digest []byte) ([]byte, error) {
	trimmedKeyID := strings.TrimSpace(keyID)
	_, err := p.validateKeyID(trimmedKeyID)
	if err != nil {
		return nil, err
	}

	if len(digest) != 32 {
		return nil, fmt.Errorf("%w: expected 32 bytes, got %d", ErrInvalidDigestLength, len(digest))
	}

	// Enforce that keyID strictly matches the verified canonical key identity
	p.mu.RLock()
	canonical := p.canonicalKeyARN
	p.mu.RUnlock()

	if canonical != "" && !strings.EqualFold(trimmedKeyID, canonical) {
		return nil, fmt.Errorf("%w: requested key %q does not match canonical verified key %q",
			ErrKeyIdentityMismatch, trimmedKeyID, canonical)
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

	// Verify that AWS KMS signed with the expected canonical key identity
	if output.KeyId != nil && *output.KeyId != "" && canonical != "" {
		returnedKey := strings.TrimSpace(*output.KeyId)
		if IsAlias(returnedKey) {
			return nil, fmt.Errorf("%w: AWS KMS returned mutable alias %q as signer KeyId", ErrAliasNotPermitted, returnedKey)
		}
		if strings.HasPrefix(returnedKey, "arn:") && !strings.EqualFold(returnedKey, canonical) {
			return nil, fmt.Errorf("%w: AWS KMS signed with key %q, expected canonical key %q",
				ErrKeyIdentityMismatch, returnedKey, canonical)
		}
	}

	return output.Signature, nil
}
