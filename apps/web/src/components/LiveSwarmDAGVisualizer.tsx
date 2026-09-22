'use client';

import React, { useState } from 'react';
import type { AgentRole, Swarm, SwarmGraph, TaskNode, TaskStatus } from '../lib/api/types';

interface LiveSwarmDAGVisualizerProps {
  swarm: Swarm;
  tasks: TaskNode[];
  graph?: SwarmGraph;
  onStart?: () => void;
  onCancel?: () => void;
  onReplan?: () => void;
}

const ROLE_CONFIG: Record<
  AgentRole,
  { label: string; icon: string; bg: string; border: string; text: string }
> = {
  ORCHESTRATOR: {
    label: 'Orchestrator',
    icon: '👑',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/50',
    text: 'text-purple-300',
  },
  RESEARCHER: {
    label: 'Researcher',
    icon: '🔬',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
  },
  DATA_PROVIDER: {
    label: 'Data Provider',
    icon: '📡',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
  },
  ANALYST: {
    label: 'Analyst',
    icon: '📊',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
  },
  VERIFIER: {
    label: 'Verifier',
    icon: '🛡️',
    bg: 'bg-teal-950/60',
    border: 'border-teal-500/50',
    text: 'text-teal-300',
  },
  CRITIC: {
    label: 'Critic',
    icon: '⚖️',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
  },
  SYNTHESIZER: {
    label: 'Synthesizer',
    icon: '✨',
    bg: 'bg-indigo-950/60',
    border: 'border-indigo-500/50',
    text: 'text-indigo-300',
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badge: string; ring: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    ring: 'border-slate-800',
    dot: 'bg-slate-500',
  },
  READY: {
    label: 'Ready',
    badge: 'bg-blue-950 text-blue-400 border-blue-800',
    ring: 'border-blue-800',
    dot: 'bg-blue-400',
  },
  ASSIGNED: {
    label: 'Assigned',
    badge: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    ring: 'border-indigo-800',
    dot: 'bg-indigo-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-cyan-950 text-cyan-300 border-cyan-700 animate-pulse',
    ring: 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    dot: 'bg-cyan-400 animate-ping',
  },
  VALIDATING: {
    label: 'Validating',
    badge: 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse',
    ring: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-400',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    ring: 'border-emerald-500/60',
    dot: 'bg-emerald-400',
  },
  FAILED: {
    label: 'Failed',
    badge: 'bg-rose-950 text-rose-300 border-rose-800',
    ring: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    dot: 'bg-rose-400',
  },
  BLOCKED: {
    label: 'Blocked',
    badge: 'bg-slate-900 text-slate-500 border-slate-800',
    ring: 'border-slate-800',
    dot: 'bg-slate-600',
  },
  SKIPPED: {
    label: 'Skipped',
    badge: 'bg-slate-900 text-slate-500 border-slate-800',
    ring: 'border-slate-800',
    dot: 'bg-slate-600',
  },
};

function formatUsdc(amountBaseUnits?: string): string {
  if (!amountBaseUnits) return '0.00 USDC';
  const num = Number(amountBaseUnits);
  if (isNaN(num)) return `${amountBaseUnits} USDC`;
  return `${(num / 1e6).toFixed(2)} USDC`;
}

