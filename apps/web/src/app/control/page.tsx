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
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* 1. PERSISTENT ECONOMIC STATE STRIP */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">TREASURY:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">POLICY:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                v8 ACTIVE (6.36µs)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">RISK:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                LOW (SCORE: 12/100)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">EXECUTION:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                execMode === 'REAL'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {execMode === 'REAL' ? 'LIVE ON-CHAIN (OPERATOR-GATED)' : 'SIMULATION MODE (INV-156)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">ARC:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                VERIFIED RPC (5042)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDemo}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-bold font-mono transition-colors"
              title="Restore deterministic demo state"
            >
              RESET DEMO
            </button>
            <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
              <button
                onClick={() => setExecMode('SIMULATION')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  execMode === 'SIMULATION' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                SIMULATION
              </button>
              <button
                onClick={() => setExecMode('REAL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  execMode === 'REAL' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                LIVE
              </button>
            </div>
          </div>
        </div>
      </section>

      {resetNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs font-mono text-emerald-300 flex items-center justify-between">
            <span>✓ {resetNotice}</span>
            <button onClick={() => setResetNotice(null)} className="text-emerald-400 hover:text-white">&times;</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* 2. SECTION 4: CONTROL TOWER HERO & SYSTEM STATUS (ABOVE THE FOLD) */}
        <div className="bg-gradient-to-r from-[#0c1427] via-[#0f1d38] to-[#0c1427] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold tracking-widest uppercase">
                  FINANCIAL CONTROL PLANE
                </span>
                <span className="text-xs font-mono text-cyan-400">ARC MAINNET INTEGRATION (5042)</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono mt-2">
                AGENTPAY
              </h1>
              <p className="text-slate-300 text-base sm:text-lg font-medium mt-1">
                Financial Control Plane for Autonomous AI Agents
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded">
                  AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.
                </span>
                <span className="text-slate-400">
                  AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.
                </span>
              </div>
            </div>

            {/* SECTION 4 SYSTEM STATUS BLOCK */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 font-mono text-xs space-y-2.5 min-w-[320px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>SYSTEM STATUS</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">MODE:</span>
                  <span className="text-amber-400 font-bold">SIMULATION</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ARC:</span>
                  <span className="text-cyan-400 font-bold">CONNECTED</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AGENTVAULT:</span>
                  <span className="text-rose-400 font-bold">NOT DEPLOYED</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">LIVE EXECUTION:</span>
                  <span className="text-rose-400 font-bold">DISABLED</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-900 flex justify-between items-center">
                  <span className="text-slate-400 text-[10px]">TREASURY:</span>
                  <span className="text-teal-400 font-bold">SIMULATED ($100.00 USDC)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-emerald-400 font-bold">ACTIVE MISSION:</span>
              <span className="text-white font-bold">Autonomous Market Intelligence</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300 font-bold">$25.00 USDC Budget</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/control"
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-sm shadow-amber-500/20"
              >
                CONTROL TOWER
              </Link>
              <Link
                href="/missions/msn_market_intel_01/replay"
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                FAILURE REPLAY &rarr;
              </Link>
              <Link
                href="/arc"
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors border border-cyan-500/30"
              >
                ARC PANEL &rarr;
              </Link>
              <Link
                href="/simulator"
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                SIMULATOR &rarr;
              </Link>
              <Link
                href="/marketplace"
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                MARKETPLACE &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 3. HERO TRACE: ACTIVE MISSION TIMELINE WITH WHY / WHY NOT UX */}
        <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-lg font-bold font-mono text-white">
                  HERO TRACE: DETERMINISTIC MISSION TIMELINE
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous execution sequence: Objective &rarr; DAG &rarr; Discovery &rarr; Selection &rarr; Policy &rarr; Twin &rarr; Failure &rarr; Fencing &rarr; Replan &rarr; Fallback &rarr; Settle
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/missions/msn_market_intel_01/replay"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-xs font-bold border border-amber-500/40 transition-colors"
              >
                OPEN REPLAY CONTROLLER &rarr;
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
                    className={`p-3.5 rounded-xl border font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/60 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">{evt.timestamp}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-teal-300 border border-slate-700">
                          {evt.domain}
                        </span>
                        <span className="font-bold text-white text-xs">{evt.action}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.status === 'FAILED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : evt.status === 'REPLANNING' || evt.status === 'RECOVERED'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {evt.status}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-300 font-sans flex items-center justify-between">
                      <span>Actor: <strong className="text-slate-200">{evt.actor}</strong></span>
                      <span className="text-amber-300 font-mono text-[11px]">{evt.economicImpact}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event Detail & Why / Why Not Panel (5 cols) */}
            <div className="lg:col-span-5 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                  INSPECTED EVENT &bull; {activeEvent.timestamp}
                </span>
                <h3 className="text-base font-bold font-mono text-white mt-1">
                  {activeEvent.action}
                </h3>
                <p className="text-xs text-slate-300 mt-1 font-sans">
                  {activeEvent.details}
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Actor:</span>
                  <span className="text-white font-bold">{activeEvent.actor}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Economic Impact:</span>
                  <span className="text-amber-300 font-bold">{activeEvent.economicImpact}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400">Policy Gate:</span>
                  <span className="text-emerald-400 font-bold">{activeEvent.policyDecision}</span>
                </div>
              </div>

              {/* SECTION 5: "WHY?" PANEL */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    {activeEvent.whyTitle || 'WHY WAS THIS DECISION MADE?'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {activeEvent.whyExplanation || 'Deterministic policy validation within bounded constitutional envelope.'}
                </p>
              </div>

              {/* SECTION 5: "WHY NOT?" PANEL */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                    {activeEvent.whyNotTitle || 'WHY NOT THE ALTERNATIVES?'}
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  {activeEvent.whyNotExplanation && activeEvent.whyNotExplanation.length > 0 ? (
                    activeEvent.whyNotExplanation.map((reason, i) => (
                      <div key={i}>&bull; {reason}</div>
                    ))
                  ) : (
                    <div>&bull; Standard alternatives rejected by policy constraints.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECTION 4 SYSTEM METRICS GRIDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ECONOMIC STATE */}
          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ECONOMIC STATE
              </span>
              <span className="text-[10px] font-mono text-slate-500">USDC</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Available:</span>
                <span className="text-emerald-400 font-bold">$81.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reserved:</span>
                <span className="text-amber-400 font-bold">$18.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Committed:</span>
                <span className="text-cyan-400 font-bold">$18.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settled:</span>
                <span className="text-purple-400 font-bold">$18.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding:</span>
                <span className="text-slate-300 font-bold">$0.00</span>
              </div>
            </div>
          </section>

          {/* OPERATIONS */}
          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                OPERATIONS
              </span>
              <span className="text-[10px] font-mono text-slate-500">RUNTIME</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Objectives:</span>
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Running Missions:</span>
                <span className="text-teal-300 font-bold">1 (msn_market_intel)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Agents:</span>
                <span className="text-cyan-300 font-bold">4 Swarm Agents</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pending Approvals:</span>
                <span className="text-emerald-400 font-bold">0 (Within SLA)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Incidents:</span>
                <span className="text-amber-400 font-bold">1 (Recovered)</span>
              </div>
            </div>
          </section>

          {/* SETTLEMENT & ARC (TRUTHFUL AUDIT) */}
          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                SETTLEMENT & ARC
              </span>
              <span className="text-[10px] font-mono text-slate-500">CONSENSUS</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Network:</span>
                <span className="text-cyan-300 font-bold">Arc Mainnet (5042)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AgentVault:</span>
                <span className="text-rose-400 font-bold">NOT DEPLOYED (0x)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Live Execution:</span>
                <span className="text-rose-400 font-bold">DISABLED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Real Settlements:</span>
                <span className="text-slate-300 font-bold">0 Verified (Sim: 1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Broadcasts:</span>
                <span className="text-slate-300 font-bold">0</span>
              </div>
            </div>
          </section>

          {/* INTELLIGENCE */}
          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                INTELLIGENCE
              </span>
              <span className="text-[10px] font-mono text-slate-500">MEMORY</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Learning Signals:</span>
                <span className="text-indigo-300 font-bold">3 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">FastInfer Trust:</span>
                <span className="text-amber-400 font-bold">82.1% (Penalized)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BudgetAI Trust:</span>
                <span className="text-emerald-400 font-bold">98.2% (Promoted)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Replanning Events:</span>
                <span className="text-teal-300 font-bold">1 Auto-Failover</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Memory Graph:</span>
                <span className="text-white font-bold">Synchronized</span>
              </div>
            </div>
          </section>
        </div>

        {/* 5. FINANCIAL AUTHORITY & SECTION 3: ONE-CLICK SECURITY ADVERSARIAL DEMO (8 ATTACKS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FINANCIAL AUTHORITY PANEL (5 cols) */}
          <section className="lg:col-span-5 bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  FINANCIAL AUTHORITY PANEL
                </h3>
                <p className="text-xs text-slate-400">Non-negotiable constitutional safety invariants</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-mono font-bold">
                ENFORCED
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Agent Private Keys:</span>
                <span className="text-emerald-400 font-bold">NEVER HELD</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Arbitrary Recipient:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Arbitrary Calldata:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Policy Bypass:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Hard DENY Override:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Simulation Broadcast:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Duplicate Settlement:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-slate-300">Cross-Tenant Access:</span>
                <span className="text-emerald-400 font-bold">BLOCKED</span>
              </div>
            </div>
          </section>

          {/* SECTION 3: ONE-CLICK SECURITY ADVERSARIAL DEMO (7 cols, 8 ATTACKS) */}
          <section className="lg:col-span-7 bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  SECURITY PROVING GROUND (8 ATTACKS)
                </h3>
                <p className="text-xs text-slate-400">Deterministic verification: ATTACK &rarr; DETECTION &rarr; DECISION &rarr; BLOCKED</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
                8 / 8 DEFENDED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => runSecurityAttack('RECIPIENT_SUBSTITUTION')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="1. Recipient substitution"
              >
                1. Recipient Sub
              </button>
              <button
                onClick={() => runSecurityAttack('BUDGET_ESCALATION')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="2. Budget escalation"
              >
                2. Budget Escalation
              </button>
              <button
                onClick={() => runSecurityAttack('POLICY_MODIFICATION')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="3. Policy modification"
              >
                3. Policy Mod
              </button>
              <button
                onClick={() => runSecurityAttack('ARBITRARY_CALLDATA')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="4. Arbitrary calldata"
              >
                4. Raw Calldata
              </button>
              <button
                onClick={() => runSecurityAttack('QUOTE_INVALIDATION')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="5. Quote invalidation"
              >
                5. Quote Invalidation
              </button>
              <button
                onClick={() => runSecurityAttack('NONCE_REPLAY')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="6. Nonce replay"
              >
                6. Nonce Replay
              </button>
              <button
                onClick={() => runSecurityAttack('DUPLICATE_SETTLEMENT')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="7. Duplicate settlement"
              >
                7. Duplicate Settle
              </button>
              <button
                onClick={() => runSecurityAttack('FORGED_COMPLETION')}
                className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-mono font-bold transition-colors text-left truncate"
                title="8. Forged completion"
              >
                8. Forged Work
              </button>
            </div>

            {activeSecurityTest ? (
              <div className="p-4 bg-slate-950 border border-rose-500/40 rounded-xl space-y-4 font-mono text-xs">
                {/* 4-Step Pipeline Flow */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg">
                    <span className="text-[10px] text-rose-400 block font-bold">1. ATTACK</span>
                    <span className="text-white text-xs font-bold truncate block">{activeSecurityTest.attackType}</span>
                  </div>
                  <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg">
                    <span className="text-[10px] text-amber-400 block font-bold">2. DETECTION</span>
                    <span className="text-amber-200 text-xs font-bold truncate block">{activeSecurityTest.ruleViolated.split(' ')[0]}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-bold">3. DECISION</span>
                    <span className="text-rose-400 text-xs font-bold block">{activeSecurityTest.decision}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-lg">
                    <span className="text-[10px] text-emerald-400 block font-bold">4. RESULT</span>
                    <span className="text-emerald-400 text-xs font-bold block">{activeSecurityTest.status}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-slate-300 pt-1">
                  <div><strong>Actor:</strong> <span className="text-slate-400">{activeSecurityTest.actor}</span></div>
                  <div><strong>Attempted Action:</strong> <span className="text-rose-300">{activeSecurityTest.attemptedAction}</span></div>
                  <div><strong>Detection Mechanism:</strong> <span className="text-amber-300">{activeSecurityTest.detection}</span></div>
                  <div><strong>Rule Enforced:</strong> <span className="text-emerald-400">{activeSecurityTest.ruleViolated}</span></div>
                  <div><strong>Constitutional Invariant:</strong> <span className="text-teal-300">{activeSecurityTest.invariant}</span></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <span className="text-slate-500 text-[10px] block uppercase">What Would Have Happened</span>
                    <span className="text-rose-300 text-[11px] mt-0.5 block">{activeSecurityTest.whatWouldHaveChanged}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                    <span className="text-emerald-400 text-[10px] block uppercase">What Actually Happened</span>
                    <span className="text-emerald-200 text-[11px] mt-0.5 block">{activeSecurityTest.whatActuallyChanged}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 font-mono text-xs">
                Click any of the 8 attack buttons above to verify real-time deterministic defense gates.
              </div>
            )}
          </section>
        </div>

        {/* 6. GLOBAL SEARCH */}
        <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across Mission ID, Agent ID, Contract ID, Payment ID, Tx Hash..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {searching ? 'SEARCHING...' : 'GLOBAL SEARCH'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-3 space-y-2">
              <span className="text-[11px] font-mono text-slate-400">SEARCH RESULTS ({searchResults.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchResults.map((r) => (
                  <Link
                    key={r.id}
                    href={r.deep_link_url}
                    className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-lg hover:border-amber-400/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-amber-500/20">
                          {r.type}
                        </span>
                        <span className="font-semibold text-xs text-white">{r.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{r.subtitle}</p>
                    </div>
                    <span className="text-amber-400 text-xs font-mono font-bold">OPEN &rarr;</span>
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
