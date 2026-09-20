/**
 * Base error class for all AgentPay SDK exceptions.
 */
export class AgentPayError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    requestId?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'AgentPayError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when authentication fails (missing, invalid, or revoked API key).
 * HTTP 401 Unauthorized.
 */
export class AuthenticationError extends AgentPayError {
  constructor(message: string = 'Authentication failed', requestId?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, requestId);
    this.name = 'AuthenticationError';
  }
}
// Backward compatibility alias
export const UnauthorizedError = AuthenticationError;
export type UnauthorizedError = AuthenticationError;

/**
 * Thrown when an API key lacks required permissions or scopes.
 * HTTP 403 Forbidden.
 */
export class AuthorizationError extends AgentPayError {
  constructor(message: string = 'Permission denied', requestId?: string) {
    super(message, 'AUTHORIZATION_ERROR', 403, requestId);
    this.name = 'AuthorizationError';
  }
}
// Backward compatibility alias
export const ForbiddenError = AuthorizationError;
export type ForbiddenError = AuthorizationError;

/**
 * Thrown when input parameters fail validation.
 * HTTP 400 Bad Request.
 */
export class ValidationError extends AgentPayError {
  constructor(message: string, details?: unknown, requestId?: string) {
    super(message, 'VALIDATION_ERROR', 400, requestId, details);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a requested resource (intent, agent, service, approval) does not exist or belongs to another tenant.
 * HTTP 404 Not Found.
 */
export class NotFoundError extends AgentPayError {
  constructor(message: string = 'Resource not found', requestId?: string) {
    super(message, 'NOT_FOUND', 404, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when an operation encounters a state conflict (e.g. duplicate intent or stale version).
 * HTTP 409 Conflict.
 */
export class ConflictError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'CONFLICT', 409, requestId);
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when API rate limits are exceeded.
 * HTTP 429 Too Many Requests.
 */
export class RateLimitedError extends AgentPayError {
  constructor(message: string = 'Rate limit exceeded', requestId?: string) {
    super(message, 'RATE_LIMITED', 429, requestId);
    this.name = 'RateLimitedError';
  }
}
// Backward compatibility alias
export const RateLimitError = RateLimitedError;
export type RateLimitError = RateLimitedError;

/**
 * Thrown when a payment violates deterministic spending policies (e.g. daily limit, per-tx limit, unapproved recipient).
 */
export class PolicyDeniedError extends AgentPayError {
  public readonly reason?: string;

  constructor(message: string, reason?: string, requestId?: string) {
    super(message, 'POLICY_DENIED', 400, requestId, { reason });
    this.name = 'PolicyDeniedError';
    this.reason = reason;
  }
}

/**
 * Thrown or signaled when a payment requires human approval before settlement on Arc.
 */
export class ApprovalRequiredError extends AgentPayError {
  public readonly intentId?: string;

  constructor(message: string, intentId?: string, requestId?: string) {
    super(message, 'APPROVAL_REQUIRED', 200, requestId, { intentId });
    this.name = 'ApprovalRequiredError';
    this.intentId = intentId;
  }
}

/**
 * Thrown when treasury balances or reservations are insufficient to cover the payment.
 */
export class InsufficientTreasuryError extends AgentPayError {
  constructor(message: string = 'Insufficient treasury balance', requestId?: string) {
    super(message, 'INSUFFICIENT_TREASURY', 400, requestId);
    this.name = 'InsufficientTreasuryError';
  }
}

/**
 * Thrown when payment execution or settlement fails on the Arc network.
 */
export class ExecutionError extends AgentPayError {
  public readonly txHash?: string;

  constructor(message: string, txHash?: string, requestId?: string) {
    super(message, 'EXECUTION_ERROR', 500, requestId, { txHash });
    this.name = 'ExecutionError';
    this.txHash = txHash;
  }
}

/**
 * Thrown when network connection fails or requests time out.
 */
export class NetworkError extends AgentPayError {
  constructor(message: string, code: string = 'NETWORK_ERROR') {
    super(message, code, 503);
    this.name = 'NetworkError';
  }
}

/**
 * Fallback for unexpected errors.
 */
export class UnknownError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'UNKNOWN_ERROR', 500, requestId);
    this.name = 'UnknownError';
  }
}
