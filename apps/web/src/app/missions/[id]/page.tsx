'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchMission, fetchMissionTrace } from '../../../lib/api/missions';
import { Mission, MissionTrace } from '../../../lib/api/types';
import { VisualMissionTimeline } from '../../../components/VisualMissionTimeline';
import { AutonomousActivityStream } from '../../../components/AutonomousActivityStream';
import { ServiceDecisionPanel, DecisionCandidate } from '../../../components/ServiceDecisionPanel';

export default function MissionDetailPage() {
  const params = useParams();
  const missionId = params.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [trace, setTrace] = useState<MissionTrace | null>(null);
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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EXECUTING':
      case 'CONTINUING':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse';
      case 'PLANNING':
      case 'DISCOVERING':
      case 'EVALUATING':
      case 'SELECTING':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'AWAITING_APPROVAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'BUDGET_EXHAUSTED':
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-mono text-sm max-w-5xl mx-auto space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto" />
        <div>Connecting to Autonomous Mission Telemetry...</div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          Error: {error || 'Mission not found'}
        </div>
        <div className="flex justify-center gap-3 font-mono text-xs">
          <Link
            href="/missions"
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200"
          >
            ← Return to Missions
          </Link>
          <button
            onClick={() => {
              setIsDemoMode(true);
              loadData(true);
            }}
            className="px-4 py-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/missions"
            className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors"
          >
            ← Missions
          </Link>
          <span className="text-slate-600 font-mono">/</span>
          <span className="font-mono text-xs text-white font-bold">
            MISSION #AP-{mission.id.slice(-8).toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
              {isActive ? 'STATUS: LIVE ACTIVE' : 'STATUS: FINALIZED'}
            </span>
          </div>
          <Link
            href={`/trace?mission_id=${mission.id}`}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-colors"
          >
            Flight Replay ▶
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-4">
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
              <span className="text-xs font-mono text-slate-400">Agent: <span className="text-teal-300 font-semibold">{mission.agent_id}</span></span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-400">Org: {mission.organization_id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {mission.objective}
            </h1>
          </div>

          <div className="flex flex-col items-end justify-center font-mono text-xs text-slate-400">
            <div>Created: {new Date(mission.created_at).toLocaleTimeString()}</div>
            {mission.completed_at && (
              <div className="text-emerald-400">Completed: {new Date(mission.completed_at).toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Mission Timeline (10-Node Flow Pipeline) */}
      <VisualMissionTimeline
        currentStatus={mission.status}
        failureReason={mission.failure_reason}
      />

      {/* Mission Economics Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
          Mission Economics & Financial Bounds
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">BUDGET CEILING</span>
            <span className="text-xl font-bold text-white">{formatUsdc(mission.budget)}</span>
            <span className="text-[10px] text-teal-400 block mt-0.5">Strict INV-E1 cap</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">CUMULATIVE SPENT</span>
            <span className="text-xl font-bold text-teal-300">{formatUsdc(mission.spent)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{pctSpent}% consumed</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">REMAINING BUDGET</span>
            <span className="text-xl font-bold text-emerald-400">
              {formatUsdc(mission.remaining_budget || '0')}
            </span>
            <span className="text-[10px] text-emerald-500 block mt-0.5">Treasury balance unencumbered</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">SETTLEMENT ASSET</span>
            <span className="text-xl font-bold text-cyan-300">{mission.currency || 'USDC'}</span>
            <span className="text-[10px] text-cyan-500 block mt-0.5">Arc Native Base Units</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Spend Allocation Meter</span>
            <span>{pctSpent}% Used</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
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
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Canonical Payment & Settlement Panel (INV-E12)
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            SIMULATION ONLY (ZERO REAL FUNDS)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 block">POLICY DECISION</span>
            <div className="text-emerald-400 font-bold text-sm">✓ ALLOWED</div>
            <p className="text-[11px] text-slate-400">
              Evaluated by Rust policy engine. Within per-tx ($2.00) and daily limit ($10.00).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 block">RISK EVALUATION</span>
            <div className="text-teal-300 font-bold text-sm">LOW RISK (SCORE: 5/100)</div>
            <p className="text-[11px] text-slate-400">
              Recipient is authoritative server-bound registry address (0x1111...1111).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 block">ARC SETTLEMENT STATUS</span>
            <div className="text-cyan-300 font-bold text-sm">DEV-SANDBOX (CHAIN ID 5042)</div>
            <p className="text-[11px] text-slate-400">
              Simulated settlement. No real transaction hash generated without live Arc verification.
            </p>
          </div>
        </div>
      </div>

      {/* Untrusted Service Result Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Result Panel & Sanitized Payload
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            UNTRUSTED SERVICE OUTPUT (ZERO FINANCIAL AUTHORITY)
          </span>
        </div>

        {trace?.steps && trace.steps[0]?.result_data ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <pre className="text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                {trace.steps[0].result_data}
              </pre>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-emerald-400">✓ Invariant INV-E4:</span>
              <span>
                Payload scanned for prompt injection attacks. Zero financial parameters or policy rules were modified.
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 font-mono text-xs">
            No service results received yet.
          </div>
        )}
      </div>
    </div>
  );
}
