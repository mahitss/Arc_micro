'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchMissionTrace } from '../../lib/api/missions';
import { MissionTrace } from '../../lib/api/types';
import { MissionReplayController } from '../../components/MissionReplayController';

export default function TracePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#716F69] font-mono text-sm">
          Initializing flight recorder...
        </div>
      }
    >
      <TraceContent />
    </Suspense>
  );
}

function TraceContent() {
  const searchParams = useSearchParams();
  const initialMissionId = searchParams.get('mission_id') || 'msn_demo_weather_01';

  const [missionIdInput, setMissionIdInput] = useState(initialMissionId);
  const [trace, setTrace] = useState<MissionTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrace = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMissionTrace(id);
      setTrace(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrace(initialMissionId);
  }, [initialMissionId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionIdInput.trim()) return;
    loadTrace(missionIdInput.trim());
  };

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Mission Flight Trace</h1>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              Audit Flight Recorder
            </span>
          </div>
          <p className="text-sm text-[#B0ADA5] mt-1.5 max-w-2xl leading-relaxed">
            Complete cryptographic audit timeline for autonomous agent execution.
            Proves that zero payments bypass the canonical AgentPay security and policy gate.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#B0ADA5] bg-[#101010] px-3.5 py-2 rounded-lg border border-[#222222]">
          <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
          <span>INV-E12: Zero Payment Bypasses</span>
        </div>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={missionIdInput}
          onChange={(e) => setMissionIdInput(e.target.value)}
          placeholder="Enter Mission ID (e.g. msn_demo_weather_01)"
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-xs font-mono text-[#F2F0EA] placeholder:text-[#716F69] focus:outline-none focus:border-[#D6A83A]"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono text-xs font-semibold transition-colors"
        >
          Load Trace
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#D85C5C]/40 text-[#D85C5C] font-mono text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#716F69] font-mono text-sm">
          Loading immutable mission flight log...
        </div>
      ) : trace ? (
        <div className="space-y-8">
          {/* Mission Meta Banner */}
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-[#141414] text-[#2FB36F] border border-[#222222] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                  {trace.status}
                </span>
                <span className="font-mono text-xs text-[#F2F0EA] font-bold">{trace.mission_id}</span>
              </div>
              <span className="font-mono text-xs text-[#B0ADA5]">
                Agent: <span className="text-[#F2F0EA] font-semibold">{trace.agent_id}</span>
              </span>
            </div>

            <div className="text-sm text-[#B0ADA5]">{trace.objective}</div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs pt-1">
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">BUDGET</span>
                <span className="text-[#F2F0EA] font-bold text-sm mt-0.5 block">{formatUsdc(trace.budget)}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">SPENT</span>
                <span className="text-[#F2F0EA] font-bold text-sm mt-0.5 block">{formatUsdc(trace.spent)}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">REMAINING</span>
                <span className="text-[#2FB36F] font-bold text-sm mt-0.5 block">{formatUsdc(trace.remaining)}</span>
              </div>
            </div>
          </div>

          {/* Interactive Read-Only Mission Replay */}
          <MissionReplayController trace={trace} />

          {/* Chronological Event Flight Path */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Execution Flight Path</h2>
            <div className="relative pl-6 border-l border-[#222222] space-y-6">
              {trace.events.map((evt) => (
                <div key={evt.id} className="relative space-y-1.5">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#080808] border-2 border-[#D6A83A]" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                    <span className="text-[#F2F0EA] font-bold text-sm">{evt.type}</span>
                    <span className="text-[#716F69]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#B0ADA5]">Actor: {evt.actor}</div>
                  <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[11px] font-mono text-[#B0ADA5]">
                    <pre className="overflow-x-auto">{JSON.stringify(evt.payload, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
