'use client';

import React, { useState, useEffect } from 'react';
import { runSimulation, fetchServices } from '../../lib/api/services';
import { RegisteredService, SimulationResponse } from '../../lib/api/types';

export default function SimulationsPage() {
  const [services, setServices] = useState<RegisteredService[]>([]);
  const [agentId, setAgentId] = useState('agent_research_01');
  const [selectedServiceId, setSelectedServiceId] = useState('research-api');
  const [amountUsdc, setAmountUsdc] = useState('2.50');
  const [purpose, setPurpose] = useState('Autonomous market research telemetry');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices().then((res) => {
      if (res && res.length > 0) {
        setServices(res);
        setSelectedServiceId(res[0].id);
      }
    }).catch(() => {
      // Fallback
    });
  }, []);

  const handleSimulate = async (customAmount?: string, customService?: string) => {
    setLoading(true);
    setError(null);

    const amtStr = customAmount || amountUsdc;
    const svcStr = customService || selectedServiceId;
    const baseUnits = Math.round(parseFloat(amtStr || '0') * 1e6).toString();

    try {
      const res = await runSimulation({
        agent_id: agentId,
        service_id: svcStr,
        amount: baseUnits,
        purpose,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const setScenario = (amount: string, svc?: string, desc?: string) => {
    setAmountUsdc(amount);
    if (svc) setSelectedServiceId(svc);
    if (desc) setPurpose(desc);
    handleSimulate(amount, svc);
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'WOULD_EXECUTE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'APPROVAL_REQUIRED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'WOULD_DENY':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'INSUFFICIENT_TREASURY':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-white">Financial Simulation Workbench</h1>
        <p className="text-xs text-slate-400 mt-1">
          Predict policy decisions, deterministic risk scoring, approval thresholds, and treasury feasibility without broadcasting transactions.
        </p>
      </div>

      {/* Invariant Banner */}
      <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs">
        <div className="font-semibold text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Zero-Balance Mutation Simulation Invariant</span>
        </div>
        <p className="text-slate-400 mt-1 leading-relaxed">
          Simulations evaluate the authoritative Rust Policy Engine and database spending limits. They strictly never broadcast transactions to the Arc network, create live payment intents, or debit treasury funds.
        </p>
      </div>

      {/* Quick Scenario Presets */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Quick Test Scenarios</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setScenario('1.00', 'research-api', 'Low-cost autonomous check')}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 text-left transition-colors"
          >
            <div className="text-xs font-bold text-emerald-400">Scenario 1: Low Cost</div>
            <div className="text-[11px] text-slate-400 mt-0.5">1.00 USDC • Auto-Execution Expected</div>
          </button>

          <button
            type="button"
            onClick={() => setScenario('25.00', 'research-api', 'High-cost autonomous check')}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 text-left transition-colors"
          >
            <div className="text-xs font-bold text-amber-400">Scenario 2: High Cost</div>
            <div className="text-[11px] text-slate-400 mt-0.5">25.00 USDC • Approval Required Expected</div>
          </button>

          <button
            type="button"
            onClick={() => setScenario('150.00', 'research-api', 'Over-limit autonomous check')}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 text-left transition-colors"
          >
            <div className="text-xs font-bold text-rose-400">Scenario 3: Over Limit</div>
            <div className="text-[11px] text-slate-400 mt-0.5">150.00 USDC • Policy Denial Expected</div>
          </button>
        </div>
      </div>

      {/* Simulation Form & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Parameters */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-white">Simulation Parameters</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Agent ID</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Service</label>
              {services.length > 0 ? (
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-teal-500 focus:outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.name})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Amount (USDC)</label>
              <input
                type="number"
                step="0.01"
                value={amountUsdc}
                onChange={(e) => setAmountUsdc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Purpose / Justification</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSimulate()}
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Evaluating Policy & Treasury...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white mb-4">Predicted Outcome</h2>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {error}
              </div>
            )}

            {!result && !error && (
              <div className="text-xs text-slate-500 py-12 text-center">
                Configure parameters and click &quot;Run Simulation&quot; or choose a preset above.
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400">Outcome:</span>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getOutcomeBadge(result.predicted_outcome)}`}>
                    {result.predicted_outcome}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 space-y-1">
                    <div className="text-slate-500 text-[10px]">POLICY DECISION</div>
                    <div className="text-white font-bold">{result.policy_decision}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 space-y-1">
                    <div className="text-slate-500 text-[10px]">RISK SCORING</div>
                    <div className="text-teal-300 font-bold">{result.risk_level}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 space-y-1">
                    <div className="text-slate-500 text-[10px]">APPROVAL REQUIRED</div>
                    <div className={result.approval_required ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {result.approval_required ? 'YES' : 'NO'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 space-y-1">
                    <div className="text-slate-500 text-[10px]">TREASURY FEASIBLE</div>
                    <div className={result.treasury_sufficient ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {result.treasury_sufficient ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>

                {result.reason && (
                  <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs font-mono text-slate-300">
                    <div className="text-slate-500 text-[10px] mb-1">EVALUATION NOTES</div>
                    {result.reason}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 font-mono">
                  Simulation ID: {result.simulation_id} • {new Date(result.evaluated_at).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
