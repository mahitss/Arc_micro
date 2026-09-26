'use client';

import React, { useState, useEffect } from 'react';

interface AuditEvent {
  id: string;
  organization_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  resource_type: string;
  resource_id: string;
  request_id: string;
  correlation_id?: string;
  causation_id?: string;
  agent_id?: string;
  payment_intent_id?: string;
  version?: number;
  timestamp: string;
  metadata: string;
}

export default function EventsAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventType) params.set('event_type', eventType);
      if (paymentIntentId) params.set('payment_intent_id', paymentIntentId);
      if (agentId) params.set('agent_id', agentId);
      params.set('limit', '50');

      const res = await fetch(`/api/proxy/v1/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] flex items-center gap-3">
          <span className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-[#D6A83A]">
            📜
          </span>
          Immutable Audit Trail & Domain Events
        </h1>
        <p className="mt-1 text-sm text-[#716F69]">
          Append-only, causally correlated event store tracking every dollar and AI action across the complete financial lifecycle.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] flex flex-wrap items-center gap-4 text-xs font-mono">
        <input
          type="text"
          placeholder="Filter by Event Type (e.g. payment_intent.authorized)"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#50504C] focus:outline-none focus:border-[#D6A83A] flex-1 min-w-[200px]"
        />
        <input
          type="text"
          placeholder="Payment Intent ID"
          value={paymentIntentId}
          onChange={(e) => setPaymentIntentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#50504C] focus:outline-none focus:border-[#D6A83A]"
        />
        <input
          type="text"
          placeholder="Agent ID"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#50504C] focus:outline-none focus:border-[#D6A83A]"
        />
        <button
          onClick={fetchEvents}
          className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-semibold transition-colors"
        >
          Filter Events
        </button>
      </div>

      {/* Main Grid: Event Timeline + Selected Event Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-[#716F69] text-xs font-mono">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#101010] border border-[#222222] text-[#716F69] text-xs font-mono">
              No audit events found matching the specified filters.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEvent?.id === evt.id
                    ? 'bg-[#141414] border-[#D6A83A]'
                    : 'bg-[#101010] border-[#222222] hover:border-[#2D2D2D]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F0EA]">{evt.event_type}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#181818] border border-[#222222] text-[#D6A83A]">
                      {evt.actor_type}: {evt.actor_id}
                    </span>
                  </div>
                  <span className="text-[#716F69] text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-[#716F69]">
                  <div>
                    <span className="text-[#50504C]">Event ID: </span>
                    <span className="text-[#B0ADA5]">{evt.id}</span>
                  </div>
                  {evt.payment_intent_id && (
                    <div>
                      <span className="text-[#50504C]">Intent: </span>
                      <span className="text-[#D6A83A]">{evt.payment_intent_id}</span>
                    </div>
                  )}
                  {evt.correlation_id && (
                    <div>
                      <span className="text-[#50504C]">Corr ID: </span>
                      <span className="text-[#B0ADA5] truncate">{evt.correlation_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Event Detail Inspector */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#F2F0EA]">Event Detail Inspector</h2>
          {selectedEvent ? (
            <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[#716F69] text-[10px] uppercase tracking-wider">Event Type</span>
                <div className="text-[#F2F0EA] font-semibold text-sm">{selectedEvent.event_type}</div>
              </div>

              <div className="space-y-2 border-t border-[#222222] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Event ID:</span>
                  <span className="text-[#F2F0EA]">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Organization:</span>
                  <span className="text-[#F2F0EA]">{selectedEvent.organization_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Actor:</span>
                  <span className="text-[#F2F0EA]">{selectedEvent.actor_type} ({selectedEvent.actor_id})</span>
                </div>
                {selectedEvent.payment_intent_id && (
                  <div className="flex justify-between">
                    <span className="text-[#716F69]">Payment Intent:</span>
                    <span className="text-[#D6A83A]">{selectedEvent.payment_intent_id}</span>
                  </div>
                )}
                {selectedEvent.correlation_id && (
                  <div className="flex justify-between">
                    <span className="text-[#716F69]">Correlation ID:</span>
                    <span className="text-[#F2F0EA]">{selectedEvent.correlation_id}</span>
                  </div>
                )}
                {selectedEvent.request_id && (
                  <div className="flex justify-between">
                    <span className="text-[#716F69]">Request ID:</span>
                    <span className="text-[#F2F0EA]">{selectedEvent.request_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Timestamp:</span>
                  <span className="text-[#F2F0EA]">{new Date(selectedEvent.timestamp).toISOString()}</span>
                </div>
              </div>

              <div className="border-t border-[#222222] pt-3 space-y-1">
                <span className="text-[#716F69] text-[10px] uppercase tracking-wider">Structured Metadata</span>
                <pre className="p-3 rounded-lg bg-[#080808] border border-[#222222] text-[11px] text-[#F2F0EA] overflow-x-auto">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedEvent.metadata), null, 2);
                    } catch {
                      return selectedEvent.metadata;
                    }
                  })()}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#101010] border border-[#222222] text-center text-[#716F69] text-xs font-mono">
              Click on an event in the timeline to inspect its correlation IDs and payload.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
