'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ReplayStep {
  id: number;
  stage: string;
  timestamp: string;
  title: string;
  actor: string;
  domain: string;
  action: string;
  economicImpact: string;
  policyDecision: string;
  status: 'COMPLETED' | 'FAILED' | 'RECOVERING' | 'IN_PROGRESS';
  details: string;
  whyExplanation?: string;
  whyNotExplanation?: string[];
  financialBoundaryState: string;
}

const REPLAY_STEPS: ReplayStep[] = [
  {
    id: 1,
    stage: 'OBJECTIVE',
    timestamp: '12:04:01',
    title: 'Mission Objective Formulated',
    actor: 'Enterprise User',
    domain: 'OBJECTIVES',
    action: 'OBJECTIVE CREATED',
    economicImpact: 'Budget Ceiling: 25.00 USDC (Locked)',
    policyDecision: 'ALLOW (INV-140: User authorized mission)',
    status: 'COMPLETED',
    details: 'Autonomous Market Intelligence Mission instantiated. Objective: "Research the current AI infrastructure market, compare multiple providers, use specialized agents to analyze the evidence, stay within a fixed economic budget, recover automatically from provider failure, and produce a verified final report."',
    financialBoundaryState: 'Max budget envelope: 25.00 USDC. Private keys held by agent: 0.',
  },
  {
    id: 2,
    stage: 'PLANNING',
    timestamp: '12:04:04',
    title: 'Deterministic Plan & Simulation',
    actor: 'Primary Planner Agent',
    domain: 'PLANNING',
    action: 'SIMULATION COMPLETE',
    economicImpact: 'Projected exposure: 12.50 USDC (Worst case: 18.00 USDC)',
    policyDecision: 'PRE-FLIGHT PASS (Within liquidity buffer)',
    status: 'COMPLETED',
    details: 'Digital Twin simulation validates DAG with 3 specialized sub-agents: Market Researcher, Data Analyst, Synthesis & Verification Agent. Simulation confirms zero unauthorized financial broadcast capability.',
    financialBoundaryState: 'Uncommitted buffer: 75.00 USDC. Simulation broadcast strictly blocked (INV-156).',
  },
  {
    id: 3,
    stage: 'PROVIDER_SELECTION',
    timestamp: '12:04:07',
    title: 'Marketplace Discovery & Quoting',
    actor: 'Autonomous Matcher',
    domain: 'MARKETPLACE',
    action: 'PROVIDER SELECTED',
    economicImpact: 'Quote: 12.50 USDC committed to agent_fast_infer',
    policyDecision: 'ALLOW (Optimal utility within envelope)',
    status: 'COMPLETED',
    details: 'Discovered candidate providers: agent_fast_infer (12.50 USDC, 210ms), agent_budget_ai (14.00 USDC, 380ms), agent_ultra_deep (28.00 USDC, 890ms). Matcher selected agent_fast_infer.',
    whyExplanation: 'Selected because: capability match (ai.inference), budget fit (12.50 < 25.00 USDC), reliability (99.4%), latency (210ms), and policy compatibility.',
    whyNotExplanation: [
      'agent_ultra_deep: Budget envelope exceeded (28.00 USDC > 25.00 USDC cap)',
      'agent_budget_ai: Higher price ($14.00 vs $12.50) for primary compute task',
    ],
    financialBoundaryState: 'Contract ctr_intel_01 initiated. Funds unreserved pending execution gate.',
  },
  {
    id: 4,
    stage: 'FAILURE',
    timestamp: '12:04:19',
    title: 'Deterministic Provider Failure Injected',
    actor: 'Durable Runtime',
    domain: 'EXECUTION',
    action: 'PROVIDER FAILURE',
    economicImpact: 'Preserved Budget: 25.00 USDC (0.00 USDC lost)',
    policyDecision: 'SAFEGUARD (Payment not blindly retried)',
    status: 'FAILED',
    details: 'Provider agent_fast_infer failed to emit heartbeat within 2000ms lease ceiling. Worker process isolated. Runtime safely halts financial obligation. Zero funds transferred.',
    financialBoundaryState: 'Failed provider isolated. Remaining budget envelope 100% intact (25.00 USDC).',
  },
  {
    id: 5,
    stage: 'RECOVERY',
    timestamp: '12:04:24',
    title: 'Autonomous Replanning & Failover',
    actor: 'Mission Replanner',
    domain: 'RECOVERY',
    action: 'REPLANNING & PROVIDER REPLACED',
    economicImpact: 'Alternative Quote: 14.00 USDC (agent_budget_ai)',
    policyDecision: 'ALLOW (Failover within original 25.00 USDC cap)',
    status: 'RECOVERING',
    details: 'Autonomous recovery triggered without human intervention. Replanner evaluated secondary candidate agent_budget_ai. Swapped compute step while retaining upstream evidence and checkpoint state.',
    whyExplanation: 'Selected fallback agent_budget_ai: verified 98.2% historical reliability, 380ms latency, and fits comfortably within remaining $25.00 budget margin.',
    financialBoundaryState: 'Autonomy changed the operational plan, but the financial authority cap never changed.',
  },
  {
    id: 6,
    stage: 'PAYMENT',
    timestamp: '12:04:31',
    title: 'Policy Evaluation & Treasury Hold',
    actor: 'Rust Policy Engine',
    domain: 'GOVERNANCE',
    action: 'POLICY ALLOW & LIQUIDITY RESERVED',
    economicImpact: 'Atomic Hold: 14.00 USDC in AgentVault',
    policyDecision: 'ALLOW (Evaluated in 6.36 µs)',
    status: 'COMPLETED',
    details: 'Agent requested payout for completed deliverable. AgentPay evaluated deterministic policy: allowlist valid, velocity limit pass, budget envelope pass. Treasury placed atomic lock on $14.00 USDC.',
    financialBoundaryState: 'Agent never received private keys. Agent cannot alter recipient or calldata.',
  },
  {
    id: 7,
    stage: 'SETTLEMENT',
    timestamp: '12:04:35',
    title: 'Arc Settlement Consensus',
    actor: 'Execution Gate',
    domain: 'SETTLEMENT',
    action: 'SETTLEMENT EXECUTED',
    economicImpact: 'Settled: 14.00 USDC (Simulation / Operator-gated)',
    policyDecision: 'ALLOW (EIP-712 nonced execution)',
    status: 'COMPLETED',
    details: 'PaymentIntent pi_demo_intel_01 submitted to settlement pipeline. Consensus confirmed. Production broadcast remains operator-gated.',
    financialBoundaryState: 'Settlement reconciled across Ledger, Repository, AgentVault, and Arc consensus.',
  },
  {
    id: 8,
    stage: 'RESULT',
    timestamp: '12:04:37',
    title: 'Result Verification & Economic Memory',
    actor: 'Verification Agent',
    domain: 'VERIFICATION',
    action: 'RESULT VERIFIED & LEARNING UPDATED',
    economicImpact: 'Mission complete: 14.00 USDC spent, 11.00 USDC returned',
    policyDecision: 'COMPLETED (Audit trace finalized)',
    status: 'COMPLETED',
    details: 'Deliverable cryptographic SHA-256 hash verified. Autonomous Market Intelligence Report published. Economic memory updated: agent_fast_infer penalized for timeout; agent_budget_ai trust increased.',
    financialBoundaryState: 'Audit trace cryptographically closed. Unused 11.00 USDC headroom unlocked.',
  },
];

