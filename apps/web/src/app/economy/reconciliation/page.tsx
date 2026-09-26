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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase font-mono">
                Audit & Reconciliation Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Authoritative Settlement Audit & Blockchain Verification
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Deterministic comparison between Expected vs Observed settlement evidence. Zero blind rebroadcast (INV-209).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-semibold font-mono rounded-lg border border-[#222222] transition-colors"
            >
              Control Tower →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Total Audit Records</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{items.length}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">{matchedCount} confirmed matched</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Active Investigations</div>
          <div className="text-2xl font-bold text-[#D6A83A] mt-1 font-mono">{investigatingCount}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Requires verification check</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Blockchain Evidence Gate</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">INV-219 Enforced</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Unverified receipts flagged NOT VERIFIED</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Rebroadcast Guardrail</div>
          <div className="text-2xl font-bold text-[#2FB36F] mt-1 font-mono">INV-209 Active</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Zero blind duplicate payments</div>
        </div>
      </div>

      {/* Filter and Audit Items */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F2F0EA]">Reconciliation Audit Trail</h2>
            <p className="text-xs text-[#716F69]">Strict Expected vs Observed discrepancy analysis with safe recommended recovery action.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#716F69] font-mono">Filter:</span>
            {['ALL', 'CONFIRMED', 'AMBIGUOUS', 'INVESTIGATING', 'UNMATCHED_RECEIPT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  filterType === f
                    ? 'bg-[#D6A83A] text-[#080808] font-bold'
                    : 'bg-[#141414] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">Loading reconciliation records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">No reconciliation records matching criteria.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.item_id} className="p-5 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#D6A83A] text-sm">{item.item_id}</span>
                    <span className="text-xs text-[#716F69] font-mono">Discrepancy: {item.discrepancy_type}</span>
                    {item.obligation_id && (
                      <span className="text-xs text-[#B0ADA5] font-mono">Obligation: {item.obligation_id}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        item.status === 'CONFIRMED'
                          ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                          : item.status === 'INVESTIGATING'
                          ? 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                          : 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-[#101010] border border-[#222222] rounded-lg text-xs font-mono">
                  <div>
                    <span className="text-[#716F69] block uppercase text-[10px]">Expected</span>
                    <span className="text-[#F2F0EA] font-bold text-sm">{formatUsdc(item.expected_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block uppercase text-[10px]">Observed</span>
                    <span className="text-[#B0ADA5] font-bold text-sm">{formatUsdc(item.observed_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block uppercase text-[10px]">Difference</span>
                    <span className={`font-bold text-sm ${Number(item.difference) === 0 ? 'text-[#2FB36F]' : 'text-[#D6A83A]'}`}>
                      {formatUsdc(item.difference)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block uppercase text-[10px]">Safe Next Action</span>
                    <span className="text-[#D6A83A] font-bold block">{item.safe_next_action}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-[#716F69] gap-2">
                  <div className="flex items-center gap-2">
                    <span>Arc Settlement Evidence:</span>
                    {item.evidence_verified && item.tx_hash ? (
                      <span className="text-[#2FB36F] truncate max-w-xs">{item.tx_hash}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#141414] text-[#716F69] border border-[#222222] font-bold">
                        NOT VERIFIED
                      </span>
                    )}
                  </div>
                  {item.notes && <div className="text-[#716F69] italic">{item.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
