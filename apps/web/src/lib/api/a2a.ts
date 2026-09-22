/**
 * @file a2a.ts
 * @description Typed client methods for Agent-to-Agent Economic Network endpoints.
 */

import { apiRequest } from './client';
import type { AgentQuote, AgentService, EconomicGraph, Hire } from './types';

export interface DiscoverAgentsFilter {
  capability?: string;
  max_price?: string;
  min_reputation?: number;
  risk?: string;
  availability?: string;
}

export async function discoverAgents(filter?: DiscoverAgentsFilter): Promise<AgentService[]> {
  const params = new URLSearchParams();
  if (filter?.capability) params.set('capability', filter.capability);
  if (filter?.max_price) params.set('max_price', filter.max_price);
  if (filter?.min_reputation !== undefined) params.set('min_reputation', String(filter.min_reputation));
  if (filter?.risk) params.set('risk', filter.risk);
  if (filter?.availability) params.set('availability', filter.availability);

  const qs = params.toString();
  const path = `/v1/agents/discover${qs ? `?${qs}` : ''}`;
  const res = await apiRequest<{ agents: AgentService[] }>(path, { method: 'GET' });
  return res.agents || [];
}

export async function getAgentServices(agentId: string): Promise<AgentService[]> {
  const res = await apiRequest<{ services: AgentService[] }>(
    `/v1/agents/services/${encodeURIComponent(agentId)}`,
    { method: 'GET' }
  );
  return res.services || [];
}

export async function getAgentService(serviceId: string): Promise<AgentService> {
  return apiRequest<AgentService>(
    `/v1/agent-services/${encodeURIComponent(serviceId)}`,
    { method: 'GET' }
  );
}

export interface RequestAgentQuoteParams {
  buyer_agent_id: string;
  mission_id?: string;
  proposed_price?: string;
  terms?: Record<string, string>;
}

export async function requestAgentQuote(
  serviceId: string,
  params: RequestAgentQuoteParams
): Promise<AgentQuote> {
  return apiRequest<AgentQuote>(
    `/v1/agent-services/${encodeURIComponent(serviceId)}/quotes`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

export async function getAgentQuote(quoteId: string): Promise<AgentQuote> {
  return apiRequest<AgentQuote>(
    `/v1/quotes/${encodeURIComponent(quoteId)}`,
    { method: 'GET' }
  );
}

export interface CounterQuoteParams {
  agent_id: string;
  proposed_price: string;
  terms?: Record<string, string>;
}

export async function counterAgentQuote(
  quoteId: string,
  params: CounterQuoteParams
): Promise<AgentQuote> {
  return apiRequest<AgentQuote>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/counter`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

export async function acceptAgentQuote(quoteId: string): Promise<AgentQuote> {
  return apiRequest<AgentQuote>(
    `/v1/quotes/${encodeURIComponent(quoteId)}/accept`,
    { method: 'POST' }
  );
}

export interface CreateHireParams {
  buyer_agent_id: string;
  quote_id: string;
  mission_id: string;
  root_mission_id?: string;
  parent_hire_id?: string;
  expected_result: string;
}

export async function createHire(params: CreateHireParams): Promise<Hire> {
  return apiRequest<Hire>('/v1/hires', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getHire(hireId: string): Promise<Hire> {
  return apiRequest<Hire>(`/v1/hires/${encodeURIComponent(hireId)}`, {
    method: 'GET',
  });
}

export async function executeHirePayment(hireId: string): Promise<Hire> {
  return apiRequest<Hire>(`/v1/hires/${encodeURIComponent(hireId)}/pay`, {
    method: 'POST',
  });
}

export interface SubmitResultParams {
  result_type: string;
  result: Record<string, unknown>;
  quality?: number;
  execution_time_ms?: number;
  provider_metadata?: Record<string, string>;
}

export async function submitHireResult(
  hireId: string,
  params: SubmitResultParams
): Promise<Hire> {
  return apiRequest<Hire>(`/v1/hires/${encodeURIComponent(hireId)}/results`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function cancelHire(hireId: string, reason?: string): Promise<Hire> {
  return apiRequest<Hire>(`/v1/hires/${encodeURIComponent(hireId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Cancelled by buyer' }),
  });
}

export async function getEconomicGraph(missionId: string): Promise<EconomicGraph> {
  return apiRequest<EconomicGraph>(
    `/v1/missions/${encodeURIComponent(missionId)}/economic-graph`,
    { method: 'GET' }
  );
}
