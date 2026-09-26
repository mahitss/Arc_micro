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
      <div className="min-h-screen bg-[#080808] text-[#716F69] p-8 flex items-center justify-center font-mono text-sm animate-pulse">
        Loading Swarm DAG, Subcontracts, and Risk Telemetry...
      </div>
    );
  }

  if (error || !swarm) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8">
        <Link href="/swarms" className="text-sm font-mono text-[#D6A83A] hover:underline mb-4 inline-block">
          ← Back to Swarms
        </Link>
        <div className="rounded-xl bg-[#141414] border border-[#D85C5C]/40 p-6 text-[#D85C5C]">
          <h2 className="text-lg font-bold mb-2">Error Loading Swarm</h2>
          <p className="text-sm">{error || 'Swarm not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 lg:p-8 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-4">
        <Link
          href="/swarms"
          className="text-xs font-mono text-[#716F69] hover:text-[#F2F0EA] transition-colors flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Back to Swarms Control Plane</span>
        </Link>
        <span className="text-xs font-mono text-[#50504C]">ID: {swarm.id}</span>
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
        <div className="rounded-2xl bg-[#101010] border border-[#222222] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
              <span>💳</span>
              <span>Autonomous Cost Intelligence</span>
            </h3>
            <span className="text-xs font-mono text-[#2FB36F] font-bold">
              CONCURRENCY-SAFE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-[#0B0B0B] p-3 rounded-xl border border-[#222222]">
              <span className="text-[#716F69] block text-[10px]">Total Budget</span>
              <span className="font-bold text-[#F2F0EA]">{formatUsdc(swarm.max_budget)}</span>
            </div>
            <div className="bg-[#0B0B0B] p-3 rounded-xl border border-[#222222]">
              <span className="text-[#716F69] block text-[10px]">Committed Spend</span>
              <span className="font-bold text-[#2FB36F]">
                {formatUsdc(swarm.total_spent)}
              </span>
            </div>
            <div className="bg-[#0B0B0B] p-3 rounded-xl border border-[#222222]">
              <span className="text-[#716F69] block text-[10px]">Active Reservations</span>
              <span className="font-bold text-[#D6A83A]">
                {formatUsdc(swarm.total_reserved)}
              </span>
            </div>
          </div>

          {swarm.cost_intelligence && (
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#716F69]">Budget Utilization:</span>
                <span className="text-[#F2F0EA] font-bold">
                  {swarm.cost_intelligence.budget_utilization_pct.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Projected Final Cost:</span>
                <span className="text-[#D6A83A] font-bold">
                  {formatUsdc(swarm.cost_intelligence.projected_final_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Budget Overrun Risk:</span>
                <span
                  className={
                    swarm.cost_intelligence.is_over_budget_risk
                      ? 'text-[#D85C5C] font-bold'
                      : 'text-[#2FB36F] font-bold'
                  }
                >
                  {swarm.cost_intelligence.is_over_budget_risk ? 'RISK DETECTED' : 'NOMINAL (0.0%)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Risk Intelligence Panel */}
        <div className="rounded-2xl bg-[#101010] border border-[#222222] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
              <span>🛡️</span>
              <span>Economic & DAG Risk Radar</span>
            </h3>
            {risk && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  risk.risk_level === 'LOW'
                    ? 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/40'
                    : 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
                }`}
              >
                {risk.risk_level} ({risk.overall_score}/100)
              </span>
            )}
          </div>

          {risk && (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[#716F69] mb-1">
                  <span>Budget Exhaustion Risk</span>
                  <span className="text-[#F2F0EA]">{risk.budget_exhaustion_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-[#D6A83A]"
                    style={{ width: `${risk.budget_exhaustion_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#716F69] mb-1">
                  <span>Dependency Bottleneck Risk</span>
                  <span className="text-[#F2F0EA]">{risk.dependency_bottleneck_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-[#B0ADA5]"
                    style={{ width: `${risk.dependency_bottleneck_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#716F69] mb-1">
                  <span>Agent Reliability Risk</span>
                  <span className="text-[#F2F0EA]">{risk.agent_reliability_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-[#2FB36F]"
                    style={{ width: `${risk.agent_reliability_risk}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#716F69] mb-1">
                  <span>Data Tampering Risk</span>
                  <span className="text-[#F2F0EA]">{risk.data_tampering_risk}/100</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#141414] overflow-hidden">
                  <div
                    className="h-full bg-[#D85C5C]"
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
        <div className="rounded-2xl bg-[#101010] border border-[#222222] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
            <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
              <span>📜</span>
              <span>Append-Only Swarm Audit Flight Recorder</span>
            </h3>
            <span className="text-xs font-mono text-[#716F69]">
              {trace.events.length} Events Logged
            </span>
          </div>

          <div className="space-y-2">
            {trace.events.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-xs font-mono"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                  <span className="text-[#F2F0EA] font-bold">{ev.event_type}</span>
                  {ev.task_id && (
                    <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#716F69]">
                      Task: {ev.task_id}
                    </span>
                  )}
                </div>
                <span className="text-[#716F69]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
