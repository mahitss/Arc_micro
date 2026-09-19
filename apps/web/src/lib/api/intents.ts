/**
 * @file intents.ts
 * @description API queries and mutations for Payment Intents.
 */

import { apiRequest } from './client';
import { PaymentIntent, PaymentIntentDetail } from './types';

export async function fetchIntents(statusFilter?: string): Promise<PaymentIntent[]> {
  const query = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const resp = await apiRequest<{ payment_intents: PaymentIntent[] }>(`/v1/payment-intents${query}`);
  return resp.payment_intents || [];
}

export async function fetchIntent(id: string): Promise<PaymentIntentDetail> {
  return await apiRequest<PaymentIntentDetail>(`/v1/payment-intents/${encodeURIComponent(id)}`);
}

export async function authorizeIntent(id: string): Promise<PaymentIntentDetail> {
  return await apiRequest<PaymentIntentDetail>(`/v1/payment-intents/${encodeURIComponent(id)}/authorize`, {
    method: 'POST',
  });
}

export async function confirmIntent(id: string): Promise<PaymentIntentDetail> {
  return await apiRequest<PaymentIntentDetail>(`/v1/payment-intents/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
  });
}
