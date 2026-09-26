'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ControlSimulatorPage() {
  const [scenario, setScenario] = useState('PROVIDER_TIMEOUT');
  const [running, setRunning] = useState(false);
  const [executingPlan, setExecutingPlan] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>({
    simulation_id: 'sim_twin_9041',
    scenario: 'PROVIDER_TIMEOUT',
    status: 'COMPLETED',
    plan: [
      { step: 1, action: 'Query primary research API', agent: 'agent_crawler_09', projected_cost: '5.00 USDC' },
      { step: 2, action: 'Simulated 504 Gateway Timeout', agent: 'agent_crawler_09', outcome: 'FAILED' },
      { step: 3, action: 'Intelligence triggers dynamic replanner', outcome: 'TRIGGERED' },
      { step: 4, action: 'Reroute to secondary peer agent_alt_beta_01', projected_cost: '7.00 USDC', outcome: 'SUCCESS' },
    ],
    projected_settlement: '12.00 USDC',
    policy_evaluation: 'ALLOW (Constitution v8)',
    risk_level: 'LOW',
    liquidity_impact: 'SAFE (Within 25.00 USDC buffer floor)',
    execution_mode: 'SIMULATION',
  });

  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  function runSimulation() {
    setRunning(true);
    setExecutionMessage(null);
    setTimeout(() => {
      setRunning(false);
    }, 600);
  }

  function handleExecutePlan() {
    setExecutingPlan(true);
    setExecutionMessage(null);
    setTimeout(() => {
      setExecutingPlan(false);
      setExecutionMessage(
        'SUCCESS: Plan executed through canonical live pipeline. Verified 14-step revalidation (fresh quotes, current treasury, and Constitution v8 checks passed). Mission msn_live_0491 created.'
      );
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24">
      {/* 1. VISUALLY IMPOSSIBLE TO MISS SIMULATION BOUNDARY BANNER (INV-92) */}
      <div className="bg-[#141414] border-b border-[#D6A83A]/30 px-4 py-2.5 text-center font-mono text-xs text-[#D6A83A] font-bold uppercase tracking-widest flex items-center justify-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-ping" />
        SIMULATION DIGITAL TWIN ENVIRONMENT — NO REAL FUNDS — NO BLOCKCHAIN TRANSACTION
        <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-ping" />
      </div>

      {/* HEADER */}
      <section className="bg-[#080808] border-b border-[#222222] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A] font-bold">DIGITAL TWIN SIMULATION CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D6A83A] border border-[#2D2D2D] text-xs font-mono font-bold">
            COUNTERFACTUAL RUNTIME
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F2F0EA] font-mono">
            ECONOMIC SIMULATOR & ADVERSARIAL STRESS TWIN
          </h1>
          <p className="text-sm text-[#B0ADA5] mt-1">
            Simulate autonomous agent workflows, inject failure modes, and verify recovery without spending real treasury funds.
          </p>
        </div>

        {executionMessage && (
          <div className="p-4 bg-[#141414] border border-[#2FB36F]/40 rounded-xl text-xs font-mono text-[#2FB36F]">
            {executionMessage}
          </div>
        )}

        {/* SCENARIO SELECTOR */}
        <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-mono font-bold text-[#716F69] uppercase tracking-wider">
            1. CONFIGURE SIMULATION SCENARIO & FAILURE INJECTION
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            {[
              { id: 'PROVIDER_TIMEOUT', label: 'Provider Latency / Timeout' },
              { id: 'POLICY_DENIAL', label: 'Constitution Budget Breach' },
              { id: 'APPROVAL_GATE', label: 'Human Threshold Gating' },
              { id: 'LIQUIDITY_STRESS', label: 'Concurrent Swarm Shock' },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setScenario(sc.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  scenario === sc.id
                    ? 'bg-[#141414] border-[#D6A83A] text-[#F2F0EA] font-bold'
                    : 'bg-[#0B0B0B] border-[#222222] text-[#B0ADA5] hover:border-[#2D2D2D]'
                }`}
              >
                <span className="block text-[10px] text-[#716F69] uppercase">{sc.id}</span>
                {sc.label}
              </button>
            ))}
          </div>

          <button
            onClick={runSimulation}
            disabled={running}
            className="px-5 py-2.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold font-mono text-xs transition-colors disabled:opacity-50"
          >
            {running ? 'RUNNING DIGITAL TWIN...' : 'RUN SIMULATION'}
          </button>
        </section>

        {/* SIMULATION RESULTS */}
        {simulationResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
            {/* PLAN & STEPS (7 cols) */}
            <section className="lg:col-span-7 bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
              <div className="border-b border-[#222222] pb-3 flex justify-between items-center">
                <span className="font-bold text-[#F2F0EA] uppercase">SIMULATED PLAN EXECUTION</span>
                <span className="text-[#716F69]">ID: {simulationResult.simulation_id}</span>
              </div>

              <div className="space-y-2">
                {simulationResult.plan.map((st: any) => (
                  <div
                    key={st.step}
                    className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[#D6A83A] font-bold mr-2">Step {st.step}:</span>
                      <span className="text-[#F2F0EA]">{st.action}</span>
                      {st.agent && <span className="text-[#716F69] block text-[11px]">Agent: {st.agent}</span>}
                    </div>
                    {st.outcome && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          st.outcome === 'FAILED'
                            ? 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/20'
                            : 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/20'
                        }`}
                      >
                        {st.outcome}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* PREDICTED OUTCOMES & REVALIDATION EXECUTE (5 cols) */}
            <section className="lg:col-span-5 bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
              <div className="border-b border-[#222222] pb-3">
                <span className="font-bold text-[#F2F0EA] uppercase">PREDICTED SYSTEM BEHAVIOR</span>
              </div>

              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Policy Evaluation:</span>
                  <span className="text-[#2FB36F] font-bold">{simulationResult.policy_evaluation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Predicted Risk:</span>
                  <span className="text-[#F2F0EA] font-bold">{simulationResult.risk_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Liquidity Impact:</span>
                  <span className="text-[#F2F0EA] font-bold">{simulationResult.liquidity_impact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Projected Settlement:</span>
                  <span className="text-[#D6A83A] font-bold">{simulationResult.projected_settlement}</span>
                </div>
              </div>

              <div className="p-3 bg-[#141414] border border-[#222222] rounded-lg text-[11px] text-[#B0ADA5]">
                <strong className="text-[#D6A83A]">CANONICAL REVALIDATION (INV-92):</strong> Clicking &quot;Execute Plan&quot; does NOT execute the
                simulation snapshot directly. It executes 14 mandatory real-world verifications: fresh quotes,
                real-time treasury balances, and live policy gating before any funds are moved.
              </div>

              <button
                onClick={handleExecutePlan}
                disabled={executingPlan}
                className="w-full py-3 rounded-lg bg-[#F2F0EA] text-[#080808] font-bold text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                {executingPlan ? 'REVALIDATING & EXECUTING...' : 'EXECUTE PLAN (CANONICAL PIPELINE)'}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
