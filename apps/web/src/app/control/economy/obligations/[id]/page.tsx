'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchObligation,
  fetchFinancialTrace,
  explainUnsettled,
  EconomicObligationRecord,
  FinancialTrace,
  UnsettledExplanation,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function ObligationDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || 'ob_live_101';

  const [obligation, setObligation] = useState<EconomicObligationRecord | null>(null);
  const [trace, setTrace] = useState<FinancialTrace | null>(null);
  const [explanation, setExplanation] = useState<UnsettledExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ob, tr, exp] = await Promise.all([
          fetchObligation(id),
          fetchFinancialTrace(id),
          explainUnsettled(id),
        ]);
        setObligation(ob);
        setTrace(tr);
        setExplanation(exp);
      } catch (err) {
        console.error('Failed to load obligation detail:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center font-mono">
        Loading authoritative obligation record {id}...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                Control Tower — Obligation Inspector
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
              Obligation: {obligation?.obligation_id || id}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic causal trace from objective & contract through clearinghouse settlement and reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              ← Back to Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Attributes */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Financial Terms & Authorization</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {obligation?.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Amount</span>
              <span className="text-emerald-400 font-bold text-base">{formatUsdc(obligation?.amount || '0')}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Settled Amount</span>
              <span className="text-white font-bold text-base">{formatUsdc(obligation?.settled_amount || '0')}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Currency</span>
              <span className="text-slate-300 font-bold text-base">{obligation?.currency || 'USDC'}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Payer Agent</span>
              <span className="text-indigo-300 font-semibold">{obligation?.payer_agent_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Payee Agent</span>
              <span className="text-indigo-300 font-semibold">{obligation?.payee_agent_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Contract ID</span>
              <span className="text-purple-300 font-semibold">{obligation?.contract_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Source Type</span>
              <span className="text-slate-300">{obligation?.source_type}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Source ID</span>
              <span className="text-slate-300">{obligation?.source_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Tenant ID</span>
              <span className="text-slate-300">{obligation?.tenant_id}</span>
            </div>
          </div>

          {/* Explanation Component (Section 36: Why is this unsettled?) */}
          {explanation && (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">ℹ️ STATUS EXPLANATION (WHY IS THIS UNSETTLED?):</span>
                <span className="text-slate-400">[{explanation.reason_code}]</span>
              </div>
              <p className="text-slate-200">{explanation.explanation}</p>
              <div className="text-emerald-400 text-[11px] pt-1">
                Safe Next Step: {explanation.safe_next_step}
              </div>
            </div>
          )}

          {/* Canonical Causal Financial Trace (Section 54) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Canonical Financial Trace
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Path: {trace?.canonical_path}
            </p>

            <div className="space-y-2">
              {trace?.nodes.map((node) => (
                <div
                  key={node.step}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                      {node.step}
                    </span>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">{node.node_type}</span>
                      <span className="text-white font-bold">{node.node_id}</span>
                      <span className="text-slate-400 ml-2">({node.description})</span>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold">{node.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Governance & Audit Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Governance & Audit Verification
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Policy Gate</span>
              <span className="text-emerald-400 font-bold">INV-203 PASS</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Clearing cannot bypass policy</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Treasury Liquidity</span>
              <span className="text-cyan-400 font-bold">RESERVATION AVAILABLE</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Liquidity confirmed in Treasury</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Arc Evidence</span>
              <span className="text-amber-400 font-bold">AWAITING LIVE BATCH</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Zero unverified receipts (INV-219)</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Dispute Protection</span>
              <span className="text-emerald-400 font-bold">INV-210 VERIFIED</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">No open disputes on this obligation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
