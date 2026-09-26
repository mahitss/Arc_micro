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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-[#101010] border border-[#222222]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              DURABLE EXECUTION RUNTIME
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F] animate-pulse" />
              DURABLE EXECUTION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F2F0EA] tracking-tight mt-2">
            Autonomous Operations & Durable Runtime
          </h1>
          <p className="text-sm text-[#B0ADA5] mt-1 max-w-2xl">
            Deterministic crash recovery, distributed worker fencing, and financial barrier enforcement (INV-101 through INV-120).
          </p>
        </div>

        {/* Quick Nav Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/control/runtime/workflows"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            Workflows ({workflows.length})
          </Link>
          <Link
            href="/control/runtime/workers"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            Workers ({workers.length})
          </Link>
          <Link
            href="/control/runtime/queues"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            Queues ({queues?.queue_depth ?? 0})
          </Link>
          <Link
            href="/control/runtime/recovery"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/30 transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            Recovery Center
          </Link>
          <Link
            href="/control/runtime/incidents"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/30 transition-colors"
          >
            Incidents ({incidents.length})
          </Link>
        </div>
      </div>

      {/* Primary Invariants Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Active Workflows</div>
          <div className="text-2xl font-bold font-mono text-[#F2F0EA] mt-1">
            {metrics?.active_workflows ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] font-mono text-[#B0ADA5] mt-1">
            Waiting: {metrics?.waiting_workflows ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Recovery Success Rate</div>
          <div className="text-2xl font-bold font-mono text-[#2FB36F] mt-1">
            {metrics ? `${((metrics.recovery_rate_bps || 0) / 100).toFixed(2)}%` : (loading ? '...' : '100%')}
          </div>
          <div className="text-[11px] font-mono text-[#716F69] mt-1">
            Avg Duration: {metrics?.average_step_duration_ms ?? 0}ms
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Lease Fencing / Stale</div>
          <div className="text-2xl font-bold font-mono text-[#D6A83A] mt-1">
            {metrics?.lease_expirations_count ?? 0} Exp / {metrics?.stale_worker_count ?? 0} Stale
          </div>
          <div className="text-[11px] font-mono text-[#716F69] mt-1">
            INV-101 Monotonic Token Fencing Active
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Financial Barrier Status</div>
          <div className="text-2xl font-bold font-mono text-[#F2F0EA] mt-1">
            {metrics?.ambiguous_operations ?? 0} Ambiguous
          </div>
          <div className="text-[11px] font-mono text-[#716F69] mt-1">
            INV-106 Zero Blind Rebroadcast
          </div>
        </div>
      </div>

      {/* Live Runtime Graph Visualization */}
      <div className="p-6 rounded-xl bg-[#101010] border border-[#222222]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F2F0EA] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
              Live Runtime Execution & Financial Barrier Graph
            </h2>
            <p className="text-xs text-[#B0ADA5] mt-0.5">
              Flow of authority: Domain requests pass 12-point invariant check before payment pipeline invocation.
            </p>
          </div>
          <span className="text-xs font-mono text-[#716F69]">
            Node Identity: <span className="text-[#D6A83A] font-semibold">COORDINATOR:active</span>
          </span>
        </div>

        {/* Visual Graph Pipeline */}
        <div className="p-6 rounded-lg bg-[#0B0B0B] border border-[#222222] overflow-x-auto">
          <div className="flex items-center min-w-[900px] justify-between text-center font-mono text-xs">
            {/* Stage 1: Mission */}
            <div className="flex-1 p-3 rounded-lg bg-[#141414] border border-[#222222]">
              <div className="text-[10px] text-[#716F69] font-bold uppercase">1. INTENT</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">Mission / Swarm</div>
              <div className="text-[10px] text-[#716F69] mt-0.5">DAG Task Node</div>
            </div>

            <div className="text-[#50504C] px-2 font-bold">→</div>

            {/* Stage 2: Workflow */}
            <div className="flex-1 p-3 rounded-lg bg-[#141414] border border-[#222222]">
              <div className="text-[10px] text-[#B0ADA5] font-bold uppercase">2. RUNTIME</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">Durable Workflow</div>
              <div className="text-[10px] text-[#716F69] mt-0.5">Version Checking</div>
            </div>

            <div className="text-[#50504C] px-2 font-bold">→</div>

            {/* Stage 3: Step & Lease */}
            <div className="flex-1 p-3 rounded-lg bg-[#141414] border border-[#222222]">
              <div className="text-[10px] text-[#716F69] font-bold uppercase">3. DISPATCH</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">Leased Step</div>
              <div className="text-[10px] text-[#D6A83A] mt-0.5">Fencing Token</div>
            </div>

            <div className="text-[#50504C] px-2 font-bold">→</div>

            {/* Stage 4: Financial Barrier */}
            <div className="flex-1 p-3 rounded-lg bg-[#181818] border border-[#D6A83A]/40">
              <div className="text-[10px] text-[#D6A83A] font-bold uppercase">4. BARRIER</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">12 Invariant Checks</div>
              <div className="text-[10px] text-[#D6A83A] mt-0.5">Zero Vault Bypass</div>
            </div>

            <div className="text-[#50504C] px-2 font-bold">→</div>

            {/* Stage 5: Domain Engine */}
            <div className="flex-1 p-3 rounded-lg bg-[#141414] border border-[#222222]">
              <div className="text-[10px] text-[#2FB36F] font-bold uppercase">5. SETTLEMENT</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">Payment Pipeline</div>
              <div className="text-[10px] text-[#2FB36F] mt-0.5">Arc Settlement</div>
            </div>

            <div className="text-[#50504C] px-2 font-bold">→</div>

            {/* Stage 6: Checkpoint */}
            <div className="flex-1 p-3 rounded-lg bg-[#141414] border border-[#222222]">
              <div className="text-[10px] text-[#716F69] font-bold uppercase">6. CHECKPOINT</div>
              <div className="text-sm font-semibold text-[#F2F0EA] mt-1">SHA-256 Snapshot</div>
              <div className="text-[10px] text-[#716F69] mt-0.5">Crash Immune</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Workflows & Worker Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Workflows */}
        <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#F2F0EA]">Active Durable Workflows</h3>
            <Link
              href="/control/runtime/workflows"
              className="text-xs font-mono text-[#D6A83A] hover:underline transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.workflow_id}
                className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        wf.state === 'RUNNING'
                          ? 'bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30'
                          : wf.state === 'PAUSED'
                          ? 'bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30'
                          : wf.state === 'COMPLETED'
                          ? 'bg-[#181818] text-[#B0ADA5] border border-[#222222]'
                          : 'bg-[#D85C5C]/15 text-[#D85C5C] border border-[#D85C5C]/30'
                      }`}
                    >
                      {wf.state}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F2F0EA]">
                      {wf.workflow_id}
                    </span>
                  </div>
                  <div className="text-xs text-[#716F69] mt-1 font-mono">
                    Type: <span className="text-[#B0ADA5]">{wf.workflow_type}</span> | Step:{' '}
                    <span className="text-[#D6A83A]">{wf.current_step || 'INIT'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-[#716F69]">v{wf.version}</div>
                  <Link
                    href={`/control/runtime/workflows/${wf.workflow_id}`}
                    className="text-xs font-mono text-[#D6A83A] hover:underline mt-1 inline-block"
                  >
                    Inspect →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Fleet Health */}
        <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#F2F0EA]">Registered Worker Fleet</h3>
            <Link
              href="/control/runtime/workers"
              className="text-xs font-mono text-[#D6A83A] hover:underline transition-colors"
            >
              Inspect Fleet →
            </Link>
          </div>

          <div className="space-y-3">
            {workers.map((w) => (
              <div
                key={w.worker_id}
                className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        w.status === 'HEALTHY'
                          ? 'bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30'
                          : 'bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30'
                      }`}
                    >
                      {w.status}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F2F0EA]">
                      {w.worker_id}
                    </span>
                  </div>
                  <div className="text-xs text-[#716F69] mt-1 font-mono">
                    Host: <span className="text-[#B0ADA5]">{w.hostname}</span> | Type:{' '}
                    <span className="text-[#B0ADA5]">{w.worker_type}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-[#716F69]">
                  <div className="text-[#2FB36F]">Heartbeat OK</div>
                  <div className="text-[10px] text-[#716F69] mt-0.5">{w.version}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
