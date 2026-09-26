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
    <div className="w-full space-y-6">
      <div className="max-w-[1600px] w-full mx-auto space-y-6">
          {/* Simulator Workspace Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#222222]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#8A8882] mb-1">
                <span>AgentPay</span>
                <span className="text-[#65635E]">/</span>
                <span className="text-[#F2F0EA] font-medium">Digital Twin & Economic Simulator</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#F2F0EA] uppercase font-mono">
                  DIGITAL TWIN & ECONOMIC SIMULATOR
                </h1>
                <span className="rounded bg-[#D6A83A]/10 border border-[#D6A83A]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#D6A83A] font-mono">
                  SIMULATION MODE — ZERO REAL TRANSACTIONS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="rounded-lg bg-[#F2F0EA] hover:bg-white px-4 py-2 text-xs font-semibold text-[#080808] font-mono transition-colors duration-150 disabled:opacity-50 shadow-sm"
              >
                {isLoading ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
          </div>
        {/* Staleness / Outdated Alert Banner (Phase 24) */}
        {staleError && (
          <div className="rounded-xl border border-[#D85C5C]/30 bg-[#141414] p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#101010] p-2 text-[#D85C5C]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#D85C5C] tracking-wide uppercase">
                  SIMULATION OUTDATED — BLIND EXECUTION PREVENTED
                </h4>
                <p className="text-xs text-[#D85C5C] mt-1 leading-relaxed">{staleError}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleRunSimulation}
                    className="rounded bg-[#151515] border border-[#2A2A2A] hover:bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-[#E5E2DA] transition-colors"
                  >
                    Re-Simulate Fresh Reality
                  </button>
                  <span className="text-[11px] text-[#D85C5C]/80">
                    AgentPay Principle: NEVER execute stale autonomous plans. Reality changed since simulation.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Preparation Success Banner (Phase 23) */}
        {livePayload && (
          <div className="rounded-xl border border-[#2FB36F]/30 bg-[#141414] p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#101010] p-2 text-[#2FB36F]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#2FB36F] tracking-wide uppercase">
                  PLAN REVALIDATED & PREPARED FOR LIVE ORCHESTRATION
                </h4>
                <p className="text-xs text-[#2FB36F] mt-1">
                  Plan ID <span className="font-mono">{livePayload.payload.plan_id}</span> re-checked against live service availability, Rust policy engine, and budget ceilings. Transitioning to mode <span className="font-mono font-bold text-white">{livePayload.mode}</span>.
                </p>
                <div className="mt-2 text-[11px] text-[#2FB36F]/80 font-mono">
                  Live Cost: ${(Number(livePayload.payload.total_live_cost) / 1e6).toFixed(2)} USDC | Policy Decision: {livePayload.payload.policy_decision}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3-Column Hero Grid: 28% Scenario | 42% Execution Graph | 30% Projected Outcomes */}
        <div className="grid grid-cols-1 xl:grid-cols-[28fr_42fr_30fr] gap-5 items-start">
          {/* COLUMN 1 (LEFT): Scenario Configuration (28%) */}
          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5 shadow-sm space-y-4">
            <div className="border-b border-[#222222] pb-3">
              <h2 className="text-sm font-semibold text-[#F2F0EA] tracking-wide uppercase flex items-center justify-between">
                <span>Scenario Configuration</span>
                <span className="text-[10px] text-[#716F69] font-mono">Digital Twin</span>
              </h2>
              <p className="text-xs text-[#716F69] mt-0.5">Configure environment parameters & deterministic failure injections.</p>
            </div>

            {/* Scenario Preset Selector */}
            <div>
              <label className="text-xs font-medium text-[#716F69] block mb-1.5">Preset Scenario</label>
              <select
                value={selectedScenarioIndex}
                onChange={(e) => setSelectedScenarioIndex(Number(e.target.value))}
                className="w-full rounded-lg border border-[#222222] bg-[#0B0B0B] px-3 py-2 text-xs text-[#F2F0EA] focus:border-[#D6A83A] focus:outline-none"
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
                <label className="text-xs font-medium text-[#716F69] block mb-1">Budget ($)</label>
                <input
                  type="number"
                  step="0.10"
                  value={budgetUsd}
                  onChange={(e) => setBudgetUsd(e.target.value)}
                  className="w-full rounded-lg border border-[#222222] bg-[#0B0B0B] px-3 py-2 text-xs text-[#F2F0EA] focus:border-[#D6A83A] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#716F69] block mb-1">Deadline (s)</label>
                <input
                  type="number"
                  value={deadlineSeconds}
                  onChange={(e) => setDeadlineSeconds(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#222222] bg-[#0B0B0B] px-3 py-2 text-xs text-[#F2F0EA] focus:border-[#D6A83A] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Failure Profile */}
            <div>
              <label className="text-xs font-medium text-[#716F69] block mb-1.5">Failure Injection</label>
              <select
                value={failureProfile}
                onChange={(e) => setFailureProfile(e.target.value)}
                className="w-full rounded-lg border border-[#222222] bg-[#0B0B0B] px-3 py-2 text-xs text-[#F2F0EA] focus:border-[#D6A83A] focus:outline-none"
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
            <div className="space-y-3 pt-2 border-t border-[#222222]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#B0ADA5] block">Multi-Agent Swarm</span>
                  <span className="text-[10px] text-[#716F69]">6-Agent parallel DAG synthesis</span>
                </div>
                <input
                  type="checkbox"
                  checked={isSwarm}
                  onChange={(e) => setIsSwarm(e.target.checked)}
                  className="h-4 w-4 rounded border-[#222222] bg-[#0B0B0B] text-[#D6A83A] focus:ring-0"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#716F69]">Price Multiplier</span>
                  <span className="font-mono text-[#D6A83A]">{priceMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#0B0B0B] rounded-lg appearance-none cursor-pointer accent-[#D6A83A]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2 border-t border-[#222222]">
              <button
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="w-full rounded-lg bg-[#F2F0EA] hover:bg-white py-2.5 text-xs font-semibold text-[#080808] font-mono transition-all disabled:opacity-50"
              >
                {isLoading ? 'Running Digital Twin...' : 'Run Simulation'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateCounterfactual}
                  disabled={isLoading || !currentRun}
                  className="rounded-lg border border-[#222222] bg-[#141414] hover:bg-[#181818] py-2 text-[11px] font-medium text-[#F2F0EA] font-mono transition-colors disabled:opacity-50"
                >
                  Counterfactual
                </button>
                <button
                  onClick={handleRunMonteCarlo}
                  disabled={isLoading || !currentRun}
                  className="rounded-lg border border-[#222222] bg-[#141414] hover:bg-[#181818] py-2 text-[11px] font-medium text-[#F2F0EA] font-mono transition-colors disabled:opacity-50"
                >
                  Monte Carlo (50)
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): Projected Mission / Swarm Execution Graph (42%) */}
          <div className="rounded-xl border border-[#252525] bg-[#101010] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#F2F0EA] tracking-wide uppercase flex items-center gap-2">
                  <span>Projected Execution Graph</span>
                  <span className="rounded bg-[#141414] px-1.5 py-0.5 text-[10px] font-mono text-[#B0ADA5] border border-[#222222]">
                    {currentRun?.source_type || 'MISSION'}
                  </span>
                </h3>
                <p className="text-xs text-[#716F69] mt-0.5">
                  Deterministic task sequence validated via Kahn DAG scheduling
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#716F69] block">Snapshot Fingerprint</span>
                <span className="text-xs font-mono text-[#B0ADA5]">
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
                      className={`relative rounded-lg border p-3.5 transition-colors duration-150 bg-[#0E0E0E] ${
                        isDeny
                          ? 'border-l-2 border-l-[#D85C5C] border-t-[#222222] border-r-[#222222] border-b-[#222222]'
                          : isApproval
                          ? 'border-l-2 border-l-[#D6A83A] border-t-[#222222] border-r-[#222222] border-b-[#222222]'
                          : step.policy_decision === 'ALLOW'
                          ? 'border-l-2 border-l-[#2FB36F] border-t-[#222222] border-r-[#222222] border-b-[#222222]'
                          : 'border-[#222222] hover:border-[#2D2D2D]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#141414] text-xs font-mono font-bold text-[#F2F0EA] border border-[#222222]">
                            {step.step_number}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-[#F2F0EA]">{step.service_name}</h4>
                            <span className="text-[10px] text-[#716F69] font-mono">
                              {step.step_id} • {step.capability}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-[#F2F0EA] block">
                            ${costUsdc} USDC
                          </span>
                          <span className="text-[10px] text-[#716F69] font-mono">
                            ~{step.estimated_duration_ms}ms
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] border-t border-[#222222] pt-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              step.policy_decision === 'ALLOW'
                                ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                                : step.policy_decision === 'APPROVAL_REQUIRED'
                                ? 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                                : 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                            }`}
                          >
                            Policy: {step.policy_decision}
                          </span>
                          <span className="text-[#716F69] text-[10px]">{step.policy_reason_code}</span>
                        </div>

                        <span className="text-[#716F69] text-[10px]">
                          Risk: <span className="font-semibold text-[#B0ADA5]">{step.risk_level}</span>
                        </span>
                      </div>

                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-[#716F69] font-mono">
                          Depends on: {step.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[#716F69]">No steps planned</div>
              )}
            </div>
          </div>

          {/* COLUMN 3 (RIGHT): Projected Economics & Exposure (30%) */}
          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5 shadow-sm space-y-4">
            <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#F2F0EA] tracking-wide uppercase">
                  Projected Outcomes
                </h3>
                <p className="text-xs text-[#716F69] mt-0.5">Derived strictly from policy ceilings</p>
              </div>
              <span className="rounded bg-[#D6A83A]/10 border border-[#D6A83A]/30 px-2 py-0.5 text-[10px] font-bold text-[#D6A83A]">
                PROJECTED
              </span>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-3">
                <span className="text-[11px] text-[#716F69] block">Projected Spend</span>
                <span className="text-lg font-bold font-mono text-[#F2F0EA] mt-0.5 block">
                  ${currentRun ? (Number(currentRun.economics.projected_spend) / 1e6).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-[#716F69]">
                  Remaining: ${(Number(currentRun?.economics.remaining_budget || '0') / 1e6).toFixed(2)}
                </span>
              </div>

              <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-3">
                <span className="text-[11px] text-[#716F69] block">Max Exposure</span>
                <span className="text-lg font-bold font-mono text-[#D6A83A] mt-0.5 block">
                  ${currentRun ? (Number(currentRun.exposure.maximum_exposure) / 1e6).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-[#716F69]">Formula: Budget limit ceiling</span>
              </div>
            </div>

            {/* Telemetry Breakdown */}
            <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#716F69]">Completion Projection</span>
                <span className="font-semibold text-[#2FB36F] font-mono">
                  {currentRun?.status === 'COMPLETED' ? 'SUCCESS' : currentRun?.status || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Total Payments</span>
                <span className="font-mono text-[#B0ADA5]">{currentRun?.economics.number_of_payments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Autonomous Agents</span>
                <span className="font-mono text-[#B0ADA5]">{currentRun?.economics.number_of_agents || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Approvals Required</span>
                <span className={`font-mono font-bold ${currentRun?.economics.approval_count ? 'text-[#D6A83A]' : 'text-[#B0ADA5]'}`}>
                  {currentRun?.economics.approval_count || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Projected Risk Score</span>
                <span className="font-mono font-bold text-[#B0ADA5]">
                  {currentRun?.economics.risk_score || 0}/100
                </span>
              </div>
            </div>

            {/* Why? Structured Explanation */}
            <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-3 text-xs">
              <h4 className="font-semibold text-[#B0ADA5] mb-1">Why this outcome?</h4>
              <p className="text-[#716F69] leading-relaxed text-[11px]">
                {currentRun?.summary || 'Deterministic digital twin forecast calculated using production Rust policy engine rules and live quote boundaries.'}
              </p>
            </div>

            {/* Execute Plan Button (Phase 23) */}
            <div className="pt-2">
              <button
                onClick={handleExecutePlan}
                disabled={isLoading || !currentRun}
                className="w-full rounded-lg bg-[#F2F0EA] hover:bg-white py-3 text-xs font-bold text-[#080808] font-mono transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>EXECUTE THIS PLAN</span>
                <span className="text-[10px] font-normal text-[#716F69]">(Guarded Revalidation)</span>
              </button>
              <span className="text-[10px] text-[#716F69] text-center block mt-1.5 font-mono">
                Never executes blindly. Fresh policy, risk, quote staleness, and liquidity are revalidated.
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM TABS: Execution Trace | Economic Risk Heatmap | Counterfactual | Monte Carlo */}
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b border-[#222222] pb-3 mb-4 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('trace')}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                  activeTab === 'trace'
                    ? 'bg-[#D6A83A] text-[#080808] font-bold'
                    : 'text-[#716F69] hover:text-[#F2F0EA] bg-[#141414] border border-[#222222]'
                }`}
              >
                Execution Audit Trace ({currentRun?.trace.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                  activeTab === 'heatmap'
                    ? 'bg-[#D6A83A] text-[#080808] font-bold'
                    : 'text-[#716F69] hover:text-[#F2F0EA] bg-[#141414] border border-[#222222]'
                }`}
              >
                Economic Risk Heatmap
              </button>

              {counterfactual && (
                <button
                  onClick={() => setActiveTab('counterfactual')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                    activeTab === 'counterfactual'
                      ? 'bg-[#D6A83A] text-[#080808] font-bold'
                      : 'text-[#716F69] hover:text-[#F2F0EA] bg-[#141414] border border-[#222222]'
                  }`}
                >
                  Counterfactual What-If
                </button>
              )}

              {monteCarlo && (
                <button
                  onClick={() => setActiveTab('monte-carlo')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                    activeTab === 'monte-carlo'
                      ? 'bg-[#D6A83A] text-[#080808] font-bold'
                      : 'text-[#716F69] hover:text-[#F2F0EA] bg-[#141414] border border-[#222222]'
                  }`}
                >
                  Monte Carlo (50 Runs)
                </button>
              )}
            </div>

            <span className="text-[11px] text-[#716F69] font-mono">
              Mode: <span className="text-[#D6A83A] font-bold">SIMULATION</span> (No Real Settlement)
            </span>
          </div>

          {/* TAB 1: Execution Trace */}
          {activeTab === 'trace' && (
            <div className="space-y-2">
              {currentRun?.trace && currentRun.trace.length > 0 ? (
                currentRun.trace.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between rounded-lg border border-[#222222] bg-[#0B0B0B] p-2.5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#716F69] text-[10px]">#{event.event_number}</span>
                      <span className="rounded bg-[#141414] px-1.5 py-0.5 text-[10px] text-[#B0ADA5] border border-[#222222]">
                        PROJECTED
                      </span>
                      <span className="font-semibold text-[#F2F0EA]">{event.event_type}</span>
                      <span className="text-[#716F69] text-[11px]">{event.details}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {event.policy_decision && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            event.policy_decision === 'ALLOW' ? 'text-[#2FB36F]' : 'text-[#D6A83A]'
                          }`}
                        >
                          {event.policy_decision}
                        </span>
                      )}
                      <span className="text-[#716F69] text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#716F69] font-mono">No trace events recorded</div>
              )}
            </div>
          )}

          {/* TAB 2: Economic Risk Heatmap */}
          {activeTab === 'heatmap' && <EconomicRiskHeatmap />}

          {/* TAB 3: Counterfactual What-If Comparison */}
          {activeTab === 'counterfactual' && counterfactual && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-4">
                <h4 className="text-sm font-bold text-[#F2F0EA] mb-1 font-mono">
                  Perturbation: {counterfactual.comparison.perturbation_description}
                </h4>
                <p className="text-xs text-[#716F69]">{counterfactual.comparison.explanation}</p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Baseline Spend</span>
                    <span className="text-sm font-bold text-[#F2F0EA]">
                      ${(Number(counterfactual.comparison.baseline_spend) / 1e6).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Counterfactual Spend</span>
                    <span className="text-sm font-bold text-[#F2F0EA]">
                      ${(Number(counterfactual.comparison.counterfactual_spend) / 1e6).toFixed(2)}
                    </span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Spend Delta</span>
                    <span className="text-sm font-bold text-[#D6A83A]">
                      {counterfactual.comparison.delta_spend} USDC
                    </span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Risk Differential</span>
                    <span className="text-sm font-bold text-[#B0ADA5]">
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
              <div className="rounded-lg border border-[#222222] bg-[#0B0B0B] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-[#F2F0EA] font-mono">Deterministic Monte Carlo Forecast</h4>
                  <span className="text-[10px] text-[#716F69] font-mono">{monteCarlo.model_notice}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono mt-3">
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Completion Rate</span>
                    <span className="text-sm font-bold text-[#2FB36F]">
                      {(monteCarlo.completion_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">Average Spend</span>
                    <span className="text-sm font-bold text-[#F2F0EA]">${monteCarlo.average_spend}</span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">P50 Median</span>
                    <span className="text-sm font-bold text-[#B0ADA5]">${monteCarlo.p50_spend}</span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">P90 Tail</span>
                    <span className="text-sm font-bold text-[#D6A83A]">${monteCarlo.p90_spend}</span>
                  </div>
                  <div className="rounded border border-[#222222] p-2.5 bg-[#101010]">
                    <span className="text-[#716F69] block text-[10px]">P95 Worst-Case</span>
                    <span className="text-sm font-bold text-[#D85C5C]">${monteCarlo.p95_spend}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
