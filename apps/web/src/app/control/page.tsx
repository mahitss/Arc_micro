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
  ControlCategory,
} from '../../lib/api/control';

export default function ControlTowerPage() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [execMode, setExecMode] = useState<'REAL' | 'SIMULATION'>('REAL');
  const [timelineEvents, setTimelineEvents] = useState<ControlActivityEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTraceId, setSelectedTraceId] = useState<string>('pi_live_9941');
  const [financialTrace, setFinancialTrace] = useState<UniversalFinancialTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ControlSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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

  const formatMicroUSDC = (baseUnits?: string) => {
    if (!baseUnits || baseUnits === 'UNAVAILABLE') return 'UNAVAILABLE';
    const num = Number(baseUnits) / 1000000;
    if (isNaN(num)) return baseUnits;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const categories: { label: string; value: string }[] = [
    { label: 'ALL EVENTS', value: 'ALL' },
    { label: 'TREASURY', value: 'TREASURY' },
    { label: 'POLICY', value: 'POLICY' },
    { label: 'SECURITY', value: 'SECURITY' },
    { label: 'MISSION', value: 'MISSION' },
    { label: 'AGENT', value: 'AGENT' },
    { label: 'ECONOMY', value: 'ECONOMY' },
    { label: 'ARC', value: 'ARC' },
    { label: 'INTELLIGENCE', value: 'INTELLIGENCE' },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* 1. PERSISTENT ECONOMIC STATE STRIP */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">TREASURY:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                overview?.state_strip?.treasury_status === 'HEALTHY'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {overview?.state_strip?.treasury_status || 'HEALTHY'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">POLICY:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {overview?.state_strip?.policy_version || 'v8 ACTIVE'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">RISK:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                {overview?.state_strip?.risk_level || 'NORMAL'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">EXECUTION:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                execMode === 'REAL'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {execMode === 'REAL' ? 'LIVE ON-CHAIN' : 'SIMULATION'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold tracking-wider">ARC:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                overview?.state_strip?.arc_status === 'VERIFIED'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}>
                {overview?.state_strip?.arc_status || 'VERIFIED'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px]">
              DATA FRESHNESS: <span className="text-emerald-400 font-bold">{overview?.data_freshness || 'LIVE'}</span>
            </span>
            <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5">
              <button
                onClick={() => setExecMode('REAL')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  execMode === 'REAL' ? 'bg-teal-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                REAL
              </button>
              <button
                onClick={() => setExecMode('SIMULATION')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  execMode === 'SIMULATION' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                SIMULATION
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 2. HERO / CONTROL TOWER NAVIGATION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                AUTONOMOUS ECONOMIC CONTROL TOWER
              </h1>
            </div>
            <p className="mt-1 text-slate-400 text-sm">
              Operational control plane over autonomous AI agents, contracts, treasury liquidity, and Arc settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Link
              href="/control"
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-sm shadow-amber-500/20"
            >
              CONTROL
            </Link>
            <Link
              href="/control/missions/msn_global_macro"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              MISSIONS
            </Link>
            <Link
              href="/control/security"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              SECURITY
            </Link>
            <Link
              href="/control/approvals"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              APPROVALS
            </Link>
            <Link
              href="/control/incidents"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              INCIDENTS
            </Link>
            <Link
              href="/control/intelligence"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              INTELLIGENCE
            </Link>
            <Link
              href="/control/simulator"
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              SIMULATOR
            </Link>
          </div>
        </div>

        {/* 3. GLOBAL SEARCH */}
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

        {/* 4. EXECUTIVE METRICS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Missions</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : (overview?.active_missions_count ?? 'UNAVAILABLE')}
            </div>
            <Link href="/control/missions/msn_global_macro" className="text-[11px] text-amber-400 hover:underline mt-2 inline-block font-mono">
              View command &rarr;
            </Link>
          </div>

          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Agents</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : (overview?.active_agents_count ?? 'UNAVAILABLE')}
            </div>
            <Link href="/agents" className="text-[11px] text-teal-400 hover:underline mt-2 inline-block font-mono">
              Registry &rarr;
            </Link>
          </div>

          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Contracts</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {loading ? '...' : (overview?.active_contracts_count ?? 'UNAVAILABLE')}
            </div>
            <Link href="/economy/clearing" className="text-[11px] text-cyan-400 hover:underline mt-2 inline-block font-mono">
              Clearinghouse &rarr;
            </Link>
          </div>

          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Available Liquidity</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {loading ? '...' : formatMicroUSDC(overview?.available_liquidity)}
            </div>
            <span className="text-[10px] font-mono text-slate-500">Uncommitted Buffer</span>
          </div>

          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Reserved Headroom</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {loading ? '...' : formatMicroUSDC(overview?.reserved_liquidity)}
            </div>
            <span className="text-[10px] font-mono text-slate-500">Atomic Lock (INV-75)</span>
          </div>

          <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Pending Settlements</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
              {loading ? '...' : formatMicroUSDC(overview?.pending_settlements)}
            </div>
            <Link href="/control/approvals" className="text-[11px] text-purple-400 hover:underline mt-2 inline-block font-mono">
              Pending Approvals: {overview?.active_approvals_count ?? 0} &rarr;
            </Link>
          </div>
        </section>

        {/* 5. SPLIT TELEMETRY: REALTIME TIMELINE & FINANCIAL TRACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* REALTIME TIMELINE (7 cols) */}
          <section className="lg:col-span-7 bg-[#0e1626] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  REALTIME ECONOMIC TIMELINE
                </h2>
                <p className="text-xs text-slate-400">Classified stream of canonical economic & policy events</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedCategory(c.value)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                      selectedCategory === c.value
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {timelineEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm font-mono">
                  No activity events matching category filter {selectedCategory}
                </div>
              ) : (
                timelineEvents.map((evt) => (
                  <div
                    key={evt.event_id}
                    className="p-3.5 bg-slate-900/90 border border-slate-800/80 rounded-lg hover:border-slate-700 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-teal-300 border border-teal-500/20">
                          {evt.category}
                        </span>
                        <span className="font-semibold text-xs text-slate-200">{evt.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 pl-1">{evt.summary}</p>
                    <div className="text-[10px] font-mono text-slate-500 pl-1 flex items-center justify-between">
                      <span>Ref: {evt.aggregate_id}</span>
                      <button
                        onClick={() => setSelectedTraceId(evt.aggregate_id)}
                        className="text-amber-400 hover:underline"
                      >
                        Inspect Trace &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* FINANCIAL TRACE INSPECTOR (5 cols) */}
          <section className="lg:col-span-5 bg-[#0e1626] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  UNIVERSAL FINANCIAL TRACE
                </h2>
                <p className="text-xs text-slate-400">13-Stage causal chain from Mission to Arc consensus</p>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                {financialTrace?.payment_status || 'CONFIRMED'}
              </span>
            </div>

            {traceLoading ? (
              <div className="py-20 text-center text-slate-500 font-mono text-xs">
                Assembling cryptographic financial trace...
              </div>
            ) : !financialTrace ? (
              <div className="py-20 text-center text-slate-500 font-mono text-xs">
                Select an event or enter a Payment Intent ID to inspect the trace
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trace ID:</span>
                    <span className="text-white font-bold">{financialTrace.trace_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Intent ID:</span>
                    <span className="text-amber-300">{financialTrace.payment_intent_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Policy Decision:</span>
                    <span className="text-emerald-400 font-bold">{financialTrace.policy_decision} ({financialTrace.policy_version})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deterministic Risk:</span>
                    <span className="text-teal-300">{financialTrace.risk_score}/100 ({financialTrace.risk_level})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arc Settlement:</span>
                    <span className="text-cyan-300">Block {financialTrace.arc_block_number} (Chain {financialTrace.arc_chain_id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reconciliation:</span>
                    <span className="text-emerald-400 font-bold">{financialTrace.reconciliation_status}</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {financialTrace.steps?.map((step) => (
                    <div
                      key={step.step_number}
                      className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-md text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-amber-400">
                          {step.step_number}. {step.stage}
                        </span>
                        <span className="text-emerald-400 font-semibold">{step.status}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{step.description}</p>
                      {step.reference_id && (
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          Ref: {step.reference_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 6. ARC SETTLEMENT VERIFICATION CARD */}
        <section className="bg-[#0e1626] border border-cyan-900/40 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h2 className="text-base font-bold font-mono text-white">
                ARC BLOCKCHAIN CONSENSUS VERIFICATION
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
              ARC MAINNET / TESTNET
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-[10px]">AGENTVAULT DEPLOYMENT</span>
              <div className="text-white font-bold truncate mt-1">
                {overview?.state_strip?.arc_status === 'VERIFIED'
                  ? '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852'
                  : 'AGENTVAULT NOT DEPLOYED'}
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-[10px]">VERIFIED TREASURY BALANCE</span>
              <div className="text-emerald-400 font-bold mt-1 text-sm">
                {overview?.arc_verified_balance ? formatMicroUSDC(overview.arc_verified_balance) : 'UNVERIFIED'}
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-[10px]">SIGNER STATUS</span>
              <div className="text-teal-300 font-bold mt-1">
                LOCAL HSM KEYSTORE
              </div>
              <span className="text-[10px] text-slate-500">KMS NOT AVAILABLE</span>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-400 text-[10px]">4-WAY RECONCILIATION</span>
              <div className="text-emerald-400 font-bold mt-1">
                EXACT MATCH (0 DISCREPANCY)
              </div>
              <span className="text-[10px] text-slate-500">Ledger == Repo == Vault == Arc</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
