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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            COMPLETED
          </span>
        );
      case 'EXECUTING':
      case 'CONTINUING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
            {status}
          </span>
        );
      case 'PLANNING':
      case 'DISCOVERING':
      case 'EVALUATING':
      case 'SELECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            {status}
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#D6A83A] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            AWAITING APPROVAL
          </span>
        );
      case 'BUDGET_EXHAUSTED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#D85C5C] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
            {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#716F69] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#716F69]" />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              Autonomous Missions
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              DETERMINISTIC SPEND ENGINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1.5 max-w-2xl leading-relaxed">
            Autonomous economic objectives executed under deterministic AgentPay financial controls.
            AI agents discover services, evaluate quotes, and coordinate spend without holding private keys.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#B0ADA5] bg-[#101010] px-3.5 py-2 rounded-lg border border-[#222222] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
          <span>Budget Ceiling Strictly Enforced</span>
        </div>
      </div>

      {/* Metrics Ribbon (Unified Surface) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-3">
        <div className="text-[11px] font-semibold text-[#716F69] uppercase tracking-wider">
          Mission Program Telemetry
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#101010] border border-[#1c1c1c]">
          <div>
            <span className="text-[11px] text-[#716F69] uppercase block font-medium">TOTAL MISSIONS</span>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-0.5 block">{missions.length}</span>
            <span className="text-[11px] text-[#716F69] block">Autonomous operations</span>
          </div>
          <div>
            <span className="text-[11px] text-[#716F69] uppercase block font-medium">ACTIVE MISSIONS</span>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-0.5 block">
              {missions.filter((m) => ['PLANNING', 'DISCOVERING', 'EXECUTING'].includes(m.status)).length}
            </span>
            <span className="text-[11px] text-[#716F69] block">In flight workflows</span>
          </div>
          <div>
            <span className="text-[11px] text-[#716F69] uppercase block font-medium">TOTAL SPENT</span>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-0.5 block">
              {formatUsdc(
                missions
                  .reduce((acc, m) => acc + parseInt(m.spent || '0', 10), 0)
                  .toString()
              )}
            </span>
            <span className="text-[11px] text-[#716F69] block font-mono">Arc USDC Base Units</span>
          </div>
          <div>
            <span className="text-[11px] text-[#716F69] uppercase block font-medium">SAFETY SHIELD</span>
            <span className="text-2xl font-bold text-[#2FB36F] mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
              100%
            </span>
            <span className="text-[11px] text-[#716F69] block">Deterministic Rust Policy</span>
          </div>
        </div>
      </div>

      {/* Mission Creation Panel */}
      <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
        <div className="flex items-center justify-between mb-4 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">
              LAUNCH OR SIMULATE AUTONOMOUS MISSION
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#716F69]">Zero private keys required</span>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[#B0ADA5] mb-1.5">
              ECONOMIC OBJECTIVE
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Find the cheapest verified weather-data provider and obtain telemetry"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F0F0F] border border-[#292929] text-xs text-[#F2F0EA] placeholder:text-[#716F69] focus:outline-none focus:border-[#D6A83A] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-[#B0ADA5] mb-1.5">
                BUDGET CEILING (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-[#716F69] font-mono">$</span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  value={budgetUsdc}
                  onChange={(e) => setBudgetUsdc(e.target.value)}
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-lg bg-[#0F0F0F] border border-[#292929] text-xs text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#B0ADA5] mb-1.5">
                AUTHORIZED INITIATOR AGENT
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0F0F0F] border border-[#292929] text-xs text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
              >
                <option value="research-agent">research-agent (Tier 1)</option>
                <option value="arbitrage-bot-1">arbitrage-bot-1 (Tier 2)</option>
                <option value="sec-audit-agent">sec-audit-agent (Security)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#141414] border border-[#D85C5C]/40 text-xs text-[#D85C5C] font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
              <span>Error: {error}</span>
            </div>
          )}

          {/* Simulation Preview Result */}
          {simulationResult && (
            <div className="p-4 rounded-lg bg-[#0F0F0F] border border-[#2a2a2a] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                <span className="text-[#F2F0EA] font-bold tracking-wide">
                  SIMULATION RESULT (ZERO-BROADCAST)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] text-[10px]">
                  SIMULATION ONLY
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#B0ADA5]">
                <div>
                  <span className="text-[#716F69]">Projected Spend:</span>{' '}
                  <span className="text-[#F2F0EA] font-bold">
                    {formatUsdc(simulationResult.total_projected_spend)}
                  </span>
                </div>
                <div>
                  <span className="text-[#716F69]">All Steps Approved:</span>{' '}
                  <span className={simulationResult.all_steps_approved ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}>
                    {simulationResult.all_steps_approved ? 'YES' : 'NO'}
                  </span>
                </div>
                <div>
                  <span className="text-[#716F69]">Candidates Evaluated:</span>{' '}
                  <span className="text-[#F2F0EA]">{simulationResult.candidate_count}</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Human Approval:</span>{' '}
                  <span className="text-[#F2F0EA]">
                    {simulationResult.requires_human_approval ? 'REQUIRED' : 'AUTO'}
                  </span>
                </div>
              </div>
              {simulationResult.simulated_steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded bg-[#101010] border border-[#222222] flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[#F2F0EA] font-mono">{st.step_id}</span> ({st.required_capability}) → Selected:{' '}
                    <span className="text-[#F2F0EA] font-semibold">{st.selected_service_id}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[#716F69]">Price: </span>
                    <span className="text-[#F2F0EA] font-bold">{formatUsdc(st.quoted_price)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#222222]">
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
              className="h-9 px-4 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-semibold text-xs tracking-wide transition-colors disabled:opacity-40"
            >
              {isSubmitting ? 'CREATING...' : 'CREATE MISSION'}
            </button>
            <button
              type="button"
              disabled={isSubmitting || !objective.trim()}
              onClick={handleSimulate}
              className="h-9 px-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium border border-[#222222] tracking-wide transition-colors disabled:opacity-40"
            >
              SIMULATE DRY-RUN
            </button>
          </div>
        </form>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#222222]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#F2F0EA]">
            Mission Roster
          </h2>
          <button
            onClick={loadMissions}
            className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
          >
            Refresh Roster
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#716F69] font-mono text-xs">
            Loading autonomous missions...
          </div>
        ) : missions.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-[#101010] border border-[#222222]">
            <p className="text-[#B0ADA5] text-xs">No missions found. Launch an objective above.</p>
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
                      <span className="font-mono text-xs text-[#B0ADA5]">{m.id}</span>
                      <span className="text-[#2D2D2D]">•</span>
                      <span className="font-mono text-xs text-[#716F69]">Agent: {m.agent_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status === 'CREATED' && (
                        <button
                          onClick={() => handleStart(m.id)}
                          className="px-2.5 py-1 rounded bg-[#141414] text-[#F2F0EA] hover:bg-[#222222] text-xs font-mono border border-[#2a2a2a] transition-colors"
                        >
                          Execute Loop
                        </button>
                      )}
                      {!['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXHAUSTED'].includes(m.status) && (
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="px-2.5 py-1 rounded bg-[#141414] text-[#D85C5C] hover:bg-[#222222] text-xs font-mono border border-[#D85C5C]/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/missions/${m.id}`}
                        className="px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-mono border border-[#222222] transition-colors"
                      >
                        Inspect Details →
                      </Link>
                      <Link
                        href={`/trace?mission_id=${m.id}`}
                        className="px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1a1a1a] text-[#B0ADA5] hover:text-[#F2F0EA] text-xs font-mono border border-[#222222] transition-colors"
                      >
                        Flight Trace
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#F2F0EA]">{m.objective}</h3>
                    {m.failure_reason && (
                      <p className="text-xs text-[#D85C5C] mt-1 font-mono">
                        Failure Reason: {m.failure_reason}
                      </p>
                    )}
                  </div>

                  {/* Budget Utilization Meter */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-mono text-[#B0ADA5]">
                      <span>Budget: {formatUsdc(m.budget)}</span>
                      <span>
                        Spent: <span className="text-[#F2F0EA] font-bold">{formatUsdc(m.spent)}</span> ({pctSpent}%)
                      </span>
                      <span>Remaining: {formatUsdc(m.remaining_budget || '0')}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#141414] overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pctSpent > 90
                            ? 'bg-[#D85C5C]'
                            : pctSpent > 60
                            ? 'bg-[#D6A83A]'
                            : 'bg-[#B0ADA5]'
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
