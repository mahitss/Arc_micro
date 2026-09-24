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
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* Top Banner Navigation */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">MISSION:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {missionId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">REPLAY STAGE:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                {currentStep.stage} ({currentIndex + 1} / {REPLAY_STEPS.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">STATUS:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                currentStep.status === 'FAILED'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : currentStep.status === 'RECOVERING'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {currentStep.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/control"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              &larr; Control Tower
            </Link>
            <Link
              href={`/missions/${missionId}`}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Live Mission View
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Hero Title & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                MISSION FAILURE & RECOVERY REPLAY
              </h1>
            </div>
            <p className="mt-1 text-slate-400 text-sm">
              Deterministic step-by-step playback of autonomous failure detection, plan adaptation, and financial containment.
            </p>
          </div>

          {/* VCR Style Replay Controls */}
          <div className="bg-[#0e1626] border border-slate-700 rounded-xl p-2.5 flex items-center gap-2 shadow-lg">
            <button
              onClick={handleStepBack}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-mono text-xs font-bold transition-colors"
              title="Step backward"
            >
              &larr; STEP
            </button>

            <button
              onClick={handlePlayPause}
              className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
            </button>

            <button
              onClick={handleStepForward}
              disabled={currentIndex === REPLAY_STEPS.length - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-mono text-xs font-bold transition-colors"
              title="Step forward"
            >
              STEP &rarr;
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              title="Reset replay to step 1"
            >
              RESET
            </button>

            <div className="h-6 w-px bg-slate-700 mx-1" />

            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-slate-500 text-[10px] uppercase mr-1">Speed:</span>
              {[0.5, 1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Replay Timeline Progress Strip */}
        <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm">
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
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                      : isPast
                      ? 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      : 'bg-slate-950/40 border-slate-800/40 text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold">0{step.id}</span>
                    <span className="text-[9px] text-slate-500">{step.timestamp}</span>
                  </div>
                  <div className="font-bold truncate text-[11px]">{step.stage}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{step.action}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Current Replay Step Detail Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Stage Information (7 cols) */}
          <section className="lg:col-span-7 bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                  STAGE {currentStep.id} OF {REPLAY_STEPS.length} &bull; {currentStep.timestamp}
                </span>
                <h2 className="text-xl font-bold font-mono text-white mt-1">
                  {currentStep.title}
                </h2>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                currentStep.status === 'FAILED'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : currentStep.status === 'RECOVERING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {currentStep.status}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {currentStep.details}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block text-[10px] uppercase">Actor</span>
                <strong className="text-white mt-0.5 block">{currentStep.actor}</strong>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block text-[10px] uppercase">Domain & Action</span>
                <strong className="text-cyan-300 mt-0.5 block">{currentStep.domain} &bull; {currentStep.action}</strong>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block text-[10px] uppercase">Economic Impact</span>
                <strong className="text-amber-300 mt-0.5 block">{currentStep.economicImpact}</strong>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block text-[10px] uppercase">Policy Gate</span>
                <strong className="text-emerald-400 mt-0.5 block">{currentStep.policyDecision}</strong>
              </div>
            </div>

            {/* Why Panel (Section 6) */}
            {currentStep.whyExplanation && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    WHY THIS DECISION? (STRUCTURED EXPLANATION)
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 font-mono leading-relaxed pl-4">
                  {currentStep.whyExplanation}
                </p>
              </div>
            )}

            {/* Why Not Panel (Section 7) */}
            {currentStep.whyNotExplanation && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                    WHY NOT THE ALTERNATIVES?
                  </span>
                </div>
                <ul className="text-xs text-slate-300 font-mono space-y-1 pl-4 list-disc list-inside">
                  {currentStep.whyNotExplanation.map((whyNot, i) => (
                    <li key={i}>{whyNot}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Financial Authority Boundary Invariant (5 cols) */}
          <section className="lg:col-span-5 bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  FINANCIAL AUTHORITY INVARIANT
                </h3>
                <p className="text-xs text-slate-400">Non-negotiable constitutional containment</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-mono font-bold">
                ENFORCED
              </span>
            </div>

            <div className="p-4 bg-slate-900/90 border border-teal-500/20 rounded-xl space-y-3 font-mono text-xs">
              <span className="text-teal-400 font-bold block text-[11px] uppercase">
                Active Authority State at Stage {currentStep.id}:
              </span>
              <p className="text-slate-200 leading-relaxed font-sans text-xs">
                {currentStep.financialBoundaryState}
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Constitutional Guardrails Status:
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-300">Agent Private Keys:</span>
                  <span className="text-emerald-400 font-bold">NEVER HELD</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-300">Budget Expansion:</span>
                  <span className="text-emerald-400 font-bold">BLOCKED (CAP: 25.00 USDC)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-300">Arbitrary Recipient:</span>
                  <span className="text-emerald-400 font-bold">BLOCKED</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-slate-300">Arbitrary Calldata:</span>
                  <span className="text-emerald-400 font-bold">BLOCKED</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-white font-bold">The Core Thesis Demonstrated:</div>
              <div>&ldquo;Autonomy changes the plan. AgentPay controls the money. Arc settles authorized value.&rdquo;</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
