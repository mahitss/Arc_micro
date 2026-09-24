'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface StageEvent {
  step: number;
  title: string;
  category: 'MARKETPLACE' | 'POLICY' | 'EXECUTION' | 'SECURITY_MOMENT' | 'SETTLEMENT';
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'BLOCKED';
  description: string;
  details?: Record<string, any>;
}

export default function MarketplaceDemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [securityAttackTriggered, setSecurityAttackTriggered] = useState(false);
  const [securityOutcome, setSecurityOutcome] = useState<string | null>(null);

  const stages: StageEvent[] = [
    {
      step: 1,
      title: 'Open Opportunity Created by Economic Fabric',
      category: 'MARKETPLACE',
      status: currentStep >= 1 ? 'COMPLETED' : 'PENDING',
      description: 'Objective "Analyze security posture of three infrastructure providers" creates authorized opportunity.',
      details: {
        opportunity_id: 'opp_sec_demo_01',
        capability: 'sec.smart_contract_audit',
        budget_cap: '50.00 USDC',
        deadline: '48h',
        requester: 'agent_ciso_bot',
      },
    },
    {
      step: 2,
      title: 'Provider Discovery (5 Found, 3 Valid)',
      category: 'MARKETPLACE',
      status: currentStep >= 2 ? 'COMPLETED' : 'PENDING',
      description: '5 candidate agents discovered via AgentPay Protocol v1; 2 filtered out due to capability mismatch.',
      details: {
        discovered_agents: 5,
        qualified_providers: [
          'agent_security_alpha (Smart Contract Auditor)',
          'agent_auditor_beta (ZK Proof Verifier)',
          'agent_sec_analyst_03 (Log Scanner)',
        ],
      },
    },
    {
      step: 3,
      title: 'Quotes Ingested & Evaluated',
      category: 'MARKETPLACE',
      status: currentStep >= 3 ? 'COMPLETED' : 'PENDING',
      description: 'Immutable quotes collected. Candidate ranking evaluated across 9 deterministic dimensions.',
      details: {
        quotes: [
          { provider: 'agent_security_alpha', price: '40.00 USDC', latency: '30m', history: '98.5% (N=142)' },
          { provider: 'agent_auditor_beta', price: '45.00 USDC', latency: '40m', history: '96.0% (N=88)' },
          { provider: 'agent_sec_analyst_03', price: '48.00 USDC', latency: '25m', history: '94.0% (N=50)' },
        ],
      },
    },
    {
      step: 4,
      title: 'WHY THIS PROVIDER? Panel Generated',
      category: 'MARKETPLACE',
      status: currentStep >= 4 ? 'COMPLETED' : 'PENDING',
      description: 'Deterministic tie-break selects agent_security_alpha as rank #1. Full mathematical rationale exposed.',
      details: {
        selected: 'agent_security_alpha',
        rationale: 'Lowest price (40.00 USDC) within risk envelope (score 10) with highest sample size (N=142).',
      },
    },
    {
      step: 5,
      title: 'Contract Minted & Durable Workflow Initiated',
      category: 'POLICY',
      status: currentStep >= 5 ? 'COMPLETED' : 'PENDING',
      description: 'Opportunity transitioned to AWARDED. Contract bound to policy snapshot. Operations OS starts workflow.',
      details: {
        contract_id: 'contract_mkt_demo_alpha',
        workflow_id: 'wf_mkt_exec_01',
        escrow_reserved: '40.00 USDC',
      },
    },
    {
      step: 6,
      title: 'Primary Provider Outage & Safe Fallback Re-routing',
      category: 'EXECUTION',
      status: currentStep >= 6 ? 'COMPLETED' : 'PENDING',
      description: 'Primary provider simulation encounters simulated worker failure. Marketplace Fallback hierarchy engages.',
      details: {
        primary_status: 'FAILED (Timeout / Worker crash)',
        fallback_selected: 'agent_auditor_beta (Rank #2)',
        revalidated_policy: 'PASS (45.00 USDC within 50.00 cap)',
      },
    },
    {
      step: 7,
      title: 'Result Submitted & Cryptographically Verified',
      category: 'EXECUTION',
      status: currentStep >= 7 ? 'COMPLETED' : 'PENDING',
      description: 'Fallback provider successfully completes deep security audit. Output verified via hash attestation.',
      details: {
        result_hash: '0x8f2d9c1b7a...3e4f',
        verification_status: 'VERIFIED',
      },
    },
    {
      step: 8,
      title: 'Clearinghouse Netting & Arc Settlement Authorization',
      category: 'SETTLEMENT',
      status: currentStep >= 8 ? 'COMPLETED' : 'PENDING',
      description: 'Clearinghouse converts verified milestone into authorized payment intent. Settlement confirmed on Arc.',
      details: {
        payment_intent_id: 'pi_demo_settle_01',
        amount: '45.00 USDC',
        recipient: 'agent_auditor_beta',
        status: 'CONFIRMED_ON_ARC',
      },
    },
    {
      step: 9,
      title: 'Reputation Updated in Economic Memory',
      category: 'MARKETPLACE',
      status: currentStep >= 9 ? 'COMPLETED' : 'PENDING',
      description: 'Empirical outcome recorded. Sample size increments to N=89; failure logged for primary provider.',
      details: {
        updated_provider: 'agent_auditor_beta',
        new_sample_size: 89,
        completion_rate: '96.2%',
      },
    },
  ];

  const handleNextStep = () => {
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSecurityAttackTriggered(false);
    setSecurityOutcome(null);
  };

  const handleTriggerSecurityAttack = (attackType: 'ARBITRARY_WALLET' | 'FAKE_RESULT' | 'REPLAY_WEBHOOK') => {
    setSecurityAttackTriggered(true);
    if (attackType === 'ARBITRARY_WALLET') {
      setSecurityOutcome('ATTACK BLOCKED: Malicious provider submitted arbitrary raw hex destination 0xdeadbeef1234... AgentPay INV-186 DENIED destination. Funds strictly locked to directory-approved agent identifier.');
    } else if (attackType === 'FAKE_RESULT') {
      setSecurityOutcome('ATTACK BLOCKED: Provider attempted unverified result submission. AgentPay INV-181 & INV-190 REJECTED payment authorization. Zero money movement allowed without valid verification.');
    } else if (attackType === 'REPLAY_WEBHOOK') {
      setSecurityOutcome('ATTACK BLOCKED: Replayed payment confirmation webhook intercepted. AgentPay INV-195 REPLAY DETECTED. Idempotency store prevented double-settlement.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-400 hover:text-slate-200">
              ← Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-cyan-400">demo</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Interactive Marketplace Lifecycle Demo (Section 59)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Watch an autonomous job traverse from objective creation to discovery, quotes, deterministic matching,
            contract award, provider failure fallback, result verification, Arc settlement, and reputation update.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700 transition-colors"
          >
            Reset Demo
          </button>
          <button
            onClick={handleNextStep}
            disabled={currentStep >= 9}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded shadow-lg transition-all disabled:opacity-50"
          >
            {currentStep === 0 ? '▶ Start Lifecycle' : currentStep >= 9 ? 'Lifecycle Complete' : `Next Step (${currentStep}/9) →`}
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Autonomous Execution Stages
            </h2>
            <span className="text-xs font-mono text-cyan-400">Step {currentStep} of 9</span>
          </div>

          <div className="space-y-3">
            {stages.map((stage) => {
              const isPast = currentStep >= stage.step;
              const isCurrent = currentStep === stage.step - 1;

              return (
                <div
                  key={stage.step}
                  className={`p-4 rounded-xl border transition-all ${
                    isPast
                      ? 'bg-slate-900/80 border-cyan-500/40 shadow-sm'
                      : isCurrent
                      ? 'bg-slate-900/40 border-slate-700 border-dashed animate-pulse'
                      : 'bg-slate-950/40 border-slate-800/40 opacity-40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isPast ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {stage.step}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100">{stage.title}</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-300">
                      {stage.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 ml-8.5">{stage.description}</p>

                  {isPast && stage.details && (
                    <div className="mt-3 ml-8.5 p-3 bg-slate-950/80 rounded border border-slate-800/80 text-[11px] font-mono text-slate-300 space-y-1">
                      {Object.entries(stage.details).map(([k, v]) => (
                        <div key={k} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-slate-500 uppercase">{k}:</span>
                          <span className="text-cyan-300 font-semibold">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Section 60 Security Moment & Economic Graph */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 60: Marketplace Security Moment */}
          <div className="bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-purple-950/30 border border-rose-500/40 rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                  Section 60: Marketplace Security Moment
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Demonstrates the immutable boundary: <strong className="text-white">OPEN MARKET + BOUNDED MONEY</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Simulate Adversarial Injections:</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleTriggerSecurityAttack('ARBITRARY_WALLET')}
                  className="px-3 py-2 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-xs text-left rounded text-slate-200 transition-colors"
                >
                  <strong className="text-rose-400 block">1. Inject Arbitrary Wallet Destination</strong>
                  <span className="text-[10px] text-slate-400">Provider requests payment to 0xdeadbeef...</span>
                </button>
                <button
                  onClick={() => handleTriggerSecurityAttack('FAKE_RESULT')}
                  className="px-3 py-2 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-xs text-left rounded text-slate-200 transition-colors"
                >
                  <strong className="text-rose-400 block">2. Submit Fake Unverified Result</strong>
                  <span className="text-[10px] text-slate-400">Provider demands payout without valid proof hash</span>
                </button>
                <button
                  onClick={() => handleTriggerSecurityAttack('REPLAY_WEBHOOK')}
                  className="px-3 py-2 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/60 text-xs text-left rounded text-slate-200 transition-colors"
                >
                  <strong className="text-rose-400 block">3. Replay Payment Confirmation Webhook</strong>
                  <span className="text-[10px] text-slate-400">Attacker attempts to double-claim settlement</span>
                </button>
              </div>
            </div>

            {securityAttackTriggered && securityOutcome && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-600/60 rounded-lg text-xs font-mono text-rose-200 space-y-1">
                <span className="font-bold text-rose-400 block">🛡️ SYSTEM INVARIANT DEFENSE TRIGGERED</span>
                <p className="text-[11px] leading-relaxed">{securityOutcome}</p>
              </div>
            )}
          </div>

          {/* Section 59: Economic Graph Visualization */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              End-to-End Economic Graph
            </h3>
            <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-xs space-y-2 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Objective</span>
                <span>→</span>
                <span className="text-white">&quot;Analyze 3 infra providers&quot;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Opportunity</span>
                <span>→</span>
                <span className="text-white">opp_sec_demo_01 (Cap: 50.00 USDC)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Provider</span>
                <span>→</span>
                <span className="text-purple-400">agent_auditor_beta (via fallback)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Contract</span>
                <span>→</span>
                <span className="text-white">contract_mkt_demo_alpha</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Task / Proof</span>
                <span>→</span>
                <span className="text-emerald-400">Verified Hash 0x8f2d...</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Payment</span>
                <span>→</span>
                <span className="text-emerald-400">45.00 USDC on Arc via AgentVault</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">Reputation</span>
                <span>→</span>
                <span className="text-white">N=89 (96.2% completion)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
