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
        return 'bg-[#141414] text-[#B0ADA5] border-[#222222]';
      case 'PAYMENT':
        return 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40';
      case 'POLICY':
        return 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/40';
      case 'SECURITY':
        return 'bg-[#141414] text-[#D85C5C] border-[#D85C5C]/40';
      case 'APPROVAL':
        return 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40';
      case 'ARC':
        return 'bg-[#141414] text-[#6B8FD6] border-[#6B8FD6]/40';
      default:
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Global Financial Activity</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#141414] text-[#D6A83A] border border-[#222222]">
              Audit Flight Log
            </span>
          </div>
          <p className="text-sm text-[#716F69] mt-1.5 max-w-2xl">
            Unified, chronological financial event trail across all autonomous missions, payment intents, policy decisions, and Arc settlements.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#716F69] bg-[#101010] px-3 py-2 rounded-lg border border-[#222222]">
          <span className="w-2 h-2 rounded-full bg-[#D6A83A] animate-pulse" />
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
                ? 'bg-[#D6A83A] text-[#080808] border-[#D6A83A] font-bold'
                : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
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
            <div className="p-12 text-center text-[#716F69]">Querying global financial outbox...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#101010] border border-[#222222] text-[#716F69]">
              No activity records match the selected filter.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  selectedEvent?.id === evt.id
                    ? 'bg-[#141414] border-[#D6A83A]'
                    : 'bg-[#101010] border-[#222222] hover:border-[#2D2D2D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(evt.category)}`}>
                      {evt.category}
                    </span>
                    <span className="text-[#F2F0EA] font-bold">{evt.type}</span>
                  </div>
                  <span className="text-[11px] text-[#716F69]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#716F69] gap-2">
                  <span>Actor: <span className="text-[#D6A83A]">{evt.actor}</span></span>
                  {evt.amount && <span>Amount: <span className="text-[#2FB36F] font-bold">{formatUsdc(evt.amount)}</span></span>}
                  <span className="text-[#50504C]">ID: {evt.id}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Event Payload Inspector */}
        <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-4 font-mono text-xs sticky top-24 h-fit">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h2 className="font-bold text-[#F2F0EA] uppercase tracking-wider text-sm">
              Event Inspector
            </h2>
            {selectedEvent && (
              <span className="text-[10px] text-[#D6A83A]">{selectedEvent.id}</span>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-3">
              <div>
                <span className="text-[#716F69] block text-[10px]">EVENT TYPE:</span>
                <span className="text-[#D6A83A] font-bold">{selectedEvent.type}</span>
              </div>
              <div>
                <span className="text-[#716F69] block text-[10px]">CORRELATION ID:</span>
                <span className="text-[#F2F0EA] font-mono break-all">{selectedEvent.correlation_id}</span>
              </div>
              {selectedEvent.mission_id && (
                <div>
                  <span className="text-[#716F69] block text-[10px]">MISSION:</span>
                  <Link href={`/missions/${selectedEvent.mission_id}`} className="text-[#D6A83A] underline">
                    {selectedEvent.mission_id} →
                  </Link>
                </div>
              )}
              <div>
                <span className="text-[#716F69] block text-[10px] mb-1">STRUCTURED AUDIT PAYLOAD:</span>
                <pre className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222] text-[10px] text-[#B0ADA5] overflow-x-auto leading-relaxed max-h-80">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#716F69] text-xs">
              Select an activity event from the feed to inspect structured audit metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
