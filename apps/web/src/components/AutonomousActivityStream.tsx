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
      return 'bg-[#141414] text-[#B0ADA5] border border-[#222222]';
    }
    if (type.includes('selected') || type.includes('discovered')) {
      return 'bg-[#141414] text-[#D6A83A] border border-[#222222]';
    }
    if (type.includes('policy') || type.includes('allowed')) {
      return 'bg-[#141414] text-[#2FB36F] border border-[#222222]';
    }
    if (type.includes('payment') || type.includes('executed')) {
      return 'bg-[#141414] text-[#F2F0EA] border border-[#222222]';
    }
    if (type.includes('blocked') || type.includes('denied') || type.includes('failed')) {
      return 'bg-[#141414] text-[#D85C5C] border border-[#222222]';
    }
    return 'bg-[#141414] text-[#716F69] border border-[#222222]';
  };

  return (
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
      <div className="flex items-center justify-between border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-[#2FB36F] animate-ping' : 'bg-[#D6A83A]'}`} />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Autonomous Activity Stream
          </h2>
          {isLive && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#2FB36F] border border-[#222222]">
              LIVE
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-[#85827B]">
          {events.length} Event{events.length === 1 ? '' : 's'} Recorded
        </span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-[#85827B] font-mono text-xs">
          Waiting for autonomous event telemetry...
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
          {events.map((evt) => (
            <div
              key={evt.id}
              onClick={() => setSelectedEvent(selectedEvent?.id === evt.id ? null : evt)}
              className="p-3 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#2D2D2D] cursor-pointer transition-all space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[#85827B] text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEventBadge(evt.type)}`}>
                    {evt.type}
                  </span>
                  <span className="text-[#716F69] text-[11px]">[{evt.actor}]</span>
                </div>
                <span className="text-[10px] text-[#50504C] truncate max-w-[120px]">{evt.id}</span>
              </div>

              {/* Collapsible raw payload inspector */}
              {selectedEvent?.id === evt.id && (
                <div className="pt-2 border-t border-[#222222] text-[11px] text-[#B0ADA5]">
                  <div className="text-[10px] text-[#85827B] mb-1">EVENT PAYLOAD:</div>
                  <pre className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] overflow-x-auto text-[10px]">
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
