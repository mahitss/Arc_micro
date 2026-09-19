/**
 * @file transactions.ts
 * @description API queries for on-chain payment execution records.
 */

import { apiRequest } from './client';
import { TransactionRecord } from './types';

export async function fetchTransactions(): Promise<TransactionRecord[]> {
  const resp = await apiRequest<{ transactions: TransactionRecord[] }>('/v1/transactions');
  return resp.transactions || [];
}
