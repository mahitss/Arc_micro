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
    <div className="rounded-xl bg-[#101010] border border-[#222222] p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D6A83A]"></span>
            </span>
            <h3 className="text-base font-semibold text-[#F2F0EA] tracking-wide">
              Live Autonomous Adaptation Pipeline
            </h3>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-[#181818] text-[#B0ADA5] border border-[#2D2D2D]">
              NON-INVASIVE AI
            </span>
          </div>
          <p className="text-xs text-[#B0ADA5] mt-1">
            Real-time deterministic recovery progression without financial authority elevation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-[#716F69] uppercase tracking-wider block font-mono">
              Recovery Status
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                hasRecovery ? 'text-[#D6A83A]' : 'text-[#2FB36F]'
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
              className={`relative rounded-lg p-3.5 border transition-all duration-200 flex flex-col justify-between ${
                state === 'active'
                  ? 'bg-[#181818] border-[#D6A83A] ring-1 ring-[#D6A83A]/30'
                  : state === 'completed'
                  ? 'bg-[#141414] border-[#222222] text-[#B0ADA5]'
                  : 'bg-[#101010]/60 border-[#1A1A1A] text-[#716F69] opacity-60'
              }`}
            >
              {/* Connector line between steps */}
              {idx < ADAPTATION_STEPS.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#50504C] font-bold text-xs pointer-events-none">
                  →
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{step.icon}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      state === 'active'
                        ? 'bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30'
                        : state === 'completed'
                        ? isFailedStep
                          ? 'bg-[#D85C5C]/15 text-[#D85C5C] border border-[#D85C5C]/30'
                          : 'bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30'
                        : 'bg-[#181818] text-[#716F69] border border-[#222222]'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                </div>
                <h4
                  className={`text-xs font-bold font-mono tracking-tight ${
                    state === 'active'
                      ? 'text-[#F2F0EA]'
                      : state === 'completed'
                      ? 'text-[#F2F0EA]'
                      : 'text-[#716F69]'
                  }`}
                >
                  {step.label}
                </h4>
                <p className="text-[11px] text-[#716F69] mt-1 line-clamp-2 leading-tight">
                  {step.sublabel}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] font-mono">
                <span
                  className={
                    state === 'active'
                      ? 'text-[#D6A83A] font-semibold'
                      : state === 'completed'
                      ? 'text-[#2FB36F]'
                      : 'text-[#50504C]'
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
        <div className="mt-4 p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#D6A83A] font-bold">[{latestTrace.stage}]</span>
            <span className="text-[#B0ADA5]">{latestTrace.details}</span>
          </div>
          <div className="text-[#716F69] text-[11px] flex-shrink-0">
            {new Date(latestTrace.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
