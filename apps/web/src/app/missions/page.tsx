'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchMissions,
  createMission,
  startMission,
  cancelMission,
  simulateMission,
} from '../../lib/api/missions';
import { Mission, MissionSimulationResponse } from '../../lib/api/types';

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [objective, setObjective] = useState('');
  const [budgetUsdc, setBudgetUsdc] = useState('2.00');
  const [agentId, setAgentId] = useState('research-agent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationResult, setSimulationResult] = useState<MissionSimulationResponse | null>(null);

  const loadMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMissions();
      setMissions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load missions';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSimulationResult(null);

    const budgetBase = Math.round(parseFloat(budgetUsdc || '1') * 1000000).toString();

    try {
      const sim = await simulateMission({
        objective,
        budget: budgetBase,
        agent_id: agentId,
        currency: 'USDC',
      });
      setSimulationResult(sim);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const budgetBase = Math.round(parseFloat(budgetUsdc || '1') * 1000000).toString();

    try {
      const { mission } = await createMission({
        objective,
        budget: budgetBase,
        agent_id: agentId,
        currency: 'USDC',
      });
      setMissions((prev) => [mission, ...prev]);
      setObjective('');
      setSimulationResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      const updated = await startMission(id);
      setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start mission');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await cancelMission(id);
      setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel mission');
    }
  };

  const formatUsdc = (baseUnits: string) => {
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
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Autonomous Missions</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border border-teal-500/30">
              Economy Engine v2.0
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Autonomous economic objectives executed under deterministic AgentPay financial controls.
            AI agents discover services, evaluate quotes, and coordinate spend without holding private keys.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>INV-E1: Spend ≤ Budget Enforced</span>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400">TOTAL MISSIONS</div>
          <div className="text-2xl font-bold text-white mt-1">{missions.length}</div>
          <div className="text-[11px] text-teal-400 mt-0.5">Autonomous operations</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400">ACTIVE MISSIONS</div>
          <div className="text-2xl font-bold text-teal-300 mt-1">
            {missions.filter((m) => ['PLANNING', 'DISCOVERING', 'EXECUTING'].includes(m.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">In flight</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400">TOTAL SPENT</div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatUsdc(
              missions
                .reduce((acc, m) => acc + parseInt(m.spent || '0', 10), 0)
                .toString()
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Arc USDC Base Units</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs font-mono text-slate-400">SAFETY SHIELD</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">100%</div>
          <div className="text-[11px] text-emerald-500 mt-0.5">Deterministic Rust Policy</div>
        </div>
      </div>

      {/* Launch Mission / Simulation Control Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/90 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <h2 className="text-lg font-semibold text-white">Launch or Simulate Autonomous Mission</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">No private keys required</span>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              ECONOMIC OBJECTIVE
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Find the cheapest verified weather-data provider and obtain telemetry"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60 font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                BUDGET CEILING (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  value={budgetUsdc}
                  onChange={(e) => setBudgetUsdc(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-teal-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                AUTHORIZED INITIATOR AGENT
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-teal-500/60"
              >
                <option value="research-agent">research-agent (Tier 1)</option>
                <option value="arbitrage-bot-1">arbitrage-bot-1 (Tier 2)</option>
                <option value="sec-audit-agent">sec-audit-agent (Security)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono">
              Error: {error}
            </div>
          )}

          {/* Simulation Preview Result */}
          {simulationResult && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-teal-400 font-bold tracking-wide">
                  SIMULATION RESULT (ZERO-BROADCAST)
                </span>
                <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  SIMULATION_ONLY: TRUE
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Projected Spend:</span>{' '}
                  <span className="text-white font-bold">
                    {formatUsdc(simulationResult.total_projected_spend)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">All Steps Approved:</span>{' '}
                  <span className={simulationResult.all_steps_approved ? 'text-emerald-400' : 'text-rose-400'}>
                    {simulationResult.all_steps_approved ? 'YES' : 'NO'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Candidates Evaluated:</span>{' '}
                  <span className="text-white">{simulationResult.candidate_count}</span>
                </div>
                <div>
                  <span className="text-slate-500">Human Approval:</span>{' '}
                  <span className="text-white">
                    {simulationResult.requires_human_approval ? 'REQUIRED' : 'AUTO'}
                  </span>
                </div>
              </div>
              {simulationResult.simulated_steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-teal-300">{st.step_id}</span> ({st.required_capability}) → Selected:{' '}
                    <span className="text-white font-semibold">{st.selected_service_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Price: </span>
                    <span className="text-white font-bold">{formatUsdc(st.quoted_price)}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {st.policy_decision}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting || !objective.trim()}
              onClick={handleSimulate}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-slate-700 transition-colors disabled:opacity-50"
            >
              Simulate Dry-Run
            </button>
            <button
              type="button"
              disabled={isSubmitting || !objective.trim()}
              onClick={handleCreate}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>

      {/* Missions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Mission Roster</h2>
          <button
            onClick={loadMissions}
            className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors"
          >
            Refresh Roster
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-mono text-sm">
            Loading autonomous missions...
          </div>
        ) : missions.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800">
            <p className="text-slate-400 text-sm">No missions found. Launch an objective above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {missions.map((m) => {
              const spentNum = parseInt(m.spent || '0', 10);
              const budgetNum = parseInt(m.budget || '1', 10);
              const pctSpent = Math.min(100, Math.round((spentNum / (budgetNum || 1)) * 100));

              return (
                <div
                  key={m.id}
                  className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getStatusBadge(
                          m.status
                        )}`}
                      >
                        {m.status}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{m.id}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-xs text-slate-400">Agent: {m.agent_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status === 'CREATED' && (
                        <button
                          onClick={() => handleStart(m.id)}
                          className="px-3 py-1 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-xs font-mono border border-teal-500/40 transition-colors"
                        >
                          Execute Loop
                        </button>
                      )}
                      {!['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXHAUSTED'].includes(m.status) && (
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="px-3 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-mono border border-rose-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/missions/${m.id}`}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
                      >
                        Inspect Details →
                      </Link>
                      <Link
                        href={`/trace?mission_id=${m.id}`}
                        className="px-3 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono border border-cyan-500/30 transition-colors"
                      >
                        Flight Trace
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white">{m.objective}</h3>
                    {m.failure_reason && (
                      <p className="text-xs text-rose-400 mt-1 font-mono">
                        Failure Reason: {m.failure_reason}
                      </p>
                    )}
                  </div>

                  {/* Budget Utilization Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono text-slate-400">
                      <span>Budget: {formatUsdc(m.budget)}</span>
                      <span>
                        Spent: <span className="text-white font-bold">{formatUsdc(m.spent)}</span> ({pctSpent}%)
                      </span>
                      <span>Remaining: {formatUsdc(m.remaining_budget || '0')}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pctSpent > 90
                            ? 'bg-rose-500'
                            : pctSpent > 60
                            ? 'bg-amber-400'
                            : 'bg-gradient-to-r from-teal-500 to-cyan-400'
                        }`}
                        style={{ width: `${pctSpent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
