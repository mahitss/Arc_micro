'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  runTreasuryStress,
  LiquidityStressResult,
  TreasuryExecutionMode,
} from '@/lib/api/treasury';

function formatUsdc(microUnits: string | number): string {
  const val = typeof microUnits === 'string' ? parseFloat(microUnits) : microUnits;
  if (isNaN(val)) return '$0.00';
  return `$${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TreasuryStressPage() {
  const [scenario, setScenario] = useState('OUTFLOW_SPIKE');
  const [clusterFactor, setClusterFactor] = useState(2.0);
  const [simultaneousSettlements, setSimultaneousSettlements] = useState(15);
  const [networkStress, setNetworkStress] = useState(false);
  const [mode, setMode] = useState<TreasuryExecutionMode>('REAL');
  const [result, setResult] = useState<LiquidityStressResult | null>(null);
  const [loading, setLoading] = useState(false);

  const executeSimulation = async () => {
    setLoading(true);
    try {
      const data = await runTreasuryStress({
        scenario,
        cluster_factor: clusterFactor,
        simultaneous_settlements: simultaneousSettlements,
        network_stress: networkStress,
        organization_id: 'org_default',
        mode,
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to run stress simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSimulation();
  }, [scenario, mode]);

  const getSurvivalBadge = (state?: string) => {
    switch (state) {
      case 'SAFE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">SAFE (CAPITAL ADEQUATE)</span>;
      case 'CONSTRAINED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">CONSTRAINED (DEFER LOW-PRIORITY)</span>;
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30">CRITICAL (BUFFER AT RISK)</span>;
      case 'UNAVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/20 text-[#D85C5C] border border-[#D85C5C]/50">EMERGENCY HALT</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141414] text-[#716F69] border border-[#222222]">TESTING</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/treasury" className="text-xs font-mono text-[#D6A83A] hover:underline">
              ← Treasury Dashboard
            </Link>
            <span className="text-[#222222]">/</span>
            <span className="text-xs font-mono text-[#716F69]">Digital Twin Stress Lab</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] mt-2 flex items-center gap-2">
            Liquidity Stress Testing & Digital Twin Simulation
          </h1>
          <p className="mt-1 text-sm text-[#716F69]">
            Adversarial simulation of extreme market perturbations, correlated agent drawdowns, and systemic settlement clusters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-1 flex items-center">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'REAL'
                  ? 'bg-[#D6A83A] text-[#080808]'
                  : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              REAL
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-[#F2F0EA] text-[#080808]'
                  : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              SIMULATION
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Stress Parameters Configuration */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-bold font-mono text-[#F2F0EA] uppercase tracking-wider flex items-center gap-2">
          <span>⚙️</span> Stress Scenario Calibration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Preset Scenario */}
          <div>
            <label className="text-xs font-mono text-[#716F69] block mb-2">SCENARIO ARCHETYPE</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg py-2.5 px-3 text-xs font-mono text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
            >
              <option value="OUTFLOW_SPIKE">OUTFLOW SPIKE (Sudden Surge)</option>
              <option value="INFLOW_DROUGHT">INFLOW DROUGHT (0 Receivables)</option>
              <option value="SETTLEMENT_CLUSTER">SETTLEMENT CLUSTER (Concurrent Calls)</option>
              <option value="CORRELATED_AGENT_SURGE">CORRELATED SWARM DEMAND</option>
              <option value="CASCADE_FAILURE">CASCADE FAILURE (Severe Domino)</option>
              <option value="BLACK_SWAN">BLACK SWAN (Tail Risk Maxima)</option>
            </select>
          </div>

          {/* Cluster Factor Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-[#716F69]">CLUSTER MULTIPLIER</span>
              <span className="text-[#D6A83A] font-bold">{clusterFactor.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={clusterFactor}
              onChange={(e) => setClusterFactor(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#0B0B0B] rounded-lg appearance-none cursor-pointer accent-[#D6A83A]"
            />
            <div className="flex justify-between text-[10px] text-[#716F69] font-mono mt-1">
              <span>1.0x (Normal)</span>
              <span>5.0x (Extreme)</span>
            </div>
          </div>

          {/* Simultaneous Settlements */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-[#716F69]">SIMULTANEOUS SETTLEMENTS</span>
              <span className="text-[#F2F0EA] font-bold">{simultaneousSettlements}</span>
            </div>
            <input
              type="number"
              min="1"
              max="100"
              value={simultaneousSettlements}
              onChange={(e) => setSimultaneousSettlements(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg py-2 px-3 text-xs font-mono text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
            />
          </div>

          {/* Network Stress & Run Trigger */}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-[#B0ADA5]">
              <input
                type="checkbox"
                checked={networkStress}
                onChange={(e) => setNetworkStress(e.target.checked)}
                className="rounded bg-[#0B0B0B] border-[#222222] text-[#D6A83A] focus:ring-0"
              />
              Inject Network Congestion
            </label>

            <button
              onClick={executeSimulation}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-bold text-xs transition disabled:opacity-50"
            >
              {loading ? 'Simulating Perturbations...' : '⚡ Run Stress Simulation'}
            </button>
          </div>
        </div>
      </div>

      {/* Stress Simulation Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <span className="text-xs font-mono text-[#716F69] uppercase">Scenario Executed:</span>
                <h3 className="text-lg font-bold text-[#F2F0EA] font-mono">{result.scenario}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#716F69]">Verdict:</span>
                {getSurvivalBadge(result.survival_state)}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
                <div className="text-xs font-mono text-[#716F69]">Pre-Stress Balance</div>
                <div className="mt-2 text-xl font-bold text-[#F2F0EA] font-mono">
                  {formatUsdc(result.pre_stress_balance)}
                </div>
              </div>

              <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
                <div className="text-xs font-mono text-[#D85C5C]">Simulated Outflow Shock</div>
                <div className="mt-2 text-xl font-bold text-[#D85C5C] font-mono">
                  -{formatUsdc(result.simulated_shock_outflow)}
                </div>
              </div>

              <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
                <div className="text-xs font-mono text-[#D6A83A]">Inflow Haircut Applied</div>
                <div className="mt-2 text-xl font-bold text-[#D6A83A] font-mono">
                  -{formatUsdc(result.simulated_inflow_haircut)}
                </div>
              </div>

              <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
                <div className="text-xs font-mono text-[#2FB36F]">Post-Stress Headroom</div>
                <div className="mt-2 text-xl font-bold text-[#2FB36F] font-mono">
                  {formatUsdc(result.post_stress_buffer_headroom)}
                </div>
              </div>
            </div>

            {/* Invariant Health & Capital Adequacy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#222222] pt-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block">Capital Adequacy Ratio:</span>
                <span className="text-[#F2F0EA] font-bold text-base mt-1 block">
                  {result.capital_adequacy_ratio.toFixed(2)}x
                </span>
                <span className="text-[10px] text-[#716F69]">Target &gt; 1.50x</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block">Max Survivable Drawdown:</span>
                <span className="text-[#F2F0EA] font-bold text-base mt-1 block">
                  {formatUsdc(result.max_survivable_drawdown)}
                </span>
                <span className="text-[10px] text-[#716F69]">Absolute Capital Ceiling</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block">Liquidity Gating Clearance:</span>
                <span className={`font-bold text-base mt-1 block ${result.safe_to_reserve ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}`}>
                  {result.safe_to_reserve ? 'CLEARED FOR RESERVATION' : 'RESERVATIONS RESTRICTED'}
                </span>
                <span className="text-[10px] text-[#716F69]">Autonomous Gating Policy</span>
              </div>
            </div>

            {/* AI Policy Recommendations */}
            <div className="space-y-2 border-t border-[#222222] pt-4">
              <h4 className="text-xs font-mono font-bold text-[#B0ADA5] uppercase tracking-wider">
                Orchestrator Strategic Recommendations:
              </h4>
              <div className="space-y-1.5">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-xs font-mono text-[#B0ADA5] flex items-start gap-2">
                    <span className="text-[#D6A83A] mt-0.5">↳</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
