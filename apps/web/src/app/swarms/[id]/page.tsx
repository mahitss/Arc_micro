'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  cancelSwarm,
  getSwarm,
  getSwarmGraph,
  getSwarmRisk,
  getSwarmTasks,
  getSwarmTrace,
  replanSwarm,
  startSwarm,
} from '../../../lib/api/swarms';
import type {
  Swarm,
  SwarmGraph,
  SwarmRiskScore,
  SwarmTrace,
  TaskNode,
} from '../../../lib/api/types';
import { LiveSwarmDAGVisualizer } from '../../../components/LiveSwarmDAGVisualizer';

function formatUsdc(amountBaseUnits?: string): string {
  if (!amountBaseUnits) return '0.00 USDC';
  const num = Number(amountBaseUnits);
  if (isNaN(num)) return `${amountBaseUnits} USDC`;
  return `${(num / 1e6).toFixed(2)} USDC`;
}

export default function SwarmDetailPage() {
  const params = useParams();
  const swarmId = params.id as string;

  const [swarm, setSwarm] = useState<Swarm | null>(null);
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [graph, setGraph] = useState<SwarmGraph | undefined>(undefined);
  const [trace, setTrace] = useState<SwarmTrace | null>(null);
  const [risk, setRisk] = useState<SwarmRiskScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSwarmData = async () => {
    try {
      const [s, t, g, tr, r] = await Promise.all([
        getSwarm(swarmId),
        getSwarmTasks(swarmId),
        getSwarmGraph(swarmId),
        getSwarmTrace(swarmId),
        getSwarmRisk(swarmId),
      ]);
      setSwarm(s);
      setTasks(t);
      setGraph(g);
      setTrace(tr);
      setRisk(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (swarmId) {
      loadSwarmData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swarmId]);

  const handleStart = async () => {
    try {
      const updated = await startSwarm(swarmId);
      setSwarm(updated);
      loadSwarmData();
    } catch (err) {
      alert(`Start failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this swarm and release all budget reservations?')) return;
    try {
      const updated = await cancelSwarm(swarmId);
      setSwarm(updated);
      loadSwarmData();
    } catch (err) {
      alert(`Cancel failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleReplan = async () => {
    try {
      const proposal = await replanSwarm(swarmId);
      alert(`Replan Proposal Generated: ${proposal.strategy} - ${proposal.reason}`);
      loadSwarmData();
    } catch (err) {
      alert(`Replan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center font-mono text-sm animate-pulse">
        Loading Swarm DAG, Subcontracts, and Risk Telemetry...
      </div>
    );
  }

  if (error || !swarm) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <Link href="/swarms" className="text-sm font-mono text-cyan-400 hover:underline mb-4 inline-block">
          ← Back to Swarms
        </Link>
        <div className="rounded-xl bg-rose-950/40 border border-rose-800 p-6 text-rose-300">
          <h2 className="text-lg font-bold mb-2">Error Loading Swarm</h2>
          <p className="text-sm">{error || 'Swarm not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href="/swarms"
          className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Back to Swarms Control Plane</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">ID: {swarm.id}</span>
      </div>

      {/* Live Swarm DAG Visualizer */}
      <LiveSwarmDAGVisualizer
        swarm={swarm}
        tasks={tasks}
        graph={graph}
        onStart={handleStart}
        onCancel={handleCancel}
        onReplan={handleReplan}
      />

      {/* Intelligence & Analytics Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Intelligence Panel */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>💳</span>
              <span>Autonomous Cost Intelligence</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              CONCURRENCY-SAFE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Total Budget</span>
              <span className="font-bold text-white">{formatUsdc(swarm.max_budget)}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Committed Spend</span>
              <span className="font-bold text-emerald-400">
                {formatUsdc(swarm.total_spent)}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Active Reservations</span>
              <span className="font-bold text-cyan-400">
                {formatUsdc(swarm.total_reserved)}
              </span>
            </div>
          </div>

          {swarm.cost_intelligence && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Budget Utilization:</span>
                <span className="text-white font-bold">
                  {swarm.cost_intelligence.budget_utilization_pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Projected Final Cost:</span>
                <span className="text-cyan-400 font-bold">
                  {formatUsdc(swarm.cost_intelligence.projected_final_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Budget Overrun Risk:</span>
                <span
                  className={
                    swarm.cost_intelligence.is_over_budget_risk
                      ? 'text-rose-400 font-bold'
                      : 'text-emerald-400 font-bold'
                  }
                >
                  {swarm.cost_intelligence.is_over_budget_risk ? 'RISK DETECTED' : 'NOMINAL (0.0%)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Risk Intelligence Panel */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛡️</span>
              <span>Economic & DAG Risk Radar</span>
            </h3>
            {risk && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  risk.risk_level === 'LOW'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}
              >
                {risk.risk_level} ({risk.overall_score}/100)
              </span>
            )}
          </div>

          {risk && (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Budget Exhaustion Risk</span>
                  <span className="text-white">{risk.budget_exhaustion_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${risk.budget_exhaustion_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Dependency Bottleneck Risk</span>
                  <span className="text-white">{risk.dependency_bottleneck_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-400"
                    style={{ width: `${risk.dependency_bottleneck_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Agent Reliability Risk</span>
                  <span className="text-white">{risk.agent_reliability_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${risk.agent_reliability_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Data Tampering Risk</span>
                  <span className="text-white">{risk.data_tampering_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-teal-400"
                    style={{ width: `${risk.data_tampering_risk}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Append-Only Audit Trace Stream */}
      {trace && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📜</span>
              <span>Append-Only Swarm Audit Flight Recorder</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {trace.events.length} Events Logged
            </span>
          </div>

          <div className="space-y-2">
            {trace.events.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-300 font-bold">{ev.event_type}</span>
                  {ev.task_id && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Task: {ev.task_id}
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
