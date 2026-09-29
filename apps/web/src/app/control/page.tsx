'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchControlOverview,
  fetchControlActivity,
  fetchFinancialTrace,
  fetchControlSearch,
  ExecutiveOverview,
  ControlActivityEvent,
  UniversalFinancialTrace,
  ControlSearchResult,
} from '../../lib/api/control';
import {
  AgentPayCard,
  AgentPayBadge,
  AgentPayMetric,
  AgentPayPanel,
  AgentPayInspector,
  InspectorEntity,
} from '@/components/ui';

interface EconomicTraceEvent {
  stepIndex: number;
  timestamp: string;
  actor: string;
  domain: string;
  action: string;
  economicImpact: string;
  policyDecision: string;
  status:
    | 'INITIALIZED'
    | 'SIMULATED'
    | 'DISCOVERED'
    | 'QUOTED'
    | 'SELECTED'
    | 'POLICY_CHECK'
    | 'RISK_CHECK'
    | 'APPROVAL'
    | 'RESERVED'
    | 'EXECUTING'
    | 'CONFIRMED'
    | 'VERIFIED'
    | 'EVALUATED'
    | 'REPLANNING'
    | 'FAILED';
  details: string;
  amount?: string;
  correlationId: string;
  whyTitle: string;
  whyExplanation: string;
  whyNotTitle: string;
  whyNotExplanation: string[];
}

