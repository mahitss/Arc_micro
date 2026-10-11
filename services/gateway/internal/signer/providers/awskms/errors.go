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
)

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
