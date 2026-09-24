'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchMissionCommandCenter,
  MissionCommandCenterView,
  FALLBACK_MISSION_MCC,
} from '../../../../lib/api/control';

export default function MissionCommandCenterPage() {
  const params = useParams();
  const missionId = (params?.id as string) || 'msn_global_macro';

  const [mcc, setMcc] = useState<MissionCommandCenterView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>('task_02');

  useEffect(() => {
    loadMissionData();
  }, [missionId]);

  async function loadMissionData() {
    setLoading(true);
    try {
      const data = await fetchMissionCommandCenter(missionId, 'org_default');
      setMcc(data);
    } catch (err) {
      console.error('Failed to load mission view', err);
      setMcc(FALLBACK_MISSION_MCC);
    } finally {
      setLoading(false);
    }
  }

  const formatMicroUSDC = (baseUnits?: string) => {
    if (!baseUnits || baseUnits === 'UNAVAILABLE') return 'UNAVAILABLE';
    const num = Number(baseUnits) / 1000000;
    if (isNaN(num)) return baseUnits;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const activeNode = mcc?.task_graph.nodes.find((n) => n.task_id === selectedNode);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* HEADER & CRUMB */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold">MISSION COMMAND CENTER</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">STATUS:</span>
            <span className="px-2.5 py-1 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {mcc?.status || 'EXECUTING'}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* MISSION TITLE & OBJECTIVE */}
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500">MISSION ID: {mcc?.mission_id}</span>
            <span className="text-xs font-mono text-slate-400">
              Updated: {mcc?.updated_at ? new Date(mcc.updated_at).toLocaleTimeString() : 'LIVE'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
            {mcc?.title || 'Autonomous Global Macro & Crypto Research Mission'}
          </h1>
          <p className="text-sm text-slate-300">
            {mcc?.objective || 'Ingest real-time orderbooks, assess liquidity depth, and compile risk report'}
          </p>
        </div>

        {/* CURRENT & NEXT ACTION PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0e1626] border border-amber-500/30 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                CURRENT OPERATIONAL ACTION
              </h2>
            </div>
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 uppercase">Action:</span>
                <p className="text-white font-semibold mt-0.5">{mcc?.current_action?.action}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase">Why:</span>
                <p className="text-slate-300 mt-0.5">{mcc?.current_action?.why}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase">Evidence:</span>
                <p className="text-teal-400 truncate mt-0.5">{mcc?.current_action?.evidence}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0e1626] border border-blue-500/30 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h2 className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider">
                NEXT EXPECTED TRANSITION
              </h2>
            </div>
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 uppercase">Transition State:</span>
                <p className="text-blue-400 font-bold mt-0.5">{mcc?.next_expected_action}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase">Next Possible Contingency:</span>
                <p className="text-slate-300 mt-0.5">{mcc?.current_action?.next_possible_action}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase">Gating Rule:</span>
                <p className="text-emerald-400 mt-0.5">Automated SLA timeout trigger or milestone checksum match</p>
              </div>
            </div>
          </div>
        </div>

        {/* ECONOMIC EXPOSURE & CAPACITY GRID */}
        <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            MISSION ECONOMIC CAPACITY & EXPOSURE
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-500">TOTAL BUDGET</span>
              <div className="text-base font-bold text-white mt-1">
                {formatMicroUSDC(mcc?.budget_total)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-500">RESERVED (ENCUMBERED)</span>
              <div className="text-base font-bold text-amber-400 mt-1">
                {formatMicroUSDC(mcc?.budget_reserved)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-500">SETTLED (DISBURSED)</span>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {formatMicroUSDC(mcc?.budget_settled)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-500">REMAINING CAPACITY</span>
              <div className="text-base font-bold text-teal-400 mt-1">
                {formatMicroUSDC(mcc?.budget_remaining)}
              </div>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-slate-500">POTENTIAL EXPOSURE</span>
              <div className="text-base font-bold text-purple-400 mt-1">
                {formatMicroUSDC(mcc?.potential_exposure)}
              </div>
            </div>
          </div>
        </section>

        {/* TASK GRAPH & AGENT EXPLANATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TASK GRAPH DAG (7 cols) */}
          <section className="lg:col-span-7 bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  MISSION TASK GRAPH (DAG)
                </h2>
                <p className="text-xs text-slate-400">Click a node to inspect financial and verification rules</p>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Max Depth: {mcc?.task_graph.max_depth || 3}</span>
            </div>

            <div className="space-y-3">
              {mcc?.task_graph.nodes.map((node, idx) => (
                <div
                  key={node.task_id}
                  onClick={() => setSelectedNode(node.task_id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedNode === node.task_id
                      ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">
                      Node {idx + 1}: {node.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        node.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : node.status === 'RUNNING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                    <div>
                      Agent: <span className="text-slate-200">{node.agent_id}</span>
                    </div>
                    <div>
                      Reserved: <span className="text-amber-300">{formatMicroUSDC(node.cost_reserved)}</span>
                    </div>
                    <div>
                      Duration: <span className="text-teal-300">{node.duration_ms}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeNode && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
                <span className="text-amber-400 font-bold uppercase">Node Detail: {activeNode.task_id}</span>
                <div className="text-slate-300">Verification Rule: {activeNode.verification_rule}</div>
                <div className="text-slate-400">Settled Amount: {formatMicroUSDC(activeNode.cost_settled)}</div>
              </div>
            )}
          </section>

          {/* AGENT DECISION EXPLANATIONS (5 cols) */}
          <section className="lg:col-span-5 bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                AGENT SELECTION EXPLANATION
              </h2>
              <p className="text-xs text-slate-400">Why this agent was chosen and why alternatives were declined</p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {mcc?.selected_agents.map((agent) => (
                <div key={agent.agent_id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{agent.display_name}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      {(agent.verification_rate * 100).toFixed(1)}% VERIFIED
                    </span>
                  </div>

                  <div className="text-slate-400">
                    Capability: <span className="text-teal-300">{agent.capability}</span> | Price: <span className="text-amber-300">{formatMicroUSDC(agent.quoted_price)}</span>
                  </div>

                  <div className="p-2 bg-slate-950 border border-slate-800/80 rounded text-[11px] text-slate-300">
                    <span className="text-slate-500 block uppercase">Selection Reason:</span>
                    {agent.selection_reason}
                  </div>

                  {agent.rejected_alternatives && agent.rejected_alternatives.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">
                        Declined Counterparties:
                      </span>
                      {agent.rejected_alternatives.map((alt) => (
                        <div key={alt.agent_id} className="p-2 bg-slate-950/70 border border-slate-800/50 rounded text-[10px] space-y-0.5">
                          <div className="flex justify-between text-slate-300">
                            <span className="font-semibold">{alt.agent_id}</span>
                            <span className="text-slate-400">{formatMicroUSDC(alt.quoted_price)} ({alt.score_difference})</span>
                          </div>
                          <p className="text-slate-500">{alt.rejection_reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* POLICY CONSTITUTION & OBLIGATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <h2 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              GOVERNING POLICY (CONSTITUTION {mcc?.policy_summary.constitution_version})
            </h2>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
              <div className="text-slate-400">Policy Hash: <span className="text-slate-200">{mcc?.policy_summary.policy_hash}</span></div>
              <div className="text-slate-400">Max Spend / Task: <span className="text-amber-300">{formatMicroUSDC(mcc?.policy_summary.effective_rules.MaxPaymentPerTransaction)}</span></div>
              <div className="text-slate-400">Budget Ceiling: <span className="text-emerald-300">{formatMicroUSDC(mcc?.policy_summary.effective_rules.MissionBudgetCeiling)}</span></div>
              <div className="text-slate-400">Approval Threshold: <span className="text-purple-300">{formatMicroUSDC(mcc?.policy_summary.effective_rules.HumanApprovalThreshold)}</span></div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                {mcc?.policy_summary.explainability_notes}
              </div>
            </div>
          </section>

          <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <h2 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              CLEARINGHOUSE OBLIGATIONS ({mcc?.obligations.length || 0})
            </h2>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {mcc?.obligations.map((ob) => (
                <div key={ob.obligation_id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{ob.obligation_id}</div>
                    <div className="text-slate-400 text-[11px]">Payee: {ob.payee_agent_id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-300 font-bold">{formatMicroUSDC(ob.amount)}</div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-teal-300 border border-teal-500/20">
                      {ob.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
