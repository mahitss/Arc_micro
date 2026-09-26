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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24">
      {/* HEADER & CRUMB */}
      <section className="bg-[#080808] border-b border-[#222222] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A] font-bold">MISSION COMMAND CENTER</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[#716F69]">STATUS:</span>
            <span className="px-2.5 py-1 rounded font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
              {mcc?.status || 'EXECUTING'}
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* MISSION TITLE & OBJECTIVE */}
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#716F69]">MISSION ID: {mcc?.mission_id}</span>
            <span className="text-xs font-mono text-[#716F69]">
              Updated: {mcc?.updated_at ? new Date(mcc.updated_at).toLocaleTimeString() : 'LIVE'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F2F0EA] font-mono">
            {mcc?.title || 'Autonomous Global Macro & Crypto Research Mission'}
          </h1>
          <p className="text-sm text-[#B0ADA5]">
            {mcc?.objective || 'Ingest real-time orderbooks, assess liquidity depth, and compile risk report'}
          </p>
        </div>

        {/* CURRENT & NEXT ACTION PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-ping" />
              <h2 className="text-xs font-mono font-bold text-[#D6A83A] uppercase tracking-wider">
                CURRENT OPERATIONAL ACTION
              </h2>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 text-xs font-mono">
              <div>
                <span className="text-[#716F69] uppercase">Action:</span>
                <p className="text-[#F2F0EA] font-semibold mt-0.5">{mcc?.current_action?.action}</p>
              </div>
              <div>
                <span className="text-[#716F69] uppercase">Why:</span>
                <p className="text-[#B0ADA5] mt-0.5">{mcc?.current_action?.why}</p>
              </div>
              <div>
                <span className="text-[#716F69] uppercase">Evidence:</span>
                <p className="text-[#B0ADA5] truncate mt-0.5">{mcc?.current_action?.evidence}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#716F69]" />
              <h2 className="text-xs font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
                NEXT EXPECTED TRANSITION
              </h2>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 text-xs font-mono">
              <div>
                <span className="text-[#716F69] uppercase">Transition State:</span>
                <p className="text-[#F2F0EA] font-bold mt-0.5">{mcc?.next_expected_action}</p>
              </div>
              <div>
                <span className="text-[#716F69] uppercase">Next Possible Contingency:</span>
                <p className="text-[#B0ADA5] mt-0.5">{mcc?.current_action?.next_possible_action}</p>
              </div>
              <div>
                <span className="text-[#716F69] uppercase">Gating Rule:</span>
                <p className="text-[#2FB36F] mt-0.5">Automated SLA timeout trigger or milestone checksum match</p>
              </div>
            </div>
          </div>
        </div>

        {/* ECONOMIC EXPOSURE & CAPACITY GRID */}
        <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-mono font-bold text-[#716F69] uppercase tracking-wider">
            MISSION ECONOMIC CAPACITY & EXPOSURE
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
              <span className="text-[#716F69]">TOTAL BUDGET</span>
              <div className="text-base font-bold text-[#F2F0EA] mt-1">
                {formatMicroUSDC(mcc?.budget_total)}
              </div>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
              <span className="text-[#716F69]">RESERVED (ENCUMBERED)</span>
              <div className="text-base font-bold text-[#D6A83A] mt-1">
                {formatMicroUSDC(mcc?.budget_reserved)}
              </div>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
              <span className="text-[#716F69]">SETTLED (DISBURSED)</span>
              <div className="text-base font-bold text-[#2FB36F] mt-1">
                {formatMicroUSDC(mcc?.budget_settled)}
              </div>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
              <span className="text-[#716F69]">REMAINING CAPACITY</span>
              <div className="text-base font-bold text-[#F2F0EA] mt-1">
                {formatMicroUSDC(mcc?.budget_remaining)}
              </div>
            </div>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg">
              <span className="text-[#716F69]">POTENTIAL EXPOSURE</span>
              <div className="text-base font-bold text-[#F2F0EA] mt-1">
                {formatMicroUSDC(mcc?.potential_exposure)}
              </div>
            </div>
          </div>
        </section>

        {/* TASK GRAPH & AGENT EXPLANATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TASK GRAPH DAG (7 cols) */}
          <section className="lg:col-span-7 bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#222222] pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                  MISSION TASK GRAPH (DAG)
                </h2>
                <p className="text-xs text-[#B0ADA5]">Click a node to inspect financial and verification rules</p>
              </div>
              <span className="text-[10px] font-mono text-[#716F69]">Max Depth: {mcc?.task_graph.max_depth || 3}</span>
            </div>

            <div className="space-y-3">
              {mcc?.task_graph.nodes.map((node, idx) => (
                <div
                  key={node.task_id}
                  onClick={() => setSelectedNode(node.task_id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedNode === node.task_id
                      ? 'bg-[#141414] border-[#D6A83A]'
                      : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#F2F0EA]">
                      Node {idx + 1}: {node.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        node.status === 'COMPLETED'
                          ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/20'
                          : node.status === 'RUNNING'
                          ? 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/20'
                          : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#222222] text-[11px] font-mono text-[#716F69]">
                    <div>
                      Agent: <span className="text-[#F2F0EA]">{node.agent_id}</span>
                    </div>
                    <div>
                      Reserved: <span className="text-[#D6A83A]">{formatMicroUSDC(node.cost_reserved)}</span>
                    </div>
                    <div>
                      Duration: <span className="text-[#B0ADA5]">{node.duration_ms}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {activeNode && (
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg text-xs font-mono space-y-1">
                <span className="text-[#D6A83A] font-bold uppercase">Node Detail: {activeNode.task_id}</span>
                <div className="text-[#B0ADA5]">Verification Rule: {activeNode.verification_rule}</div>
                <div className="text-[#716F69]">Settled Amount: {formatMicroUSDC(activeNode.cost_settled)}</div>
              </div>
            )}
          </section>

          {/* AGENT DECISION EXPLANATIONS (5 cols) */}
          <section className="lg:col-span-5 bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#222222] pb-3">
              <h2 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                AGENT SELECTION EXPLANATION
              </h2>
              <p className="text-xs text-[#B0ADA5]">Why this agent was chosen and why alternatives were declined</p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {mcc?.selected_agents.map((agent) => (
                <div key={agent.agent_id} className="p-3.5 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F2F0EA] text-sm">{agent.display_name}</span>
                    <span className="px-2 py-0.5 rounded bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/20 text-[10px]">
                      {(agent.verification_rate * 100).toFixed(1)}% VERIFIED
                    </span>
                  </div>

                  <div className="text-[#716F69]">
                    Capability: <span className="text-[#B0ADA5]">{agent.capability}</span> | Price: <span className="text-[#D6A83A]">{formatMicroUSDC(agent.quoted_price)}</span>
                  </div>

                  <div className="p-2 bg-[#141414] border border-[#222222] rounded text-[11px] text-[#B0ADA5]">
                    <span className="text-[#716F69] block uppercase">Selection Reason:</span>
                    {agent.selection_reason}
                  </div>

                  {agent.rejected_alternatives && agent.rejected_alternatives.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase text-[#716F69] font-bold block">
                        Declined Counterparties:
                      </span>
                      {agent.rejected_alternatives.map((alt) => (
                        <div key={alt.agent_id} className="p-2 bg-[#141414] border border-[#222222] rounded text-[10px] space-y-0.5">
                          <div className="flex justify-between text-[#B0ADA5]">
                            <span className="font-semibold text-[#F2F0EA]">{alt.agent_id}</span>
                            <span className="text-[#716F69]">{formatMicroUSDC(alt.quoted_price)} ({alt.score_difference})</span>
                          </div>
                          <p className="text-[#716F69]">{alt.rejection_reason}</p>
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
          <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3 font-mono text-xs">
            <h2 className="font-bold text-[#F2F0EA] uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#716F69]" />
              GOVERNING POLICY (CONSTITUTION {mcc?.policy_summary.constitution_version})
            </h2>
            <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-1.5">
              <div className="text-[#716F69]">Policy Hash: <span className="text-[#F2F0EA]">{mcc?.policy_summary.policy_hash}</span></div>
              <div className="text-[#716F69]">Max Spend / Task: <span className="text-[#D6A83A]">{formatMicroUSDC(mcc?.policy_summary.effective_rules.MaxPaymentPerTransaction)}</span></div>
              <div className="text-[#716F69]">Budget Ceiling: <span className="text-[#2FB36F]">{formatMicroUSDC(mcc?.policy_summary.effective_rules.MissionBudgetCeiling)}</span></div>
              <div className="text-[#716F69]">Approval Threshold: <span className="text-[#F2F0EA]">{formatMicroUSDC(mcc?.policy_summary.effective_rules.HumanApprovalThreshold)}</span></div>
              <div className="pt-2 border-t border-[#222222] text-[11px] text-[#50504C]">
                {mcc?.policy_summary.explainability_notes}
              </div>
            </div>
          </section>

          <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3 font-mono text-xs">
            <h2 className="font-bold text-[#F2F0EA] uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
              CLEARINGHOUSE OBLIGATIONS ({mcc?.obligations.length || 0})
            </h2>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {mcc?.obligations.map((ob) => (
                <div key={ob.obligation_id} className="p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#F2F0EA]">{ob.obligation_id}</div>
                    <div className="text-[#716F69] text-[11px]">Payee: {ob.payee_agent_id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#D6A83A] font-bold">{formatMicroUSDC(ob.amount)}</div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#141414] text-[#B0ADA5] border border-[#222222]">
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
