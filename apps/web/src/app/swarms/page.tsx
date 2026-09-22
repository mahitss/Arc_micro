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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xl">
              🐝
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Multi-Agent Swarm Orchestration
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-950 text-purple-300 border border-purple-800">
                  PHASE 30
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
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
            className="px-4 py-2 rounded-xl text-xs font-semibold font-mono bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 transition-all flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Dry-Run Simulation</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold font-mono bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Swarm</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 font-mono block mb-1">Active Swarms</span>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{activeSwarmsCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
              Running
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 font-mono block mb-1">Total Coordinated Spend</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatUsdc(String(totalSpent))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 font-mono block mb-1">Security Boundary</span>
          <div className="text-2xl font-bold text-purple-400 font-mono flex items-center gap-2">
            <span>INV-S1</span>
            <span className="text-xs text-slate-400 font-normal">Zero Keys</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 font-mono block mb-1">Concurrency Boundary</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            4 Workers <span className="text-xs text-slate-500 font-normal">/ DAG</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          {['ALL', 'RUNNING', 'COMPLETED', 'CREATED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filterStatus === st
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
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
            className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Swarms Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 font-mono text-sm animate-pulse">
          Loading Swarm telemetry and active DAG allocations...
        </div>
      ) : filteredSwarms.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm">No swarms found matching your filter criteria.</p>
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
                className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 p-6 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Top line: status & risk */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                        sw.status === 'RUNNING'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : sw.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : sw.status === 'CANCELLED'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}
                    >
                      {sw.status}
                    </span>

                    {sw.risk_score && (
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 uppercase">Risk:</span>
                        <strong
                          className={
                            sw.risk_score.risk_level === 'LOW'
                              ? 'text-emerald-400'
                              : sw.risk_score.risk_level === 'MEDIUM'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }
                        >
                          {sw.risk_score.risk_level} ({sw.risk_score.overall_score}/100)
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Title & Objective */}
                  <h3 className="text-lg font-bold text-white mb-2 tracking-wide">{sw.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                    {sw.objective}
                  </p>

                  {/* Progress Indicators */}
                  <div className="space-y-3 mb-5">
                    {/* Task Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>Tasks Completed</span>
                        <span>
                          {sw.completed_tasks} / {sw.task_count} ({pctCompleted}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${pctCompleted}%` }}
                        />
                      </div>
                    </div>

                    {/* Budget Utilization Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>Budget Allocated</span>
                        <span>
                          {formatUsdc(sw.total_spent)} of {formatUsdc(sw.max_budget)} ({pctBudget}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            pctBudget > 90 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pctBudget}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]">
                    {sw.id}
                  </span>

                  <div className="flex items-center gap-2">
                    {sw.status === 'CREATED' && (
                      <button
                        onClick={() => handleStart(sw.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-all"
                      >
                        Start
                      </button>
                    )}

                    {sw.status === 'RUNNING' && (
                      <button
                        onClick={() => handleCancel(sw.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/swarms/${sw.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-all flex items-center gap-1"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Create Autonomous Swarm</h3>
            <p className="text-xs text-slate-400 mb-5">
              Specify the high-level objective and hard financial ceiling. The Swarm Planner will automatically decompose this into specialized DAG subcontracts.
            </p>

            <form onSubmit={handleCreateSwarm} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Swarm Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Datacenter Market Due Diligence"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Root Objective</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Investigate power constraints and compute contracts for Tier-4 facilities..."
                  value={createObjective}
                  onChange={(e) => setCreateObjective(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Hard Budget Ceiling (micro-USDC, e.g. 5000000 = $5.00)
                </label>
                <input
                  type="text"
                  required
                  value={createBudget}
                  onChange={(e) => setCreateBudget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Equivalent to {formatUsdc(createBudget)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white font-mono transition-all"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Swarm Dry-Run Simulation</h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulate DAG decomposition, budget reservations, and cycle detection without broadcasting on-chain transactions.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Objective</label>
                <input
                  type="text"
                  placeholder="e.g. Audit smart contract bytecode for reentrancy"
                  value={createObjective}
                  onChange={(e) => setCreateObjective(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-2 rounded-xl text-xs font-semibold font-mono bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-all"
              >
                {simulating ? 'Simulating...' : 'Run Zero-Broadcast Simulation'}
              </button>
            </div>

            {simResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">DAG Validity:</span>
                  <span className="text-emerald-400 font-bold">
                    {simResult.is_valid_dag ? 'PASS (Acyclic)' : 'FAIL'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Tasks Planned:</span>
                  <span className="text-white font-bold">{simResult.task_count}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Max Depth:</span>
                  <span className="text-white font-bold">{simResult.max_depth}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Estimated Cost:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatUsdc(simResult.estimated_cost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Projected Latency:</span>
                  <span className="text-cyan-400 font-bold">
                    {simResult.estimated_latency_ms} ms
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
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
