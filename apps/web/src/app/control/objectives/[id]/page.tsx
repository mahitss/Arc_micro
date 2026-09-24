'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchObjective,
  fetchObjectiveTrace,
  fetchObjectiveWhy,
  fetchObjectiveWhyNot,
  fetchObjectiveState,
  planObjective,
  simulateObjective,
  startObjective,
  pauseObjective,
  resumeObjective,
  replanObjective,
  cancelObjective,
  EconomicObjective,
  UnifiedEconomicTrace,
  WhyThisExplanation,
  WhyNotExplanation,
} from '../../../../lib/api/fabric';

export default function ObjectiveDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : 'obj_prod_audit_01';

  const [objective, setObjective] = useState<EconomicObjective | null>(null);
  const [trace, setTrace] = useState<UnifiedEconomicTrace | null>(null);
  const [why, setWhy] = useState<WhyThisExplanation | null>(null);
  const [whyNot, setWhyNot] = useState<WhyNotExplanation | null>(null);
  const [syncState, setSyncState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Replan modal
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [replanReason, setReplanReason] = useState('Provider latency exceeded SLA constraint');
  const [isDryRun, setIsDryRun] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function loadData() {
    try {
      const [obj, tr, w, wn, st] = await Promise.all([
        fetchObjective(id),
        fetchObjectiveTrace(id),
        fetchObjectiveWhy(id),
        fetchObjectiveWhyNot(id),
        fetchObjectiveState(id),
      ]);
      setObjective(obj);
      setTrace(tr);
      setWhy(w);
      setWhyNot(wn);
      setSyncState(st);
    } catch (err) {
      console.error('Error loading objective details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'plan' | 'simulate' | 'start' | 'pause' | 'resume' | 'cancel') {
    setActionFeedback(`Executing ${action}...`);
    try {
      if (action === 'plan') await planObjective(id);
      else if (action === 'simulate') await simulateObjective(id);
      else if (action === 'start') await startObjective(id);
      else if (action === 'pause') await pauseObjective(id);
      else if (action === 'resume') await resumeObjective(id);
      else if (action === 'cancel') await cancelObjective(id);

      setActionFeedback(`Successfully performed ${action}`);
      loadData();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    }
  }

  async function handleReplanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionFeedback(`Submitting bounded replan (dry_run=${isDryRun})...`);
    try {
      const res = await replanObjective(id, replanReason, isDryRun);
      setShowReplanModal(false);
      setActionFeedback(isDryRun ? `Dry-run evaluated: ${JSON.stringify(res.dry_run?.financial_impact || 'No change')}` : `Plan adapted to version ${res.version || 2}`);
      loadData();
    } catch (err: any) {
      setActionFeedback(`Replan rejected: ${err.message}`);
    }
  }

  if (loading && !objective) {
    return (
      <div className="min-h-screen bg-[#060911] text-slate-100 p-8 font-mono flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
          <span>Loading Economic Fabric Objective...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Link href="/control/objectives" className="hover:text-teal-300">
              ← Economic Objectives
            </Link>
            <span>/</span>
            <span className="text-white font-bold">{id}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">Chain: <strong className="text-cyan-400">Arc (5042)</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Security Gate: <strong className="text-emerald-400">ACTIVE</strong></span>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs font-mono text-teal-300">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-teal-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Header Hero Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-xs font-mono px-3 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    objective?.status === 'RUNNING'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : objective?.status === 'SIMULATED'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {objective?.status}
                </span>
                <span className="text-xs font-mono text-slate-400">Tenant: {objective?.tenant_id}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">{objective?.objective_id}</h1>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {objective?.description}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {objective?.status === 'DRAFT' && (
                <button
                  onClick={() => handleAction('plan')}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-colors"
                >
                  Compile Blueprint
                </button>
              )}
              {['PLANNED', 'DRAFT'].includes(objective?.status || '') && (
                <button
                  onClick={() => handleAction('simulate')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
                >
                  Simulate
                </button>
              )}
              {['SIMULATED', 'PLANNED'].includes(objective?.status || '') && (
                <button
                  onClick={() => handleAction('start')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                >
                  Start Execution →
                </button>
              )}
              {objective?.status === 'RUNNING' && (
                <>
                  <button
                    onClick={() => setShowReplanModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
                  >
                    Replan (v{(objective?.blueprint_version || 1) + 1})
                  </button>
                  <button
                    onClick={() => handleAction('pause')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                  >
                    Pause
                  </button>
                </>
              )}
              {objective?.status === 'WAITING' && (
                <button
                  onClick={() => handleAction('resume')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
                >
                  Resume
                </button>
              )}
            </div>
          </div>

          {/* Core Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Economic Budget</span>
              <strong className="text-emerald-400 text-sm">{objective?.economic_budget} USDC</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Compute Slots</span>
              <strong className="text-cyan-400 text-sm">{objective?.operational_budget} units</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Risk Class</span>
              <strong className="text-amber-400 text-sm">{objective?.risk_tolerance}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Blueprint Version</span>
              <strong className="text-teal-300 text-sm">v{objective?.blueprint_version || 1}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Replans Used</span>
              <strong className="text-indigo-400 text-sm">{objective?.replan_count || 0} / 3 max</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Financial Authority</span>
              <strong className="text-rose-400 text-xs font-bold">RESERVED (INV-141)</strong>
            </div>
          </div>
        </div>

        {/* Section 22: High-Level Fabric State vs Authoritative Financial State */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              State Layer Synchronization Matrix (Section 22 & INV-152)
            </span>
            <span className="text-slate-400 text-[11px]">Fabric State cannot overwrite Financial Truth</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Fabric Objective State</span>
              <strong className="text-teal-300 text-sm mt-0.5 block">{objective?.status}</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Source: Fabric Database</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Durable Workflow State</span>
              <strong className="text-indigo-300 text-sm mt-0.5 block">{syncState?.workflow_status || 'RUNNING'}</strong>
              <span className="text-[10px] text-slate-500 mt-1 block">Source: Durable Checkpoints</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/20">
              <span className="text-slate-500 block text-[10px]">Authoritative Financial State</span>
              <strong className="text-emerald-400 text-sm mt-0.5 block">{syncState?.financial_status || 'RESERVED'}</strong>
              <span className="text-[10px] text-emerald-500/80 mt-1 block">Source: Treasury & Clearinghouse</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Arc On-Chain Verification</span>
              <strong className="text-cyan-400 text-sm mt-0.5 block">{syncState?.arc_settlement_status || 'CONFIRMED'}</strong>
              <span className="text-[10px] text-cyan-500/80 mt-1 block">Source: Arc Blockchain (5042)</span>
            </div>
          </div>
        </div>

        {/* Two Col Layout: Explainability (Why This / Why Not) & Unified Trace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Col: Explainability */}
          <div className="space-y-6">
            {/* Why This Panel (Section 38) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-teal-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  &quot;Why This?&quot; Provider Selection Rationale
                </span>
                <span className="text-[10px] text-slate-400">Section 38</span>
              </div>

              <div>
                <span className="text-slate-500">Selected Provider:</span>
                <div className="text-white font-bold text-sm mt-0.5">{why?.selected_provider}</div>
              </div>

              <div>
                <span className="text-slate-500">Selection Criteria Match:</span>
                <p className="text-slate-300 mt-0.5 font-sans leading-relaxed">{why?.selection_rationale}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-500">Policy Evaluation:</span>
                  <div className="text-emerald-400 font-bold">{why?.policy_decision} ({why?.policy_rule})</div>
                </div>
                <div>
                  <span className="text-slate-500">Approved Budget:</span>
                  <div className="text-teal-300 font-bold">{why?.budget_approved}</div>
                </div>
              </div>

              {why?.rejected_candidates && why.rejected_candidates.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Rejected Candidates:</span>
                  <div className="space-y-1.5">
                    {why.rejected_candidates.map((c, i) => (
                      <div key={i} className="bg-slate-950 p-2 rounded border border-slate-800 text-[11px]">
                        <strong className="text-rose-300">{c.provider_id}</strong>: {c.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Why Not Panel (Section 37) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  &quot;Why Not?&quot; Blocked Actions & Guardrails
                </span>
                <span className="text-[10px] text-slate-400">Section 37</span>
              </div>

              <div>
                <span className="text-slate-500">Blocked Forbidden Action:</span>
                <div className="text-rose-300 font-bold text-sm mt-0.5">{whyNot?.blocked_action}</div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Denial Invariants Enforced:</span>
                <div className="space-y-1.5">
                  {whyNot?.reasons.map((r, i) => (
                    <div key={i} className="bg-rose-950/20 border border-rose-500/30 p-2 rounded text-rose-300 text-[11px]">
                      [DENIED] {r}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Permitted Safe Alternatives:</span>
                <div className="space-y-1">
                  {whyNot?.safe_alternatives.map((a, i) => (
                    <div key={i} className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300 text-[11px]">
                      → {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Section 20 Unified Economic Trace */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Unified Economic Trace (18-Stage Causality)
              </span>
              <span className="text-[10px] text-slate-400">Section 20</span>
            </div>

            <p className="text-slate-400 font-sans text-xs">
              Every stage from human objective to Arc settlement to economic learning is cryptographically linked with causation and correlation IDs.
            </p>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {trace?.nodes.map((node, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <strong className="text-white text-xs">{node.stage}</strong>
                      <span className="text-[10px] text-slate-500 font-sans">({node.source_of_truth})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 ml-7">
                      ID: <span className="text-slate-200">{node.id}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        node.status.includes('CONFIRMED') || node.status === 'ALLOW' || node.status === 'SUCCEEDED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : node.status === 'RUNNING' || node.status === 'ACTIVE'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {node.status}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      {new Date(node.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controlled Replan Modal (Sections 11 & 43) */}
      {showReplanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReplanSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white font-sans">Controlled Replan Engine</h3>
              <button
                type="button"
                onClick={() => setShowReplanModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Replan Reason (Audited)</label>
              <textarea
                value={replanReason}
                onChange={(e) => setReplanReason(e.target.value)}
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dryRunCheck"
                  checked={isDryRun}
                  onChange={(e) => setIsDryRun(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
                />
                <label htmlFor="dryRunCheck" className="text-slate-300 cursor-pointer">
                  --dry-run (Evaluate delta without mutating production blueprint)
                </label>
              </div>
              <div className="text-[10px] text-amber-400/90">
                Notice: Replanning can substitute degraded providers or adapt tasks, but can NEVER increase budget or relax policy (INV-145/148).
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReplanModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg transition-all"
              >
                {isDryRun ? 'Evaluate Dry-Run' : 'Execute Replan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
