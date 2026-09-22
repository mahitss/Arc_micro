'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchGlobalActivity } from '../../lib/api/missions';
import { GlobalActivityEvent } from '../../lib/api/types';

export default function ActivityStreamPage() {
  const [events, setEvents] = useState<GlobalActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<GlobalActivityEvent | null>(null);

  useEffect(() => {
    fetchGlobalActivity({ useDemo: true })
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    'ALL',
    'MISSION',
    'PAYMENT',
    'POLICY',
    'RISK',
    'APPROVAL',
    'SECURITY',
    'ARC',
  ];

  const filteredEvents =
    selectedCategory === 'ALL'
      ? events
      : events.filter((e) => e.category.toUpperCase() === selectedCategory);

  const formatUsdc = (baseUnits?: string) => {
    if (!baseUnits) return '';
    const val = parseInt(baseUnits, 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'MISSION':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'PAYMENT':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'POLICY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SECURITY':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'APPROVAL':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'ARC':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Global Financial Activity</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Audit Flight Log
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Unified, chronological financial event trail across all autonomous missions, payment intents, policy decisions, and Arc settlements.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>Realtime Outbox</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              selectedCategory === cat
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Activity Table & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3 font-mono text-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Querying global financial outbox...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500">
              No activity records match the selected filter.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  selectedEvent?.id === evt.id
                    ? 'bg-slate-900 border-teal-500 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(evt.category)}`}>
                      {evt.category}
                    </span>
                    <span className="text-white font-bold">{evt.type}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                  <span>Actor: <span className="text-teal-300">{evt.actor}</span></span>
                  {evt.amount && <span>Amount: <span className="text-emerald-400 font-bold">{formatUsdc(evt.amount)}</span></span>}
                  <span className="text-slate-600">ID: {evt.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Event Payload Inspector */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4 font-mono text-xs sticky top-24 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-white uppercase tracking-wider text-sm">
              Event Inspector
            </h2>
            {selectedEvent && (
              <span className="text-[10px] text-teal-400">{selectedEvent.id}</span>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-3">
              <div>
                <span className="text-slate-500 block text-[10px]">EVENT TYPE:</span>
                <span className="text-teal-300 font-bold">{selectedEvent.type}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CORRELATION ID:</span>
                <span className="text-white font-mono break-all">{selectedEvent.correlation_id}</span>
              </div>
              {selectedEvent.mission_id && (
                <div>
                  <span className="text-slate-500 block text-[10px]">MISSION:</span>
                  <Link href={`/missions/${selectedEvent.mission_id}`} className="text-cyan-300 underline">
                    {selectedEvent.mission_id} →
                  </Link>
                </div>
              )}
              <div>
                <span className="text-slate-500 block text-[10px] mb-1">STRUCTURED AUDIT PAYLOAD:</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-300 overflow-x-auto leading-relaxed max-h-80">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select an activity event from the feed to inspect structured audit metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
