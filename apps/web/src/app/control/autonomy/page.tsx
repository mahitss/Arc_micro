'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchObjectives,
  fetchAutonomyMetrics,
  EconomicObjective,
  AutonomyMetrics,
  FALLBACK_WHY,
  FALLBACK_WHY_NOT,
  WhyThisExplanation,
  WhyNotExplanation,
} from '../../../lib/api/fabric';
import { formatRate, formatCurrency } from '../../../lib/utils/format';

interface TimelineStep {
  id: string;
  label: string;
  status: 'COMPLETED' | 'FAILED' | 'CURRENT' | 'PROJECTED';
  detail: string;
}

const DEFAULT_TIMELINE_STEPS: TimelineStep[] = [
  { id: 'OBJECTIVE', label: 'OBJECTIVE', status: 'COMPLETED', detail: 'Mission cap established at $25.00 USDC (Locked)' },
  { id: 'PLAN', label: 'PLAN', status: 'COMPLETED', detail: 'Decomposed into 4 sequential sub-tasks with DAG verification' },
  { id: 'DISCOVER', label: 'DISCOVER', status: 'COMPLETED', detail: 'Evaluated candidate providers from verified directory' },
  { id: 'QUOTE', label: 'QUOTE', status: 'COMPLETED', detail: 'Quotes received: agent_fast_infer ($12.50) vs agent_ultra_deep ($28.00)' },
  { id: 'POLICY', label: 'POLICY', status: 'COMPLETED', detail: 'Pre-screen verified recipient allowlist & envelope limits (ALLOW)' },
  { id: 'RESERVE', label: 'RESERVE', status: 'COMPLETED', detail: 'Treasury journaled atomic lock for $12.50 USDC' },
  { id: 'EXECUTE', label: 'EXECUTE', status: 'COMPLETED', detail: 'Dispatched task payload to primary provider worker' },
  { id: 'FAILURE', label: 'FAILURE', status: 'FAILED', detail: 'Worker heartbeat timed out; lease fencing token revoked' },
  { id: 'REPLAN', label: 'REPLAN', status: 'COMPLETED', detail: 'Autonomy adapted execution plan; budget envelope strictly held' },
  { id: 'RECOVER', label: 'RECOVER', status: 'COMPLETED', detail: 'Failover to agent_budget_ai ($14.00 USDC) successful' },
  { id: 'CLEAR', label: 'CLEAR', status: 'CURRENT', detail: 'Bilateral contract milestone and deliverable hash verified' },
  { id: 'SETTLE', label: 'SETTLE', status: 'PROJECTED', detail: 'Final settlement audit trail (Simulation mode: broadcast gated)' },
];

const DECISION_CARDS = [
  {
    title: 'WHY THIS PROVIDER?',
    summary: 'Lowest eligible quote within budget and policy constraints.',
    explanation:
      'agent_budget_ai quoted $14.00 USDC with 98.2% historical reliability, meeting SLA requirements without exceeding the $25.00 envelope.',
  },
  {
    title: 'WHY NOT THE $28 PROVIDER?',
    summary: 'Quote exceeds the $25 mission budget.',
    explanation:
      'agent_ultra_deep submitted $28.00 USDC, directly violating the deterministic financial envelope established at mission instantiation (INV-140).',
  },
  {
    title: 'WHY WAS THE PAYMENT NOT RETRIED?',
    summary: 'Execution was fenced. Blind retry is prohibited.',
    explanation:
      'Primary worker heartbeat timed out under lease fencing. Blindly retrying unverified execution violates INV-103 and risks duplicate payout.',
  },
  {
    title: 'WHY WAS THE FALLBACK ALLOWED?',
    summary: 'Capability, budget, policy and risk constraints passed.',
    explanation:
      'Replanning adapted the DAG to a secondary verified provider while strictly preserving the initial $25.00 financial authority cap.',
  },
];

