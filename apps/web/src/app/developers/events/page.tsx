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
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            📜
          </span>
          Immutable Audit Trail & Domain Events
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Append-only, causally correlated event store tracking every dollar and AI action across the complete financial lifecycle.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono">
        <input
          type="text"
          placeholder="Filter by Event Type (e.g. payment_intent.authorized)"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 flex-1 min-w-[200px]"
        />
        <input
          type="text"
          placeholder="Payment Intent ID"
          value={paymentIntentId}
          onChange={(e) => setPaymentIntentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="Agent ID"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={fetchEvents}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
        >
          Filter Events
        </button>
      </div>

      {/* Main Grid: Event Timeline + Selected Event Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs font-mono">
              No audit events found matching the specified filters.
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEvent?.id === evt.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{evt.event_type}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300">
                      {evt.actor_type}: {evt.actor_id}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
                  <div>
                    <span className="text-slate-600">Event ID: </span>
                    <span className="text-slate-300">{evt.id}</span>
                  </div>
                  {evt.payment_intent_id && (
                    <div>
                      <span className="text-slate-600">Intent: </span>
                      <span className="text-teal-400">{evt.payment_intent_id}</span>
                    </div>
                  )}
                  {evt.correlation_id && (
                    <div>
                      <span className="text-slate-600">Corr ID: </span>
                      <span className="text-slate-300 truncate">{evt.correlation_id}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Event Detail Inspector */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Event Detail Inspector</h2>
          {selectedEvent ? (
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Event Type</span>
                <div className="text-white font-semibold text-sm">{selectedEvent.event_type}</div>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Event ID:</span>
                  <span className="text-slate-200">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Organization:</span>
                  <span className="text-slate-200">{selectedEvent.organization_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actor:</span>
                  <span className="text-slate-200">{selectedEvent.actor_type} ({selectedEvent.actor_id})</span>
                </div>
                {selectedEvent.payment_intent_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Intent:</span>
                    <span className="text-teal-400">{selectedEvent.payment_intent_id}</span>
                  </div>
                )}
                {selectedEvent.correlation_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Correlation ID:</span>
                    <span className="text-slate-200">{selectedEvent.correlation_id}</span>
                  </div>
                )}
                {selectedEvent.request_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Request ID:</span>
                    <span className="text-slate-200">{selectedEvent.request_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-200">{new Date(selectedEvent.timestamp).toISOString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Structured Metadata</span>
                <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] text-teal-300 overflow-x-auto">
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
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
              Click on an event in the timeline to inspect its correlation IDs and payload.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
