'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchCounterparty,
  fetchObligations,
  EconomicCounterparty,
  EconomicObligationRecord,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function CounterpartyDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || 'cp_alpha_01';

  const [counterparty, setCounterparty] = useState<EconomicCounterparty | null>(null);
  const [obligations, setObligations] = useState<EconomicObligationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cp, obs] = await Promise.all([
          fetchCounterparty(id),
          fetchObligations(),
        ]);
        setCounterparty(cp);
        setObligations(obs.filter(o => o.payer_agent_id === cp.agent_id || o.payee_agent_id === cp.agent_id));
      } catch (err) {
        console.error('Failed to load counterparty detail:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center font-mono">
        Loading authoritative counterparty profile {id}...
      </div>
    );
  }

  const currExp = Number(counterparty?.current_exposure || 0);
  const limit = Number(counterparty?.exposure_limit || 1);
  const pct = Math.min(100, Math.round((currExp / limit) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                Control Tower — Counterparty Exposure Inspector
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
              Counterparty: {counterparty?.counterparty_id || id}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic exposure profile, identity verification audit, and contractual obligation breakdown.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/counterparties"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              ← Back to Counterparties
            </Link>
          </div>
        </div>
      </div>

      {/* Profile & Exposure Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Identity & Policy Constraints</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {counterparty?.identity_status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Agent ID</span>
              <span className="text-white font-bold text-sm">{counterparty?.agent_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Organization ID</span>
              <span className="text-slate-300 font-bold text-sm">{counterparty?.organization_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Tenant ID</span>
              <span className="text-slate-300">{counterparty?.tenant_id}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Protocol Version</span>
              <span className="text-slate-300">{counterparty?.protocol_version}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Risk Reference</span>
              <span className="text-emerald-400 font-bold">{counterparty?.risk_reference}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px]">Capability</span>
              <span className="text-cyan-400 truncate block">{counterparty?.capability_reference || 'N/A'}</span>
            </div>
          </div>

          {/* Exposure Limits & Utilization */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 uppercase text-[10px]">Exposure Limit Utilization</span>
              <span className="text-emerald-400 font-bold">{pct}% utilized</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Current: <strong className="text-white">{formatUsdc(counterparty?.current_exposure || '0')}</strong></span>
              <span>Policy Limit: <strong className="text-white">{formatUsdc(counterparty?.exposure_limit || '0')}</strong></span>
            </div>
          </div>

          {/* Active Obligations for this Counterparty */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Associated Economic Obligations ({obligations.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Obligation ID</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {obligations.map((o) => {
                    const isPayer = o.payer_agent_id === counterparty?.agent_id;
                    return (
                      <tr key={o.obligation_id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-indigo-300">{o.obligation_id}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {isPayer ? `Owes ${o.payee_agent_id}` : `Owed by ${o.payer_agent_id}`}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{formatUsdc(o.amount)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400">
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/control/economy/obligations/${o.obligation_id}`}
                            className="text-indigo-400 hover:underline"
                          >
                            Trace →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Counterparty Historical Telemetry */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 font-mono text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
            Historical Performance & Risk Audit
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Historical Obligations</span>
              <span className="text-white font-bold text-base">{counterparty?.historical_obligations || 0}</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Completed clearing cycles</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Active Marketplace Contracts</span>
              <span className="text-cyan-400 font-bold text-base">{counterparty?.active_contracts || 0}</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">In-progress deliveries</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Identity Invariant INV-201</span>
              <span className="text-emerald-400 font-bold">ZERO FINANCIAL AUTHORITY</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Identity status cannot authorize payments</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Time Window Audit</span>
              <span className="text-slate-300 font-bold">ROLLING 30 DAYS</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Automated exposure recalculation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
