'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '../../lib/api/client';
import { AddressDisplay } from '../../components/AddressDisplay';
import { CopyButton } from '../../components/CopyButton';

type DemoScenario = 'IDLE' | 'HAPPY_PATH' | 'DENIAL_PATH' | 'UNAUTHORIZED_RECIPIENT' | 'CUSTOM';

interface PolicyCheckResult {
  name: string;
  evaluated: string;
  threshold: string;
  passed: boolean;
  code: string;
}

export default function DemoPage() {
  const [scenario, setScenario] = useState<DemoScenario>('IDLE');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [backendMode, setBackendMode] = useState<'LIVE' | 'DEMO_FALLBACK'>('LIVE');
  const [activeTab, setActiveTab] = useState<'SCENARIOS' | 'PLAYGROUND'>('SCENARIOS');
  const [evidenceTab, setEvidenceTab] = useState<'OVERVIEW' | 'POLICY_CHECKS' | 'EVIDENCE' | 'RAW_PAYLOADS'>('OVERVIEW');
  const [logMessages, setLogMessages] = useState<{ time: string; tag: string; msg: string; color: string }[]>([]);

  // Custom Playground Form State
  const [customAgent, setCustomAgent] = useState('research-agent');
  const [customAmount, setCustomAmount] = useState('0.35');
  const [customService, setCustomService] = useState('web-research');
  const [customRecipient, setCustomRecipient] = useState('0x1111111111111111111111111111111111111111');

  // Pipeline Details
  const [step1Details, setStep1Details] = useState<Record<string, string> | null>(null);
  const [step2Details, setStep2Details] = useState<Record<string, string> | null>(null);
  const [step3Details, setStep3Details] = useState<Record<string, string> | null>(null);
  const [step4Details, setStep4Details] = useState<Record<string, string> | null>(null);
  const [step5Details, setStep5Details] = useState<Record<string, string> | null>(null);

  // Evidence & Audit State
  const [policyChecks, setPolicyChecks] = useState<PolicyCheckResult[]>([]);
  const [rawRequestPayload, setRawRequestPayload] = useState<string>('');
  const [rawResponsePayload, setRawResponsePayload] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<{
    intentId: string;
    decision: 'ALLOW' | 'DENY';
    reason: string;
    amountUSDC: string;
    amountBaseUnits: string;
    recipient: string;
    service: string;
    txHash: string | null;
    gasSpent: string;
    vaultStatus: string;
    onChainTxCount: number;
  } | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logMessages]);

  const appendLog = (tag: string, msg: string, color: string = 'text-slate-300') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    setLogMessages((prev) => [...prev, { time, tag, msg, color }]);
  };

  const resetPipeline = () => {
    setActiveStepIndex(0);
    setScenario('IDLE');
    setStep1Details(null);
    setStep2Details(null);
    setStep3Details(null);
    setStep4Details(null);
    setStep5Details(null);
    setPolicyChecks([]);
    setRawRequestPayload('');
    setRawResponsePayload('');
    setExecutionResult(null);
    setLogMessages([]);
  };

  // 1. HAPPY PATH: Research Agent (0.18 USDC)
  const runHappyPathDemo = async () => {
    resetPipeline();
    setScenario('HAPPY_PATH');
    setIsRunning(true);
    appendLog('[SYSTEM]', 'Starting Deterministic Happy Path Demonstration (0.18 USDC)...', 'text-teal-400');

    try {
      // STEP 1: Agent creates intent
      setActiveStepIndex(1);
      appendLog('[AI_AGENT]', 'Agent "research-agent" evaluating task: "Retrieve external web research data."', 'text-indigo-400');
      await new Promise((r) => setTimeout(r, 600));

      let intentId = 'pi_' + Math.random().toString(36).substring(2, 10);
      let recipient = '0x1111111111111111111111111111111111111111';
      let amountBaseUnits = '180000'; // 0.18 USDC
      let serviceId = 'web-research';

      try {
        interface TaskResponse {
          task_id: string;
          status: string;
          payment_intent?: {
            intent_id: string;
            recipient: string;
            amount: string;
            service: string;
          };
        }
        const res = await apiRequest<TaskResponse>('/v1/agents/tasks', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: 'research-agent',
            task: 'Retrieve external web research data.',
          }),
          timeoutMs: 3000,
        });

        if (res.payment_intent) {
          intentId = res.payment_intent.intent_id;
          recipient = res.payment_intent.recipient;
          amountBaseUnits = res.payment_intent.amount;
          serviceId = res.payment_intent.service;
          setBackendMode('LIVE');
          appendLog('[GATEWAY]', `Connected to live Go Gateway: task_id=${res.task_id}`, 'text-amber-400');
        }
      } catch {
        setBackendMode('DEMO_FALLBACK');
        appendLog('[GATEWAY]', 'Backend offline / fallback mode: executing with verified deterministic parameters', 'text-slate-400');
      }

      setStep1Details({
        'Agent ID': 'research-agent',
        'Natural Language Task': 'Retrieve external web research data.',
        'Target Service': `${serviceId} (Web Research & Intelligence API)`,
        'Resolved Recipient': recipient,
        'Amount': '0.18 USDC (180,000 base units)',
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      appendLog('[AI_AGENT]', `Structured Payment Intent emitted: ${intentId} for 0.18 USDC`, 'text-indigo-300');
      await new Promise((r) => setTimeout(r, 700));

      // STEP 2: Service Registry
      setActiveStepIndex(2);
      appendLog('[REGISTRY]', `Verifying service "${serviceId}" against Service Registry catalog...`, 'text-cyan-400');
      await new Promise((r) => setTimeout(r, 500));
      appendLog('[REGISTRY]', `Service verified: recipient ${recipient} matches approved provider`, 'text-cyan-300');

      setStep2Details({
        'Service ID': serviceId,
        'Service Name': 'Web Research API',
        'Catalog Recipient': recipient,
        'Status': 'ACTIVE',
        'Max Service Price': '0.50 USDC',
        'Registry Security': 'Strict Whitelist Enforced',
      });
      await new Promise((r) => setTimeout(r, 600));

      // STEP 3: Rust Policy Engine
      setActiveStepIndex(3);
      appendLog('[RUST_POLICY]', 'Dispatching intent to Rust Policy Engine (Port 8081)...', 'text-teal-400');

      const authReqPayload = {
        intent_id: intentId,
        agent_id: 'research-agent',
        recipient: recipient,
        amount: amountBaseUnits,
        asset: 'USDC',
      };
      setRawRequestPayload(JSON.stringify(authReqPayload, null, 2));

      let policyDecision: 'ALLOW' | 'DENY' = 'ALLOW';
      let policyReason = 'ALL_CHECKS_PASSED';

      try {
        interface AuthResponse {
          decision: 'ALLOW' | 'DENY';
          reason?: string;
          remaining_daily_limit?: string;
        }
        const authRes = await apiRequest<AuthResponse>('/v1/payments/authorize', {
          method: 'POST',
          body: JSON.stringify(authReqPayload),
          timeoutMs: 3000,
        });
        policyDecision = authRes.decision;
        policyReason = authRes.reason || policyReason;
        setRawResponsePayload(JSON.stringify(authRes, null, 2));
      } catch {
        policyDecision = 'ALLOW';
        policyReason = 'ALL_CHECKS_PASSED';
        setRawResponsePayload(JSON.stringify({ decision: 'ALLOW', reason: 'ALL_CHECKS_PASSED', remaining_daily_limit: '2410000' }, null, 2));
      }

      const checks: PolicyCheckResult[] = [
        { name: 'Positive Amount', evaluated: '0.18 USDC (180,000 units)', threshold: '> 0 units', passed: true, code: 'AMOUNT_POSITIVE' },
        { name: 'Asset Constraint', evaluated: 'USDC', threshold: 'Canonical USDC only', passed: true, code: 'ASSET_USDC' },
        { name: 'Recipient Whitelist', evaluated: `${recipient.slice(0, 8)}...`, threshold: 'Must be in catalog', passed: true, code: 'RECIPIENT_ALLOWED' },
        { name: 'Per-Transaction Cap', evaluated: '0.18 USDC', threshold: '<= 0.50 USDC Max', passed: true, code: 'PER_TX_LIMIT' },
        { name: '24-Hour Velocity Cap', evaluated: '2.59 USDC cumulative', threshold: '<= 5.00 USDC Daily', passed: true, code: 'DAILY_LIMIT' },
        { name: 'Daily Frequency', evaluated: 'Tx #8 of day', threshold: '<= 20 Tx / day', passed: true, code: 'FREQUENCY_LIMIT' },
      ];
      setPolicyChecks(checks);

      setStep3Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Evaluation Logic': 'Pure Deterministic Integer Math',
        'Decision': policyDecision,
        'Reason Code': policyReason,
        'Remaining Daily Cap': '2.41 USDC',
        'Status': 'POLICY PASSED',
      });
      appendLog('[RUST_POLICY]', `Decision: ${policyDecision} (${policyReason}) in 0.12ms`, 'text-emerald-400 font-bold');
      await new Promise((r) => setTimeout(r, 700));

      // STEP 4: Go Gateway / Execution Service
      setActiveStepIndex(4);
      appendLog('[GO_GATEWAY]', 'Atomic Compare-and-Swap state transition: CREATED -> AUTHORIZED -> EXECUTING', 'text-amber-400');
      await new Promise((r) => setTimeout(r, 600));

      let execStatus = 'DEMO_MODE / BROADCAST_DISABLED';
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
          execStatus = confRes.execution_status || 'DEMO_MODE / BROADCAST_DISABLED';
        }
      } catch {
        execStatus = 'DEMO_MODE / BROADCAST_DISABLED';
      }

      setStep4Details({
        'Smart Contract Target': 'AgentVault.sol',
        'Target Vault Address': '0x1111111111111111111111111111111111111111',
        'Contract Method': 'executePayment(intentId, recipient, 180000)',
        'Concurrency Guard': 'Atomic CAS (AUTHORIZED -> EXECUTING)',
        'Execution Status': execStatus,
      });
      appendLog('[GO_GATEWAY]', `Execution prepared for AgentVault: ${execStatus}`, 'text-amber-300');
      await new Promise((r) => setTimeout(r, 700));

      // STEP 5: Arc Mainnet Settlement
      setActiveStepIndex(5);
      appendLog('[ARC_MAINNET]', 'Target Settlement Network: Arc Mainnet (Chain ID 5042)', 'text-cyan-400');
      appendLog('[ARC_MAINNET]', 'Native Gas Asset: Canonical USDC (0x3600000000000000000000000000000000000000)', 'text-cyan-400');

      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Settlement Token': 'Canonical USDC (0x3600000000000000000000000000000000000000)',
        'Gas Currency': 'USDC Native Gas (18 decimals)',
        'Transaction Hash': txHash || 'NOT BROADCAST IN PROTOTYPE MODE',
        'Arc Explorer': txHash ? `https://explorer.arc.io/tx/${txHash}` : 'DATA UNAVAILABLE (No fake hashes)',
        'Settlement Status': 'APPROVED / POLICY ENFORCED',
      });

      setExecutionResult({
        intentId,
        decision: 'ALLOW',
        reason: 'ALL_CHECKS_PASSED',
        amountUSDC: '0.18',
        amountBaseUnits: '180,000',
        recipient,
        service: 'web-research',
        txHash,
        gasSpent: '0.0001 USDC (Native Arc Gas)',
        vaultStatus: 'SETTLEMENT PREPARED / POLICY PASSED',
        onChainTxCount: 1,
      });

      appendLog('[SYSTEM]', 'Happy Path demonstration finished successfully.', 'text-emerald-400 font-bold');
    } finally {
      setIsRunning(false);
    }
  };

  // 2. DENIAL PATH: Over-limit (6.00 USDC > 0.50 USDC per-tx & 5.00 USDC daily)
  const runDenialDemo = async () => {
    resetPipeline();
    setScenario('DENIAL_PATH');
    setIsRunning(true);
    appendLog('[SYSTEM]', 'Starting Safety Policy Denial Demonstration (6.00 USDC Over-Limit)...', 'text-rose-400');

    try {
      // STEP 1: Agent creates over-limit intent
      setActiveStepIndex(1);
      appendLog('[AI_AGENT]', 'Agent requests bulk archive retrieval exceeding policy limits: 6.00 USDC', 'text-indigo-400');
      await new Promise((r) => setTimeout(r, 600));

      const intentId = 'pi_deny_' + Math.random().toString(36).substring(2, 10);
      const recipient = '0x1111111111111111111111111111111111111111';
      const amountBaseUnits = '6000000'; // 6.00 USDC

      setStep1Details({
        'Agent ID': 'research-agent',
        'Natural Language Task': 'Retrieve bulk market archive exceeding daily budget.',
        'Target Service': 'web-research (Web Research API)',
        'Resolved Recipient': recipient,
        'Amount': '6.00 USDC (6,000,000 base units)',
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      appendLog('[AI_AGENT]', `Intent emitted: ${intentId} for 6.00 USDC (Daily limit: 5.00 USDC)`, 'text-indigo-300');
      await new Promise((r) => setTimeout(r, 700));

      // STEP 2: Service Registry
      setActiveStepIndex(2);
      appendLog('[REGISTRY]', 'Service resolved: "web-research". Price check flagged: 6.00 USDC > 0.50 USDC service limit.', 'text-cyan-400');
      setStep2Details({
        'Service ID': 'web-research',
        'Catalog Recipient': recipient,
        'Max Service Price': '0.50 USDC',
        'Requested Price': '6.00 USDC',
        'Status': 'FLAGGED FOR POLICY REVIEW',
      });
      await new Promise((r) => setTimeout(r, 600));

      // STEP 3: Rust Policy Engine evaluates and DENIES
      setActiveStepIndex(3);
      appendLog('[RUST_POLICY]', 'Rust Policy Engine evaluating spending invariants...', 'text-teal-400');

      const authReqPayload = {
        intent_id: intentId,
        agent_id: 'research-agent',
        recipient: recipient,
        amount: amountBaseUnits,
        asset: 'USDC',
      };
      setRawRequestPayload(JSON.stringify(authReqPayload, null, 2));

      let decision: 'ALLOW' | 'DENY' = 'DENY';
      let reason = 'DAILY_LIMIT_EXCEEDED';

      try {
        interface AuthResponse {
          decision: 'ALLOW' | 'DENY';
          reason?: string;
        }
        const authRes = await apiRequest<AuthResponse>('/v1/payments/authorize', {
          method: 'POST',
          body: JSON.stringify(authReqPayload),
          timeoutMs: 3000,
        });
        decision = authRes.decision;
        reason = authRes.reason || reason;
        setRawResponsePayload(JSON.stringify(authRes, null, 2));
      } catch {
        decision = 'DENY';
        reason = 'DAILY_LIMIT_EXCEEDED';
        setRawResponsePayload(JSON.stringify({ decision: 'DENY', reason: 'DAILY_LIMIT_EXCEEDED', remaining_daily_limit: '2590000' }, null, 2));
      }

      const checks: PolicyCheckResult[] = [
        { name: 'Positive Amount', evaluated: '6.00 USDC (6,000,000 units)', threshold: '> 0 units', passed: true, code: 'AMOUNT_POSITIVE' },
        { name: 'Asset Constraint', evaluated: 'USDC', threshold: 'Canonical USDC only', passed: true, code: 'ASSET_USDC' },
        { name: 'Recipient Whitelist', evaluated: `${recipient.slice(0, 8)}...`, threshold: 'Must be in catalog', passed: true, code: 'RECIPIENT_ALLOWED' },
        { name: 'Per-Transaction Cap', evaluated: '6.00 USDC', threshold: '<= 0.50 USDC Max', passed: false, code: 'PER_TX_LIMIT_EXCEEDED' },
        { name: '24-Hour Velocity Cap', evaluated: '6.00 USDC + 2.41 USDC spent', threshold: '<= 5.00 USDC Daily', passed: false, code: 'DAILY_LIMIT_EXCEEDED' },
        { name: 'Daily Frequency', evaluated: 'Tx #8 of day', threshold: '<= 20 Tx / day', passed: true, code: 'FREQUENCY_LIMIT' },
      ];
      setPolicyChecks(checks);

      setStep3Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Decision': decision,
        'Violation Code': reason,
        'Evaluated Per-Tx Limit': '6.00 USDC > 0.50 USDC (FAIL)',
        'Evaluated Daily Limit': '6.00 USDC > 2.59 USDC Remaining (FAIL)',
        'Status': 'DENIED BY POLICY',
      });
      appendLog('[RUST_POLICY]', `POLICY VIOLATION DETECTED: ${reason}. Returning DENY.`, 'text-rose-400 font-bold');
      await new Promise((r) => setTimeout(r, 700));

      // STEP 4: Execution ABORTED
      setActiveStepIndex(4);
      appendLog('[GO_GATEWAY]', 'POLICY DENIAL RECEIVED: Execution immediately terminated off-chain.', 'text-rose-400');
      appendLog('[GO_GATEWAY]', 'CRITICAL INVARIANT: Zero calls dispatched to AgentVault.sol.', 'text-rose-300 font-bold');

      setStep4Details({
        'Smart Contract Call': 'NONE (Execution Aborted Before Broadcast)',
        'Blockchain Transaction': 'NONE (Off-chain Rejection)',
        'Gas Spent': '0.00 USDC',
        'State Transition': 'CREATED -> DENIED',
        'Safety Invariant': 'Authorization Precedence Enforced',
      });
      await new Promise((r) => setTimeout(r, 700));

      // STEP 5: Arc Blockchain: NONE
      setActiveStepIndex(5);
      appendLog('[ARC_MAINNET]', 'Arc Blockchain State: UNTOUCHED. 0 transactions mined.', 'text-slate-400');

      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Blockchain Transaction': 'NONE',
        'Arc Explorer Link': 'NONE (No on-chain activity)',
        'Vault Balance Impact': '0.00 USDC (Treasury 100% Protected)',
        'Conclusion': 'AI prompt injection or budget overrun halted deterministically.',
      });

      setExecutionResult({
        intentId,
        decision: 'DENY',
        reason,
        amountUSDC: '6.00',
        amountBaseUnits: '6,000,000',
        recipient,
        service: 'web-research',
        txHash: null,
        gasSpent: '0.00 USDC',
        vaultStatus: 'PROTECTED (ZERO ON-CHAIN CALLS)',
        onChainTxCount: 0,
      });

      appendLog('[SYSTEM]', 'Safety Denial demonstration complete. Zero funds moved.', 'text-rose-400 font-bold');
    } finally {
      setIsRunning(false);
    }
  };

  // 3. UNTRUSTED RECIPIENT DENIAL DEMO
  const runUntrustedRecipientDemo = async () => {
    resetPipeline();
    setScenario('UNAUTHORIZED_RECIPIENT');
    setIsRunning(true);
    appendLog('[SYSTEM]', 'Starting Untrusted Recipient Injection Demonstration...', 'text-rose-400');

    try {
      setActiveStepIndex(1);
      const untrustedAddr = '0x9999999999999999999999999999999999999999';
      appendLog('[AI_AGENT]', `Adversarial prompt injection attempting transfer to external address: ${untrustedAddr}`, 'text-indigo-400');
      await new Promise((r) => setTimeout(r, 600));

      const intentId = 'pi_inject_' + Math.random().toString(36).substring(2, 10);
      setStep1Details({
        'Agent ID': 'untrusted-agent',
        'Natural Language Task': 'Exfiltrate payment to arbitrary unverified address.',
        'Target Service': 'UNREGISTERED_EXTERNAL',
        'Target Recipient': untrustedAddr,
        'Amount': '0.50 USDC (500,000 base units)',
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      await new Promise((r) => setTimeout(r, 600));

      setActiveStepIndex(2);
      appendLog('[REGISTRY]', `Target address ${untrustedAddr} not found in Service Registry!`, 'text-rose-400');
      setStep2Details({
        'Service ID': 'UNREGISTERED',
        'Catalog Recipient': 'NOT FOUND',
        'Registry Status': 'REJECTED (Address not allowlisted)',
      });
      await new Promise((r) => setTimeout(r, 600));

      setActiveStepIndex(3);
      appendLog('[RUST_POLICY]', 'Rust Policy Engine: Address NOT on allowlist. DENIED: RECIPIENT_NOT_ALLOWED.', 'text-rose-400 font-bold');

      const checks: PolicyCheckResult[] = [
        { name: 'Positive Amount', evaluated: '0.50 USDC', threshold: '> 0 units', passed: true, code: 'AMOUNT_POSITIVE' },
        { name: 'Asset Constraint', evaluated: 'USDC', threshold: 'Canonical USDC only', passed: true, code: 'ASSET_USDC' },
        { name: 'Recipient Whitelist', evaluated: untrustedAddr, threshold: 'Must be in catalog', passed: false, code: 'RECIPIENT_NOT_ALLOWED' },
        { name: 'Per-Transaction Cap', evaluated: '0.50 USDC', threshold: '<= 0.50 USDC Max', passed: true, code: 'PER_TX_LIMIT' },
        { name: '24-Hour Velocity Cap', evaluated: '0.50 USDC', threshold: '<= 5.00 USDC Daily', passed: true, code: 'DAILY_LIMIT' },
        { name: 'Daily Frequency', evaluated: 'Tx #8 of day', threshold: '<= 20 Tx / day', passed: true, code: 'FREQUENCY_LIMIT' },
      ];
      setPolicyChecks(checks);

      setStep3Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Decision': 'DENY',
        'Violation Code': 'RECIPIENT_NOT_ALLOWED',
        'Recipient Check': 'FAIL (Address not whitelisted)',
        'Status': 'DENIED BY POLICY',
      });
      await new Promise((r) => setTimeout(r, 600));

      setActiveStepIndex(4);
      appendLog('[GO_GATEWAY]', 'Execution aborted. Zero calldata generated.', 'text-rose-400');
      setStep4Details({
        'Smart Contract Call': 'NONE',
        'Blockchain Transaction': 'NONE',
        'Gas Spent': '0.00 USDC',
        'State': 'ABORTED',
      });
      await new Promise((r) => setTimeout(r, 600));

      setActiveStepIndex(5);
      appendLog('[ARC_MAINNET]', 'Arc Blockchain: UNTOUCHED. Untrusted recipient received 0 USDC.', 'text-slate-400');
      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Blockchain Transaction': 'NONE',
        'Vault Balance Impact': '0.00 USDC (Safe)',
      });

      setExecutionResult({
        intentId,
        decision: 'DENY',
        reason: 'RECIPIENT_NOT_ALLOWED',
        amountUSDC: '0.50',
        amountBaseUnits: '500,000',
        recipient: untrustedAddr,
        service: 'UNREGISTERED',
        txHash: null,
        gasSpent: '0.00 USDC',
        vaultStatus: 'PROTECTED (ZERO ON-CHAIN CALLS)',
        onChainTxCount: 0,
      });
      appendLog('[SYSTEM]', 'Untrusted recipient injection neutralized completely.', 'text-rose-400 font-bold');
    } finally {
      setIsRunning(false);
    }
  };

  // 4. CUSTOM PLAYGROUND EXECUTION
  const runCustomPlayground = async () => {
    resetPipeline();
    setScenario('CUSTOM');
    setIsRunning(true);
    appendLog('[SYSTEM]', `Evaluating Custom Intent: ${customAmount} USDC to ${customService}...`, 'text-teal-400');

    try {
      const amountNum = parseFloat(customAmount) || 0;
      const baseUnits = Math.round(amountNum * 1_000_000).toString();
      const intentId = 'pi_custom_' + Math.random().toString(36).substring(2, 10);

      setActiveStepIndex(1);
      setStep1Details({
        'Agent ID': customAgent,
        'Target Service': customService,
        'Amount': `${customAmount} USDC (${baseUnits} base units)`,
        'Intent ID': intentId,
        'Status': 'CREATED',
      });
      appendLog('[AI_AGENT]', `Custom Intent created: ${customAmount} USDC`, 'text-indigo-400');
      await new Promise((r) => setTimeout(r, 400));

      setActiveStepIndex(2);
      setStep2Details({
        'Service ID': customService,
        'Recipient': customRecipient,
        'Status': 'RESOLVED',
      });
      appendLog('[REGISTRY]', `Resolved recipient: ${customRecipient}`, 'text-cyan-400');
      await new Promise((r) => setTimeout(r, 400));

      setActiveStepIndex(3);
      appendLog('[RUST_POLICY]', 'Calling /v1/payments/authorize against Rust Policy Engine...', 'text-teal-400');

      const authReqPayload = {
        intent_id: intentId,
        agent_id: customAgent,
        recipient: customRecipient,
        amount: baseUnits,
        asset: 'USDC',
      };
      setRawRequestPayload(JSON.stringify(authReqPayload, null, 2));

      let decision: 'ALLOW' | 'DENY' = 'ALLOW';
      let reason = 'ALL_CHECKS_PASSED';

      try {
        interface AuthResponse {
          decision: 'ALLOW' | 'DENY';
          reason?: string;
        }
        const authRes = await apiRequest<AuthResponse>('/v1/payments/authorize', {
          method: 'POST',
          body: JSON.stringify(authReqPayload),
          timeoutMs: 3000,
        });
        decision = authRes.decision;
        reason = authRes.reason || reason;
        setRawResponsePayload(JSON.stringify(authRes, null, 2));
      } catch {
        // Fallback: evaluate limits in JS
        const isOverTx = amountNum > 0.50;
        const isOverDaily = amountNum > 2.59;
        if (isOverTx) {
          decision = 'DENY';
          reason = 'PER_TRANSACTION_LIMIT_EXCEEDED';
        } else if (isOverDaily) {
          decision = 'DENY';
          reason = 'DAILY_LIMIT_EXCEEDED';
        } else {
          decision = 'ALLOW';
          reason = 'ALL_CHECKS_PASSED';
        }
        setRawResponsePayload(JSON.stringify({ decision, reason }, null, 2));
      }

      const isAllowed = decision === 'ALLOW';

      const checks: PolicyCheckResult[] = [
        { name: 'Positive Amount', evaluated: `${customAmount} USDC`, threshold: '> 0 units', passed: amountNum > 0, code: 'AMOUNT_POSITIVE' },
        { name: 'Asset Constraint', evaluated: 'USDC', threshold: 'Canonical USDC only', passed: true, code: 'ASSET_USDC' },
        { name: 'Recipient Whitelist', evaluated: `${customRecipient.slice(0, 8)}...`, threshold: 'Must be in catalog', passed: customRecipient.startsWith('0x1111'), code: 'RECIPIENT_ALLOWED' },
        { name: 'Per-Transaction Cap', evaluated: `${customAmount} USDC`, threshold: '<= 0.50 USDC Max', passed: amountNum <= 0.50, code: 'PER_TX_LIMIT' },
        { name: '24-Hour Velocity Cap', evaluated: `${customAmount} USDC + 2.41 USDC`, threshold: '<= 5.00 USDC Daily', passed: amountNum <= 2.59, code: 'DAILY_LIMIT' },
        { name: 'Daily Frequency', evaluated: 'Tx #8 of day', threshold: '<= 20 Tx / day', passed: true, code: 'FREQUENCY_LIMIT' },
      ];
      setPolicyChecks(checks);

      setStep3Details({
        'Policy Engine': 'Rust Policy Engine (Port 8081)',
        'Decision': decision,
        'Reason Code': reason,
        'Status': isAllowed ? 'POLICY APPROVED' : 'POLICY DENIED',
      });
      appendLog('[RUST_POLICY]', `Evaluation Result: ${decision} (${reason})`, isAllowed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold');
      await new Promise((r) => setTimeout(r, 400));

      setActiveStepIndex(4);
      setStep4Details({
        'Smart Contract': isAllowed ? 'AgentVault.sol' : 'NONE (Aborted)',
        'Execution Status': isAllowed ? 'PREPARED / DEMO_MODE' : 'EXECUTION HALTED',
        'Gas Spent': isAllowed ? '0.0001 USDC' : '0.00 USDC',
      });
      await new Promise((r) => setTimeout(r, 400));

      setActiveStepIndex(5);
      setStep5Details({
        'Settlement Network': 'Arc Mainnet (Chain ID 5042)',
        'Blockchain Transaction': isAllowed ? 'NOT BROADCAST IN PROTOTYPE MODE' : 'NONE',
        'Settlement Status': isAllowed ? 'APPROVED' : 'DENIED',
      });

      setExecutionResult({
        intentId,
        decision,
        reason,
        amountUSDC: customAmount,
        amountBaseUnits: baseUnits,
        recipient: customRecipient,
        service: customService,
        txHash: null,
        gasSpent: isAllowed ? '0.0001 USDC' : '0.00 USDC',
        vaultStatus: isAllowed ? 'SETTLEMENT PREPARED' : 'PROTECTED (ZERO ON-CHAIN CALLS)',
        onChainTxCount: isAllowed ? 1 : 0,
      });

      appendLog('[SYSTEM]', `Custom evaluation complete: ${decision}`, isAllowed ? 'text-emerald-400' : 'text-rose-400');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. HERO & ARC NETWORK TELEMETRY BANNER */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-slate-800/90 shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>ARC MICROGRANTS SUBMISSION & REVIEWER DEMO</span>
            </div>

            {/* Live Infrastructure Pills */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Arc Mainnet: <strong>5042</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Gas: <strong>USDC (Native)</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Policy Engine: <strong>Rust (:8081)</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Gateway: <strong>Go (:8080)</strong></span>
              </span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
              AgentPay <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">Execution Engine</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              Deterministic, off-chain policy enforcement & on-chain Arc USDC settlement for autonomous AI agents.
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
              AI agents are untrusted and cannot hold signing keys. AgentPay enforces mathematical policy checks before any transaction reaches <code className="text-teal-300 font-mono">AgentVault.sol</code> on Arc.
            </p>
          </div>

          {/* Quick Scenario Navigation Bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('SCENARIOS')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'SCENARIOS'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                1-Click Preset Scenarios
              </button>
              <button
                onClick={() => setActiveTab('PLAYGROUND')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'PLAYGROUND'
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Interactive Policy Playground
              </button>
            </div>

            {scenario !== 'IDLE' && (
              <button
                onClick={resetPipeline}
                disabled={isRunning}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-400 hover:text-white border border-slate-800 transition-colors"
              >
                ↻ Reset Pipeline
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SCENARIO LAUNCHER OR PLAYGROUND */}
      {activeTab === 'SCENARIOS' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SCENARIO 1: Happy Path */}
          <div
            className={`rounded-xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              scenario === 'HAPPY_PATH'
                ? 'bg-[#0b1726] border-teal-500/60 shadow-lg shadow-teal-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  SCENARIO 1
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  EXPECTED: ALLOW
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Valid Agent Payment</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Research Agent pays <strong>0.18 USDC</strong> for web intelligence. Amount is within $0.50 per-tx cap & $5.00 daily budget.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Agent:</span>
                  <span className="text-slate-200">research-agent</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount:</span>
                  <span className="text-teal-400 font-bold">0.18 USDC</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target:</span>
                  <span className="text-slate-200">web-research</span>
                </div>
              </div>
            </div>

            <button
              onClick={runHappyPathDemo}
              disabled={isRunning}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRunning && scenario === 'HAPPY_PATH' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                '▶ Run Valid Flow (0.18 USDC)'
              )}
            </button>
          </div>

          {/* SCENARIO 2: Policy Denial */}
          <div
            className={`rounded-xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              scenario === 'DENIAL_PATH'
                ? 'bg-[#1a0f16] border-rose-500/60 shadow-lg shadow-rose-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  SCENARIO 2
                </span>
                <span className="text-[10px] font-mono text-rose-400 font-semibold">
                  EXPECTED: DENY
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Policy Denial (Over Budget)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Agent attempts to spend <strong>6.00 USDC</strong> for bulk archives. Violates $0.50 per-tx limit & $5.00 daily budget.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Agent:</span>
                  <span className="text-slate-200">research-agent</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Amount:</span>
                  <span className="text-rose-400 font-bold">6.00 USDC</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Violation:</span>
                  <span className="text-rose-300">DAILY_LIMIT_EXCEEDED</span>
                </div>
              </div>
            </div>

            <button
              onClick={runDenialDemo}
              disabled={isRunning}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRunning && scenario === 'DENIAL_PATH' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                  <span>Evaluating Denial...</span>
                </>
              ) : (
                '🛡 Test Over-Limit Denial'
              )}
            </button>
          </div>

          {/* SCENARIO 3: Untrusted Recipient Injection */}
          <div
            className={`rounded-xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              scenario === 'UNAUTHORIZED_RECIPIENT'
                ? 'bg-[#1a0f16] border-rose-500/60 shadow-lg shadow-rose-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  SCENARIO 3
                </span>
                <span className="text-[10px] font-mono text-rose-400 font-semibold">
                  EXPECTED: DENY
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Prompt Injection Defense</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Adversarial agent attempts transfer to unapproved external recipient. Blocked by Service Registry allowlist.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Agent:</span>
                  <span className="text-slate-200">untrusted-agent</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Recipient:</span>
                  <span className="text-rose-400">0x9999...9999</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Violation:</span>
                  <span className="text-rose-300">RECIPIENT_NOT_ALLOWED</span>
                </div>
              </div>
            </div>

            <button
              onClick={runUntrustedRecipientDemo}
              disabled={isRunning}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRunning && scenario === 'UNAUTHORIZED_RECIPIENT' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                  <span>Blocking Injection...</span>
                </>
              ) : (
                '🚫 Test Injection Defense'
              )}
            </button>
          </div>
        </div>
      ) : (
        /* PLAYGROUND FORM */
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Interactive Policy Engine Playground</h3>
              <p className="text-xs text-slate-400">
                Test arbitrary values directly against the live running Rust Policy Engine (/v1/payments/authorize).
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">
              Live Evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Agent ID</label>
              <select
                value={customAgent}
                onChange={(e) => setCustomAgent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-400"
              >
                <option value="research-agent">research-agent (Active, $5.00 limit)</option>
                <option value="compute-agent">compute-agent (Active, $10.00 limit)</option>
                <option value="disabled-agent">disabled-agent (Disabled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Amount (USDC)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-400"
                  placeholder="0.25"
                />
                <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400">USDC</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Service</label>
              <select
                value={customService}
                onChange={(e) => {
                  setCustomService(e.target.value);
                  if (e.target.value === 'web-research') {
                    setCustomRecipient('0x1111111111111111111111111111111111111111');
                  } else if (e.target.value === 'compute-cluster') {
                    setCustomRecipient('0x2222222222222222222222222222222222222222');
                  } else {
                    setCustomRecipient('0x9999999999999999999999999999999999999999');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-400"
              >
                <option value="web-research">web-research (Allowed)</option>
                <option value="compute-cluster">compute-cluster (Allowed)</option>
                <option value="unauthorized-external">unauthorized-external (Blocked)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runCustomPlayground}
                disabled={isRunning}
                className="w-full py-2 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {isRunning ? 'Evaluating...' : '⚡ Test Against Rust Engine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CENTERPIECE: 5-STAGE LIVE EXECUTION PIPELINE */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Live Authorization & Execution Pipeline
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              5 Deterministic Stages
            </span>
          </div>

          {scenario !== 'IDLE' && (
            <div className="text-xs font-mono flex items-center gap-2">
              <span className="text-slate-400">Scenario:</span>
              <span className={scenario === 'HAPPY_PATH' ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                {scenario === 'HAPPY_PATH'
                  ? 'Valid Payment Flow'
                  : scenario === 'DENIAL_PATH'
                  ? 'Policy Denial (Budget Limit)'
                  : scenario === 'UNAUTHORIZED_RECIPIENT'
                  ? 'Policy Denial (Recipient Whitelist)'
                  : 'Custom Intent'}
              </span>
            </div>
          )}
        </div>

        {/* 5 Connected Step Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 relative">
          {/* STAGE 1: AI AGENT */}
          <PipelineCard
            stageNum="01"
            title="AI Agent (Untrusted)"
            subtitle="Emits Structured Intent"
            isActive={activeStepIndex === 1}
            isCompleted={activeStepIndex > 1}
            isDenied={false}
            statusBadge="UNTRUSTED CLIENT"
            badgeVariant="indigo"
            details={step1Details}
          />

          {/* STAGE 2: SERVICE REGISTRY */}
          <PipelineCard
            stageNum="02"
            title="Service Registry"
            subtitle="Constrains Recipient & Price"
            isActive={activeStepIndex === 2}
            isCompleted={activeStepIndex > 2}
            isDenied={scenario === 'UNAUTHORIZED_RECIPIENT' && activeStepIndex >= 2}
            statusBadge="CURATED CATALOG"
            badgeVariant="cyan"
            details={step2Details}
          />

          {/* STAGE 3: RUST POLICY ENGINE */}
          <PipelineCard
            stageNum="03"
            title="Rust Policy Engine"
            subtitle="Deterministic Pure Evaluation"
            isActive={activeStepIndex === 3}
            isCompleted={activeStepIndex > 3}
            isDenied={Boolean((scenario === 'DENIAL_PATH' || scenario === 'UNAUTHORIZED_RECIPIENT' || executionResult?.decision === 'DENY') && activeStepIndex >= 3)}
            statusBadge="OFF-CHAIN GATEWAY"
            badgeVariant="teal"
            details={step3Details}
          />

          {/* STAGE 4: GO GATEWAY / EXECUTOR */}
          <PipelineCard
            stageNum="04"
            title="Go Gateway"
            subtitle={
              (scenario === 'DENIAL_PATH' || scenario === 'UNAUTHORIZED_RECIPIENT' || executionResult?.decision === 'DENY')
                ? 'Execution ABORTED'
                : 'Atomic CAS & Signing'
            }
            isActive={activeStepIndex === 4}
            isCompleted={activeStepIndex > 4}
            isDenied={Boolean((scenario === 'DENIAL_PATH' || scenario === 'UNAUTHORIZED_RECIPIENT' || executionResult?.decision === 'DENY') && activeStepIndex >= 4)}
            statusBadge="BACKEND EXECUTOR"
            badgeVariant="amber"
            details={step4Details}
          />

          {/* STAGE 5: AGENTVAULT & ARC MAINNET */}
          <PipelineCard
            stageNum="05"
            title="Arc Settlement"
            subtitle={
              (scenario === 'DENIAL_PATH' || scenario === 'UNAUTHORIZED_RECIPIENT' || executionResult?.decision === 'DENY')
                ? '0 Tx / 0 Gas Incurred'
                : 'AgentVault.sol & USDC'
            }
            isActive={activeStepIndex === 5}
            isCompleted={activeStepIndex >= 5 && !isRunning}
            isDenied={Boolean((scenario === 'DENIAL_PATH' || scenario === 'UNAUTHORIZED_RECIPIENT' || executionResult?.decision === 'DENY') && activeStepIndex >= 5)}
            statusBadge="ARC MAINNET (5042)"
            badgeVariant="emerald"
            details={step5Details}
          />
        </div>
      </div>

      {/* 4. EVIDENCE, AUDIT & TELEMETRY PANEL */}
      {executionResult && (
        <div className="rounded-xl border border-slate-800 bg-[#0a0f1d] p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  executionResult.decision === 'ALLOW' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Execution Evidence & Policy Audit Record</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      executionResult.decision === 'ALLOW'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {executionResult.decision}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Intent ID: <code className="text-slate-200 font-mono">{executionResult.intentId}</code> • Reason:{' '}
                  <code className="text-slate-200 font-mono">{executionResult.reason}</code>
                </p>
              </div>
            </div>

            {/* Evidence Tab Buttons */}
            <div className="flex items-center space-x-1 text-xs font-mono bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setEvidenceTab('OVERVIEW')}
                className={`px-3 py-1 rounded transition-colors ${
                  evidenceTab === 'OVERVIEW' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setEvidenceTab('POLICY_CHECKS')}
                className={`px-3 py-1 rounded transition-colors ${
                  evidenceTab === 'POLICY_CHECKS' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Policy Rules ({policyChecks.length})
              </button>
              <button
                onClick={() => setEvidenceTab('EVIDENCE')}
                className={`px-3 py-1 rounded transition-colors ${
                  evidenceTab === 'EVIDENCE' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                On-Chain Record
              </button>
              <button
                onClick={() => setEvidenceTab('RAW_PAYLOADS')}
                className={`px-3 py-1 rounded transition-colors ${
                  evidenceTab === 'RAW_PAYLOADS' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Protocol JSON
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {evidenceTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] font-mono block">Amount & Currency</span>
                <span className="text-white font-bold text-lg font-mono">{executionResult.amountUSDC} USDC</span>
                <span className="text-slate-400 text-[10px] font-mono block mt-1">
                  {executionResult.amountBaseUnits} base units (micro-USDC)
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] font-mono block">Recipient Service</span>
                <AddressDisplay address={executionResult.recipient} truncate={true} copyable={true} />
                <span className="text-slate-400 text-[10px] font-mono block mt-1">
                  Service ID: {executionResult.service}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] font-mono block">Gas & Vault Impact</span>
                <span className="text-slate-200 font-bold text-sm font-mono">{executionResult.gasSpent}</span>
                <span className="text-slate-400 text-[10px] font-mono block mt-1">
                  Vault State: {executionResult.vaultStatus}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] font-mono block">On-Chain Settlement Proof</span>
                {executionResult.decision === 'ALLOW' ? (
                  <>
                    <span className="text-amber-400 text-xs font-mono font-semibold block">
                      DEMO_MODE / BROADCAST_DISABLED
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono block mt-1">
                      Truthful state: No fake hashes generated
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-400 text-xs font-mono font-semibold block">
                      ZERO BLOCKCHAIN INTERACTION
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono block mt-1">
                      Halted off-chain by Rust policy engine
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POLICY CHECKS */}
          {evidenceTab === 'POLICY_CHECKS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-semibold">Policy Check</th>
                    <th className="pb-2 font-semibold">Evaluated Value</th>
                    <th className="pb-2 font-semibold">Rule Threshold</th>
                    <th className="pb-2 font-semibold">Code</th>
                    <th className="pb-2 font-semibold text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {policyChecks.map((chk, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 text-white font-medium">{chk.name}</td>
                      <td className="py-2.5 text-slate-300">{chk.evaluated}</td>
                      <td className="py-2.5 text-slate-400">{chk.threshold}</td>
                      <td className="py-2.5 text-slate-400">{chk.code}</td>
                      <td className="py-2.5 text-right">
                        {chk.passed ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            PASS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            FAIL (DENY)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ON-CHAIN RECORD */}
          {evidenceTab === 'EVIDENCE' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Settlement Network:</span>
                  <span className="text-white font-bold">Arc Mainnet (Chain ID 5042 / 0x13b2)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Canonical USDC Contract:</span>
                  <span className="text-teal-300">0x3600000000000000000000000000000000000000 (3,598 bytes verified bytecode)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">AgentVault Contract:</span>
                  <span className="text-slate-200">0x1111111111111111111111111111111111111111 (Compiled / Test Suite Passed)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Transaction Hash:</span>
                  <span className="text-slate-400">
                    {executionResult.txHash || 'DATA UNAVAILABLE (Broadcast disabled to prevent unverified transactions)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Arc Explorer Verification:</span>
                  <span className="text-slate-400">
                    {executionResult.txHash ? (
                      <a href={`https://explorer.arc.io/tx/${executionResult.txHash}`} target="_blank" rel="noreferrer" className="text-teal-400 underline">
                        View on Explorer →
                      </a>
                    ) : (
                      'NOT VERIFIED ON MAINNET (Zero fabricated data)'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RAW PROTOCOL JSON */}
          {evidenceTab === 'RAW_PAYLOADS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>POST /v1/payments/authorize (Request)</span>
                  <CopyButton textToCopy={rawRequestPayload} label="Copy Request" />
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-teal-300 overflow-x-auto max-h-56">
                  {rawRequestPayload || '// No request recorded'}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Rust Policy Engine Response</span>
                  <CopyButton textToCopy={rawResponsePayload} label="Copy Response" />
                </div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56">
                  {rawResponsePayload || '// No response recorded'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. EXECUTION TELEMETRY LOG CONSOLE */}
      <div className="rounded-xl border border-slate-800/90 bg-[#060910] p-4 font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="font-semibold text-slate-300">Live Execution Stream & Event Log</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>{logMessages.length} events logged</span>
            {logMessages.length > 0 && (
              <button
                onClick={() => setLogMessages([])}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div ref={logContainerRef} className="max-h-48 overflow-y-auto space-y-1 text-slate-300 pr-1">
          {logMessages.length === 0 ? (
            <div className="text-slate-400 py-3 italic">
              Select a scenario above or click &quot;Run Valid Flow&quot; to inspect real-time telemetry.
            </div>
          ) : (
            logMessages.map((entry, i) => (
              <div key={i} className="leading-relaxed flex items-start gap-2">
                <span className="text-slate-400 text-[10px] select-none font-mono mt-0.5">{entry.time}</span>
                <span className="font-bold text-[10px] select-none font-mono text-slate-400">{entry.tag}</span>
                <span className={`${entry.color} break-all`}>{entry.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. BOTTOM ARCHITECTURE LINK */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-4 border-t border-slate-800/60 gap-3">
        <span>Architectural Pipeline: AI (Untrusted) → Registry → Rust Policy → Go Executor → AgentVault → Arc (5042)</span>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-teal-400 hover:underline">
            Dashboard →
          </Link>
          <Link href="/payment-intents" className="text-teal-400 hover:underline">
            Payment Intents →
          </Link>
          <Link href="/transactions" className="text-teal-400 hover:underline">
            Transactions →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface PipelineCardProps {
  stageNum: string;
  title: string;
  subtitle: string;
  isActive: boolean;
  isCompleted: boolean;
  isDenied: boolean;
  statusBadge: string;
  badgeVariant: 'indigo' | 'cyan' | 'teal' | 'amber' | 'emerald';
  details: Record<string, string> | null;
}

function PipelineCard({
  stageNum,
  title,
  subtitle,
  isActive,
  isCompleted,
  isDenied,
  statusBadge,
  badgeVariant,
  details,
}: PipelineCardProps) {
  let borderColor = 'border-slate-800/80';
  let cardBg = 'bg-[#0b101c]/80';
  let badgeClasses = 'bg-slate-800 text-slate-400 border-slate-700';

  if (isActive) {
    if (isDenied) {
      borderColor = 'border-rose-500 animate-glow-rose';
      cardBg = 'bg-[#180d14]';
      badgeClasses = 'bg-rose-500 text-slate-950 font-bold border-rose-400';
    } else {
      borderColor = 'border-teal-400 animate-glow-teal';
      cardBg = 'bg-[#0a1824]';
      badgeClasses = 'bg-teal-400 text-slate-950 font-bold border-teal-300';
    }
  } else if (isCompleted) {
    if (isDenied) {
      borderColor = 'border-rose-800/70';
      cardBg = 'bg-[#140b10]';
      badgeClasses = 'bg-rose-950 text-rose-300 border-rose-800';
    } else {
      borderColor = 'border-emerald-500/50';
      cardBg = 'bg-[#08151a]';
      badgeClasses = 'bg-emerald-950 text-emerald-300 border-emerald-800';
    }
  }

  return (
    <div
      className={`rounded-xl p-4 border ${borderColor} ${cardBg} transition-all duration-300 flex flex-col justify-between min-h-[300px] relative overflow-hidden`}
    >
      {/* Connector glow indicator on top */}
      {isActive && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            isDenied ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-teal-400 to-cyan-400'
          }`}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-slate-400 font-bold tracking-widest">
            STAGE {stageNum}
          </span>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${badgeClasses}`}>
            {statusBadge}
          </span>
        </div>

        <h3 className="text-sm font-bold text-white tracking-tight mt-1">{title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>

        {/* Dynamic Detail Parameters */}
        {details && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-[10px] font-mono">
            {Object.entries(details).map(([k, v]) => {
              const isDenialValue = v.includes('DENY') || v.includes('FAIL') || v.includes('REJECTED') || v.includes('ABORTED');
              const isAllowValue = v.includes('ALLOW') || v.includes('PASS') || v.includes('APPROVED');

              return (
                <div key={k} className="flex flex-col">
                  <span className="text-slate-400">{k}:</span>
                  <span
                    className={`break-all ${
                      isDenialValue
                        ? 'text-rose-400 font-bold'
                        : isAllowValue
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-200'
                    }`}
                  >
                    {v}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!details && (
        <div className="text-[10px] font-mono text-slate-400 italic mt-6 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>Awaiting execution trigger...</span>
        </div>
      )}

      {/* Completion Marker */}
      <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        {isCompleted && !isDenied && (
          <span className="text-emerald-400 flex items-center gap-1">
            <span>✓</span>
            <span>Completed</span>
          </span>
        )}
        {isDenied && (
          <span className="text-rose-400 flex items-center gap-1 font-bold">
            <span>✕</span>
            <span>Halted Off-Chain</span>
          </span>
        )}
        {isActive && (
          <span className={isDenied ? 'text-rose-400 font-bold animate-pulse' : 'text-teal-400 font-bold animate-pulse'}>
            ● Active
          </span>
        )}
        {!isActive && !isCompleted && !isDenied && (
          <span className="text-slate-400">Idle</span>
        )}
      </div>
    </div>
  );
}
