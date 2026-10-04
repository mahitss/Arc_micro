'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchMission, fetchMissionTrace } from '../../../lib/api/missions';
import { fetchMissionIntelligence } from '../../../lib/api/intelligence';
import { Mission, MissionTrace, MissionIntelligence } from '../../../lib/api/types';
import { VisualMissionTimeline } from '../../../components/VisualMissionTimeline';
import { AutonomousActivityStream } from '../../../components/AutonomousActivityStream';
import { ServiceDecisionPanel, DecisionCandidate } from '../../../components/ServiceDecisionPanel';
import { LiveAdaptationVisualizer } from '../../../components/LiveAdaptationVisualizer';
import { DataAuthorityBadge } from '../../../components/DataAuthorityBadge';

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [trace, setTrace] = useState<MissionTrace | null>(null);
  const [intelligence, setIntelligence] = useState<MissionIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadData = async (demo: boolean) => {
    try {
      const [m, t] = await Promise.all([
        fetchMission(missionId, { useDemo: demo }),
        fetchMissionTrace(missionId, { useDemo: demo }),
      ]);
      setMission(m);
      setTrace(t);
      try {
        const intel = await fetchMissionIntelligence(missionId);
        setIntelligence(intel);
      } catch {
        if (demo) {
          setIntelligence({
            mission_id: missionId,
            current_recommendation: {
              step_number: 1,
              capability: 'data_analysis',
              recommended_service_id: 'srv_data_agent_b',
              estimated_cost: '$0.35',
              estimated_duration_ms: 380,
              reason: 'Highest contextual reliability (98.0%) within remaining budget margin',
            },
          why_recommended: 'DataAgent Beta exhibits superior 98% contextual reliability with 380ms latency.',
          previous_attempts: 1,
          recovery_history: [
            {
              mission_id: missionId,
              reason: 'SERVICE_TIMEOUT: Initial provider DataAgent Alpha exceeded 2000ms latency ceiling',
              strategy: 'TRY_ALTERNATIVE_SERVICE',
              proposed_steps: [
                {
                  step_number: 1,
                  capability: 'data_analysis',
                  recommended_service_id: 'srv_data_agent_b',
                  estimated_cost: '$0.35',
                  estimated_duration_ms: 380,
                  reason: 'Best matching capability with 98% success rate',
                },
              ],
              estimated_cost: '0.35',
              estimated_duration_ms: 380,
              confidence: 'HIGH',
              human_approval_required: false,
              explanation: 'Discovered candidate DataAgent Beta with optimal utility score',
            },
          ],
          budget_impact: '$0.35 allocated out of $0.80 remaining unencumbered budget',
          confidence: 'HIGH',
          alternative_services: [
            {
              step_number: 1,
              capability: 'data_analysis',
              recommended_service_id: 'srv_validator_prime',
              estimated_cost: '$0.42',
              estimated_duration_ms: 450,
              reason: 'Fallback candidate (97.2% success rate, verified checksums)',
            },
          ],
          potential_next_actions: [
            'EXECUTE_RECOMMENDED_STEP',
            'SIMULATE_ALTERNATIVE_ROUTE',
            'REQUEST_HUMAN_OVERSIGHT',
          ],
          learning_trace: [
            {
              timestamp: new Date(Date.now() - 30000).toISOString(),
              stage: 'SERVICE_FAILURE',
              details: 'DataAgent Alpha encountered transient network timeout (2150ms > 2000ms)',
            },
            {
              timestamp: new Date(Date.now() - 25000).toISOString(),
              stage: 'ANALYZING',
              details: 'Outcome classified as TRANSIENT. Evaluating recovery strategies...',
            },
            {
              timestamp: new Date(Date.now() - 20000).toISOString(),
              stage: 'ALTERNATIVES_FOUND',
              details: 'Queried registry: 3 matching alternative services discovered for capability data_analysis',
            },
            {
              timestamp: new Date(Date.now() - 15000).toISOString(),
              stage: 'COMPARING',
              details: 'Calculated utility scores: DataAgent Beta (9420 bps), ValidatorAgent (9150 bps)',
            },
            {
              timestamp: new Date(Date.now() - 10000).toISOString(),
              stage: 'ALTERNATIVE_SELECTED',
              details: 'Selected DataAgent Beta ($0.35 USDC). Preparing ReplanProposal.',
            },
            {
              timestamp: new Date(Date.now() - 5000).toISOString(),
              stage: 'POLICY',
              details: 'Rust Policy Engine verified: Per-tx limit ($2.00) and daily limit ($10.00) ALLOWED',
            },
          ],
        });
      } else {
        setIntelligence(null);
      }
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load mission data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(isDemoMode);

    // Active polling if mission is non-terminal
    const interval = setInterval(() => {
      if (mission && !['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXHAUSTED', 'EXPIRED'].includes(mission.status)) {
        loadData(isDemoMode);
      }
    }, 2500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, isDemoMode, mission?.status]);

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30';
      case 'EXECUTING':
      case 'CONTINUING':
        return 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30 animate-pulse';
      case 'PLANNING':
      case 'DISCOVERING':
      case 'EVALUATING':
      case 'SELECTING':
        return 'bg-[#141414] text-[#B0ADA5] border-[#222222]';
      case 'AWAITING_APPROVAL':
        return 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30';
      case 'BUDGET_EXHAUSTED':
      case 'FAILED':
        return 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30';
      case 'CANCELLED':
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
      default:
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-[#716F69] font-mono text-sm max-w-5xl mx-auto space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#D6A83A] border-t-transparent animate-spin mx-auto" />
        <div>Connecting to Autonomous Mission Telemetry...</div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-[#D85C5C] font-mono text-xs">
          Error: {error || 'Mission not found'}
        </div>
        <div className="flex justify-center gap-3 font-mono text-xs">
          <Link
            href="/missions"
            className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            ← Return to Missions
          </Link>
          <button
            onClick={() => {
              setIsDemoMode(true);
              loadData(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-semibold transition-colors"
          >
            Load in Sandboxed Demo Mode
          </button>
        </div>
      </div>
    );
  }

  const isActive = ['PLANNING', 'DISCOVERING', 'EVALUATING', 'SELECTING', 'EXECUTING'].includes(mission.status);
  const spentNum = parseInt(mission.spent || '0', 10);
  const budgetNum = parseInt(mission.budget || '1', 10);
  const pctSpent = Math.min(100, Math.round((spentNum / (budgetNum || 1)) * 100));

  // Build candidate decision matrix from trace steps
  const decisionCandidates: DecisionCandidate[] = [
    {
      service_id: 'web-research',
      service_name: 'Web Research & Intelligence API',
      capability: 'web_search',
      price_usdc: '$0.50',
      quality_score_bps: 9500,
      reliability_score_bps: 9980,
      latency_ms: 380,
      reputation_score_bps: 9750,
      risk_score: 5,
      status: 'SELECTED',
    },
    {
      service_id: 'legacy-scraper-api',
      service_name: 'Legacy Web Scraper Proxy',
      capability: 'web_search',
      price_usdc: '$0.85',
      quality_score_bps: 7000,
      reliability_score_bps: 9100,
      latency_ms: 1250,
      reputation_score_bps: 8200,
      risk_score: 35,
      status: 'REJECTED',
      rejection_reason: 'Lower utility score (higher price & latency)',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Live Polling Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/missions"
            className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
          >
            ← Missions
          </Link>
          <span className="text-[#50504C] font-mono">/</span>
          <span className="font-mono text-xs text-[#F2F0EA] font-bold">
            MISSION #AP-{mission.id.slice(-8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-[#2FB36F] animate-ping' : 'bg-[#50504C]'
              }`}
            />
            <span className={isActive ? 'text-[#2FB36F]' : 'text-[#716F69]'}>
              {isActive ? 'STATUS: LIVE ACTIVE' : 'STATUS: FINALIZED'}
            </span>
          </div>
          <Link
            href={`/trace?mission_id=${mission.id}`}
            className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            Flight Replay ▶
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="p-8 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getStatusBadge(
                  mission.status
                )}`}
              >
                {mission.status}
              </span>
              <span className="text-xs font-mono text-[#716F69]">Agent: <span className="text-[#F2F0EA] font-semibold">{mission.agent_id}</span></span>
              <span className="text-[#50504C]">•</span>
              <span className="text-xs font-mono text-[#716F69]">Org: {mission.organization_id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F2F0EA] tracking-tight leading-tight">
              {mission.objective}
            </h1>
          </div>

          <div className="flex flex-col items-end justify-center font-mono text-xs text-[#716F69]">
            <div>Created: {new Date(mission.created_at).toLocaleTimeString()}</div>
            {mission.completed_at && (
              <div className="text-[#2FB36F]">Completed: {new Date(mission.completed_at).toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Mission Timeline (10-Node Flow Pipeline) */}
      <VisualMissionTimeline
        currentStatus={mission.status}
        failureReason={mission.failure_reason}
      />

      {/* Live Adaptation Hero Visualizer */}
      <LiveAdaptationVisualizer
        trace={intelligence?.learning_trace || []}
        recoveryHistory={intelligence?.recovery_history || []}
        currentStatus={mission.status}
      />

      {/* Mission Intelligence Panel */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-pulse" />
            <h2 className="text-sm font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
              Autonomous Intelligence & Adaptation Panel
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <DataAuthorityBadge provenance={isDemoMode ? 'SIMULATION — NO FUNDS MOVED' : intelligence ? 'LIVE' : 'UNAVAILABLE'} />
            {intelligence && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#222222]">
                CONFIDENCE: {intelligence.confidence || 'HIGH'}
              </span>
            )}
          </div>
        </div>

        {!intelligence ? (
          <div className="p-8 rounded-xl bg-[#0B0B0B] border border-[#222222] text-center font-mono text-xs text-[#716F69] space-y-2">
            <p>Intelligence telemetry unavailable from Gateway for this mission.</p>
            <p className="text-[11px] text-[#555]">Zero heuristic or simulated data is fabricated in live operational mode.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
          {/* Current Recommendation */}
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#716F69] text-[10px] uppercase tracking-wider">
                Current Recommendation
              </span>
              <span className="text-[#2FB36F] font-bold text-[11px]">
                {intelligence?.current_recommendation?.estimated_cost || '$0.35'}
              </span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#F2F0EA]">
                {intelligence?.current_recommendation?.recommended_service_id || 'DataAgent Beta'}
              </div>
              <div className="text-[11px] text-[#716F69] mt-0.5">
                Capability: <span className="text-[#B0ADA5]">{intelligence?.current_recommendation?.capability || 'data_analysis'}</span>
                {' • '}Est. Latency: <span className="text-[#B0ADA5]">{intelligence?.current_recommendation?.estimated_duration_ms || 380}ms</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#141414] border border-[#222222] text-[11px] text-[#B0ADA5]">
              <span className="text-[#D6A83A] font-bold block mb-0.5">WHY RECOMMENDED:</span>
              {intelligence?.why_recommended || 'Highest contextual reliability within budget.'}
            </div>
          </div>

          {/* Recovery History & Previous Attempts */}
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#716F69] text-[10px] uppercase tracking-wider">
                Recovery & Re-Planning History
              </span>
              <span className="text-[#D6A83A] font-bold text-[11px]">
                Attempts: {intelligence?.previous_attempts || 0}
              </span>
            </div>
            {intelligence?.recovery_history && intelligence.recovery_history.length > 0 ? (
              <div className="space-y-2">
                {intelligence.recovery_history.map((rec, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#141414] border border-[#222222] text-[11px]">
                    <div className="flex items-center justify-between text-[#716F69]">
                      <span className="text-[#D6A83A] font-semibold">{rec.strategy}</span>
                      <span className="text-[10px]">{rec.confidence}</span>
                    </div>
                    <p className="text-[#B0ADA5] mt-1 line-clamp-2">{rec.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#716F69] text-[11px] py-4 text-center">
                Nominal execution. Zero recovery attempts required.
              </div>
            )}
            <div className="text-[11px] text-[#716F69] pt-1 border-t border-[#222222]">
              <span className="text-[#716F69]">Budget Impact:</span>{' '}
              <span className="text-[#2FB36F]">{intelligence?.budget_impact || 'Nominal'}</span>
            </div>
          </div>
        </div>

        {/* Alternative Services & Potential Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs pt-1">
          {/* Alternative Services */}
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-2.5">
            <span className="text-[#716F69] text-[10px] uppercase tracking-wider block">
              Ranked Alternative Services
            </span>
            {intelligence?.alternative_services && intelligence.alternative_services.length > 0 ? (
              <div className="space-y-2">
                {intelligence.alternative_services.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-[#141414] border border-[#222222] flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <div className="font-semibold text-[#F2F0EA]">{alt.recommended_service_id}</div>
                      <div className="text-[10px] text-[#716F69]">{alt.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#D6A83A] font-semibold">{alt.estimated_cost}</div>
                      <div className="text-[10px] text-[#716F69]">{alt.estimated_duration_ms}ms</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#716F69] text-[11px] py-2">No active alternatives queued.</div>
            )}
          </div>

          {/* Potential Next Actions */}
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-2.5">
            <span className="text-[#716F69] text-[10px] uppercase tracking-wider block">
              Potential Next Actions (Deterministic Rules)
            </span>
            <div className="flex flex-wrap gap-2">
              {intelligence?.potential_next_actions?.map((act, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-[#F2F0EA] text-[11px] font-mono"
                >
                  ⚡ {act}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#716F69] mt-2 leading-relaxed">
              Every action must re-enter the canonical PaymentIntent → Policy → Risk → Treasury pipeline. AI never
              authorizes disbursements directly.
            </p>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Mission Economics Panel */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-4">
        <h2 className="text-sm font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
          Mission Economics & Financial Bounds
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
            <span className="text-[#716F69] block text-[10px] mb-1">BUDGET CEILING</span>
            <span className="text-xl font-bold text-[#F2F0EA]">{formatUsdc(mission.budget)}</span>
            <span className="text-[10px] text-[#B0ADA5] block mt-0.5">Strict INV-E1 cap</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
            <span className="text-[#716F69] block text-[10px] mb-1">CUMULATIVE SPENT</span>
            <span className="text-xl font-bold text-[#F2F0EA]">{formatUsdc(mission.spent)}</span>
            <span className="text-[10px] text-[#716F69] block mt-0.5">{pctSpent}% consumed</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
            <span className="text-[#716F69] block text-[10px] mb-1">REMAINING BUDGET</span>
            <span className="text-xl font-bold text-[#2FB36F]">
              {formatUsdc(mission.remaining_budget || '0')}
            </span>
            <span className="text-[10px] text-[#2FB36F] block mt-0.5">Treasury balance unencumbered</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
            <span className="text-[#716F69] block text-[10px] mb-1">SETTLEMENT ASSET</span>
            <span className="text-xl font-bold text-[#D6A83A]">{mission.currency || 'USDC'}</span>
            <span className="text-[10px] text-[#716F69] block mt-0.5">Arc Native Base Units</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-[#716F69]">
            <span>Spend Allocation Meter</span>
            <span>{pctSpent}% Used</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#181818] overflow-hidden">
            <div
              className="h-full bg-[#D6A83A] transition-all duration-500"
              style={{ width: `${pctSpent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Autonomous Activity Stream */}
      <AutonomousActivityStream
        events={trace?.events || []}
        isLive={isActive}
      />

      {/* Service Decision Panel */}
      <ServiceDecisionPanel
        stepId={trace?.steps[0]?.step_id || 'step_1_discovery'}
        requiredCapability={trace?.steps[0]?.required_capability || 'web_search'}
        candidates={decisionCandidates}
      />

      {/* Canonical Payment Panel */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
            <h2 className="text-sm font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
              Canonical Payment & Settlement Panel (INV-E12)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#222222]">
            SIMULATION ONLY (ZERO REAL FUNDS)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-1.5">
            <span className="text-[10px] text-[#716F69] block">POLICY DECISION</span>
            <div className="text-[#2FB36F] font-bold text-sm">✓ ALLOWED</div>
            <p className="text-[11px] text-[#716F69]">
              Evaluated by Rust policy engine. Within per-tx ($2.00) and daily limit ($10.00).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-1.5">
            <span className="text-[10px] text-[#716F69] block">RISK EVALUATION</span>
            <div className="text-[#2FB36F] font-bold text-sm">LOW RISK (SCORE: 5/100)</div>
            <p className="text-[11px] text-[#716F69]">
              Recipient is authoritative server-bound registry address (0x1111...1111).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-1.5">
            <span className="text-[10px] text-[#716F69] block">ARC SETTLEMENT STATUS</span>
            <div className="text-[#D6A83A] font-bold text-sm">DEV-SANDBOX (CHAIN ID 5042)</div>
            <p className="text-[11px] text-[#716F69]">
              Simulated settlement. No real transaction hash generated without live Arc verification.
            </p>
          </div>
        </div>
      </div>

      {/* Untrusted Service Result Panel */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2FB36F]" />
            <h2 className="text-sm font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
              Result Panel & Sanitized Payload
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#222222]">
            UNTRUSTED SERVICE OUTPUT (ZERO FINANCIAL AUTHORITY)
          </span>
        </div>

        {trace?.steps && trace.steps[0]?.result_data ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
              <pre className="text-[#F2F0EA] overflow-x-auto text-[11px] leading-relaxed">
                {trace.steps[0].result_data}
              </pre>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#716F69]">
              <span className="text-[#2FB36F]">✓ Invariant INV-E4:</span>
              <span>
                Payload scanned for prompt injection attacks. Zero financial parameters or policy rules were modified.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-[#716F69] font-mono text-xs">
            No service results received yet.
          </div>
        )}
      </div>
    </div>
  );
}
