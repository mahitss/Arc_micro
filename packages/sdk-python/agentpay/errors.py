"""
AgentPay Python SDK Errors
"""

class AgentPayError(Exception):
    """Base exception for all AgentPay errors."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", status_code: int = None, request_id: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.request_id = request_id
        self.details = details or {}

class AuthenticationError(AgentPayError):
    """Raised when authentication fails (HTTP 401)."""
    def __init__(self, message: str = "Authentication failed", request_id: str = None):
        super().__init__(message, "AUTHENTICATION_ERROR", 401, request_id)

class AuthorizationError(AgentPayError):
    """Raised when API key lacks required permissions (HTTP 403)."""
    def __init__(self, message: str = "Permission denied", request_id: str = None):
        super().__init__(message, "AUTHORIZATION_ERROR", 403, request_id)

class ValidationError(AgentPayError):
    """Raised when request parameters fail validation (HTTP 400)."""
    def __init__(self, message: str, details: dict = None, request_id: str = None):
        super().__init__(message, "VALIDATION_ERROR", 400, request_id, details)

class NotFoundError(AgentPayError):
    """Raised when requested resource is not found (HTTP 404)."""
    def __init__(self, message: str = "Resource not found", request_id: str = None):
        super().__init__(message, "NOT_FOUND", 404, request_id)

class ConflictError(AgentPayError):
    """Raised when an operation conflicts with existing state (HTTP 409)."""
    def __init__(self, message: str, request_id: str = None):
        super().__init__(message, "CONFLICT", 409, request_id)

class RateLimitedError(AgentPayError):
    """Raised when API rate limits are exceeded (HTTP 429)."""
    def __init__(self, message: str = "Rate limit exceeded", request_id: str = None):
        super().__init__(message, "RATE_LIMITED", 429, request_id)

class PolicyDeniedError(AgentPayError):
    """Raised when a payment violates deterministic spending policies."""
    def __init__(self, message: str, reason: str = None, request_id: str = None):
        super().__init__(message, "POLICY_DENIED", 400, request_id, {"reason": reason})
        self.reason = reason

class ApprovalRequiredError(AgentPayError):
    """Raised when a payment requires human approval."""
    def __init__(self, message: str, intent_id: str = None, request_id: str = None):
        super().__init__(message, "APPROVAL_REQUIRED", 200, request_id, {"intent_id": intent_id})
        self.intent_id = intent_id

class InsufficientTreasuryError(AgentPayError):
    """Raised when treasury vault has insufficient funds."""
    def __init__(self, message: str = "Insufficient treasury balance", request_id: str = None):
        super().__init__(message, "INSUFFICIENT_TREASURY", 400, request_id)

class ExecutionError(AgentPayError):
    """Raised when payment execution fails on Arc."""
    def __init__(self, message: str, tx_hash: str = None, request_id: str = None):
        super().__init__(message, "EXECUTION_ERROR", 500, request_id, {"tx_hash": tx_hash})
        self.tx_hash = tx_hash

class NetworkError(AgentPayError):
    """Raised when a network or timeout error occurs."""
    def __init__(self, message: str, code: str = "NETWORK_ERROR"):
        super().__init__(message, code, 503)
