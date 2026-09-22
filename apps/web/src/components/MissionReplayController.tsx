'use client';

import React, { useState, useEffect } from 'react';
import { MissionTrace } from '../lib/api/types';

interface MissionReplayControllerProps {
  trace: MissionTrace;
}

const REPLAY_STEPS = [
  { key: 'CREATED', label: '1. Objective Inception', desc: 'Mission objective received and budget ceiling locked' },
  { key: 'PLANNING', label: '2. Capability Decomposition', desc: 'Objective decomposed into ordered, budget-capped steps' },
  { key: 'DISCOVERING', label: '3. Service Discovery', desc: 'Registry queried for candidates matching capabilities' },
  { key: 'EVALUATING', label: '4. Quote Solicitation', desc: 'Time-bound cryptographic quotes requested from providers' },
  { key: 'SELECTING', label: '5. Economic Decision', desc: 'Multi-factor utility scored and top candidate selected' },
  { key: 'POLICY', label: '6. Rust Policy Evaluation', desc: 'Spending limit and whitelist verified deterministically' },
  { key: 'RISK', label: '7. Counterparty Risk Check', desc: 'Risk evaluated within permissible exposure thresholds' },
  { key: 'PAYMENT', label: '8. PaymentIntent Pipeline', desc: 'Treasury balance locked; canonical PaymentIntent created' },
  { key: 'ARC', label: '9. Arc USDC Settlement', desc: 'Keyless signer authorizes settlement to AgentVault on Arc' },
  { key: 'RESULT', label: '10. Result Sanitization', desc: 'Service payload validated; untrusted injection defenses active' },
  { key: 'COMPLETED', label: '11. Mission Complete', desc: 'Financial trace finalized and immutable audit record stored' },
];

export function MissionReplayController({ trace }: MissionReplayControllerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStepIndex < REPLAY_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleStepForward = () => {
    if (currentStepIndex < REPLAY_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const activeStep = REPLAY_STEPS[currentStepIndex];

  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-sm border border-teal-500/30">
            ▶
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Mission Replay Controller</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                REPLAY / READ ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive visual playback of the mission execution trace without mutating state.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded-lg font-bold border transition-colors ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
            }`}
          >
            {isPlaying ? 'Pause ⏸' : 'Play Sequence ▶'}
          </button>
          <button
            onClick={handleStepForward}
            disabled={isPlaying || currentStepIndex >= REPLAY_STEPS.length - 1}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50"
          >
            Step ⏭
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
          >
            Reset ↺
          </button>
        </div>
      </div>

      {/* Replay Stage Display */}
      <div className="p-6 rounded-xl bg-slate-950 border border-teal-500/30 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-teal-400 font-bold text-sm tracking-wide">{activeStep.label}</span>
          <span className="text-slate-500">
            Step {currentStepIndex + 1} of {REPLAY_STEPS.length}
          </span>
        </div>
        <p className="text-slate-300 text-sm">{activeStep.desc}</p>

        {/* Trace Evidence Snippet */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400">
          <div>
            <span className="text-slate-500 block">MISSION ID:</span>
            <span className="text-white font-bold">{trace.mission_id}</span>
          </div>
          <div>
            <span className="text-slate-500 block">AGENT:</span>
            <span className="text-teal-300 font-bold">{trace.agent_id}</span>
          </div>
          <div>
            <span className="text-slate-500 block">SIMULATION GUARD:</span>
            <span className="text-emerald-400 font-bold">INV-E8 VERIFIED (ZERO BROADCAST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
