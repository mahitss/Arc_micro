"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsResource = void 0;
class AgentsResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * List all agents belonging to the authenticated organization.
     */
    async list(options) {
        const res = await this.client.request('/v1/agents', { method: 'GET' }, options);
        return res.agents || [];
    }
    /**
     * Retrieve an agent by ID with its configured spending policy and limits.
     */
    async get(id, options) {
        return this.client.request(`/v1/agents/${encodeURIComponent(id)}`, { method: 'GET' }, options);
    }
}
exports.AgentsResource = AgentsResource;
