"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsResource = void 0;
const errors_js_1 = require("../errors.js");
class TransactionsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * List confirmed and submitted blockchain execution transactions.
     */
    async list(options) {
        const res = await this.client.request('/v1/transactions', { method: 'GET' }, options);
        return res.transactions || [];
    }
    /**
     * Retrieve transaction execution details for a specific payment intent.
     */
    async get(intentId, options) {
        const list = await this.list(options);
        const found = list.find((tx) => tx.intent_id === intentId);
        if (!found) {
            throw new errors_js_1.NotFoundError(`Transaction for intent '${intentId}' not found`);
        }
        return found;
    }
}
exports.TransactionsResource = TransactionsResource;
