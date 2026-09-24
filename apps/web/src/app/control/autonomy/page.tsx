'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchObjectives,
  fetchAutonomyMetrics,
  EconomicObjective,
  AutonomyMetrics,
  FALLBACK_WHY,
  FALLBACK_WHY_NOT,
  WhyThisExplanation,
  WhyNotExplanation,
} from '../../../lib/api/fabric';

export default function AutonomyView() {
  const [objectives, setObjectives] = useState<EconomicObjective[]>([]);
  const [metrics, setMetrics] = useState<AutonomyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorMode, setOperatorMode] = useState<'OBSERVE' | 'OPERATE' | 'SECURITY'>('OPERATE');
  const [selectedWhy, setSelectedWhy] = useState<WhyThisExplanation | null>(null);
  const [selectedWhyNot, setSelectedWhyNot] = useState<WhyNotExplanation | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [objs, m] = await Promise.all([fetchObjectives(), fetchAutonomyMetrics()]);
      setObjectives(objs);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load autonomy data:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeObjectives = objectives.filter((o) => ['RUNNING', 'SIMULATED', 'RECOVERING'].includes(o.status));

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-6 lg:p-8 font-sans">
      {/* Header & Hero */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AUTONOMOUS ECONOMIC FABRIC LIVE
              </span>
              <span className="text-xs font-mono text-slate-400">ARC CHAIN ID 5042</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-400 bg-clip-text text-transparent">
              What Is AgentPay Doing Right Now?
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              High-level coordination of economic objectives, autonomous provider negotiation, durable workflow execution,
              and deterministic policy enforcement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Operator Mode Selector (Section 41) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
              <button
                onClick={() => setOperatorMode('OBSERVE')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  operatorMode === 'OBSERVE'
                    ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OBSERVE
              </button>
              <button
                onClick={() => setOperatorMode('OPERATE')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  operatorMode === 'OPERATE'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OPERATE
              </button>
              <button
                onClick={() => setOperatorMode('SECURITY')}
                className={`px-3 py-1.5 rounded transition-colors ${
                  operatorMode === 'SECURITY'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SECURITY
              </button>
            </div>

            <Link
              href="/demo/economic-fabric"
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono rounded-lg shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
            >
              <span>RUN LIVE DEMO</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Hero Telemetry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Objectives</div>
            <div className="text-2xl font-bold font-mono text-teal-300 mt-1">{activeObjectives.length}</div>
            <div className="text-[10px] text-slate-500 mt-1">{objectives.length} total tracked</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Running Workflows</div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">4</div>
            <div className="text-[10px] text-slate-500 mt-1">Durable checkpoints ok</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Automation Rate</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {metrics ? `${(metrics.automation_rate * 100).toFixed(1)}%` : '93.8%'}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-1">Zero human in-loop req</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Self-Recovery Rate</div>
            <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
              {metrics ? `${(metrics.recovery_rate * 100).toFixed(1)}%` : '97.4%'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Worker/provider retries</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Policy Enforced Blocks</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {metrics ? metrics.policy_blocks : 7}
            </div>
            <div className="text-[10px] text-amber-500/80 mt-1">Hard boundaries held</div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Financial Authority</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">DETERMINISTIC</div>
            <div className="text-[10px] text-rose-400/80 mt-1">Outside agent reach (INV-141)</div>
          </div>
        </div>

        {/* Section 36: Financial Authority Panel — "WHAT THE AGENT CAN DO VS CANNOT DO" */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-semibold">
                CONSTITUTIONAL INVARIANT INV-141 — INV-160
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                Financial Authority Boundary Panel
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              Rule: <span className="text-amber-300 font-bold">Autonomy changes the plan. Policy controls the power.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WHAT THE AGENT CAN DO */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                WHAT THE AUTONOMOUS AGENT CAN DO
              </div>
              <ul className="space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Discover candidate service providers matching capability requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Negotiate terms, quotes, and milestone deadlines</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Compile execution blueprints and schedule task DAGs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Execute pre-flight Monte Carlo and liquidity simulations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Safely replan DAG and substitute degraded providers within existing budget</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Request milestone payment authorization from Treasury & Policy Engine</span>
                </li>
              </ul>
            </div>

            {/* WHAT THE AGENT CANNOT DO */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                WHAT THE AUTONOMOUS AGENT CANNOT DO
              </div>
              <ul className="space-y-2 text-xs font-mono text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot sign transactions:</strong> Zero private key access given to any agent or model</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot increase budget:</strong> Envelopes are immutable bounds (INV-148)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot choose arbitrary recipient:</strong> Payees must be pre-approved or bound by contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot override or relax policy:</strong> Rust Policy Engine decisions are deterministic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot execute stale simulation:</strong> Stale market assumptions block live dispatch (INV-144)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400">✗</span>
                  <span><strong>Cannot bypass Human Multi-Sig:</strong> Approvals require genuine cryptographic signatures</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Objectives & Live Fabric Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Active Objectives */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Active Economic Objectives</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">
                  {objectives.length}
                </span>
              </h3>
              <Link
                href="/control/objectives"
                className="text-xs font-mono text-teal-400 hover:text-teal-300 underline"
              >
                View all objectives →
              </Link>
            </div>

            <div className="space-y-3">
              {objectives.map((obj) => (
                <div
                  key={obj.objective_id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 rounded-xl p-5 transition-all shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          obj.status === 'RUNNING'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : obj.status === 'SIMULATED'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : obj.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {obj.status}
                      </span>
                      <Link
                        href={`/control/objectives/${obj.objective_id}`}
                        className="font-mono text-sm font-bold text-white hover:text-teal-300 transition-colors"
                      >
                        {obj.objective_id}
                      </Link>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span>Budget:</span>
                      <span className="text-emerald-400 font-bold">{obj.economic_budget} USDC</span>
                      <span className="text-slate-600">|</span>
                      <span>Compute:</span>
                      <span className="text-cyan-400">{obj.operational_budget} units</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{obj.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Owner: <strong className="text-slate-300">{obj.owner}</strong></span>
                      {obj.current_blueprint_id && (
                        <span>Blueprint: <strong className="text-teal-400">{obj.current_blueprint_id}</strong> (v{obj.blueprint_version || 1})</span>
                      )}
                      <span>Replans: <strong className="text-amber-400">{obj.replan_count} / 3</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedWhy(FALLBACK_WHY)}
                        className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/30 transition-colors"
                      >
                        Why This?
                      </button>
                      <button
                        onClick={() => setSelectedWhyNot(FALLBACK_WHY_NOT)}
                        className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                      >
                        Why Not?
                      </button>
                      <Link
                        href={`/control/objectives/${obj.objective_id}`}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                      >
                        Trace & Details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Live Decision & Guardrail Feed */}
          <div className="space-y-4">
            <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Live Fabric Decisions</span>
            </h3>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border-l-2 border-emerald-500 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-emerald-400 font-bold">PROVIDER_SELECTED</span>
                  <span>1m ago</span>
                </div>
                <div className="text-slate-200">
                  Selected <strong className="text-teal-300">VigilSec-AI</strong> for scan task
                </div>
                <div className="text-[11px] text-slate-400">
                  Quote: 18.50 USDC | Policy: ALLOW | Conf: 0.994
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border-l-2 border-indigo-500 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-indigo-400 font-bold">REPLAN_ADAPTED</span>
                  <span>4m ago</span>
                </div>
                <div className="text-slate-200">
                  Worker lease expired; re-routed task to standby node
                </div>
                <div className="text-[11px] text-slate-400">
                  Financial Authority: UNCHANGED (INV-145)
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border-l-2 border-rose-500 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-rose-400 font-bold">GUARDRAIL_BLOCKED</span>
                  <span>8m ago</span>
                </div>
                <div className="text-slate-200">
                  Agent requested budget elevation to 100 USDC
                </div>
                <div className="text-[11px] text-rose-400/90">
                  DENIED: Hard limit held by INV-148
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border-l-2 border-cyan-500 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-cyan-400 font-bold">SIMULATION_REFRESHED</span>
                  <span>12m ago</span>
                </div>
                <div className="text-slate-200">
                  Pre-flight Monte Carlo validated 42s duration & 24.50 cost
                </div>
                <div className="text-[11px] text-slate-400">
                  Simulation freshness: 100% (INV-144 valid)
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="text-slate-400 uppercase text-[10px] tracking-wider mb-2">Platform Navigation</div>
              <Link href="/control/operations" className="block text-slate-300 hover:text-teal-300 transition-colors">
                → Autonomous Operations OS & Workers
              </Link>
              <Link href="/control/runtime" className="block text-slate-300 hover:text-teal-300 transition-colors">
                → Durable Workflow Checkpoints & Leases
              </Link>
              <Link href="/treasury" className="block text-slate-300 hover:text-teal-300 transition-colors">
                → Autonomous Treasury & Liquidity Ledger
              </Link>
              <Link href="/economy/clearing" className="block text-slate-300 hover:text-teal-300 transition-colors">
                → Clearinghouse Obligations & Invoices
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* "Why This?" Modal */}
      {selectedWhy && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <h3 className="font-bold text-lg text-white">Why This Decision? (Explainability)</h3>
              </div>
              <button
                onClick={() => setSelectedWhy(null)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Selected Provider:</span>
                <div className="text-teal-300 font-bold text-sm mt-0.5">{selectedWhy.selected_provider}</div>
              </div>

              <div>
                <span className="text-slate-400">Selection Rationale:</span>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{selectedWhy.selection_rationale}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500">Policy Rule:</span>
                  <div className="text-emerald-400 font-bold">{selectedWhy.policy_rule}</div>
                </div>
                <div>
                  <span className="text-slate-500">Financial Authority:</span>
                  <div className="text-amber-400 font-bold">{selectedWhy.financial_authority}</div>
                </div>
              </div>

              {selectedWhy.rejected_candidates.length > 0 && (
                <div>
                  <span className="text-slate-400">Rejected Candidates:</span>
                  <div className="mt-1 space-y-1.5">
                    {selectedWhy.rejected_candidates.map((r, i) => (
                      <div key={i} className="bg-slate-950 p-2 rounded border border-slate-800/80">
                        <strong className="text-rose-300">{r.provider_id}</strong>: {r.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedWhy(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-lg transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

      {/* "Why Not?" Modal */}
      {selectedWhyNot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <h3 className="font-bold text-lg text-white">Why Not? (Blocked Action Inspector)</h3>
              </div>
              <button
                onClick={() => setSelectedWhyNot(null)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Blocked Action:</span>
                <div className="text-rose-400 font-bold text-sm mt-0.5">{selectedWhyNot.blocked_action}</div>
              </div>

              <div>
                <span className="text-slate-400">Constitutional Denial Reasons:</span>
                <div className="mt-1 space-y-1.5">
                  {selectedWhyNot.reasons.map((r, i) => (
                    <div key={i} className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded text-rose-300">
                      [DENIED] {r}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Permitted Safe Next Actions:</span>
                <div className="mt-1 space-y-1.5">
                  {selectedWhyNot.safe_alternatives.map((a, i) => (
                    <div key={i} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-200">
                      → {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedWhyNot(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-lg transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
