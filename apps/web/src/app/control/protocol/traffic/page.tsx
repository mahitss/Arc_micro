'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchProtocolTraffic,
  ProtocolTrafficEntry,
  FALLBACK_TRAFFIC,
} from '../../../../lib/api/protocol';

export default function ProtocolTrafficPage() {
  const [traffic, setTraffic] = useState<ProtocolTrafficEntry[]>(FALLBACK_TRAFFIC);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const data = await fetchProtocolTraffic();
      setTraffic(data);
    } catch (err) {
      console.error('Failed to load traffic:', err);
    } finally {
      setLoading(false);
    }
  }

  const messageTypes = ['ALL', ...Array.from(new Set(traffic.map((t) => t.message_type)))];

  const filtered = traffic.filter((t) => {
    if (filterType !== 'ALL' && t.message_type !== filterType) return false;
    if (search && !t.sender_id.includes(search) && !t.recipient_id.includes(search) && !t.message_type.includes(search)) {
      return false;
    }
    return true;
  });

  const avgLatency = traffic.length > 0
    ? (traffic.reduce((acc, t) => acc + (t.latency_ms || 0), 0) / traffic.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/protocol"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              ← Back to Protocol Overview
            </Link>
            <span className="text-xs font-mono text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A]">traffic</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
              SIMULATED TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-2">Protocol Telemetry Stream</h1>
          <p className="text-xs text-[#716F69]">
            Auditable message flow through the 6-stage ProtocolGateway pipeline. Simulation mode — zero on-chain broadcast.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#101010] border border-[#222222] rounded-xl px-4 py-2.5 font-mono">
          <div>
            <div className="text-[10px] uppercase font-semibold text-[#716F69]">Average Latency</div>
            <div className="text-xl font-bold text-[#D6A83A]">{avgLatency} ms</div>
          </div>
          <div className="border-l border-[#222222] pl-4">
            <div className="text-[10px] uppercase font-semibold text-[#716F69]">Simulated Entries</div>
            <div className="text-xl font-bold text-[#F2F0EA]">{traffic.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-[#101010] border border-[#222222] p-4 rounded-xl">
        <input
          type="text"
          placeholder="Filter by agent or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-1.5 text-xs text-[#F2F0EA] placeholder-[#716F69] font-mono w-64 focus:border-[#D6A83A] outline-none"
        />

        <div className="flex items-center gap-1 overflow-x-auto">
          {messageTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
                filterType === t
                  ? 'bg-[#D6A83A] text-[#080808] font-bold shadow-sm'
                  : 'bg-[#0B0B0B] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Traffic Table */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0B0B0B] text-[#716F69] uppercase tracking-wider text-[11px] border-b border-[#222222]">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Message Type</th>
              <th className="py-3 px-4">Sender → Recipient</th>
              <th className="py-3 px-4">Correlation ID</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222222]">
            {filtered.map((e) => (
              <tr key={e.traffic_id} className="hover:bg-[#141414] transition">
                <td className="py-3 px-4 text-[#50504C] text-[11px]">{e.timestamp}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#222222] text-[11px]">
                    {e.message_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#F2F0EA]">
                  <span className="font-semibold text-[#F2F0EA]">{e.sender_id}</span>
                  <span className="text-[#50504C] mx-2">→</span>
                  <span className="font-semibold text-[#F2F0EA]">{e.recipient_id}</span>
                </td>
                <td className="py-3 px-4 text-[#716F69] text-[11px]">{e.correlation_id}</td>
                <td className="py-3 px-4 text-[#B0ADA5]">{e.latency_ms} ms</td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      e.status.includes('FAIL') || e.status.includes('ERROR')
                        ? 'bg-[#141414] text-[#D85C5C] border-[#D85C5C]/30'
                        : 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/30'
                    }`}
                  >
                    {e.status} (SIMULATED)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
