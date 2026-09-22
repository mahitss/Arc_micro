'use client';

import React, { useState } from 'react';

export interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  timestamp: string;
  payload: Record<string, any>;
}

interface AutonomousActivityStreamProps {
  events: ActivityEvent[];
  isLive?: boolean;
}

export function AutonomousActivityStream({ events, isLive = false }: AutonomousActivityStreamProps) {
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);

  const getEventBadge = (type: string) => {
    if (type.includes('created') || type.includes('planned')) {
      return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
    }
    if (type.includes('selected') || type.includes('discovered')) {
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    }
    if (type.includes('policy') || type.includes('allowed')) {
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    }
    if (type.includes('payment') || type.includes('executed')) {
      return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    }
    if (type.includes('blocked') || type.includes('denied') || type.includes('failed')) {
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-teal-400'}`} />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Autonomous Activity Stream
          </h2>
          {isLive && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-slate-500">
          {events.length} Event{events.length === 1 ? '' : 's'} Recorded
        </span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-slate-500 font-mono text-xs">
          Waiting for autonomous event telemetry...
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
          {events.map((evt) => (
            <div
              key={evt.id}
              onClick={() => setSelectedEvent(selectedEvent?.id === evt.id ? null : evt)}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEventBadge(evt.type)}`}>
                    {evt.type}
                  </span>
                  <span className="text-slate-400 text-[11px]">[{evt.actor}]</span>
                </div>
                <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{evt.id}</span>
              </div>

              {/* Collapsible raw payload inspector */}
              {selectedEvent?.id === evt.id && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                  <div className="text-[10px] text-slate-500 mb-1">EVENT PAYLOAD:</div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 overflow-x-auto text-[10px]">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
