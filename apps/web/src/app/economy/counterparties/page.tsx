'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchCounterparties,
  EconomicCounterparty,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function CounterpartiesPage() {
  const [counterparties, setCounterparties] = useState<EconomicCounterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCounterparties();
        setCounterparties(data);
      } catch (err) {
        console.error('Failed to load counterparties:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = statusFilter === 'ALL'
    ? counterparties
    : counterparties.filter(c => c.identity_status === statusFilter);

  const totalExposure = counterparties.reduce((sum, c) => sum + Number(c.current_exposure || 0), 0);
  const verifiedCount = counterparties.filter(c => c.identity_status === 'VERIFIED').length;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase font-mono">
                Economic Clearing Network
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Economic Counterparties Directory
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Authoritative counterparty exposure limits, capability credentials, identity statuses, and active contract relations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/network"
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold font-mono rounded-lg transition-colors"
            >
              Network Graph View →
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Registered Counterparties</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{counterparties.length}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">{verifiedCount} verified identities</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Gross Network Exposure</div>
          <div className="text-2xl font-bold text-[#2FB36F] mt-1 font-mono">{formatUsdc(String(totalExposure))}</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Aggregated active obligations</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Identity Assurance</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">INV-201 Checked</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Zero financial authority granted by identity</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Policy Boundaries</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">100% Bound</div>
          <div className="text-xs text-[#716F69] mt-2 font-mono">Exposure limits strictly machine-enforced</div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#F2F0EA]">Active Counterparty Participants</h2>
            <p className="text-xs text-[#716F69]">Deterministic balance exposure derived from authoritative obligations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#716F69] font-mono">Identity:</span>
            {['ALL', 'VERIFIED', 'IDENTIFIED', 'UNVERIFIED', 'SUSPENDED'].map((st) => (
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
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">Loading counterparty telemetry...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">No counterparties found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0B0B0B] text-[#716F69] uppercase text-[10px] tracking-wider border-b border-[#222222]">
                <tr>
                  <th className="py-3 px-4">Counterparty ID</th>
                  <th className="py-3 px-4">Agent ID</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Exposure</th>
                  <th className="py-3 px-4">Limit Utilization</th>
                  <th className="py-3 px-4">Contracts</th>
                  <th className="py-3 px-4">Risk Ref</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filtered.map((cp) => {
                  const currExp = Number(cp.current_exposure || 0);
                  const limit = Number(cp.exposure_limit || 1);
                  const pct = Math.min(100, Math.round((currExp / limit) * 100));

                  return (
                    <tr key={cp.counterparty_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#D6A83A]">{cp.counterparty_id}</td>
                      <td className="py-3 px-4 text-[#F2F0EA]">{cp.agent_id}</td>
                      <td className="py-3 px-4 text-[#716F69]">{cp.organization_id}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cp.identity_status === 'VERIFIED'
                              ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                              : cp.identity_status === 'IDENTIFIED'
                              ? 'bg-[#6B8FD6]/10 text-[#6B8FD6] border border-[#6B8FD6]/30'
                              : cp.identity_status === 'SUSPENDED'
                              ? 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                              : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                          }`}
                        >
                          {cp.identity_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2FB36F]">{formatUsdc(cp.current_exposure)}</td>
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-[#716F69]">
                            <span>{pct}%</span>
                            <span>{formatUsdc(cp.exposure_limit)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#0B0B0B] border border-[#222222] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct > 85 ? 'bg-[#D85C5C]' : pct > 60 ? 'bg-[#D6A83A]' : 'bg-[#2FB36F]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#B0ADA5]">{cp.active_contracts} active</td>
                      <td className="py-3 px-4">
                        <span className="text-[#716F69]">{cp.risk_reference}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/control/economy/counterparties/${cp.counterparty_id}`}
                          className="text-[#D6A83A] hover:underline font-medium"
                        >
                          Detail →
                        </Link>
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
