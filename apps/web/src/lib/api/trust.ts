/**
 * @file trust.ts
 * @description API queries and mutations for the Red-Team Suite, Tamper-Evident Audit Chain, and Transparent Trust Engine.
 */

import { apiRequest } from './client';
import {
  RedTeamReport,
  AuditChainResponse,
  ChainVerificationResult,
  TrustScoresResponse,
  AgentTrustScore,
} from './types';

export async function fetchRedTeamReport(): Promise<RedTeamReport> {
  return await apiRequest<RedTeamReport>('/v1/redteam/report');
}

export async function runRedTeamSuite(): Promise<RedTeamReport> {
  return await apiRequest<RedTeamReport>('/v1/redteam/run', {
    method: 'POST',
  });
}

export async function fetchAuditChain(): Promise<AuditChainResponse> {
  return await apiRequest<AuditChainResponse>('/v1/trust/audit-chain');
}

export async function verifyAuditChain(): Promise<ChainVerificationResult> {
  return await apiRequest<ChainVerificationResult>('/v1/trust/audit-chain/verify', {
    method: 'POST',
  });
}

export async function fetchTrustScores(): Promise<TrustScoresResponse> {
  return await apiRequest<TrustScoresResponse>('/v1/trust/scores');
}

export async function fetchAgentTrustScore(agentId: string): Promise<AgentTrustScore> {
  return await apiRequest<AgentTrustScore>(`/v1/trust/scores/${encodeURIComponent(agentId)}`);
}
