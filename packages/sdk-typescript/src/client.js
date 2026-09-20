"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPay = void 0;
const errors_js_1 = require("./errors.js");
const agents_js_1 = require("./resources/agents.js");
const approvals_js_1 = require("./resources/approvals.js");
const payment_intents_js_1 = require("./resources/payment-intents.js");
const services_js_1 = require("./resources/services.js");
const transactions_js_1 = require("./resources/transactions.js");
const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT_MS = 10000;
/**
 * AgentPay — Programmable Financial Control Plane for AI Agents.
 *
 * Provides typed methods to interact with the AgentPay API, enabling AI agents
 * to procure external services and trigger on-chain USDC payments governed by
 * deterministic spending policies and human approvals.
 *
 * NOTE: The SDK never signs transactions, holds private keys, or directly
 * accesses the on-chain AgentVault.
 */
class AgentPay {
    apiKey;
    baseUrl;
    timeoutMs;
    customFetch;
    agents;
    services;
    paymentIntents;
    approvals;
    transactions;
    constructor(options = {}) {
        this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env?.AGENTPAY_API_KEY : undefined);
        this.baseUrl = (options.baseUrl ||
            (typeof process !== 'undefined' ? process.env?.AGENTPAY_BASE_URL : undefined) ||
            DEFAULT_BASE_URL).replace(/\/+$/, '');
        this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
        this.customFetch = options.fetch;
        this.agents = new agents_js_1.AgentsResource(this);
        this.services = new services_js_1.ServicesResource(this);
        this.paymentIntents = new payment_intents_js_1.PaymentIntentsResource(this);
        this.approvals = new approvals_js_1.ApprovalsResource(this);
        this.transactions = new transactions_js_1.TransactionsResource(this);
    }
    /**
     * Internal request dispatcher with centralized error handling, request ID propagation,
     * and idempotency support.
     */
    async request(path, init = {}, options = {}) {
        const fetchImpl = this.customFetch || globalThis.fetch;
        if (!fetchImpl) {
            throw new errors_js_1.NetworkError('No fetch implementation available in the current environment.');
        }
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const timeout = options.timeoutMs || this.timeoutMs;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(options.headers || {}),
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        if (options.idempotencyKey) {
            headers['Idempotency-Key'] = options.idempotencyKey;
        }
        try {
            const response = await fetchImpl(url, {
                ...init,
                headers,
                signal: controller.signal,
            });
            const requestId = response.headers.get('x-request-id') || undefined;
            if (!response.ok) {
                let code = 'UNKNOWN_ERROR';
                let message = `Request failed with status ${response.status}`;
                try {
                    const body = await response.json();
                    if (body?.error) {
                        code = body.error.code || code;
                        message = body.error.message || message;
                    }
                    else if (body?.message) {
                        message = body.message;
                    }
                }
                catch {
                    // Non-JSON response body
                }
                // Map to typed error classes
                switch (response.status) {
                    case 401:
                        throw new errors_js_1.UnauthorizedError(message, requestId);
                    case 403:
                        throw new errors_js_1.ForbiddenError(message, requestId);
                    case 404:
                        throw new errors_js_1.NotFoundError(message, requestId);
                    case 429:
                        throw new errors_js_1.RateLimitError(message, requestId);
                    default:
                        if (code === 'POLICY_DENIED' || code === 'PAYMENT_POLICY_DENIED') {
                            throw new errors_js_1.PolicyDeniedError(message, requestId);
                        }
                        if (code === 'APPROVAL_REQUIRED') {
                            throw new errors_js_1.ApprovalRequiredError(message, undefined, requestId);
                        }
                        throw new errors_js_1.AgentPayError(message, code, response.status, requestId);
                }
            }
            return (await response.json());
        }
        catch (err) {
            if (err instanceof errors_js_1.AgentPayError) {
                throw err;
            }
            if (err instanceof DOMException && err.name === 'AbortError') {
                throw new errors_js_1.NetworkError(`Request timed out after ${timeout}ms`, 'TIMEOUT');
            }
            const msg = err instanceof Error ? err.message : 'Network request failed';
            throw new errors_js_1.NetworkError(msg);
        }
        finally {
            clearTimeout(timer);
        }
    }
}
exports.AgentPay = AgentPay;
