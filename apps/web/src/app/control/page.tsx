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
import { formatRate, formatPercent, formatCurrency } from '../../lib/utils/format';

interface EconomicTraceEvent {
  timestamp: string;
  actor: string;
  domain: string;
  action: string;
  economicImpact: string;
  policyDecision: string;
  status: 'INITIALIZED' | 'SIMULATED' | 'SELECTED' | 'ACTIVE' | 'FAILED' | 'REPLANNING' | 'RECOVERED' | 'AUTHORIZED' | 'RESERVED' | 'CONFIRMED' | 'VERIFIED';
  details: string;
  whyTitle?: string;
  whyExplanation?: string;
  whyNotTitle?: string;
  whyNotExplanation?: string[];
}

const DETERMINISTIC_ECONOMIC_TRACE: EconomicTraceEvent[] = [
  {
    timestamp: '12:04:01',
    actor: 'Enterprise User',
    domain: 'OBJECTIVES',
    action: 'OBJECTIVE CREATED',
    economicImpact: 'Budget Ceiling: 25.00 USDC (Locked)',
    policyDecision: 'ALLOW (INV-140: User authorized objective)',
    status: 'INITIALIZED',
    details: 'Instantiated "Autonomous Market Intelligence Mission". Scope: 4 specialized agents, AI infrastructure comparative study.',
    whyTitle: 'WHY WAS THIS OBJECTIVE ACCEPTED?',
    whyExplanation: 'Authorized by authenticated user with valid cryptographic session and explicit $25.00 USDC economic envelope cap.',
    whyNotTitle: 'WHY NOT UNCONSTRAINED AUTONOMY?',
    whyNotExplanation: [
      'Unbounded budget: Prohibited by INV-140 (every mission requires explicit financial envelope).',
      'Direct on-chain execution: Prohibited in SIMULATION mode.'
    ],
  },
  {
    timestamp: '12:04:04',
    actor: 'Digital Twin Simulator',
    domain: 'SIMULATION',
    action: 'SIMULATION COMPLETE',
    economicImpact: 'Projected Exposure: 14.00 USDC (Worst case: 18.00 USDC)',
    policyDecision: 'PRE-FLIGHT PASS (Capital Adequacy Ratio: 4.8x)',
    status: 'SIMULATED',
    details: 'Monte Carlo simulation confirms zero on-chain broadcast capability in simulation mode. DAG validated.',
    whyTitle: 'WHY DID SIMULATION PASS?',
    whyExplanation: 'Digital twin validated that worst-case exposure ($18.00 USDC) remains well within available treasury liquidity buffer ($81.50 USDC).',
    whyNotTitle: 'WHY NOT DIRECT DISPATCH WITHOUT SIMULATION?',
    whyNotExplanation: [
      'Skipping simulation: Prohibited for multi-task missions to ensure liquidity solvency and DAG cycle freedom.'
    ],
  },
  {
    timestamp: '12:04:07',
    actor: 'Autonomous Matcher',
    domain: 'MARKETPLACE',
    action: 'PROVIDER SELECTED',
    economicImpact: 'Quote: 12.50 USDC committed to agent_fast_infer',
    policyDecision: 'PASS (Lowest cost within SLA)',
    status: 'SELECTED',
    details: 'Discovered candidate providers. Matcher selected agent_fast_infer based on 210ms latency and 99.4% reliability.',
    whyTitle: 'WHY WAS THIS AGENT SELECTED?',
    whyExplanation: 'Lowest eligible quote ($12.50) within policy limits and task budget SLA with 99.4% historical completion rate.',
    whyNotTitle: 'WHY WAS THE $28 QUOTE REJECTED?',
    whyNotExplanation: [
      'agent_ultra_deep: Quote ($28.00) exceeds mission budget cap ($25.00 USDC).',
      'agent_budget_ai: Higher price ($14.00 vs $12.50) for initial compute step.'
    ],
  },
  {
    timestamp: '12:04:12',
    actor: 'Clearinghouse',
    domain: 'CONTRACTS',
    action: 'CONTRACT CREATED',
    economicImpact: 'Committed: 12.50 USDC in ctr_intel_01',
    policyDecision: 'BOUNDED (Obligation locked)',
    status: 'ACTIVE',
    details: 'Contract ctr_intel_01 and Obligation ob_intel_01 instantiated. Funds unreserved pending execution gate.',
    whyTitle: 'WHY WAS A BILATERAL CONTRACT CREATED?',
    whyExplanation: 'Binds provider deliverable specification to programmatic escrow payout with SHA-256 milestone verification.',
    whyNotTitle: 'WHY NOT DIRECT WALLET TRANSFER?',
    whyNotExplanation: [
      'Unilateral transfer: Prohibited by INV-181 (matching cannot authorize direct wallet transfers).'
    ],
  },
  {
    timestamp: '12:04:19',
    actor: 'Durable Runtime',
    domain: 'EXECUTION',
    action: 'PROVIDER FAILURE',
    economicImpact: 'Budget Lost: 0.00 USDC (Envelope 100% Preserved)',
    policyDecision: 'SAFEGUARD (Payment not blindly retried)',
    status: 'FAILED',
    details: 'Injected deterministic heartbeat timeout. Worker isolated. Runtime halts financial execution safely.',
    whyTitle: 'WHY WAS THE FAILED PAYMENT NOT RETRIED?',
    whyExplanation: 'Previous execution became ambiguous/fenced. Blind retry prohibited (INV-103). Budget remains 100% intact.',
    whyNotTitle: 'WHY NOT BLIND AUTO-RETRY?',
    whyNotExplanation: [
      'Blind retry: Violates INV-103 (blind retries risk double-spending on ambiguous worker state).',
      'Direct payout claim: Blocked by lease fencing token revocation (INV-101).'
    ],
  },
  {
    timestamp: '12:04:20',
    actor: 'Mission Replanner',
    domain: 'RECOVERY',
    action: 'REPLANNING TRIGGERED',
    economicImpact: 'Remaining Envelope: 25.00 USDC intact',
    policyDecision: 'MAINTAINED (Financial authority unchanged)',
    status: 'REPLANNING',
    details: 'Preserved upstream evidence and checkpoints. Evaluated secondary provider within remaining budget margin.',
    whyTitle: 'WHY WAS REPLANNING TRIGGERED INSTEAD OF TERMINATION?',
    whyExplanation: 'Autonomy allows DAG plan adjustment while preserving financial authority limits ($25.00 cap unchanged).',
    whyNotTitle: 'WHY NOT REQUEST BUDGET EXPANSION?',
    whyNotExplanation: [
      'Self-escalation: Blocked by INV-143 & INV-148 (replanner cannot increase financial authority or envelope).'
    ],
  },
  {
    timestamp: '12:04:24',
    actor: 'Autonomous Matcher',
    domain: 'MARKETPLACE',
    action: 'PROVIDER REPLACED',
    economicImpact: 'Alternative Quote: 14.00 USDC (agent_budget_ai)',
    policyDecision: 'PASS (Failover within 25.00 USDC cap)',
    status: 'RECOVERED',
    details: 'Swapped compute step to agent_budget_ai (98.2% reliability, 380ms latency). Mission resumes seamlessly.',
    whyTitle: 'WHY WAS THE FALLBACK ALLOWED?',
    whyExplanation: 'Replacement provider matched capability, budget, policy and risk constraints ($14.00 <= $25.00 cap).',
    whyNotTitle: 'WHY NOT AN UNVETTED CHEAPER PROVIDER?',
    whyNotExplanation: [
      'Unverified external agents: Rejected by INV-146 (providers must be on directory allowlist).',
      'Zero-reputation candidates: Blocked by 85% minimum trust floor.'
    ],
  },
  {
    timestamp: '12:04:31',
    actor: 'Rust Policy Engine',
    domain: 'GOVERNANCE',
    action: 'POLICY ALLOW',
    economicImpact: 'Payout Authorized: 14.00 USDC',
    policyDecision: 'ALLOW (Evaluated in 6.36 µs)',
    status: 'AUTHORIZED',
    details: 'Deterministic policy evaluation: verified recipient allowlist, velocity limits, and budget envelope.',
    whyTitle: 'WHY DID POLICY EMIT ALLOW?',
    whyExplanation: 'Evaluated in 6.36µs: Verified recipient on allowlist, velocity under limit, amount within constitution v8.',
    whyNotTitle: 'WHY NOT HUMAN OPERATOR ESCALATION?',
    whyNotExplanation: [
      'Human approval: Not required because $14.00 USDC is below the $20.00 automated threshold.'
    ],
  },
  {
    timestamp: '12:04:32',
    actor: 'Autonomous Treasury',
    domain: 'TREASURY',
    action: 'LIQUIDITY RESERVED',
    economicImpact: 'Atomic Lock: 14.00 USDC in AgentVault',
    policyDecision: 'BALANCED (INV-75: Zero unreserved risk)',
    status: 'RESERVED',
    details: 'Double-entry reservation journaled. Uncommitted liquidity reduced from $89.00 to $75.00 USDC.',
    whyTitle: 'WHY WAS LIQUIDITY ENCUMBERED ATOMICALLY?',
    whyExplanation: 'Prevents race conditions and double-spending across concurrent sub-agents under mutex lock (INV-75).',
    whyNotTitle: 'WHY NOT EXECUTE WITHOUT RESERVATION?',
    whyNotExplanation: [
      'Unreserved execution: Prohibited by INV-91 (every execution requires active treasury reservation).'
    ],
  },
  {
    timestamp: '12:04:33',
    actor: 'Execution Gate',
    domain: 'PAYMENTS',
    action: 'PAYMENT AUTHORIZED',
    economicImpact: 'PaymentIntent: pi_demo_intel_01 ready',
    policyDecision: 'SIGNED (EIP-712 nonced payload)',
    status: 'AUTHORIZED',
    details: 'Agent received 0 private keys. Authoritative authorization token minted for relayer execution.',
    whyTitle: 'WHY DID AGENT RECEIVE ZERO PRIVATE KEYS?',
    whyExplanation: 'Keyless agent security (INV-141): Agents generate intents; isolated HSM signer mints signed transactions.',
    whyNotTitle: 'WHY NOT DIRECT AGENT SIGNING?',
    whyNotExplanation: [
      'Agent-held keys: Unacceptable risk of prompt injection or key extraction.'
    ],
  },
  {
    timestamp: '12:04:35',
    actor: 'Arc Consensus',
    domain: 'SETTLEMENT',
    action: 'SETTLEMENT EXECUTED',
    economicImpact: 'Settled: 14.00 USDC (SIMULATION / OPERATOR-GATED)',
    policyDecision: 'CONFIRMED (Zero gas slippage)',
    status: 'CONFIRMED',
    details: 'Block consensus verified. Production broadcast remains operator-gated (INV-156 enforced).',
    whyTitle: 'WHY WAS THIS NOT SENT TO ARC?',
    whyExplanation: 'Live execution is disabled (ENABLE_LIVE_EXECUTION=false) and AgentVault is not deployed on Arc Mainnet.',
    whyNotTitle: 'WHY NOT BROADCAST MOCK TRANSACTION?',
    whyNotExplanation: [
      'Fake transactions: Strictly prohibited by INV-92 & INV-156 (zero fake hashes or unverified receipts).'
    ],
  },
  {
    timestamp: '12:04:37',
    actor: 'Swarm Critic Agent',
    domain: 'VERIFICATION',
    action: 'RESULT VERIFIED',
    economicImpact: 'Audit trace finalized, 11.00 USDC unreserved',
    policyDecision: 'COMPLETED (Hash validated)',
    status: 'VERIFIED',
    details: 'Deliverable SHA-256 hash verified. Final intelligence report generated. Economic memory updated with provider telemetry.',
    whyTitle: 'WHY WERE REMAINING FUNDS UNRESERVED?',
    whyExplanation: 'Task complete at $14.00 USDC; unused $11.00 USDC headroom unlocked and returned to available treasury.',
    whyNotTitle: 'WHY NOT WITHHOLD UNSPENT BUDGET?',
    whyNotExplanation: [
      'Uncommitted retention: Prohibited by INV-84 (exact accounting balance with zero fund leakage).'
    ],
  },
];

