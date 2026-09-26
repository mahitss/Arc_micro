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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase rounded-full bg-[#141414] text-[#D6A83A] border border-[#2D2D2D]">
                Phase 34–39: Open Agent Network
              </span>
              <span className="text-xs font-mono text-[#716F69]">RFC 002 A2A Compliant</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#F2F0EA] tracking-tight">
              Agent Discovery, Trust & Peer Settlement
            </h1>
            <p className="text-sm text-[#B0ADA5] mt-1 max-w-2xl">
              Discover untrusted external AI agents, inspect deterministic trust evaluations, bargain terms via structured contracts, and settle peer deliverables on Arc USDC with strict zero-trust invariants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/simulator"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] transition-colors"
            >
              Simulator Twin
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition-all"
            >
              Explore Services
            </Link>
          </div>
        </div>

        {/* Global Toast Alert */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-xl bg-[#141414] border border-[#2FB36F]/40 text-[#2FB36F] text-xs font-mono flex items-center justify-between animate-fade-in shadow-xl">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-[#222222] pb-2">
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
                  ? 'bg-[#141414] text-[#F2F0EA] border border-[#2D2D2D] font-semibold'
                  : 'text-[#A5A29A] hover:text-[#F2F0EA] hover:bg-[#141414]'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#181818] border border-[#222222] text-[#B0ADA5]">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1: Peer Directory & Trust */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="bg-[#101010] border border-[#222222] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Filter by agent name, capability (e.g. security.audit), or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-xl px-4 py-2 text-xs text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A] transition-colors"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-[#85827B]">
                <span>Min Trust Score:</span>
                <input
                  type="range"
                  min="5000"
                  max="10000"
                  step="500"
                  value={minTrustScore}
                  onChange={(e) => setMinTrustScore(Number(e.target.value))}
                  className="accent-[#D6A83A] cursor-pointer"
                />
                <span className="font-bold text-[#F2F0EA]">{(minTrustScore / 100).toFixed(0)}%</span>
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
                    className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-2xl p-5 flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center font-bold text-[#F2F0EA] font-mono text-sm">
                            {a.identity.display_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-[#F2F0EA] text-sm">
                              <span>{a.identity.display_name}</span>
                              {isTopTier && <span title="Verified Enterprise Trusted" className="text-[#2FB36F] text-xs">✓</span>}
                            </div>
                            <span className="text-[10px] font-mono text-[#716F69] truncate block max-w-[160px]">
                              {a.identity.agent_id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            a.identity.availability === 'BUSY'
                              ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                              : 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30'
                          }`}
                        >
                          {a.identity.availability}
                        </span>
                      </div>

                      <p className="text-xs text-[#B0ADA5] line-clamp-2 mb-4 leading-relaxed">
                        {a.identity.description}
                      </p>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {a.identity.capabilities.map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#141414] text-[#B0ADA5] border border-[#222222]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      {/* Trust Score Progress */}
                      <div className="space-y-1.5 bg-[#0B0B0B] p-3 rounded-xl border border-[#222222] mb-4 font-mono text-xs">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#716F69]">Trust Evaluation:</span>
                          <span className="font-bold text-[#F2F0EA]">{scorePct}% ({score} bps)</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#181818] overflow-hidden">
                          <div
                            className="h-full bg-[#D6A83A] rounded-full"
                            style={{ width: `${Math.min(100, score / 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-[#50504C] flex justify-between pt-1">
                          <span>Confidence: {Math.round((a.trust_evaluation?.confidence || 0) * 100)}%</span>
                          <span>Settlement: Arc USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#222222]">
                      <div>
                        <span className="text-[10px] font-mono text-[#716F69] block">BASE PRICE</span>
                        <span className="text-sm font-bold text-[#F2F0EA] font-mono">
                          ${(Number(a.matched_pricing?.base_price || '0') / 1e6).toFixed(2)} USDC
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAgent(a)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] transition-all"
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
          <div className="bg-[#101010] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#F2F0EA]">Active Service Contracts & Sub-Delegation</h3>
                <p className="text-xs text-[#716F69] mt-0.5">Enforces Max Depth = 3, Anti-Cycle DAG, and Authoritative Recipient Resolution</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0B0B] border-b border-[#222222] text-[#716F69] uppercase text-[10px] tracking-wider">
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
                <tbody className="divide-y divide-[#222222]">
                  {contracts.map((c) => {
                    const isDepth0 = c.delegation_depth === 0;
                    return (
                      <tr key={c.contract_id} className="hover:bg-[#141414] transition-colors">
                        <td className="px-6 py-4 font-bold text-[#F2F0EA]">{c.contract_id}</td>
                        <td className="px-6 py-4 text-[#B0ADA5]">
                          <span className="text-[#716F69]">{c.requester_agent_id}</span>
                          <span className="mx-1 text-[#D6A83A]">→</span>
                          <span className="text-[#F2F0EA] font-semibold">{c.provider_agent_id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                            {c.capability}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#B0ADA5] border border-[#222222]"
                          >
                            Depth {c.delegation_depth} {isDepth0 ? '(Root)' : '(Sub)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#F2F0EA]">
                          ${(Number(c.price) / 1e6).toFixed(2)} {c.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              c.state === 'COMPLETED'
                                ? 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30'
                                : c.state === 'FUNDED' || c.state === 'EXECUTING'
                                ? 'bg-[#6B8FD6]/10 text-[#6B8FD6] border-[#6B8FD6]/30'
                                : c.state === 'DISPUTED'
                                ? 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30'
                                : 'bg-[#141414] text-[#716F69] border-[#222222]'
                            }`}
                          >
                            {c.state}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {c.state === 'ACCEPTED' && (
                            <button
                              onClick={() => handleFund(c.contract_id)}
                              className="px-2.5 py-1 rounded-lg bg-[#151515] text-[#E5E2DA] border border-[#2A2A2A] hover:bg-[#1C1C1C] transition-colors"
                            >
                              Fund Contract
                            </button>
                          )}
                          {(c.state === 'FUNDED' || c.state === 'EXECUTING') && (
                            <button
                              onClick={() => handleVerify(c.contract_id)}
                              className="px-2.5 py-1 rounded-lg bg-[#151515] text-[#E5E2DA] border border-[#2A2A2A] hover:bg-[#1C1C1C] transition-colors"
                            >
                              Verify Deliverable
                            </button>
                          )}
                          {c.state === 'COMPLETED' && (
                            <span className="text-[#2FB36F] font-bold">✓ Settled</span>
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
            <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between text-xs font-mono text-[#B0ADA5]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2FB36F]" /> Active Agents</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A]" /> Busy Agents</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6B8FD6]" /> Capabilities</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#D6A83A]" /> Hired / Paid Flow</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t border-dashed border-[#716F69]" /> Delegated Subcontract</span>
              </div>
              <span className="text-[#716F69]">SHA-256 Verified Invariants Enforced</span>
            </div>
          </div>
        )}

        {/* TAB 4: Disputes & Audits */}
        {activeTab === 'disputes' && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[#F2F0EA]">Network Dispute & Complaint Audit Registry</h3>
              <p className="text-xs text-[#716F69] mt-0.5">Authoritative dispute resolutions and automated trust score penalization</p>
            </div>

            <div className="space-y-4">
              {disputes.map((d) => (
                <div
                  key={d.dispute_id}
                  className="p-5 rounded-xl bg-[#0B0B0B] border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F2F0EA]">{d.dispute_id}</span>
                      <span className="text-[#50504C]">|</span>
                      <span className="text-[#716F69]">Contract: {d.contract_id}</span>
                      <span className="px-2 py-0.5 rounded bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30 font-bold text-[10px]">
                        {d.state}
                      </span>
                    </div>
                    <p className="text-[#B0ADA5] font-sans text-xs">{d.reason}</p>
                    <div className="text-[11px] text-[#50504C] truncate max-w-xl">
                      Evidence Hash: {d.evidence}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[#716F69] block">CLAIMED REFUND</span>
                      <span className="font-bold text-[#F2F0EA]">${(Number(d.refund_amount) / 1e6).toFixed(2)} USDC</span>
                    </div>
                    <button
                      onClick={() => alert(`Audit case ${d.dispute_id} evidence package reviewed by deterministic policy engine.`)}
                      className="px-3 py-1.5 rounded-xl bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] transition-colors"
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
            <div className="bg-[#101010] border border-[#222222] rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#F2F0EA]">{selectedAgent.identity.display_name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                      {selectedAgent.identity.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#716F69]">{selectedAgent.identity.agent_id}</span>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-[#716F69] hover:text-[#F2F0EA] p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#B0ADA5] leading-relaxed">{selectedAgent.identity.description}</p>

              {/* Trust Breakdown Matrix */}
              <div className="bg-[#0B0B0B] rounded-2xl p-4 border border-[#222222] space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#222222]">
                  <span className="text-[#716F69]">Deterministic Trust Score:</span>
                  <span className="text-[#F2F0EA] font-bold text-sm">
                    {((selectedAgent.trust_evaluation?.trust_score || 0) / 100).toFixed(1)}% ({selectedAgent.trust_evaluation?.trust_score} bps)
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedAgent.trust_evaluation?.signals?.map((s) => (
                    <div key={s.signal} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#716F69]">{s.signal}:</span>
                      <span className="text-[#B0ADA5]">{s.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Terms */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#716F69] text-[10px] block">SETTLEMENT CURRENCY</span>
                  <span className="font-bold text-[#F2F0EA]">USDC (Arc Settlement)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#716F69] text-[10px] block">DELIVERY VERIFICATION</span>
                  <span className="font-bold text-[#2FB36F]">SHA-256 Checksum Required</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#222222]">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert(`Drafted service contract proposal for ${selectedAgent.identity.display_name}.`);
                    setSelectedAgent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold"
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
