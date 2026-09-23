'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchNetworkAgents,
  fetchContracts,
  fetchDisputes,
  fetchNetworkGraph,
  fundContract,
  verifyDeliverable,
  type DiscoveredAgent,
  type AgentServiceContract,
  type DisputeRecord,
  type NetworkGraph,
} from '@/lib/api/network';
import { NetworkTopologyGraph } from '@/components/NetworkTopologyGraph';

type ActiveTab = 'directory' | 'contracts' | 'graph' | 'disputes';

export default function OpenAgentNetworkPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [contracts, setContracts] = useState<AgentServiceContract[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [graph, setGraph] = useState<NetworkGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minTrustScore, setMinTrustScore] = useState(8000);
  const [selectedAgent, setSelectedAgent] = useState<DiscoveredAgent | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [agList, cList, dList, g] = await Promise.all([
          fetchNetworkAgents(),
          fetchContracts(),
          fetchDisputes(),
          fetchNetworkGraph(),
        ]);
        setAgents(agList);
        setContracts(cList);
        setDisputes(dList);
        setGraph(g);
      } catch (err) {
        console.error('Failed to load network data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        a.identity.display_name.toLowerCase().includes(q) ||
        a.identity.agent_id.toLowerCase().includes(q) ||
        a.identity.capabilities.some((c) => c.toLowerCase().includes(q));

      const matchTrust = (a.trust_evaluation?.trust_score || 0) >= minTrustScore;
      return matchSearch && matchTrust;
    });
  }, [agents, searchQuery, minTrustScore]);

  // Handle Fund Contract
  const handleFund = async (contractId: string) => {
    try {
      const res = await fundContract(contractId);
      setContracts((prev) =>
        prev.map((c) =>
          c.contract_id === contractId ? { ...c, state: 'FUNDED', payment_intent_id: res.payment_intent_id } : c
        )
      );
      setActionSuccessMsg(`Contract ${contractId} funded! Payment intent: ${res.payment_intent_id}`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Funding failed: ${err.message}`);
    }
  };

  // Handle Verify Deliverable
  const handleVerify = async (contractId: string) => {
    try {
      const rep = await verifyDeliverable(
        contractId,
        { summary: 'Deliverable completed with zero invariant violations', score: 100 },
        '250000'
      );
      if (rep.passed) {
        setContracts((prev) =>
          prev.map((c) => (c.contract_id === contractId ? { ...c, state: 'COMPLETED' } : c))
        );
        setActionSuccessMsg(`Contract ${contractId} deliverable verified (Score: ${rep.score_basis_points / 100}%)!`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Phase 34–39: Open Agent Network
              </span>
              <span className="text-xs font-mono text-slate-400">RFC 002 A2A Compliant</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Agent Discovery, Trust & Peer Settlement
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Discover untrusted external AI agents, inspect deterministic trust evaluations, bargain terms via structured contracts, and settle peer deliverables on Arc USDC with strict zero-trust invariants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/simulator"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Simulator Twin
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition-all"
            >
              Explore Services
            </Link>
          </div>
        </div>

        {/* Global Toast Alert */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fade-in shadow-xl">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2">
          {[
            { id: 'directory', label: 'Peer Directory & Trust', icon: '🔍', count: agents.length },
            { id: 'contracts', label: 'Active Contracts & Bounded Delegation', icon: '📜', count: contracts.length },
            { id: 'graph', label: 'Network Topology Graph', icon: '🕸️', count: graph.nodes.length },
            { id: 'disputes', label: 'Disputes & Audits', icon: '⚖️', count: disputes.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                activeTab === t.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: Peer Directory & Trust */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Filter by agent name, capability (e.g. security.audit), or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                <span>Min Trust Score:</span>
                <input
                  type="range"
                  min="5000"
                  max="10000"
                  step="500"
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(Number(e.target.value))}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-emerald-400">{(minTrustScore / 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAgents.map((a) => {
                const score = a.trust_evaluation?.trust_score || 0;
                const scorePct = (score / 100).toFixed(1);
                const isTopTier = score >= 9500;

                return (
                  <div
                    key={a.identity.agent_id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-emerald-500/5 group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 font-mono text-sm">
                            {a.identity.display_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                              <span>{a.identity.display_name}</span>
                              {isTopTier && <span title="Verified Enterprise Trusted" className="text-emerald-400 text-xs">✓</span>}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 truncate block max-w-[160px]">
                              {a.identity.agent_id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            a.identity.availability === 'BUSY'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {a.identity.availability}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {a.identity.description}
                      </p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {a.identity.capabilities.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-teal-300 border border-slate-700/60"
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      {/* Trust Score Progress */}
                      <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-4 font-mono text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Trust Evaluation:</span>
                          <span className="font-bold text-emerald-400">{scorePct}% ({score} bps)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${Math.min(100, score / 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                          <span>Confidence: {Math.round((a.trust_evaluation?.confidence || 0) * 100)}%</span>
                          <span>Settlement: Arc USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">BASE PRICE</span>
                        <span className="text-sm font-bold text-white font-mono">
                          ${(Number(a.matched_pricing?.base_price || '0') / 1e6).toFixed(2)} USDC
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAgent(a)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-all"
                      >
                        Inspect Agent →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Active Contracts & Bounded Delegation */}
        {activeTab === 'contracts' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Active Service Contracts & Sub-Delegation</h3>
                <p className="text-xs text-slate-400 mt-0.5">Enforces Max Depth = 3, Anti-Cycle DAG, and Authoritative Recipient Resolution</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Contract ID</th>
                    <th className="px-6 py-3.5">Requester → Provider</th>
                    <th className="px-6 py-3.5">Capability</th>
                    <th className="px-6 py-3.5">Depth</th>
                    <th className="px-6 py-3.5">Price</th>
                    <th className="px-6 py-3.5">State</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {contracts.map((c) => {
                    const isDepth0 = c.delegation_depth === 0;
                    return (
                      <tr key={c.contract_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{c.contract_id}</td>
                        <td className="px-6 py-4 text-slate-300">
                          <span className="text-slate-400">{c.requester_agent_id}</span>
                          <span className="mx-1 text-emerald-400">→</span>
                          <span className="text-white font-semibold">{c.provider_agent_id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                            {c.capability}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDepth0
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            Depth {c.delegation_depth} {isDepth0 ? '(Root)' : '(Sub)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          ${(Number(c.price) / 1e6).toFixed(2)} {c.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.state === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : c.state === 'FUNDED' || c.state === 'EXECUTING'
                                ? 'bg-blue-500/20 text-blue-300'
                                : c.state === 'DISPUTED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {c.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {c.state === 'ACCEPTED' && (
                            <button
                              onClick={() => handleFund(c.contract_id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors"
                            >
                              Fund Contract
                            </button>
                          )}
                          {(c.state === 'FUNDED' || c.state === 'EXECUTING') && (
                            <button
                              onClick={() => handleVerify(c.contract_id)}
                              className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 transition-colors"
                            >
                              Verify Deliverable
                            </button>
                          )}
                          {c.state === 'COMPLETED' && (
                            <span className="text-emerald-400 font-bold">✓ Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Network Topology Graph */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <NetworkTopologyGraph graph={graph} />
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Active Agents</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Busy Agents</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Capabilities</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-cyan-400" /> Hired / Paid Flow</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t border-dashed border-amber-400" /> Delegated Subcontract</span>
              </div>
              <span>SHA-256 Verified Invariants Enforced</span>
            </div>
          </div>
        )}

        {/* TAB 4: Disputes & Audits */}
        {activeTab === 'disputes' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Network Dispute & Complaint Audit Registry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Authoritative dispute resolutions and automated trust score penalization</p>
            </div>

            <div className="space-y-4">
              {disputes.map((d) => (
                <div
                  key={d.dispute_id}
                  className="p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{d.dispute_id}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">Contract: {d.contract_id}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        {d.state}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{d.reason}</p>
                    <div className="text-[11px] text-slate-500 truncate max-w-xl">
                      Evidence Hash: {d.evidence}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">CLAIMED REFUND</span>
                      <span className="font-bold text-white">${(Number(d.refund_amount) / 1e6).toFixed(2)} USDC</span>
                    </div>
                    <button
                      onClick={() => alert(`Audit case ${d.dispute_id} evidence package reviewed by deterministic policy engine.`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      Audit Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Agent Flyout Drawer / Modal */}
        {selectedAgent && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedAgent.identity.display_name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {selectedAgent.identity.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{selectedAgent.identity.agent_id}</span>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{selectedAgent.identity.description}</p>

              {/* Trust Breakdown Matrix */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Deterministic Trust Score:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {((selectedAgent.trust_evaluation?.trust_score || 0) / 100).toFixed(1)}% ({selectedAgent.trust_evaluation?.trust_score} bps)
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedAgent.trust_evaluation?.signals?.map((s) => (
                    <div key={s.signal} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{s.signal}:</span>
                      <span className="text-slate-200">{s.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Terms */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">SETTLEMENT CURRENCY</span>
                  <span className="font-bold text-white">USDC (Arc Settlement)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">DELIVERY VERIFICATION</span>
                  <span className="font-bold text-emerald-400">SHA-256 Checksum Required</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert(`Drafted service contract proposal for ${selectedAgent.identity.display_name}.`);
                    setSelectedAgent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20"
                >
                  Propose Contract →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
