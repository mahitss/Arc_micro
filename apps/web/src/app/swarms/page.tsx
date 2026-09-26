'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  cancelSwarm,
  createSwarm,
  getSwarms,
  simulateSwarm,
  startSwarm,
} from '../../lib/api/swarms';
import type { SimulateSwarmResponse, Swarm } from '../../lib/api/types';

function formatUsdc(amountBaseUnits?: string): string {
  if (!amountBaseUnits) return '0.00 USDC';
  const num = Number(amountBaseUnits);
  if (isNaN(num)) return `${amountBaseUnits} USDC`;
  return `${(num / 1e6).toFixed(2)} USDC`;
}

export default function SwarmsIndexPage() {
  const [swarms, setSwarms] = useState<Swarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createObjective, setCreateObjective] = useState('');
  const [createBudget, setCreateBudget] = useState('5000000');
  const [creating, setCreating] = useState(false);

  // Simulation modal state
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulateSwarmResponse | null>(null);

  const fetchSwarmList = async () => {
    setLoading(true);
    try {
      const data = await getSwarms();
      setSwarms(data);
    } catch (err) {
      console.error('Failed to load swarms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwarmList();
  }, []);

  const handleCreateSwarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createObjective || !createBudget) return;
    setCreating(true);
    try {
      const newSwarm = await createSwarm({
        name: createName,
        objective: createObjective,
        max_budget: createBudget,
        asset: 'USDC',
      });
      setSwarms((prev) => [newSwarm, ...prev]);
      setShowCreateModal(false);
      setCreateName('');
      setCreateObjective('');
    } catch (err) {
      alert(`Failed to create swarm: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSimulate = async () => {
    if (!createObjective) {
      alert('Please enter an objective to simulate');
      return;
    }
    setSimulating(true);
    try {
      const res = await simulateSwarm({
        name: createName || 'Simulated Swarm',
        objective: createObjective,
        max_budget: createBudget || '5000000',
      });
      setSimResult(res);
    } catch (err) {
      alert(`Simulation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleStart = async (swarmId: string) => {
    try {
      const updated = await startSwarm(swarmId);
      setSwarms((prev) => prev.map((s) => (s.id === swarmId ? updated : s)));
    } catch (err) {
      alert(`Failed to start swarm: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCancel = async (swarmId: string) => {
    if (!confirm('Are you sure you want to cancel this swarm and release all reserved funds?')) return;
    try {
      const updated = await cancelSwarm(swarmId);
      setSwarms((prev) => prev.map((s) => (s.id === swarmId ? updated : s)));
    } catch (err) {
      alert(`Failed to cancel swarm: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredSwarms = swarms.filter((s) => {
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalSpent = swarms.reduce((sum, s) => sum + (Number(s.total_spent) || 0), 0);
  const activeSwarmsCount = swarms.filter((s) => s.status === 'RUNNING').length;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 lg:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#141414] border border-[#222222] text-[#D6A83A] text-xl">
              🐝
            </span>
            <div>
              <h1 className="text-2xl font-bold text-[#F2F0EA] tracking-tight flex items-center gap-2">
                Multi-Agent Swarm Orchestration
                <span className="text-xs px-2.5 py-0.5 rounded font-mono bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                  PHASE 30
                </span>
              </h1>
              <p className="text-sm text-[#B0ADA5] mt-0.5">
                Economic control plane coordinating specialized agent collectives under zero-elevation security
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSimResult(null);
              setShowSimulateModal(true);
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold font-mono bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Dry-Run Simulation</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold font-mono bg-[#F2F0EA] hover:bg-white text-[#080808] transition-colors active:scale-95 flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Swarm</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#101010] border border-[#222222] p-4">
          <span className="text-xs text-[#716F69] font-mono block mb-1">Active Swarms</span>
          <div className="text-2xl font-bold text-[#F2F0EA] flex items-center gap-2">
            <span>{activeSwarmsCount}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30 font-mono">
              Running
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[#101010] border border-[#222222] p-4">
          <span className="text-xs text-[#716F69] font-mono block mb-1">Total Coordinated Spend</span>
          <div className="text-2xl font-bold text-[#2FB36F] font-mono">
            {formatUsdc(String(totalSpent))}
          </div>
        </div>

        <div className="rounded-xl bg-[#101010] border border-[#222222] p-4">
          <span className="text-xs text-[#716F69] font-mono block mb-1">Security Boundary</span>
          <div className="text-2xl font-bold text-[#F2F0EA] font-mono flex items-center gap-2">
            <span>INV-S1</span>
            <span className="text-xs text-[#716F69] font-normal">Zero Keys</span>
          </div>
        </div>

        <div className="rounded-xl bg-[#101010] border border-[#222222] p-4">
          <span className="text-xs text-[#716F69] font-mono block mb-1">Concurrency Boundary</span>
          <div className="text-2xl font-bold text-[#F2F0EA] font-mono">
            4 Workers <span className="text-xs text-[#716F69] font-normal">/ DAG</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101010] p-3 rounded-xl border border-[#222222]">
        <div className="flex items-center gap-2">
          {['ALL', 'RUNNING', 'COMPLETED', 'CREATED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterStatus === st
                  ? 'bg-[#F2F0EA] text-[#080808] font-bold'
                  : 'bg-[#141414] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search swarms or objectives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-1.5 text-xs text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
          />
        </div>
      </div>

      {/* Swarms Grid */}
      {loading ? (
        <div className="text-center py-20 text-[#716F69] font-mono text-sm animate-pulse">
          Loading Swarm telemetry and active DAG allocations...
        </div>
      ) : filteredSwarms.length === 0 ? (
        <div className="text-center py-20 bg-[#101010] rounded-xl border border-[#222222]">
          <p className="text-[#B0ADA5] text-sm">No swarms found matching your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSwarms.map((sw) => {
            const pctCompleted =
              sw.task_count > 0 ? Math.round((sw.completed_tasks / sw.task_count) * 100) : 0;
            const pctBudget =
              Number(sw.max_budget) > 0
                ? Math.min(
                    100,
                    Math.round(
                      ((Number(sw.total_spent) + Number(sw.total_reserved)) /
                        Number(sw.max_budget)) *
                        100
                    )
                  )
                : 0;

            return (
              <div
                key={sw.id}
                className="rounded-xl bg-[#101010] border border-[#222222] p-6 hover:border-[#2D2D2D] transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Top line: status & risk */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold border ${
                        sw.status === 'RUNNING'
                          ? 'bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30'
                          : sw.status === 'COMPLETED'
                          ? 'bg-[#181818] text-[#B0ADA5] border border-[#222222]'
                          : sw.status === 'CANCELLED'
                          ? 'bg-[#D85C5C]/15 text-[#D85C5C] border border-[#D85C5C]/30'
                          : 'bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30'
                      }`}
                    >
                      {sw.status}
                    </span>

                    {sw.risk_score && (
                      <span className="text-xs font-mono text-[#B0ADA5] flex items-center gap-1.5">
                        <span className="text-[10px] text-[#716F69] uppercase">Risk:</span>
                        <strong
                          className={
                            sw.risk_score.risk_level === 'LOW'
                              ? 'text-[#2FB36F]'
                              : sw.risk_score.risk_level === 'MEDIUM'
                              ? 'text-[#D6A83A]'
                              : 'text-[#D85C5C]'
                          }
                        >
                          {sw.risk_score.risk_level} ({sw.risk_score.overall_score}/100)
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Title & Objective */}
                  <h3 className="text-lg font-bold text-[#F2F0EA] mb-2 tracking-wide">{sw.name}</h3>
                  <p className="text-xs text-[#B0ADA5] leading-relaxed mb-4 line-clamp-2">
                    {sw.objective}
                  </p>

                  {/* Progress Indicators */}
                  <div className="space-y-3 mb-5">
                    {/* Task Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-[#716F69] mb-1">
                        <span>Tasks Completed</span>
                        <span>
                          {sw.completed_tasks} / {sw.task_count} ({pctCompleted}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#181818] overflow-hidden">
                        <div
                          className="h-full bg-[#D6A83A] transition-all duration-300"
                          style={{ width: `${pctCompleted}%` }}
                        />
                      </div>
                    </div>

                    {/* Budget Utilization Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-[#716F69] mb-1">
                        <span>Budget Allocated</span>
                        <span>
                          {formatUsdc(sw.total_spent)} of {formatUsdc(sw.max_budget)} ({pctBudget}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#181818] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            pctBudget > 90 ? 'bg-[#D85C5C]' : 'bg-[#2FB36F]'
                          }`}
                          style={{ width: `${pctBudget}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-[#222222] pt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-[#716F69] truncate max-w-[150px]">
                    {sw.id}
                  </span>

                  <div className="flex items-center gap-2">
                    {sw.status === 'CREATED' && (
                      <button
                        onClick={() => handleStart(sw.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-[#F2F0EA] hover:bg-white text-[#080808] transition-colors"
                      >
                        Start
                      </button>
                    )}

                    {sw.status === 'RUNNING' && (
                      <button
                        onClick={() => handleCancel(sw.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-[#D85C5C]/15 hover:bg-[#D85C5C]/25 text-[#D85C5C] border border-[#D85C5C]/30 transition-colors"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/swarms/${sw.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1"
                    >
                      <span>Inspect DAG</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Swarm Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg rounded-xl bg-[#101010] border border-[#222222] p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-[#F2F0EA] mb-2">Create Autonomous Swarm</h3>
            <p className="text-xs text-[#B0ADA5] mb-5">
              Specify the high-level objective and hard financial ceiling. The Swarm Planner will automatically decompose this into specialized DAG subcontracts.
            </p>

            <form onSubmit={handleCreateSwarm} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#B0ADA5] block mb-1">Swarm Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Datacenter Market Due Diligence"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#B0ADA5] block mb-1">Root Objective</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Investigate power constraints and compute contracts for Tier-4 facilities..."
                  value={createObjective}
                  onChange={(e) => setCreateObjective(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#B0ADA5] block mb-1">
                  Hard Budget Ceiling (micro-USDC, e.g. 5000000 = $5.00)
                </label>
                <input
                  type="text"
                  required
                  value={createBudget}
                  onChange={(e) => setCreateBudget(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
                />
                <span className="text-[10px] text-[#716F69] mt-1 block">
                  Equivalent to {formatUsdc(createBudget)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#716F69] hover:text-[#F2F0EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono transition-colors"
                >
                  {creating ? 'Decomposing...' : 'Create Swarm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dry-Run Simulation Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-xl rounded-xl bg-[#101010] border border-[#222222] p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-[#F2F0EA] mb-2">Swarm Dry-Run Simulation</h3>
            <p className="text-xs text-[#B0ADA5] mb-4">
              Simulate DAG decomposition, budget reservations, and cycle detection without broadcasting on-chain transactions.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-mono text-[#B0ADA5] block mb-1">Objective</label>
                <input
                  type="text"
                  placeholder="e.g. Audit smart contract bytecode for reentrancy"
                  value={createObjective}
                  onChange={(e) => setCreateObjective(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-2 rounded-lg text-xs font-semibold font-mono bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
              >
                {simulating ? 'Simulating...' : 'Run Zero-Broadcast Simulation'}
              </button>
            </div>

            {simResult && (
              <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-[#222222] pb-2">
                  <span className="text-[#716F69]">DAG Validity:</span>
                  <span className="text-[#2FB36F] font-bold">
                    {simResult.is_valid_dag ? 'PASS (Acyclic)' : 'FAIL'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#222222] pb-2">
                  <span className="text-[#716F69]">Tasks Planned:</span>
                  <span className="text-[#F2F0EA] font-bold">{simResult.task_count}</span>
                </div>
                <div className="flex justify-between border-b border-[#222222] pb-2">
                  <span className="text-[#716F69]">Max Depth:</span>
                  <span className="text-[#F2F0EA] font-bold">{simResult.max_depth}</span>
                </div>
                <div className="flex justify-between border-b border-[#222222] pb-2">
                  <span className="text-[#716F69]">Estimated Cost:</span>
                  <span className="text-[#2FB36F] font-bold">
                    {formatUsdc(simResult.estimated_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Projected Latency:</span>
                  <span className="text-[#F2F0EA] font-bold">
                    {simResult.estimated_latency_ms} ms
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#716F69] hover:text-[#F2F0EA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
