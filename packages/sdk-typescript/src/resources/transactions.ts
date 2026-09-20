import type { AgentPay } from '../client.js';
import { NotFoundError } from '../errors.js';
import type { RequestOptions, TransactionRecord } from '../types.js';

export class TransactionsResource {
  constructor(private readonly client: AgentPay) {}

  /**
   * List confirmed and submitted blockchain execution transactions.
   */
  async list(options?: RequestOptions): Promise<TransactionRecord[]> {
    const res = await this.client.request<{ transactions: TransactionRecord[] }>(
      '/v1/transactions',
      { method: 'GET' },
      options
    );
    return res.transactions || [];
  }

  /**
   * Retrieve transaction execution details for a specific payment intent.
   */
  async get(intentId: string, options?: RequestOptions): Promise<TransactionRecord> {
    const list = await this.list(options);
    const found = list.find((tx) => tx.intent_id === intentId);
    if (!found) {
      throw new NotFoundError(`Transaction for intent '${intentId}' not found`);
    }
    return found;
  }
}
