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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase font-mono">
                Autonomous Settlement Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Scheduled Settlement Batches & Atomicity Control
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Batch window routing subordinate to policy, risk, and treasury. Strict partial settlement isolation (INV-208).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/reconciliation"
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold font-mono rounded-lg transition-colors"
            >
              Reconciliation Center →
            </Link>
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-semibold font-mono rounded-lg border border-[#222222] transition-colors"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Settlement Batches</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{batches.length}</div>
          <div className="text-xs text-[#B0ADA5] mt-2 font-mono">Aggregated execution pipelines</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Gross Coordinated</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{formatUsdc(String(totalGross))}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Before cycle netting</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Net Settled on Chain</div>
          <div className="text-2xl font-bold text-[#2FB36F] mt-1 font-mono">{formatUsdc(String(totalNet))}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Real USDC moved</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Total Capital Efficiency</div>
          <div className="text-2xl font-bold text-[#D6A83A] mt-1 font-mono">{formatUsdc(String(totalSavings))}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Zero-balance savings achieved</div>
        </div>
      </div>

      {/* Filter and Batches List */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F2F0EA]">Settlement Batch Queue</h2>
            <p className="text-xs text-[#716F69]">Strict atomicity: partial batch outcomes never overwrite individual obligation states.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#716F69] font-mono">Status:</span>
            {['ALL', 'SETTLED', 'AWAITING_APPROVAL', 'SUBMITTING', 'PARTIALLY_SETTLED', 'FAILED', 'RECONCILING'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-[#D6A83A] text-[#080808] font-bold'
                    : 'bg-[#141414] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">Loading settlement telemetry...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">No settlement batches found.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((batch) => (
              <div key={batch.batch_id} className="p-5 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#D6A83A] text-sm">{batch.batch_id}</span>
                    <span className="text-xs text-[#716F69] font-mono">Window: {batch.settlement_window}</span>
                    <span className="text-xs text-[#716F69] font-mono">{batch.obligations.length} obligation(s)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        batch.status === 'SETTLED'
                          ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                          : batch.status === 'PARTIALLY_SETTLED'
                          ? 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                          : batch.status === 'FAILED'
                          ? 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                          : 'bg-[#6B8FD6]/10 text-[#6B8FD6] border border-[#6B8FD6]/30'
                      }`}
                    >
                      {batch.status}
                    </span>
                    <Link
                      href={`/control/economy/settlements/${batch.batch_id}`}
                      className="text-xs font-mono text-[#D6A83A] hover:underline"
                    >
                      Batch Detail →
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[#716F69] block">Gross Amount</span>
                    <span className="text-[#F2F0EA] font-bold">{formatUsdc(batch.gross_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block">Net Amount</span>
                    <span className="text-[#2FB36F] font-bold">{formatUsdc(batch.net_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block">Savings</span>
                    <span className="text-[#D6A83A] font-bold">{formatUsdc(batch.savings)}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69] block">Created At</span>
                    <span className="text-[#716F69]">{batch.created_at ? new Date(batch.created_at).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>

                {batch.items && batch.items.length > 0 && (
                  <div className="bg-[#101010] border border-[#222222] rounded p-3 text-xs font-mono space-y-2">
                    <div className="text-[10px] text-[#716F69] uppercase tracking-wider">Batch Item Outcomes:</div>
                    <div className="divide-y divide-[#222222]">
                      {batch.items.map((item) => (
                        <div key={item.item_id} className="py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-[#B0ADA5]">
                            {item.obligation_id} ({item.payer_id} → {item.payee_id})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#2FB36F] font-bold">{formatUsdc(item.amount)}</span>
                            <span className="text-[#716F69]">Intent: {item.payment_intent_id || 'PENDING'}</span>
                            <span className="text-[#2FB36F] font-semibold">{item.status}</span>
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
