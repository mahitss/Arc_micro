'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchTreasuryForecast,
  LiquidityForecast,
  TreasuryExecutionMode,
} from '@/lib/api/treasury';

function formatUsdc(microUnits: string | number): string {
  const val = typeof microUnits === 'string' ? parseFloat(microUnits) : microUnits;
  if (isNaN(val)) return '$0.00';
  return `$${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TreasuryForecastPage() {
  const [horizon, setHorizon] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [scenario, setScenario] = useState('BASELINE');
  const [mode, setMode] = useState<TreasuryExecutionMode>('REAL');
  const [forecast, setForecast] = useState<LiquidityForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const data = await fetchTreasuryForecast(horizon, 'org_default', scenario, mode);
      setForecast(data);
    } catch (err) {
      console.error('Failed to load forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [horizon, scenario, mode]);

  const getSurvivalBadge = (state?: string) => {
    switch (state) {
      case 'SAFE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SAFE (SURVIVABLE)</span>;
      case 'CONSTRAINED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">CONSTRAINED</span>;
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case 'UNAVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-600/30 text-red-400 border border-red-500/40">UNAVAILABLE</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-400">UNKNOWN</span>;
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
            <span className="text-xs font-mono text-slate-400">Forecasting Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            Predictive Liquidity Forecasting
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Temporal liquidity simulations across configurable horizons (1h to 30d) with multi-agent perturbation curves.
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

      {/* Control Strip: Horizon & Scenario Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        {/* Horizon Tabs */}
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-2">FORECAST HORIZON</label>
          <div className="flex items-center gap-2">
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition ${
                  horizon === h
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Stress Scenario Selector */}
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-2">STRESS SCENARIO OVERLAY</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="BASELINE">BASELINE (Historic Mean Distribution)</option>
            <option value="OUTFLOW_SPIKE">OUTFLOW SPIKE (+50% Settlement Velocity)</option>
            <option value="INFLOW_DROUGHT">INFLOW DROUGHT (-40% Scheduled Receipts)</option>
            <option value="SETTLEMENT_CLUSTER">SETTLEMENT CLUSTER (Simultaneous Downstream Calls)</option>
            <option value="CORRELATED_AGENT_SURGE">CORRELATED AGENT SURGE (Peak Swarm Demand)</option>
            <option value="HIGH_VOLATILITY">HIGH VOLATILITY (Extreme Tail Risk)</option>
          </select>
        </div>
      </div>

      {/* Forecast Highlights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-slate-400">Starting Balance</div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {forecast ? formatUsdc(forecast.starting_balance) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">Verified Base State</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-emerald-400">Expected Inflows</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            +{forecast ? formatUsdc(forecast.expected_inflows) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">Confidence: 85%-95%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-rose-400">Worst-Case Outflow</div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-mono">
            -{forecast ? formatUsdc(forecast.worst_case_outflows) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">Peak Drawdown Stress</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-cyan-400">Projected Closing</div>
          <div className="mt-2 text-2xl font-bold text-cyan-300 font-mono">
            {forecast ? formatUsdc(forecast.projected_closing_balance) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">Horizon End Target</div>
        </div>
      </div>

      {/* Survival State & Policy Gating Verdict */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-300">
            Survival Assessment: <span className="ml-2">{getSurvivalBadge(forecast?.survival_state)}</span>
          </div>
          <div className="text-sm font-mono text-slate-300">
            Gating Mode: <span className="ml-2 font-bold text-cyan-300">{forecast?.gating_decision || '---'}</span>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Confidence Level: <span className="text-emerald-400 font-bold">{forecast ? `${(forecast.confidence * 100).toFixed(0)}%` : '---'}</span> (Sample: {forecast?.sample_size || 0} runs)
        </div>
      </div>

      {/* Temporal Trajectory Breakdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Temporal Liquidity Trajectory
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Stepped intervals displaying projected available liquidity, commitments, and safety buffers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Time Interval</th>
                <th className="py-3 px-4">Available Liquidity</th>
                <th className="py-3 px-4">Committed Headroom</th>
                <th className="py-3 px-4">Expected Inflow</th>
                <th className="py-3 px-4">Expected Outflow</th>
                <th className="py-3 px-4">Safety Buffer Floor</th>
                <th className="py-3 px-4">Safe Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {forecast?.points.map((pt, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 text-cyan-300 font-bold">
                    {new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{formatUsdc(pt.available_liquidity)}</td>
                  <td className="py-3 px-4 text-purple-300">{formatUsdc(pt.committed_liquidity)}</td>
                  <td className="py-3 px-4 text-emerald-400">+{formatUsdc(pt.expected_inflow)}</td>
                  <td className="py-3 px-4 text-rose-400">-{formatUsdc(pt.expected_outflow)}</td>
                  <td className="py-3 px-4 text-amber-400">{formatUsdc(pt.buffer)}</td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">{formatUsdc(pt.safe_capacity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions & Mathematical Rules */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          Forecast Assumptions & Invariant Guarantees
        </h3>
        <ul className="text-xs font-mono text-slate-400 space-y-1 list-disc list-inside">
          {forecast?.assumptions.map((assump, i) => (
            <li key={i}>{assump}</li>
          ))}
          <li>Deterministic invariant <span className="text-cyan-400">INV-79</span>: Forecasts strictly model worst-case exposure with 0-overdraft tolerance.</li>
          <li>Deterministic invariant <span className="text-cyan-400">INV-80</span>: Temporal forecasts never assume speculative or unverified inflows.</li>
        </ul>
      </div>
    </div>
  );
}
