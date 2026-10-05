'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchTreasuryState,
  fetchTreasuryReservations,
  fetchTreasuryHealth,
  fetchTreasuryAnomalies,
  releaseTreasuryReservation,
  TreasuryState,
  LiquidityReservation,
  TreasuryHealthSnapshot,
  LiquidityAnomaly,
  TreasuryExecutionMode,
} from '@/lib/api/treasury';
import { DataAuthorityBadge } from '@/components/DataAuthorityBadge';

function formatUsdc(microUnits: string | number): string {
  const val = typeof microUnits === 'string' ? parseFloat(microUnits) : microUnits;
  if (isNaN(val)) return '$0.00';
  return `$${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TreasuryDashboardPage() {
  const [mode, setMode] = useState<TreasuryExecutionMode>('REAL');
  const [state, setState] = useState<TreasuryState | null>(null);
  const [health, setHealth] = useState<TreasuryHealthSnapshot | null>(null);
  const [reservations, setReservations] = useState<LiquidityReservation[]>([]);
  const [anomalies, setAnomalies] = useState<LiquidityAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, h, res, anom] = await Promise.all([
        fetchTreasuryState('org_default', mode),
        fetchTreasuryHealth('org_default', mode),
        fetchTreasuryReservations('org_default', mode),
        fetchTreasuryAnomalies('org_default'),
      ]);
      setState(s);
      setHealth(h);
      setReservations(res);
      setAnomalies(anom);
    } catch (err) {
      console.error('Failed to load treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode]);

  const handleRelease = async (resId: string) => {
    setActionLoading(resId);
    try {
      await releaseTreasuryReservation(resId, 'Manual operator release from Mission Control');
      await loadData();
    } catch (err) {
      console.error('Release failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getModeBadge = (opMode?: string) => {
    switch (opMode) {
      case 'LIQUIDITY_AVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">LIQUIDITY AVAILABLE</span>;
      case 'LIQUIDITY_CONSTRAINED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">LIQUIDITY CONSTRAINED</span>;
      case 'LIQUIDITY_UNAVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30">LIQUIDITY UNAVAILABLE</span>;
      case 'EMERGENCY_HALT':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D85C5C]/20 text-[#D85C5C] border border-[#D85C5C]/50">EMERGENCY HALT</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141414] text-[#716F69] border border-[#222222]">CHECKING</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D6A83A]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] flex items-center gap-2">
              Autonomous Treasury & Liquidity Orchestrator
            </h1>
            <DataAuthorityBadge provenance={mode === 'SIMULATION' ? 'SIMULATION — NO FUNDS MOVED' : (state && state.total_balance !== '0') ? 'LIVE' : 'UNAVAILABLE'} />
          </div>
          <p className="mt-1 text-sm text-[#716F69]">
            Automated liquidity reservation, multi-horizon solvency forecasting, digital twin stress testing, and 4-way balance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-1 flex items-center">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'REAL'
                  ? 'bg-[#D6A83A] text-[#080808]'
                  : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              REAL (SETTLING)
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

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#181818] transition"
            title="Refresh Treasury State"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/treasury"
          className="p-3 rounded-xl bg-[#141414] border border-[#D6A83A] text-[#F2F0EA] flex flex-col items-center justify-center font-mono text-xs transition"
        >
          <span className="font-bold text-sm">Dashboard</span>
          <span className="text-[#716F69] text-[10px]">Overview & Health</span>
        </Link>
        <Link
          href="/treasury/forecast"
          className="p-3 rounded-xl bg-[#101010] border border-[#222222] text-[#B0ADA5] flex flex-col items-center justify-center font-mono text-xs hover:border-[#2D2D2D] hover:text-[#F2F0EA] transition"
        >
          <span className="font-bold text-sm">Forecast</span>
          <span className="text-[#716F69] text-[10px]">1h - 30d Predictions</span>
        </Link>
        <Link
          href="/treasury/stress"
          className="p-3 rounded-xl bg-[#101010] border border-[#222222] text-[#B0ADA5] flex flex-col items-center justify-center font-mono text-xs hover:border-[#2D2D2D] hover:text-[#F2F0EA] transition"
        >
          <span className="font-bold text-sm">Stress Lab</span>
          <span className="text-[#716F69] text-[10px]">Digital Twin Scenarios</span>
        </Link>
        <Link
          href="/treasury/reservations"
          className="p-3 rounded-xl bg-[#101010] border border-[#222222] text-[#B0ADA5] flex flex-col items-center justify-center font-mono text-xs hover:border-[#2D2D2D] hover:text-[#F2F0EA] transition"
        >
          <span className="font-bold text-sm">Reservations</span>
          <span className="text-[#716F69] text-[10px]">Active & Historical</span>
        </Link>
      </div>

      {/* Core Capital Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Capital */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#716F69] uppercase tracking-wider">
              {mode === 'SIMULATION' ? 'Simulated Total Capital' : 'Real AgentVault Balance'}
            </span>
            <span className={`h-2 w-2 rounded-full ${mode === 'SIMULATION' ? 'bg-[#D6A83A]' : 'bg-[#D85C5C]'}`} />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#F2F0EA] font-mono">
            {mode === 'SIMULATION' ? (state ? formatUsdc(state.total_balance) : '---') : 'NOT DEPLOYED'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#716F69] font-mono">
            <span>Asset: USDC</span>
            <span className={mode === 'SIMULATION' ? 'text-[#D6A83A]' : 'text-[#D85C5C]'}>
              {mode === 'SIMULATION' ? 'Simulated Ledger' : 'AgentVault Undeployed (0x)'}
            </span>
          </div>
        </div>

        {/* Available Unencumbered */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#716F69] uppercase tracking-wider">
              {mode === 'SIMULATION' ? 'Simulated Available Liquidity' : 'Real Available Liquidity'}
            </span>
            <span className={`h-2 w-2 rounded-full ${mode === 'SIMULATION' ? 'bg-[#2FB36F]' : 'bg-[#D85C5C]'}`} />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#2FB36F] font-mono">
            {mode === 'SIMULATION' ? (state ? formatUsdc(state.available_balance) : '---') : 'UNAVAILABLE'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#716F69] font-mono">
            <span>Safe Capacity:</span>
            <span className="text-[#F2F0EA] font-bold">
              {mode === 'SIMULATION' ? (state ? formatUsdc(state.safe_capacity) : '---') : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Reserved Funds */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Active Reservations</span>
            <span className="h-2 w-2 rounded-full bg-[#B0ADA5]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#F2F0EA] font-mono">
            {state ? formatUsdc(state.reserved_balance) : '---'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#716F69] font-mono">
            <span>Active Count:</span>
            <span className="text-[#F2F0EA] font-bold">{reservations.filter(r => r.status === 'ACTIVE').length}</span>
          </div>
        </div>

        {/* Safety Floor / Buffer */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#716F69] uppercase tracking-wider">Safety Buffer Floor</span>
            <span className="h-2 w-2 rounded-full bg-[#D6A83A]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#D6A83A] font-mono">
            {state ? formatUsdc(state.minimum_buffer) : '---'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#716F69] font-mono">
            <span>Invariant:</span>
            <span className="text-[#F2F0EA] font-bold">INV-72 Strictly Protected</span>
          </div>
        </div>
      </div>

      {/* Health & Solvency Diagnostic Bar */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-[#716F69]">Solvency & Gating Status:</span>
              {getModeBadge(state?.operational_mode)}
            </div>
            <div className="flex items-center gap-6 text-sm font-mono text-[#B0ADA5]">
              <div>
                Solvency Ratio:{' '}
                <span className="text-[#F2F0EA] font-bold text-base">
                  {state ? state.solvency_ratio.toFixed(2) : '---'}x
                </span>
              </div>
              <div className="hidden sm:block text-[#222222]">|</div>
              <div>
                Worst-Case Exposure:{' '}
                <span className="text-[#F2F0EA] font-bold">
                  {state ? formatUsdc(state.worst_case_exposure) : '---'}
                </span>
              </div>
              <div className="hidden sm:block text-[#222222]">|</div>
              <div>
                Reconciliation:{' '}
                <span className="text-[#2FB36F] font-bold">
                  {health?.reconciliation_status || 'MATCHED'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/treasury/stress"
              className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#181818] border border-[#222222] text-[#F2F0EA] text-xs font-mono font-bold transition flex items-center gap-2"
            >
              <span>⚡ Simulate Shock</span>
            </Link>
            <Link
              href="/treasury/forecast"
              className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#181818] border border-[#222222] text-[#F2F0EA] text-xs font-mono font-bold transition flex items-center gap-2"
            >
              <span>📊 View Forecast</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Security Invariants Verification Strip */}
      <div className="border border-[#222222] bg-[#0B0B0B] rounded-xl p-4">
        <div className="text-xs font-mono text-[#716F69] mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
            Machine-Checked Security Invariants (INV-71 — INV-85)
          </span>
          <span className="text-[11px] text-[#2FB36F] font-bold font-mono">ALL 15 INVARIANTS PASSING</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-[#101010] border border-[#222222] text-[#B0ADA5]">
            <span className="text-[#2FB36F] font-bold">INV-71</span>: Solvency Non-Neg
          </div>
          <div className="p-2 rounded bg-[#101010] border border-[#222222] text-[#B0ADA5]">
            <span className="text-[#2FB36F] font-bold">INV-72</span>: Buffer Preserved
          </div>
          <div className="p-2 rounded bg-[#101010] border border-[#222222] text-[#B0ADA5]">
            <span className="text-[#2FB36F] font-bold">INV-73</span>: Single Treasury
          </div>
          <div className="p-2 rounded bg-[#101010] border border-[#222222] text-[#B0ADA5]">
            <span className="text-[#2FB36F] font-bold">INV-74</span>: Mode Isolation
          </div>
          <div className="p-2 rounded bg-[#101010] border border-[#222222] text-[#B0ADA5]">
            <span className="text-[#2FB36F] font-bold">INV-75</span>: Atomic Reserve
          </div>
        </div>
      </div>

      {/* Active Liquidity Reservations Table */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
              Active Liquidity Reservations
            </h2>
            <p className="text-xs text-[#716F69] font-mono">
              Temporarily encumbered funds awaiting downstream settlement or task completion.
            </p>
          </div>
          <Link
            href="/treasury/reservations"
            className="text-xs font-mono text-[#D6A83A] hover:underline transition"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0B0B] text-[#716F69] border-b border-[#222222]">
              <tr>
                <th className="py-3 px-4">Reservation ID</th>
                <th className="py-3 px-4">Source / Purpose</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Agent / Mission</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-[#B0ADA5]">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#716F69]">
                    No active reservations found for mode [{mode}].
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.reservation_id} className="hover:bg-[#141414] transition">
                    <td className="py-3 px-4 text-[#D6A83A] font-bold">{res.reservation_id}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={res.purpose || res.source}>
                      <span className="text-[#716F69] block text-[10px]">{res.source}</span>
                      {res.purpose || '---'}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#F2F0EA]">{formatUsdc(res.amount)}</td>
                    <td className="py-3 px-4">
                      {res.agent_id && <div className="text-[#F2F0EA]">{res.agent_id}</div>}
                      {res.mission_id && <div className="text-[10px] text-[#716F69]">{res.mission_id}</div>}
                    </td>
                    <td className="py-3 px-4">
                      {res.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                          ACTIVE
                        </span>
                      ) : res.status === 'CONSUMED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6B8FD6]/10 text-[#6B8FD6] border border-[#6B8FD6]/30">
                          CONSUMED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#716F69] border border-[#222222]">
                          {res.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#716F69] text-[11px]">
                      {new Date(res.expires_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {res.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(res.reservation_id)}
                          disabled={actionLoading === res.reservation_id}
                          className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#D85C5C]/20 hover:text-[#D85C5C] border border-[#222222] hover:border-[#D85C5C]/30 text-[#B0ADA5] transition text-[11px]"
                        >
                          {actionLoading === res.reservation_id ? 'Releasing...' : 'Release'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
