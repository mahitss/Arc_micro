'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { operationsApi, OperationalReplay, ReplayTraceEntry } from '../../../../../lib/api/operations';

export default function OperationalReplayPage() {
  const params = useParams();
  const workflowId = (params?.workflowId as string) || 'wf_sec_audit_01';

  const [replay, setReplay] = useState<OperationalReplay | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplay();
  }, [workflowId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && replay && currentStepIdx < replay.entries.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIdx((prev) => prev + 1);
      }, 1500);
    } else if (isPlaying && replay && currentStepIdx >= replay.entries.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, replay]);

  async function loadReplay() {
    setLoading(true);
    try {
      const data = await operationsApi.getWorkflowReplay(workflowId);
      setReplay(data);
      setCurrentStepIdx(0);
    } catch (err) {
      console.error('Failed to load workflow replay', err);
    } finally {
      setLoading(false);
    }
  }

  const currentEntry: ReplayTraceEntry | undefined = replay?.entries[currentStepIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
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
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              OPERATIONAL REPLAY (INV-129)
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-3">
            Workflow Replay: <span className="font-mono text-indigo-400">{workflowId}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Deterministic step-by-step playback reconstructed from checkpoints and immutable audit logs.
            <strong className="text-amber-300 font-medium"> Strictly read-only: Replay cannot trigger side-effects or mutate state (INV-129).</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentStepIdx >= (replay?.entries.length || 1) - 1) {
                setCurrentStepIdx(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-colors flex items-center gap-2"
          >
            <span>{isPlaying ? '⏸ Pause' : '▶ Play Sequence'}</span>
          </button>
          <button
            onClick={() => setCurrentStepIdx(0)}
            className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Replay Controls & Timeline Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>STEP {currentStepIdx + 1} OF {replay?.entries.length || 0}</span>
          <span className="text-emerald-400 font-bold">
            STATUS: {replay?.final_state || 'COMPLETE'}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {replay?.entries.map((step, idx) => (
            <button
              key={step.step_id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(idx);
              }}
              className={`p-3 rounded-xl border text-left font-mono text-xs transition-all ${
                idx === currentStepIdx
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : idx < currentStepIdx
                  ? 'bg-slate-950 border-slate-700 text-slate-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">#{step.sequence}</span>
                <span className={`w-2 h-2 rounded-full ${idx <= currentStepIdx ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              </div>
              <div className="font-bold truncate mt-1">{step.step_type}</div>
              <div className="text-[10px] text-slate-400 truncate">{step.step_id}</div>
            </button>
          ))}
        </div>

        {/* Selected Step Details Card */}
        {currentEntry && (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-slate-500 text-[10px] uppercase">Step ID</span>
                <div className="text-base font-bold text-white">{currentEntry.step_id}</div>
              </div>
              <span className="px-2.5 py-1 rounded font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentEntry.state}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">WORKER ASSIGNED:</span>
                <span className="text-indigo-300 font-bold">{currentEntry.worker_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RECORDED TIMESTAMP:</span>
                <span className="text-slate-200">{new Date(currentEntry.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FINANCIAL BARRIER CHECK:</span>
                <span className="text-emerald-400 font-bold">
                  {currentEntry.financial_barrier_ok ? 'VERIFIED PASSED (INV-123)' : 'BLOCKED'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-500 text-[11px]">
              <span>Read-Only Guarantee: INV-129 Enforced</span>
              <span>Replayed At: {replay?.replayed_at ? new Date(replay.replayed_at).toLocaleTimeString() : '...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
