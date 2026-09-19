/**
 * @file services.ts
 * @description API queries for the Service Registry.
 */

import { apiRequest } from './client';
import { RegisteredService } from './types';

export async function fetchServices(): Promise<RegisteredService[]> {
  const resp = await apiRequest<{ services: RegisteredService[] }>('/v1/services');
  return resp.services || [];
}
