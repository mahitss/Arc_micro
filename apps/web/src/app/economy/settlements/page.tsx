'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchSettlementBatches,
  SettlementBatch,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function SettlementCenterPage() {
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSettlementBatches();
        setBatches(data);
      } catch (err) {
        console.error('Failed to load settlement batches:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = statusFilter === 'ALL'
    ? batches
    : batches.filter(b => b.status === statusFilter);

  const totalGross = batches.reduce((sum, b) => sum + Number(b.gross_amount || 0), 0);
  const totalNet = batches.reduce((sum, b) => sum + Number(b.net_amount || 0), 0);
  const totalSavings = batches.reduce((sum, b) => sum + Number(b.savings || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-[#a3a3a3] uppercase font-mono">
                Autonomous Settlement Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Scheduled Settlement Batches & Atomicity Control
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Batch window routing subordinate to policy, risk, and treasury. Strict partial settlement isolation (INV-208).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/reconciliation"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-purple-600/20"
            >
              Reconciliation Center →
            </Link>
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Settlement Batches</div>
          <div className="text-2xl font-bold text-white mt-1">{batches.length}</div>
          <div className="text-xs text-purple-400 mt-2 font-mono">Aggregated execution pipelines</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Coordinated</div>
          <div className="text-2xl font-bold text-slate-200 mt-1 font-mono">{formatUsdc(String(totalGross))}</div>
          <div className="text-xs text-slate-400 mt-2">Before cycle netting</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Settled on Chain</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatUsdc(String(totalNet))}</div>
          <div className="text-xs text-emerald-400 mt-2">Real USDC moved</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Capital Efficiency</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{formatUsdc(String(totalSavings))}</div>
          <div className="text-xs text-cyan-400 mt-2">Zero-balance savings achieved</div>
        </div>
      </div>

      {/* Filter and Batches List */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Settlement Batch Queue</h2>
            <p className="text-xs text-slate-400">Strict atomicity: partial batch outcomes never overwrite individual obligation states.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            {['ALL', 'SETTLED', 'AWAITING_APPROVAL', 'SUBMITTING', 'PARTIALLY_SETTLED', 'FAILED', 'RECONCILING'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">Loading settlement telemetry...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">No settlement batches found.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((batch) => (
              <div key={batch.batch_id} className="p-5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-purple-300 text-sm">{batch.batch_id}</span>
                    <span className="text-xs text-slate-400 font-mono">Window: {batch.settlement_window}</span>
                    <span className="text-xs text-slate-500 font-mono">{batch.obligations.length} obligation(s)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        batch.status === 'SETTLED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : batch.status === 'PARTIALLY_SETTLED'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : batch.status === 'FAILED'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {batch.status}
                    </span>
                    <Link
                      href={`/control/economy/settlements/${batch.batch_id}`}
                      className="text-xs font-mono text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      Batch Detail →
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Gross Amount</span>
                    <span className="text-white font-bold">{formatUsdc(batch.gross_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Net Amount</span>
                    <span className="text-emerald-400 font-bold">{formatUsdc(batch.net_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Savings</span>
                    <span className="text-cyan-400 font-bold">{formatUsdc(batch.savings)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Created At</span>
                    <span className="text-slate-400">{batch.created_at ? new Date(batch.created_at).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>

                {batch.items && batch.items.length > 0 && (
                  <div className="bg-slate-900/80 rounded p-3 text-xs font-mono space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Batch Item Outcomes:</div>
                    <div className="divide-y divide-slate-800">
                      {batch.items.map((item) => (
                        <div key={item.item_id} className="py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-slate-300">
                            {item.obligation_id} ({item.payer_id} → {item.payee_id})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold">{formatUsdc(item.amount)}</span>
                            <span className="text-slate-400">Intent: {item.payment_intent_id || 'PENDING'}</span>
                            <span className="text-emerald-400 font-semibold">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
