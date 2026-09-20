/**
 * Base error class for all AgentPay SDK exceptions.
 */
export class AgentPayError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly requestId?: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode?: number, requestId?: string) {
    super(message);
    this.name = 'AgentPayError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a payment violates deterministic spending policies (e.g. daily limit, per-tx limit, unapproved recipient).
 */
export class PolicyDeniedError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'POLICY_DENIED', 400, requestId);
    this.name = 'PolicyDeniedError';
  }
}

/**
 * Thrown or signaled when a payment requires human approval before settlement on Arc.
 */
export class ApprovalRequiredError extends AgentPayError {
  public readonly intentId?: string;

  constructor(message: string, intentId?: string, requestId?: string) {
    super(message, 'APPROVAL_REQUIRED', 200, requestId);
    this.name = 'ApprovalRequiredError';
    this.intentId = intentId;
  }
}

/**
 * Thrown when authentication fails (missing, invalid, or revoked API key).
 */
export class UnauthorizedError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'UNAUTHORIZED', 401, requestId);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Thrown when an API key lacks required scopes (e.g. attempting to approve without payments:approve).
 */
export class ForbiddenError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'FORBIDDEN', 403, requestId);
    this.name = 'ForbiddenError';
  }
}

/**
 * Thrown when a requested resource (intent, agent, service, approval) does not exist or belongs to another tenant.
 */
export class NotFoundError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'NOT_FOUND', 404, requestId);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when API rate limits are exceeded.
 */
export class RateLimitError extends AgentPayError {
  constructor(message: string, requestId?: string) {
    super(message, 'RATE_LIMITED', 429, requestId);
    this.name = 'RateLimitError';
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