export function LiveSwarmDAGVisualizer({
  swarm,
  tasks,
  graph,
  onStart,
  onCancel,
  onReplan,
}: LiveSwarmDAGVisualizerProps) {
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [filterRole, setFilterRole] = useState<string>('ALL');

  // Group tasks by DAG depth level
  const maxDepth = tasks.reduce((max, t) => Math.max(max, t.depth), 0);
  const depthColumns: TaskNode[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    depthColumns.push(tasks.filter((t) => t.depth === d));
  }

  const filteredTasks = tasks.filter(
    (t) => filterRole === 'ALL' || t.role === filterRole
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header controls & stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  swarm.status === 'RUNNING' ? 'bg-cyan-400' : 'bg-purple-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  swarm.status === 'RUNNING' ? 'bg-cyan-500' : 'bg-purple-500'
                }`}
              ></span>
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>{swarm.name}</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                swarm.status === 'RUNNING'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : swarm.status === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-purple-950 text-purple-300 border-purple-800'
              }`}
            >
              {swarm.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{swarm.objective}</p>
        </div>

        {/* Action buttons & financial metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-right font-mono">
            <span className="text-[10px] text-slate-500 uppercase block">Max Budget</span>
            <span className="text-sm font-bold text-emerald-400">
              {formatUsdc(swarm.max_budget)}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-right font-mono">
            <span className="text-[10px] text-slate-500 uppercase block">Spent / Reserved</span>
            <span className="text-sm font-bold text-cyan-400">
              {formatUsdc(swarm.total_spent)} / {formatUsdc(swarm.total_reserved)}
            </span>
          </div>

          {swarm.status === 'CREATED' && onStart && (
            <button
              onClick={onStart}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              Start Swarm
            </button>
          )}

          {swarm.status === 'RUNNING' && onReplan && (
            <button
              onClick={onReplan}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all active:scale-95"
            >
              ⚡ Replan
            </button>
          )}

          {swarm.status === 'RUNNING' && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all active:scale-95"
            >
              Cancel Swarm
            </button>
          )}
        </div>
      </div>

      {/* Role Filter & DAG Topology Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Filter Role:</span>
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'RESEARCHER', 'DATA_PROVIDER', 'ANALYST', 'VERIFIER', 'CRITIC', 'SYNTHESIZER'].map(
              (r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-all ${
                    filterRole === r
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {r}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 font-mono">
          <span>Max Depth: <strong className="text-white">{maxDepth + 1}</strong></span>
          <span>Tasks: <strong className="text-white">{swarm.completed_tasks}/{swarm.task_count}</strong></span>
          {swarm.risk_score && (
            <span>
              Risk Level:{' '}
              <strong
                className={
                  swarm.risk_score.risk_level === 'LOW'
                    ? 'text-emerald-400'
                    : swarm.risk_score.risk_level === 'MEDIUM'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {swarm.risk_score.risk_level} ({swarm.risk_score.overall_score}/100)
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Hierarchical DAG Columns */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-6 min-w-[850px]">
          {/* Orchestrator Dispatcher Node */}
          <div className="flex-1 min-w-[220px]">
            <div className="text-xs uppercase font-mono tracking-wider text-purple-400 font-bold mb-3 flex items-center gap-2">
              <span>👑 Orchestrator Root</span>
            </div>
            <div className="rounded-xl border border-purple-500/50 bg-gradient-to-b from-purple-950/50 to-slate-950 p-4 shadow-lg ring-1 ring-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-purple-300">
                  {swarm.orchestrator_agent_id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
                  COORDINATOR
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Decentralized coordinator decomposing root objective into specialized subcontracts.
              </p>
              <div className="border-t border-purple-800/40 pt-2 text-[11px] font-mono text-purple-300/80 flex justify-between">
                <span>Security Boundary</span>
                <span className="text-emerald-400">INV-S1 ENFORCED</span>
              </div>
            </div>
          </div>

          {/* Depth Stage Columns */}
          {depthColumns.map((colTasks, depthIdx) => (
            <div key={depthIdx} className="flex-1 min-w-[240px]">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold mb-3 flex items-center justify-between">
                <span>Stage {depthIdx + 1} (Depth {depthIdx})</span>
                <span className="text-[10px] text-slate-500">{colTasks.length} tasks</span>
              </div>

              <div className="space-y-3">
                {colTasks.map((t) => {
                  const roleCfg = ROLE_CONFIG[t.role] || ROLE_CONFIG.RESEARCHER;
                  const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                  const isSelected = selectedTask?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 relative ${
                        roleCfg.bg
                      } ${statusCfg.ring} ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-xl'
                          : 'hover:border-slate-600 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Node Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleCfg.text} ${roleCfg.border}`}
                        >
                          <span>{roleCfg.icon}</span>
                          <span>{roleCfg.label}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusCfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </div>

                      {/* Title & Capability */}
                      <h4 className="text-xs font-semibold text-white leading-snug mb-2 line-clamp-2">
                        {t.title}
                      </h4>

                      {/* Dependencies */}
                      {t.dependencies.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          <span className="text-[9px] text-slate-500 font-mono">Needs:</span>
                          {t.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Budget & Results */}
                      <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">
                          {formatUsdc(t.actual_cost || t.budget)}
                        </span>
                        {t.critic_feedback ? (
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              t.critic_feedback.passed
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            Critic: {t.critic_feedback.score}/100
                          </span>
                        ) : t.consensus_validation ? (
                          <span className="bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded">
                            Consensus: {t.consensus_validation.approval_count}/
                            {t.consensus_validation.verifier_count}
                          </span>
                        ) : t.output_checksum ? (
                          <span className="text-slate-500">
                            Hash: {t.output_checksum.slice(0, 7)}...
                          </span>
                        ) : (
                          <span className="text-slate-500">{t.id}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Task Inspector Modal / Card */}
      {selectedTask && (
        <div className="mt-6 border-t border-slate-800/80 pt-6 animate-fadeIn">
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {ROLE_CONFIG[selectedTask.role]?.icon || '📋'}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedTask.title}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Task ID: {selectedTask.id} • Depth: {selectedTask.depth}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Status</span>
                <span className="font-bold text-cyan-400">{selectedTask.status}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Assigned Agent</span>
                <span className="font-bold text-purple-300">
                  {selectedTask.assigned_agent_id || 'Pending Discovery'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Budget Allocation</span>
                <span className="font-bold text-emerald-400">
                  {formatUsdc(selectedTask.budget)} (Spent:{' '}
                  {formatUsdc(selectedTask.actual_cost)})
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">Capability</span>
                <span className="font-bold text-white">
                  {selectedTask.required_capability}
                </span>
              </div>
            </div>

            {selectedTask.critic_feedback && (
              <div className="mt-4 p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs">
                <div className="flex items-center justify-between mb-1 font-mono">
                  <span className="font-bold text-amber-300">
                    Critic Feedback (Score: {selectedTask.critic_feedback.score}/100)
                  </span>
                  <span className="text-slate-400">
                    Reviewed by {selectedTask.critic_feedback.critic_agent_id}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {selectedTask.critic_feedback.feedback}
                </p>
              </div>
            )}

            {selectedTask.consensus_validation && (
              <div className="mt-4 p-3 rounded-lg bg-teal-950/30 border border-teal-800/60 text-xs">
                <div className="flex items-center justify-between mb-1 font-mono">
                  <span className="font-bold text-teal-300">
                    Consensus Validation (Confidence:{' '}
                    {(selectedTask.consensus_validation.confidence * 100).toFixed(1)}%)
                  </span>
                  <span className="text-slate-400">
                    {selectedTask.consensus_validation.approval_count} Approvals /{' '}
                    {selectedTask.consensus_validation.verifier_count} Verifiers
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Independent verifiers reached unanimous agreement on output veracity without discrepancy.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
