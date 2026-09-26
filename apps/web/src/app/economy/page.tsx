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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              AUTONOMOUS ECONOMIC CLEARINGHOUSE
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              MULTI-AGENT VALUE SETTLEMENT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1.5 max-w-2xl leading-relaxed">
            The clearinghouse coordinates value across autonomous counterparties. Existing policy and approval rules authorize value; Arc blockchain settles value.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#B0ADA5] bg-[#101010] px-3.5 py-2 rounded-lg border border-[#222222] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
          <span>Bilateral Clearing Enforced</span>
        </div>
      </div>

      {/* Sections Hub: Obligations, Netting, Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveSection('obligations')}
          className={`p-5 rounded-xl text-left border transition-all ${
            activeSection === 'obligations'
              ? 'bg-[#151515] border-[#2D2D2D]'
              : 'bg-[#101010] border-[#222222] hover:border-[#2a2a2a]'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              OBLIGATIONS
            </span>
            <span className="text-[11px] text-[#716F69]">{obligations.length} RECORDS</span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Bilateral debt contracts, escrow reserves, and deliverable-backed milestones.
          </p>
        </button>

        <Link
          href="/economy/clearing/netting"
          className="p-5 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
              NETTING
            </span>
            <span className="text-[11px] text-[#716F69] group-hover:text-[#F2F0EA] transition-colors">Launch →</span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Deterministic cycle compression to optimize on-chain liquidity & minimize Arc gas fees.
          </p>
        </Link>

        <Link
          href="/economy/clearing/reconciliation"
          className="p-5 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              RECONCILIATION
            </span>
            <span className="text-[11px] text-[#716F69] group-hover:text-[#F2F0EA] transition-colors">Audit →</span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Continuous machine-checked verification between internal ledger and Arc receipts.
          </p>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#D85C5C]/40 text-xs text-[#D85C5C] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
          <span>{error}</span>
        </div>
      )}

      {/* Clean Financial Table: Obligations */}
      <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#F2F0EA]">
              ECONOMIC OBLIGATIONS & CLEARING
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Deterministic Simulation Ledger · All State Verified
            </p>
          </div>
          <Link
            href="/economy/clearing"
            className="h-8 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] transition-colors flex items-center self-start sm:self-auto"
          >
            Open Full Clearing Console →
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#716F69] text-xs">
            Loading clearinghouse ledger...
          </div>
        ) : obligations.length === 0 ? (
          <div className="p-10 text-center space-y-3 rounded-xl bg-[#101010] border border-[#1c1c1c]">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
              <h3 className="text-sm font-bold text-[#F2F0EA] tracking-wide uppercase">
                NO LIVE OBLIGATIONS
              </h3>
            </div>
            <p className="text-xs text-[#B0ADA5] max-w-lg mx-auto leading-relaxed">
              No real settlement activity has been recorded because AgentVault is not deployed and live execution is disabled. Simulation clearing is available for the flagship mission.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/control/autonomy"
                className="h-9 px-4 bg-[#F2F0EA] hover:bg-white text-[#080808] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>RUN CLEARING SIMULATION</span>
                <span>→</span>
              </Link>
              <Link
                href="/economy/clearing"
                className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] font-medium text-xs rounded-lg border border-[#222222] transition-colors flex items-center"
              >
                Inspect Ledger
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px] uppercase tracking-wider">
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
                      <td className="py-3.5 text-[#F2F0EA] font-semibold">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{ob.payer_agent_id}</span>
                          <span className="text-[10px] text-[#716F69] font-mono">→ {ob.payee_agent_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        <div className="flex flex-col">
                          <span className="text-[#F2F0EA] font-mono">{ob.obligation_id}</span>
                          <span className="text-[10px] text-[#716F69] font-mono">{ob.contract_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ob.status === 'SETTLED'
                                ? 'bg-[#2FB36F]'
                                : ob.status === 'AUTHORIZED'
                                ? 'bg-[#6B8FD6]'
                                : 'bg-[#D6A83A]'
                            }`}
                          />
                          {ob.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-[#F2F0EA] font-bold">
                        {formatUsdc(reserved.toString())}
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        {formatUsdc(ob.settled_amount)}
                      </td>
                      <td className="py-3.5 text-right font-bold text-[#F2F0EA]">
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
      <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#F2F0EA]">
              COUNTERPARTY REPUTATION & RELIABILITY
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Deterministic Simulation Telemetry · Historical Ranking Benchmark
            </p>
          </div>
          <span className="text-[10px] text-[#B0ADA5] bg-[#141414] px-2.5 py-1 rounded-md border border-[#222222] self-start sm:self-auto font-medium">
            Demo Seed Fixture
          </span>
        </div>

        {reputations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Service ID</th>
                  <th className="pb-3 font-medium">Observed Requests</th>
                  <th className="pb-3 font-medium">Observed Success</th>
                  <th className="pb-3 font-medium">Avg Latency</th>
                  <th className="pb-3 font-medium">Reputation Tier</th>
                  <th className="pb-3 font-medium text-right">Settled Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {reputations.map((rep) => {
                  const hasHistory = rep.total_requests > 0;
                  const successRate = hasHistory
                    ? ((rep.successful_requests / rep.total_requests) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={rep.service_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3.5 font-semibold text-[#F2F0EA] font-mono">
                        {rep.service_id}
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        {hasHistory ? rep.total_requests : '0'}
                      </td>
                      <td className="py-3.5">
                        {hasHistory && successRate !== null ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2FB36F]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                            {successRate}%
                          </span>
                        ) : (
                          <div className="text-[#716F69]">
                            <span className="block font-medium text-xs text-[#B0ADA5]">—</span>
                            <span className="text-[10px] block">No observed requests</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        {hasHistory ? `${rep.average_latency_ms} ms` : `${rep.average_latency_ms} ms (baseline)`}
                      </td>
                      <td className="py-3.5">
                        {hasHistory ? (
                          <div>
                            <span className="text-[#F2F0EA] font-bold">
                              {(rep.reputation_score / 100).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-[#716F69]"> / 100</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[#F2F0EA] font-medium">
                              {(rep.reputation_score / 100).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-[#716F69] ml-1">· Demo baseline</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-bold text-[#F2F0EA]">
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
