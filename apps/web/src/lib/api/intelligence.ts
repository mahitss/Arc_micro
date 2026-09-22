/**
 * @file intelligence.ts
 * @description API client methods for the AgentPay Adaptive Intelligence Layer.
 */

import { apiRequest } from './client';
import {
  ServicePerformance,
  ServiceReputation,
  AnomalySignal,
  EconomicObservation,
  ReplanProposal,
  MissionIntelligence,
  ProposedStep,
  PerformanceWindow,
} from './types';

export async function fetchServicePerformance(
  serviceId: string,
  window?: PerformanceWindow
): Promise<ServicePerformance> {
  const url = window
    ? `/v1/services/${encodeURIComponent(serviceId)}/performance?window=${encodeURIComponent(window)}`
    : `/v1/services/${encodeURIComponent(serviceId)}/performance`;
  const res = await apiRequest<{ performance: ServicePerformance }>(url);
  return res.performance;
}

export async function fetchServiceReputation(serviceId: string): Promise<ServiceReputation> {
  const res = await apiRequest<{ reputation: ServiceReputation }>(
    `/v1/services/${encodeURIComponent(serviceId)}/reputation`
  );
  return res.reputation;
}

export async function fetchServiceAnomalies(serviceId: string): Promise<AnomalySignal[]> {
  const res = await apiRequest<{ anomalies: AnomalySignal[] }>(
    `/v1/services/${encodeURIComponent(serviceId)}/anomalies`
  );
  return res.anomalies || [];
}

export async function fetchMissionObservations(missionId: string): Promise<EconomicObservation[]> {
  const res = await apiRequest<{ observations: EconomicObservation[] }>(
    `/v1/missions/${encodeURIComponent(missionId)}/observations`
  );
  return res.observations || [];
}

export async function fetchMissionRecommendations(missionId: string): Promise<ProposedStep[]> {
  const res = await apiRequest<{ recommendations: ProposedStep[] }>(
    `/v1/missions/${encodeURIComponent(missionId)}/recommendations`
  );
  return res.recommendations || [];
}

export async function replanMission(missionId: string): Promise<ReplanProposal> {
  const res = await apiRequest<{ proposal: ReplanProposal }>(
    `/v1/missions/${encodeURIComponent(missionId)}/replan`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  return res.proposal;
}

export async function fetchMissionRecovery(missionId: string): Promise<ReplanProposal[]> {
  const res = await apiRequest<{ recovery_history: ReplanProposal[] }>(
    `/v1/missions/${encodeURIComponent(missionId)}/recovery`
  );
  return res.recovery_history || [];
}

export async function fetchMissionIntelligence(missionId: string): Promise<MissionIntelligence> {
  const res = await apiRequest<{ intelligence: MissionIntelligence }>(
    `/v1/missions/${encodeURIComponent(missionId)}/intelligence`
  );
  return res.intelligence;
}
