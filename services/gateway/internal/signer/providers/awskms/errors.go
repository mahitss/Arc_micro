package awskms

import (
	"errors"
	"fmt"
	"strings"

	"github.com/aws/smithy-go"
)

var (
	ErrEmptyKeyID           = errors.New("KMS key ID cannot be empty")
	ErrEmptyRegion          = errors.New("AWS region cannot be empty")
	ErrNilClient            = errors.New("AWS KMS client cannot be nil")
	ErrInvalidDigestLength  = errors.New("signing digest must be exactly 32 bytes")
	ErrUnsupportedKeySpec   = errors.New("unsupported KMS key specification: expected ECC_SECG_P256K1")
	ErrUnsupportedKeyUsage  = errors.New("unsupported KMS key usage: expected SIGN_VERIFY")
	ErrUnsupportedAlgorithm = errors.New("KMS key does not support ECDSA_SHA_256 signing algorithm")
	ErrEmptyPublicKey       = errors.New("KMS returned empty public key bytes")
	ErrEmptySignature       = errors.New("KMS returned empty signature bytes")
	ErrKMSAccessDenied      = errors.New("AWS KMS access denied")
	ErrKMSThrottling        = errors.New("AWS KMS request throttled")
	ErrKMSNotFound          = errors.New("AWS KMS key not found")
	ErrKMSUnavailable       = errors.New("AWS KMS service unavailable or key disabled")

	// Task A: Alias Hardening & Key Identity Errors
	ErrAliasNotPermitted   = errors.New("mutable KMS key alias is not permitted: immutable full key ARN is required")
	ErrInvalidKeyARN       = errors.New("invalid AWS KMS key ARN")
	ErrRegionMismatch      = errors.New("KMS key ARN region does not match provider configured region")
	ErrAccountMismatch     = errors.New("KMS key ARN account does not match expected AWS account")
	ErrKeyIdentityMismatch = errors.New("requested key identity does not match canonical verified key ARN")
)

// KeyARN represents the parsed and validated components of an immutable AWS KMS key ARN.
type KeyARN struct {
	Raw       string
	Partition string
	Region    string
	AccountID string
	KeyID     string
}

// ParseKeyARN parses and validates an immutable AWS KMS key ARN.
// It strictly rejects alias names (e.g. "alias/...") and alias ARNs (e.g. "arn:aws:kms:...:alias/...").
func ParseKeyARN(raw string) (*KeyARN, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, ErrEmptyKeyID
	}

	// Reject alias names and alias ARNs
	if IsAlias(trimmed) {
		return nil, fmt.Errorf("%w: %q", ErrAliasNotPermitted, trimmed)
	}

	if !strings.HasPrefix(trimmed, "arn:") {
		return nil, fmt.Errorf("%w: expected ARN starting with 'arn:', got %q", ErrInvalidKeyARN, trimmed)
	}

	parts := strings.Split(trimmed, ":")
	if len(parts) != 6 {
		return nil, fmt.Errorf("%w: expected 6 colon-separated segments, got %d in %q", ErrInvalidKeyARN, len(parts), trimmed)
	}

	partition := parts[1]
	service := parts[2]
	region := parts[3]
	account := parts[4]
	resource := parts[5]

	if !strings.HasPrefix(partition, "aws") {
		return nil, fmt.Errorf("%w: invalid ARN partition %q", ErrInvalidKeyARN, partition)
	}
	if service != "kms" {
		return nil, fmt.Errorf("%w: expected service 'kms', got %q", ErrInvalidKeyARN, service)
	}
	if region == "" {
		return nil, fmt.Errorf("%w: ARN region cannot be empty in %q", ErrInvalidKeyARN, trimmed)
	}
	if len(account) != 12 || !isAllDigits(account) {
		return nil, fmt.Errorf("%w: AWS account must be a 12-digit numeric ID, got %q", ErrInvalidKeyARN, account)
	}
	if !strings.HasPrefix(resource, "key/") {
		return nil, fmt.Errorf("%w: expected resource type 'key/<id>', got %q", ErrInvalidKeyARN, resource)
	}

	keyID := strings.TrimPrefix(resource, "key/")
	if strings.TrimSpace(keyID) == "" {
		return nil, fmt.Errorf("%w: key ID segment cannot be empty in %q", ErrInvalidKeyARN, trimmed)
	}

	return &KeyARN{
		Raw:       trimmed,
		Partition: partition,
		Region:    region,
		AccountID: account,
		KeyID:     keyID,
	}, nil
}

// IsAlias checks if the string represents an AWS KMS alias name or alias ARN.
func IsAlias(keyID string) bool {
	trimmed := strings.TrimSpace(keyID)
	return strings.HasPrefix(trimmed, "alias/") || strings.Contains(trimmed, ":alias/")
}

func isAllDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ClassifyKMSError wraps and classifies raw AWS/Smithy SDK errors into safe, auditable errors.
// It guarantees that credentials, secret tokens, or raw signature/digest bytes are never leaked.
func ClassifyKMSError(op, keyID string, err error) error {
	if err == nil {
		return nil
	}

	sanitizedKey := sanitizeKeyID(keyID)
	var apiErr smithy.APIError
	if errors.As(err, &apiErr) {
		code := apiErr.ErrorCode()
		msg := apiErr.ErrorMessage()
		switch code {
		case "AccessDeniedException":
			return fmt.Errorf("%w: operation %s on key %q: %s", ErrKMSAccessDenied, op, sanitizedKey, msg)
		case "ThrottlingException", "LimitExceededException":
			return fmt.Errorf("%w: operation %s on key %q: %s", ErrKMSThrottling, op, sanitizedKey, msg)
		case "NotFoundException":
			return fmt.Errorf("%w: operation %s on key %q: %s", ErrKMSNotFound, op, sanitizedKey, msg)
		case "DisabledException", "KeyUnavailableException", "KMSInternalException", "DependencyTimeoutException":
			return fmt.Errorf("%w: operation %s on key %q: %s", ErrKMSUnavailable, op, sanitizedKey, msg)
		default:
			return fmt.Errorf("AWS KMS %s failed (code: %s) on key %q: %s", op, code, sanitizedKey, msg)
		}
	}

	return fmt.Errorf("AWS KMS %s failed on key %q: %w", op, sanitizedKey, err)
}

func sanitizeKeyID(keyID string) string {
	trimmed := strings.TrimSpace(keyID)
	if trimmed == "" {
		return "unknown"
	}
	return trimmed
}
