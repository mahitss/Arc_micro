'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type DemoStep =
  | 'INTENT'
  | 'SIMULATION'
  | 'EXECUTION'
  | 'FAULT_INJECTED'
  | 'RECOVERED'
  | 'COMPLETED'
  | 'SECURITY_MOMENT';

export default function EconomicFabricDemoPage() {
  const [step, setStep] = useState<DemoStep>('INTENT');
  const [objectiveInput, setObjectiveInput] = useState(
    'Research the security posture of three infrastructure providers and deliver a verified report.'
  );
  const [activeFault, setActiveFault] = useState<string | null>(null);
  const [securityTestResult, setSecurityTestResult] = useState<any | null>(null);

  function handleSimulate() {
    setStep('SIMULATION');
  }

  function handleStart() {
    setStep('EXECUTION');
  }

  function handleInjectFault(faultType: 'WORKER_CRASH' | 'PROVIDER_TIMEOUT' | 'QUOTE_EXPIRY') {
    setActiveFault(faultType);
    setStep('FAULT_INJECTED');
  }

  function handleRecoverAndReplan() {
    setActiveFault(null);
    setStep('RECOVERED');
    setTimeout(() => {
      setStep('COMPLETED');
    }, 1500);
  }

  type AttackVector =
    | 'RECIPIENT_SUBSTITUTION'
    | 'BUDGET_INCREASE'
    | 'POLICY_MODIFICATION'
    | 'ARBITRARY_CALLDATA'
    | 'PAYMENT_OUTSIDE_QUOTE'
    | 'REPLAY_ATTACK'
    | 'DUPLICATE_SETTLEMENT'
    | 'FORGED_COMPLETION';

  function handleTestSecurityMoment(actionType: AttackVector) {
    switch (actionType) {
      case 'RECIPIENT_SUBSTITUTION':
        setSecurityTestResult({
          vector: '1. Recipient Substitution Attack',
          actor: 'Adversarial Provider [agent_attacker_01]',
          request: 'Substitute contract payout address with unverified wallet 0xdead00000000000000000000000000000000beef',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-186 (raw hex 0x... blocked; recipient must be verified directory agent) & INV-146 (unauthorized substitution blocked)',
          constitutional_boundary: 'INV-153 (Financial source-of-truth remains authoritative; multi-sig required)',
          what_would_have_changed: 'Payment destination redirected to unverified attacker address',
          what_did_not_change: 'Recipient remains bound to verified contract recipient. Zero funds moved.',
        });
        break;
      case 'BUDGET_INCREASE':
        setSecurityTestResult({
          vector: '2. Budget Escalation Attack',
          actor: 'Autonomous Agent [agent_scanner_01]',
          request: 'Self-escalate economic envelope budget from 18.50 USDC to 100.00 USDC mid-execution',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-148 (EconomicEnvelope cannot self-increase) & INV-185 (quote exceeds budget cap)',
          constitutional_boundary: 'INV-141 (EconomicFabric cannot authorize payment or increase financial limits)',
          what_would_have_changed: 'Envelope cap +81.50 USDC, unreserved treasury exposure',
          what_did_not_change: 'Budget remains locked at 18.50 USDC. Treasury ledger untouched.',
        });
        break;
      case 'POLICY_MODIFICATION':
        setSecurityTestResult({
          vector: '3. Policy Modification Attack',
          actor: 'Malicious Workflow Script',
          request: 'Inject relaxed constitutional policy rule setting max_spend_limit to unlimited',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-109 (Runtime cannot modify deterministic policy rules) & INV-110 (Constitutional authority immutable)',
          constitutional_boundary: 'INV-149 (Risk envelope cannot weaken Constitution)',
          what_would_have_changed: 'Autonomous rewrite of governance constraints',
          what_did_not_change: 'Policy Constitution remains immutable. Deterministic hash verified.',
        });
        break;
      case 'ARBITRARY_CALLDATA':
        setSecurityTestResult({
          vector: '4. Arbitrary Calldata Injection',
          actor: 'Compromised Worker Node',
          request: 'Send arbitrary bytecode calldata directly to AgentVault smart contract',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-21 (Signer strictly bound to canonical PaymentIntent schema) & INV-108 (Direct vault invocation forbidden)',
          constitutional_boundary: 'Authority Invariant: Only canonical PaymentIntent pipeline with authorized signer can interact with vault',
          what_would_have_changed: 'Arbitrary EVM call execution on AgentVault',
          what_did_not_change: 'Worker holds zero private keys. Calldata rejected at execution gate.',
        });
        break;
      case 'PAYMENT_OUTSIDE_QUOTE':
        setSecurityTestResult({
          vector: '5. Payment Outside Quote Attack',
          actor: 'Provider Billing Endpoint',
          request: 'Submit invoice claiming 35.00 USDC against agreed quote of 18.50 USDC',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-164 (Payment must strictly match awarded quote) & INV-185 (Price exceeds cap)',
          constitutional_boundary: 'INV-142 (Compiler output cannot exceed objective constraints)',
          what_would_have_changed: 'Unauthorized drain of additional 16.50 USDC treasury liquidity',
          what_did_not_change: 'Invoice rejected. Payout strictly locked to quote contract value (18.50 USDC).',
        });
        break;
      case 'REPLAY_ATTACK':
        setSecurityTestResult({
          vector: '6. Replay Attack',
          actor: 'Network Adversary',
          request: 'Replay previously settled transaction hash and idempotency token to duplicate payout',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-6 (Idempotency key uniqueness) & INV-112 (Duplicate external callbacks must be idempotent)',
          constitutional_boundary: 'INV-118 (Dangerous commands require fresh idempotency validation)',
          what_would_have_changed: 'Second 18.50 USDC payout for already settled deliverable',
          what_did_not_change: 'Idempotency hit detected. Existing transaction returned without re-execution.',
        });
        break;
      case 'DUPLICATE_SETTLEMENT':
        setSecurityTestResult({
          vector: '7. Duplicate Settlement Attack',
          actor: 'Concurrent Malicious Thread',
          request: 'Trigger simultaneous second settlement batch for same clearing obligation',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-113 (Duplicate financial commands cannot create duplicate intents) & INV-194 (Duplicate award blocked)',
          constitutional_boundary: 'INV-77 (Treasury double release or double consumption prevented)',
          what_would_have_changed: 'Dual settlement of single counterparty obligation',
          what_did_not_change: 'Mutex lock and obligation state machine halt duplicate attempt.',
        });
        break;
      case 'FORGED_COMPLETION':
        setSecurityTestResult({
          vector: '8. Forged Completion Checksum Attack',
          actor: 'Adversarial Worker',
          request: 'Submit completion claim with fabricated deliverable hash 0x0000...fake',
          decision: 'BLOCKED (HARD DENY)',
          policy_rule: 'INV-162 (Milestone deliverable requires valid critic SHA-256 cryptographic verification)',
          constitutional_boundary: 'Quality Gate S4: Evaluator critic score must exceed threshold before settlement release',
          what_would_have_changed: 'Payment release for incomplete or fraudulent deliverable',
          what_did_not_change: 'Critic rejected deliverable. Zero funds released to provider.',
        });
        break;
    }
    setStep('SECURITY_MOMENT');
  }

  function handleReset() {
    setStep('INTENT');
    setActiveFault(null);
    setSecurityTestResult(null);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#222222]">
                ECONOMIC FABRIC SHOWCASE
              </span>
              <span className="text-xs font-mono text-[#716F69]">Autonomous Economic Fabric</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#F2F0EA]">
              Autonomous Economic Fabric Demo
            </h1>
            <p className="text-sm text-[#716F69] mt-1 max-w-2xl">
              Experience end-to-end autonomous objective compilation, simulation, self-healing recovery, Arc settlement, and non-negotiable financial guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] font-mono text-xs border border-[#222222] transition-colors"
            >
              Reset Demo
            </button>
            <Link
              href="/control/autonomy"
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#D6A83A] font-mono text-xs border border-[#222222] transition-colors"
            >
              Autonomy View →
            </Link>
          </div>
        </div>

        {/* Narrative Step Progress */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-mono">
          <div className={`p-2.5 rounded-lg border text-center ${step === 'INTENT' ? 'bg-[#141414] border-[#D6A83A] text-[#D6A83A] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            1. Objective
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'SIMULATION' ? 'bg-[#141414] border-[#D6A83A] text-[#D6A83A] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            2. Simulate
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'EXECUTION' ? 'bg-[#141414] border-[#2FB36F] text-[#2FB36F] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            3. Execute
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'FAULT_INJECTED' ? 'bg-[#141414] border-[#D85C5C] text-[#D85C5C] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            4. Inject Fault
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'RECOVERED' || step === 'COMPLETED' ? 'bg-[#141414] border-[#2FB36F] text-[#2FB36F] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            5. Replan & Settle
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'SECURITY_MOMENT' ? 'bg-[#141414] border-[#D6A83A] text-[#D6A83A] font-bold' : 'bg-[#0B0B0B] border-[#222222] text-[#716F69]'}`}>
            6. Security Moment
          </div>
        </div>

        {/* STAGE 1: INTENT & OBJECTIVE INPUT */}
        {step === 'INTENT' && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 space-y-5 shadow-sm">
            <div>
              <span className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider font-semibold">Stage 1</span>
              <h2 className="text-xl font-bold text-[#F2F0EA] mt-1">Give AgentPay an Objective</h2>
              <p className="text-xs text-[#716F69] mt-0.5">
                The user provides a high-level natural language intent with operational constraints.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-[#B0ADA5]">Economic Objective Intent</label>
              <textarea
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                rows={3}
                className="w-full bg-[#0B0B0B] border border-[#222222] rounded-xl p-3 text-sm text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A] font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Max Economic Budget</span>
                <strong className="text-[#2FB36F] text-sm mt-0.5 block">50.00 USDC</strong>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Deadline SLA</span>
                <strong className="text-[#F2F0EA] text-sm mt-0.5 block">2026-10-01 18:00 UTC</strong>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Required Capability</span>
                <strong className="text-[#D6A83A] text-sm mt-0.5 block">sec-audit, iso-check</strong>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSimulate}
                className="px-6 py-2.5 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono rounded-xl transition-colors flex items-center gap-2"
              >
                <span>SIMULATE OBJECTIVE →</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: SIMULATION & PRE-FLIGHT CHECKS */}
        {step === 'SIMULATION' && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <span className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider font-semibold">Stage 2</span>
                <h2 className="text-xl font-bold text-[#F2F0EA] mt-0.5">Pre-Flight Simulation & Digital Twin</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-[#141414] text-[#D6A83A] border border-[#222222]">
                SIMULATION ONLY (INV-156: NO REAL MONEY)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                <span className="text-[#716F69] text-[10px] block">Expected Cost</span>
                <strong className="text-[#2FB36F] text-lg block mt-0.5">18.50 USDC</strong>
                <span className="text-[10px] text-[#716F69]">Within 50.00 USDC cap</span>
              </div>
              <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                <span className="text-[#716F69] text-[10px] block">Expected Duration</span>
                <strong className="text-[#F2F0EA] text-lg block mt-0.5">38 seconds</strong>
                <span className="text-[10px] text-[#716F69]">Well under deadline</span>
              </div>
              <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                <span className="text-[#716F69] text-[10px] block">Max Exposure</span>
                <strong className="text-[#D6A83A] text-lg block mt-0.5">25.00 USDC</strong>
                <span className="text-[10px] text-[#716F69]">Worst-case retry bound</span>
              </div>
              <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                <span className="text-[#716F69] text-[10px] block">Policy Decision</span>
                <strong className="text-[#2FB36F] text-lg block mt-0.5">ALLOW</strong>
                <span className="text-[10px] text-[#716F69]">Rust Policy Engine checked</span>
              </div>
            </div>

            {/* Provider comparison matrix */}
            <div className="space-y-2 text-xs font-mono">
              <span className="text-[#716F69] font-bold block">Discovered Candidate Providers:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#141414] border border-[#222222] rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#F2F0EA]">VigilSec-AI</strong>
                    <span className="text-[#2FB36F] font-bold text-[10px]">SELECTED</span>
                  </div>
                  <div className="text-[#716F69]">Quote: 18.50 USDC | Latency: 210ms</div>
                  <div className="text-[11px] text-[#2FB36F]">Historical Reliability: 99.4%</div>
                </div>

                <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-xl space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#B0ADA5]">CloudGuard</strong>
                    <span className="text-[#716F69] text-[10px]">REJECTED</span>
                  </div>
                  <div className="text-[#716F69]">Quote: 28.00 USDC | Latency: 450ms</div>
                  <div className="text-[11px] text-[#716F69]">Higher price for identical capability</div>
                </div>

                <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-xl space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#B0ADA5]">TestLab Beta</strong>
                    <span className="text-[#716F69] text-[10px]">REJECTED</span>
                  </div>
                  <div className="text-[#716F69]">Quote: 12.00 USDC | Latency: 890ms</div>
                  <div className="text-[11px] text-[#D85C5C]">Missing ISO-27001 capability</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleStart}
                className="px-6 py-2.5 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono rounded-xl transition-colors"
              >
                PROCEED TO LIVE EXECUTION →
              </button>
              <button
                onClick={() => setStep('INTENT')}
                className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] font-mono text-xs rounded-xl transition-colors"
              >
                Back to Intent
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: LIVE EXECUTION & FAULT INJECTION */}
        {['EXECUTION', 'FAULT_INJECTED', 'RECOVERED', 'COMPLETED'].includes(step) && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
              <div>
                <span className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider font-semibold">Stage 3 & 4</span>
                <h2 className="text-xl font-bold text-[#F2F0EA] mt-0.5">Live Coordination & Fault Recovery</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F] animate-pulse" />
                <span className="text-[#F2F0EA]">DURABLE RUNTIME RUNNING</span>
              </div>
            </div>

            {/* Execution Pipeline Steps */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-[#0B0B0B] rounded-xl border border-[#222222] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#141414] text-[#2FB36F] border border-[#222222] font-bold flex items-center justify-center text-xs">✓</span>
                  <div>
                    <strong className="text-[#F2F0EA]">Step 1: Provider Discovery & Quoting</strong>
                    <div className="text-[11px] text-[#716F69]">Selected VigilSec-AI at 18.50 USDC</div>
                  </div>
                </div>
                <span className="text-[#2FB36F] font-bold text-[10px]">COMPLETED</span>
              </div>

              <div className={`p-3 bg-[#0B0B0B] rounded-xl border flex items-center justify-between ${
                step === 'FAULT_INJECTED'
                  ? 'border-[#D85C5C]/60 bg-[#141414]'
                  : step === 'RECOVERED' || step === 'COMPLETED'
                  ? 'border-[#2FB36F]/30 bg-[#141414]'
                  : 'border-[#222222] bg-[#0B0B0B]'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                    step === 'FAULT_INJECTED'
                      ? 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40'
                      : step === 'RECOVERED' || step === 'COMPLETED'
                      ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40'
                      : 'bg-[#141414] text-[#D6A83A] border border-[#222222]'
                  }`}>
                    {step === 'FAULT_INJECTED' ? '!' : step === 'RECOVERED' || step === 'COMPLETED' ? '✓' : '⟳'}
                  </span>
                  <div>
                    <strong className="text-[#F2F0EA]">Step 2: Infrastructure Penetration & Telemetry</strong>
                    <div className="text-[11px] text-[#716F69]">
                      {step === 'FAULT_INJECTED'
                        ? `FAULT DETECTED: ${activeFault} — Worker lease timed out`
                        : step === 'RECOVERED' || step === 'COMPLETED'
                        ? 'Checkpoint restored; standby worker completed scan'
                        : 'Dispatched to worker node-01'}
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-[10px] ${
                  step === 'FAULT_INJECTED' ? 'text-[#D85C5C]' : 'text-[#2FB36F]'
                }`}>
                  {step === 'FAULT_INJECTED' ? 'FAILED / TIMEOUT' : step === 'RECOVERED' || step === 'COMPLETED' ? 'RECOVERED' : 'RUNNING'}
                </span>
              </div>

              <div className="p-3 bg-[#0B0B0B] rounded-xl border border-[#222222] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                    step === 'COMPLETED' ? 'bg-[#141414] text-[#2FB36F] border border-[#222222]' : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                  }`}>
                    {step === 'COMPLETED' ? '✓' : '3'}
                  </span>
                  <div>
                    <strong className="text-[#F2F0EA]">Step 3: Result Verification & Settlement</strong>
                    <div className="text-[11px] text-[#716F69]">
                      {step === 'COMPLETED' ? 'Deliverable verified with SHA-256; Arc settlement confirmed' : 'Awaiting deliverable validation'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-[#716F69]">
                  {step === 'COMPLETED' ? 'SETTLED' : 'QUEUED'}
                </span>
              </div>
            </div>

            {/* Fault Injection Panel */}
            {step === 'EXECUTION' && (
              <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl space-y-3 font-mono text-xs">
                <span className="text-[#D6A83A] font-bold block">Inject Chaos Fault (Test Self-Healing):</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleInjectFault('WORKER_CRASH')}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/30 rounded-lg transition-colors"
                  >
                    Simulate Worker Crash
                  </button>
                  <button
                    onClick={() => handleInjectFault('PROVIDER_TIMEOUT')}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/30 rounded-lg transition-colors"
                  >
                    Simulate Provider Timeout
                  </button>
                  <button
                    onClick={() => handleInjectFault('QUOTE_EXPIRY')}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] rounded-lg transition-colors"
                  >
                    Simulate Quote Expiry
                  </button>
                </div>
              </div>
            )}

            {/* Fault Recovery Actions */}
            {step === 'FAULT_INJECTED' && (
              <div className="p-4 bg-[#141414] border border-[#D85C5C]/40 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-[#D85C5C] font-bold">
                  <span>OPERATIONAL INCIDENT DETECTED:</span>
                  <span>{activeFault}</span>
                </div>
                <p className="text-[#B0ADA5] text-xs font-sans">
                  The Durable Runtime detected a heartbeat failure. Checkpoint is preserved. The system can safely adapt the plan without expanding budget authority.
                </p>
                <button
                  onClick={handleRecoverAndReplan}
                  className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold rounded-lg transition-colors"
                >
                  AUTONOMOUS RECOVER & REPLAN (INV-145) →
                </button>
              </div>
            )}

            {/* Completion & Arc Confirmation */}
            {step === 'COMPLETED' && (
              <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#2FB36F] font-bold text-sm">
                    <span>✓ OBJECTIVE COMPLETED & VERIFIED</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#141414] text-[#D6A83A] border border-[#222222]">
                    SIMULATION — NO FUNDS MOVED
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#716F69]">
                  <div>Projected Settlement: <strong className="text-[#2FB36F]">18.50 USDC (SIMULATED)</strong></div>
                  <div>Arc Mainnet (5042): <strong className="text-[#D6A83A]">UNDEPLOYED</strong></div>
                  <div>Deterministic Trace: <strong className="text-[#F2F0EA]">sim_trace_intel_01</strong></div>
                  <div>Live Execution: <strong className="text-[#D85C5C]">DISABLED (INV-156)</strong></div>
                </div>

                <div className="p-2.5 bg-[#141414] border border-[#222222] rounded-lg text-[#B0ADA5] text-center text-[11px]">
                  <strong>SIMULATION — NO FUNDS MOVED:</strong> Autonomous planning, matching, fault recovery, and critic evaluation succeeded without on-chain broadcast or real vault mutation.
                </div>

                {/* Trigger Security Moment (All 8 Malicious Provider Scenarios) */}
                <div className="pt-3 border-t border-[#222222] space-y-2">
                  <span className="text-[#D6A83A] font-bold text-xs block">
                    ATTACK VECTOR PROVING GROUND — 8 DETERMINISTIC SCENARIOS (ALL BLOCKED):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleTestSecurityMoment('RECIPIENT_SUBSTITUTION')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      1. Recipient Substitution
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('BUDGET_INCREASE')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      2. Budget Escalation
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('POLICY_MODIFICATION')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      3. Policy Modification
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('ARBITRARY_CALLDATA')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      4. Arbitrary Calldata
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('PAYMENT_OUTSIDE_QUOTE')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      5. Payment Outside Quote
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('REPLAY_ATTACK')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      6. Replay Attack
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('DUPLICATE_SETTLEMENT')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      7. Duplicate Settlement
                    </button>
                    <button
                      onClick={() => handleTestSecurityMoment('FORGED_COMPLETION')}
                      className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#222222] rounded-lg text-[10px] font-bold text-left transition-colors"
                    >
                      8. Forged Completion
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 6: DEMO SECURITY MOMENT (SECTION 57) */}
        {step === 'SECURITY_MOMENT' && securityTestResult && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div>
                <span className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider font-semibold">
                  {securityTestResult.vector || 'Deterministic Security Scenario'}
                </span>
                <h2 className="text-2xl font-black text-[#F2F0EA] mt-0.5">
                  Autonomous Authority Boundary Held
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40 font-bold">
                RESULT: DENIED (HARD BLOCK)
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                  <span className="text-[#716F69] text-[10px] block uppercase">Requesting Actor</span>
                  <div className="text-[#F2F0EA] font-bold mt-0.5">{securityTestResult.actor}</div>
                </div>

                <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                  <span className="text-[#716F69] text-[10px] block uppercase">Attempted Action</span>
                  <div className="text-[#D85C5C] font-bold mt-0.5">{securityTestResult.request}</div>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#222222] p-4 rounded-xl space-y-2">
                <div className="text-[#D6A83A] font-bold text-sm">Constitutional Policy Enforced:</div>
                <div className="text-[#F2F0EA]">{securityTestResult.policy_rule}</div>
                <div className="text-[#716F69] text-[11px]">{securityTestResult.constitutional_boundary}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                  <span className="text-[#D6A83A] font-bold block mb-1">What Would Have Changed:</span>
                  <p className="text-[#B0ADA5] text-[11px] leading-relaxed">{securityTestResult.what_would_have_changed}</p>
                </div>

                <div className="bg-[#0B0B0B] p-3.5 rounded-xl border border-[#222222]">
                  <span className="text-[#2FB36F] font-bold block mb-1">What Actually Changed:</span>
                  <p className="text-[#F2F0EA] text-[11px] leading-relaxed">{securityTestResult.what_did_not_change}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#222222] flex items-center justify-between">
              <div className="text-xs font-mono text-[#716F69]">
                Thesis proven: <strong className="text-[#F2F0EA]">AI requests. AgentPay controls. Arc settles.</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('COMPLETED')}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] font-mono text-xs border border-[#222222] rounded-xl transition-colors"
                >
                  Return to Completed Objective
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold font-mono text-xs rounded-xl transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
