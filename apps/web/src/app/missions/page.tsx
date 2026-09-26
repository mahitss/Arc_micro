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
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            COMPLETED
          </span>
        );
      case 'EXECUTING':
      case 'CONTINUING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
            {status}
          </span>
        );
      case 'PLANNING':
      case 'DISCOVERING':
      case 'EVALUATING':
      case 'SELECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#a3a3a3] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            {status}
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f59e0b] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            AWAITING APPROVAL
          </span>
        );
      case 'BUDGET_EXHAUSTED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#ef4444] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#666666] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#666666]" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#a3a3a3] border border-[#222222]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#f5f5f5]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">
              Autonomous Missions
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#a3a3a3] border border-[#222222]">
              DETERMINISTIC SPEND ENGINE
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3] mt-1 max-w-2xl leading-relaxed">
            Autonomous economic objectives executed under deterministic AgentPay financial controls.
            AI agents discover services, evaluate quotes, and coordinate spend without holding private keys.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#a3a3a3] bg-[#101010] px-3 py-1.5 rounded-lg border border-[#222222]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>INV-E1: Spend ≤ Budget Enforced</span>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#a3a3a3]">TOTAL MISSIONS</div>
          <div className="text-2xl font-bold text-[#f5f5f5] mt-1">{missions.length}</div>
          <div className="text-[11px] text-[#666666] mt-0.5">Autonomous operations</div>
        </div>
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#a3a3a3]">ACTIVE MISSIONS</div>
          <div className="text-2xl font-bold text-[#f5f5f5] mt-1">
            {missions.filter((m) => ['PLANNING', 'DISCOVERING', 'EXECUTING'].includes(m.status)).length}
          </div>
          <div className="text-[11px] text-[#666666] mt-0.5">In flight</div>
        </div>
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#a3a3a3]">TOTAL SPENT</div>
          <div className="text-2xl font-bold text-[#f5f5f5] mt-1">
            {formatUsdc(
              missions
                .reduce((acc, m) => acc + parseInt(m.spent || '0', 10), 0)
                .toString()
            )}
          </div>
          <div className="text-[11px] text-[#666666] mt-0.5">Arc USDC Base Units</div>
        </div>
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#a3a3a3]">SAFETY SHIELD</div>
          <div className="text-2xl font-bold text-[#f5f5f5] mt-1 flex items-center gap-1.5">
            <span>100%</span>
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          </div>
          <div className="text-[11px] text-[#666666] mt-0.5">Deterministic Rust Policy</div>
        </div>
      </div>

      {/* Mission Creation Panel */}
      <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
        <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">
              LAUNCH OR SIMULATE AUTONOMOUS MISSION
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#666666]">Zero private keys required</span>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1.5">
              ECONOMIC OBJECTIVE
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Find the cheapest verified weather-data provider and obtain telemetry"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#222222] text-xs text-[#f5f5f5] placeholder:text-[#666666] focus:outline-none focus:border-[#444444] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1.5">
                BUDGET CEILING (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-[#666666] font-mono">$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  value={budgetUsdc}
                  onChange={(e) => setBudgetUsdc(e.target.value)}
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#222222] text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-[#444444]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1.5">
                AUTHORIZED INITIATOR AGENT
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d0d0d] border border-[#222222] text-xs text-[#f5f5f5] font-mono focus:outline-none focus:border-[#444444]"
              >
                <option value="research-agent">research-agent (Tier 1)</option>
                <option value="arbitrage-bot-1">arbitrage-bot-1 (Tier 2)</option>
                <option value="sec-audit-agent">sec-audit-agent (Security)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#171717] border border-[#ef4444]/40 text-xs text-[#ef4444] font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              <span>Error: {error}</span>
            </div>
          )}

          {/* Simulation Preview Result */}
          {simulationResult && (
            <div className="p-4 rounded-lg bg-[#0d0d0d] border border-[#2a2a2a] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                <span className="text-[#f5f5f5] font-bold tracking-wide">
                  SIMULATION RESULT (ZERO-BROADCAST)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#141414] text-[#a3a3a3] border border-[#222222] text-[10px]">
                  SIMULATION ONLY
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#a3a3a3]">
                <div>
                  <span className="text-[#666666]">Projected Spend:</span>{' '}
                  <span className="text-[#f5f5f5] font-bold">
                    {formatUsdc(simulationResult.total_projected_spend)}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666]">All Steps Approved:</span>{' '}
                  <span className={simulationResult.all_steps_approved ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                    {simulationResult.all_steps_approved ? 'YES' : 'NO'}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666]">Candidates Evaluated:</span>{' '}
                  <span className="text-[#f5f5f5]">{simulationResult.candidate_count}</span>
                </div>
                <div>
                  <span className="text-[#666666]">Human Approval:</span>{' '}
                  <span className="text-[#f5f5f5]">
                    {simulationResult.requires_human_approval ? 'REQUIRED' : 'AUTO'}
                  </span>
                </div>
              </div>
              {simulationResult.simulated_steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded bg-[#131313] border border-[#222222] flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[#f5f5f5] font-mono">{st.step_id}</span> ({st.required_capability}) → Selected:{' '}
                    <span className="text-[#f5f5f5] font-semibold">{st.selected_service_id}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[#666666]">Price: </span>
                    <span className="text-[#f5f5f5] font-bold">{formatUsdc(st.quoted_price)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#171717] text-[#22c55e] border border-[#222222]">
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
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#080808] font-bold text-xs font-mono transition-colors disabled:opacity-40"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE MISSION'}
            </button>
            <button
              type="button"
              disabled={isSubmitting || !objective.trim()}
              onClick={handleSimulate}
              className="px-4 py-2 rounded-lg bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-semibold font-mono border border-[#2a2a2a] transition-colors disabled:opacity-40"
            >
              SIMULATE DRY-RUN
            </button>
          </div>
        </form>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">
            Mission Roster
          </h2>
          <button
            onClick={loadMissions}
            className="text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
          >
            Refresh Roster
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#666666] font-mono text-xs">
            Loading autonomous missions...
          </div>
        ) : missions.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-[#101010] border border-[#222222]">
            <p className="text-[#a3a3a3] text-xs">No missions found. Launch an objective above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {missions.map((m) => {
              const spentNum = parseInt(m.spent || '0', 10);
              const budgetNum = parseInt(m.budget || '1', 10);
              const pctSpent = Math.min(100, Math.round((spentNum / (budgetNum || 1)) * 100));

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(m.status)}
                      <span className="font-mono text-xs text-[#a3a3a3]">{m.id}</span>
                      <span className="text-[#444444]">•</span>
                      <span className="font-mono text-xs text-[#666666]">Agent: {m.agent_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status === 'CREATED' && (
                        <button
                          onClick={() => handleStart(m.id)}
                          className="px-2.5 py-1 rounded bg-[#171717] text-[#f5f5f5] hover:bg-[#202020] text-xs font-mono border border-[#2a2a2a] transition-colors"
                        >
                          Execute Loop
                        </button>
                      )}
                      {!['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXHAUSTED'].includes(m.status) && (
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="px-2.5 py-1 rounded bg-[#171717] text-[#ef4444] hover:bg-[#202020] text-xs font-mono border border-[#ef4444]/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/missions/${m.id}`}
                        className="px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-mono border border-[#262626] transition-colors"
                      >
                        Inspect Details →
                      </Link>
                      <Link
                        href={`/trace?mission_id=${m.id}`}
                        className="px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-mono border border-[#262626] transition-colors"
                      >
                        Flight Trace
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#f5f5f5]">{m.objective}</h3>
                    {m.failure_reason && (
                      <p className="text-xs text-[#ef4444] mt-1 font-mono">
                        Failure Reason: {m.failure_reason}
                      </p>
                    )}
                  </div>

                  {/* Budget Utilization Meter */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-mono text-[#a3a3a3]">
                      <span>Budget: {formatUsdc(m.budget)}</span>
                      <span>
                        Spent: <span className="text-[#f5f5f5] font-bold">{formatUsdc(m.spent)}</span> ({pctSpent}%)
                      </span>
                      <span>Remaining: {formatUsdc(m.remaining_budget || '0')}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#171717] overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pctSpent > 90
                            ? 'bg-[#ef4444]'
                            : pctSpent > 60
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#a3a3a3]'
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
