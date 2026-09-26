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
        return 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30';
      case 'APPROVAL_REQUIRED':
        return 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30';
      case 'WOULD_DENY':
        return 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30';
      case 'INSUFFICIENT_TREASURY':
        return 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30';
      default:
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[#222222]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">Financial Simulation Workbench</h1>
        <p className="text-xs text-[#716F69] mt-1">
          Predict policy decisions, deterministic risk scoring, approval thresholds, and treasury feasibility without broadcasting transactions.
        </p>
      </div>

      {/* Invariant Banner */}
      <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] text-xs">
        <div className="font-semibold text-[#D6A83A] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
          <span>Zero-Balance Mutation Simulation Invariant</span>
        </div>
        <p className="text-[#716F69] mt-1 leading-relaxed">
          Simulations evaluate the authoritative Rust Policy Engine and database spending limits. They strictly never broadcast transactions to the Arc network, create live payment intents, or debit treasury funds.
        </p>
      </div>

      {/* Quick Scenario Presets */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#B0ADA5] uppercase tracking-wider font-mono">Quick Test Scenarios</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setScenario('1.00', 'research-api', 'Low-cost autonomous check')}
            className="p-3 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] text-left transition-colors"
          >
            <div className="text-xs font-bold text-[#2FB36F] font-mono">Scenario 1: Low Cost</div>
            <div className="text-[11px] text-[#716F69] mt-0.5 font-mono">1.00 USDC • Auto-Execution Expected</div>
          </button>

          <button
            type="button"
            onClick={() => setScenario('25.00', 'research-api', 'High-cost autonomous check')}
            className="p-3 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] text-left transition-colors"
          >
            <div className="text-xs font-bold text-[#D6A83A] font-mono">Scenario 2: High Cost</div>
            <div className="text-[11px] text-[#716F69] mt-0.5 font-mono">25.00 USDC • Approval Required Expected</div>
          </button>

          <button
            type="button"
            onClick={() => setScenario('150.00', 'research-api', 'Over-limit autonomous check')}
            className="p-3 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] text-left transition-colors"
          >
            <div className="text-xs font-bold text-[#D85C5C] font-mono">Scenario 3: Over Limit</div>
            <div className="text-[11px] text-[#716F69] mt-0.5 font-mono">150.00 USDC • Policy Denial Expected</div>
          </button>
        </div>
      </div>

      {/* Simulation Form & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Parameters */}
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <h2 className="text-sm font-semibold text-[#F2F0EA]">Simulation Parameters</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#716F69] mb-1 font-mono">Agent ID</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] font-mono focus:border-[#D6A83A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#716F69] mb-1 font-mono">Service</label>
              {services.length > 0 ? (
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] font-mono focus:border-[#D6A83A] focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] font-mono focus:border-[#D6A83A] focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[#716F69] mb-1 font-mono">Amount (USDC)</label>
              <input
                type="number"
                step="0.01"
                value={amountUsdc}
                onChange={(e) => setAmountUsdc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] font-mono focus:border-[#D6A83A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#716F69] mb-1 font-mono">Purpose / Justification</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] focus:border-[#D6A83A] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSimulate()}
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono transition-colors disabled:opacity-50"
            >
              {loading ? 'Evaluating Policy & Treasury...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#F2F0EA] mb-4">Predicted Outcome</h2>

            {error && (
              <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-[#D85C5C] text-xs font-mono">
                {error}
              </div>
            )}

            {!result && !error && (
              <div className="text-xs text-[#716F69] font-mono py-12 text-center">
                Configure parameters and click &quot;Run Simulation&quot; or choose a preset above.
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-xs text-[#716F69] font-mono">Outcome:</span>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${getOutcomeBadge(result.predicted_outcome)}`}>
                    {result.predicted_outcome}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                    <div className="text-[#716F69] text-[10px]">POLICY DECISION</div>
                    <div className="text-[#F2F0EA] font-bold">{result.policy_decision}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                    <div className="text-[#716F69] text-[10px]">RISK SCORING</div>
                    <div className="text-[#F2F0EA] font-bold">{result.risk_level}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                    <div className="text-[#716F69] text-[10px]">APPROVAL REQUIRED</div>
                    <div className={result.approval_required ? 'text-[#D6A83A] font-bold' : 'text-[#2FB36F] font-bold'}>
                      {result.approval_required ? 'YES' : 'NO'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                    <div className="text-[#716F69] text-[10px]">TREASURY FEASIBLE</div>
                    <div className={result.treasury_sufficient ? 'text-[#2FB36F] font-bold' : 'text-[#D85C5C] font-bold'}>
                      {result.treasury_sufficient ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>

                {result.reason && (
                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-xs font-mono text-[#B0ADA5]">
                    <div className="text-[#716F69] text-[10px] mb-1">EVALUATION NOTES</div>
                    {result.reason}
                  </div>
                )}

                <div className="text-[10px] text-[#716F69] font-mono">
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
