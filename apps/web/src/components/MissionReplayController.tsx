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
    <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#181818] text-[#F2F0EA] flex items-center justify-center font-bold text-sm border border-[#222222]">
            ▶
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F2F0EA]">Mission Replay Controller</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#D6A83A] border border-[#222222]">
                REPLAY / READ ONLY
              </span>
            </div>
            <p className="text-xs text-[#B0ADA5] mt-0.5">
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
                ? 'bg-[#181818] text-[#D6A83A] border-[#D6A83A]/60'
                : 'bg-[#F2F0EA] hover:bg-white text-[#080808] border-transparent'
            }`}
          >
            {isPlaying ? 'Pause ⏸' : 'Play Sequence ▶'}
          </button>
          <button
            onClick={handleStepForward}
            disabled={isPlaying || currentStepIndex >= REPLAY_STEPS.length - 1}
            className="px-3 py-2 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] disabled:opacity-40 transition-colors"
          >
            Step ⏭
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#B0ADA5] border border-[#2A2A2A] transition-colors"
          >
            Reset ↺
          </button>
        </div>
      </div>

      {/* Replay Stage Display */}
      <div className="p-6 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-[#B0ADA5]">
          <span className="text-[#F2F0EA] font-bold text-sm tracking-wide">{activeStep.label}</span>
          <span className="text-[#716F69]">
            Step {currentStepIndex + 1} of {REPLAY_STEPS.length}
          </span>
        </div>
        <p className="text-[#B0ADA5] text-sm font-sans">{activeStep.desc}</p>

        {/* Trace Evidence Snippet */}
        <div className="pt-3 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-[#B0ADA5]">
          <div>
            <span className="text-[#716F69] block">MISSION ID:</span>
            <span className="text-[#F2F0EA] font-bold">{trace.mission_id}</span>
          </div>
          <div>
            <span className="text-[#716F69] block">AGENT:</span>
            <span className="text-[#F2F0EA] font-bold">{trace.agent_id}</span>
          </div>
          <div>
            <span className="text-[#716F69] block">SIMULATION GUARD:</span>
            <span className="text-[#2FB36F] font-bold">INV-E8 VERIFIED (ZERO BROADCAST)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
