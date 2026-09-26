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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/treasury" className="text-xs font-mono text-[#D6A83A] hover:underline">
              ← Treasury Dashboard
            </Link>
            <span className="text-[#222222]">/</span>
            <span className="text-xs font-mono text-[#716F69]">Hierarchical Exposure</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] mt-2 flex items-center gap-2">
            Exposure Graph & Liquidity Envelope
          </h1>
          <p className="mt-1 text-sm text-[#716F69]">
            Multi-tier liquidity commitments, counterparty risk exposure, and scheduled future receivables.
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

      {/* Liquidity Envelope Hierarchy Card */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-sm font-bold font-mono text-[#F2F0EA] uppercase tracking-wider">
              Canonical Liquidity Envelope [Tier Breakdown]
            </h2>
            <p className="text-xs text-[#716F69] font-mono">
              Calculated dynamically via deterministic invariant INV-78.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-[#716F69] block">Solvency Ratio</span>
            <span className="text-lg font-bold text-[#F2F0EA] font-mono">
              {envelope ? envelope.effective_solvency_ratio.toFixed(2) : '---'}x
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">TOTAL CAPITAL</span>
            <span className="text-sm font-bold text-[#F2F0EA] mt-1 block">
              {envelope ? formatUsdc(envelope.total_funds) : '---'}
            </span>
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">CURRENT AVAILABLE</span>
            <span className="text-sm font-bold text-[#2FB36F] mt-1 block">
              {envelope ? formatUsdc(envelope.current_available) : '---'}
            </span>
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">RESERVED FUNDS</span>
            <span className="text-sm font-bold text-[#F2F0EA] mt-1 block">
              {envelope ? formatUsdc(envelope.reserved_funds) : '---'}
            </span>
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">COMMITTED FUNDS</span>
            <span className="text-sm font-bold text-[#F2F0EA] mt-1 block">
              {envelope ? formatUsdc(envelope.committed_funds) : '---'}
            </span>
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">MINIMUM BUFFER</span>
            <span className="text-sm font-bold text-[#D6A83A] mt-1 block">
              {envelope ? formatUsdc(envelope.minimum_buffer) : '---'}
            </span>
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block">SAFE CAPACITY</span>
            <span className="text-sm font-bold text-[#2FB36F] mt-1 block">
              {envelope ? formatUsdc(envelope.safe_commitment_capacity) : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Commitments & Inflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Counterparty Commitments */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222222]">
            <h3 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center justify-between">
              <span>Active Liquidity Commitments ({commitments.length})</span>
              <span className="text-xs text-[#716F69] font-normal">Hard & Soft</span>
            </h3>
          </div>

          <div className="divide-y divide-[#222222] font-mono text-xs">
            {commitments.map((cmt) => (
              <div key={cmt.commitment_id} className="p-4 hover:bg-[#141414] transition space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#D6A83A]">{cmt.commitment_id}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cmt.type === 'HARD'
                        ? 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                        : 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                    }`}
                  >
                    {cmt.type} COMMITMENT
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#716F69]">
                  <span>Counterparty: {cmt.counterparty_id}</span>
                  <span className="text-[#F2F0EA] font-bold">{formatUsdc(cmt.amount)}</span>
                </div>
                <div className="text-[11px] text-[#716F69] flex justify-between">
                  <span>Source: {cmt.source} ({cmt.source_id})</span>
                  <span>Matures: {new Date(cmt.matures_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Inflows Pipeline */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222222]">
            <h3 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center justify-between">
              <span>Expected Future Inflows ({inflows.length})</span>
              <span className="text-xs text-[#716F69] font-normal">Discounted Pipeline</span>
            </h3>
          </div>

          <div className="divide-y divide-[#222222] font-mono text-xs">
            {inflows.map((inf) => (
              <div key={inf.inflow_id} className="p-4 hover:bg-[#141414] transition space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#D6A83A]">{inf.inflow_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                    {(inf.confidence * 100).toFixed(0)}% CONFIDENCE
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#716F69]">
                  <span>Source: {inf.source}</span>
                  <span className="text-[#2FB36F] font-bold">+{formatUsdc(inf.expected_amount)}</span>
                </div>
                <div className="text-[11px] text-[#716F69] flex justify-between">
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
