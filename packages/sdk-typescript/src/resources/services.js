"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesResource = void 0;
const errors_js_1 = require("../errors.js");
class ServicesResource {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * List all registered external services available for agent procurement.
     */
    async list(options) {
        const res = await this.client.request('/v1/services', { method: 'GET' }, options);
        return res.services || [];
    }
    /**
     * Retrieve a specific registered service by ID.
     */
    async get(id, options) {
        const list = await this.list(options);
        const found = list.find((s) => s.id === id);
        if (!found) {
            throw new errors_js_1.NotFoundError(`Service '${id}' not found in registry`);
        }
        return found;
    }
}
exports.ServicesResource = ServicesResource;
