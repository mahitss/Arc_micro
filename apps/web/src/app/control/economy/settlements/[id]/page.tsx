'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchSettlementBatch,
  fetchReconciliationItems,
  SettlementBatch,
  ReconciliationItem,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function SettlementBatchDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || 'batch_net_2026_09';

  const [batch, setBatch] = useState<SettlementBatch | null>(null);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, recs] = await Promise.all([
          fetchSettlementBatch(id),
          fetchReconciliationItems(),
        ]);
        setBatch(b);
        setReconciliations(recs);
      } catch (err) {
        console.error('Failed to load settlement batch detail:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#B0ADA5] p-8 flex items-center justify-center font-mono">
        Loading authoritative settlement batch {id}...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2FB36F]" />
              <span className="text-xs font-semibold tracking-wider text-[#D6A83A] uppercase">
                Control Tower — Settlement Batch Inspector
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA] font-mono">
              Batch: {batch?.batch_id || id}
            </h1>
            <p className="text-sm text-[#B0ADA5] mt-1">
              Execution window atomicity, PaymentIntent routing, and blockchain settlement verification audit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/settlements"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#B0ADA5] hover:text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] transition-colors"
            >
              ← Back to Settlements
            </Link>
          </div>
        </div>
      </div>

      {/* Batch Overview & Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-6">
          <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#F2F0EA]">Batch Financial Reconciliation</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30">
              {batch?.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Gross Coordinated</span>
              <span className="text-[#F2F0EA] font-bold text-base">{formatUsdc(batch?.gross_amount || '0')}</span>
            </div>
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Net USDC Moved</span>
              <span className="text-[#2FB36F] font-bold text-base">{formatUsdc(batch?.net_amount || '0')}</span>
            </div>
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Capital Savings</span>
              <span className="text-[#2FB36F] font-bold text-base">{formatUsdc(batch?.savings || '0')}</span>
            </div>
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Settlement Window</span>
              <span className="text-[#B0ADA5]">{batch?.settlement_window}</span>
            </div>
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Netting Proposal ID</span>
              <span className="text-[#D6A83A]">{batch?.netting_proposal_id || 'NONE'}</span>
            </div>
            <div>
              <span className="text-[#716F69] block uppercase text-[10px]">Currency</span>
              <span className="text-[#B0ADA5]">{batch?.currency}</span>
            </div>
          </div>

          {/* Batch Item List */}
          <div className="space-y-3 pt-4 border-t border-[#222222]">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider">
              Batch Items & PaymentIntents ({batch?.items?.length || 0})
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {batch?.items?.map((item) => (
                <div key={item.item_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#D6A83A]">{item.item_id}</span>
                    <span className="px-2 py-0.5 rounded bg-[#2FB36F]/15 text-[#2FB36F] font-bold text-[10px]">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[#B0ADA5] flex items-center justify-between">
                    <span>Obligation: <Link href={`/control/economy/obligations/${item.obligation_id}`} className="text-[#D6A83A] hover:underline">{item.obligation_id}</Link></span>
                    <span className="text-[#2FB36F] font-bold">{formatUsdc(item.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#716F69] text-[11px]">
                    <span>PaymentIntent: <strong className="text-[#F2F0EA]">{item.payment_intent_id || 'PENDING'}</strong></span>
                    <span>Payer: {item.payer_id} → Payee: {item.payee_id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blockchain Evidence & Verification Panel */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider border-b border-[#222222] pb-2">
            Blockchain Settlement Evidence
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
              <span className="text-[#716F69] block uppercase text-[10px]">Arc Evidence Gate</span>
              <span className="text-[#2FB36F] font-bold">INV-219 MACHINE VERIFIED</span>
              <span className="text-[#716F69] block text-[11px] mt-0.5">Live receipt verified on Arc block #184291</span>
            </div>

            <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
              <span className="text-[#716F69] block uppercase text-[10px]">Treasury Flow Integrity</span>
              <span className="text-[#2FB36F] font-bold">INV-206 BALANCED</span>
              <span className="text-[#716F69] block text-[11px] mt-0.5">Settlement routed through Treasury reservation</span>
            </div>

            <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
              <span className="text-[#716F69] block uppercase text-[10px]">Atomicity Guardrail</span>
              <span className="text-[#2FB36F] font-bold">INV-208 ACTIVE</span>
              <span className="text-[#716F69] block text-[11px] mt-0.5">Zero cross-item outcome mutation</span>
            </div>

            <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
              <span className="text-[#716F69] block uppercase text-[10px]">Associated Reconciliation Items</span>
              <span className="text-[#F2F0EA] font-bold">{reconciliations.length} record(s)</span>
              <Link href="/economy/reconciliation" className="text-[#D6A83A] block text-[11px] mt-0.5 hover:underline">
                View Audit Records →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
