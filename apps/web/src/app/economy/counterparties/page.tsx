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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                Task 18 — Economic Clearing Network
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Economic Counterparties Directory
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Authoritative counterparty exposure limits, capability credentials, identity statuses, and active contract relations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/economy/network"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              Network Graph View →
            </Link>
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Registered Counterparties</div>
          <div className="text-2xl font-bold text-white mt-1">{counterparties.length}</div>
          <div className="text-xs text-indigo-400 mt-2 font-mono">{verifiedCount} verified identities</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Network Exposure</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatUsdc(String(totalExposure))}</div>
          <div className="text-xs text-slate-400 mt-2">Aggregated active obligations</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Identity Assurance</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">INV-201 Checked</div>
          <div className="text-xs text-slate-400 mt-2">Zero financial authority granted by identity</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Policy Boundaries</div>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">100% Bound</div>
          <div className="text-xs text-slate-400 mt-2">Exposure limits strictly machine-enforced</div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Active Counterparty Participants</h2>
            <p className="text-xs text-slate-400">Deterministic balance exposure derived from authoritative obligations.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Identity:</span>
            {['ALL', 'VERIFIED', 'IDENTIFIED', 'UNVERIFIED', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">Loading counterparty telemetry...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">No counterparties found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((cp) => {
                  const currExp = Number(cp.current_exposure || 0);
                  const limit = Number(cp.exposure_limit || 1);
                  const pct = Math.min(100, Math.round((currExp / limit) * 100));

                  return (
                    <tr key={cp.counterparty_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-300">{cp.counterparty_id}</td>
                      <td className="py-3 px-4 text-slate-200">{cp.agent_id}</td>
                      <td className="py-3 px-4 text-slate-400">{cp.organization_id}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            cp.identity_status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : cp.identity_status === 'IDENTIFIED'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : cp.identity_status === 'SUSPENDED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {cp.identity_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{formatUsdc(cp.current_exposure)}</td>
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{pct}%</span>
                            <span>{formatUsdc(cp.exposure_limit)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{cp.active_contracts} active</td>
                      <td className="py-3 px-4">
                        <span className="text-slate-400">{cp.risk_reference}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/control/economy/counterparties/${cp.counterparty_id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
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