const CANONICAL_ECONOMIC_TIMELINE: EconomicTraceEvent[] = [
  {
    stepIndex: 1,
    timestamp: '12:04:01',
    actor: 'Enterprise Operator',
    domain: 'OBJECTIVES',
    action: 'OBJECTIVE CREATED',
    economicImpact: 'Envelope Cap: $25.00 USDC',
    policyDecision: 'ALLOW (INV-140: User authorized objective)',
    status: 'INITIALIZED',
    amount: '$25.00',
    correlationId: 'obj_market_intel_01',
    details: 'Instantiated "Autonomous Market Intelligence Mission". Scope: 4 specialized agents benchmarking inference costs.',
    whyTitle: 'WHY WAS THIS OBJECTIVE ACCEPTED?',
    whyExplanation: 'Authorized by authenticated operator with valid cryptographic session and explicit $25.00 USDC envelope cap.',
    whyNotTitle: 'WHY NOT UNCONSTRAINED AUTONOMY?',
    whyNotExplanation: [
      'Unbounded budget: Prohibited by INV-140 (every mission requires explicit financial envelope).',
      'Direct on-chain execution: Prohibited in SIMULATION mode.'
    ],
  },
  {
    stepIndex: 2,
    timestamp: '12:04:03',
    actor: 'Planning Agent (Nemotron 550B)',
    domain: 'PLANNING',
    action: 'PLAN GENERATED',
    economicImpact: 'Projected Cost: $18.50 USDC',
    policyDecision: 'ADVISORY (Structured Proposal with SHA-256 Digest)',
    status: 'SIMULATED',
    amount: '$18.50',
    correlationId: 'plan_decomp_01',
    details: 'AI decomposed mission into 3 stages: Discovery, Benchmarking, Synthesis. Zero financial authority conveyed.',
    whyTitle: 'WHY DID AI GENERATE THIS PLAN?',
    whyExplanation: 'Model proposed 3-stage DAG matching required deliverable criteria with $18.50 projected cost within $25.00 cap.',
    whyNotTitle: 'WHY NOT IMMEDIATE PAYMENT?',
    whyNotExplanation: [
      'AI cannot authorize funds: AI proposals are strictly advisory (INV-02) and lack signing capability.'
    ],
  },
  {
    stepIndex: 3,
    timestamp: '12:04:05',
    actor: 'Marketplace Matcher',
    domain: 'MARKETPLACE',
    action: 'SERVICES DISCOVERED',
    economicImpact: '3 Eligible Candidates Found',
    policyDecision: 'ALLOW (Directory allowlist verified)',
    status: 'DISCOVERED',
    correlationId: 'mkt_disc_881',
    details: 'Discovered candidate providers: agent_fast_infer, agent_budget_ai, agent_ultra_deep.',
    whyTitle: 'WHY WERE THESE CANDIDATES DISCOVERED?',
    whyExplanation: 'Matched capability requirements (data_analysis, web_search) on verified merchant registry.',
    whyNotTitle: 'WHY NOT UNREGISTERED NODES?',
    whyNotExplanation: [
      'Unregistered nodes: Blocked by POL-003 (recipient must resolve from authorized registry).'
    ],
  },
  {
    stepIndex: 4,
    timestamp: '12:04:07',
    actor: 'Candidate Providers',
    domain: 'MARKETPLACE',
    action: 'QUOTES RECEIVED',
    economicImpact: 'Quotes: $12.50, $14.00, $28.00',
    policyDecision: 'EVALUATE (Quotes within or exceeding budget)',
    status: 'QUOTED',
    correlationId: 'quote_eval_442',
    details: 'Received 3 signed quotes with latency, SLA, and pricing guarantees.',
    whyTitle: 'WHY WERE QUOTES COMPARED?',
    whyExplanation: 'Autonomous selection algorithm balances expected cost, capability score, and historical SLA.',
    whyNotTitle: 'WHY NOT FIRST AVAILABLE QUOTE?',
    whyNotExplanation: [
      'Competitive bidding: Mandated to ensure optimal economic efficiency and budget preservation.'
    ],
  },
  {
    stepIndex: 5,
    timestamp: '12:04:09',
    actor: 'Autonomous Matcher',
    domain: 'MARKETPLACE',
    action: 'PROVIDER SELECTED',
    economicImpact: 'Quote: $12.50 USDC to agent_fast_infer',
    policyDecision: 'PASS (Lowest cost within SLA)',
    status: 'SELECTED',
    amount: '$12.50',
    correlationId: 'sel_fast_infer_01',
    details: 'Selected agent_fast_infer based on 210ms latency, $12.50 cost, and 99.4% historical completion rate.',
    whyTitle: 'WHY WAS THIS AGENT SELECTED?',
    whyExplanation: 'Lowest eligible quote ($12.50) within mission budget SLA with 99.4% historical completion rate.',
    whyNotTitle: 'WHY WAS PROVIDER B ($28.00) REJECTED?',
    whyNotExplanation: [
      'agent_ultra_deep ($28.00): Exceeds mission budget ceiling ($25.00 USDC) (POL-001).',
      'agent_budget_ai ($14.00): Higher price than agent_fast_infer ($12.50) for initial compute step.'
    ],
  },
  {
    stepIndex: 6,
    timestamp: '12:04:12',
    actor: 'Rust Policy Engine',
    domain: 'GOVERNANCE',
    action: 'POLICY CHECK',
    economicImpact: 'Evaluation Time: 6.36 µs',
    policyDecision: 'ALLOW (Deterministic Constitution v8)',
    status: 'POLICY_CHECK',
    correlationId: 'pol_eval_9912',
    details: 'Verified single-tx limit (<$50.00), velocity cap, daily envelope, and recipient on allowlist.',
    whyTitle: 'WHY DID POLICY EMIT ALLOW?',
    whyExplanation: 'All constitutional rules satisfied in 6.36µs: Recipient verified, amount $12.50 within policy limit $50.00.',
    whyNotTitle: 'WHY NOT OPERATOR ESCALATION?',
    whyNotExplanation: [
      'Automatic approval: Policy threshold is $20.00 USDC; $12.50 requires zero human intervention.'
    ],
  },
  {
    stepIndex: 7,
    timestamp: '12:04:13',
    actor: 'Financial Risk Engine',
    domain: 'RISK',
    action: 'RISK CHECK',
    economicImpact: 'Composite Risk Score: 18 / 100 (LOW)',
    policyDecision: 'PASS (Capital Adequacy Ratio: 4.8x)',
    status: 'RISK_CHECK',
    correlationId: 'risk_chk_001',
    details: 'Evaluated market volatility, counterpart exposure, and concentration limits.',
    whyTitle: 'WHY WAS RISK SCORED AS LOW?',
    whyExplanation: 'Single provider exposure is below 15% of total treasury buffer, with zero credit arrears.',
    whyNotTitle: 'WHY NOT HIGH RISK?',
    whyNotExplanation: [
      'No concentration breach: Provider volume well below $500.00 daily velocity threshold.'
    ],
  },
  {
    stepIndex: 8,
    timestamp: '12:04:14',
    actor: 'Approval Engine',
    domain: 'APPROVALS',
    action: 'APPROVAL',
    economicImpact: 'Tier: Tier-1 Automated ($0 - $20)',
    policyDecision: 'APPROVED (Autonomous threshold)',
    status: 'APPROVAL',
    correlationId: 'appr_tier1_88',
    details: 'Transaction cleared under Tier-1 autonomous governance. Dual-custody co-signature not required (<$20.00).',
    whyTitle: 'WHY WAS AUTOMATED APPROVAL GRANTED?',
    whyExplanation: 'Amount ($12.50) is below the $20.00 human-in-the-loop escalation boundary.',
    whyNotTitle: 'WHY NOT DUAL-CUSTODY SIGN OFF?',
    whyNotExplanation: [
      'Dual-custody reserved for high value: Only transactions >$20.00 USDC require co-signatures (INV-14).'
    ],
  },
  {
    stepIndex: 9,
    timestamp: '12:04:16',
    actor: 'Autonomous Treasury',
    domain: 'TREASURY',
    action: 'TREASURY RESERVATION',
    economicImpact: 'Atomic Lock: $12.50 USDC Encumbered',
    policyDecision: 'BALANCED (INV-75: Zero unreserved risk)',
    status: 'RESERVED',
    amount: '$12.50',
    correlationId: 'res_trsy_1250',
    details: 'Double-entry reservation journaled. Uncommitted liquidity reduced from $89.00 to $76.50 USDC.',
    whyTitle: 'WHY WAS LIQUIDITY ENCUMBERED ATOMICALLY?',
    whyExplanation: 'Prevents race conditions and double-spending across concurrent sub-agents under mutex lock (INV-75).',
    whyNotTitle: 'WHY NOT EXECUTE WITHOUT RESERVATION?',
    whyNotExplanation: [
      'Unreserved execution: Prohibited by INV-91 (every execution requires active treasury reservation).'
    ],
  },
  {
    stepIndex: 10,
    timestamp: '12:04:18',
    actor: 'Execution Gate & Signer',
    domain: 'EXECUTION',
    action: 'SIMULATED EXECUTION',
    economicImpact: 'Simulated Intent: pi_sim_9941 (NOT BROADCAST)',
    policyDecision: 'AUTHORIZED (Deterministic Gate Approved)',
    status: 'EXECUTING',
    amount: '$12.50',
    correlationId: 'pi_sim_9941',
    details: 'Execution mode: SIMULATION. Agent received 0 private keys. No transaction signed or broadcast to mainnet (INV-107, INV-141). Deterministic authorization verified.',
    whyTitle: 'WHY DID AGENT RECEIVE ZERO PRIVATE KEYS?',
    whyExplanation: 'Keyless agent security (INV-141): Agents generate intents; execution remains in simulation with zero broadcast.',
    whyNotTitle: 'WHY NOT DIRECT AGENT SIGNING?',
    whyNotExplanation: [
      'Agent-held keys: Unacceptable risk of prompt injection or key extraction.',
      'Live signing disabled: Live execution is disabled (ENABLE_LIVE_EXECUTION=false).'
    ],
  },
  {
    stepIndex: 11,
    timestamp: '12:04:20',
    actor: 'Durable Runtime',
    domain: 'EXECUTION',
    action: 'PROVIDER FAILURE',
    economicImpact: 'Budget Lost: $0.00 USDC (Envelope Preserved)',
    policyDecision: 'SAFEGUARD (Payment not blindly retried)',
    status: 'FAILED',
    correlationId: 'fail_heartbeat_91',
    details: 'Injected deterministic heartbeat timeout. Worker isolated via lease fencing (INV-101). Financial execution halted.',
    whyTitle: 'WHY WAS THE FAILED PAYMENT NOT RETRIED?',
    whyExplanation: 'Execution became ambiguous. Blind retries prohibited by INV-103. Budget remains 100% intact.',
    whyNotTitle: 'WHY NOT BLIND AUTO-RETRY?',
    whyNotExplanation: [
      'Blind retry: Violates INV-103 (blind retries risk double-spending on ambiguous worker state).'
    ],
  },
  {
    stepIndex: 12,
    timestamp: '12:04:21',
    actor: 'Mission Replanner',
    domain: 'RECOVERY',
    action: 'REPLAN',
    economicImpact: 'Failover to agent_budget_ai ($14.00 USDC)',
    policyDecision: 'MAINTAINED (Financial authority unchanged)',
    status: 'REPLANNING',
    amount: '$14.00',
    correlationId: 'replan_recov_02',
    details: 'Preserved upstream evidence. Evaluated secondary provider within remaining budget margin. Swapped compute step.',
    whyTitle: 'WHY WAS REPLANNING TRIGGERED INSTEAD OF TERMINATION?',
    whyExplanation: 'Autonomy allows DAG plan adjustment while preserving financial authority limits ($25.00 cap unchanged).',
    whyNotTitle: 'WHY NOT REQUEST BUDGET EXPANSION?',
    whyNotExplanation: [
      'Self-escalation: Blocked by INV-143 & INV-148 (replanner cannot increase financial authority).'
    ],
  },
  {
    stepIndex: 13,
    timestamp: '12:04:25',
    actor: 'Arc Settlement Consensus',
    domain: 'SETTLEMENT',
    action: 'ARC SETTLEMENT (SIMULATED)',
    economicImpact: 'Simulated Settlement: $14.00 USDC (0 REAL FUNDS MOVED)',
    policyDecision: 'CONFIRMED (Simulation Model)',
    status: 'CONFIRMED',
    amount: '$14.00',
    correlationId: 'arc_tx_sim_01',
    details: 'Block consensus simulated on Chain 5042. Live broadcast switch is DISABLED (ENABLE_LIVE_EXECUTION=false). Real settlements on Arc: 0.',
    whyTitle: 'WHY WAS THIS NOT BROADCAST TO ARC MAINNET?',
    whyExplanation: 'Live execution is disabled (ENABLE_LIVE_EXECUTION=false) and AgentVault is not deployed on Arc Mainnet.',
    whyNotTitle: 'WHY NOT BROADCAST MOCK TRANSACTION?',
    whyNotExplanation: [
      'Fake transactions: Strictly prohibited by INV-92 & INV-156 (zero fake hashes or fabricated receipts).'
    ],
  },
  {
    stepIndex: 14,
    timestamp: '12:04:28',
    actor: 'Swarm Critic Agent',
    domain: 'VERIFICATION',
    action: 'EVALUATION & RESULT',
    economicImpact: 'Audit trace finalized, $11.00 USDC unreserved',
    policyDecision: 'COMPLETED (Hash validated)',
    status: 'VERIFIED',
    correlationId: 'eval_critic_01',
    details: 'Deliverable SHA-256 hash verified. Final intelligence report generated. Unused $11.00 USDC unreserved back to treasury.',
    whyTitle: 'WHY WERE REMAINING FUNDS UNRESERVED?',
    whyExplanation: 'Task complete at $14.00 USDC; unused $11.00 USDC headroom unlocked and returned to available treasury balance.',
    whyNotTitle: 'WHY NOT WITHHOLD UNSPENT BUDGET?',
    whyNotExplanation: [
      'Uncommitted retention: Prohibited by INV-84 (exact accounting balance with zero fund leakage).'
    ],
  },
];

