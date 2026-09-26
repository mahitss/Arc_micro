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
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">SAFE (SURVIVABLE)</span>;
      case 'CONSTRAINED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">CONSTRAINED</span>;
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30">CRITICAL</span>;
      case 'UNAVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/20 text-[#D85C5C] border border-[#D85C5C]/50">UNAVAILABLE</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141414] text-[#716F69] border border-[#222222]">UNKNOWN</span>;
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
            <span className="text-xs font-mono text-[#716F69]">Forecasting Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] mt-2 flex items-center gap-2">
            Predictive Liquidity Forecasting
          </h1>
          <p className="mt-1 text-sm text-[#716F69]">
            Temporal liquidity simulations across configurable horizons (1h to 30d) with multi-agent perturbation curves.
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

      {/* Control Strip: Horizon & Scenario Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#101010] border border-[#222222] rounded-xl p-4">
        {/* Horizon Tabs */}
        <div>
          <label className="text-xs font-mono text-[#716F69] block mb-2">FORECAST HORIZON</label>
          <div className="flex items-center gap-2">
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition ${
                  horizon === h
                    ? 'bg-[#D6A83A] text-[#080808]'
                    : 'bg-[#0B0B0B] border border-[#222222] text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Stress Scenario Selector */}
        <div>
          <label className="text-xs font-mono text-[#716F69] block mb-2">STRESS SCENARIO OVERLAY</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg py-2 px-3 text-xs font-mono text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
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
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-mono text-[#716F69]">Starting Balance</div>
          <div className="mt-2 text-2xl font-bold text-[#F2F0EA] font-mono">
            {forecast ? formatUsdc(forecast.starting_balance) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-[#716F69] font-mono">Verified Base State</div>
        </div>

        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-mono text-[#2FB36F]">Expected Inflows</div>
          <div className="mt-2 text-2xl font-bold text-[#2FB36F] font-mono">
            +{forecast ? formatUsdc(forecast.expected_inflows) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-[#716F69] font-mono">Confidence: 85%-95%</div>
        </div>

        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-mono text-[#D85C5C]">Worst-Case Outflow</div>
          <div className="mt-2 text-2xl font-bold text-[#D85C5C] font-mono">
            -{forecast ? formatUsdc(forecast.worst_case_outflows) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-[#716F69] font-mono">Peak Drawdown Stress</div>
        </div>

        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-mono text-[#B0ADA5]">Projected Closing</div>
          <div className="mt-2 text-2xl font-bold text-[#F2F0EA] font-mono">
            {forecast ? formatUsdc(forecast.projected_closing_balance) : '---'}
          </div>
          <div className="mt-1 text-[11px] text-[#716F69] font-mono">Horizon End Target</div>
        </div>
      </div>

      {/* Survival State & Policy Gating Verdict */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-[#B0ADA5]">
            Survival Assessment: <span className="ml-2">{getSurvivalBadge(forecast?.survival_state)}</span>
          </div>
          <div className="text-sm font-mono text-[#B0ADA5]">
            Gating Mode: <span className="ml-2 font-bold text-[#D6A83A]">{forecast?.gating_decision || '---'}</span>
          </div>
        </div>
        <div className="text-xs font-mono text-[#716F69]">
          Confidence Level: <span className="text-[#2FB36F] font-bold">{forecast ? `${(forecast.confidence * 100).toFixed(0)}%` : '---'}</span> (Sample: {forecast?.sample_size || 0} runs)
        </div>
      </div>

      {/* Temporal Trajectory Breakdown */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222222]">
          <h2 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
            Temporal Liquidity Trajectory
          </h2>
          <p className="text-xs text-[#716F69] font-mono">
            Stepped intervals displaying projected available liquidity, commitments, and safety buffers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0B0B] text-[#716F69] border-b border-[#222222]">
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
            <tbody className="divide-y divide-[#222222] text-[#B0ADA5]">
              {forecast?.points.map((pt, idx) => (
                <tr key={idx} className="hover:bg-[#141414] transition">
                  <td className="py-3 px-4 text-[#D6A83A] font-bold">
                    {new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#F2F0EA]">{formatUsdc(pt.available_liquidity)}</td>
                  <td className="py-3 px-4 text-[#B0ADA5]">{formatUsdc(pt.committed_liquidity)}</td>
                  <td className="py-3 px-4 text-[#2FB36F]">+{formatUsdc(pt.expected_inflow)}</td>
                  <td className="py-3 px-4 text-[#D85C5C]">-{formatUsdc(pt.expected_outflow)}</td>
                  <td className="py-3 px-4 text-[#D6A83A]">{formatUsdc(pt.buffer)}</td>
                  <td className="py-3 px-4 text-[#2FB36F] font-bold">{formatUsdc(pt.safe_capacity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assumptions & Mathematical Rules */}
      <div className="bg-[#0B0B0B] border border-[#222222] rounded-xl p-5 space-y-2">
        <h3 className="text-xs font-mono font-bold text-[#B0ADA5] uppercase tracking-wider">
          Forecast Assumptions & Invariant Guarantees
        </h3>
        <ul className="text-xs font-mono text-[#716F69] space-y-1 list-disc list-inside">
          {forecast?.assumptions.map((assump, i) => (
            <li key={i}>{assump}</li>
          ))}
          <li>Deterministic invariant <span className="text-[#D6A83A]">INV-79</span>: Forecasts strictly model worst-case exposure with 0-overdraft tolerance.</li>
          <li>Deterministic invariant <span className="text-[#D6A83A]">INV-80</span>: Temporal forecasts never assume speculative or unverified inflows.</li>
        </ul>
      </div>
    </div>
  );
}
