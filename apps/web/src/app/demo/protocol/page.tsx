'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Step {
  stepNumber: number;
  title: string;
  sender: string;
  receiver: string;
  messageType: string;
  description: string;
  invariant: string;
  payloadPreview: string;
  status: 'SUCCESS' | 'WAITING' | 'EXECUTING';
}

export default function ProtocolLiveDemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [maliciousLog, setMaliciousLog] = useState<string | null>(null);

  const demoSteps: Step[] = [
    {
      stepNumber: 1,
      title: 'Capability Discovery',
      sender: 'agent_research_01 (Requester)',
      receiver: 'AgentPay Protocol Directory',
      messageType: 'discovery.query',
      description: 'Agent A queries AgentPay directory for providers offering code_audit capability.',
      invariant: 'INV-162: Manifest Registry Source of Truth',
      payloadPreview: 'GET /protocol/v1/agents?capability=code_audit',
      status: 'WAITING',
    },
    {
      stepNumber: 2,
      title: 'Service Quote Request',
      sender: 'agent_research_01 (Requester)',
      receiver: 'agent_security_02 (Provider)',
      messageType: 'service.request',
      description: 'Agent A issues service request with $100 USDC budget cap and deliverable specifications.',
      invariant: 'INV-165: Authoritative Policy Budget Caps',
      payloadPreview: '{"request_id": "req_881", "capability": "code_audit", "budget_cap": "100.00"}',
      status: 'WAITING',
    },
    {
      stepNumber: 3,
      title: 'Quote & Negotiation',
      sender: 'agent_security_02 (Provider)',
      receiver: 'agent_research_01 (Requester)',
      messageType: 'protocol.quote',
      description: 'Agent B offers $75 USDC fixed price for formal security verification with 300s SLA.',
      invariant: 'INV-165: Quotes Bounded by Economic Policy',
      payloadPreview: '{"quote_id": "q_772", "amount": "75.00", "currency": "USDC", "duration": 300}',
      status: 'WAITING',
    },
    {
      stepNumber: 4,
      title: 'Contract Agreement & Escrow',
      sender: 'agent_research_01 (Requester)',
      receiver: 'AgentPay Clearinghouse',
      messageType: 'contract.accepted',
      description: 'Contract transitions to ACTIVE. Clearinghouse locks 75.00 USDC in cryptographic escrow.',
      invariant: 'INV-171: Strict Contract State Machine Transitions',
      payloadPreview: 'POST /protocol/v1/contracts/con_991/accept -> State: ACTIVE',
      status: 'WAITING',
    },
    {
      stepNumber: 5,
      title: 'Work Execution',
      sender: 'agent_security_02 (Provider)',
      receiver: 'Local Runtime Sandbox',
      messageType: 'agent.work',
      description: 'Agent B executes formal fuzzing, symbol analysis, and invariant verification.',
      invariant: 'INV-161: External Agent Runs Without Financial Authority',
      payloadPreview: '{"audit_status": "COMPLETED", "vulnerabilities_found": 0, "confidence": 0.98}',
      status: 'WAITING',
    },
    {
      stepNumber: 6,
      title: 'Deliverable Submission',
      sender: 'agent_security_02 (Provider)',
      receiver: 'ProtocolGateway',
      messageType: 'result.submitted',
      description: 'Agent B submits SHA-256 sealed deliverable. Submission NEVER directly triggers payout.',
      invariant: 'INV-173: Deliverable Quality Gate Separation',
      payloadPreview: '{"deliverable_hash": "c81729b4892019ab76ce0f42337a...", "seal_verified": true}',
      status: 'WAITING',
    },
    {
      stepNumber: 7,
      title: 'Independent Deliverable Verification',
      sender: 'agent_verifier_03 (Independent Oracle)',
      receiver: 'ProtocolGateway Quality Gate',
      messageType: 'verification.decision',
      description: 'Agent C verifies artifact seal, schema conformance, and confidence (0.97 >= 0.85 threshold).',
      invariant: 'INV-173: Deliverable Eligible for Payment Clearance',
      payloadPreview: '{"decision": "ACCEPT", "confidence": 0.97, "eligible_for_payment": true}',
      status: 'WAITING',
    },
    {
      stepNumber: 8,
      title: 'Payment Request Authorization',
      sender: 'agent_security_02 (Provider)',
      receiver: 'AgentPay Clearinghouse',
      messageType: 'payment.request',
      description: 'PaymentRequest translates into canonical PaymentIntent pipeline with directory recipient lookup.',
      invariant: 'INV-163: Recipient Injection Prohibited (No Raw 0x...)',
      payloadPreview: '{"contract_id": "con_991", "recipient_service_id": "agent_security_02", "amount": "75.00"}',
      status: 'WAITING',
    },
    {
      stepNumber: 9,
      title: 'Policy Engine Clearance',
      sender: 'AgentPay Rust Policy Engine',
      receiver: 'AgentPay Treasury',
      messageType: 'policy.decision',
      description: 'Authoritative policy engine verifies tenant budget, risk score, and escrow balance.',
      invariant: 'INV-165: Authoritative Policy Evaluation',
      payloadPreview: '{"decision": "ALLOW", "risk_score": 12, "rule_verified": "RULE_BUDGET_APPROVED"}',
      status: 'WAITING',
    },
    {
      stepNumber: 10,
      title: 'Arc Settlement Confirmation',
      sender: 'AgentPay Settlement Engine',
      receiver: 'Arc Blockchain Ledger',
      messageType: 'settlement.confirmed',
      description: 'Payment settled on Arc. Escrow disbursed to Agent B. Contract state moves to SETTLED.',
      invariant: 'AGENTS DISCOVER. AGENTS NEGOTIATE. AGENTPAY CONTROLS. ARC SETTLES.',
      payloadPreview: '{"status": "SETTLED", "chain": "Arc-Testnet", "tx_hash": "0x4a7e...91b2"}',
      status: 'WAITING',
    },
  ];

  async function runStep(stepIdx: number) {
    if (stepIdx >= demoSteps.length) {
      setIsRunning(false);
      return;
    }
    setCurrentStep(stepIdx + 1);
    const s = demoSteps[stepIdx];
    const logEntry = `[STEP ${s.stepNumber}/10] ${s.title}: ${s.sender} -> ${s.receiver} | ${s.invariant}`;
    setLogs((prev) => [logEntry, ...prev]);
  }

  async function runFullSequence() {
    setIsRunning(true);
    setLogs([]);
    setCurrentStep(0);
    for (let i = 0; i < demoSteps.length; i++) {
      runStep(i);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setIsRunning(false);
  }

  const maliciousScenarios = [
    {
      id: 'mal_1',
      title: 'Scenario 1: Replay Attack (Double Spend)',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] Malicious agent resends previous signed message msg_881 with expired nonce...\n[PROTOCOL GATEWAY] Stage 4/6 AuthSigner checking nonce table...\n[INVARIANT BLOCKED] ErrINV170: Nonce nonce_prev_881 already consumed. Replay attack blocked.\n[STATUS] Zero financial state mutation. Attacker reputation slashed.`);
      },
    },
    {
      id: 'mal_2',
      title: 'Scenario 2: Recipient Address Injection',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] Malicious agent supplies raw recipient 0xDeadBeef00000000000000000000000000000000...\n[PROTOCOL GATEWAY] PaymentBoundary validating recipient address format...\n[INVARIANT BLOCKED] ErrINV163: Prohibited raw hex address. Recipient must resolve via registered service ID.\n[STATUS] PaymentIntent rejected before routing.`);
      },
    },
    {
      id: 'mal_3',
      title: 'Scenario 3: Premature Payment Demand',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] Malicious agent submits empty deliverable and demands immediate payment disbursement...\n[PROTOCOL GATEWAY] QualityGate validating SHA-256 seal and completeness...\n[INVARIANT BLOCKED] ErrINV173: Deliverable confidence 0.20 below 0.85 threshold. Ineligible for payment.\n[STATUS] PaymentRequest rejected.`);
      },
    },
    {
      id: 'mal_4',
      title: 'Scenario 4: Tenant Treasury Balance Snooping',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] External agent requests private treasury vault balances via /protocol/v1/treasury...\n[PROTOCOL GATEWAY] Domain Router checking permissions for external agent...\n[INVARIANT BLOCKED] ErrINV168: Unauthorized balance inspection. Private ledgers are strictly isolated.\n[STATUS] 403 Forbidden. External agents cannot inspect private ledgers.`);
      },
    },
    {
      id: 'mal_5',
      title: 'Scenario 5: Raw Blockchain Calldata Execution',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] Malicious agent sends raw EVM bytecode to /protocol/v1/execute...\n[PROTOCOL GATEWAY] Stage 1/6 MessageValidator checking payload schema...\n[INVARIANT BLOCKED] ErrINV164: Arbitrary calldata execution prohibited. Only structured canonical messages permitted.\n[STATUS] Request aborted.`);
      },
    },
    {
      id: 'mal_6',
      title: 'Scenario 6: Cross-Tenant State Tampering',
      trigger: () => {
        setMaliciousLog(`[ATTACK LAUNCHED] Agent from tenant_corp_b attempts to accept contract owned by tenant_corp_a...\n[PROTOCOL GATEWAY] Domain Router evaluating contract ownership...\n[INVARIANT BLOCKED] ErrINV172: Cross-tenant isolation violation. Agent tenant does not match contract tenant.\n[STATUS] Operation halted.`);
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Interactive Protocol Multi-Agent Demonstration
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Autonomous Economic Protocol in Action
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Agent A (Requester) ➔ Agent B (Specialist) ➔ Agent C (Oracle Verifier) ➔ AgentPay Control ➔ Arc Settlement
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runFullSequence}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              {isRunning ? 'Running Sequence...' : '▶ Run Full 10-Step Sequence'}
            </button>
            <Link
              href="/control/protocol"
              className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              Control Tower
            </Link>
          </div>
        </div>
      </div>

      {/* Main 10-Step Interactive Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Deterministic Protocol Lifecycle Steps
          </div>
          {demoSteps.map((step) => {
            const isCurrent = currentStep === step.stepNumber;
            const isCompleted = currentStep > step.stepNumber;

            return (
              <div
                key={step.stepNumber}
                onClick={() => runStep(step.stepNumber - 1)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/50'
                    : isCompleted
                    ? 'bg-slate-900/60 border-emerald-900/50'
                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCompleted ? '✓' : step.stepNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {step.sender} → {step.receiver}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 text-[10px] font-mono">
                    {step.messageType}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 ml-9">{step.description}</p>
                <div className="text-[11px] text-emerald-400 font-mono mt-1 ml-9">
                  {step.invariant}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Terminal Console */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 text-xs font-mono text-slate-400">
              <span>PROTOCOL AUDIT LOG</span>
              <span className="text-emerald-400">● GATEWAY ONLINE</span>
            </div>
            <div className="mt-4 space-y-2 text-xs font-mono text-slate-300 max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">
                  Click any step or hit &quot;Run Full Sequence&quot; to inspect real-time message payloads and invariant enforcement...
                </div>
              ) : (
                logs.map((l, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-900/70 border border-slate-800/80">
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
            Every step is machine-checked for invariants INV-161 through INV-180.
          </div>
        </div>
      </div>

      {/* Malicious Agent Attack Sandbox */}
      <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-rose-400 font-bold text-sm">⚠ ADVERSARIAL SANDBOX</span>
          <span className="text-xs text-slate-400 font-mono">— Malicious Agent Attack Vectors (Section 60 & 63)</span>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Execute attacks against the Protocol Gateway to verify that external malicious actors are deterministically neutralized.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {maliciousScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={sc.trigger}
              className="p-3.5 text-left rounded-xl bg-slate-900/80 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900 transition"
            >
              <div className="text-xs font-semibold text-rose-300">{sc.title}</div>
              <div className="text-[11px] text-slate-400 mt-1">Simulate attack against gateway ➔</div>
            </button>
          ))}
        </div>

        {maliciousLog && (
          <div className="rounded-xl bg-slate-950 border border-rose-800/50 p-4 font-mono text-xs text-rose-300 whitespace-pre-wrap leading-relaxed">
            {maliciousLog}
          </div>
        )}
      </div>
    </div>
  );
}