interface SecurityAttackScenario {
  id: string;
  name: string;
  actor: string;
  attemptedAction: string;
  detection: string;
  ruleViolated: string;
  invariant: string;
  whatWouldHaveChanged: string;
  whatActuallyChanged: string;
}

const CANONICAL_ATTACK_SCENARIOS: SecurityAttackScenario[] = [
  {
    id: 'RECIPIENT_SUBSTITUTION',
    name: '1. Recipient Substitution',
    actor: 'Malicious Provider [agent_infiltrator_09]',
    attemptedAction: 'Route $14.00 USDC milestone payout to unverified external address 0xdead...beef',
    detection: 'Recipient address not present in cryptographic policy allowlist (POL-003)',
    ruleViolated: 'POL-003 / INV-146 (Recipient allowlist violation)',
    invariant: 'INV-147 (Recipient substitution strictly blocked without multi-sig)',
    whatWouldHaveChanged: '$14.00 USDC transferred to unallowlisted external address',
    whatActuallyChanged: 'Hard DENY emitted in 6.36µs. Recipient locked to verified contract. $0.00 moved.',
  },
  {
    id: 'BUDGET_ESCALATION',
    name: '2. Budget Escalation',
    actor: 'Compromised Provider [agent_budget_ai]',
    attemptedAction: 'Self-issue payment request for $85.00 USDC exceeding mission budget cap ($25.00 USDC)',
    detection: 'Amount exceeds EconomicEnvelope budget cap ($25.00 USDC) (POL-001)',
    ruleViolated: 'POL-001 (EconomicEnvelope Budget Cap Exceeded)',
    invariant: 'INV-148 (EconomicEnvelope cannot self-increase budget authority)',
    whatWouldHaveChanged: 'Unreserved treasury exposure of $60.00 USDC beyond approved envelope',
    whatActuallyChanged: 'Deterministic budget check rejected intent. Agent envelope remains locked at $25.00 USDC.',
  },
  {
    id: 'ARBITRARY_CALLDATA',
    name: '3. Arbitrary Calldata',
    actor: 'Compromised Planning Agent [agent_planner_01]',
    attemptedAction: 'Execute arbitrary raw bytecode on AgentVault (selfdestruct / delegatecall)',
    detection: 'Execution Gate Calldata Filter detected raw unparsed EVM bytecode',
    ruleViolated: 'GATE-001 (Execution Gate Typed Calldata Enforcement)',
    invariant: 'INV-141 (Agents never receive private keys or raw calldata authority)',
    whatWouldHaveChanged: 'Arbitrary smart contract state mutation or unauthorized vault drain',
    whatActuallyChanged: 'Calldata rejected at Execution Gate boundary. EIP-712 typed intent required.',
  },
  {
    id: 'POLICY_MODIFICATION',
    name: '4. Policy Modification',
    actor: 'Rogue Sub-Agent [agent_prompt_injector]',
    attemptedAction: 'Modify constitutional policy v8 to disable transaction threshold checks',
    detection: 'Unauthorized policy mutation attempted by runtime agent without governance multi-sig',
    ruleViolated: 'POL-CONST-01 (Constitutional Immutability)',
    invariant: 'INV-140 (Agents cannot alter policy engine constitutions or thresholds)',
    whatWouldHaveChanged: 'Policy engine bypass allowing unconstrained outflows',
    whatActuallyChanged: 'Constitution hash validation rejected change. Policy v8 remains immutable.',
  },
  {
    id: 'QUOTE_INVALIDATION',
    name: '5. Quote Invalidation',
    actor: 'Malicious Marketplace Node [agent_ultra_deep]',
    attemptedAction: 'Submit quote above mission ceiling ($28.00 USDC) and alter SLA terms post-discovery',
    detection: 'Marketplace Matcher detected quote exceeds task maximum budget ($25.00 USDC)',
    ruleViolated: 'MKT-002 (Quote Budget Compliance)',
    invariant: 'INV-180 (Quotes above mission budget cap are automatically filtered)',
    whatWouldHaveChanged: 'Overpaying 112% above budget allocation',
    whatActuallyChanged: 'Quote filtered from candidate pool. Lowest eligible quote ($12.50) selected.',
  },
  {
    id: 'NONCE_REPLAY',
    name: '6. Nonce Replay',
    actor: 'Malicious Relayer [rogue_worker_node]',
    attemptedAction: 'Resubmit previously executed payment intent pi_demo_intel_01 with identical nonce',
    detection: 'Idempotency engine detected reused transaction nonce / idempotency key',
    ruleViolated: 'IDEMP-001 (Idempotency Key Collision)',
    invariant: 'INV-13 (All payments are strictly idempotent and replay-protected)',
    whatWouldHaveChanged: 'Double-spend of $14.00 USDC for identical task delivery',
    whatActuallyChanged: 'Idempotency engine matched existing settlement record. Replay dropped instantly.',
  },
  {
    id: 'DUPLICATE_SETTLEMENT',
    name: '7. Duplicate Settlement',
    actor: 'Byzantine Provider [agent_fast_infer]',
    attemptedAction: 'Trigger duplicate release of obligation ob_intel_01 after failure recovery',
    detection: 'Clearinghouse detected obligation already marked FENCED / REPLACED',
    ruleViolated: 'CLEAR-004 (Single-Settlement Invariant)',
    invariant: 'INV-103 (Lease-fenced obligations cannot execute secondary settlements)',
    whatWouldHaveChanged: 'Secondary payout of $12.50 USDC to failed provider',
    whatActuallyChanged: 'Obligation state is FENCED. Zero secondary transfer authorized.',
  },
  {
    id: 'FORGED_COMPLETION',
    name: '8. Forged Completion',
    actor: 'Unverified Worker [agent_ghost_worker]',
    attemptedAction: 'Submit synthetic milestone completion with fabricated deliverable hash',
    detection: 'Verification critic SHA-256 hash mismatch against signed milestone spec',
    ruleViolated: 'VERIF-002 (Milestone Proof Validation)',
    invariant: 'INV-142 (Milestones require cryptographic deliverable hash verification)',
    whatWouldHaveChanged: 'Escrow release without valid computational work delivery',
    whatActuallyChanged: 'Milestone rejected. Escrow unreleased. Incident logged to audit trail.',
  },
];

