'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  operationsApi,
  OperationsSnapshot,
  OperationsHealth,
  OperationsWorker,
  OperationsQueuesData,
  OperationsIncident,
  OperationsExplanation,
  OperationsNextAction,
  SystemStateAtSnapshot,
} from '../../../lib/api/operations';

export default function OperationsCommandCenter() {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [workers, setWorkers] = useState<OperationsWorker[]>([]);
  const [queues, setQueues] = useState<OperationsQueuesData | null>(null);
  const [incidents, setIncidents] = useState<OperationsIncident[]>([]);
  const [activeTab, setActiveTab] = useState<'SYSTEM' | 'WORKFLOWS' | 'WORKERS' | 'QUEUES' | 'INCIDENTS' | 'CAPACITY' | 'HEALTH'>('SYSTEM');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Inspector modal states
  const [inspectEventId, setInspectEventId] = useState('');
  const [explanation, setExplanation] = useState<OperationsExplanation | null>(null);
  const [inspectingWorkflowId, setInspectingWorkflowId] = useState('wf_sec_audit_01');
  const [nextAction, setNextAction] = useState<OperationsNextAction | null>(null);

  // Time Travel states
  const [timeTravelInput, setTimeTravelInput] = useState('');
  const [timeTravelState, setTimeTravelState] = useState<SystemStateAtSnapshot | null>(null);
  const [timeTravelLoading, setTimeTravelLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [snap, h, w, q, inc] = await Promise.all([
        operationsApi.getSnapshot(),
        operationsApi.getHealth(),
        operationsApi.getWorkers(),
        operationsApi.getQueues(),
        operationsApi.getIncidents(),
      ]);
      setSnapshot(snap);
      setHealth(h);
      setWorkers(w);
      setQueues(q);
      setIncidents(inc);
      setIsOffline(false);
    } catch (err) {
      console.error('Operations OS telemetry error:', err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleExplainEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectEventId.trim()) return;
    try {
      const res = await operationsApi.explainEvent(inspectEventId.trim());
      setExplanation(res);
    } catch (err) {
      console.error('Explain event failed', err);
    }
  }

  async function handleGetNextAction(wfId: string) {
    try {
      const res = await operationsApi.getNextAction(wfId);
      setNextAction(res);
    } catch (err) {
      console.error('Next action failed', err);
    }
  }

  async function handleTimeTravel(e: React.FormEvent) {
    e.preventDefault();
    if (!timeTravelInput.trim()) return;
    setTimeTravelLoading(true);
    try {
      const res = await operationsApi.getStateAt(timeTravelInput.trim());
      setTimeTravelState(res);
    } catch (err) {
      console.error('Time-travel query failed', err);
    } finally {
      setTimeTravelLoading(false);
    }
  }

  const freshnessColor =
    snapshot?.freshness === 'FRESH'
      ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30'
      : snapshot?.freshness === 'STALE'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : snapshot?.freshness === 'DEGRADED'
      ? 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/30'
      : 'bg-[#141414] text-[#B0ADA5] border-[#222222]';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Offline Alert */}
      {isOffline && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#D85C5C]/40 flex items-center justify-between text-[#D85C5C] shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D85C5C] animate-ping" />
            <span className="font-mono font-bold text-sm tracking-wider">CONNECTION LOST — OPERATIONAL STATE STALE</span>
          </div>
          <span className="text-xs font-mono text-[#D85C5C]">Commands frozen (INV-134 / INV-137)</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-xl bg-[#101010] border border-[#222222]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              OPERATIONS OS
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${freshnessColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${snapshot?.freshness === 'FRESH' ? 'bg-[#2FB36F] animate-pulse' : 'bg-[#D6A83A]'}`} />
              FRESHNESS: {snapshot?.freshness ?? 'UNKNOWN'}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono text-[#716F69] border border-[#222222]">
              VERSION: {snapshot?.snapshot_version ?? 1}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F2F0EA] tracking-tight mt-2 flex items-center gap-3">
            Autonomous Operations Command Center
          </h1>
          <p className="text-sm text-[#B0ADA5] mt-1 max-w-3xl leading-relaxed">
            Supervisory orchestration and deterministic reconciliation of autonomous economic workflows.
            <strong className="text-[#D6A83A] font-medium"> Strictly bounded: Operational decisions never authorize money movement (INV-121).</strong>
          </p>
        </div>

        {/* Quick Nav Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/control/operations/timeline"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            Live Timeline
          </Link>
          <Link
            href="/control/operations/topology"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            Runtime Topology
          </Link>
          <Link
            href="/control/operations/replay/wf_sec_audit_01"
            className="px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/30 transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            Workflow Replay
          </Link>
        </div>
      </div>

      {/* Top-Level System State Metrics Grid (Section 33) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Health State</div>
          <div className="text-xl font-bold text-[#2FB36F] mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2FB36F] animate-pulse" />
            {health?.overall_state ?? 'HEALTHY'}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">Subsystems Verified</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Active Workflows</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">
            {snapshot?.active_workflows ?? 0}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">Durable executions</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Blocked Work</div>
          <div className="text-2xl font-bold text-[#D6A83A] mt-1 font-mono">
            {snapshot?.blocked_workflows ?? 0}
          </div>
          <div className="text-[10px] text-[#D6A83A]/80 mt-1 font-mono">Financial barriers</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Recovering</div>
          <div className="text-2xl font-bold text-[#B0ADA5] mt-1 font-mono">
            {snapshot?.recovering_workflows ?? 0}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">Active self-healing</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Incidents</div>
          <div className="text-2xl font-bold text-[#D85C5C] mt-1 font-mono">
            {snapshot?.incident_count ?? incidents.length}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">Correlated groups</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Queue Depth</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">
            {queues ? Object.values(queues.queue_depths).reduce((a, b) => a + b, 0) : 0}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">8 Durable Queues</div>
        </div>

        <div className="p-4 rounded-lg bg-[#101010] border border-[#222222]">
          <div className="text-[11px] font-mono text-[#716F69] uppercase tracking-wider">Workers</div>
          <div className="text-2xl font-bold text-[#2FB36F] mt-1 font-mono">
            {workers.length} / {snapshot?.available_workers ?? 10}
          </div>
          <div className="text-[10px] text-[#716F69] mt-1 font-mono">Fenced capacity</div>
        </div>
      </div>

      {/* Primary Section Tabs */}
      <div className="flex border-b border-[#222222] gap-4 overflow-x-auto text-sm font-mono">
        {(['SYSTEM', 'WORKFLOWS', 'WORKERS', 'QUEUES', 'INCIDENTS', 'CAPACITY', 'HEALTH'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 border-b-2 font-semibold transition-colors uppercase tracking-wider ${
              activeTab === tab
                ? 'border-[#D6A83A] text-[#D6A83A]'
                : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: SYSTEM VIEW */}
      {activeTab === 'SYSTEM' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subsystem Readiness Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                  Authoritative Subsystem Truth vs Operational Read Projections
                </h3>
                <span className="text-xs font-mono text-[#716F69]">Strict separation (INV-121)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#B0ADA5]">Treasury State</span>
                    <span className="text-[#2FB36F] font-bold">{snapshot?.treasury_state ?? 'HEALTHY'}</span>
                  </div>
                  <div className="text-xs text-[#716F69]">Source: Authoritative Domain Engine</div>
                </div>

                <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#B0ADA5]">Liquidity Commitment</span>
                    <span className="text-[#F2F0EA] font-bold">{snapshot?.liquidity_state ?? 'AVAILABLE'}</span>
                  </div>
                  <div className="text-xs text-[#716F69]">Source: Ledger Reservations</div>
                </div>

                <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#B0ADA5]">Policy Hard Deny</span>
                    <span className="text-[#2FB36F] font-bold">{snapshot?.policy_state ?? 'ENFORCING'}</span>
                  </div>
                  <div className="text-xs text-[#716F69]">Source: Rust Deterministic Core</div>
                </div>

                <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#D6A83A]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#B0ADA5]">Arc & AgentVault Verification</span>
                    <span className="text-[#D6A83A] font-bold">{snapshot?.arc_state ?? 'NOT VERIFIED'}</span>
                  </div>
                  <div className="text-xs text-[#D6A83A] font-mono">INV-135: RPC != Vault Deployed</div>
                </div>
              </div>
            </div>

            {/* Universal "Why?" Inspector Panel (Section 36) */}
            <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                    Universal &quot;Why?&quot; Inspector (INV-136)
                  </h3>
                  <p className="text-xs text-[#B0ADA5] mt-0.5">
                    Query deterministic causal explanations for operational decisions without fabricating evidence.
                  </p>
                </div>
              </div>
              <form onSubmit={handleExplainEvent} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Event ID (e.g. evt_01, evt_block_44)"
                  value={inspectEventId}
                  onChange={(e) => setInspectEventId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-mono font-medium bg-[#181818] hover:bg-[#222222] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors"
                >
                  Inspect Why
                </button>
              </form>

              {explanation && (
                <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                    <span className="text-[#B0ADA5]">OPERATIONAL DECISION:</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40">
                      {explanation.decision}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#B0ADA5]">
                    <div>
                      <span className="text-[#716F69]">Current State: </span>
                      <span className="text-[#D6A83A]">{explanation.current_state}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69]">Trigger: </span>
                      <span className="text-[#F2F0EA]">{explanation.trigger}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Authoritative Evidence: </span>
                    <div className="text-[#B0ADA5] mt-1 p-2 rounded bg-[#101010] border border-[#222222]">
                      {explanation.evidence}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
                    <span className="text-[#716F69]">Financial Authority:</span>
                    <span className="text-[#2FB36F] font-bold">{explanation.financial_authority} (INV-121)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#716F69]">Next Action:</span>
                    <span className="text-[#F2F0EA]">{explanation.next_action}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Time Travel & Next Action Resolver */}
          <div className="space-y-6">
            {/* Deterministic "What Happens Next?" Engine (Section 37) */}
            <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
              <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
                &quot;What Happens Next?&quot; Engine (INV-122)
              </h3>
              <p className="text-xs text-[#B0ADA5]">
                Predicts operational scheduling transitions. Does not speculate on financial or on-chain settlement.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inspectingWorkflowId}
                  onChange={(e) => setInspectingWorkflowId(e.target.value)}
                  placeholder="Workflow ID"
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
                <button
                  onClick={() => handleGetNextAction(inspectingWorkflowId)}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-[#181818] hover:bg-[#222222] text-[#F2F0EA] border border-[#222222] transition-colors"
                >
                  Resolve
                </button>
              </div>

              {nextAction && (
                <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#B0ADA5]">Predicted Action:</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30">
                      {nextAction.action}
                    </span>
                  </div>
                  <div className="text-[#B0ADA5] text-[11px] leading-relaxed">
                    Reason: {nextAction.reason}
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#222222] text-[#716F69]">
                    <span>Delay: ~{nextAction.estimated_delay_seconds}s</span>
                    <span>Human Req: {nextAction.requires_human ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Time-Travel Debugger (Section 43) */}
            <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
              <h3 className="text-base font-bold text-[#F2F0EA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                Time-Travel Debugger (INV-130)
              </h3>
              <p className="text-xs text-[#B0ADA5]">
                Reconstruct historical operational state at timestamp T. Purely read-only; mutation is mathematically impossible.
              </p>
              <form onSubmit={handleTimeTravel} className="space-y-2">
                <input
                  type="text"
                  value={timeTravelInput}
                  onChange={(e) => setTimeTravelInput(e.target.value)}
                  placeholder="Timestamp (e.g. 2026-09-24T21:00:00Z)"
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
                />
                <button
                  type="submit"
                  disabled={timeTravelLoading}
                  className="w-full py-2 rounded-lg text-xs font-mono font-medium bg-[#181818] hover:bg-[#222222] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors disabled:opacity-50"
                >
                  {timeTravelLoading ? 'Reconstructing...' : 'Inspect Historical State'}
                </button>
              </form>

              {timeTravelState && (
                <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] font-mono text-xs space-y-2">
                  <div className="text-[#D6A83A] font-bold">STATE AT {timeTravelState.timestamp}</div>
                  <div className="text-[#B0ADA5] text-[11px]">Reconstructed From: {timeTravelState.reconstructed_from}</div>
                  <div className="text-[#B0ADA5] text-[11px]">Active Workflows: {timeTravelState.active_workflows}</div>
                  <div className="text-[#716F69] text-[10px] pt-1 border-t border-[#222222]">
                    Financial State: {timeTravelState.financial_state_frozen ? 'FROZEN / READ-ONLY' : 'UNLOCKED'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: QUEUES VIEW */}
      {activeTab === 'QUEUES' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#F2F0EA]">Durable Queues & Dead-Letter Isolation</h3>
                <p className="text-xs text-[#B0ADA5] mt-1">
                  8 categorized durable queues with priority sorting, visibility timeout leases, and strict dead-letter auditable routing (INV-126, INV-128).
                </p>
              </div>
              <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                TOTAL DEAD-LETTERS: {queues?.total_dead ?? 0}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {queues &&
                Object.entries(queues.queue_depths).map(([qName, depth]) => (
                  <div key={qName} className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                    <div className="text-xs font-mono text-[#716F69] uppercase">{qName} queue</div>
                    <div className="text-xl font-bold text-[#F2F0EA] font-mono">{depth}</div>
                    <div className="text-[10px] text-[#716F69] font-mono">Leased & Prioritized</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: WORKERS VIEW */}
      {activeTab === 'WORKERS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
            <h3 className="text-lg font-bold text-[#F2F0EA]">Fenced Autonomous Workers</h3>
            <p className="text-xs text-[#B0ADA5]">
              Separation of concerns: Workers perform authorized operations; supervisory OS decides scheduling; domain engine retains financial authority (INV-121, INV-127).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-[#B0ADA5]">
                <thead className="bg-[#0B0B0B] text-[#716F69] border-b border-[#222222]">
                  <tr>
                    <th className="p-3">Worker ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Capabilities</th>
                    <th className="p-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {workers.map((w) => (
                    <tr key={w.worker_id} className="hover:bg-[#141414]">
                      <td className="p-3 font-bold text-[#F2F0EA]">{w.worker_id}</td>
                      <td className="p-3 text-[#B0ADA5]">{w.worker_type}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30">
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#716F69]">{w.capabilities?.join(', ')}</td>
                      <td className="p-3 text-[#716F69]">{new Date(w.last_seen).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: INCIDENTS VIEW */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
            <h3 className="text-lg font-bold text-[#F2F0EA]">Correlated Operational Incidents</h3>
            <p className="text-xs text-[#B0ADA5]">
              Incident Correlation Engine groups cascading failures. Automatic mitigations are strictly bounded: never overriding financial controls.
            </p>
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.incident_id} className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#D85C5C]/15 text-[#D85C5C] border border-[#D85C5C]/30">
                        {inc.severity}
                      </span>
                      <span className="font-mono text-sm font-bold text-[#F2F0EA]">{inc.incident_id}</span>
                      <span className="text-xs text-[#716F69]">({inc.category})</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                      {inc.state}
                    </span>
                  </div>
                  <div className="text-xs text-[#B0ADA5]">{inc.root_cause}</div>
                  <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono text-[#716F69]">
                    <span>Workflows: {inc.affected_workflows?.join(', ') || 'none'}</span>
                    <span>Mitigations: {inc.mitigation_actions?.join(', ') || 'none'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: HEALTH VIEW */}
      {activeTab === 'HEALTH' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
            <h3 className="text-lg font-bold text-[#F2F0EA]">Deterministic Subsystem Health Probes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {health &&
                Object.entries(health.components).map(([k, comp]) => (
                  <div key={k} className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#F2F0EA]">{comp.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        comp.state === 'HEALTHY' ? 'bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30' : 'bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30'
                      }`}>
                        {comp.state}
                      </span>
                    </div>
                    <div className="text-xs text-[#716F69]">{comp.message}</div>
                    <div className="text-[10px] font-mono text-[#716F69]">
                      Probed: {new Date(comp.last_probe_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
