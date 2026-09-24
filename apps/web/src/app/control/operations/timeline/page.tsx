'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { operationsApi } from '../../../../lib/api/operations';

interface OperationalEvent {
  event_id: string;
  category: string;
  title: string;
  workflow_id?: string;
  caused_by_event_id?: string;
  severity: string;
  timestamp: string;
  details?: Record<string, any>;
}

export default function OperationsTimelinePage() {
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<OperationalEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
    const interval = setInterval(loadTimeline, 4000);
    return () => clearInterval(interval);
  }, []);

  async function loadTimeline() {
    try {
      const data = await operationsApi.getTimeline(100);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load operations timeline', err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    'ALL',
    'MISSION',
    'WORKFLOW',
    'AGENT',
    'ECONOMIC',
    'POLICY',
    'SECURITY',
    'TREASURY',
    'PAYMENT',
    'SETTLEMENT',
    'RECOVERY',
    'SYSTEM',
  ];

  const filteredEvents = events.filter((evt) => {
    const matchesCategory = filterCategory === 'ALL' || evt.category.toUpperCase() === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      evt.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.workflow_id && evt.workflow_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (evt.caused_by_event_id && evt.caused_by_event_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/control/operations"
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              ← Operations Command Center
            </Link>
            <span className="text-slate-600">/</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CAUSAL TRACE STREAM
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2">
            Live Operations Timeline
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Immutable audit of operational state transitions with causal lineage tracking (<code className="text-cyan-300">caused_by_event_id</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search event ID, workflow, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-mono bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 text-xs font-mono">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-wider ${
              filterCategory === cat
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Event Stream List & Causal Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Events */}
        <div className="lg:col-span-2 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-500 font-mono text-xs">
              No operational events match current filter.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.event_id}
                onClick={() => setSelectedEvent(evt)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEvent?.event_id === evt.event_id
                    ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/80 hover:bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                      {evt.category}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">{evt.event_id}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-200 mt-2">{evt.title}</div>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] font-mono text-slate-400">
                  {evt.workflow_id && (
                    <span>
                      Workflow: <span className="text-indigo-400">{evt.workflow_id}</span>
                    </span>
                  )}
                  {evt.caused_by_event_id && (
                    <span className="flex items-center gap-1 text-amber-400/90">
                      <span>↳ Caused by:</span>
                      <span className="underline">{evt.caused_by_event_id}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Causal Inspector Panel */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4 sticky top-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Event Causal Context
            </h3>

            {selectedEvent ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Selected Event</div>
                  <div className="text-cyan-300 font-bold">{selectedEvent.event_id}</div>
                  <div className="text-white text-xs mt-1">{selectedEvent.title}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Causal Lineage</div>
                  <div className="text-xs text-slate-300">
                    {selectedEvent.caused_by_event_id ? (
                      <div className="space-y-1">
                        <div className="text-amber-400 font-bold">
                          Direct Parent: {selectedEvent.caused_by_event_id}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Deterministic causal sequence registered in graph database.
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500">Root operational trigger (no prior event).</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Authoritative Separation</div>
                  <div className="text-[11px] text-emerald-400">
                    Financial truth bounded by domain engine.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono py-8 text-center">
                Select an operational event to trace causal lineage.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
