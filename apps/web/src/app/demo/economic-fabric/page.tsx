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
    }, 2000);
  }

  function handleTestSecurityMoment(actionType: 'BUDGET_ESCALATION' | 'ARBITRARY_RECIPIENT') {
    if (actionType === 'BUDGET_ESCALATION') {
      setSecurityTestResult({
        actor: 'Autonomous Agent [agent_scanner_01]',
        request: 'Increase economic envelope budget from 18.50 USDC to 100.00 USDC',
        decision: 'DENIED',
        policy_rule: 'INV-148 (EconomicEnvelope cannot self-increase)',
        constitutional_boundary: 'INV-141 (EconomicFabric cannot authorize payment or increase financial authority)',
        what_would_have_changed: 'Envelope cap +81.50 USDC, unreserved treasury exposure',
        what_did_not_change: 'Budget remains locked at 18.50 USDC. Treasury ledger untouched.',
      });
    } else {
      setSecurityTestResult({
        actor: 'Autonomous Agent [agent_scanner_01]',
        request: 'Transfer 18.50 USDC milestone payout to arbitrary address 0xdead00000000000000000000000000000000beef',
        decision: 'DENIED',
        policy_rule: 'INV-146 / INV-147 (Recipient substitution strictly blocked without multi-sig)',
        constitutional_boundary: 'INV-153 (Financial source-of-truth remains authoritative)',
        what_would_have_changed: 'Payment destination redirected to unverified external wallet',
        what_did_not_change: 'Recipient remains bound to verified contract recipient. Zero funds moved.',
      });
    }
    setStep('SECURITY_MOMENT');
  }

  function handleReset() {
    setStep('INTENT');
    setActiveFault(null);
    setSecurityTestResult(null);
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                TASK 15 INTERACTIVE SHOWCASE
              </span>
              <span className="text-xs font-mono text-slate-400">Autonomous Economic Fabric</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Autonomous Economic Fabric Demo
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Experience end-to-end autonomous objective compilation, simulation, self-healing recovery, Arc settlement, and non-negotiable financial guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
            >
              Reset Demo
            </button>
            <Link
              href="/control/autonomy"
              className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-mono text-xs transition-colors"
            >
              Autonomy View →
            </Link>
          </div>
        </div>

        {/* Narrative Step Progress */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-mono">
          <div className={`p-2.5 rounded-lg border text-center ${step === 'INTENT' ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            1. Objective
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'SIMULATION' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            2. Simulate
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'EXECUTION' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            3. Execute
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'FAULT_INJECTED' ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            4. Inject Fault
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'RECOVERED' || step === 'COMPLETED' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            5. Replan & Settle
          </div>
          <div className={`p-2.5 rounded-lg border text-center ${step === 'SECURITY_MOMENT' ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
            6. Security Moment
          </div>
        </div>

        {/* STAGE 1: INTENT & OBJECTIVE INPUT */}
        {step === 'INTENT' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div>
              <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">Stage 1</span>
              <h2 className="text-xl font-bold text-white mt-1">Give AgentPay an Objective</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                The user provides a high-level natural language intent with operational constraints.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">Economic Objective Intent</label>
              <textarea
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Max Economic Budget</span>
                <strong className="text-emerald-400 text-sm mt-0.5 block">50.00 USDC</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Deadline SLA</span>
                <strong className="text-cyan-400 text-sm mt-0.5 block">2026-10-01 18:00 UTC</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Required Capability</span>
                <strong className="text-teal-300 text-sm mt-0.5 block">sec-audit, iso-check</strong>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSimulate}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
              >
                <span>SIMULATE OBJECTIVE →</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: SIMULATION & PRE-FLIGHT CHECKS */}
        {step === 'SIMULATION' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">Stage 2</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Pre-Flight Simulation & Digital Twin</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SIMULATION ONLY (INV-156: NO REAL MONEY)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Expected Cost</span>
                <strong className="text-emerald-400 text-lg block mt-0.5">18.50 USDC</strong>
                <span className="text-[10px] text-slate-500">Within 50.00 USDC cap</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Expected Duration</span>
                <strong className="text-cyan-400 text-lg block mt-0.5">38 seconds</strong>
                <span className="text-[10px] text-slate-500">Well under deadline</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Max Exposure</span>
                <strong className="text-amber-400 text-lg block mt-0.5">25.00 USDC</strong>
                <span className="text-[10px] text-slate-500">Worst-case retry bound</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Policy Decision</span>
                <strong className="text-emerald-400 text-lg block mt-0.5">ALLOW</strong>
                <span className="text-[10px] text-slate-500">Rust Policy Engine checked</span>
              </div>
            </div>

            {/* Provider comparison matrix */}
            <div className="space-y-2 text-xs font-mono">
              <span className="text-slate-400 font-bold block">Discovered Candidate Providers:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">VigilSec-AI</strong>
                    <span className="text-emerald-400 font-bold text-[10px]">SELECTED</span>
                  </div>
                  <div className="text-slate-400">Quote: 18.50 USDC | Latency: 210ms</div>
                  <div className="text-[11px] text-emerald-400">Historical Reliability: 99.4%</div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-300">CloudGuard</strong>
                    <span className="text-slate-500 text-[10px]">REJECTED</span>
                  </div>
                  <div className="text-slate-400">Quote: 28.00 USDC | Latency: 450ms</div>
                  <div className="text-[11px] text-slate-500">Higher price for identical capability</div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-300">TestLab Beta</strong>
                    <span className="text-slate-500 text-[10px]">REJECTED</span>
                  </div>
                  <div className="text-slate-400">Quote: 12.00 USDC | Latency: 890ms</div>
                  <div className="text-[11px] text-rose-400">Missing ISO-27001 capability</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleStart}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                PROCEED TO LIVE EXECUTION →
              </button>
              <button
                onClick={() => setStep('INTENT')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl"
              >
                Back to Intent
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: LIVE EXECUTION & FAULT INJECTION */}
        {['EXECUTION', 'FAULT_INJECTED', 'RECOVERED', 'COMPLETED'].includes(step) && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">Stage 3 & 4</span>
                <h2 className="text-xl font-bold text-white mt-0.5">Live Coordination & Fault Recovery</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300">DURABLE RUNTIME RUNNING</span>
              </div>
            </div>

            {/* Execution Pipeline Steps */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">✓</span>
                  <div>
                    <strong className="text-white">Task 1: Provider Discovery & Quoting</strong>
                    <div className="text-[11px] text-slate-400">Selected VigilSec-AI at 18.50 USDC</div>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">COMPLETED</span>
              </div>

              <div className={`p-3 bg-slate-950 rounded-xl border flex items-center justify-between ${
                step === 'FAULT_INJECTED'
                  ? 'border-rose-500/60 bg-rose-950/10'
                  : step === 'RECOVERED' || step === 'COMPLETED'
                  ? 'border-emerald-500/30'
                  : 'border-cyan-500/40 bg-cyan-950/10'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                    step === 'FAULT_INJECTED'
                      ? 'bg-rose-500/20 text-rose-400'
                      : step === 'RECOVERED' || step === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-cyan-500/20 text-cyan-400 animate-spin'
                  }`}>
                    {step === 'FAULT_INJECTED' ? '!' : step === 'RECOVERED' || step === 'COMPLETED' ? '✓' : '⟳'}
                  </span>
                  <div>
                    <strong className="text-white">Task 2: Infrastructure Penetration & Telemetry</strong>
                    <div className="text-[11px] text-slate-400">
                      {step === 'FAULT_INJECTED'
                        ? `FAULT DETECTED: ${activeFault} — Worker lease timed out`
                        : step === 'RECOVERED' || step === 'COMPLETED'
                        ? 'Checkpoint restored; standby worker completed scan'
                        : 'Dispatched to worker node-01'}
                    </div>
                  </div>
                </div>
                <span className={`font-bold text-[10px] ${
                  step === 'FAULT_INJECTED' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {step === 'FAULT_INJECTED' ? 'FAILED / TIMEOUT' : step === 'RECOVERED' || step === 'COMPLETED' ? 'RECOVERED' : 'RUNNING'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-xs ${
                    step === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {step === 'COMPLETED' ? '✓' : '3'}
                  </span>
                  <div>
                    <strong className="text-white">Task 3: Result Verification & Settlement</strong>
                    <div className="text-[11px] text-slate-400">
                      {step === 'COMPLETED' ? 'Deliverable verified with SHA-256; Arc settlement confirmed' : 'Awaiting deliverable validation'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">
                  {step === 'COMPLETED' ? 'SETTLED' : 'QUEUED'}
                </span>
              </div>
            </div>

            {/* Fault Injection Panel */}
            {step === 'EXECUTION' && (
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
                <span className="text-amber-400 font-bold block">Inject Chaos Fault (Test Self-Healing):</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleInjectFault('WORKER_CRASH')}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
                  >
                    Simulate Worker Crash
                  </button>
                  <button
                    onClick={() => handleInjectFault('PROVIDER_TIMEOUT')}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-colors"
                  >
                    Simulate Provider Timeout
                  </button>
                  <button
                    onClick={() => handleInjectFault('QUOTE_EXPIRY')}
                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
                  >
                    Simulate Quote Expiry
                  </button>
                </div>
              </div>
            )}

            {/* Fault Recovery Actions */}
            {step === 'FAULT_INJECTED' && (
              <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <span>OPERATIONAL INCIDENT DETECTED:</span>
                  <span>{activeFault}</span>
                </div>
                <p className="text-slate-300 text-xs font-sans">
                  The Durable Runtime detected a heartbeat failure. Checkpoint is preserved. The system can safely adapt the plan without expanding budget authority.
                </p>
                <button
                  onClick={handleRecoverAndReplan}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-teal-500 text-slate-950 font-bold rounded-lg transition-all"
                >
                  AUTONOMOUS RECOVER & REPLAN (INV-145) →
                </button>
              </div>
            )}

            {/* Completion & Arc Confirmation */}
            {step === 'COMPLETED' && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>✓ OBJECTIVE COMPLETED & VERIFIED</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                  <div>Settled Amount: <strong className="text-emerald-400">18.50 USDC</strong></div>
                  <div>Arc Block: <strong className="text-cyan-400">#184920</strong></div>
                  <div>Tx Hash: <strong className="text-slate-200">0x99281a...f82a</strong></div>
                  <div>Learnings: <strong className="text-indigo-400">Emitted to Memory</strong></div>
                </div>

                {/* Trigger Security Moment (Section 57) */}
                <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center gap-3">
                  <span className="text-amber-400 font-bold text-xs">NOW TEST THE SECURITY THESIS:</span>
                  <button
                    onClick={() => handleTestSecurityMoment('BUDGET_ESCALATION')}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg transition-colors font-bold"
                  >
                    Test Budget Elevation Attack
                  </button>
                  <button
                    onClick={() => handleTestSecurityMoment('ARBITRARY_RECIPIENT')}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg transition-colors font-bold"
                  >
                    Test Arbitrary Recipient Attack
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 6: DEMO SECURITY MOMENT (SECTION 57) */}
        {step === 'SECURITY_MOMENT' && securityTestResult && (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/30 border border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div>
                <span className="text-xs font-mono text-rose-400 uppercase tracking-wider font-semibold">
                  Section 57 Security Moment
                </span>
                <h2 className="text-2xl font-black text-white mt-0.5">
                  Autonomous Authority Boundary Held
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/50 font-black">
                RESULT: DENIED (HARD BLOCK)
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Requesting Actor</span>
                  <div className="text-white font-bold mt-0.5">{securityTestResult.actor}</div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block uppercase">Attempted Action</span>
                  <div className="text-rose-300 font-bold mt-0.5">{securityTestResult.request}</div>
                </div>
              </div>

              <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl space-y-2">
                <div className="text-rose-400 font-bold text-sm">Constitutional Policy Enforced:</div>
                <div className="text-slate-200">{securityTestResult.policy_rule}</div>
                <div className="text-slate-400 text-[11px]">{securityTestResult.constitutional_boundary}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-amber-400 font-bold block mb-1">What Would Have Changed:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{securityTestResult.what_would_have_changed}</p>
                </div>

                <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold block mb-1">What Actually Changed:</span>
                  <p className="text-emerald-200 text-[11px] leading-relaxed">{securityTestResult.what_did_not_change}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-400">
                Thesis proven: <strong className="text-white">AI requests. AgentPay controls. Arc settles.</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('COMPLETED')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl"
                >
                  Return to Completed Objective
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold font-mono text-xs rounded-xl"
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
