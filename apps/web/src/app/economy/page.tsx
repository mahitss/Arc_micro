'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchServiceReputations } from '../../lib/api/missions';
import { ServiceReputation } from '../../lib/api/types';

export default function EconomyPage() {
  const [reputations, setReputations] = useState<ServiceReputation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchServiceReputations();
        setReputations(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load economy reputation');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Economic Reputation Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Org-Isolated History
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Historical reliability telemetry across all service providers and peer agents.
            Influences economic candidate ranking without weakening authoritative policy enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span>INV-E10: Cross-Org Isolation Enforced</span>
        </div>
      </div>

      {/* Autonomous Economic Clearinghouse Hub */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/60 border border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight">Autonomous Economic Clearinghouse</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TASK 10 ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
              The clearinghouse coordinates value. Existing policy/risk/approval authorizes value. Arc blockchain settles value.
              Zero autonomous fund movement authority (INV-55 to INV-70).
            </p>
          </div>
          <Link
            href="/economy/clearing"
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
          >
            Launch Clearing Mission Control &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Link
            href="/economy/clearing"
            className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors group space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-semibold group-hover:text-emerald-300">Obligations & Escrows</span>
              <span className="text-slate-500">&rarr;</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Manage deferred payments, deliverable-backed milestones, and cryptographic escrows.
            </p>
          </Link>

          <Link
            href="/economy/clearing/netting"
            className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors group space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-teal-400 font-semibold group-hover:text-teal-300">Bilateral Netting Engine</span>
              <span className="text-slate-500">&rarr;</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic cycle compression to optimize on-chain liquidity & minimize Arc gas fees.
            </p>
          </Link>

          <Link
            href="/economy/clearing/reconciliation"
            className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-colors group space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-semibold group-hover:text-cyan-300">Audit & Reconciliation</span>
              <span className="text-slate-500">&rarr;</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Continuous machine-checked verification between internal ledger and Arc blockchain receipts.
            </p>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold text-white">Service Reputation & Reliability Telemetry</h2>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Compiling economic reputation metrics...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3 font-medium">SERVICE ID</th>
                  <th className="pb-3 font-medium">TOTAL REQUESTS</th>
                  <th className="pb-3 font-medium">SUCCESS RATE</th>
                  <th className="pb-3 font-medium">AVG LATENCY</th>
                  <th className="pb-3 font-medium">REPUTATION SCORE</th>
                  <th className="pb-3 font-medium text-right">TOTAL VOLUME (USDC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reputations.map((rep) => {
                  const successRate =
                    rep.total_requests > 0
                      ? ((rep.successful_requests / rep.total_requests) * 100).toFixed(2)
                      : '100.00';

                  return (
                    <tr key={rep.service_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        {rep.service_id}
                      </td>
                      <td className="py-4 text-slate-300">{rep.total_requests}</td>
                      <td className="py-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                          {successRate}%
                        </span>
                      </td>
                      <td className="py-4 text-cyan-300">{rep.average_latency_ms} ms</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-teal-300 font-bold">
                            {(rep.reputation_score / 100).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-500">/ 100</span>
                        </div>
                      </td>
                      <td className="py-4 text-right font-bold text-white">
                        {formatUsdc(rep.total_volume_base)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety Invariant Card */}
      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono space-y-2 text-slate-400">
        <span className="text-teal-400 font-bold tracking-wide block">
          ECONOMIC MEMORY INTEGRITY GUARANTEE
        </span>
        <p>
          Reputation scores dynamically calibrate economic candidate utility rankings (Phase 5).
          Reputation alone is NEVER authorized to approve payments or override Rust deterministic policy (INV-E6).
        </p>
      </div>
    </div>
  );
}
