'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchOverviewMetrics, fetchMissions } from '../../lib/api/missions';
import { OverviewMetrics, Mission } from '../../lib/api/types';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentMissions, setRecentMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const loadData = async (demo: boolean) => {
    setLoading(true);
    setBackendError(null);
    try {
      const [m, mList] = await Promise.all([
        fetchOverviewMetrics({ useDemo: demo }),
        fetchMissions({ useDemo: demo }).catch(() => []),
      ]);
      setMetrics(m);
      setRecentMissions(mList.slice(0, 3));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend connection error';
      setBackendError(msg);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(isDemoMode);
  }, [isDemoMode]);

  const formatUsdc = (baseUnits: string | null) => {
    if (baseUnits === null) return 'DATA UNAVAILABLE';
    const val = parseInt(baseUnits, 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  const renderMetric = (val: number | null, suffix: string = '') => {
    if (val === null) return <span className="text-sm text-slate-500 font-mono">DATA UNAVAILABLE</span>;
    return <span className="text-2xl font-bold text-white font-mono">{val}{suffix}</span>;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center justify-between">
          <span>DEMO / SIMULATION MODE ACTIVE: Viewing sandboxed telemetry.</span>
          <button
            onClick={() => setIsDemoMode(false)}
            className="text-amber-400 underline hover:text-amber-200"
          >
            Switch to Live Gateway
          </button>
        </div>
      )}

      {/* Backend Unavailable Banner */}
      {backendError && !isDemoMode && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>✕</span> AgentPay Backend Unavailable
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Could not connect to Gateway at http://localhost:8080. Start the server with: <code className="text-teal-300">go run cmd/server/main.go</code>
            </div>
          </div>
          <button
            onClick={() => setIsDemoMode(true)}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 whitespace-nowrap"
          >
            Enable Demo Mode
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>AUTONOMOUS ECONOMY CONTROL PLANE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Autonomous Economy
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-sans">
            Agents can discover, hire and pay services while AgentPay controls every movement of money.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/missions/new"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
            >
              CREATE MISSION →
            </Link>
            <Link
              href="/missions/new?mode=simulate"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-slate-700 transition-colors"
            >
              SIMULATE MISSION
            </Link>
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs font-mono border border-slate-800 transition-colors"
            >
              {isDemoMode ? 'Exit Demo' : 'Explore Demo'}
            </button>
          </div>
        </div>
      </div>

      {/* Executive Command Metrics Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
            Operational Telemetry (Real Backend State)
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            {isDemoMode ? 'DATA SOURCE: DEMO FIXTURES' : 'DATA SOURCE: LIVE GATEWAY'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Active Missions */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">ACTIVE MISSIONS</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.active_missions ?? null)}
            <span className="text-[10px] text-teal-400 font-mono block mt-1">Autonomous workflows</span>
          </div>

          {/* 2. Total Agents */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">AUTHORIZED AGENTS</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.total_agents ?? null)}
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Keyless identities</span>
          </div>

          {/* 3. Registered Services */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">MARKETPLACE SERVICES</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.total_services ?? null)}
            <span className="text-[10px] text-cyan-400 font-mono block mt-1">Vetted APIs & peer agents</span>
          </div>

          {/* 4. Today's Volume */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">TODAY&apos;S VOLUME</span>
            {loading ? (
              <div className="h-8 bg-slate-800 animate-pulse rounded" />
            ) : !metrics || metrics.today_volume_base === null ? (
              <span className="text-sm text-slate-500 font-mono">DATA UNAVAILABLE</span>
            ) : (
              <span className="text-2xl font-bold text-white font-mono">
                {formatUsdc(metrics.today_volume_base)}
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Arc USDC Base Units</span>
          </div>

          {/* 5. Today's Transactions */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">TRANSACTIONS TODAY</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.today_transactions ?? null)}
            <span className="text-[10px] text-slate-500 font-mono block mt-1">Settled & pending</span>
          </div>

          {/* 6. Approval Queue */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">APPROVAL QUEUE</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.pending_approvals ?? null)}
            <span className="text-[10px] text-amber-400 font-mono block mt-1">Awaiting human sign-off</span>
          </div>

          {/* 7. Policy Blocks */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">POLICY BLOCKS</span>
            {loading ? <div className="h-8 bg-slate-800 animate-pulse rounded" /> : renderMetric(metrics?.policy_blocks ?? null)}
            <span className="text-[10px] text-rose-400 font-mono block mt-1">Hard Rust DENY decisions</span>
          </div>

          {/* 8. Mission Success Rate */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block mb-1">SUCCESS RATE</span>
            {loading ? (
              <div className="h-8 bg-slate-800 animate-pulse rounded" />
            ) : !metrics || metrics.mission_success_rate_bps === null ? (
              <span className="text-sm text-slate-500 font-mono">DATA UNAVAILABLE</span>
            ) : (
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {(metrics.mission_success_rate_bps / 100).toFixed(1)}%
              </span>
            )}
            <span className="text-[10px] text-emerald-500 font-mono block mt-1">Autonomous completion</span>
          </div>
        </div>
      </div>

      {/* Active Missions Quick Glance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Active & Recent Missions</h2>
          <Link href="/missions" className="text-xs font-mono text-teal-400 hover:text-teal-300">
            View All Missions →
          </Link>
        </div>

        {recentMissions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 font-mono text-xs">
            No missions found. Launch an objective to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentMissions.map((m) => (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                      {m.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{m.id}</span>
                  </div>
                  <h3 className="font-semibold text-white text-sm line-clamp-2">{m.objective}</h3>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Budget: {formatUsdc(m.budget)}</span>
                  <Link
                    href={`/missions/${m.id}`}
                    className="text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    Control Center →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
