'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchTreasuryExposure,
  fetchTreasuryCommitments,
  fetchTreasuryInflows,
  LiquidityEnvelope,
  LiquidityCommitment,
  ExpectedInflow,
  TreasuryExecutionMode,
} from '@/lib/api/treasury';

function formatUsdc(microUnits: string | number): string {
  const val = typeof microUnits === 'string' ? parseFloat(microUnits) : microUnits;
  if (isNaN(val)) return '$0.00';
  return `$${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TreasuryExposurePage() {
  const [mode, setMode] = useState<TreasuryExecutionMode>('REAL');
  const [envelope, setEnvelope] = useState<LiquidityEnvelope | null>(null);
  const [commitments, setCommitments] = useState<LiquidityCommitment[]>([]);
  const [inflows, setInflows] = useState<ExpectedInflow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [env, cmt, inf] = await Promise.all([
        fetchTreasuryExposure('org_default', mode),
        fetchTreasuryCommitments('org_default'),
        fetchTreasuryInflows('org_default', mode),
      ]);
      setEnvelope(env);
      setCommitments(cmt);
      setInflows(inf);
    } catch (err) {
      console.error('Failed to load exposure data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode]);

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
            <span className="text-xs font-mono text-slate-400">Hierarchical Exposure</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            Exposure Graph & Liquidity Envelope
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Multi-tier liquidity commitments, counterparty risk exposure, and scheduled future receivables.
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

      {/* Liquidity Envelope Hierarchy Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Canonical Liquidity Envelope [Tier Breakdown]
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Calculated dynamically via deterministic invariant INV-78.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-slate-400 block">Solvency Ratio</span>
            <span className="text-lg font-bold text-cyan-400 font-mono">
              {envelope ? envelope.effective_solvency_ratio.toFixed(2) : '---'}x
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">TOTAL CAPITAL</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {envelope ? formatUsdc(envelope.total_funds) : '---'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-emerald-400 block">CURRENT AVAILABLE</span>
            <span className="text-sm font-bold text-emerald-300 mt-1 block">
              {envelope ? formatUsdc(envelope.current_available) : '---'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-purple-400 block">RESERVED FUNDS</span>
            <span className="text-sm font-bold text-purple-300 mt-1 block">
              {envelope ? formatUsdc(envelope.reserved_funds) : '---'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-cyan-400 block">COMMITTED FUNDS</span>
            <span className="text-sm font-bold text-cyan-300 mt-1 block">
              {envelope ? formatUsdc(envelope.committed_funds) : '---'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-amber-400 block">MINIMUM BUFFER</span>
            <span className="text-sm font-bold text-amber-300 mt-1 block">
              {envelope ? formatUsdc(envelope.minimum_buffer) : '---'}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-emerald-400 block">SAFE CAPACITY</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">
              {envelope ? formatUsdc(envelope.safe_commitment_capacity) : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Commitments & Inflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Counterparty Commitments */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono text-white flex items-center justify-between">
              <span>Active Liquidity Commitments ({commitments.length})</span>
              <span className="text-xs text-cyan-400 font-normal">Hard & Soft</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {commitments.map((cmt) => (
              <div key={cmt.commitment_id} className="p-4 hover:bg-slate-800/20 transition space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{cmt.commitment_id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cmt.type === 'HARD'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {cmt.type} COMMITMENT
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Counterparty: {cmt.counterparty_id}</span>
                  <span className="text-white font-bold">{formatUsdc(cmt.amount)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Source: {cmt.source} ({cmt.source_id})</span>
                  <span>Matures: {new Date(cmt.matures_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Inflows Pipeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-sm font-bold font-mono text-white flex items-center justify-between">
              <span>Expected Future Inflows ({inflows.length})</span>
              <span className="text-xs text-emerald-400 font-normal">Discounted Pipeline</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {inflows.map((inf) => (
              <div key={inf.inflow_id} className="p-4 hover:bg-slate-800/20 transition space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{inf.inflow_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {(inf.confidence * 100).toFixed(0)}% CONFIDENCE
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Source: {inf.source}</span>
                  <span className="text-emerald-400 font-bold">+{formatUsdc(inf.expected_amount)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Expected: {new Date(inf.expected_at).toLocaleDateString()}</span>
                  <span>Status: {inf.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
