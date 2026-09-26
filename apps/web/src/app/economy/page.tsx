'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchObligations, EconomicObligation } from '../../lib/api/clearinghouse';
import { fetchServiceReputations } from '../../lib/api/missions';
import { ServiceReputation } from '../../lib/api/types';

export default function EconomyPage() {
  const [obligations, setObligations] = useState<EconomicObligation[]>([]);
  const [reputations, setReputations] = useState<ServiceReputation[]>([]);
  const [activeSection, setActiveSection] = useState<'obligations' | 'netting' | 'reconciliation'>('obligations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [obsData, repData] = await Promise.all([
          fetchObligations(),
          fetchServiceReputations(),
        ]);
        setObligations(obsData);
        setReputations(repData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load economic clearing data');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#f5f5f5]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">
              AUTONOMOUS ECONOMIC CLEARINGHOUSE
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#a3a3a3] border border-[#222222]">
              MULTI-AGENT VALUE SETTLEMENT
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3] mt-1 max-w-2xl leading-relaxed">
            The clearinghouse coordinates value across autonomous counterparties. Existing policy and approval rules authorize value; Arc blockchain settles value.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#a3a3a3] bg-[#101010] px-3 py-1.5 rounded-lg border border-[#222222]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>INV-55 to INV-70: Enforced</span>
        </div>
      </div>

      {/* Sections Hub: Obligations, Netting, Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveSection('obligations')}
          className={`p-4 rounded-xl text-left border transition-all ${
            activeSection === 'obligations'
              ? 'bg-[#151515] border-[#2a2a2a]'
              : 'bg-[#101010] border-[#222222] hover:border-[#2a2a2a]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-semibold text-[#f5f5f5] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              OBLIGATIONS
            </span>
            <span className="text-[10px] text-[#666666]">{obligations.length} RECORDS</span>
          </div>
          <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
            Bilateral debt contracts, escrow reserves, and deliverable-backed milestones.
          </p>
        </button>

        <Link
          href="/economy/clearing/netting"
          className="p-4 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-semibold text-[#f5f5f5] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
              NETTING
            </span>
            <span className="text-[10px] text-[#666666] group-hover:text-[#f5f5f5] transition-colors">Launch →</span>
          </div>
          <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
            Deterministic cycle compression to optimize on-chain liquidity & minimize Arc gas fees.
          </p>
        </Link>

        <Link
          href="/economy/clearing/reconciliation"
          className="p-4 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-semibold text-[#f5f5f5] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              RECONCILIATION
            </span>
            <span className="text-[10px] text-[#666666] group-hover:text-[#f5f5f5] transition-colors">Audit →</span>
          </div>
          <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
            Continuous machine-checked verification between internal ledger and Arc receipts.
          </p>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#171717] border border-[#ef4444]/40 text-xs text-[#ef4444] font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Financial Table: Obligations */}
      <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">
              ECONOMIC OBLIGATIONS & CLEARING
            </h2>
            <p className="text-[11px] text-[#666666] font-mono mt-0.5">
              Deterministic Simulation Ledger · All State Verified
            </p>
          </div>
          <Link
            href="/economy/clearing"
            className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-mono rounded border border-[#262626] transition-colors"
          >
            Open Full Clearing Console →
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#666666] font-mono text-xs">
            Loading clearinghouse ledger...
          </div>
        ) : obligations.length === 0 ? (
          <div className="p-8 text-center text-[#a3a3a3] font-mono text-xs">
            No active obligations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3 font-medium">COUNTERPARTY</th>
                  <th className="pb-3 font-medium">OBLIGATION</th>
                  <th className="pb-3 font-medium">STATUS</th>
                  <th className="pb-3 font-medium">RESERVED</th>
                  <th className="pb-3 font-medium">SETTLEMENT</th>
                  <th className="pb-3 font-medium text-right">EXPOSURE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {obligations.map((ob) => {
                  const total = parseInt(ob.amount || '0', 10);
                  const settled = parseInt(ob.settled_amount || '0', 10);
                  const exposure = Math.max(0, total - settled);
                  const reserved = ob.status === 'AUTHORIZED' || ob.status === 'PENDING' ? total : 0;

                  return (
                    <tr key={ob.obligation_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3.5 text-[#f5f5f5] font-semibold">
                        <div className="flex flex-col">
                          <span>{ob.payer_agent_id}</span>
                          <span className="text-[10px] text-[#666666]">→ {ob.payee_agent_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-[#a3a3a3]">
                        <div className="flex flex-col">
                          <span className="text-[#f5f5f5] font-mono">{ob.obligation_id}</span>
                          <span className="text-[10px] text-[#666666]">{ob.contract_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ob.status === 'SETTLED'
                                ? 'bg-[#22c55e]'
                                : ob.status === 'AUTHORIZED'
                                ? 'bg-[#60a5fa]'
                                : 'bg-[#f59e0b]'
                            }`}
                          />
                          {ob.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-[#f5f5f5] font-bold">
                        {formatUsdc(reserved.toString())}
                      </td>
                      <td className="py-3.5 text-[#a3a3a3]">
                        {formatUsdc(ob.settled_amount)}
                      </td>
                      <td className="py-3.5 text-right font-bold text-[#f5f5f5]">
                        {formatUsdc(exposure.toString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Reputation & Reliability Telemetry */}
      <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">
              COUNTERPARTY REPUTATION & RELIABILITY
            </h2>
            <p className="text-[11px] text-[#666666] font-mono mt-0.5">
              Deterministic Simulation Telemetry · Historical Ranking Benchmark
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#a3a3a3] bg-[#141414] px-2 py-0.5 rounded border border-[#222222]">
            DEMO SEED FIXTURE
          </span>
        </div>

        {reputations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3 font-medium">SERVICE ID</th>
                  <th className="pb-3 font-medium">REQUESTS</th>
                  <th className="pb-3 font-medium">SUCCESS RATE</th>
                  <th className="pb-3 font-medium">AVG LATENCY</th>
                  <th className="pb-3 font-medium">REPUTATION</th>
                  <th className="pb-3 font-medium text-right">VOLUME (USDC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {reputations.map((rep) => {
                  const successRate =
                    rep.total_requests > 0
                      ? ((rep.successful_requests / rep.total_requests) * 100).toFixed(2)
                      : '100.00';

                  return (
                    <tr key={rep.service_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3 font-semibold text-[#f5f5f5]">
                        {rep.service_id}
                      </td>
                      <td className="py-3 text-[#a3a3a3]">{rep.total_requests}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#22c55e]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                          {successRate}%
                        </span>
                      </td>
                      <td className="py-3 text-[#a3a3a3]">{rep.average_latency_ms} ms</td>
                      <td className="py-3">
                        <span className="text-[#f5f5f5] font-bold">
                          {(rep.reputation_score / 100).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-[#666666]"> / 100</span>
                      </td>
                      <td className="py-3 text-right font-bold text-[#f5f5f5]">
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
    </div>
  );
}
