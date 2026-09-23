'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import EconomicRiskHeatmap from '@/components/EconomicRiskHeatmap';
import {
  CANONICAL_DEMO_SCENARIOS,
  SimulationScenario,
  SimulationRun,
  CounterfactualResponse,
  MonteCarloSummary,
  LiveExecutionPayload,
  createSimulation,
  runCounterfactual,
  runMonteCarlo,
  executePlan,
} from '@/lib/api/simulations';

export default function SimulatorPage() {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [budgetUsd, setBudgetUsd] = useState('5.00');
  const [deadlineSeconds, setDeadlineSeconds] = useState(600);
  const [failureProfile, setFailureProfile] = useState<string>('NO_FAILURE');
  const [priceMultiplier, setPriceMultiplier] = useState(1.0);
  const [isSwarm, setIsSwarm] = useState(false);
  const [policyThresholdUsd, setPolicyThresholdUsd] = useState('');

  // Simulation execution state
  const [isLoading, setIsLoading] = useState(false);
  const [currentRun, setCurrentRun] = useState<SimulationRun | null>(null);
  const [counterfactual, setCounterfactual] = useState<CounterfactualResponse | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloSummary | null>(null);
  const [livePayload, setLivePayload] = useState<LiveExecutionPayload | null>(null);
  const [staleError, setStaleError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trace' | 'heatmap' | 'counterfactual' | 'monte-carlo'>('trace');

  // Load selected scenario preset
  useEffect(() => {
    const sc = CANONICAL_DEMO_SCENARIOS[selectedScenarioIndex];
    if (sc) {
      setBudgetUsd((Number(sc.budget || '5000000') / 1e6).toFixed(2));
      setDeadlineSeconds(sc.deadline_seconds || 600);
      setFailureProfile(sc.failure_profile || 'NO_FAILURE');
      setIsSwarm(!!sc.is_swarm);
      setPriceMultiplier(sc.price_multiplier || 1.0);
      setPolicyThresholdUsd(sc.policy_threshold ? (Number(sc.policy_threshold) / 1e6).toFixed(2) : '');
    }
  }, [selectedScenarioIndex]);

  // Run baseline simulation on page load
  useEffect(() => {
    handleRunSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setStaleError(null);
    setLivePayload(null);

    const baseBudgetMicro = String(Math.round(parseFloat(budgetUsd || '5.00') * 1e6));
    const policyThreshMicro = policyThresholdUsd ? String(Math.round(parseFloat(policyThresholdUsd) * 1e6)) : undefined;

    const scenario: SimulationScenario = {
      name: CANONICAL_DEMO_SCENARIOS[selectedScenarioIndex]?.name || 'Custom Simulation',
      objective: CANONICAL_DEMO_SCENARIOS[selectedScenarioIndex]?.objective || 'Autonomous Economic Mission',
      budget: baseBudgetMicro,
      deadline_seconds: deadlineSeconds,
      agent_id: isSwarm ? 'orchestrator-agent' : 'research-agent',
      failure_profile: failureProfile as any,
      is_swarm: isSwarm,
      price_multiplier: priceMultiplier,
      policy_threshold: policyThreshMicro,
    };

    if (failureProfile === 'SERVICE_TIMEOUT') {
      scenario.injected_failures = [
        {
          step_id: 'step_research',
          failure_type: 'SERVICE_TIMEOUT',
          reason: 'Simulated 504 downstream gateway timeout on primary web search service',
        },
      ];
    }

    try {
      const run = await createSimulation(scenario, true);
      setCurrentRun(run);
    } catch (err: any) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCounterfactual = async () => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const res = await runCounterfactual(
        currentRun.id,
        { price_multiplier: 2.0 },
        'What happens if service prices surge 2x?'
      );
      setCounterfactual(res);
      setActiveTab('counterfactual');
    } catch (err: any) {
      console.error('Counterfactual error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMonteCarlo = async () => {
    if (!currentRun) return;
    setIsLoading(true);
    try {
      const res = await runMonteCarlo(currentRun.scenario, 50, 1337);
      setMonteCarlo(res);
      setActiveTab('monte-carlo');
    } catch (err: any) {
      console.error('Monte Carlo error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!currentRun) return;
    setIsLoading(true);
    setStaleError(null);
    setLivePayload(null);

    // If Scenario 7 is selected, simulate stale price change
    if (selectedScenarioIndex === 6) {
      setTimeout(() => {
        setIsLoading(false);
        setStaleError(
          'SIMULATION OUTDATED: re-simulation required before execution: service price changed for "Web Research & Intelligence API" (increased from $0.50 to $99.99 USDC)'
        );
      }, 500);
      return;
    }

    try {
      const res = await executePlan(currentRun.id);
      setLivePayload(res);
    } catch (err: any) {
      if (err.message && err.message.includes('SIMULATION OUTDATED')) {
        setStaleError(err.message);
      } else {
        setStaleError(`Plan Execution Guard Rejected: ${err.message || 'Environment assumptions changed'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              AP
            </div>
            <span className="font-bold tracking-tight text-lg text-white">AgentPay</span>
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-medium text-cyan-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            Digital Twin & Economic Simulator
          </span>
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            SIMULATION MODE — ZERO REAL TRANSACTIONS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunSimulation}
            disabled={isLoading}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-xs font-semibold text-black transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isLoading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
      </header>

      {/* Main Hero Layout: LEFT (Controls) | CENTER (DAG Graph) | RIGHT (Projected Impact) */}
      <main className="p-6 max-w-[1700px] mx-auto space-y-6">
        {/* Staleness / Outdated Alert Banner (Phase 24) */}
        {staleError && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-500/20 p-2 text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-300 tracking-wide uppercase">
                  SIMULATION OUTDATED — BLIND EXECUTION PREVENTED
                </h4>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">{staleError}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleRunSimulation}
                    className="rounded bg-rose-600 hover:bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition-colors"
                  >
                    Re-Simulate Fresh Reality
                  </button>
                  <span className="text-[11px] text-rose-300/80">
                    AgentPay Principle: NEVER execute stale autonomous plans. Reality changed since simulation.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Preparation Success Banner (Phase 23) */}
        {livePayload && (
          <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/30 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-emerald-300 tracking-wide uppercase">
                  PLAN REVALIDATED & PREPARED FOR LIVE ORCHESTRATION
                </h4>
                <p className="text-xs text-emerald-200/90 mt-1">
                  Plan ID <span className="font-mono">{livePayload.payload.plan_id}</span> re-checked against live service availability, Rust policy engine, and budget ceilings. Transitioning to mode <span className="font-mono font-bold text-white">{livePayload.mode}</span>.
                </p>
                <div className="mt-2 text-[11px] text-emerald-300/80 font-mono">
                  Live Cost: ${(Number(livePayload.payload.total_live_cost) / 1e6).toFixed(2)} USDC | Policy Decision: {livePayload.payload.policy_decision}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3-Column Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1 (LEFT): Scenario Configuration (3 cols) */}
          <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md space-y-4">
            <div className="border-b border-zinc-800/80 pb-3">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center justify-between">
                <span>Scenario Configuration</span>
                <span className="text-[10px] text-zinc-500 font-mono">Digital Twin</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Configure environment parameters & deterministic failure injections.</p>
            </div>

            {/* Scenario Preset Selector */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Preset Scenario</label>
              <select
                value={selectedScenarioIndex}
                onChange={(e) => setSelectedScenarioIndex(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none"
              >
                {CANONICAL_DEMO_SCENARIOS.map((sc, idx) => (
                  <option key={sc.id || idx} value={idx}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget & Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Budget ($)</label>
                <input
                  type="number"
                  step="0.10"
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Deadline (s)</label>
                <input
                  type="number"
                  value={deadlineSeconds}
                  onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Failure Profile */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">Failure Injection</label>
              <select
                value={failureProfile}
                onChange={(e) => setFailureProfile(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="NO_FAILURE">NO_FAILURE (Clean Execution)</option>
                <option value="SERVICE_TIMEOUT">SERVICE_TIMEOUT (Dynamic Recovery)</option>
                <option value="HIGH_RISK">HIGH_RISK (Approval Required)</option>
                <option value="BUDGET_EXHAUSTION">BUDGET_EXHAUSTION (Policy Rejection)</option>
                <option value="QUOTE_EXPIRY">QUOTE_EXPIRY (Quote Renegotiation)</option>
                <option value="LOW_QUALITY_RESULT">LOW_QUALITY_RESULT (Result Dispute)</option>
              </select>
            </div>

            {/* Swarm Mode & Price Multiplier */}
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-300 block">Multi-Agent Swarm</span>
                  <span className="text-[10px] text-zinc-500">6-Agent parallel DAG synthesis</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSwarm}
                  onChange={(e) => setIsSwarm(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500 focus:ring-0"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Price Multiplier</span>
                  <span className="font-mono text-cyan-400">{priceMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2 border-t border-zinc-800/80">
              <button
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-semibold text-black transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {isLoading ? 'Running Digital Twin...' : 'Run Simulation'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateCounterfactual}
                  disabled={isLoading || !currentRun}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 py-2 text-[11px] font-medium text-zinc-200 transition-colors disabled:opacity-50"
                >
                  Counterfactual
                </button>
                <button
                  onClick={handleRunMonteCarlo}
                  disabled={isLoading || !currentRun}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 py-2 text-[11px] font-medium text-zinc-200 transition-colors disabled:opacity-50"
                >
                  Monte Carlo (50)
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): Projected Mission / Swarm Execution Graph (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                  <span>Projected Execution Graph</span>
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                    {currentRun?.source_type || 'MISSION'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Deterministic task sequence validated via Kahn DAG scheduling
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-zinc-500 block">Snapshot Fingerprint</span>
                <span className="text-xs font-mono text-zinc-300">
                  {currentRun?.snapshot_version || 'fp_a79f120e'}
                </span>
              </div>
            </div>

            {/* Plan Steps Sequence */}
            <div className="space-y-3">
              {currentRun?.plan.steps && currentRun.plan.steps.length > 0 ? (
                currentRun.plan.steps.map((step, idx) => {
                  const costUsdc = (Number(step.estimated_cost) / 1e6).toFixed(2);
                  const isApproval = step.approval_required || step.policy_decision === 'APPROVAL_REQUIRED';
                  const isDeny = step.policy_decision === 'DENY';

                  return (
                    <div
                      key={step.step_id || idx}
                      className={`relative rounded-lg border p-3.5 transition-all ${
                        isDeny
                          ? 'border-rose-500/50 bg-rose-950/20'
                          : isApproval
                          ? 'border-amber-500/50 bg-amber-950/20'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-mono font-bold text-zinc-300">
                            {step.step_number}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-100">{step.service_name}</h4>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {step.step_id} • {step.capability}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-white block">
                            ${costUsdc} USDC
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ~{step.estimated_duration_ms}ms
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] border-t border-zinc-800/60 pt-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              step.policy_decision === 'ALLOW'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : step.policy_decision === 'APPROVAL_REQUIRED'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            Policy: {step.policy_decision}
                          </span>
                          <span className="text-zinc-500 text-[10px]">{step.policy_reason_code}</span>
                        </div>

                        <span className="text-zinc-400 text-[10px]">
                          Risk: <span className="font-semibold text-zinc-200">{step.risk_level}</span>
                        </span>
                      </div>

                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-zinc-500 font-mono">
                          Depends on: {step.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">No steps planned</div>
              )}
            </div>
          </div>

          {/* COLUMN 3 (RIGHT): Projected Economics & Exposure (4 cols) */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md space-y-4">
            <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Projected Outcomes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Derived strictly from policy ceilings</p>
              </div>
              <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                PROJECTED
              </span>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-[11px] text-zinc-500 block">Projected Spend</span>
                <span className="text-lg font-bold font-mono text-cyan-400 mt-0.5 block">
                  ${currentRun ? (Number(currentRun.economics.projected_spend) / 1e6).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Remaining: ${(Number(currentRun?.economics.remaining_budget || '0') / 1e6).toFixed(2)}
                </span>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-[11px] text-zinc-500 block">Max Exposure</span>
                <span className="text-lg font-bold font-mono text-amber-400 mt-0.5 block">
                  ${currentRun ? (Number(currentRun.exposure.maximum_exposure) / 1e6).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500">Formula: Budget limit ceiling</span>
              </div>
            </div>

            {/* Telemetry Breakdown */}
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Completion Projection</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {currentRun?.status === 'COMPLETED' ? 'SUCCESS' : currentRun?.status || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Payments</span>
                <span className="font-mono text-zinc-200">{currentRun?.economics.number_of_payments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Autonomous Agents</span>
                <span className="font-mono text-zinc-200">{currentRun?.economics.number_of_agents || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Approvals Required</span>
                <span className={`font-mono font-bold ${currentRun?.economics.approval_count ? 'text-amber-400' : 'text-zinc-200'}`}>
                  {currentRun?.economics.approval_count || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Projected Risk Score</span>
                <span className="font-mono font-bold text-zinc-200">
                  {currentRun?.economics.risk_score || 0}/100
                </span>
              </div>
            </div>

            {/* Why? Structured Explanation */}
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs">
              <h4 className="font-semibold text-zinc-200 mb-1">Why this outcome?</h4>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                {currentRun?.summary || 'Deterministic digital twin forecast calculated using production Rust policy engine rules and live quote boundaries.'}
              </p>
            </div>

            {/* Execute Plan Button (Phase 23) */}
            <div className="pt-2">
              <button
                onClick={handleExecutePlan}
                disabled={isLoading || !currentRun}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>EXECUTE THIS PLAN</span>
                <span className="text-[10px] font-normal text-emerald-200">(Guarded Revalidation)</span>
              </button>
              <span className="text-[10px] text-zinc-500 text-center block mt-1.5">
                Never executes blindly. Fresh policy, risk, quote staleness, and liquidity are revalidated.
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM TABS: Execution Trace | Economic Risk Heatmap | Counterfactual | Monte Carlo */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('trace')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'trace'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Execution Audit Trace ({currentRun?.trace.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === 'heatmap'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Economic Risk Heatmap
              </button>

              {counterfactual && (
                <button
                  onClick={() => setActiveTab('counterfactual')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'counterfactual'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Counterfactual What-If
                </button>
              )}

              {monteCarlo && (
                <button
                  onClick={() => setActiveTab('monte-carlo')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'monte-carlo'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Monte Carlo (50 Runs)
                </button>
              )}
            </div>

            <span className="text-[11px] text-zinc-500 font-mono">
              Mode: <span className="text-cyan-400">SIMULATION</span> (No Real Settlement)
            </span>
          </div>

          {/* TAB 1: Execution Trace */}
          {activeTab === 'trace' && (
            <div className="space-y-2">
              {currentRun?.trace && currentRun.trace.length > 0 ? (
                currentRun.trace.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-2.5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-[10px]">#{event.event_number}</span>
                      <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] text-cyan-400 border border-cyan-800">
                        PROJECTED
                      </span>
                      <span className="font-semibold text-zinc-200">{event.event_type}</span>
                      <span className="text-zinc-400 text-[11px]">{event.details}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {event.policy_decision && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            event.policy_decision === 'ALLOW' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {event.policy_decision}
                        </span>
                      )}
                      <span className="text-zinc-500 text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">No trace events recorded</div>
              )}
            </div>
          )}

          {/* TAB 2: Economic Risk Heatmap */}
          {activeTab === 'heatmap' && <EconomicRiskHeatmap />}

          {/* TAB 3: Counterfactual What-If Comparison */}
          {activeTab === 'counterfactual' && counterfactual && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <h4 className="text-sm font-bold text-white mb-1">
                  Perturbation: {counterfactual.comparison.perturbation_description}
                </h4>
                <p className="text-xs text-zinc-400">{counterfactual.comparison.explanation}</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Baseline Spend</span>
                    <span className="text-sm font-bold text-zinc-200">
                      ${(Number(counterfactual.comparison.baseline_spend) / 1e6).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Counterfactual Spend</span>
                    <span className="text-sm font-bold text-cyan-400">
                      ${(Number(counterfactual.comparison.counterfactual_spend) / 1e6).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Spend Delta</span>
                    <span className="text-sm font-bold text-amber-400">
                      {counterfactual.comparison.delta_spend} USDC
                    </span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Risk Differential</span>
                    <span className="text-sm font-bold text-zinc-200">
                      {counterfactual.comparison.risk_change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Monte Carlo Statistical Distribution */}
          {activeTab === 'monte-carlo' && monteCarlo && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-white">Deterministic Monte Carlo Forecast</h4>
                  <span className="text-[10px] text-zinc-400 font-mono">{monteCarlo.model_notice}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono mt-3">
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Completion Rate</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {(monteCarlo.completion_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">Average Spend</span>
                    <span className="text-sm font-bold text-cyan-400">${monteCarlo.average_spend}</span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">P50 Median</span>
                    <span className="text-sm font-bold text-zinc-200">${monteCarlo.p50_spend}</span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">P90 Tail</span>
                    <span className="text-sm font-bold text-amber-400">${monteCarlo.p90_spend}</span>
                  </div>
                  <div className="rounded border border-zinc-800 p-2.5 bg-zinc-950">
                    <span className="text-zinc-500 block text-[10px]">P95 Worst-Case</span>
                    <span className="text-sm font-bold text-rose-400">${monteCarlo.p95_spend}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
