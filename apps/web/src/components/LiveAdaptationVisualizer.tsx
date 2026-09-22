'use client';

import React from 'react';
import { LearningTraceEntry, ReplanProposal } from '../lib/api/types';

interface LiveAdaptationVisualizerProps {
  trace?: LearningTraceEntry[];
  recoveryHistory?: ReplanProposal[];
  currentStatus?: string;
}

interface AdaptationStep {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
}

const ADAPTATION_STEPS: AdaptationStep[] = [
  { id: 'SERVICE_FAILED', label: 'SERVICE FAILED', sublabel: 'Timeout / Anomaly detected', icon: '⚠️' },
  { id: 'ANALYZING', label: 'ANALYZING', sublabel: 'Evaluating failure class', icon: '🔍' },
  { id: 'ALTERNATIVES_FOUND', label: '3 ALTERNATIVES', sublabel: 'Discovered candidate services', icon: '🌐' },
  { id: 'COMPARING', label: 'COMPARING', sublabel: 'Utility scoring & weights', icon: '⚖️' },
  { id: 'ALTERNATIVE_SELECTED', label: 'ALTERNATIVE SELECTED', sublabel: 'Optimal candidate chosen', icon: '🎯' },
  { id: 'POLICY_EVALUATION', label: 'POLICY', sublabel: 'Rust deterministic engine', icon: '🛡️' },
  { id: 'PAYMENT_AUTHORIZATION', label: 'PAYMENT', sublabel: 'Intent gate check', icon: '💳' },
  { id: 'MISSION_CONTINUE', label: 'CONTINUE', sublabel: 'Mission loop resumed', icon: '🚀' },
];

export function LiveAdaptationVisualizer({
  trace = [],
  recoveryHistory = [],
  currentStatus = 'EXECUTING',
}: LiveAdaptationVisualizerProps) {
  // Determine active step index based on latest trace entries
  const latestTrace = trace[trace.length - 1];
  const hasRecovery = recoveryHistory.length > 0;

  const determineActiveIndex = (): number => {
    if (!hasRecovery && trace.length === 0) {
      return -1; // No recovery in progress
    }
    if (!latestTrace) return 0;

    const stage = latestTrace.stage.toUpperCase();
    if (stage.includes('FAILED') || stage.includes('FAILURE')) return 0;
    if (stage.includes('ANALYZ') || stage.includes('EVALUAT')) return 1;
    if (stage.includes('DISCOVER') || stage.includes('ALTERNATIVE')) return 2;
    if (stage.includes('COMPAR') || stage.includes('RANK')) return 3;
    if (stage.includes('SELECT') || stage.includes('PROPOSAL')) return 4;
    if (stage.includes('POLICY')) return 5;
    if (stage.includes('PAYMENT') || stage.includes('AUTHORIZ')) return 6;
    if (stage.includes('CONTINU') || stage.includes('SUCCESS') || stage.includes('COMPLET')) return 7;

    return hasRecovery ? 7 : 0;
  };

  const activeIndex = determineActiveIndex();

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
      {/* Background glowing ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <h3 className="text-base font-semibold text-white tracking-wide">
              Live Autonomous Adaptation Pipeline
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              NON-INVASIVE AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time deterministic recovery progression without financial authority elevation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
              Recovery Status
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                hasRecovery ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {hasRecovery ? `ADAPTED (${recoveryHistory.length}x)` : 'NOMINAL'}
            </span>
          </div>
        </div>
      </div>

      {/* Flow Visualization */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 my-4">
        {ADAPTATION_STEPS.map((step, idx) => {
          let state: 'completed' | 'active' | 'pending' | 'idle' = 'idle';
          if (activeIndex >= 0) {
            if (idx < activeIndex) state = 'completed';
            else if (idx === activeIndex) state = 'active';
            else state = 'pending';
          }

          const isFailedStep = idx === 0 && (state === 'active' || state === 'completed');

          return (
            <div
              key={step.id}
              className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between ${
                state === 'active'
                  ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50 scale-[1.02]'
                  : state === 'completed'
                  ? 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-500 opacity-60'
              }`}
            >
              {/* Connector line between steps */}
              {idx < ADAPTATION_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-600 font-bold text-xs pointer-events-none">
                  →
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{step.icon}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      state === 'active'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                        : state === 'completed'
                        ? isFailedStep
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                </div>
                <h4
                  className={`text-xs font-bold font-mono tracking-tight ${
                    state === 'active'
                      ? 'text-cyan-200'
                      : state === 'completed'
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {step.sublabel}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono">
                <span
                  className={
                    state === 'active'
                      ? 'text-cyan-400 font-semibold'
                      : state === 'completed'
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                  }
                >
                  {state === 'active'
                    ? 'IN PROGRESS'
                    : state === 'completed'
                    ? 'DONE'
                    : 'AWAITING'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Latest Trace Details Box */}
      {latestTrace && (
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">[{latestTrace.stage}]</span>
            <span className="text-slate-300">{latestTrace.details}</span>
          </div>
          <div className="text-slate-500 text-[11px] flex-shrink-0">
            {new Date(latestTrace.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
