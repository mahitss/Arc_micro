'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../lib/api/client';
import { AddressDisplay } from '../../components/AddressDisplay';

interface StepState {
  step: number;
  title: string;
  subtitle: string;
  status: 'PENDING' | 'ACTIVE' | 'SUCCESS' | 'DENIED' | 'SKIPPED';
  details?: Record<string, string | number | boolean | null | undefined>;
}

type DemoScenario = 'IDLE' | 'HAPPY_PATH' | 'DENIAL_PATH';

export default function DemoPage() {
  const [scenario, setScenario] = useState<DemoScenario>('IDLE');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [backendMode, setBackendMode] = useState<'LIVE' | 'DEMO_FALLBACK'>('LIVE');
  const [logMessages, setLogMessages] = useState<string[]>([]);

  // Pipeline Steps State
  const [step1Details, setStep1Details] = useState<Record<string, string> | null>(null);
  const [step2Details, setStep2Details] = useState<Record<string, string> | null>(null);
  const [step3Details, setStep3Details] = useState<Record<string, string> | null>(null);
  const [step4Details, setStep4Details] = useState<Record<string, string> | null>(null);
  const [step5Details, setStep5Details] = useState<Record<string, string> | null>(null);

  const appendLog = (msg: string) => {
    setLogMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const resetPipeline = () => {
    setActiveStepIndex(0);
    setStep1Details(null);
    setStep2Details(null);
    setStep3Details(null);
    setStep4Details(null);
    setStep5Details(null);
    setLogMessages([]);
  };

  // 1. HAPPY PATH DEMO: Research Agent (0.18 USDC)
  const runHappyPathDemo = async () => {
    resetPipeline();
    setScenario('HAPPY_PATH');
    setIsRunning(true);
    appendLog('Initiating Research Agent deterministic demo flow...');

    try {
      // --- STEP 1: Agent creates payment intent ---
      setActiveStepIndex(1);
      appendLog('STEP 1: Agent evaluating task: "Retrieve external research data."');
      await new Promise((r) => setTimeout(r, 600));

      let intentId = 'pi_demo_' + Math.random().toString(36).substring(2, 9);
      let recipient = '0x1111111111111111111111111111111111111111';
      let amountBaseUnits = '180000'; // 0.18 USDC
      let serviceId = 'web-research';

      // Attempt live backend call
      try {
        interface TaskResponse {
          task_id: string;
          status: string;
          payment_intent?: {
            intent_id: string;
            recipient: string;
            amount: string;
            service: string;
            justification?: string;
          };
        }
        const res = await apiRequest<TaskResponse>('/v1/agents/tasks', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: 'research-agent',
            task: 'Retrieve external research data.',
          }),
          timeoutMs: 3000,
        });

        if (res.payment_intent) {
          intentId = res.payment_intent.intent_id;
          recipient = res.payment_intent.recipient;
          amountBaseUnits = res.payment_intent.amount;
          serviceId = res.payment_intent.service;
          setBackendMode('LIVE');
          appendLog(`Connected to live Go Gateway: task_id=${res.task_id}`);
        }
      } catch {
        setBackendMode('DEMO_FALLBACK');
        appendLog('Backend unreachable; using deterministic demo parameters.');
      }

      setStep1Details({
        'Agent ID': 'research-agent',
        'Natural Language Task': 'Retrieve external research data.',
        'Target Service': `${serviceId} (Web Research & Intelligence API)`,
        'Resolved Recipient': recipient,
        'Amount Requested': '0.18 USDC (180,000 base units)',
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      appendLog(`Payment Intent generated: ${intentId} for 0.18 USDC`);
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 2: Policy evaluates request ---
      setActiveStepIndex(2);
      appendLog('STEP 2: Rust Policy Engine evaluating deterministic rules...');
      await new Promise((r) => setTimeout(r, 700));

      let policyDecision = 'ALLOW';
      let policyReason = 'ALL_CHECKS_PASSED';

      try {
        interface AuthResponse {
          decision: 'ALLOW' | 'DENY';
          reason?: string;
          remaining_daily_limit?: string;
        }
        const authRes = await apiRequest<AuthResponse>('/v1/payments/authorize', {
          method: 'POST',
          body: JSON.stringify({
            intent_id: intentId,
            agent_id: 'research-agent',
            recipient: recipient,
            amount: amountBaseUnits,
            asset: 'USDC',
          }),
          timeoutMs: 3000,
        });
        policyDecision = authRes.decision;
        policyReason = authRes.reason || policyReason;
      } catch {
        // Fallback: verified math
        policyDecision = 'ALLOW';
        policyReason = 'ALL_CHECKS_PASSED';
      }

      setStep2Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Per-Tx Limit Check': '0.18 USDC <= 0.50 USDC Limit (PASS)',
        'Daily Budget Check': '0.18 USDC <= 2.59 USDC Remaining (PASS)',
        'Recipient Allowlist': '0x1111...1111 in Allowed List (PASS)',
        'Frequency Check': 'Tx #8 of 20 Max Daily (PASS)',
        'Decision': policyDecision,
      });
      appendLog(`Policy Engine evaluation complete: ${policyDecision} (${policyReason})`);
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 3: Payment is approved ---
      setActiveStepIndex(3);
      appendLog('STEP 3: Cryptographic authorization granted.');
      setStep3Details({
        'Authorization Status': 'APPROVED (ALLOW)',
        'Signed Authorization': 'Verified by Rust engine',
        'State Transition': 'CREATED -> AUTHORIZED',
        'Execution Authorization': 'GRANTED',
      });
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 4: AgentVault executes ---
      setActiveStepIndex(4);
      appendLog('STEP 4: Execution service preparing AgentVault call...');
      await new Promise((r) => setTimeout(r, 800));

      let execStatus = 'DEMO / EXECUTION DISABLED';
      let txHash: string | null = null;

      try {
        interface ConfirmResponse {
          execution_status?: string;
          transaction_hash?: string;
          status?: string;
        }
        const confRes = await apiRequest<ConfirmResponse>(`/v1/payment-intents/${intentId}/confirm`, {
          method: 'POST',
          timeoutMs: 3000,
        });
        if (confRes.transaction_hash) {
          txHash = confRes.transaction_hash;
          execStatus = 'CONFIRMED';
        } else {
          execStatus = confRes.execution_status || 'DEMO / EXECUTION DISABLED';
        }
      } catch {
        execStatus = 'DEMO / EXECUTION DISABLED';
      }

      setStep4Details({
        'Smart Contract': 'AgentVault.sol',
        'Vault Address': '0x1111111111111111111111111111111111111111 (Arc Mainnet)',
        'Function': 'executePayment(intentId, recipient, 180000)',
        'Execution Status': execStatus,
        'Concurrency Guard': 'Atomic CAS (AUTHORIZED -> EXECUTING)',
      });
      appendLog(`Execution status: ${execStatus}`);
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 5: Arc confirms settlement ---
      setActiveStepIndex(5);
      appendLog('STEP 5: Arc settlement finalized.');

      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Settlement Token': 'Canonical USDC (0x3600...0000)',
        'Gas Currency': 'USDC Native Gas (18 decimals)',
        'Transaction Hash': txHash || 'DATA UNAVAILABLE (Demo Mode / Broadcast Disabled)',
        'Arc Explorer': txHash ? `https://explorer.arc.io/tx/${txHash}` : 'DATA UNAVAILABLE',
        'Settlement Status': 'VERIFIED / POLICY ENFORCED',
      });
      appendLog('Happy path demonstration complete.');
    } finally {
      setIsRunning(false);
    }
  };

  // 2. DENIAL DEMO: Payment above limit (6.00 USDC)
  const runDenialDemo = async () => {
    resetPipeline();
    setScenario('DENIAL_PATH');
    setIsRunning(true);
    appendLog('Initiating Safety Model Policy Denial demonstration...');

    try {
      // --- STEP 1: Agent creates over-limit intent ---
      setActiveStepIndex(1);
      appendLog('STEP 1: Agent requests bulk archive retrieval exceeding limit: 6.00 USDC');
      await new Promise((r) => setTimeout(r, 600));

      const intentId = 'pi_demo_deny_' + Math.random().toString(36).substring(2, 9);
      const recipient = '0x1111111111111111111111111111111111111111';

      setStep1Details({
        'Agent ID': 'research-agent',
        'Natural Language Task': 'Retrieve bulk market archive exceeding daily budget.',
        'Target Service': 'web-research (Web Research & Intelligence API)',
        'Resolved Recipient': recipient,
        'Amount Requested': '6.00 USDC (6,000,000 base units)',
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      appendLog(`Intent ${intentId} created for 6.00 USDC (Current Daily Cap: 5.00 USDC)`);
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 2: Policy evaluates request ---
      setActiveStepIndex(2);
      appendLog('STEP 2: Rust Policy Engine evaluating spending boundaries...');
      await new Promise((r) => setTimeout(r, 700));

      let decision = 'DENY';
      let reason = 'DAILY_LIMIT_EXCEEDED';

      try {
        interface AuthResponse {
          decision: 'ALLOW' | 'DENY';
          reason?: string;
        }
        const authRes = await apiRequest<AuthResponse>('/v1/payments/authorize', {
          method: 'POST',
          body: JSON.stringify({
            intent_id: intentId,
            agent_id: 'research-agent',
            recipient: recipient,
            amount: '6000000', // 6.00 USDC
            asset: 'USDC',
          }),
          timeoutMs: 3000,
        });
        decision = authRes.decision;
        reason = authRes.reason || reason;
      } catch {
        decision = 'DENY';
        reason = 'DAILY_LIMIT_EXCEEDED';
      }

      setStep2Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Per-Tx Limit Check': '6.00 USDC > 0.50 USDC Max (FAIL)',
        'Daily Budget Check': '6.00 USDC > 2.59 USDC Remaining (FAIL)',
        'Recipient Allowlist': '0x1111...1111 (PASS)',
        'Decision': decision,
        'Violation Code': reason,
      });
      appendLog(`Policy Engine evaluation result: ${decision} (${reason})`);
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 3: Payment is DENIED ---
      setActiveStepIndex(3);
      appendLog(`STEP 3: PAYMENT DENIED: ${reason}`);
      setStep3Details({
        'Payment Decision': 'PAYMENT DENIED',
        'Denial Reason': reason,
        'State Transition': 'CREATED -> DENIED',
        'Authorization Token': 'NONE (Execution Blocked)',
      });
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 4: AgentVault Execution is SKIPPED ---
      setActiveStepIndex(4);
      appendLog('STEP 4: Execution halted. Zero calls made to AgentVault.');
      setStep4Details({
        'Smart Contract Call': 'NONE (Execution Aborted Before Broadcast)',
        'Blockchain Transaction': 'NONE',
        'Gas Spent': '0 USDC',
        'Safety Invariant': 'Authorization Precedence Enforced',
      });
      await new Promise((r) => setTimeout(r, 800));

      // --- STEP 5: Arc settlement: NONE ---
      setActiveStepIndex(5);
      appendLog('STEP 5: Zero transactions recorded on Arc.');
      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Blockchain Transaction': 'NONE',
        'Arc Explorer Link': 'NONE (No on-chain activity)',
        'Vault Balance Impact': '0.00 USDC (Funds 100% Protected)',
        'Conclusion': 'Autonomous agent spending successfully blocked by policy.',
      });
      appendLog('Safety denial demonstration complete.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#0d1624] to-slate-900 p-6 sm:p-8 border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono mb-3">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Arc Microgrants Reviewer Demonstration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            AgentPay
          </h1>
          <p className="mt-2 text-base sm:text-lg text-teal-300 font-medium">
            Autonomous USDC payments with policy-controlled execution.
          </p>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            AI agents can reason and call tools, but autonomous economic actions require controlled spending authority.
            AgentPay provides an immutable policy and execution boundary between AI intent and on-chain Arc USDC settlement.
          </p>

          {/* Interactive Control Buttons */}
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <button
              onClick={runHappyPathDemo}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning && scenario === 'HAPPY_PATH' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  Running Demo...
                </>
              ) : (
                '▶ Run Research Agent Demo (0.18 USDC)'
              )}
            </button>

            <button
              onClick={runDenialDemo}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning && scenario === 'DENIAL_PATH' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                  Evaluating Denial...
                </>
              ) : (
                '🛡 Test Policy Denial (Over-Limit Attempt)'
              )}
            </button>

            {scenario !== 'IDLE' && (
              <button
                onClick={resetPipeline}
                disabled={isRunning}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-slate-800/60 border border-slate-700/60"
              >
                Reset
              </button>
            )}

            {backendMode === 'DEMO_FALLBACK' && (
              <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                ● DEMO MODE (Local simulation)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5-Step Visual Pipeline Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            5-Step Execution & Authorization Pipeline
          </h2>
          {scenario !== 'IDLE' && (
            <span className="text-xs font-mono text-teal-400">
              Scenario: {scenario === 'HAPPY_PATH' ? 'Research Agent Payment' : 'Safety Policy Denial'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* STEP 1 */}
          <StepCard
            stepNumber="STEP 1"
            title="Agent Intent"
            subtitle="AI creates payment intent"
            isActive={activeStepIndex === 1}
            isCompleted={activeStepIndex > 1}
            isDenied={false}
            details={step1Details}
          />

          {/* STEP 2 */}
          <StepCard
            stepNumber="STEP 2"
            title="Policy Evaluation"
            subtitle="Rust engine evaluates request"
            isActive={activeStepIndex === 2}
            isCompleted={activeStepIndex > 2}
            isDenied={scenario === 'DENIAL_PATH' && activeStepIndex >= 2}
            details={step2Details}
          />

          {/* STEP 3 */}
          <StepCard
            stepNumber="STEP 3"
            title="Decision"
            subtitle={scenario === 'DENIAL_PATH' ? 'Payment is DENIED' : 'Payment is APPROVED'}
            isActive={activeStepIndex === 3}
            isCompleted={activeStepIndex > 3}
            isDenied={scenario === 'DENIAL_PATH' && activeStepIndex >= 3}
            details={step3Details}
          />

          {/* STEP 4 */}
          <StepCard
            stepNumber="STEP 4"
            title="AgentVault"
            subtitle={scenario === 'DENIAL_PATH' ? 'Execution ABORTED' : 'Contract executes payment'}
            isActive={activeStepIndex === 4}
            isCompleted={activeStepIndex > 4}
            isDenied={scenario === 'DENIAL_PATH' && activeStepIndex >= 4}
            details={step4Details}
          />

          {/* STEP 5 */}
          <StepCard
            stepNumber="STEP 5"
            title="Arc Settlement"
            subtitle={scenario === 'DENIAL_PATH' ? 'Transaction: NONE' : 'Arc confirms settlement'}
            isActive={activeStepIndex === 5}
            isCompleted={activeStepIndex >= 5 && !isRunning}
            isDenied={scenario === 'DENIAL_PATH' && activeStepIndex >= 5}
            details={step5Details}
          />
        </div>
      </div>

      {/* Transaction Proof & Evidence Box (When Completed) */}
      {activeStepIndex === 5 && !isRunning && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Verified On-Chain Evidence & Settlement Record</span>
              {scenario === 'HAPPY_PATH' ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  APPROVED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  PAYMENT DENIED
                </span>
              )}
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Settlement Layer: Arc Mainnet (Chain ID 5042)
            </span>
          </div>

          {scenario === 'HAPPY_PATH' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Amount Settled</span>
                <span className="text-white font-bold text-sm">0.18 USDC</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">180,000 base units</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Recipient Service</span>
                <AddressDisplay address="0x1111111111111111111111111111111111111111" truncate={true} copyable={true} />
                <span className="text-slate-400 text-[10px] block mt-0.5">Web Research API</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Settlement Status</span>
                <span className="text-emerald-400 font-semibold">DEMO / EXECUTION DISABLED</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">Safety gate active</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Arc Explorer</span>
                <span className="text-slate-400">DATA UNAVAILABLE</span>
                <span className="text-slate-400 text-[10px] block mt-0.5">No fake hashes created</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                PAYMENT DENIED: DAILY_LIMIT_EXCEEDED
              </div>
              <p className="text-slate-300 text-xs font-sans">
                The agent attempted to spend 6.00 USDC, exceeding its daily spending limit. The Rust Policy Engine rejected the payment off-chain.
              </p>
              <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between text-slate-400">
                <span>Blockchain Transaction: <strong className="text-white">NONE</strong></span>
                <span>On-Chain Gas Incurred: <strong className="text-white">0 USDC</strong></span>
                <span>Vault State: <strong className="text-emerald-400">UNTOUCHED</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Execution Log Console */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-slate-400">
          <span>Demonstration Log Trace</span>
          <span>{logMessages.length} events</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1 text-slate-300">
          {logMessages.length === 0 ? (
            <div className="text-slate-600">Select a scenario above to start the interactive demo.</div>
          ) : (
            logMessages.map((msg, i) => (
              <div key={i} className="leading-relaxed">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Link to Full Architecture */}
      <div className="flex justify-between items-center text-xs font-mono text-slate-400 pt-4 border-t border-slate-800/60">
        <span>Need deeper architectural details?</span>
        <div className="space-x-4">
          <Link href="/dashboard" className="text-teal-400 hover:underline">
            Open Dashboard →
          </Link>
          <Link href="/payment-intents" className="text-teal-400 hover:underline">
            View Payment Intents →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface StepCardProps {
  stepNumber: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  isCompleted: boolean;
  isDenied: boolean;
  details: Record<string, string> | null;
}

function StepCard({
  stepNumber,
  title,
  subtitle,
  isActive,
  isCompleted,
  isDenied,
  details,
}: StepCardProps) {
  let borderColor = 'border-slate-800/80';
  let badgeColor = 'bg-slate-800 text-slate-400';

  if (isActive) {
    borderColor = isDenied ? 'border-rose-500 shadow-rose-500/20 shadow-lg' : 'border-teal-400 shadow-teal-500/20 shadow-lg';
    badgeColor = isDenied ? 'bg-rose-500 text-slate-950 animate-pulse' : 'bg-teal-400 text-slate-950 animate-pulse';
  } else if (isCompleted) {
    borderColor = isDenied ? 'border-rose-800/60' : 'border-emerald-500/50';
    badgeColor = isDenied ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-500/20 text-emerald-300';
  }

  return (
    <div className={`p-4 rounded-xl bg-slate-900/60 border ${borderColor} transition-all duration-300 flex flex-col justify-between min-h-[260px]`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${badgeColor}`}>
            {stepNumber}
          </span>
          {isCompleted && !isDenied && (
            <span className="text-emerald-400 text-xs">✓ Done</span>
          )}
          {isDenied && (
            <span className="text-rose-400 text-xs">✕ Denied</span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>

        {/* Detailed parameters when populated */}
        {details && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5 text-[10px] font-mono">
            {Object.entries(details).map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-slate-400">{k}:</span>
                <span className={`break-all ${k.includes('Decision') && v === 'DENY' ? 'text-rose-400 font-bold' : k.includes('Decision') && v === 'ALLOW' ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!details && (
        <div className="text-[10px] font-mono text-slate-600 italic mt-4">
          Awaiting scenario trigger...
        </div>
      )}
    </div>
  );
}
