/**
 * @file agents.ts
 * @description API queries for agents and their policy states.
 */

import { apiRequest } from './client';
import { Agent, AgentDetail, AgentTaskExecutionResult } from './types';

export async function fetchAgents(): Promise<Agent[]> {
  const resp = await apiRequest<{ agents: Agent[] }>('/v1/agents');
  return resp.agents || [];
}

export async function fetchAgent(id: string): Promise<AgentDetail> {
  return await apiRequest<AgentDetail>(`/v1/agents/${encodeURIComponent(id)}`);
}

export async function runAutonomousAgentTask(params: {
  agent_id: string;
  task: string;
  vault_address?: string;
  autonomous?: boolean;
  wait_for_approval?: boolean;
  approval_timeout_ms?: number;
}): Promise<AgentTaskExecutionResult> {
  return await apiRequest<AgentTaskExecutionResult>('/v1/agents/tasks', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      autonomous: true,
    }),
  });
}

export async function fetchAgentTask(taskId: string): Promise<AgentTaskExecutionResult> {
  return await apiRequest<AgentTaskExecutionResult>(`/v1/agents/tasks/${encodeURIComponent(taskId)}`);
}

export async function createAgent(params: {
  name: string;
  description?: string;
  vault_address?: string;
  policy?: {
    per_transaction_limit?: string;
    daily_limit?: string;
    max_transactions_per_day?: number;
    approval_threshold?: string;
  };
}): Promise<{ agent: Agent; policy: any }> {
  return await apiRequest<{ agent: Agent; policy: any }>('/v1/agents', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchAgentPolicy(agentId: string): Promise<any> {
  return await apiRequest<any>(`/v1/policies/${encodeURIComponent(agentId)}`);
}

export async function updateAgentPolicy(
  agentId: string,
  policy: {
    per_transaction_limit?: string;
    daily_limit?: string;
    max_transactions_per_day?: number;
    approval_threshold?: string;
    enabled?: boolean;
    allowed_recipients?: string;
    blocked_recipients?: string;
  }
): Promise<any> {
  return await apiRequest<any>(`/v1/policies/${encodeURIComponent(agentId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      agent_id: agentId,
      ...policy,
    }),
  });
}

export async function pauseAgent(agentId: string): Promise<any> {
  return await apiRequest<any>(`/v1/agents/${encodeURIComponent(agentId)}/pause`, {
    method: 'POST',
  });
}

export async function resumeAgent(agentId: string): Promise<any> {
  return await apiRequest<any>(`/v1/agents/${encodeURIComponent(agentId)}/resume`, {
    method: 'POST',
  });
}

