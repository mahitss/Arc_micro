/**
 * @file security.ts
 * @description API queries and mutations for the Adversarial Agent Lab.
 */

import { apiRequest } from './client';
import { SecurityLabReport } from './types';

export async function fetchSecurityReport(): Promise<SecurityLabReport> {
  return await apiRequest<SecurityLabReport>('/v1/security-lab/report');
}

export async function runSecurityLab(): Promise<SecurityLabReport> {
  return await apiRequest<SecurityLabReport>('/v1/security-lab/run', {
    method: 'POST',
  });
}
