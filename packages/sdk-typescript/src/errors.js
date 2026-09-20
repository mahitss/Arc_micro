"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.RateLimitError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ApprovalRequiredError = exports.PolicyDeniedError = exports.AgentPayError = void 0;
/**
 * Base error class for all AgentPay SDK exceptions.
 */
class AgentPayError extends Error {
    code;
    statusCode;
    requestId;
    constructor(message, code = 'UNKNOWN_ERROR', statusCode, requestId) {
        super(message);
        this.name = 'AgentPayError';
        this.code = code;
        this.statusCode = statusCode;
        this.requestId = requestId;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AgentPayError = AgentPayError;
/**
 * Thrown when a payment violates deterministic spending policies (e.g. daily limit, per-tx limit, unapproved recipient).
 */
class PolicyDeniedError extends AgentPayError {
    constructor(message, requestId) {
        super(message, 'POLICY_DENIED', 400, requestId);
        this.name = 'PolicyDeniedError';
    }
}
exports.PolicyDeniedError = PolicyDeniedError;
/**
 * Thrown or signaled when a payment requires human approval before settlement on Arc.
 */
class ApprovalRequiredError extends AgentPayError {
    intentId;
    constructor(message, intentId, requestId) {
        super(message, 'APPROVAL_REQUIRED', 200, requestId);
        this.name = 'ApprovalRequiredError';
        this.intentId = intentId;
    }
}
exports.ApprovalRequiredError = ApprovalRequiredError;
/**
 * Thrown when authentication fails (missing, invalid, or revoked API key).
 */
class UnauthorizedError extends AgentPayError {
    constructor(message, requestId) {
        super(message, 'UNAUTHORIZED', 401, requestId);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Thrown when an API key lacks required scopes (e.g. attempting to approve without payments:approve).
 */
class ForbiddenError extends AgentPayError {
    constructor(message, requestId) {
        super(message, 'FORBIDDEN', 403, requestId);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Thrown when a requested resource (intent, agent, service, approval) does not exist or belongs to another tenant.
 */
class NotFoundError extends AgentPayError {
    constructor(message, requestId) {
        super(message, 'NOT_FOUND', 404, requestId);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Thrown when API rate limits are exceeded.
 */
class RateLimitError extends AgentPayError {
    constructor(message, requestId) {
        super(message, 'RATE_LIMITED', 429, requestId);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Thrown when network connection fails or requests time out.
 */
class NetworkError extends AgentPayError {
    constructor(message, code = 'NETWORK_ERROR') {
        super(message, code, 503);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