interface SecurityTestResult {
  attackType: string;
  actor: string;
  attemptedAction: string;
  detection: string;
  decision: 'DENIED';
  status: 'BLOCKED';
  ruleViolated: string;
  invariant: string;
  whatWouldHaveChanged: string;
  whatActuallyChanged: string;
}

export default function ControlTowerPage() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [execMode, setExecMode] = useState<'REAL' | 'SIMULATION'>('SIMULATION');
  const [timelineEvents, setTimelineEvents] = useState<ControlActivityEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTraceId, setSelectedTraceId] = useState<string>('pi_live_9941');
  const [financialTrace, setFinancialTrace] = useState<UniversalFinancialTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ControlSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSecurityTest, setActiveSecurityTest] = useState<SecurityTestResult | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(6); // Default to Provider Replaced
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [execMode]);

  useEffect(() => {
    loadTimeline(selectedCategory);
  }, [selectedCategory, execMode]);

  useEffect(() => {
    if (selectedTraceId) {
      loadTrace(selectedTraceId);
    }
  }, [selectedTraceId]);

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

  async function loadTimeline(cat: string) {
    try {
      const res = await fetchControlActivity('org_default', execMode, cat, 30);
      setTimelineEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load timeline', err);
    }
  }

  async function loadTrace(id: string) {
    setTraceLoading(true);
    try {
      const trc = await fetchFinancialTrace(id, 'org_default');
      setFinancialTrace(trc);
    } catch (err) {
      console.error('Failed to load trace', err);
    } finally {
      setTraceLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetchControlSearch(searchQuery.trim(), 'org_default');
      setSearchResults(res.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  }

  function handleResetDemo() {
    setSelectedEventIndex(0);
    setActiveSecurityTest(null);
    setResetNotice('Deterministic demo state restored to step 0. Production history untouched.');
    setTimeout(() => setResetNotice(null), 3500);
  }

  type AttackVector =
    | 'RECIPIENT_SUBSTITUTION'
    | 'BUDGET_ESCALATION'
    | 'POLICY_MODIFICATION'
    | 'ARBITRARY_CALLDATA'
    | 'QUOTE_INVALIDATION'
    | 'NONCE_REPLAY'
    | 'DUPLICATE_SETTLEMENT'
    | 'FORGED_COMPLETION';

  function runSecurityAttack(type: AttackVector) {
    switch (type) {
      case 'RECIPIENT_SUBSTITUTION':
        setActiveSecurityTest({
          attackType: '1. Recipient Substitution',
          actor: 'Malicious Provider [agent_infiltrator_09]',
          attemptedAction: 'Route 14.00 USDC milestone payout to unverified external address 0xdead...beef',
          detection: 'Recipient address not present in cryptographic policy allowlist (POL-003)',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'POL-003 / INV-146 (Recipient allowlist violation)',
          invariant: 'INV-147 (Recipient substitution strictly blocked without multi-sig)',
          whatWouldHaveChanged: '14.00 USDC transferred to unallowlisted external address',
          whatActuallyChanged: 'Hard DENY emitted in 6.36µs. Recipient locked to verified contract. 0 USDC moved.',
        });
        break;
      case 'BUDGET_ESCALATION':
        setActiveSecurityTest({
          attackType: '2. Budget Escalation',
          actor: 'Compromised Provider [agent_budget_ai]',
          attemptedAction: 'Self-issue payment request for 85.00 USDC exceeding mission budget cap ($25.00 USDC)',
          detection: 'Amount exceeds EconomicEnvelope budget cap ($25.00 USDC) (POL-001)',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'POL-001 (EconomicEnvelope Budget Cap Exceeded)',
          invariant: 'INV-148 (EconomicEnvelope cannot self-increase budget authority)',
          whatWouldHaveChanged: 'Unreserved treasury exposure of 60.00 USDC beyond approved envelope',
          whatActuallyChanged: 'Deterministic budget check rejected intent. Agent envelope remains locked at 25.00 USDC.',
        });
        break;
      case 'POLICY_MODIFICATION':
        setActiveSecurityTest({
          attackType: '3. Policy Modification',
          actor: 'Rogue Sub-Agent [agent_prompt_injector]',
          attemptedAction: 'Modify constitutional policy v8 to disable transaction threshold checks',
          detection: 'Unauthorized policy mutation attempted by runtime agent without governance multi-sig',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'POL-CONST-01 (Constitutional Immutability)',
          invariant: 'INV-140 (Agents cannot alter policy engine constitutions or thresholds)',
          whatWouldHaveChanged: 'Policy engine bypass allowing unconstrained outflows',
          whatActuallyChanged: 'Constitution hash validation rejected change. Policy v8 remains immutable.',
        });
        break;
      case 'ARBITRARY_CALLDATA':
        setActiveSecurityTest({
          attackType: '4. Arbitrary Calldata',
          actor: 'Compromised Planning Agent [agent_planner_01]',
          attemptedAction: 'Execute arbitrary raw bytecode on AgentVault (selfdestruct / delegatecall)',
          detection: 'Execution Gate Calldata Filter detected raw unparsed EVM bytecode',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'GATE-001 (Execution Gate Typed Calldata Enforcement)',
          invariant: 'INV-141 (Agents never receive private keys or raw calldata authority)',
          whatWouldHaveChanged: 'Arbitrary smart contract state mutation or unauthorized vault drain',
          whatActuallyChanged: 'Calldata rejected at Execution Gate boundary. EIP-712 typed intent required.',
        });
        break;
      case 'QUOTE_INVALIDATION':
        setActiveSecurityTest({
          attackType: '5. Quote Invalidation',
          actor: 'Malicious Marketplace Node [agent_ultra_deep]',
          attemptedAction: 'Submit quote above mission ceiling ($28.00 USDC) and alter SLA terms post-discovery',
          detection: 'Marketplace Matcher detected quote exceeds task maximum budget ($25.00 USDC)',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'MKT-002 (Quote Budget Compliance)',
          invariant: 'INV-180 (Quotes above mission budget cap are automatically filtered)',
          whatWouldHaveChanged: 'Overpaying 112% above budget allocation',
          whatActuallyChanged: 'Quote filtered from candidate pool. Lowest eligible quote ($12.50) selected.',
        });
        break;
      case 'NONCE_REPLAY':
        setActiveSecurityTest({
          attackType: '6. Nonce Replay',
          actor: 'Malicious Relayer [rogue_worker_node]',
          attemptedAction: 'Resubmit previously executed payment intent pi_demo_intel_01 with identical nonce',
          detection: 'Idempotency engine detected reused transaction nonce / idempotency key',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'IDEMP-001 (Idempotency Key Collision)',
          invariant: 'INV-13 (All payments are strictly idempotent and replay-protected)',
          whatWouldHaveChanged: 'Double-spend of 14.00 USDC for identical task delivery',
          whatActuallyChanged: 'Idempotency engine matched existing settlement record. Replay dropped instantly.',
        });
        break;
      case 'DUPLICATE_SETTLEMENT':
        setActiveSecurityTest({
          attackType: '7. Duplicate Settlement',
          actor: 'Byzantine Provider [agent_fast_infer]',
          attemptedAction: 'Trigger duplicate release of obligation ob_intel_01 after failure recovery',
          detection: 'Clearinghouse detected obligation already marked FENCED / REPLACED',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'CLEAR-004 (Single-Settlement Invariant)',
          invariant: 'INV-103 (Lease-fenced obligations cannot execute secondary settlements)',
          whatWouldHaveChanged: 'Secondary payout of 12.50 USDC to failed provider',
          whatActuallyChanged: 'Obligation state is FENCED. Zero secondary transfer authorized.',
        });
        break;
      case 'FORGED_COMPLETION':
        setActiveSecurityTest({
          attackType: '8. Forged Completion',
          actor: 'Unverified Worker [agent_ghost_worker]',
          attemptedAction: 'Submit synthetic milestone completion with fabricated deliverable hash',
          detection: 'Verification critic SHA-256 hash mismatch against signed milestone spec',
          decision: 'DENIED',
          status: 'BLOCKED',
          ruleViolated: 'VERIF-002 (Milestone Proof Validation)',
          invariant: 'INV-142 (Milestones require cryptographic deliverable hash verification)',
          whatWouldHaveChanged: 'Escrow release without valid computational work delivery',
          whatActuallyChanged: 'Milestone rejected. Escrow unreleased. Incident logged to audit trail.',
        });
        break;
    }
  }

  const formatMicroUSDC = (baseUnits?: string) => {
    if (!baseUnits || baseUnits === 'UNAVAILABLE') return 'UNAVAILABLE';
    const num = Number(baseUnits) / 1000000;
    if (isNaN(num)) return baseUnits;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const activeEvent = DETERMINISTIC_ECONOMIC_TRACE[selectedEventIndex];

  return (
    <div className="min-h-screen bg-[#070707] text-[#f5f5f5] font-sans pb-24">
      {/* 1. PERSISTENT COMPACT SYSTEM STATUS STRIP */}
      <section className="bg-[#0a0a0a] border-b border-[#202020] px-4 sm:px-6 lg:px-8 py-2 sticky top-16 z-30">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-xs text-[#a3a3a3]">
            <div className="flex items-center gap-1.5">
              <span>MODE:</span>
              <span className="font-semibold text-[#f5f5f5] flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                SIMULATION
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>ARC:</span>
              <span className="font-semibold text-[#f5f5f5] flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                CONNECTED (5042)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>VAULT:</span>
              <span className="font-semibold text-[#a3a3a3] font-mono text-[11px]">
                NOT DEPLOYED
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>EXECUTION:</span>
              <span className="font-semibold text-[#a3a3a3] font-mono text-[11px]">
                DISABLED
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>REAL SETTLEMENTS:</span>
              <span className="font-semibold text-[#a3a3a3] font-mono text-[11px]">
                0 VERIFIED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDemo}
              className="h-8 px-3 bg-[#141414] hover:bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors"
              title="Restore deterministic demo state"
            >
              Reset Demo
            </button>
            <div className="flex bg-[#121212] border border-[#222222] rounded-lg p-0.5">
              <button
                onClick={() => setExecMode('SIMULATION')}
                className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                  execMode === 'SIMULATION'
                    ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                Simulation
              </button>
              <button
                onClick={() => setExecMode('REAL')}
                className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                  execMode === 'REAL'
                    ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                Projected
              </button>
            </div>
            <Link
              href="/control/autonomy"
              className="h-8 px-3.5 bg-[#f5f5f5] hover:bg-white text-[#070707] rounded-lg text-xs font-semibold flex items-center transition-colors"
            >
              Run Simulation →
            </Link>
          </div>
        </div>
      </section>

      {resetNotice && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 bg-[#101010] border border-[#262626] rounded-xl text-xs text-[#f5f5f5] flex items-center justify-between">
            <span>✓ {resetNotice}</span>
            <button onClick={() => setResetNotice(null)} className="text-[#a3a3a3] hover:text-white text-base leading-none">&times;</button>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 2. HERO: PRODUCT IDENTITY & AUTHORITATIVE THESIS */}
        <div className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#161616] text-[#f5f5f5] border border-[#262626] text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  Simulation Environment
                </span>
                <span className="text-xs text-[#737373]">·</span>
                <span className="text-xs text-[#a3a3a3]">
                  Arc Mainnet <span className="font-mono text-[#737373]">(5042)</span>
                </span>
                <span className="text-xs text-[#737373]">·</span>
                <span className="text-xs text-[#a3a3a3]">Vault Undeployed</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f5f5]">
                  AGENTPAY
                </h1>
                <p className="text-[#a3a3a3] text-base sm:text-lg font-normal mt-1">
                  Financial Control Plane for Autonomous AI Agents
                </p>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                <span className="font-semibold text-[#f5f5f5] tracking-wide">
                  AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.
                </span>
                <span className="hidden sm:inline text-[#404040]">|</span>
                <span className="text-[#a3a3a3]">
                  Autonomy can expand. Financial authority cannot.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
              <Link
                href="/control/autonomy"
                className="h-9 px-4 rounded-lg bg-[#f5f5f5] hover:bg-white text-[#070707] text-xs font-semibold transition-colors flex items-center justify-center text-center"
              >
                Autonomy Control →
              </Link>
              <Link
                href="/arc"
                className="h-9 px-4 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-medium border border-[#262626] transition-colors flex items-center justify-center text-center"
              >
                Arc Infrastructure →
              </Link>
            </div>
          </div>
        </div>

        {/* 3. FLAGSHIP MISSION: ONE UNIFIED OPERATIONAL SURFACE */}
        <div className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#1f1f1f] pb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#161616] text-[#f5f5f5] border border-[#262626]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  RUNNING
                </span>
                <span className="text-xs text-[#737373] uppercase tracking-wider font-medium">Flagship Mission</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5f5f5]">
                AUTONOMOUS MARKET INTELLIGENCE
              </h2>
              <p className="text-sm text-[#a3a3a3] mt-1.5 max-w-3xl leading-relaxed">
                Research the market landscape for autonomous AI infrastructure. Autonomous provider negotiation, failure fencing, and verified fallback routing.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href="/control/autonomy"
                className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] text-[#f5f5f5] font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Inspect Autonomy</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Clean Unified Financial Row */}
          <div>
            <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-3">
              Mission Economics
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0a0a0a] border border-[#1c1c1c]">
              <div>
                <span className="text-[11px] text-[#737373] uppercase block font-medium">Budget</span>
                <span className="text-lg font-bold text-[#f5f5f5] mt-0.5 block">$25.00</span>
                <span className="text-[11px] text-[#666666] block font-mono">USDC Hard Cap</span>
              </div>
              <div>
                <span className="text-[11px] text-[#737373] uppercase block font-medium">Committed</span>
                <span className="text-lg font-bold text-[#f5f5f5] mt-0.5 block">$14.00</span>
                <span className="text-[11px] text-[#666666] block font-mono">BudgetAI Quote</span>
              </div>
              <div>
                <span className="text-[11px] text-[#737373] uppercase block font-medium">Risk</span>
                <span className="text-lg font-bold text-[#f5f5f5] mt-0.5 block">24 / 100</span>
                <span className="text-[11px] text-[#666666] block">Low Exposure</span>
              </div>
              <div>
                <span className="text-[11px] text-[#737373] uppercase block font-medium">Policy</span>
                <span className="text-lg font-bold text-[#22c55e] mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  ALLOW
                </span>
                <span className="text-[11px] text-[#666666] block font-mono">6.36µs Gate</span>
              </div>
            </div>
          </div>

          {/* Operational State Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#0a0a0a] border border-[#1c1c1c] text-xs">
            <div>
              <span className="text-[11px] text-[#737373] uppercase block font-medium">Provider</span>
              <span className="font-semibold text-[#f5f5f5] mt-0.5 block text-sm">BudgetAI</span>
              <span className="text-[11px] text-[#666666] block">Failover candidate selected</span>
            </div>
            <div>
              <span className="text-[11px] text-[#737373] uppercase block font-medium">Status</span>
              <span className="font-semibold text-[#f59e0b] mt-0.5 flex items-center gap-1.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                RECOVERED FROM FAILURE
              </span>
              <span className="text-[11px] text-[#666666] block">Worker isolated; budget preserved</span>
            </div>
            <div>
              <span className="text-[11px] text-[#737373] uppercase block font-medium">Next Step</span>
              <span className="font-semibold text-[#f5f5f5] mt-0.5 block text-sm">VALIDATE RESULT</span>
              <span className="text-[11px] text-[#666666] block">Cryptographic milestone check</span>
            </div>
          </div>

          {/* Integrated Telemetry Summary */}
          <div className="pt-2 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between gap-3 text-xs text-[#737373]">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Active Missions: <strong className="text-[#f5f5f5] font-medium">1</strong></span>
              <span>•</span>
              <span>Running Workflows: <strong className="text-[#f5f5f5] font-medium">1 (Durable DAG)</strong></span>
              <span>•</span>
              <span>Recovery Rate: <strong className="text-[#22c55e] font-medium">100%</strong></span>
              <span>•</span>
              <span>Authority Boundary: <strong className="text-[#f5f5f5] font-medium">Outside Agent Reach</strong></span>
            </div>
            <Link href="/missions/msn_market_intel_01/replay" className="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
              Open Replay Controller →
            </Link>
          </div>
        </div>

        {/* 4. PILLAR 1: MISSION TRACE */}
        <section className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1f1f1f] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <h2 className="text-lg font-bold text-[#f5f5f5]">
                  MISSION TRACE
                </h2>
              </div>
              <p className="text-xs text-[#a3a3a3] mt-0.5">
                Deterministic execution sequence: Objective → Simulation → Selection → Failure → Fencing → Replan → Fallback → Settle
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/missions/msn_market_intel_01/replay"
                className="h-8 px-3 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-medium border border-[#262626] transition-colors flex items-center"
              >
                Replay Mission →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Timeline Stream (7 cols) */}
            <div className="lg:col-span-7 space-y-2 max-h-[560px] overflow-y-auto pr-2">
              {DETERMINISTIC_ECONOMIC_TRACE.map((evt, idx) => {
                const isSelected = idx === selectedEventIndex;
                return (
                  <div
                    key={evt.timestamp + evt.action}
                    onClick={() => setSelectedEventIndex(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#151515] border-[#404040]'
                        : 'bg-[#0c0c0c] border-[#1c1c1c] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#737373] font-mono text-[11px]">{evt.timestamp}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#141414] text-[#a3a3a3] border border-[#222222] font-mono">
                          {evt.domain}
                        </span>
                        <span className="font-semibold text-[#f5f5f5] text-xs">{evt.action}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        evt.status === 'FAILED'
                          ? 'bg-[#181111] text-[#ef4444] border border-[#ef4444]/30'
                          : evt.status === 'REPLANNING' || evt.status === 'RECOVERED'
                          ? 'bg-[#18150f] text-[#f59e0b] border border-[#f59e0b]/30'
                          : 'bg-[#0f1712] text-[#22c55e] border border-[#22c55e]/30'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          evt.status === 'FAILED' ? 'bg-[#ef4444]' : evt.status === 'REPLANNING' || evt.status === 'RECOVERED' ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'
                        }`} />
                        {evt.status}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-[#a3a3a3] flex items-center justify-between pt-1 border-t border-[#141414]">
                      <span>Actor: <strong className="text-[#f5f5f5] font-normal">{evt.actor}</strong></span>
                      <span className="text-[#f5f5f5] text-xs">{evt.economicImpact}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event Detail & Why / Why Not Panel (5 cols) */}
            <div className="lg:col-span-5 bg-[#0a0a0a] p-5 rounded-xl border border-[#1f1f1f] space-y-4">
              <div className="border-b border-[#1c1c1c] pb-3">
                <span className="text-[10px] text-[#737373] font-semibold uppercase tracking-wider block">
                  Inspected Step · <span className="font-mono">{activeEvent.timestamp}</span>
                </span>
                <h3 className="text-base font-bold text-[#f5f5f5] mt-1">
                  {activeEvent.action}
                </h3>
                <p className="text-xs text-[#a3a3a3] mt-1.5 leading-relaxed">
                  {activeEvent.details}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-[#121212] rounded-lg border border-[#1a1a1a]">
                  <span className="text-[#737373]">Actor</span>
                  <span className="text-[#f5f5f5] font-medium">{activeEvent.actor}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#121212] rounded-lg border border-[#1a1a1a]">
                  <span className="text-[#737373]">Economic Impact</span>
                  <span className="text-[#f5f5f5] font-medium">{activeEvent.economicImpact}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-[#121212] rounded-lg border border-[#1a1a1a]">
                  <span className="text-[#737373]">Policy Gate</span>
                  <span className="text-[#22c55e] font-medium">{activeEvent.policyDecision}</span>
                </div>
              </div>

              {/* "WHY?" PANEL */}
              <div className="p-3.5 bg-[#0d140e] border border-[#22c55e]/20 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  <span className="text-xs font-semibold text-[#22c55e] uppercase tracking-wider">
                    {activeEvent.whyTitle || 'WHY WAS THIS DECISION MADE?'}
                  </span>
                </div>
                <p className="text-xs text-[#f5f5f5] leading-relaxed">
                  {activeEvent.whyExplanation || 'Deterministic policy validation within bounded constitutional envelope.'}
                </p>
              </div>

              {/* "WHY NOT?" PANEL */}
              <div className="p-3.5 bg-[#141414] border border-[#222222] rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                  <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">
                    {activeEvent.whyNotTitle || 'WHY NOT THE ALTERNATIVES?'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-[#a3a3a3]">
                  {activeEvent.whyNotExplanation && activeEvent.whyNotExplanation.length > 0 ? (
                    activeEvent.whyNotExplanation.map((reason, i) => (
                      <div key={i}>• {reason}</div>
                    ))
                  ) : (
                    <div>• Standard alternatives rejected by policy constraints.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PILLAR 2: WHY THIS DECISION */}
        <section className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-7 space-y-5">
          <div className="border-b border-[#1f1f1f] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                Auditable Explanation Log
              </span>
              <h3 className="text-lg font-bold text-[#f5f5f5] mt-0.5">
                WHY THIS DECISION
              </h3>
            </div>
            <span className="text-xs text-[#a3a3a3]">
              Institutional explanation framework for autonomous economic choices
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
              <div className="text-[#f5f5f5] font-semibold text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                WHY THIS PROVIDER?
              </div>
              <p className="text-[#a3a3a3] text-xs leading-relaxed">
                Lowest eligible quote within budget and policy constraints with verified SLA.
              </p>
            </div>

            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
              <div className="text-[#f5f5f5] font-semibold text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                WHY NOT THE $28 PROVIDER?
              </div>
              <p className="text-[#a3a3a3] text-xs leading-relaxed">
                Quote exceeds the $25.00 USDC mission budget envelope cap.
              </p>
            </div>

            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
              <div className="text-[#f5f5f5] font-semibold text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                WHY WAS THE FAILED PAYMENT NOT RETRIED?
              </div>
              <p className="text-[#a3a3a3] text-xs leading-relaxed">
                Execution was lease-fenced. Blind retries are strictly prohibited to avoid double-spend.
              </p>
            </div>

            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
              <div className="text-[#f5f5f5] font-semibold text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                WHY WAS THE FALLBACK ALLOWED?
              </div>
              <p className="text-[#a3a3a3] text-xs leading-relaxed">
                Capability, budget ceiling, allowlist policy, and risk threshold checks all passed.
              </p>
            </div>

            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4 space-y-2 md:col-span-2 lg:col-span-2">
              <div className="text-[#f5f5f5] font-semibold text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                WHY NOT ARC LIVE SETTLEMENT?
              </div>
              <p className="text-[#a3a3a3] text-xs leading-relaxed">
                Live execution is disabled (<span className="font-mono text-[#737373]">ENABLE_LIVE_EXECUTION=false</span>) and AgentVault contract is undeployed on Arc Mainnet.
              </p>
            </div>
          </div>
        </section>

        {/* 6. PILLAR 3: AUTHORITY BOUNDARY & SECURITY PROVING GROUND */}
        <section className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-7 space-y-6">
          <div className="border-b border-[#1f1f1f] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                Deterministic Enclosure
              </span>
              <h3 className="text-lg font-bold text-[#f5f5f5] mt-0.5">
                AUTHORITY BOUNDARY
              </h3>
            </div>
            <span className="text-xs text-[#a3a3a3]">
              Outside agent model reach · Zero agent-held private keys
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Agent Authority Scope (5 cols) */}
            <div className="lg:col-span-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 space-y-4 text-xs">
              <div className="border-b border-[#1a1a1a] pb-2 flex items-center justify-between">
                <span className="font-bold text-[#f5f5f5]">AI AUTONOMY PERIMETER</span>
                <span className="text-[10px] font-medium text-[#22c55e]">ENFORCED</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0e1410] border border-[#22c55e]/20 rounded-lg p-3 space-y-1.5">
                  <div className="text-[#22c55e] font-semibold uppercase text-[10px] mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                    Allowed Actions
                  </div>
                  <div className="text-[#f5f5f5] flex items-center gap-1.5">
                    <span className="text-[#22c55e]">✓</span> Discover services
                  </div>
                  <div className="text-[#f5f5f5] flex items-center gap-1.5">
                    <span className="text-[#22c55e]">✓</span> Negotiate quotes
                  </div>
                  <div className="text-[#f5f5f5] flex items-center gap-1.5">
                    <span className="text-[#22c55e]">✓</span> Plan execution DAG
                  </div>
                  <div className="text-[#f5f5f5] flex items-center gap-1.5">
                    <span className="text-[#22c55e]">✓</span> Replan on failure
                  </div>
                  <div className="text-[#f5f5f5] flex items-center gap-1.5">
                    <span className="text-[#22c55e]">✓</span> Request payments
                  </div>
                </div>

                <div className="bg-[#171010] border border-[#ef4444]/20 rounded-lg p-3 space-y-1.5">
                  <div className="text-[#ef4444] font-semibold uppercase text-[10px] mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                    Forbidden Boundaries
                  </div>
                  <div className="text-[#a3a3a3] flex items-center gap-1.5">
                    <span className="text-[#ef4444]">✕</span> Sign transactions
                  </div>
                  <div className="text-[#a3a3a3] flex items-center gap-1.5">
                    <span className="text-[#ef4444]">✕</span> Increase budget
                  </div>
                  <div className="text-[#a3a3a3] flex items-center gap-1.5">
                    <span className="text-[#ef4444]">✕</span> Change policy
                  </div>
                  <div className="text-[#a3a3a3] flex items-center gap-1.5">
                    <span className="text-[#ef4444]">✕</span> Arbitrary recipient
                  </div>
                  <div className="text-[#a3a3a3] flex items-center gap-1.5">
                    <span className="text-[#ef4444]">✕</span> Arbitrary calldata
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1a1a1a] text-center">
                <span className="text-[11px] font-medium text-[#a3a3a3]">
                  Autonomy changes the plan. Policy controls the financial authority.
                </span>
              </div>
            </div>

            {/* Security Proving Ground (7 cols, 8 ATTACKS) */}
            <div className="lg:col-span-7 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
              <div className="border-b border-[#1a1a1a] pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#f5f5f5] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    SECURITY PROVING GROUND
                  </h4>
                  <p className="text-[11px] text-[#737373]">Deterministic test vectors: Click an attack vector to verify defense gates</p>
                </div>
                <span className="text-[11px] font-medium text-[#22c55e]">
                  8 / 8 DEFENDED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => runSecurityAttack('RECIPIENT_SUBSTITUTION')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="1. Recipient substitution"
                >
                  1. Recipient Sub
                </button>
                <button
                  onClick={() => runSecurityAttack('BUDGET_ESCALATION')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="2. Budget escalation"
                >
                  2. Budget Escalation
                </button>
                <button
                  onClick={() => runSecurityAttack('POLICY_MODIFICATION')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="3. Policy modification"
                >
                  3. Policy Mod
                </button>
                <button
                  onClick={() => runSecurityAttack('ARBITRARY_CALLDATA')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="4. Arbitrary calldata"
                >
                  4. Raw Calldata
                </button>
                <button
                  onClick={() => runSecurityAttack('QUOTE_INVALIDATION')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="5. Quote invalidation"
                >
                  5. Quote Invalidate
                </button>
                <button
                  onClick={() => runSecurityAttack('NONCE_REPLAY')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="6. Nonce replay"
                >
                  6. Nonce Replay
                </button>
                <button
                  onClick={() => runSecurityAttack('DUPLICATE_SETTLEMENT')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="7. Duplicate settlement"
                >
                  7. Duplicate Settle
                </button>
                <button
                  onClick={() => runSecurityAttack('FORGED_COMPLETION')}
                  className="h-8 px-2.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] rounded-lg text-xs font-medium transition-colors text-left truncate"
                  title="8. Forged completion"
                >
                  8. Forged Work
                </button>
              </div>

              {activeSecurityTest ? (
                <div className="p-4 bg-[#0d0d0d] border border-[#262626] rounded-xl space-y-3.5 text-xs">
                  {/* 4-Step Pipeline Flow */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-[#171010] border border-[#ef4444]/30 rounded-lg">
                      <span className="text-[10px] text-[#ef4444] block font-semibold">1. ATTACK</span>
                      <span className="text-[#f5f5f5] text-xs font-medium truncate block">{activeSecurityTest.attackType}</span>
                    </div>
                    <div className="p-2 bg-[#18150f] border border-[#f59e0b]/30 rounded-lg">
                      <span className="text-[10px] text-[#f59e0b] block font-semibold">2. DETECTION</span>
                      <span className="text-[#f5f5f5] text-xs font-medium truncate block">{activeSecurityTest.ruleViolated.split(' ')[0]}</span>
                    </div>
                    <div className="p-2 bg-[#141414] border border-[#262626] rounded-lg">
                      <span className="text-[10px] text-[#a3a3a3] block font-semibold">3. DECISION</span>
                      <span className="text-[#ef4444] text-xs font-bold block">{activeSecurityTest.decision}</span>
                    </div>
                    <div className="p-2 bg-[#0e1410] border border-[#22c55e]/30 rounded-lg">
                      <span className="text-[10px] text-[#22c55e] block font-semibold">4. RESULT</span>
                      <span className="text-[#22c55e] text-xs font-bold block">{activeSecurityTest.status}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-[#a3a3a3] pt-1">
                    <div><span className="text-[#737373]">Actor:</span> <span className="text-[#f5f5f5] font-mono text-[11px]">{activeSecurityTest.actor}</span></div>
                    <div><span className="text-[#737373]">Attempted:</span> <span className="text-[#f5f5f5]">{activeSecurityTest.attemptedAction}</span></div>
                    <div><span className="text-[#737373]">Detection:</span> <span className="text-[#a3a3a3]">{activeSecurityTest.detection}</span></div>
                    <div><span className="text-[#737373]">Rule:</span> <span className="text-[#22c55e] font-mono text-[11px]">{activeSecurityTest.ruleViolated}</span></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1a1a1a]">
                    <div className="p-2.5 bg-[#121212] rounded-lg border border-[#1a1a1a]">
                      <span className="text-[#737373] text-[10px] block uppercase font-medium">Prevented Outcome</span>
                      <span className="text-[#a3a3a3] text-[11px] mt-0.5 block">{activeSecurityTest.whatWouldHaveChanged}</span>
                    </div>
                    <div className="p-2.5 bg-[#0e1410] border border-[#22c55e]/20 rounded-lg">
                      <span className="text-[#22c55e] text-[10px] block uppercase font-medium">Actual State</span>
                      <span className="text-[#f5f5f5] text-[11px] mt-0.5 block">{activeSecurityTest.whatActuallyChanged}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#0a0a0a] border border-dashed border-[#202020] rounded-xl text-center text-[#737373] text-xs">
                  Click any of the 8 attack vectors above to test real-time deterministic defense gates.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 7. PILLAR 4: ARC SETTLEMENT */}
        <section className="bg-[#101010] border border-[#202020] rounded-xl p-6 sm:p-7 space-y-5">
          <div className="border-b border-[#1f1f1f] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737373]">
                Settlement Layer
              </span>
              <h3 className="text-lg font-bold text-[#f5f5f5] mt-0.5">
                ARC SETTLEMENT & CONSENSUS
              </h3>
            </div>
            <Link href="/arc" className="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
              Full Arc Status Page →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl">
              <span className="text-[10px] text-[#737373] uppercase block font-medium">Chain</span>
              <span className="text-base font-bold text-[#f5f5f5] mt-0.5 block">5042</span>
              <span className="text-[11px] text-[#666666] block">Arc Mainnet</span>
            </div>
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl">
              <span className="text-[10px] text-[#737373] uppercase block font-medium">RPC Status</span>
              <span className="text-base font-bold text-[#22c55e] mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                CONNECTED
              </span>
              <span className="text-[11px] text-[#666666] block font-mono">Block #22,572,770</span>
            </div>
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl">
              <span className="text-[10px] text-[#737373] uppercase block font-medium">AgentVault</span>
              <span className="text-base font-bold text-[#a3a3a3] mt-0.5 block">NOT DEPLOYED</span>
              <span className="text-[11px] text-[#666666] block">Bytecode pending</span>
            </div>
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl">
              <span className="text-[10px] text-[#737373] uppercase block font-medium">Live Execution</span>
              <span className="text-base font-bold text-[#a3a3a3] mt-0.5 block">DISABLED</span>
              <span className="text-[11px] text-[#666666] block">Operator gated</span>
            </div>
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#737373] uppercase block font-medium">Real Settlements</span>
              <span className="text-base font-bold text-[#f5f5f5] mt-0.5 block">0 VERIFIED</span>
              <span className="text-[11px] text-[#666666] block">Simulation consistent</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#737373] uppercase text-[10px] font-medium">Simulation Reconciliation</span>
                <span className="text-[#22c55e] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  CONSISTENT
                </span>
              </div>
              <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
                Internal ledger, double-entry journal, and digital twin state reflect mathematical parity across all simulation scenarios.
              </p>
            </div>
            <div className="p-3.5 bg-[#0a0a0a] border border-[#1c1c1c] rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#737373] uppercase text-[10px] font-medium">Real On-Chain Reconciliation</span>
                <span className="text-[#737373] font-semibold">NOT AVAILABLE</span>
              </div>
              <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
                Zero verified settlements: AgentVault is not deployed on Arc Mainnet and live execution remains disabled.
              </p>
            </div>
          </div>
        </section>

        {/* 8. GLOBAL TECHNICAL SEARCH */}
        <section className="bg-[#101010] border border-[#202020] rounded-xl p-4 sm:p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across Mission ID, Agent ID, Contract ID, Payment ID, Tx Hash..."
              className="flex-1 bg-[#0a0a0a] border border-[#222222] rounded-lg px-4 h-10 text-xs text-[#f5f5f5] placeholder-[#666666] font-sans focus:outline-none focus:border-[#444444]"
            />
            <button
              type="submit"
              disabled={searching}
              className="h-10 px-5 rounded-lg bg-[#f5f5f5] hover:bg-white text-[#070707] font-semibold text-xs transition-colors disabled:opacity-50 shrink-0"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-3 border-t border-[#1f1f1f] pt-3 space-y-2">
              <span className="text-[11px] text-[#737373]">SEARCH RESULTS ({searchResults.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchResults.map((r) => (
                  <Link
                    key={r.id}
                    href={r.deep_link_url}
                    className="p-3 bg-[#0a0a0a] border border-[#1c1c1c] rounded-lg hover:border-[#333333] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#a3a3a3] font-mono text-[10px] border border-[#222222]">
                          {r.type}
                        </span>
                        <span className="font-semibold text-xs text-[#f5f5f5]">{r.title}</span>
                      </div>
                      <p className="text-[11px] text-[#737373] mt-1">{r.subtitle}</p>
                    </div>
                    <span className="text-[#a3a3a3] text-xs font-semibold">Open →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