export default function MissionReplayPage() {
  const params = useParams();
  const missionId = (params?.id as string) || 'msn_market_intel_01';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = REPLAY_STEPS[currentIndex];

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(1000 / playbackSpeed, 400);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= REPLAY_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentIndex >= REPLAY_STEPS.length - 1 && !isPlaying) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 1, REPLAY_STEPS.length - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24">
      {/* Top Banner Navigation */}
      <section className="bg-[#080808] border-b border-[#222222] px-4 sm:px-6 lg:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[#716F69] font-semibold tracking-wider">MISSION:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                {missionId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#716F69] font-semibold tracking-wider">REPLAY STAGE:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                {currentStep.stage} ({currentIndex + 1} / {REPLAY_STEPS.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#716F69] font-semibold tracking-wider">STATUS:</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${
                currentStep.status === 'FAILED'
                  ? 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30'
                  : currentStep.status === 'RECOVERING'
                  ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                  : 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30'
              }`}>
                {currentStep.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/control"
              className="px-3 py-1.5 rounded-lg bg-[#151515] text-[#E5E2DA] hover:bg-[#1C1C1C] transition-colors border border-[#2A2A2A]"
            >
              &larr; Control Tower
            </Link>
            <Link
              href={`/missions/${missionId}`}
              className="px-3 py-1.5 rounded-lg bg-[#151515] text-[#E5E2DA] hover:bg-[#1C1C1C] transition-colors border border-[#2A2A2A]"
            >
              Live Mission View
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Hero Title & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#D6A83A]" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F2F0EA] font-mono">
                MISSION FAILURE & RECOVERY REPLAY
              </h1>
            </div>
            <p className="mt-1 text-[#B0ADA5] text-sm">
              Deterministic step-by-step playback of autonomous failure detection, plan adaptation, and financial containment.
            </p>
          </div>

          {/* VCR Style Replay Controls */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-2.5 flex items-center gap-2 shadow-lg">
            <button
              onClick={handleStepBack}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] disabled:opacity-40 text-[#F2F0EA] font-mono text-xs font-bold border border-[#2A2A2A] transition-colors"
              title="Step backward"
            >
              &larr; STEP
            </button>

            <button
              onClick={handlePlayPause}
              className="px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all bg-[#F2F0EA] hover:bg-white text-[#080808]"
            >
              {isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentIndex === REPLAY_STEPS.length - 1}
              className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] disabled:opacity-40 text-[#F2F0EA] font-mono text-xs font-bold border border-[#2A2A2A] transition-colors"
              title="Step forward"
            >
              STEP &rarr;
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#B0ADA5] font-mono text-xs border border-[#2A2A2A] transition-colors"
              title="Reset replay to step 1"
            >
              RESET
            </button>

            <div className="h-6 w-px bg-[#222222] mx-1" />

            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-[#716F69] text-[10px] uppercase mr-1">Speed:</span>
              {[0.5, 1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-[#141414] text-[#F2F0EA] border border-[#2D2D2D]'
                      : 'text-[#716F69] hover:text-[#F2F0EA] bg-[#0B0B0B]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Replay Timeline Progress Strip */}
        <section className="bg-[#101010] border border-[#222222] rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {REPLAY_STEPS.map((step, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(idx);
                  }}
                  className={`p-2.5 rounded-lg border text-left font-mono transition-all text-xs ${
                    isCurrent
                      ? 'bg-[#141414] border-[#D6A83A] text-[#F2F0EA]'
                      : isPast
                      ? 'bg-[#0B0B0B] border-[#222222] text-[#B0ADA5] hover:border-[#2D2D2D]'
                      : 'bg-[#080808] border-[#1A1A1A] text-[#50504C] hover:text-[#716F69]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold">0{step.id}</span>
                    <span className="text-[9px] text-[#716F69]">{step.timestamp}</span>
                  </div>
                  <div className="font-bold truncate text-[11px]">{step.stage}</div>
                  <div className="text-[10px] text-[#716F69] truncate mt-0.5">{step.action}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Current Replay Step Detail Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Stage Information (7 cols) */}
          <section className="lg:col-span-7 bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222222] pb-4">
              <div>
                <span className="text-xs font-mono text-[#D6A83A] font-bold uppercase tracking-wider">
                  STAGE {currentStep.id} OF {REPLAY_STEPS.length} &bull; {currentStep.timestamp}
                </span>
                <h2 className="text-xl font-bold font-mono text-[#F2F0EA] mt-1">
                  {currentStep.title}
                </h2>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                currentStep.status === 'FAILED'
                  ? 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30'
                  : currentStep.status === 'RECOVERING'
                  ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                  : 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30'
              }`}>
                {currentStep.status}
              </span>
            </div>

            <p className="text-sm text-[#B0ADA5] leading-relaxed font-sans">
              {currentStep.details}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                <span className="text-[#716F69] block text-[10px] uppercase">Actor</span>
                <strong className="text-[#F2F0EA] mt-0.5 block">{currentStep.actor}</strong>
              </div>
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                <span className="text-[#716F69] block text-[10px] uppercase">Domain & Action</span>
                <strong className="text-[#F2F0EA] mt-0.5 block">{currentStep.domain} &bull; {currentStep.action}</strong>
              </div>
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                <span className="text-[#716F69] block text-[10px] uppercase">Economic Impact</span>
                <strong className="text-[#D6A83A] mt-0.5 block">{currentStep.economicImpact}</strong>
              </div>
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                <span className="text-[#716F69] block text-[10px] uppercase">Policy Gate</span>
                <strong className="text-[#2FB36F] mt-0.5 block">{currentStep.policyDecision}</strong>
              </div>
            </div>

            {/* Why Panel (Section 6) */}
            {currentStep.whyExplanation && (
              <div className="p-4 bg-[#0B0B0B] border border-[#2FB36F]/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
                  <span className="text-xs font-mono font-bold text-[#2FB36F] uppercase tracking-wider">
                    WHY THIS DECISION? (STRUCTURED EXPLANATION)
                  </span>
                </div>
                <p className="text-xs text-[#B0ADA5] font-mono leading-relaxed pl-4">
                  {currentStep.whyExplanation}
                </p>
              </div>
            )}

            {/* Why Not Panel (Section 7) */}
            {currentStep.whyNotExplanation && (
              <div className="p-4 bg-[#0B0B0B] border border-[#D85C5C]/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D85C5C]" />
                  <span className="text-xs font-mono font-bold text-[#D85C5C] uppercase tracking-wider">
                    WHY NOT THE ALTERNATIVES?
                  </span>
                </div>
                <ul className="text-xs text-[#B0ADA5] font-mono space-y-1 pl-4 list-disc list-inside">
                  {currentStep.whyNotExplanation.map((whyNot, i) => (
                    <li key={i}>{whyNot}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Financial Authority Boundary Invariant (5 cols) */}
          <section className="lg:col-span-5 bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                  FINANCIAL AUTHORITY INVARIANT
                </h3>
                <p className="text-xs text-[#716F69]">Non-negotiable constitutional containment</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#2D2D2D] text-[10px] font-mono font-bold">
                ENFORCED
              </span>
            </div>

            <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl space-y-3 font-mono text-xs">
              <span className="text-[#D6A83A] font-bold block text-[11px] uppercase">
                Active Authority State at Stage {currentStep.id}:
              </span>
              <p className="text-[#B0ADA5] leading-relaxed font-sans text-xs">
                {currentStep.financialBoundaryState}
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <span className="text-[#716F69] text-[10px] uppercase font-bold block">
                Constitutional Guardrails Status:
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                  <span className="text-[#B0ADA5]">Agent Private Keys:</span>
                  <span className="text-[#2FB36F] font-bold">NEVER HELD</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                  <span className="text-[#B0ADA5]">Budget Expansion:</span>
                  <span className="text-[#2FB36F] font-bold">BLOCKED (CAP: 25.00 USDC)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                  <span className="text-[#B0ADA5]">Arbitrary Recipient:</span>
                  <span className="text-[#2FB36F] font-bold">BLOCKED</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg">
                  <span className="text-[#B0ADA5]">Arbitrary Calldata:</span>
                  <span className="text-[#2FB36F] font-bold">BLOCKED</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0B0B0B] rounded-xl border border-[#222222] text-[11px] font-mono text-[#716F69] space-y-1">
              <div className="text-[#F2F0EA] font-bold">The Core Thesis Demonstrated:</div>
              <div>&ldquo;Autonomy changes the plan. AgentPay controls the money. Arc settles authorized value.&rdquo;</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