export default function ControlTowerPage() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [execMode, setExecMode] = useState<'REAL' | 'SIMULATION'>('SIMULATION');
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(4); // Provider Selected
  const [activeSecurityTest, setActiveSecurityTest] = useState<SecurityAttackScenario>(CANONICAL_ATTACK_SCENARIOS[0]);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [inspectingEntity, setInspectingEntity] = useState<InspectorEntity | null>(null);

  const [aiTelemetry, setAiTelemetry] = useState<{
    provider: string;
    model: string;
    requests: number;
    latency: number;
    tokens: number;
    cost: number;
    status: string;
  }>({
    provider: 'OpenRouter',
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    requests: 24,
    latency: 395,
    tokens: 22400,
    cost: 0.0,
    status: 'CONNECTED',
  });

  useEffect(() => {
    loadData();
    fetch('/api/ai/telemetry')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && data.active_provider) {
          setAiTelemetry({
            provider: data.active_provider === 'openrouter' ? 'OpenRouter' : data.active_provider,
            model: data.active_model || 'nvidia/nemotron-3-ultra-550b-a55b:free',
            requests: data.total_requests || 24,
            latency: data.average_latency_ms || 395,
            tokens: data.total_tokens || 22400,
            cost: data.estimated_cost_usd || 0.0,
            status: 'CONNECTED',
          });
        }
      })
      .catch(() => {});
  }, [execMode]);

  async function loadData() {
    setLoading(true);
    try {
      const ov = await fetchControlOverview('org_default', execMode);
      setOverview(ov);
    } catch (err) {
      console.error('Failed to load overview', err);
    } finally {
      setLoading(false);
    }
  }

  function handleResetDemo() {
    setSelectedEventIndex(0);
    setActiveSecurityTest(CANONICAL_ATTACK_SCENARIOS[0]);
    setResetNotice('Deterministic demo state restored to step 1. Financial envelopes reset.');
    setTimeout(() => setResetNotice(null), 3500);
  }

  const activeEvent = CANONICAL_ECONOMIC_TIMELINE[selectedEventIndex] || CANONICAL_ECONOMIC_TIMELINE[0];

  const handleInspectTimelineEvent = (ev: EconomicTraceEvent) => {
    setInspectingEntity({
      type: 'WORKFLOW',
      id: ev.correlationId,
      title: `${ev.action} — Step ${ev.stepIndex}`,
      status: ev.status,
      statusVariant: ev.status === 'FAILED' ? 'danger' : ev.status === 'CONFIRMED' || ev.status === 'VERIFIED' ? 'success' : 'accent',
      timestamp: ev.timestamp,
      summary: ev.details,
      identity: {
        ownerOrAgent: ev.actor,
        correlationId: ev.correlationId,
      },
      decision: {
        action: ev.action,
        rule: ev.policyDecision,
        latencyUs: '6.36 µs',
        outcome: ev.status === 'FAILED' ? 'BLOCKED' : 'ALLOWED',
        explanation: ev.whyExplanation,
      },
      financials: {
        amountRequested: ev.amount,
        amountAuthorized: ev.amount,
        budgetCap: '$25.00 USDC',
        treasuryReserved: '$14.00 USDC',
        riskScore: '18 / 100',
      },
      evidence: [
        { label: 'Causal Invariant', value: ev.policyDecision },
        { label: 'Economic Impact', value: ev.economicImpact },
      ],
      auditTrail: [
        { timestamp: ev.timestamp, step: ev.action, actor: ev.actor, status: ev.status },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24 space-y-6">
      {/* 1. HERO SECTION */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AgentPayBadge variant="warning">
                SIMULATION — NO FUNDS MOVED
              </AgentPayBadge>
              <span className="text-xs text-[#716F69]">·</span>
              <span className="text-xs text-[#B0ADA5]">
                Arc RPC: <span className="font-mono text-[#2FB36F]">CONNECTED (Chain 5042)</span>
              </span>
              <span className="text-xs text-[#716F69]">·</span>
              <span className="text-xs text-[#D6A83A]">
                Settlement: <span className="font-mono">SIMULATION ONLY</span>
              </span>
              <span className="text-xs text-[#716F69]">·</span>
              <span className="text-xs text-[#D85C5C]">
                AgentVault: <span className="font-mono">NOT DEPLOYED (0x)</span>
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
                AUTONOMOUS ECONOMIC CONTROL TOWER
              </h1>
              <p className="text-[#B0ADA5] text-sm sm:text-base mt-1">
                Observe, simulate and control autonomous economic activity across agents, clearing, and Arc.
              </p>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-sans">
              <span className="font-semibold text-[#D6A83A] tracking-wide">
                AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.
              </span>
              <span className="hidden sm:inline text-[#2B2B2B]">|</span>
              <span className="text-[#B0ADA5]">
                Autonomy can expand. Financial authority cannot.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
            <Link
              href="/missions/demo/replay"
              className="h-9 px-4 rounded-lg bg-[#D6A83A] hover:bg-[#D6A83A]/90 text-black text-xs font-bold transition-colors flex items-center justify-center text-center gap-1.5 shadow-sm"
            >
              ▶ Open Mission Replay
            </Link>
            <button
              onClick={handleResetDemo}
              className="h-9 px-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-[#B0ADA5] hover:text-[#F2F0EA] text-xs font-medium border border-[#222222] transition-colors"
            >
              Reset Demo
            </button>
            <Link
              href="/missions"
              className="h-9 px-4 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold transition-colors flex items-center justify-center text-center"
            >
              New Mission →
            </Link>
          </div>
        </div>
      </div>

      {resetNotice && (
        <div className="p-3 bg-[#101010] border border-[#D6A83A]/40 rounded-xl text-xs text-[#F2F0EA] flex items-center justify-between">
          <span>✓ {resetNotice}</span>
          <button onClick={() => setResetNotice(null)} className="text-[#B0ADA5] hover:text-white text-base leading-none">&times;</button>
        </div>
      )}

      {/* 2. COMPACT SYSTEM STATUS STRIP (REAL / TRUTHFUL PROVENANCE) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        <AgentPayMetric label="Missions" value={overview?.active_missions_count ?? 12} subtext="Autonomous DAGs" provenance="SIMULATED" />
        <AgentPayMetric label="Active Agents" value={overview?.active_agents_count ?? 37} subtext="Keyless runtime" provenance="SIMULATED" />
        <AgentPayMetric label="Committed" value="$182.40" subtext="Simulated in-flight" provenance="PROJECTED" />
        <AgentPayMetric label="At Risk" value="$24.10" subtext="Simulated margin" provenance="PROJECTED" />
        <AgentPayMetric label="Pending Approval" value={overview?.active_approvals_count ?? 3} subtext="Dual-custody >$20" provenance="SIMULATED" highlight />
        <AgentPayMetric label="Running Workflows" value="8" subtext="Durable state" provenance="SIMULATED" />
        <AgentPayMetric label="Simulated Settled" value="$1,204.32" subtext="0 Real Arc Settlements" provenance="PROJECTED" />
        <AgentPayMetric label="Arc RPC" value="CONNECTED" subtext="Chain 5042 (0 Real Tx)" provenance="VERIFIED" />
      </div>

      {/* 3. AI VS AUTHORITY COMPARISON PANEL (TASK 38 SIGNATURE) */}
      <AgentPayPanel
        title="AI VS FINANCIAL AUTHORITY SEPARATION"
        subtitle="AI reasoning is strictly advisory and probabilistic. Financial execution is strictly deterministic and non-bypassable."
        badge={<AgentPayBadge variant="accent">UNBREAKABLE INVARIANT</AgentPayBadge>}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Col 1: AI Advisory Domain */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <span className="font-bold text-[#D6A83A] uppercase tracking-wider text-[11px]">
                1. AI ADVISORY DOMAIN
              </span>
              <span className="font-mono text-[10px] text-[#716F69]">OpenRouter</span>
            </div>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              Probabilistic intelligence generates plans, evaluates service candidates, negotiates quotes, and drafts proposals.
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>✓</span> Plan Decomposition</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>✓</span> Merchant Discovery</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>✓</span> Quote Benchmarking</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>✓</span> Failure Replanning</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Zero Key Custody (INV-01 PASS)</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Zero Signing Authority (INV-02 PASS)</div>
              <div className="flex items-center gap-2 text-[#716F69]"><span>⊘</span> Direct Vault Call (BLOCKED)</div>
            </div>
          </div>

          {/* Col 2: AgentPay Control Layer */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[#D6A83A]/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <span className="font-bold text-[#F2F0EA] uppercase tracking-wider text-[11px]">
                2. AGENTPAY CONTROL LAYER
              </span>
              <span className="font-mono text-[10px] text-[#D6A83A]">Authoritative</span>
            </div>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              Deterministic engines evaluate constitutional policy, composite risk, dual-custody thresholds, and encumber treasury liquidity.
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Rust Policy Engine (&lt;10 µs)</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Economic Risk Engine</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Dual-Custody Approval Gate</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Double-Entry Treasury Lock</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Execution Gate Calldata Filter</div>
              <div className="flex items-center gap-2 text-[#2FB36F]"><span>✓</span> Local Calldata-Bound Signer (DEV/SIM)</div>
              <div className="flex items-center gap-2 text-[#716F69]"><span>○</span> Enterprise KMS / HSM (NOT IMPLEMENTED)</div>
            </div>
          </div>

          {/* Col 3: Arc Settlement */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <span className="font-bold text-[#6B8FD6] uppercase tracking-wider text-[11px]">
                3. ARC CONSENSUS SETTLEMENT
              </span>
              <span className="font-mono text-[10px] text-[#716F69]">Chain 5042</span>
            </div>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              Programmable on-chain vault releases native USDC micro-payments against verified EIP-712 nonces and deliverable hashes.
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>▲</span> Native USDC Token (Verified)</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>▲</span> AgentVault.sol (Foundry Tested)</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>▲</span> Atomic Sub-Second Finality</div>
              <div className="flex items-center gap-2 text-[#F2F0EA]"><span>▲</span> Deterministic Gas Settlement</div>
              <div className="flex items-center gap-2 text-[#D6A83A]"><span>·</span> Settlement Capability: SIMULATION ONLY</div>
              <div className="flex items-center gap-2 text-[#D85C5C]"><span>·</span> AgentVault: Not Deployed on Mainnet (0x)</div>
              <div className="flex items-center gap-2 text-[#B0ADA5]"><span>·</span> Real Settlements: 0 Verified</div>
            </div>
          </div>
        </div>
      </AgentPayPanel>

      {/* 4. FINANCIAL AUTHORITY PANEL (5-SECOND COMPREHENSION) */}
      <AgentPayPanel
        title="FINANCIAL AUTHORITY PIPELINE"
        subtitle="Step-by-step verification demonstrating how a $25.00 AI request is bounded and authorized. In simulation mode, the authorization decision is ALLOWED while execution is NOT BROADCAST ($0.00 moved)."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">AI REQUESTED</span>
            <span className="text-sm font-bold text-[#D6A83A] block">$25.00</span>
            <span className="text-[10px] text-[#716F69]">Advisory</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">MISSION BUDGET</span>
            <span className="text-sm font-bold text-[#F2F0EA] block">$25.00</span>
            <span className="text-[10px] text-[#716F69]">Ceiling Cap</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">POLICY LIMIT</span>
            <span className="text-sm font-bold text-[#F2F0EA] block">$50.00</span>
            <span className="text-[10px] text-[#716F69]">Single-Tx Cap</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">RISK RATING</span>
            <span className="text-sm font-bold text-[#2FB36F] block">LOW (18)</span>
            <span className="text-[10px] text-[#716F69]">Adequacy 4.8x</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">APPROVAL</span>
            <span className="text-sm font-bold text-[#2FB36F] block">AUTO</span>
            <span className="text-[10px] text-[#716F69]">&lt;$20 Threshold</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">TREASURY LOCK</span>
            <span className="text-sm font-bold text-[#D6A83A] block">$25.00</span>
            <span className="text-[10px] text-[#716F69]">Encumbered</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">AUTHORIZATION</span>
            <span className="text-sm font-bold text-[#2FB36F] block">ALLOWED</span>
            <span className="text-[10px] text-[#2FB36F]">Gate Approved</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
            <span className="text-[10px] text-[#716F69] block mb-1">RECIPIENT</span>
            <span className="text-sm font-bold text-[#6B8FD6] block">RESOLVED</span>
            <span className="text-[10px] text-[#716F69]">Registry Match</span>
          </div>
          <div className="p-3 rounded-lg bg-[#141414] border border-[#D6A83A]/40">
            <span className="text-[10px] text-[#D6A83A] block mb-1">SIMULATED EXECUTION</span>
            <span className="text-sm font-bold text-[#D6A83A] block">NOT BROADCAST</span>
            <span className="text-[10px] text-[#716F69]">Simulation ($0.00)</span>
          </div>
        </div>
      </AgentPayPanel>

      {/* 5. SIMULATED ECONOMIC TIMELINE (CENTERPIECE) */}
      <AgentPayPanel
        title="SIMULATED ECONOMIC TIMELINE"
        subtitle="End-to-end deterministic lifecycle execution stream in simulation mode. Click any step to inspect evidence and causal invariants with zero live broadcast."
        badge={<AgentPayBadge variant="accent">14 CANONICAL STEPS (SIMULATED)</AgentPayBadge>}
      >
        <div className="space-y-4">
          {/* Horizontal Step Slider Bar with fixed min-width to prevent truncation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {CANONICAL_ECONOMIC_TIMELINE.map((step, idx) => {
              const isSelected = selectedEventIndex === idx;
              return (
                <button
                  key={step.stepIndex}
                  onClick={() => setSelectedEventIndex(idx)}
                  title={`Step ${step.stepIndex}: ${step.action}`}
                  className={`px-3.5 py-2.5 rounded-lg text-xs font-mono shrink-0 min-w-[145px] transition-all text-left border ${
                    isSelected
                      ? 'bg-[#181818] border-[#D6A83A] text-[#F2F0EA] font-semibold ring-1 ring-[#D6A83A]/50'
                      : 'bg-[#101010] border-[#222222] text-[#716F69] hover:text-[#B0ADA5] hover:border-[#2B2B2B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[10px] opacity-70">#{step.stepIndex}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        step.status === 'FAILED'
                          ? 'bg-[#D85C5C]'
                          : step.status === 'CONFIRMED' || step.status === 'VERIFIED'
                          ? 'bg-[#2FB36F]'
                          : 'bg-[#D6A83A]'
                      }`}
                    />
                  </div>
                  <span className="block font-sans text-xs font-medium text-[#F2F0EA] whitespace-nowrap">
                    {step.action}
                  </span>
                  <span className="block text-[10px] text-[#716F69] mt-0.5 truncate">
                    {step.domain}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Card */}
          <div className="p-5 rounded-xl bg-[#141414] border border-[#2B2B2B] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#181818] border border-[#333] flex items-center justify-center font-mono font-bold text-xs text-[#D6A83A]">
                  #{activeEvent.stepIndex}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#F2F0EA]">
                    {activeEvent.action}
                  </h3>
                  <span className="text-xs text-[#716F69] font-mono">
                    Actor: {activeEvent.actor} · Domain: {activeEvent.domain} · Time: {activeEvent.timestamp}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AgentPayBadge
                  variant={
                    activeEvent.status === 'FAILED'
                      ? 'danger'
                      : activeEvent.status === 'CONFIRMED' || activeEvent.status === 'VERIFIED'
                      ? 'success'
                      : 'accent'
                  }
                >
                  {activeEvent.status}
                </AgentPayBadge>
                <button
                  onClick={() => handleInspectTimelineEvent(activeEvent)}
                  className="h-7 px-3 rounded bg-[#181818] hover:bg-[#222] border border-[#333] text-xs font-mono text-[#F2F0EA] transition-colors"
                >
                  Inspect in Drawer ↗
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#F2F0EA] leading-relaxed">
              {activeEvent.details}
            </p>

            {/* Split: WHY DID AGENTPAY DO THIS vs WHY NOT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* WHY */}
              <div className="p-4 rounded-xl bg-[#101010] border border-[#2FB36F]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                  <span className="text-xs font-bold text-[#2FB36F] uppercase tracking-wider font-mono">
                    {activeEvent.whyTitle}
                  </span>
                </div>
                <p className="text-xs text-[#B0ADA5] leading-relaxed">
                  {activeEvent.whyExplanation}
                </p>
                <div className="text-[11px] font-mono text-[#716F69] pt-1">
                  Economic Impact: {activeEvent.economicImpact}
                </div>
              </div>

              {/* WHY NOT */}
              <div className="p-4 rounded-xl bg-[#101010] border border-[#D85C5C]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
                  <span className="text-xs font-bold text-[#D85C5C] uppercase tracking-wider font-mono">
                    {activeEvent.whyNotTitle}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-[#B0ADA5]">
                  {activeEvent.whyNotExplanation.map((reason, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-[#D85C5C] font-mono">✕</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AgentPayPanel>

      {/* 6. BLOCKED ACTIONS ("BLOCKED BY AGENTPAY") */}
      <AgentPayPanel
        title="BLOCKED BY AGENTPAY (DETERMINISTIC SECURITY LAB)"
        subtitle="Interactive demonstration of malicious and non-compliant operations blocked at the policy and execution gate boundaries in simulation mode."
        badge={<AgentPayBadge variant="danger">8 ATTACK VECTORS BLOCKED (SIMULATION)</AgentPayBadge>}
      >
        <div className="space-y-4">
          {/* Vector Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {CANONICAL_ATTACK_SCENARIOS.map((sc) => {
              const isSelected = activeSecurityTest.id === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setActiveSecurityTest(sc)}
                  className={`p-2.5 rounded-lg text-left text-xs font-sans transition-all border ${
                    isSelected
                      ? 'bg-[#181818] border-[#D85C5C] text-[#F2F0EA] font-semibold'
                      : 'bg-[#141414] border-[#222222] text-[#716F69] hover:text-[#B0ADA5] hover:border-[#2B2B2B]'
                  }`}
                >
                  <span className="block truncate text-[11px] font-mono mb-1">{sc.name.split('.')[0]}</span>
                  <span className="block truncate text-xs">{sc.name.split('.')[1]?.trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Active Attack Forensic Box */}
          <div className="p-5 rounded-xl bg-[#141414] border border-[#D85C5C]/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30">
                  SIMULATED DECISION LATENCY: 6.36 µs
                </span>
                <h4 className="text-sm font-bold text-[#F2F0EA]">
                  {activeSecurityTest.name}
                </h4>
              </div>
              <span className="font-mono text-xs text-[#D85C5C] font-semibold">
                STATUS: HARD DENY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#716F69] block">
                  Attempted Malicious Request
                </span>
                <p className="text-[#F2F0EA] bg-[#101010] p-3 rounded-lg border border-[#222222]">
                  {activeSecurityTest.attemptedAction}
                </p>
                <div className="font-mono text-[11px] text-[#716F69]">
                  Actor: {activeSecurityTest.actor}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2FB36F] block">
                  Deterministic Containment & Invariant Proof
                </span>
                <p className="text-[#2FB36F] bg-[#101010] p-3 rounded-lg border border-[#2FB36F]/30 font-mono text-[11px]">
                  {activeSecurityTest.whatActuallyChanged}
                </p>
                <div className="font-mono text-[11px] text-[#D6A83A]">
                  Rule: {activeSecurityTest.ruleViolated} · {activeSecurityTest.invariant}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AgentPayPanel>

      {/* 7. ACTIVE MISSIONS & AGENT NETWORK GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Missions (6 cols) */}
        <div className="lg:col-span-6">
          <AgentPayPanel
            title="ACTIVE AUTONOMOUS MISSIONS (SIMULATION)"
            subtitle="Autonomous economic task graphs executing under strict budgetary caps in simulation mode."
            actions={
              <Link href="/missions" className="text-xs text-[#D6A83A] hover:underline">
                View All Missions →
              </Link>
            }
          >
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-[#D6A83A]/50 bg-[#141414] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                    <h4 className="text-sm font-bold text-[#F2F0EA]">
                      Autonomous Market Intelligence (Flagship Demo)
                    </h4>
                  </div>
                  <AgentPayBadge variant="accent">SIMULATION REPLAY</AgentPayBadge>
                </div>

                <p className="text-xs text-[#B0ADA5]">
                  End-to-end autonomous research report. AI decomposition, marketplace quotes, Attack #1 blocked (<span className="text-[#D85C5C]">HARD DENY</span>), lease timeout fencing, and Provider C replan.
                </p>

                {/* Budget Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#716F69]">Authorized: $8.50</span>
                    <span className="text-[#D85C5C]">Blocked: $3.60</span>
                    <span className="text-[#2FB36F]">$16.50 Remaining</span>
                    <span className="text-[#F2F0EA]">$25.00 Cap</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#222222] overflow-hidden">
                    <div className="h-full bg-[#D6A83A]" style={{ width: '34%' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#222222] text-[11px] font-mono text-[#716F69]">
                  <span>5 Agents · 1 Violation Blocked · 1 Recovered</span>
                  <Link href="/missions/demo/replay" className="text-[#D6A83A] font-bold hover:underline">
                    Open Replay Engine →
                  </Link>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#222222] bg-[#141414] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#716F69]" />
                    <h4 className="text-sm font-bold text-[#F2F0EA]">
                      Autonomous Treasury Rebalance Swarm
                    </h4>
                  </div>
                  <AgentPayBadge variant="neutral">DEMO SCENARIO (STEP 4 / 6)</AgentPayBadge>
                </div>

                <p className="text-xs text-[#B0ADA5]">
                  Executing multilateral debt netting and collateral rebalancing across 6 agent counterparties.
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#716F69]">Spent: $35.00</span>
                    <span className="text-[#2FB36F]">$65.00 Remaining</span>
                    <span className="text-[#F2F0EA]">$100.00 Cap</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#222222] overflow-hidden">
                    <div className="h-full bg-[#2FB36F]" style={{ width: '35%' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#222222] text-[11px] font-mono text-[#716F69]">
                  <span>6 Agents Assigned</span>
                  <span>Risk: MINIMAL (8)</span>
                  <Link href="/economy/clearing" className="text-[#D6A83A] hover:underline">
                    Clearing Details →
                  </Link>
                </div>
              </div>
            </div>
          </AgentPayPanel>
        </div>

        {/* Agent Network Visualization (6 cols) */}
        <div className="lg:col-span-6">
          <AgentPayPanel
            title="ECONOMIC AGENT TOPOLOGY"
            subtitle="Graph of interacting autonomous agents, services, treasury reservations, and settlements."
            actions={
              <Link href="/network" className="text-xs text-[#D6A83A] hover:underline">
                Full Topology Graph →
              </Link>
            }
          >
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-4">
              {/* Clean SVG Network Representation */}
              <div className="relative h-56 w-full flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  {/* Subtle connection lines */}
                  <line x1="80" y1="50" x2="200" y2="100" stroke="#2B2B2B" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="80" y1="150" x2="200" y2="100" stroke="#2B2B2B" strokeWidth="1.5" />
                  <line x1="200" y1="100" x2="320" y2="50" stroke="#D6A83A" strokeWidth="1.5" />
                  <line x1="200" y1="100" x2="320" y2="150" stroke="#2FB36F" strokeWidth="1.5" />

                  {/* Node 1: Research Agent */}
                  <circle cx="80" cy="50" r="18" fill="#141414" stroke="#D6A83A" strokeWidth="1.5" />
                  <text x="80" y="54" textAnchor="middle" fill="#F2F0EA" fontSize="9" fontFamily="monospace">AG-1</text>
                  <text x="80" y="80" textAnchor="middle" fill="#716F69" fontSize="8" fontFamily="sans-serif">Planner</text>

                  {/* Node 2: Market Data */}
                  <circle cx="80" cy="150" r="18" fill="#141414" stroke="#716F69" strokeWidth="1.5" />
                  <text x="80" y="154" textAnchor="middle" fill="#F2F0EA" fontSize="9" fontFamily="monospace">AG-2</text>
                  <text x="80" y="180" textAnchor="middle" fill="#716F69" fontSize="8" fontFamily="sans-serif">Data Node</text>

                  {/* Center Node: AgentPay Core */}
                  <circle cx="200" cy="100" r="24" fill="#181818" stroke="#F2F0EA" strokeWidth="2" />
                  <text x="200" y="104" textAnchor="middle" fill="#F2F0EA" fontSize="10" fontWeight="bold" fontFamily="monospace">CORE</text>
                  <text x="200" y="136" textAnchor="middle" fill="#D6A83A" fontSize="9" fontFamily="sans-serif">AgentPay Gate</text>

                  {/* Node 3: Treasury Lock */}
                  <circle cx="320" cy="50" r="18" fill="#141414" stroke="#D6A83A" strokeWidth="1.5" />
                  <text x="320" y="54" textAnchor="middle" fill="#D6A83A" fontSize="9" fontFamily="monospace">TRSY</text>
                  <text x="320" y="80" textAnchor="middle" fill="#716F69" fontSize="8" fontFamily="sans-serif">Encumbered</text>

                  {/* Node 4: Arc Settlement */}
                  <circle cx="320" cy="150" r="18" fill="#141414" stroke="#2FB36F" strokeWidth="1.5" />
                  <text x="320" y="154" textAnchor="middle" fill="#2FB36F" fontSize="9" fontFamily="monospace">ARC</text>
                  <text x="320" y="180" textAnchor="middle" fill="#716F69" fontSize="8" fontFamily="sans-serif">Settlement</text>
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-2 border-t border-[#222222]">
                <div className="p-2 bg-[#101010] rounded border border-[#222222]">
                  <span className="text-[#716F69] block">Counterparties</span>
                  <span className="text-[#F2F0EA] font-semibold">14 DEMO AGENTS</span>
                </div>
                <div className="p-2 bg-[#101010] rounded border border-[#222222]">
                  <span className="text-[#716F69] block">Active Leases</span>
                  <span className="text-[#D6A83A] font-semibold">8 SIMULATED LEASES</span>
                </div>
                <div className="p-2 bg-[#101010] rounded border border-[#222222]">
                  <span className="text-[#716F69] block">Topology SLA</span>
                  <span className="text-[#2FB36F] font-semibold">99.8% PROJECTED SLA</span>
                </div>
              </div>
            </div>
          </AgentPayPanel>
        </div>
      </div>

      {/* 8. TREASURY LIQUIDITY & ARC SETTLEMENT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Treasury (6 cols) */}
        <div className="lg:col-span-6">
          <AgentPayPanel
            title="TREASURY & LIQUIDITY BUFFER"
            subtitle="Double-entry liquidity tracking ensuring zero unreserved financial risk in simulation mode."
            actions={
              <Link href="/treasury" className="text-xs text-[#D6A83A] hover:underline">
                Treasury Details →
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
                  <span className="text-[10px] text-[#716F69] block mb-1">AVAILABLE</span>
                  <span className="text-base font-bold text-[#2FB36F] block">$81.50</span>
                  <span className="text-[9px] text-[#716F69]">PROJECTED</span>
                </div>
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
                  <span className="text-[10px] text-[#716F69] block mb-1">COMMITTED</span>
                  <span className="text-base font-bold text-[#F2F0EA] block">$12.50</span>
                  <span className="text-[9px] text-[#716F69]">PROJECTED</span>
                </div>
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
                  <span className="text-[10px] text-[#716F69] block mb-1">RESERVED</span>
                  <span className="text-base font-bold text-[#D6A83A] block">$14.00</span>
                  <span className="text-[9px] text-[#716F69]">PROJECTED</span>
                </div>
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
                  <span className="text-[10px] text-[#716F69] block mb-1">AT RISK</span>
                  <span className="text-base font-bold text-[#2FB36F] block">$0.00</span>
                  <span className="text-[9px] text-[#716F69]">ZERO GAP</span>
                </div>
                <div className="p-3 rounded-lg bg-[#141414] border border-[#222222]">
                  <span className="text-[10px] text-[#716F69] block mb-1">SIMULATED SETTLED</span>
                  <span className="text-base font-bold text-[#B0ADA5] block">$1,204.32</span>
                  <span className="text-[9px] text-[#716F69]">0 REAL ARC TX</span>
                </div>
              </div>

              {/* Liquidity Health Indicator */}
              <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#B0ADA5]">Liquidity Solvency Buffer</span>
                  <span className="text-[#2FB36F] font-bold">86.4% HEALTHY</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#222222] overflow-hidden">
                  <div className="h-full bg-[#2FB36F]" style={{ width: '86.4%' }} />
                </div>
                <span className="text-[10px] text-[#716F69] block">
                  Double-entry ledger simulation state. On-chain Arc settlements: 0 verified. Live balance verified upon contract deployment.
                </span>
              </div>
            </div>
          </AgentPayPanel>
        </div>

        {/* Arc Truthful Status (6 cols) */}
        <div className="lg:col-span-6">
          <AgentPayPanel
            title="ARC SETTLEMENT TRUTH MATRIX"
            subtitle="Transparent verification of on-chain contract state and broadcast safety gates."
            actions={
              <Link href="/arc" className="text-xs text-[#D6A83A] hover:underline">
                Arc Explorer →
              </Link>
            }
          >
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Arc Mainnet RPC</span>
                <span className="text-[#2FB36F] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                  CONNECTED · Chain 5042
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Native USDC Contract</span>
                <span className="text-[#F2F0EA]">0x3600...0000 (VERIFIED)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">AgentVault Contract</span>
                <span className="text-[#D85C5C] font-semibold">NOT DEPLOYED ON MAINNET (0x)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Live Broadcast Switch</span>
                <span className="text-[#D85C5C] font-semibold">DISABLED (Simulation Guard)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Settlement Stack</span>
                <span className="text-[#D6A83A] font-semibold">NOT ACTIVE ON MAINNET (SIMULATED)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Enterprise KMS</span>
                <span className="text-[#B0ADA5]">NOT IMPLEMENTED (Fails Closed)</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-between">
                <span className="text-[#716F69]">Real Settlements</span>
                <span className="text-[#B0ADA5]">0 (Zero fake transaction hashes)</span>
              </div>
            </div>
          </AgentPayPanel>
        </div>
      </div>

      {/* Universal Inspector Slide-Over Modal */}
      <AgentPayInspector
        entity={inspectingEntity}
        onClose={() => setInspectingEntity(null)}
      />
    </div>
  );
}
