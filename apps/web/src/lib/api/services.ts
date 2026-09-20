/**
 * @file services.ts
 * @description API queries for the Service Registry.
 */

import { apiRequest } from './client';
import { RegisteredService, ServiceQuote, SimulationRequest, SimulationResponse } from './types';

export async function fetchServices(filter?: {
  category?: string;
  trustStatus?: string;
  enabled?: boolean;
}): Promise<RegisteredService[]> {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.trustStatus) params.set('trust_status', filter.trustStatus);
  if (filter?.enabled !== undefined) params.set('enabled', String(filter.enabled));

  const qs = params.toString();
  const path = qs ? `/v1/services?${qs}` : '/v1/services';

  const resp = await apiRequest<{ services: RegisteredService[] }>(path);
  return resp.services || [];
}

export async function fetchServiceQuote(
  serviceId: string,
  amount?: string,
  asset?: string
): Promise<ServiceQuote> {
  return apiRequest<ServiceQuote>(`/v1/services/${encodeURIComponent(serviceId)}/quote`, {
    method: 'POST',
    body: JSON.stringify({ amount, asset }),
  });
}

export async function runSimulation(request: SimulationRequest): Promise<SimulationResponse> {
  return apiRequest<SimulationResponse>('/v1/simulations', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
