"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalsResource = void 0;
class ApprovalsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * List pending and resolved human approvals for the organization.
     */
    async list(options) {
        const res = await this.client.request('/v1/approvals', { method: 'GET' }, options);
        return res.approvals || [];
    }
    /**
     * Retrieve an approval record by ID.
     */
    async get(id, options) {
        return this.client.request(`/v1/approvals/${encodeURIComponent(id)}`, { method: 'GET' }, options);
    }
    /**
     * Grant approval for a pending high-value or elevated-risk payment intent.
     */
    async approve(id, options) {
        return this.client.request(`/v1/approvals/${encodeURIComponent(id)}/approve`, { method: 'POST' }, options);
    }
    /**
     * Reject a pending payment intent.
     */
    async reject(id, options) {
        return this.client.request(`/v1/approvals/${encodeURIComponent(id)}/reject`, { method: 'POST' }, options);
    }
}
exports.ApprovalsResource = ApprovalsResource;
