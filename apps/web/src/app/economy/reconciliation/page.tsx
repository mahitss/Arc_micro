'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchReconciliationItems,
  ReconciliationItem,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function ReconciliationCenterPage() {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchReconciliationItems();
        setItems(data);
      } catch (err) {
        console.error('Failed to load reconciliation items:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filterType === 'ALL'
    ? items
    : items.filter(i => i.discrepancy_type === filterType || i.status === filterType);

  const matchedCount = items.filter(i => i.status === 'CONFIRMED').length;
  const investigatingCount = items.filter(i => i.status === 'INVESTIGATING' || i.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-red-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                Task 18 — Reconciliation Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Authoritative Settlement Audit & Blockchain Verification
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic comparison between Expected vs Observed settlement evidence. Zero blind rebroadcast (INV-209).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Control Tower →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Audit Records</div>
          <div className="text-2xl font-bold text-white mt-1">{items.length}</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">{matchedCount} confirmed matched</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Investigations</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{investigatingCount}</div>
          <div className="text-xs text-amber-400 mt-2">Requires verification check</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Blockchain Evidence Gate</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">INV-219 Enforced</div>
          <div className="text-xs text-slate-400 mt-2">Unverified receipts flagged NOT VERIFIED</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rebroadcast Guardrail</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">INV-209 Active</div>
          <div className="text-xs text-slate-400 mt-2">Zero blind duplicate payments</div>
        </div>
      </div>

      {/* Filter and Audit Items */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Reconciliation Audit Trail</h2>
            <p className="text-xs text-slate-400">Strict Expected vs Observed discrepancy analysis with safe recommended recovery action.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            {['ALL', 'CONFIRMED', 'AMBIGUOUS', 'INVESTIGATING', 'UNMATCHED_RECEIPT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  filterType === f
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">Loading reconciliation records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">No reconciliation records matching criteria.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.item_id} className="p-5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-300 text-sm">{item.item_id}</span>
                    <span className="text-xs text-slate-400 font-mono">Discrepancy: {item.discrepancy_type}</span>
                    {item.obligation_id && (
                      <span className="text-xs text-indigo-400 font-mono">Obligation: {item.obligation_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'INVESTIGATING'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Expected</span>
                    <span className="text-white font-bold text-sm">{formatUsdc(item.expected_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Observed</span>
                    <span className="text-cyan-400 font-bold text-sm">{formatUsdc(item.observed_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Difference</span>
                    <span className={`font-bold text-sm ${Number(item.difference) === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formatUsdc(item.difference)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Safe Next Action</span>
                    <span className="text-amber-300 font-bold block">{item.safe_next_action}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-slate-400 gap-2">
                  <div className="flex items-center gap-2">
                    <span>Arc Settlement Evidence:</span>
                    {item.evidence_verified && item.tx_hash ? (
                      <span className="text-emerald-400 truncate max-w-xs">{item.tx_hash}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                        NOT VERIFIED
                      </span>
                    )}
                  </div>
                  {item.notes && <div className="text-slate-400 italic">{item.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
