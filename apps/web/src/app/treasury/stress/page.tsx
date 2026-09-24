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
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SAFE (CAPITAL ADEQUATE)</span>;
      case 'CONSTRAINED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">CONSTRAINED (DEFER LOW-PRIORITY)</span>;
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL (BUFFER AT RISK)</span>;
      case 'UNAVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-600/30 text-red-400 border border-red-500/40 animate-pulse">EMERGENCY HALT</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400">TESTING</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/treasury" className="text-xs font-mono text-cyan-400 hover:underline">
              ← Treasury Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-slate-400">Digital Twin Stress Lab</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            Liquidity Stress Testing & Digital Twin Simulation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Adversarial simulation of extreme market perturbations, correlated agent drawdowns, and systemic settlement clusters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'REAL'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              REAL
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SIMULATION
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Stress Parameters Configuration */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-6">
        <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
          <span>⚙️</span> Stress Scenario Calibration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Preset Scenario */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-2">SCENARIO ARCHETYPE</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
              <span className="text-slate-400">CLUSTER MULTIPLIER</span>
              <span className="text-cyan-400 font-bold">{clusterFactor.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={clusterFactor}
              onChange={(e) => setClusterFactor(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1.0x (Normal)</span>
              <span>5.0x (Extreme)</span>
            </div>
          </div>

          {/* Simultaneous Settlements */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400">SIMULTANEOUS SETTLEMENTS</span>
              <span className="text-purple-400 font-bold">{simultaneousSettlements}</span>
            </div>
            <input
              type="number"
              min="1"
              max="100"
              value={simultaneousSettlements}
              onChange={(e) => setSimultaneousSettlements(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Network Stress & Run Trigger */}
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
              <input
                type="checkbox"
                checked={networkStress}
                onChange={(e) => setNetworkStress(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              Inject Network Congestion
            </label>

            <button
              onClick={executeSimulation}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Simulating Perturbations...' : '⚡ Run Stress Simulation'}
            </button>
          </div>
        </div>
      </div>

      {/* Stress Simulation Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Scenario Executed:</span>
                <h3 className="text-lg font-bold text-white font-mono">{result.scenario}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Verdict:</span>
                {getSurvivalBadge(result.survival_state)}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-400">Pre-Stress Balance</div>
                <div className="mt-2 text-xl font-bold text-white font-mono">
                  {formatUsdc(result.pre_stress_balance)}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-mono text-rose-400">Simulated Outflow Shock</div>
                <div className="mt-2 text-xl font-bold text-rose-400 font-mono">
                  -{formatUsdc(result.simulated_shock_outflow)}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-mono text-amber-400">Inflow Haircut Applied</div>
                <div className="mt-2 text-xl font-bold text-amber-400 font-mono">
                  -{formatUsdc(result.simulated_inflow_haircut)}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="text-xs font-mono text-emerald-400">Post-Stress Headroom</div>
                <div className="mt-2 text-xl font-bold text-emerald-400 font-mono">
                  {formatUsdc(result.post_stress_buffer_headroom)}
                </div>
              </div>
            </div>

            {/* Invariant Health & Capital Adequacy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Capital Adequacy Ratio:</span>
                <span className="text-cyan-400 font-bold text-base mt-1 block">
                  {result.capital_adequacy_ratio.toFixed(2)}x
                </span>
                <span className="text-[10px] text-slate-500">Target &gt; 1.50x</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Max Survivable Drawdown:</span>
                <span className="text-purple-400 font-bold text-base mt-1 block">
                  {formatUsdc(result.max_survivable_drawdown)}
                </span>
                <span className="text-[10px] text-slate-500">Absolute Capital Ceiling</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Liquidity Gating Clearance:</span>
                <span className={`font-bold text-base mt-1 block ${result.safe_to_reserve ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.safe_to_reserve ? 'CLEARED FOR RESERVATION' : 'RESERVATIONS RESTRICTED'}
                </span>
                <span className="text-[10px] text-slate-500">Autonomous Gating Policy</span>
              </div>
            </div>

            {/* AI Policy Recommendations */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Orchestrator Strategic Recommendations:
              </h4>
              <div className="space-y-1.5">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">↳</span>
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
