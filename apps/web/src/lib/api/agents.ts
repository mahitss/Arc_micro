/**
 * @file agents.ts
 * @description API queries for agents and their policy states.
 */

import { apiRequest } from './client';
import { Agent, AgentDetail } from './types';

export async function fetchAgents(): Promise<Agent[]> {
  const resp = await apiRequest<{ agents: Agent[] }>('/v1/agents');
  return resp.agents || [];
}

export async function fetchAgent(id: string): Promise<AgentDetail> {
  return await apiRequest<AgentDetail>(`/v1/agents/${encodeURIComponent(id)}`);
}
