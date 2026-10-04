'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getSecurityAnomalies,
  MarketplaceAnomaly,
  MOCK_ANOMALIES,
} from '@/lib/api/marketplace';
import { getActiveDataMode } from '@/lib/data-authority';

export default function MarketplaceSecurityPage() {
  const [anomalies, setAnomalies] = useState<MarketplaceAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const mode = getActiveDataMode();
        const res = await getSecurityAnomalies(mode);
        setAnomalies(res.length > 0 ? res : mode === 'SIMULATION' ? MOCK_ANOMALIES : []);
      } catch (err) {
        console.error('Failed to load anomalies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors">
              ← Marketplace
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="font-mono text-xs text-[#D6A83A]">security</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">
              SIMULATED SECURITY LAB
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-1.5 flex items-center gap-2">
            <span>🛡️ Marketplace Security & Invariants Lab</span>
          </h1>
          <p className="text-xs text-[#716F69] mt-1 max-w-3xl">
            Deterministic invariant enforcement (INV-181 to INV-200) and simulated behavioral anomaly detection.
            <span className="text-[#B0ADA5] ml-1 font-semibold">All anomaly signals are simulated demonstration fixtures (INV-200); AgentPay maintains zero financial bypass.</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#141414] text-[#2FB36F] border border-[#222222] text-xs font-bold rounded">
            All 20 Invariants Active (INV-181 to INV-200)
          </span>
        </div>
      </div>

      {/* Security Invariants Matrix (Section 56) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA]">
          Core Marketplace Invariants (INV-181 to INV-200)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-181</span>
            <span className="text-[#B0ADA5] block mt-1">Matching cannot authorize payment</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-182</span>
            <span className="text-[#B0ADA5] block mt-1">Ranking cannot bypass policy</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-185</span>
            <span className="text-[#B0ADA5] block mt-1">Marketplace cannot increase budget</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-186</span>
            <span className="text-[#B0ADA5] block mt-1">Arbitrary raw hex 0x... blocked</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-187</span>
            <span className="text-[#B0ADA5] block mt-1">Expired quotes cannot be awarded</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-189</span>
            <span className="text-[#B0ADA5] block mt-1">Cross-tenant listings invisible</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-194</span>
            <span className="text-[#B0ADA5] block mt-1">Duplicate award prevents double contract</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
          <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222]">
            <span className="font-mono text-[#D6A83A] block font-bold">INV-200</span>
            <span className="text-[#B0ADA5] block mt-1">Concentration signals informational</span>
            <span className="text-[10px] text-[#2FB36F] font-semibold block mt-1">✓ ENFORCED (Simulation & Live)</span>
          </div>
        </div>
      </div>

      {/* Active Anomaly Alerts (Section 49 & 34) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] flex items-center gap-2">
          <span>⚠️ Simulated Behavioral Anomalies & Concentration Signals</span>
          <span className="text-xs text-[#716F69]">({anomalies.length} DEMO SIGNALS)</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#716F69] animate-pulse">
            Loading simulated anomaly signals...
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anom) => (
              <div
                key={anom.anomaly_id}
                className="p-4 bg-[#0B0B0B] rounded-lg border border-[#222222] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        anom.severity === 'HIGH'
                          ? 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                          : 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                      }`}
                    >
                      {anom.severity} (SIMULATED)
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#F2F0EA]">
                      {anom.anomaly_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#716F69] font-mono">
                    {new Date(anom.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-[#B0ADA5]">{anom.description}</p>

                <div className="flex items-center justify-between text-[11px] text-[#716F69] pt-2 border-t border-[#222222] font-mono">
                  <span>Provider: {anom.provider_agent_id}</span>
                  <span className="text-[#D6A83A]">Simulated Signal · Informational Only</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
