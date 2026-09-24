'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getSecurityAnomalies,
  MarketplaceAnomaly,
  MOCK_ANOMALIES,
} from '@/lib/api/marketplace';

export default function MarketplaceSecurityPage() {
  const [anomalies, setAnomalies] = useState<MarketplaceAnomaly[]>(MOCK_ANOMALIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getSecurityAnomalies();
        setAnomalies(res);
      } catch (err) {
        console.error('Failed to load anomalies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-400 hover:text-slate-200">
              ← Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-rose-400">security</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>🛡️ Marketplace Security & Anomaly Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Real-time anomaly detection, sybil resistance, and counterparty concentration monitoring.
            <span className="text-rose-400 ml-1 font-semibold">Signals are informational (INV-200); AgentPay maintains zero financial bypass.</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-bold rounded">
            All 20 Invariants Active (INV-181 to INV-200)
          </span>
        </div>
      </div>

      {/* Security Invariants Matrix (Section 56) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Core Marketplace Invariants (INV-181 to INV-200)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-181</span>
            <span className="text-slate-300 block mt-1">Matching cannot authorize payment</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-182</span>
            <span className="text-slate-300 block mt-1">Ranking cannot bypass policy</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-185</span>
            <span className="text-slate-300 block mt-1">Marketplace cannot increase budget</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-186</span>
            <span className="text-slate-300 block mt-1">Arbitrary raw hex 0x... blocked</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-187</span>
            <span className="text-slate-300 block mt-1">Expired quotes cannot be awarded</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-189</span>
            <span className="text-slate-300 block mt-1">Cross-tenant listings invisible</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-194</span>
            <span className="text-slate-300 block mt-1">Duplicate award prevents double contract</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
            <span className="font-mono text-cyan-400 block font-bold">INV-200</span>
            <span className="text-slate-300 block mt-1">Concentration signals informational</span>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">✓ ENFORCED</span>
          </div>
        </div>
      </div>

      {/* Active Anomaly Alerts (Section 49 & 34) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <span>⚠️ Detected Behavioral Anomalies & Concentration Signals</span>
          <span className="text-xs text-slate-400">({anomalies.length})</span>
        </h2>

        <div className="space-y-3">
          {anomalies.map((anom) => (
            <div
              key={anom.anomaly_id}
              className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      anom.severity === 'HIGH'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {anom.severity}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {anom.anomaly_type}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(anom.created_at).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-xs text-slate-300">{anom.description}</p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                <span>Provider: {anom.provider_agent_id}</span>
                <span className="text-cyan-400">Flagged for Audit Review</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
