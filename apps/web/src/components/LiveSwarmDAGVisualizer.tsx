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
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#D6A83A]',
  },
  RESEARCHER: {
    label: 'Researcher',
    icon: '🔬',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#B0ADA5]',
  },
  DATA_PROVIDER: {
    label: 'Data Provider',
    icon: '📡',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#B0ADA5]',
  },
  ANALYST: {
    label: 'Analyst',
    icon: '📊',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#B0ADA5]',
  },
  VERIFIER: {
    label: 'Verifier',
    icon: '🛡️',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#B0ADA5]',
  },
  CRITIC: {
    label: 'Critic',
    icon: '⚖️',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#D6A83A]',
  },
  SYNTHESIZER: {
    label: 'Synthesizer',
    icon: '✨',
    bg: 'bg-[#141414]',
    border: 'border-[#222222]',
    text: 'text-[#B0ADA5]',
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badge: string; ring: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    badge: 'bg-[#141414] text-[#716F69] border-[#222222]',
    ring: 'border-[#222222]',
    dot: 'bg-[#716F69]',
  },
  READY: {
    label: 'Ready',
    badge: 'bg-[#141414] text-[#B0ADA5] border-[#222222]',
    ring: 'border-[#222222]',
    dot: 'bg-[#716F69]',
  },
  ASSIGNED: {
    label: 'Assigned',
    badge: 'bg-[#141414] text-[#B0ADA5] border-[#222222]',
    ring: 'border-[#222222]',
    dot: 'bg-[#716F69]',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-[#141414] text-[#D6A83A] border-[#222222]',
    ring: 'border-[#D6A83A]/40',
    dot: 'bg-[#D6A83A]',
  },
  VALIDATING: {
    label: 'Validating',
    badge: 'bg-[#141414] text-[#D6A83A] border-[#222222]',
    ring: 'border-[#D6A83A]/40',
    dot: 'bg-[#D6A83A]',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-[#141414] text-[#2FB36F] border-[#222222]',
    ring: 'border-[#2FB36F]/40',
    dot: 'bg-[#2FB36F]',
  },
  FAILED: {
    label: 'Failed',
    badge: 'bg-[#141414] text-[#D85C5C] border-[#222222]',
    ring: 'border-[#D85C5C]/40',
    dot: 'bg-[#D85C5C]',
  },
  BLOCKED: {
    label: 'Blocked',
    badge: 'bg-[#141414] text-[#716F69] border-[#222222]',
    ring: 'border-[#222222]',
    dot: 'bg-[#716F69]',
  },
  SKIPPED: {
    label: 'Skipped',
    badge: 'bg-[#141414] text-[#716F69] border-[#222222]',
    ring: 'border-[#222222]',
    dot: 'bg-[#716F69]',
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
    <div className="rounded-2xl bg-[#101010] border border-[#222222] p-6 shadow-xl relative overflow-hidden">
      {/* Header controls & stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222222] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  swarm.status === 'RUNNING' ? 'bg-[#2FB36F]' : 'bg-[#D6A83A]'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  swarm.status === 'RUNNING' ? 'bg-[#2FB36F]' : 'bg-[#D6A83A]'
                }`}
              ></span>
            </span>
            <h2 className="text-xl font-bold text-[#F2F0EA] tracking-wide flex items-center gap-2">
              <span>{swarm.name}</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                swarm.status === 'RUNNING'
                  ? 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/40'
                  : swarm.status === 'COMPLETED'
                  ? 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/40'
                  : 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
              }`}
            >
              {swarm.status}
            </span>
          </div>
          <p className="text-sm text-[#B0ADA5] mt-1 max-w-2xl">{swarm.objective}</p>
        </div>

        {/* Action buttons & financial metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl px-3 py-1.5 text-right font-mono">
            <span className="text-[10px] text-[#716F69] uppercase block">Max Budget</span>
            <span className="text-sm font-bold text-[#2FB36F]">
              {formatUsdc(swarm.max_budget)}
            </span>
          </div>

          <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl px-3 py-1.5 text-right font-mono">
            <span className="text-[10px] text-[#716F69] uppercase block">Spent / Reserved</span>
            <span className="text-sm font-bold text-[#F2F0EA]">
              {formatUsdc(swarm.total_spent)} / {formatUsdc(swarm.total_reserved)}
            </span>
          </div>

          {swarm.status === 'CREATED' && onStart && (
            <button
              onClick={onStart}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F2F0EA] hover:bg-[#E2DFD7] text-[#080808] transition-all active:scale-95"
            >
              Start Swarm
            </button>
          )}

          {swarm.status === 'RUNNING' && onReplan && (
            <button
              onClick={onReplan}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 transition-all active:scale-95"
            >
              ⚡ Replan
            </button>
          )}

          {swarm.status === 'RUNNING' && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/40 transition-all active:scale-95"
            >
              Cancel Swarm
            </button>
          )}
        </div>
      </div>

      {/* Role Filter & DAG Topology Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#0B0B0B] p-3 rounded-xl border border-[#222222] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#716F69] font-medium">Filter Role:</span>
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'RESEARCHER', 'DATA_PROVIDER', 'ANALYST', 'VERIFIER', 'CRITIC', 'SYNTHESIZER'].map(
              (r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-2.5 py-1 rounded-lg font-mono transition-all ${
                    filterRole === r
                      ? 'bg-[#181818] text-[#F2F0EA] font-bold border border-[#2D2D2D]'
                      : 'bg-[#101010] text-[#716F69] hover:text-[#B0ADA5] border border-[#222222]'
                  }`}
                >
                  {r}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#716F69] font-mono">
          <span>Max Depth: <strong className="text-[#F2F0EA]">{maxDepth + 1}</strong></span>
          <span>Tasks: <strong className="text-[#F2F0EA]">{swarm.completed_tasks}/{swarm.task_count}</strong></span>
          {swarm.risk_score && (
            <span>
              Risk Level:{' '}
              <strong
                className={
                  swarm.risk_score.risk_level === 'LOW'
                    ? 'text-[#2FB36F]'
                    : swarm.risk_score.risk_level === 'MEDIUM'
                    ? 'text-[#D6A83A]'
                    : 'text-[#D85C5C]'
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
            <div className="text-xs uppercase font-mono tracking-wider text-[#D6A83A] font-bold mb-3 flex items-center gap-2">
              <span>👑 Orchestrator Root</span>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#141414] p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#D6A83A]">
                  {swarm.orchestrator_agent_id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#101010] text-[#D6A83A] border border-[#222222]">
                  COORDINATOR
                </span>
              </div>
              <p className="text-xs text-[#B0ADA5] leading-relaxed mb-3">
                Decentralized coordinator decomposing root objective into specialized subcontracts.
              </p>
              <div className="border-t border-[#222222] pt-2 text-[11px] font-mono text-[#716F69] flex justify-between">
                <span>Security Boundary</span>
                <span className="text-[#2FB36F]">INV-S1 ENFORCED</span>
              </div>
            </div>
          </div>

          {/* Depth Stage Columns */}
          {depthColumns.map((colTasks, depthIdx) => (
            <div key={depthIdx} className="flex-1 min-w-[240px]">
              <div className="text-xs uppercase font-mono tracking-wider text-[#B0ADA5] font-bold mb-3 flex items-center justify-between">
                <span>Stage {depthIdx + 1} (Depth {depthIdx})</span>
                <span className="text-[10px] text-[#716F69]">{colTasks.length} tasks</span>
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
                          ? 'ring-1 ring-[#D6A83A] scale-[1.01]'
                          : 'hover:border-[#2D2D2D]'
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
                          <span className="text-[9px] text-[#716F69] font-mono">Needs:</span>
                          {t.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141414] border border-[#222222] text-[#B0ADA5]"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Budget & Results */}
                      <div className="border-t border-[#222222] pt-2.5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#B0ADA5]">
                          {formatUsdc(t.actual_cost || t.budget)}
                        </span>
                        {t.critic_feedback ? (
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              t.critic_feedback.passed
                                ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30'
                                : 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/30'
                            }`}
                          >
                            Critic: {t.critic_feedback.score}/100
                          </span>
                        ) : t.consensus_validation ? (
                          <span className="bg-[#141414] text-[#F2F0EA] border border-[#222222] px-1.5 py-0.5 rounded">
                            Consensus: {t.consensus_validation.approval_count}/
                            {t.consensus_validation.verifier_count}
                          </span>
                        ) : t.output_checksum ? (
                          <span className="text-[#716F69]">
                            Hash: {t.output_checksum.slice(0, 7)}...
                          </span>
                        ) : (
                          <span className="text-[#716F69]">{t.id}</span>
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
        <div className="mt-6 border-t border-[#222222] pt-6 animate-fadeIn">
          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {ROLE_CONFIG[selectedTask.role]?.icon || '📋'}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedTask.title}
                  </h3>
                  <span className="text-xs font-mono text-[#B0ADA5]">
                    Task ID: {selectedTask.id} • Depth: {selectedTask.depth}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-xs text-[#B0ADA5] hover:text-white px-2 py-1 rounded bg-[#141414] border border-[#222222]"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block mb-1">Status</span>
                <span className="font-bold text-[#F2F0EA]">{selectedTask.status}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block mb-1">Assigned Agent</span>
                <span className="font-bold text-[#D6A83A]">
                  {selectedTask.assigned_agent_id || 'Pending Discovery'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block mb-1">Budget Allocation</span>
                <span className="font-bold text-[#2FB36F]">
                  {formatUsdc(selectedTask.budget)} (Spent:{' '}
                  {formatUsdc(selectedTask.actual_cost)})
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block mb-1">Capability</span>
                <span className="font-bold text-[#F2F0EA]">
                  {selectedTask.required_capability}
                </span>
              </div>
            </div>

            {selectedTask.critic_feedback && (
              <div className="mt-4 p-3 rounded-lg bg-[#141414] border border-[#D6A83A]/30 text-xs">
                <div className="flex items-center justify-between mb-1 font-mono">
                  <span className="font-bold text-[#D6A83A]">
                    Critic Feedback (Score: {selectedTask.critic_feedback.score}/100)
                  </span>
                  <span className="text-[#B0ADA5]">
                    Reviewed by {selectedTask.critic_feedback.critic_agent_id}
                  </span>
                </div>
                <p className="text-[#B0ADA5] leading-relaxed">
                  {selectedTask.critic_feedback.feedback}
                </p>
              </div>
            )}

            {selectedTask.consensus_validation && (
              <div className="mt-4 p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs">
                <div className="flex items-center justify-between mb-1 font-mono">
                  <span className="font-bold text-[#F2F0EA]">
                    Consensus Validation (Confidence:{' '}
                    {(selectedTask.consensus_validation.confidence * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[#B0ADA5]">
                    {selectedTask.consensus_validation.approval_count} Approvals /{' '}
                    {selectedTask.consensus_validation.verifier_count} Verifiers
                  </span>
                </div>
                <p className="text-[#B0ADA5] leading-relaxed">
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
