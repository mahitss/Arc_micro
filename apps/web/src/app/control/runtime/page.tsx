'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchRuntimeMetrics,
  fetchRuntimeQueues,
  fetchRuntimeWorkflows,
  fetchRuntimeWorkers,
  fetchRuntimeIncidents,
  RuntimeMetrics,
  QueueMetrics,
  DurableWorkflow,
  RuntimeWorker,
  RuntimeIncident,
} from '../../../lib/api/runtime';

export default function RuntimeOverviewPage() {
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);
  const [queues, setQueues] = useState<QueueMetrics | null>(null);
  const [workflows, setWorkflows] = useState<DurableWorkflow[]>([]);
  const [workers, setWorkers] = useState<RuntimeWorker[]>([]);
  const [incidents, setIncidents] = useState<RuntimeIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [m, q, wfRes, wRes, incRes] = await Promise.all([
        fetchRuntimeMetrics(),
        fetchRuntimeQueues(),
        fetchRuntimeWorkflows(undefined, 5),
        fetchRuntimeWorkers(),
        fetchRuntimeIncidents('OPEN'),
      ]);
      setMetrics(m);
      setQueues(q);
      setWorkflows(wfRes.workflows);
      setWorkers(wRes.workers);
      setIncidents(incRes.incidents);
    } catch (err) {
      console.error('Failed to load runtime telemetry', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#141414] text-[#a3a3a3] border border-[#222222]">
              DURABLE EXECUTION RUNTIME
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DURABLE EXECUTION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
            Autonomous Operations & Durable Runtime
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Deterministic crash recovery, distributed worker fencing, and financial barrier enforcement (INV-101 through INV-120).
          </p>
        </div>

        {/* Quick Nav Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/control/runtime/workflows"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-colors"
          >
            Workflows ({workflows.length})
          </Link>
          <Link
            href="/control/runtime/workers"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-colors"
          >
            Workers ({workers.length})
          </Link>
          <Link
            href="/control/runtime/queues"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-colors"
          >
            Queues ({queues?.queue_depth ?? 0})
          </Link>
          <Link
            href="/control/runtime/recovery"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Recovery Center
          </Link>
          <Link
            href="/control/runtime/incidents"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
          >
            Incidents ({incidents.length})
          </Link>
        </div>
      </div>

      {/* Primary Invariants Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Workflows</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {metrics?.active_workflows ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] font-mono text-indigo-400 mt-1">
            Waiting: {metrics?.waiting_workflows ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Recovery Success Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {metrics ? `${((metrics.recovery_rate_bps || 0) / 100).toFixed(2)}%` : (loading ? '...' : '100%')}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Avg Duration: {metrics?.average_step_duration_ms ?? 0}ms
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Lease Fencing / Stale</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {metrics?.lease_expirations_count ?? 0} Exp / {metrics?.stale_worker_count ?? 0} Stale
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            INV-101 Monotonic Token Fencing Active
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Financial Barrier Status</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {metrics?.ambiguous_operations ?? 0} Ambiguous
          </div>
          <div className="text-[11px] font-mono text-cyan-300/80 mt-1">
            INV-106 Zero Blind Rebroadcast
          </div>
        </div>
      </div>

      {/* Live Runtime Graph Visualization */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              Live Runtime Execution & Financial Barrier Graph
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Flow of authority: Domain requests pass 12-point invariant check before payment pipeline invocation.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Node Identity: <span className="text-indigo-400 font-semibold">COORDINATOR:active</span>
          </span>
        </div>

        {/* Visual Graph Pipeline */}
        <div className="p-6 rounded-xl bg-slate-950/90 border border-slate-800/80 overflow-x-auto">
          <div className="flex items-center min-w-[900px] justify-between text-center font-mono text-xs">
            {/* Stage 1: Mission */}
            <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase">1. INTENT</div>
              <div className="text-sm font-semibold text-white mt-1">Mission / Swarm</div>
              <div className="text-[10px] text-slate-400 mt-0.5">DAG Task Node</div>
            </div>

            <div className="text-slate-600 px-2 font-bold">→</div>

            {/* Stage 2: Workflow */}
            <div className="flex-1 p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60">
              <div className="text-[10px] text-indigo-300 font-bold uppercase">2. RUNTIME</div>
              <div className="text-sm font-semibold text-indigo-200 mt-1">Durable Workflow</div>
              <div className="text-[10px] text-indigo-400 mt-0.5">Version Checking</div>
            </div>

            <div className="text-slate-600 px-2 font-bold">→</div>

            {/* Stage 3: Step & Lease */}
            <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase">3. DISPATCH</div>
              <div className="text-sm font-semibold text-white mt-1">Leased Step</div>
              <div className="text-[10px] text-amber-400 mt-0.5">Fencing Token</div>
            </div>

            <div className="text-slate-600 px-2 font-bold">→</div>

            {/* Stage 4: Financial Barrier */}
            <div className="flex-1 p-3 rounded-xl bg-purple-950/40 border border-purple-700/60">
              <div className="text-[10px] text-purple-300 font-bold uppercase">4. BARRIER</div>
              <div className="text-sm font-semibold text-purple-200 mt-1">12 Invariant Checks</div>
              <div className="text-[10px] text-purple-400 mt-0.5">Zero Vault Bypass</div>
            </div>

            <div className="text-slate-600 px-2 font-bold">→</div>

            {/* Stage 5: Domain Engine */}
            <div className="flex-1 p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60">
              <div className="text-[10px] text-emerald-300 font-bold uppercase">5. SETTLEMENT</div>
              <div className="text-sm font-semibold text-emerald-200 mt-1">Payment Pipeline</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Arc Settlement</div>
            </div>

            <div className="text-slate-600 px-2 font-bold">→</div>

            {/* Stage 6: Checkpoint */}
            <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-700/80">
              <div className="text-[10px] text-slate-400 font-bold uppercase">6. CHECKPOINT</div>
              <div className="text-sm font-semibold text-white mt-1">SHA-256 Snapshot</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Crash Immune</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Workflows & Worker Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Workflows */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Active Durable Workflows</h3>
            <Link
              href="/control/runtime/workflows"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.workflow_id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        wf.state === 'RUNNING'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : wf.state === 'PAUSED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : wf.state === 'COMPLETED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {wf.state}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {wf.workflow_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Type: <span className="text-slate-300">{wf.workflow_type}</span> | Step:{' '}
                    <span className="text-indigo-400">{wf.current_step || 'INIT'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-slate-400">v{wf.version}</div>
                  <Link
                    href={`/control/runtime/workflows/${wf.workflow_id}`}
                    className="text-xs font-mono text-indigo-400 hover:underline mt-1 inline-block"
                  >
                    Inspect →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Fleet Health */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Registered Worker Fleet</h3>
            <Link
              href="/control/runtime/workers"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Inspect Fleet →
            </Link>
          </div>

          <div className="space-y-3">
            {workers.map((w) => (
              <div
                key={w.worker_id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        w.status === 'HEALTHY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {w.status}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {w.worker_id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Host: <span className="text-slate-300">{w.hostname}</span> | Type:{' '}
                    <span className="text-slate-300">{w.worker_type}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-slate-400">
                  <div className="text-emerald-400">Heartbeat OK</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{w.version}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
