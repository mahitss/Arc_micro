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
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
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
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Mission Flight Trace</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Audit Flight Recorder
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Complete cryptographic audit timeline for autonomous agent execution.
            Proves that zero payments bypass the canonical AgentPay security and policy gate.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
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
          className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono text-xs font-semibold border border-slate-700 transition-colors"
        >
          Load Trace
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading immutable mission flight log...
        </div>
      ) : trace ? (
        <div className="space-y-8">
          {/* Mission Meta Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {trace.status}
                </span>
                <span className="font-mono text-xs text-white font-bold">{trace.mission_id}</span>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Agent: <span className="text-teal-300">{trace.agent_id}</span>
              </span>
            </div>

            <div className="text-sm text-slate-200">{trace.objective}</div>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs pt-1">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BUDGET</span>
                <span className="text-white font-bold">{formatUsdc(trace.budget)}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SPENT</span>
                <span className="text-teal-300 font-bold">{formatUsdc(trace.spent)}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">REMAINING</span>
                <span className="text-emerald-400 font-bold">{formatUsdc(trace.remaining)}</span>
              </div>
            </div>
          </div>

          {/* Interactive Read-Only Mission Replay */}
          <MissionReplayController trace={trace} />

          {/* Chronological Event Flight Path */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Execution Flight Path</h2>
            <div className="relative pl-6 border-l border-teal-500/30 space-y-6">
              {trace.events.map((evt, idx) => (
                <div key={evt.id} className="relative space-y-1">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-teal-400" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
                    <span className="text-teal-300 font-bold text-sm">{evt.type}</span>
                    <span className="text-slate-500">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">Actor: {evt.actor}</div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
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
