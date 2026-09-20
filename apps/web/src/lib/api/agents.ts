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
