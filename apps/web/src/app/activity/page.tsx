'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchGlobalActivity } from '../../lib/api/missions';
import { GlobalActivityEvent } from '../../lib/api/types';
import { getActiveDataMode, setActiveDataMode, DataMode } from '@/lib/data-authority';
import { DataAuthorityBadge } from '@/components/DataAuthorityBadge';

export default function ActivityStreamPage() {
  const [dataMode, setDataMode] = useState<DataMode>('LIVE');
  const [events, setEvents] = useState<GlobalActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showRawEvent, setShowRawEvent] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

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

  // Load activity events respecting data authority
  const loadEvents = useCallback(async (isBackground = false, overrideMode?: DataMode) => {
    const activeMode = overrideMode || dataMode;
    if (!isBackground) {
      if (events.length === 0) setLoading(true);
      else setRefreshing(true);
    }
    setError(null);

    try {
      const data = await fetchGlobalActivity({ useDemo: activeMode === 'SIMULATION' });
      
      // Deduplicate by canonical ID and sort newest first
      const deduplicatedMap = new Map<string, GlobalActivityEvent>();
      for (const evt of data) {
        if (!deduplicatedMap.has(evt.id)) {
          deduplicatedMap.set(evt.id, evt);
        }
      }
      const sorted = Array.from(deduplicatedMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(sorted);
      setLastSynced(new Date());

      // Auto-select event if URL parameter provided
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const paramId = urlParams.get('event');
        if (paramId && deduplicatedMap.has(paramId)) {
          setSelectedEventId(paramId);
        }
      }
    } catch (err: any) {
      console.warn(`Gateway activity stream error (Mode: ${activeMode}):`, err?.message);
      setEvents([]);
      setError(
        activeMode === 'LIVE'
          ? 'Live Gateway activity stream unavailable. No authentic events returned by backend.'
          : err?.message || 'Simulation activity feed unavailable.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [events.length, dataMode]);

  useEffect(() => {
    const initialMode = getActiveDataMode();
    setDataMode(initialMode);
    loadEvents(false, initialMode);
  }, []);

  const handleToggleMode = (enableSim: boolean) => {
    const newMode: DataMode = enableSim ? 'SIMULATION' : 'LIVE';
    setDataMode(newMode);
    setActiveDataMode(newMode);
    loadEvents(false, newMode);
  };

  // 10-second background polling
  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => {
      loadEvents(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPolling, loadEvents]);

  // Filtered event dataset
  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'ALL') {
      return events;
    }
    return events.filter((e) => e.category.toUpperCase() === selectedCategory);
  }, [events, selectedCategory]);

  // Selected event reference
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Copy raw event to clipboard
  const handleCopyRaw = () => {
    if (!selectedEvent?.raw_event) return;
    navigator.clipboard.writeText(JSON.stringify(selectedEvent.raw_event, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  // Select event and synchronize URL query param
  const handleSelectEvent = (evt: GlobalActivityEvent) => {
    setSelectedEventId(evt.id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('event', evt.id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'MISSION':
        return 'bg-[#141414] text-[#B0ADA5] border-[#2D2D2D]';
      case 'PAYMENT':
        return 'bg-[#181408] text-[#D6A83A] border-[#D6A83A]/30';
      case 'POLICY':
        return 'bg-[#08180E] text-[#2FB36F] border-[#2FB36F]/30';
      case 'SECURITY':
        return 'bg-[#180808] text-[#D85C5C] border-[#D85C5C]/30';
      case 'APPROVAL':
        return 'bg-[#181208] text-[#D6A83A] border-[#D6A83A]/30';
      case 'RISK':
        return 'bg-[#140F08] text-[#E5A84B] border-[#E5A84B]/30';
      case 'ARC':
        return 'bg-[#0C121E] text-[#6B8FD6] border-[#6B8FD6]/30';
      default:
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return 'text-[#2FB36F] bg-[#08180E] border-[#2FB36F]/30';
      case 'BLOCKED':
        return 'text-[#D85C5C] bg-[#180808] border-[#D85C5C]/30';
      case 'FAILED':
        return 'text-[#D85C5C] bg-[#180808] border-[#D85C5C]/30';
      case 'PENDING':
        return 'text-[#D6A83A] bg-[#181408] border-[#D6A83A]/30';
      default:
        return 'text-[#B0ADA5] bg-[#141414] border-[#222222]';
    }
  };

  // Safe structured metadata value rendering
  const renderMetadataValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-[#50504C]">—</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}>{value ? 'true' : 'false'}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-[#6B8FD6]">{value}</span>;
    }
    if (typeof value === 'string') {
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a href={value} target="_blank" rel="noreferrer" className="text-[#D6A83A] underline break-all">
            {value}
          </a>
        );
      }
      return <span className="text-[#F2F0EA] break-all">{value}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-[#50504C]">[]</span>;
      return (
        <div className="space-y-1 pl-2 border-l border-[#222222] mt-1">
          {value.map((item, idx) => (
            <div key={idx} className="text-[11px]">
              <span className="text-[#50504C] font-mono mr-1.5">[{idx}]</span>
              {renderMetadataValue(item)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="text-[#50504C]">{'{}'}</span>;
      return (
        <div className="space-y-1.5 pl-2 border-l border-[#222222] mt-1">
          {keys.map((k) => (
            <div key={k} className="text-[11px] flex flex-col sm:flex-row sm:items-start gap-1">
              <span className="text-[#716F69] font-mono min-w-[120px]">{k}:</span>
              <div className="flex-1">{renderMetadataValue(value[k])}</div>
            </div>
          ))}
        </div>
      );
    }
    return String(value);
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
            <DataAuthorityBadge provenance={dataMode === 'SIMULATION' ? 'SIMULATION — NO FUNDS MOVED' : error ? 'UNAVAILABLE' : 'LIVE'} />
          </div>
          <p className="text-sm text-[#716F69] mt-1.5 max-w-2xl">
            Unified, chronological financial event trail across all autonomous missions, payment intents, policy decisions, and Arc settlements.
          </p>
        </div>

        {/* Audit Stream Polling & Authority Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleToggleMode(dataMode !== 'SIMULATION')}
            className={`font-mono text-xs px-3 py-2 rounded-lg border transition-all ${
              dataMode === 'SIMULATION'
                ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30 font-bold'
                : 'bg-[#101010] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
            }`}
          >
            {dataMode === 'SIMULATION' ? 'SIMULATION ACTIVE' : 'ENABLE SIMULATION'}
          </button>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-2 font-mono text-xs px-3 py-2 rounded-lg border transition-all ${
              isPolling
                ? 'bg-[#181408] text-[#D6A83A] border-[#D6A83A]/40'
                : 'bg-[#101010] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
            }`}
            title={isPolling ? 'Click to pause automatic polling' : 'Click to enable 10s auto-polling'}
          >
            <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-[#D6A83A] animate-pulse' : 'bg-[#50504C]'}`} />
            <span>{isPolling ? 'LIVE POLLING (10s)' : 'AUDIT EVENT STREAM'}</span>
          </button>

          <button
            onClick={() => loadEvents()}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 font-mono text-xs px-3 py-2 rounded-lg bg-[#141414] text-[#B0ADA5] border border-[#222222] hover:text-[#F2F0EA] hover:border-[#333333] transition-all disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#D6A83A]' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {lastSynced && (
        <div className="flex items-center justify-between text-[11px] font-mono text-[#50504C] px-1">
          <span>Total immutable audit records: {events.length}</span>
          <span>Last synchronized: {lastSynced.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-[#180808] border border-[#D85C5C]/40 text-[#D85C5C] font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider">ACTIVITY SERVICE UNAVAILABLE:</span>
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {dataMode === 'LIVE' && (
              <button
                onClick={() => handleToggleMode(true)}
                className="px-3 py-1 rounded bg-[#D6A83A]/20 border border-[#D6A83A]/40 text-[#D6A83A] hover:bg-[#D6A83A]/30 transition-all font-bold"
              >
                View Simulation Trace
              </button>
            )}
            <button
              onClick={() => loadEvents()}
              className="px-3 py-1 rounded bg-[#D85C5C]/20 border border-[#D85C5C]/40 text-[#F2F0EA] hover:bg-[#D85C5C]/30 transition-all font-bold"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        {categories.map((cat) => {
          const count =
            cat === 'ALL'
              ? events.length
              : events.filter((e) => e.category.toUpperCase() === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-[#D6A83A] text-[#080808] border-[#D6A83A] font-bold'
                  : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  selectedCategory === cat ? 'bg-[#080808]/20 text-[#080808]' : 'bg-[#1A1A1A] text-[#50504C]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Activity Table & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event List Feed */}
        <div className="lg:col-span-2 space-y-3 font-mono text-xs">
          {loading ? (
            <div className="p-16 text-center rounded-2xl bg-[#101010] border border-[#222222] space-y-3">
              <div className="w-6 h-6 border-2 border-[#D6A83A] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-[#F2F0EA] font-bold">LOADING ACTIVITY</div>
              <p className="text-[#716F69] text-xs">Retrieving immutable audit events from Gateway...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-[#101010] border border-[#222222] space-y-3">
              <div className="text-[#B0ADA5] font-bold text-sm">NO ACTIVITY RECORDED</div>
              <p className="text-[#716F69] max-w-md mx-auto text-xs">
                {selectedCategory === 'ALL'
                  ? 'No financial or system events have been logged yet in this environment.'
                  : `No activity records match the ${selectedCategory} filter category.`}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => loadEvents()}
                  className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-[#D6A83A] hover:border-[#D6A83A] transition-all"
                >
                  Refresh Feed
                </button>
                <Link
                  href="/missions/new"
                  className="px-3 py-1.5 rounded-lg bg-[#D6A83A] text-[#080808] font-bold hover:bg-[#E5B54A] transition-all"
                >
                  Launch Mission
                </Link>
              </div>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectEvent(evt);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 focus:outline-none focus:ring-1 focus:ring-[#D6A83A] ${
                    isSelected
                      ? 'bg-[#141414] border-[#D6A83A] shadow-md shadow-[#D6A83A]/5'
                      : 'bg-[#101010] border-[#222222] hover:border-[#2D2D2D]'
                  }`}
                >
                  {/* Card Header: Status, Category, Provenance, Timestamp */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(evt.status)}`}>
                        {evt.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(evt.category)}`}>
                        {evt.category}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[#D6A83A] bg-[#0E0E0E] border border-[#222222]">
                        {evt.is_simulated || dataMode === 'SIMULATION' ? 'SIMULATED — NO FUNDS MOVED' : 'VERIFIED ON-CHAIN'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#716F69]">{evt.display_time || new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Card Title & Context Description */}
                  <div>
                    <h3 className="text-[#F2F0EA] font-bold text-sm tracking-tight">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-[#B0ADA5] text-xs mt-0.5 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  {/* Card Metadata Footer: Actor, IDs, Amount */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-[#716F69] gap-y-1 gap-x-3 pt-1 border-t border-[#181818]">
                    <div className="flex items-center gap-3">
                      <span>
                        Actor: <span className="text-[#D6A83A] font-semibold">{evt.actor}</span>
                      </span>
                      {evt.formatted_amount && (
                        <span>
                          Amount: <span className="text-[#2FB36F] font-bold">{evt.formatted_amount}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[#50504C]">
                      {evt.mission_id && <span>Mission: {evt.mission_id}</span>}
                      {evt.payment_intent_id && <span>Payment: {evt.payment_intent_id}</span>}
                      <span>ID: {evt.id}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Event Payload Inspector */}
        <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-5 font-mono text-xs sticky top-24 h-fit">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <div>
              <h2 className="font-bold text-[#F2F0EA] uppercase tracking-wider text-sm">
                Event Inspector
              </h2>
              <span className="text-[10px] text-[#716F69]">Structured Audit Record</span>
            </div>
            {selectedEvent && (
              <span className="text-[10px] text-[#D6A83A] font-mono break-all">{selectedEvent.id}</span>
            )}
          </div>

          {selectedEvent ? (
            <div className="space-y-4">
              {/* Event Primary Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0B0B0B] border border-[#1A1A1A]">
                <div>
                  <span className="text-[#50504C] block text-[10px] uppercase">EVENT</span>
                  <span className="text-[#F2F0EA] font-bold text-xs">{selectedEvent.title}</span>
                </div>
                <div>
                  <span className="text-[#50504C] block text-[10px] uppercase">STATUS</span>
                  <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border mt-0.5 ${getStatusBadge(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#50504C] block text-[10px] uppercase">CANONICAL TYPE</span>
                  <span className="text-[#D6A83A] font-mono text-xs break-all">{selectedEvent.event_type}</span>
                </div>
                <div>
                  <span className="text-[#50504C] block text-[10px] uppercase">ACTOR</span>
                  <span className="text-[#F2F0EA] font-semibold">{selectedEvent.actor}</span>
                </div>
                <div>
                  <span className="text-[#50504C] block text-[10px] uppercase">ORIGIN SOURCE</span>
                  <span className="text-[#B0ADA5]">{selectedEvent.source}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#50504C] block text-[10px] uppercase">TIMESTAMP</span>
                  <span className="text-[#B0ADA5] font-mono text-[11px]">{selectedEvent.timestamp}</span>
                </div>
                {selectedEvent.formatted_amount && (
                  <div className="col-span-2">
                    <span className="text-[#50504C] block text-[10px] uppercase">FINANCIAL VALUE</span>
                    <span className="text-[#2FB36F] font-bold text-xs">{selectedEvent.formatted_amount}</span>
                    <span className="text-[10px] text-[#716F69] block">
                      Provenance: {selectedEvent.is_simulated ? 'SIMULATED (No real funds moved)' : 'ON-CHAIN VERIFIED'}
                    </span>
                  </div>
                )}
              </div>

              {/* Context Links */}
              {(selectedEvent.mission_id || selectedEvent.payment_intent_id || selectedEvent.correlation_id || selectedEvent.causation_id) && (
                <div className="space-y-2 p-3 rounded-xl bg-[#0B0B0B] border border-[#1A1A1A]">
                  <span className="text-[#50504C] block text-[10px] uppercase font-bold tracking-wider">
                    CORRELATION & CONTEXT
                  </span>
                  {selectedEvent.mission_id && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#716F69]">Mission ID:</span>
                      <Link href={`/missions/${selectedEvent.mission_id}`} className="text-[#D6A83A] hover:underline">
                        {selectedEvent.mission_id} →
                      </Link>
                    </div>
                  )}
                  {selectedEvent.payment_intent_id && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#716F69]">Payment ID:</span>
                      <Link href={`/payment-intents/${selectedEvent.payment_intent_id}`} className="text-[#D6A83A] hover:underline">
                        {selectedEvent.payment_intent_id} →
                      </Link>
                    </div>
                  )}
                  {selectedEvent.correlation_id && (
                    <div className="flex flex-col text-[11px]">
                      <span className="text-[#716F69]">Correlation ID:</span>
                      <span className="text-[#B0ADA5] font-mono break-all">{selectedEvent.correlation_id}</span>
                    </div>
                  )}
                  {selectedEvent.causation_id && (
                    <div className="flex flex-col text-[11px]">
                      <span className="text-[#716F69]">Causation ID:</span>
                      <span className="text-[#B0ADA5] font-mono break-all">{selectedEvent.causation_id}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Structured Metadata Inspector */}
              <div className="space-y-2">
                <span className="text-[#50504C] block text-[10px] uppercase font-bold tracking-wider">
                  METADATA & EXECUTION PAYLOAD
                </span>
                {Object.keys(selectedEvent.payload || {}).length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1A1A1A] text-[#50504C] text-center">
                    No structured metadata attached to this record.
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#1A1A1A] space-y-2 max-h-72 overflow-y-auto">
                    {Object.entries(selectedEvent.payload).map(([k, v]) => (
                      <div key={k} className="text-[11px] pb-1.5 border-b border-[#151515] last:border-0 last:pb-0">
                        <span className="text-[#716F69] font-mono block text-[10px] uppercase">{k}</span>
                        <div className="mt-0.5">{renderMetadataValue(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw Sanitized Event Inspector (Collapsible) */}
              <div className="pt-2 border-t border-[#1C1C1C] space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowRawEvent(!showRawEvent)}
                    className="text-[11px] text-[#B0ADA5] hover:text-[#F2F0EA] flex items-center gap-1.5 transition-colors"
                  >
                    <span>{showRawEvent ? '▼ Hide Raw Event' : '▶ View Raw Event'}</span>
                  </button>
                  {showRawEvent && (
                    <button
                      onClick={handleCopyRaw}
                      className="text-[10px] text-[#D6A83A] hover:underline"
                    >
                      {copiedRaw ? '✓ Copied' : 'Copy JSON'}
                    </button>
                  )}
                </div>

                {showRawEvent && (
                  <pre className="p-3 rounded-xl bg-[#060606] border border-[#1A1A1A] text-[10px] text-[#85827B] overflow-x-auto leading-relaxed max-h-64 font-mono">
                    {JSON.stringify(selectedEvent.raw_event || selectedEvent, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#716F69] text-xs space-y-2">
              <svg className="w-8 h-8 text-[#333333] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-[#A09E96] font-semibold">Select an activity event</div>
              <p className="text-[11px] text-[#50504C] max-w-xs mx-auto">
                Click any event in the flight log to inspect structured audit metadata, correlation traces, and causality.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
