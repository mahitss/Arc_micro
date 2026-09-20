"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentIntentsResource = void 0;
class PaymentIntentsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Create a new Payment Intent.
     *
     * The backend resolves the approved recipient, evaluates spending policies and risk,
     * and marks the intent as AUTHORIZED, APPROVAL_REQUIRED, or DENIED.
     *
     * Use options.idempotencyKey to guarantee exactly-once payment creation across retries.
     */
    async create(params, options) {
        const payload = {
            agent_id: params.agentId,
            service: params.service,
            amount: params.amount,
            asset: params.asset || 'USDC',
            purpose: params.purpose,
            justification: params.justification,
            vault_address: params.vaultAddress,
        };
        return this.client.request('/v1/payment-intents', {
            method: 'POST',
            body: JSON.stringify(payload),
        }, options);
    }
    /**
     * Retrieve a Payment Intent by its ID.
     */
    async get(id, options) {
        return this.client.request(`/v1/payment-intents/${encodeURIComponent(id)}`, { method: 'GET' }, options);
    }
    /**
     * List Payment Intents for the authenticated organization.
     */
    async list(filter, options) {
        const query = filter?.status ? `?status=${encodeURIComponent(filter.status)}` : '';
        const res = await this.client.request(`/v1/payment-intents${query}`, { method: 'GET' }, options);
        return res.payment_intents || [];
    }
    /**
     * Confirm and execute an authorized or approved Payment Intent on Arc.
     */
    async confirm(id, options) {
        return this.client.request(`/v1/payment-intents/${encodeURIComponent(id)}/confirm`, { method: 'POST' }, options);
    }
}
exports.PaymentIntentsResource = PaymentIntentsResource;