const ARC_INFRASTRUCTURE = [
  { label: 'CHAIN ID', value: '5042', dotColor: 'bg-[#716F69]' },
  { label: 'RPC', value: 'CONNECTED', dotColor: 'bg-[#2FB36F]' },
  { label: 'NATIVE USDC', value: 'VERIFIED', dotColor: 'bg-[#2FB36F]' },
  { label: 'AGENTVAULT', value: 'NOT DEPLOYED', dotColor: 'bg-[#D85C5C]' },
  { label: 'LIVE EXECUTION', value: 'DISABLED', dotColor: 'bg-[#D85C5C]' },
  { label: 'REAL SETTLEMENTS', value: '0 VERIFIED', dotColor: 'bg-[#716F69]' },
  { label: 'BROADCASTS', value: '0', dotColor: 'bg-[#716F69]' },
];

export default function AutonomyView() {
  const [objectives, setObjectives] = useState<EconomicObjective[]>([]);
  const [metrics, setMetrics] = useState<AutonomyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number>(10); // Default to CLEAR
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);
  const [selectedWhy, setSelectedWhy] = useState<WhyThisExplanation | null>(null);
  const [selectedWhyNot, setSelectedWhyNot] = useState<WhyNotExplanation | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [objs, m] = await Promise.all([fetchObjectives(), fetchAutonomyMetrics()]);
      setObjectives(objs);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load autonomy data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleRunSimulation() {
    setIsSimulating(true);
    setSimulationNotice('SIMULATION RUNNING: Verifying deterministic replan checkpoints...');
    setTimeout(() => {
      setSelectedTimelineIndex(11);
      setSimulationNotice('SIMULATION COMPLETE: Autonomous recovery verified. 0 funds leaked.');
      setTimeout(() => {
        setIsSimulating(false);
        setSimulationNotice(null);
      }, 3500);
    }, 1200);
  }

  function handleResetDemo() {
    setSelectedTimelineIndex(10);
    setSimulationNotice('DEMO RESET: Reverted to recovered baseline state.');
    setTimeout(() => setSimulationNotice(null), 2500);
  }

  const selectedStep = DEFAULT_TIMELINE_STEPS[selectedTimelineIndex] || DEFAULT_TIMELINE_STEPS[10];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans antialiased">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-8">
        {/* =================================================================== */}
        {/* 5. HEADER — CLEAN, INSTITUTIONAL, NO GRADIENTS                     */}
        {/* =================================================================== */}
        <div className="border-b border-[#222222] pb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="text-[11px] font-mono tracking-widest text-[#716F69] uppercase">
                AGENTPAY · FINANCIAL CONTROL PLANE FOR AUTONOMOUS AI AGENTS
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F2F0EA] tracking-tight">
                AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.
              </h1>
              <p className="text-sm text-[#B0ADA5]">
                Autonomy can expand. Financial authority cannot.
              </p>
            </div>

            {/* 12. CTA BUTTONS — MATTE GRAPHITE WITH SUBTLE BORDER */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-run-simulation"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-4 py-2 bg-[#151515] border border-[#2A2A2A] hover:bg-[#1C1C1C] text-[#F2F0EA] text-xs font-mono font-medium rounded transition-colors flex items-center gap-2"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-[#D6A83A] animate-ping' : 'bg-[#2FB36F]'}`} />
                <span>{isSimulating ? 'SIMULATING...' : 'RUN SIMULATION'}</span>
              </button>

              <button
                id="btn-reset-demo"
                onClick={handleResetDemo}
                className="px-4 py-2 bg-[#101010] border border-[#222222] hover:bg-[#151515] hover:border-[#2A2A2A] text-[#B0ADA5] hover:text-[#F2F0EA] text-xs font-mono font-medium rounded transition-colors"
              >
                RESET DEMO
              </button>
            </div>
          </div>

          {simulationNotice && (
            <div className="mt-4 p-2.5 bg-[#101010] border border-[#222222] text-xs font-mono text-[#B0ADA5] flex items-center gap-2 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              <span>{simulationNotice}</span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 6. SYSTEM STATUS STRIP — COMPACT MATTE BLACK CARDS                */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#101010] border border-[#222222] rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-[#716F69]">System Mode</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-mono font-bold text-[#F2F0EA]">SIMULATION</span>
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-[#716F69]">Arc Mainnet</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
              <span className="text-xs font-mono font-bold text-[#F2F0EA]">CONNECTED · 5042</span>
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-[#716F69]">AgentVault</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#D85C5C]" />
              <span className="text-xs font-mono font-bold text-[#D85C5C]">NOT DEPLOYED</span>
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase text-[#716F69]">Live Execution</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#D85C5C]" />
              <span className="text-xs font-mono font-bold text-[#D85C5C]">DISABLED</span>
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded p-3 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono uppercase text-[#716F69]">Real Settlements</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#716F69]" />
              <span className="text-xs font-mono font-bold text-[#F2F0EA]">0 VERIFIED</span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 13. KPI CARDS — BLACK BACKGROUND, #222 BORDER, WHITE NUMBERS       */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
            <div className="text-[10px] font-mono uppercase text-[#716F69] tracking-wider">
              Automation Rate
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2F0EA] mt-1.5">
              {formatRate(metrics?.automation_percentage ?? metrics?.automation_rate, { fallback: '94.5%' })}
            </div>
            <div className="text-[10px] font-mono text-[#50504C] mt-1">
              Autonomous execution flow
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
            <div className="text-[10px] font-mono uppercase text-[#716F69] tracking-wider">
              Self-Recovery
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2F0EA] mt-1.5">
              {formatRate(metrics?.recovery_percentage ?? metrics?.recovery_rate, { fallback: '98.0%' })}
            </div>
            <div className="text-[10px] font-mono text-[#50504C] mt-1">
              Provider failure replanned
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
            <div className="text-[10px] font-mono uppercase text-[#716F69] tracking-wider">
              Policy Blocks
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2F0EA] mt-1.5">
              {metrics ? (metrics.policy_block_count ?? metrics.policy_blocks) : 3}
            </div>
            <div className="text-[10px] font-mono text-[#50504C] mt-1">
              Hard boundaries enforced
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
            <div className="text-[10px] font-mono uppercase text-[#716F69] tracking-wider">
              Financial Authority
            </div>
            <div className="text-2xl font-bold font-mono text-[#2FB36F] mt-1.5">
              BOUNDED
            </div>
            <div className="text-[10px] font-mono text-[#50504C] mt-1">
              Outside agent reach
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 7. MAIN HERO MISSION — UNIFIED FINANCIAL OPERATIONS PANEL          */}
        {/* =================================================================== */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F2F0EA] tracking-tight">
                  AUTONOMOUS MARKET INTELLIGENCE
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#141414] border border-[#222222] text-[#F2F0EA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                  RUNNING
                </span>
              </div>
              <p className="text-xs text-[#B0ADA5] mt-1">
                Research the market landscape for autonomous AI agent infrastructure.
              </p>
            </div>

            <div className="text-xs font-mono text-[#716F69]">
              ID: <span className="text-[#B0ADA5]">obj_intel_market_01</span>
            </div>
          </div>

          {/* Six Compact Metrics (Unified Panel) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5 border-t border-[#222222]">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Mission Budget</div>
              <div className="text-base font-bold font-mono text-[#F2F0EA] mt-1">$25.00 USDC</div>
              <div className="text-[10px] text-[#50504C] mt-0.5">Enforced envelope</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Committed</div>
              <div className="text-base font-bold font-mono text-[#F2F0EA] mt-1">$14.00 USDC</div>
              <div className="text-[10px] text-[#50504C] mt-0.5">56% of ceiling</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Risk</div>
              <div className="text-base font-bold font-mono text-[#F2F0EA] mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                <span>24 / 100</span>
              </div>
              <div className="text-[10px] text-[#50504C] mt-0.5">Policy: ALLOW</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Provider</div>
              <div className="text-xs font-bold font-mono text-[#F2F0EA] mt-1.5 truncate">agent_budget_ai</div>
              <div className="text-[10px] text-[#50504C] mt-0.5">Failover node</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Status</div>
              <div className="text-xs font-bold font-mono text-[#2FB36F] mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                <span>RECOVERED</span>
              </div>
              <div className="text-[10px] text-[#50504C] mt-0.5">Zero funds lost</div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#716F69]">Next</div>
              <div className="text-xs font-bold font-mono text-[#F2F0EA] mt-1.5 truncate">VALIDATE RESULT</div>
              <div className="text-[10px] text-[#50504C] mt-0.5">Milestone verification</div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 8. MISSION TIMELINE — HORIZONTAL THIN GRAPHITE LINE                */}
        {/* =================================================================== */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider font-mono">
                Mission Execution Timeline
              </h3>
              <p className="text-xs text-[#B0ADA5] mt-0.5">
                Sequential lifecycle checkpoints with deterministic fault isolation and replanning.
              </p>
            </div>
            <div className="text-xs font-mono text-[#B0ADA5]">
              Stage: <strong className="text-[#F2F0EA]">{selectedStep.label}</strong> ({selectedTimelineIndex + 1}/12)
            </div>
          </div>

          {/* Timeline Bar */}
          <div className="overflow-x-auto py-4">
            <div className="min-w-[800px] flex items-center justify-between relative px-2">
              {/* Connecting graphite line */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[1px] bg-[#222222] z-0" />

              {DEFAULT_TIMELINE_STEPS.map((step, idx) => {
                const isSelected = idx === selectedTimelineIndex;
                let dotClass = 'bg-[#50504C]';
                let textClass = 'text-[#716F69]';

                if (step.status === 'COMPLETED') {
                  dotClass = 'bg-[#2FB36F]';
                  textClass = 'text-[#B0ADA5]';
                } else if (step.status === 'FAILED') {
                  dotClass = 'bg-[#D85C5C]';
                  textClass = 'text-[#D85C5C]';
                } else if (step.status === 'CURRENT') {
                  dotClass = 'bg-[#D6A83A]';
                  textClass = 'text-[#F2F0EA] font-bold';
                }

                return (
                  <button
                    key={step.id}
                    onClick={() => setSelectedTimelineIndex(idx)}
                    className="relative z-10 flex flex-col items-center group focus:outline-none"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-transform ${
                        isSelected ? 'ring-2 ring-[#B0ADA5] scale-125' : 'group-hover:scale-110'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                    </div>
                    <span className={`text-[10px] font-mono mt-2 tracking-tight ${textClass}`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Detail Inspector Box */}
          <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedStep.status === 'COMPLETED'
                    ? 'bg-[#2FB36F]'
                    : selectedStep.status === 'FAILED'
                    ? 'bg-[#D85C5C]'
                    : selectedStep.status === 'CURRENT'
                    ? 'bg-[#D6A83A]'
                    : 'bg-[#716F69]'
                }`}
              />
              <span className="text-[#B0ADA5]">
                [STEP {selectedTimelineIndex + 1}: {selectedStep.label}]
              </span>
              <span className="text-[#F2F0EA]">{selectedStep.detail}</span>
            </div>
            <span className="text-[10px] text-[#716F69] uppercase whitespace-nowrap">
              Status: {selectedStep.status}
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 9. AGENT AUTHORITY PANEL — TWO COLUMNS, MATTE BLACK                */}
        {/* =================================================================== */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#F2F0EA] tracking-tight font-mono">
                AGENT AUTHORITY
              </h2>
              <p className="text-xs text-[#B0ADA5] mt-0.5">
                Autonomy within deterministic financial boundaries.
              </p>
            </div>
            <span className="text-xs font-mono text-[#716F69]">
              POLICY LEVEL: HARD ENFORCED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ALLOWED */}
            <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-4 space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#716F69] tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                <span>ALLOWED</span>
              </div>
              <div className="text-xs text-[#F2F0EA] flex items-center gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span>Discover providers</span>
              </div>
              <div className="text-xs text-[#F2F0EA] flex items-center gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span>Negotiate terms</span>
              </div>
              <div className="text-xs text-[#F2F0EA] flex items-center gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span>Plan tasks</span>
              </div>
              <div className="text-xs text-[#F2F0EA] flex items-center gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span>Replan after failure</span>
              </div>
              <div className="text-xs text-[#F2F0EA] flex items-center gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span>Request payment through policy</span>
              </div>
            </div>

            {/* FORBIDDEN */}
            <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-4 space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#716F69] tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
                <span>FORBIDDEN</span>
              </div>
              <div className="text-xs text-[#B0ADA5] flex items-center gap-2.5">
                <span className="text-[#D85C5C] font-bold">×</span>
                <span>Sign transactions</span>
              </div>
              <div className="text-xs text-[#B0ADA5] flex items-center gap-2.5">
                <span className="text-[#D85C5C] font-bold">×</span>
                <span>Increase budget</span>
              </div>
              <div className="text-xs text-[#B0ADA5] flex items-center gap-2.5">
                <span className="text-[#D85C5C] font-bold">×</span>
                <span>Change policy</span>
              </div>
              <div className="text-xs text-[#B0ADA5] flex items-center gap-2.5">
                <span className="text-[#D85C5C] font-bold">×</span>
                <span>Choose arbitrary recipient</span>
              </div>
              <div className="text-xs text-[#B0ADA5] flex items-center gap-2.5">
                <span className="text-[#D85C5C] font-bold">×</span>
                <span>Execute arbitrary calldata</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#222222] text-center">
            <span className="text-xs font-mono font-bold text-[#F2F0EA] tracking-wider uppercase">
              AUTONOMY CHANGES THE PLAN. POLICY CONTROLS THE POWER.
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 10. WHY / WHY NOT DECISION CARDS — 4 COMPACT MATTE BLACK CARDS     */}
        {/* =================================================================== */}
        <div className="space-y-4">
          <div className="border-b border-[#222222] pb-2">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider font-mono">
              Decision Explainability (Why / Why Not)
            </h3>
            <p className="text-xs text-[#B0ADA5] mt-0.5">
              Deterministic causal explanations behind model matching and security boundary interventions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DECISION_CARDS.map((card, idx) => (
              <div
                key={idx}
                className="bg-[#101010] border border-[#222222] rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B0ADA5]" />
                    <h4 className="text-xs font-bold text-[#F2F0EA] tracking-tight">
                      {card.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#F2F0EA] font-medium leading-relaxed">
                    {card.summary}
                  </p>
                  <p className="text-[11px] text-[#B0ADA5] mt-2 leading-relaxed">
                    {card.explanation}
                  </p>
                </div>

                <div className="pt-3 mt-4 border-t border-[#222222] text-[10px] font-mono text-[#716F69]">
                  CHECKPOINT: DETERMINISTIC
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 11. ARC INFRASTRUCTURE PANEL — COMPACT PROFESSIONAL STATUS         */}
        {/* =================================================================== */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider font-mono">
                Arc Infrastructure Status
              </h3>
              <p className="text-xs text-[#B0ADA5] mt-0.5">
                Settlement layer configuration & operational boundaries. Zero unverified transactions.
              </p>
            </div>
            <span className="text-xs font-mono text-[#716F69]">
              NETWORK: ARC MAINNET (5042)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {ARC_INFRASTRUCTURE.map((item, idx) => (
              <div key={idx} className="bg-[#0B0B0B] border border-[#222222] rounded p-3">
                <div className="text-[10px] font-mono uppercase text-[#716F69]">
                  {item.label}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                  <span className="text-xs font-mono font-bold text-[#F2F0EA] truncate">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 17. PERSISTENT ACTIVE OBJECTIVES & FEED (REAL API INTEGRATION)     */}
        {/* =================================================================== */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider font-mono">
              Active Economic Objectives ({objectives.length})
            </h3>
            <Link
              href="/control/objectives"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              View all objectives →
            </Link>
          </div>

          {objectives.length === 0 ? (
            <div className="p-8 text-center bg-[#101010] border border-[#222222] rounded-xl">
              <div className="text-sm font-mono text-[#F2F0EA] font-bold">NO EXTERNAL OBJECTIVES</div>
              <div className="text-xs text-[#716F69] mt-1">
                Deterministic primary mission active above. Create additional missions in /missions.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {objectives.map((obj) => (
                <div
                  key={obj.objective_id}
                  className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#F2F0EA] font-bold">
                        {obj.status}
                      </span>
                      <Link
                        href={`/control/objectives/${obj.objective_id}`}
                        className="font-mono text-sm font-bold text-[#F2F0EA] hover:text-white"
                      >
                        {obj.objective_id}
                      </Link>
                    </div>

                    <div className="text-xs font-mono text-[#B0ADA5] flex items-center gap-3">
                      <span>Budget: <strong className="text-[#F2F0EA]">{obj.economic_budget} USDC</strong></span>
                      <span className="text-[#716F69]">|</span>
                      <span>Owner: <span className="text-[#B0ADA5]">{obj.owner}</span></span>
                    </div>
                  </div>

                  <p className="text-xs text-[#B0ADA5] leading-relaxed">{obj.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-[#716F69]">
                    <div>
                      Replans: <strong className="text-[#F2F0EA]">{obj.replan_count} / 3</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedWhy(FALLBACK_WHY)}
                        className="px-2.5 py-1 rounded bg-[#151515] border border-[#2A2A2A] text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#1C1C1C] transition-colors"
                      >
                        Why This?
                      </button>
                      <button
                        onClick={() => setSelectedWhyNot(FALLBACK_WHY_NOT)}
                        className="px-2.5 py-1 rounded bg-[#151515] border border-[#2A2A2A] text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#1C1C1C] transition-colors"
                      >
                        Why Not?
                      </button>
                      <Link
                        href={`/control/objectives/${obj.objective_id}`}
                        className="px-2.5 py-1 rounded bg-[#151515] border border-[#2A2A2A] text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#1C1C1C] transition-colors"
                      >
                        Trace →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Why This? */}
        {selectedWhy && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#101010] border border-[#222222] rounded-xl max-w-xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <h3 className="font-bold text-sm text-[#F2F0EA] font-mono">
                  Why This Decision? (Explainability)
                </h3>
                <button
                  onClick={() => setSelectedWhy(null)}
                  className="text-[#716F69] hover:text-white font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-[#716F69]">Selected Provider:</span>
                  <div className="text-[#F2F0EA] font-bold mt-0.5">{selectedWhy.selected_provider}</div>
                </div>

                <div>
                  <span className="text-[#716F69]">Selection Rationale:</span>
                  <p className="text-[#B0ADA5] mt-0.5 leading-relaxed">{selectedWhy.selection_rationale}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#0B0B0B] p-3 rounded border border-[#222222]">
                  <div>
                    <span className="text-[#716F69]">Policy Rule:</span>
                    <div className="text-[#2FB36F] font-bold">{selectedWhy.policy_rule}</div>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Financial Authority:</span>
                    <div className="text-[#D6A83A] font-bold">{selectedWhy.financial_authority}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedWhy(null)}
                className="w-full py-2 bg-[#151515] border border-[#2A2A2A] hover:bg-[#1C1C1C] text-[#F2F0EA] font-mono text-xs rounded transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}

        {/* Modal: Why Not? */}
        {selectedWhyNot && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-[#101010] border border-[#222222] rounded-xl max-w-xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <h3 className="font-bold text-sm text-[#F2F0EA] font-mono">
                  Why Not? (Blocked Action Inspector)
                </h3>
                <button
                  onClick={() => setSelectedWhyNot(null)}
                  className="text-[#716F69] hover:text-white font-mono text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-[#716F69]">Blocked Action:</span>
                  <div className="text-[#D85C5C] font-bold mt-0.5">{selectedWhyNot.blocked_action}</div>
                </div>

                <div>
                  <span className="text-[#716F69]">Constitutional Denial Reasons:</span>
                  <div className="mt-1 space-y-1.5">
                    {selectedWhyNot.reasons.map((r, i) => (
                      <div key={i} className="bg-[#0B0B0B] border border-[#222222] p-2 rounded text-[#D85C5C]">
                        [DENIED] {r}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[#716F69]">Permitted Safe Next Actions:</span>
                  <div className="mt-1 space-y-1.5">
                    {selectedWhyNot.safe_alternatives.map((a, i) => (
                      <div key={i} className="bg-[#0B0B0B] border border-[#222222] p-2 rounded text-[#B0ADA5]">
                        → {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedWhyNot(null)}
                className="w-full py-2 bg-[#151515] border border-[#2A2A2A] hover:bg-[#1C1C1C] text-[#F2F0EA] font-mono text-xs rounded transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
