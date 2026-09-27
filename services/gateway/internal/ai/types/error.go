package types

import "fmt"

// AIErrorCode represents standardized error codes for the universal AI provider layer.
type AIErrorCode string

const (
	ErrCodeProviderUnavailable   AIErrorCode = "PROVIDER_UNAVAILABLE"
	ErrCodeRateLimited           AIErrorCode = "RATE_LIMITED"
	ErrCodeTimeout               AIErrorCode = "TIMEOUT"
	ErrCodeInvalidSchema         AIErrorCode = "INVALID_SCHEMA"
	ErrCodeModelRefusal          AIErrorCode = "MODEL_REFUSAL"
	ErrCodeContextLengthExceeded AIErrorCode = "CONTEXT_LENGTH_EXCEEDED"
	ErrCodeToolExecutionFailed   AIErrorCode = "TOOL_EXECUTION_FAILED"
	ErrCodeSecurityViolation     AIErrorCode = "SECURITY_BOUNDARY_VIOLATION"
	ErrCodeMalformedOutput       AIErrorCode = "MALFORMED_OUTPUT"
	ErrCodeEmptyResponse         AIErrorCode = "EMPTY_RESPONSE"
	ErrCodeProposalExpired       AIErrorCode = "PROPOSAL_EXPIRED"
	ErrCodeProposalReplayed      AIErrorCode = "PROPOSAL_REPLAYED"
)

// AIError encapsulates a structured AI error with contextual metadata.
type AIError struct {
	Code       AIErrorCode `json:"code"`
	Message    string      `json:"message"`
	Provider   string      `json:"provider,omitempty"`
	Model      string      `json:"model,omitempty"`
	HTTPStatus int         `json:"http_status,omitempty"`
	Retryable  bool        `json:"retryable"`
	Err        error       `json:"-"`
}

func (e *AIError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AIError) Unwrap() error {
	return e.Err
}

// NewAIError creates a new AIError.
func NewAIError(code AIErrorCode, message string, retryable bool, err error) *AIError {
	return &AIError{
		Code:      code,
		Message:   message,
		Retryable: retryable,
		Err:       err,
	}
}
