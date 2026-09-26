'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createMission, simulateMission, startMission } from '../../../lib/api/missions';
import { MissionSimulationResponse } from '../../../lib/api/types';

const PRESET_OBJECTIVES = [
  'Find the cheapest verified weather-data provider and obtain satellite meteorological telemetry.',
  'Stream real-time liquidity depth and calculate optimal routing on Arc decentralized exchanges.',
  'Audit external smart contract code and verify cryptographic signature bounds.',
  'Benchmark high-performance GPU inference clusters and execute embeddings.',
];

export default function NewMissionPage() {
  const router = useRouter();

  const [objective, setObjective] = useState('');
  const [budgetUsdc, setBudgetUsdc] = useState('5.00');
  const [deadlineMinutes, setDeadlineMinutes] = useState('15');
  const [agentId, setAgentId] = useState('research-agent');
  const [executionMode, setExecutionMode] = useState<'SIMULATION' | 'LIVE'>('SIMULATION');

  const [allowedCategories, setAllowedCategories] = useState<string[]>([
    'RESEARCH',
    'DATA',
    'COMPUTE',
    'VERIFICATION',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationResult, setSimulationResult] = useState<MissionSimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    if (allowedCategories.includes(cat)) {
      setAllowedCategories(allowedCategories.filter((c) => c !== cat));
    } else {
      setAllowedCategories([...allowedCategories, cat]);
    }
  };

  const handleSimulate = async () => {
    if (!objective.trim()) {
      setError('Please provide an economic objective.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setSimulationResult(null);

    const budgetBase = Math.round(parseFloat(budgetUsdc || '1') * 1000000).toString();

    try {
      const res = await simulateMission({
        objective,
        budget: budgetBase,
        agent_id: agentId,
        currency: 'USDC',
      });
      setSimulationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartMission = async () => {
    if (!objective.trim()) {
      setError('Please provide an economic objective.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const budgetBase = Math.round(parseFloat(budgetUsdc || '1') * 1000000).toString();

    try {
      const { mission } = await createMission({
        objective,
        budget: budgetBase,
        agent_id: agentId,
        currency: 'USDC',
        max_execution_amount: budgetBase,
      });

      // If live execution, trigger loop
      if (executionMode === 'LIVE') {
        await startMission(mission.id);
      }

      router.push(`/missions/${mission.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mission inception failed');
      setIsSubmitting(false);
    }
  };

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/missions"
          className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] flex items-center gap-1.5 transition-colors"
        >
          ← Back to Missions Roster
        </Link>
        <span className="text-xs font-mono text-[#716F69]">Autonomous Inception</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Incept Autonomous Mission</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#141414] text-[#D6A83A] border border-[#222222]">
            Phase 4: Mission Inception
          </span>
        </div>
        <p className="text-sm text-[#716F69] mt-1.5">
          Define an economic objective for an autonomous AI agent. The agent will discover providers, compare binding quotes, and coordinate spend under deterministic financial policy.
        </p>
      </div>

      {/* Form Container */}
      <div className="p-8 rounded-2xl bg-[#101010] border border-[#222222] shadow-sm space-y-6">
        {/* Preset Objective Chips */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-[#716F69] uppercase tracking-wider">
            QUICK PRESETS (CLICK TO POPULATE)
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_OBJECTIVES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setObjective(preset)}
                className="px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[11px] text-[#B0ADA5] hover:border-[#D6A83A] hover:text-[#F2F0EA] transition-colors text-left"
              >
                {preset.slice(0, 50)}...
              </button>
            ))}
          </div>
        </div>

        {/* Objective Input */}
        <div>
          <label className="block text-xs font-mono font-bold text-[#F2F0EA] mb-2 uppercase tracking-wider">
            ECONOMIC OBJECTIVE
          </label>
          <textarea
            rows={3}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. Find the cheapest verified weather-data provider and obtain satellite meteorological telemetry."
            className="w-full px-4 py-3 rounded-xl bg-[#0B0B0B] border border-[#222222] text-sm text-[#F2F0EA] placeholder:text-[#50504C] focus:outline-none focus:border-[#D6A83A] font-sans"
          />
        </div>

        {/* Budget & Agent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-[#B0ADA5] mb-1.5 uppercase">
              BUDGET CEILING (USDC)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-[#716F69] font-mono">$</span>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={budgetUsdc}
                onChange={(e) => setBudgetUsdc(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#222222] text-sm text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
              />
            </div>
            <span className="text-[10px] text-[#716F69] font-mono mt-1 block">Strict INV-E1 cap</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#B0ADA5] mb-1.5 uppercase">
              DEADLINE (MINUTES)
            </label>
            <input
              type="number"
              min="1"
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#222222] text-sm text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
            />
            <span className="text-[10px] text-[#716F69] font-mono mt-1 block">Auto-expires at deadline</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#B0ADA5] mb-1.5 uppercase">
              INITIATING AGENT
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0B0B] border border-[#222222] text-sm text-[#F2F0EA] font-mono focus:outline-none focus:border-[#D6A83A]"
            >
              <option value="research-agent">research-agent (Tier 1)</option>
              <option value="arbitrage-bot-1">arbitrage-bot-1 (Tier 2)</option>
              <option value="sec-audit-agent">sec-audit-agent (Security)</option>
            </select>
            <span className="text-[10px] text-[#716F69] font-mono mt-1 block">Keyless authorization</span>
          </div>
        </div>

        {/* Allowed Service Categories */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-[#B0ADA5] uppercase tracking-wider">
            ALLOWED SERVICE CATEGORIES (POLICY WHITELIST)
          </label>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            {['RESEARCH', 'DATA', 'COMPUTE', 'VERIFICATION', 'ORACLE', 'AI_MODELS'].map((cat) => {
              const isChecked = allowedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    isChecked
                      ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A] font-bold'
                      : 'bg-[#0B0B0B] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
                  }`}
                >
                  {isChecked ? '✓ ' : '+ '} {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution Mode Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-[#B0ADA5] uppercase tracking-wider">
            EXECUTION MODE
          </label>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setExecutionMode('SIMULATION')}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                executionMode === 'SIMULATION'
                  ? 'bg-[#141414] border-[#D6A83A] text-[#D6A83A]'
                  : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>⚡</span> SIMULATION MODE
              </div>
              <p className="text-[11px] text-[#716F69]">
                Dry-run verification. Zero real funds or blockchain state mutated (INV-E8).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExecutionMode('LIVE')}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                executionMode === 'LIVE'
                  ? 'bg-[#141414] border-[#D6A83A] text-[#F2F0EA]'
                  : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>🛡</span> LIVE AUTONOMOUS EXECUTION
              </div>
              <p className="text-[11px] text-[#716F69]">
                Executes via canonical PaymentIntent and Arc USDC settlement pipeline.
              </p>
            </button>
          </div>
        </div>

        {/* Mission Policy Summary Box */}
        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] text-xs font-mono space-y-2 text-[#716F69]">
          <div className="flex items-center justify-between text-[#F2F0EA] font-bold border-b border-[#222222] pb-1.5">
            <span>PRE-INCEPTION POLICY CHECK</span>
            <span className="text-[#2FB36F]">STATUS: READY</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>Budget Cap: <span className="text-[#F2F0EA]">${budgetUsdc}</span></div>
            <div>Agent: <span className="text-[#F2F0EA]">{agentId}</span></div>
            <div>Max Tx Limit: <span className="text-[#F2F0EA]">${budgetUsdc}</span></div>
            <div>Approval Req: <span className="text-[#F2F0EA]">{parseFloat(budgetUsdc) > 10 ? 'YES' : 'AUTO'}</span></div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
            Error: {error}
          </div>
        )}

        {/* Simulation Result Preview */}
        {simulationResult && (
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#222222] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
              <span className="text-[#F2F0EA] font-bold">DRY-RUN SIMULATION PROJECTION</span>
              <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#222222]">
                SIMULATION_ONLY: TRUE
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#716F69] text-[11px]">
              <div>Projected Spend: <span className="text-[#F2F0EA] font-bold">{formatUsdc(simulationResult.total_projected_spend)}</span></div>
              <div>Steps Approved: <span className="text-[#2FB36F] font-bold">{simulationResult.all_steps_approved ? 'ALL ALLOWED' : 'VIOLATIONS'}</span></div>
              <div>Candidates: <span className="text-[#F2F0EA]">{simulationResult.candidate_count}</span></div>
              <div>Human Approval: <span className="text-[#F2F0EA]">{simulationResult.requires_human_approval ? 'REQUIRED' : 'AUTO'}</span></div>
            </div>

            <div className="space-y-1.5 pt-1">
              {simulationResult.simulated_steps.map((st, i) => (
                <div key={i} className="p-2.5 rounded bg-[#141414] border border-[#222222] flex justify-between items-center text-[11px]">
                  <span>{st.step_id} ({st.required_capability}) → <span className="text-[#D6A83A]">{st.selected_service_id}</span></span>
                  <span className="text-[#2FB36F] font-bold">{st.policy_decision} ({formatUsdc(st.quoted_price)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            disabled={isSubmitting || !objective.trim()}
            onClick={handleSimulate}
            className="px-5 py-3 rounded-xl bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-semibold font-mono border border-[#222222] transition-colors disabled:opacity-50"
          >
            SIMULATE MISSION
          </button>
          <button
            type="button"
            disabled={isSubmitting || !objective.trim()}
            onClick={handleStartMission}
            className="px-6 py-3 rounded-xl bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Incepting Mission...' : 'START MISSION →'}
          </button>
        </div>
      </div>
    </div>
  );
}
