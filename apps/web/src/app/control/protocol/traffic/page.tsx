'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchProtocolTraffic,
  ProtocolTrafficEntry,
  FALLBACK_TRAFFIC,
} from '../../../../lib/api/protocol';

export default function ProtocolTrafficPage() {
  const [traffic, setTraffic] = useState<ProtocolTrafficEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/protocol"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            >
              ← Back to Protocol Overview
            </Link>
            <span className="text-xs font-mono text-slate-500">/</span>
            <span className="text-xs font-mono text-indigo-400">traffic</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Protocol Telemetry Stream</h1>
          <p className="text-xs text-slate-400">
            Real-time auditable message flow through the 6-stage ProtocolGateway pipeline.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Average Latency</div>
            <div className="text-xl font-bold text-indigo-400">{avgLatency} ms</div>
          </div>
          <div className="border-l border-slate-800 pl-4">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Entries</div>
            <div className="text-xl font-bold text-white">{traffic.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
        <input
          type="text"
          placeholder="Filter by agent or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono w-64"
        />

        <div className="flex items-center gap-1 overflow-x-auto">
          {messageTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Traffic Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Message Type</th>
              <th className="py-3 px-4">Sender → Recipient</th>
              <th className="py-3 px-4">Correlation ID</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((e) => (
              <tr key={e.traffic_id} className="hover:bg-slate-800/30 transition">
                <td className="py-3 px-4 text-slate-400 text-[11px]">{e.timestamp}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 text-[11px]">
                    {e.message_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-200">
                  <span className="font-semibold text-slate-100">{e.sender_id}</span>
                  <span className="text-slate-500 mx-2">→</span>
                  <span className="font-semibold text-slate-100">{e.recipient_id}</span>
                </td>
                <td className="py-3 px-4 text-slate-500 text-[11px]">{e.correlation_id}</td>
                <td className="py-3 px-4 text-slate-400">{e.latency_ms} ms</td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      e.status.includes('FAIL') || e.status.includes('ERROR')
                        ? 'bg-rose-950 text-rose-400 border-rose-800/50'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                    }`}
                  >
                    {e.status}
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
