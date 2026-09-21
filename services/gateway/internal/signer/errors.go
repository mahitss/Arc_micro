package signer

import "errors"

var (
	ErrSignerNotConfigured        = errors.New("signer is not configured")
	ErrSignerBackendUnsupported   = errors.New("unsupported signer backend: only 'local' and 'kms' are recognized")
	ErrSignerUnavailable          = errors.New("signer backend is unavailable")
	ErrKMSSignerUnavailable       = errors.New("KMS signer configured but not available: production KMS/HSM integration requires AWS/GCP KMS key ARN and client adapter")
	ErrInvalidChainID             = errors.New("invalid or mismatched chain ID for signing")
	ErrInvalidTransaction         = errors.New("invalid transaction: transaction is nil or missing required fields")
	ErrTransactionBindingMismatch = errors.New("transaction binding mismatch: transaction properties do not match authorized execution request")
	ErrSigningFailed              = errors.New("cryptographic signing operation failed")
	ErrNilTransaction             = errors.New("cannot sign nil transaction")
	ErrEmptyPrivateKey            = errors.New("executor private key cannot be empty")
	ErrInvalidPrivateKeyLength    = errors.New("executor private key must be a 64-character hex string (32 bytes)")
	ErrSignerAddressMismatch      = errors.New("derived signer address does not match authorized address")
)
