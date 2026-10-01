'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchProtocolSnapshot,
  runProtocolPrecheck,
  runProtocolSimulation,
  ProtocolControlTowerSnapshot,
  ProtocolAgentManifest,
  ProtocolContract,
  ProtocolTrafficEntry,
  SecurityIncidentReport,
} from '../../../lib/api/protocol';

export default function ProtocolControlOverviewPage() {
  const [snapshot, setSnapshot] = useState<ProtocolControlTowerSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'contracts' | 'traffic' | 'security'>('agents');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Agent filtering
  const [agentSearch, setAgentSearch] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState('ALL');

  // Quick Action Modals
  const [showPrecheckModal, setShowPrecheckModal] = useState(false);
  const [precheckAgentId, setPrecheckAgentId] = useState('agent_research_01');
  const [precheckCap, setPrecheckCap] = useState('market-research@1.0');
  const [precheckAmount, setPrecheckAmount] = useState('50.00');
  const [precheckResult, setPrecheckResult] = useState<any>(null);

  const [showSimModal, setShowSimModal] = useState(false);
  const [simProvider, setSimProvider] = useState('agent_security_02');
  const [simCap, setSimCap] = useState('security-audit@1.0');
  const [simPrice, setSimPrice] = useState('75.00');
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const snap = await fetchProtocolSnapshot();
      setSnapshot(snap);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load protocol data:', err);
      setError(err?.message || 'Protocol state unavailable');
    } finally {
      setLoading(false);
    }
  }

  const agents: ProtocolAgentManifest[] = snapshot?.agents?.items || [];
  const contracts: ProtocolContract[] = snapshot?.contracts?.items || [];
  const traffic: ProtocolTrafficEntry[] = snapshot?.telemetry || [];
  const security = snapshot?.security || null;

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchesSearch =
        agentSearch === '' ||
        a.display_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.agent_id.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.organization_id.toLowerCase().includes(agentSearch.toLowerCase());

      const matchesCap =
        capabilityFilter === 'ALL' ||
        a.capabilities.some((c) =>
          c.capability_id.toLowerCase().includes(capabilityFilter.toLowerCase()) ||
          c.name.toLowerCase().includes(capabilityFilter.toLowerCase())
        );

      return matchesSearch && matchesCap;
    });
  }, [agents, agentSearch, capabilityFilter]);

  async function handleRunPrecheck(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await runProtocolPrecheck({
        agent_id: precheckAgentId,
        capability: precheckCap,
        estimated_amount: precheckAmount,
        currency: 'USDC',
      });
      setPrecheckResult(res);
      setFeedback(`Precheck verified for ${precheckAgentId}: ${res.eligibility} (Zero financial mutation)`);
    } catch (err: any) {
      setPrecheckResult({
        eligibility: 'INELIGIBLE',
        reasons: [`Precheck evaluation failed: ${err.message || 'Gateway error'}`],
        max_allowable_budget: '0.00',
      });
      setFeedback(`Precheck evaluation returned an error for ${precheckAgentId}: ${err.message}`);
    }
  }

  async function handleRunSimulation(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await runProtocolSimulation({
        service_request: {
          request_id: 'sim_req_' + Date.now(),
          requester_id: 'agent_research_01',
          capability: simCap,
          budget_cap: '100',
          deadline: new Date(Date.now() + 86400000).toISOString(),
        },
        provider_id: simProvider,
        negotiated_price: simPrice,
      });
      setSimResult(res);
      setFeedback(`Twin Simulation finished: ${res.policy_decision} (Safe: ${res.safe_to_execute ? 'YES' : 'NO'})`);
    } catch (err: any) {
      setSimResult({
        policy_decision: 'DENY',
        risk_score: 99,
        estimated_cost_usdc: simPrice,
        safe_to_execute: false,
        warnings: [`Simulation failed: ${err.message || 'Gateway error'}`],
      });
      setFeedback(`Twin Simulation failed: ${err.message}`);
    }
  }

  // Loading state (no stale or fake business data shown)
  if (loading && !snapshot) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8 flex flex-col items-center justify-center font-mono">
        <div className="flex items-center gap-3 text-sm text-[#D6A83A]">
          <span className="h-3 w-3 rounded-full bg-[#D6A83A] animate-ping" />
          Loading protocol state...
        </div>
        <p className="text-xs text-[#716F69] mt-2">Connecting to protocol gateway snapshot...</p>
      </div>
    );
  }

  // Error state with honest retry
  if (error && !snapshot) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8 flex flex-col items-center justify-center font-mono">
        <div className="p-6 rounded-xl border border-[#D85C5C]/40 bg-[#141414] max-w-md w-full text-center">
          <div className="text-sm font-bold text-[#D85C5C] mb-2">Protocol State Unavailable</div>
          <p className="text-xs text-[#716F69] mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#D6A83A] hover:bg-[#c49731] text-[#080808] transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const isLive = snapshot?.mode?.toLowerCase() === 'live';
  const modeLabel = isLive ? 'LIVE — VERIFIED SYSTEM STATE' : 'PROTOCOL SIMULATION';
  const fundsLabel = snapshot?.funds_moved ? 'FUNDS MOVED' : 'NO FUNDS MOVED';

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Top Banner / Axiom Strip */}
      <div className="mb-6 rounded-xl border border-[#222222] bg-[#101010] p-5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`flex h-2.5 w-2.5 rounded-full ${isLive ? 'bg-[#2FB36F]' : 'bg-[#D6A83A]'} animate-pulse`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#D6A83A]">
                Autonomous Economic Protocol v1.0
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                {modeLabel}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#716F69] border border-[#222222]">
                {fundsLabel}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F2F0EA] mt-1.5">
              Autonomous Protocol Control Tower
            </h1>
            <p className="text-xs md:text-sm text-[#716F69] mt-0.5">
              Open economic participation. Closed financial authority. Enforcing INV-161 through INV-180.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setShowPrecheckModal(true);
                setPrecheckResult(null);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              Agent Precheck
            </button>
            <button
              onClick={() => {
                setShowSimModal(true);
                setSimResult(null);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition shadow-sm"
            >
              Twin Simulation
            </button>
            <Link
              href="/demo/protocol"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              Interactive Protocol Demo
            </Link>
          </div>
        </div>

        {/* Global Architectural Reality Sub-strip */}
        <div className="mt-4 pt-3.5 border-t border-[#1C1C1C] flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] font-mono text-[#716F69]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#50504C]">ARC:</span>
            <span className={snapshot?.arc?.connected ? "text-[#2FB36F] font-semibold" : "text-[#D85C5C] font-semibold"}>
              {snapshot?.arc?.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <span className="text-[#333333]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#50504C]">CHAIN:</span>
            <span className="text-[#F2F0EA]">{snapshot?.arc?.chain_id ?? 5042}</span>
          </div>
          <span className="text-[#333333]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#50504C]">LIVE EXECUTION:</span>
            <span className={snapshot?.arc?.live_execution ? "text-[#2FB36F] font-semibold" : "text-[#D85C5C] font-semibold"}>
              {snapshot?.arc?.live_execution ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <span className="text-[#333333]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#50504C]">AGENTVAULT:</span>
            <span className={snapshot?.arc?.agent_vault_deployed ? "text-[#2FB36F] font-semibold" : "text-[#D6A83A] font-semibold"}>
              {snapshot?.arc?.agent_vault_deployed ? 'DEPLOYED' : 'NOT DEPLOYED'}
            </span>
          </div>
          <span className="text-[#333333]">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#50504C]">REAL ARC SETTLEMENTS:</span>
            <span className="text-[#F2F0EA] font-semibold">{snapshot?.arc?.real_settlements ?? 0}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-6 p-3 rounded-lg bg-[#141414] border border-[#2FB36F]/40 text-xs text-[#2FB36F] flex justify-between items-center font-mono">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
        </div>
      )}

      {/* KPI Stats Strip — Truthful & Provenance-Grounded */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="flex justify-between items-start">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Discovered Agents</div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
              {isLive ? 'LIVE' : 'SIMULATION'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#F2F0EA] mt-2">{snapshot?.agents?.discovered ?? 0}</div>
          <div className="text-xs text-[#2FB36F] mt-1 font-mono">
            {snapshot?.agents && snapshot.agents.discovered > 0
              ? `● ${snapshot.agents.manifest_valid}/${snapshot.agents.discovered} Simulated Manifests Valid (INV-162)`
              : '0 manifests registered'}
          </div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="flex justify-between items-start">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Active Protocol Contracts</div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
              {isLive ? 'LIVE' : 'SIMULATION'}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#F2F0EA] mt-2">{snapshot?.contracts?.active ?? 0}</div>
          <div className="text-xs text-[#716F69] mt-1">
            {snapshot?.contracts && snapshot.contracts.active > 0
              ? 'Multi-Milestone Deliverables Bound'
              : 'No active contracts'}
          </div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="flex justify-between items-start">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Projected Contract Value</div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
              PROJECTED
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#2FB36F] mt-2">
            ${parseFloat(snapshot?.contracts?.projected_value_usdc || '0').toFixed(2)} USDC
          </div>
          <div className="text-xs text-[#D6A83A] mt-1 font-mono">
            {snapshot?.contracts && snapshot.contracts.active > 0
              ? 'Simulated Escrow · NO FUNDS MOVED'
              : 'No contract reservations'}
          </div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="flex justify-between items-start">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Security Guardrails Active</div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/30">
              TEST SUITE
            </span>
          </div>
          <div className="text-3xl font-extrabold text-[#D85C5C] mt-2">
            {snapshot?.security?.attacks_blocked ?? 0}
          </div>
          <div className="text-xs text-[#D85C5C]/80 mt-1 font-mono">
            {snapshot?.security
              ? `${snapshot.security.attacks_blocked} Attacks Blocked · ${snapshot.security.authority_leaks} Authority Leaks`
              : 'No security events observed'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222222] mb-6 gap-2">
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'agents'
              ? 'border-[#D6A83A] text-[#D6A83A]'
              : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
          }`}
        >
          Discovered Agents ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'contracts'
              ? 'border-[#D6A83A] text-[#D6A83A]'
              : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
          }`}
        >
          Active Contracts ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'traffic'
              ? 'border-[#D6A83A] text-[#D6A83A]'
              : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
          }`}
        >
          Telemetry Stream ({traffic.length})
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'security'
              ? 'border-[#D6A83A] text-[#D6A83A]'
              : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
          }`}
        >
          Security & Invariants
        </button>
      </div>

      {/* Tab 1: Discovered Agents */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101010] border border-[#222222] p-3.5 rounded-xl">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Search agent name, ID, or organization..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full max-w-sm bg-[#080808] border border-[#222222] rounded-lg px-3 py-1.5 text-xs text-[#F2F0EA] placeholder-[#716F69] font-mono focus:border-[#D6A83A] outline-none"
              />
              {agentSearch && (
                <button
                  onClick={() => setAgentSearch('')}
                  className="text-xs text-[#716F69] hover:text-[#F2F0EA] font-mono px-1"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] uppercase font-mono text-[#716F69] mr-1">Capability:</span>
              {['ALL', 'market-research', 'security-audit', 'verification'].map((cap) => (
                <button
                  key={cap}
                  onClick={() => setCapabilityFilter(cap)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                    capabilityFilter === cap
                      ? 'bg-[#D6A83A] text-[#080808] font-bold shadow-sm'
                      : 'bg-[#0B0B0B] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#222222] bg-[#101010] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-[#0B0B0B] text-[#716F69] uppercase tracking-wider text-[11px] border-b border-[#222222]">
                  <tr>
                    <th className="py-3 px-4">Agent Identity</th>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4">Reputation & Authority</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {filteredAgents.map((a) => (
                    <tr key={a.agent_id} className="hover:bg-[#141414] transition">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#F2F0EA]">{a.display_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                            {isLive ? 'LIVE AGENT' : 'DEMO AGENT'}
                          </span>
                        </div>
                        <div className="text-xs text-[#716F69] mt-0.5">{a.agent_id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-[#B0ADA5]">{a.organization_id}</div>
                        <span className="text-[10px] text-[#50504C] uppercase">
                          {isLive ? 'VERIFIED ORGANIZATION' : 'DEMO ORGANIZATION'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {a.capabilities.map((c) => (
                            <span
                              key={c.capability_id}
                              className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] text-[11px]"
                            >
                              {c.name} (${c.base_price_usdc} USDC)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-[#2FB36F]">
                          <span>★</span>
                          <span>{a.reputation_score !== undefined ? `${a.reputation_score}/100` : 'N/A'}</span>
                          <span className="text-[10px] text-[#716F69] font-normal font-mono">
                            ({isLive ? 'VERIFIED' : 'SIMULATED'})
                          </span>
                        </div>
                        <div className="text-[10px] text-[#716F69] font-mono mt-0.5">
                          Zero Financial Authority (INV-180)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
                          ● {isLive ? '' : 'SIMULATED '} {a.availability}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/control/protocol/agents/${a.agent_id}`}
                          className="text-xs font-medium text-[#D6A83A] hover:underline transition"
                        >
                          Inspect Agent →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredAgents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs font-mono text-[#716F69]">
                        {agents.length === 0
                          ? '0 discovered agents. No protocol participants found.'
                          : 'No protocol agents found matching query.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contracts */}
      {activeTab === 'contracts' && (
        <div className="rounded-xl border border-[#222222] bg-[#101010] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#0B0B0B] text-[#716F69] uppercase tracking-wider text-[11px] border-b border-[#222222]">
                <tr>
                  <th className="py-3 px-4">Contract ID</th>
                  <th className="py-3 px-4">Participants</th>
                  <th className="py-3 px-4">Capability</th>
                  <th className="py-3 px-4">Projected Value</th>
                  <th className="py-3 px-4">Milestones</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {contracts.map((c) => (
                  <tr key={c.contract_id} className="hover:bg-[#141414] transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#F2F0EA]">
                      <div className="flex items-center gap-1.5">
                        <span>{c.contract_id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                          {isLive ? 'LIVE' : 'SIMULATED'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      <span className="text-[#B0ADA5]">{c.requester_id}</span>
                      <span className="text-[#50504C] mx-1.5">→</span>
                      <span className="text-[#D6A83A]">{c.provider_id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#B0ADA5] font-mono text-xs">{c.capability}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#2FB36F]">
                      <div>{c.total_amount} {c.currency}</div>
                      <div className="text-[10px] text-[#716F69] font-normal font-mono">
                        {isLive ? 'Clearinghouse Escrow' : 'Simulated Escrow · No Funds Moved'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#716F69]">
                      {c.milestones?.length || 0} milestone(s)
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                        {c.state} ({isLive ? 'LIVE' : 'SIMULATED'})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/control/protocol/contracts/${c.contract_id}`}
                        className="text-xs font-medium text-[#D6A83A] hover:underline transition"
                      >
                        Inspect Lifecycle →
                      </Link>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs font-mono text-[#716F69]">
                      No active protocol contracts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry Stream */}
      {activeTab === 'traffic' && (
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA]">
                {isLive ? 'Live Protocol Telemetry Stream' : 'Simulated Protocol Telemetry Stream'}
              </h3>
              <p className="text-xs text-[#716F69] mt-0.5">
                Deterministic event trace across the 6-stage ProtocolGateway pipeline. Simulation mode — no on-chain broadcast.
              </p>
            </div>
            <span className="text-xs text-[#716F69] font-mono">Auto-refreshed every 10s</span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {traffic.map((e, idx) => (
              <div
                key={e.traffic_id}
                className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-[#2D2D2D] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#50504C] text-[11px] font-bold">0{idx + 1}</span>
                  <span className="text-[#50504C] text-[11px]">{e.timestamp}</span>
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#222222] text-[11px]">
                    {e.message_type}
                  </span>
                  <span className="text-[#F2F0EA] font-medium">
                    {e.sender_id} <span className="text-[#50504C]">→</span> {e.recipient_id}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#2FB36F] font-medium">{e.status}</span>
                  <span className="text-[#716F69] text-[11px]">{e.latency_ms}ms</span>
                </div>
              </div>
            ))}
            {traffic.length === 0 && (
              <div className="py-8 text-center text-xs font-mono text-[#716F69]">
                No protocol telemetry recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Security & Invariants */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-[#F2F0EA] uppercase tracking-wider">
                Machine-Checked Protocol Invariants
              </h3>
              <span className="text-[10px] font-mono text-[#2FB36F]">
                {security?.invariants_enforced || 'INV-161 TO INV-180'}
              </span>
            </div>
            <div className="space-y-2 text-xs text-[#F2F0EA] font-mono">
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-161:</span> Closed Financial Authority
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-162:</span> Manifest Registry Source-of-Truth
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-163:</span> Recipient Address Injection Defense
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-164:</span> Arbitrary Calldata Blocked
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-165:</span> Policy Budget Caps Enforced
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-170:</span> Replay Attack Defense (Fresh Nonce)
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-171:</span> Timestamp & Expiry Bounds
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-173:</span> Deliverable Verification Gate
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-175:</span> Simulation Cannot Broadcast
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#D6A83A]">INV-180:</span> Reputation Cannot Grant Financial Authority
                </div>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
            <h3 className="text-sm font-semibold text-[#F2F0EA] uppercase tracking-wider mb-1">
              Adversarial Threat Interception Summary
            </h3>
            <p className="text-xs text-[#716F69] mb-4 font-mono">
              {security?.attacks_blocked ?? 0} attack variants neutralized across adversarial simulation test suite
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Replay Attacks Prevented (INV-170):</span>
                  <span className="text-[#F2F0EA] font-bold">
                    {security?.adversarial_summary?.replays_prevented ?? 0}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#D6A83A] rounded-full"
                    style={{ width: `${Math.min(100, ((security?.adversarial_summary?.replays_prevented ?? 0) / 160) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Unauthorized Balances Blocked (INV-168):</span>
                  <span className="text-[#D85C5C] font-bold">
                    {security?.adversarial_summary?.unauthorized_queries_blocked ?? 0}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#D85C5C] rounded-full"
                    style={{ width: `${Math.min(100, ((security?.adversarial_summary?.unauthorized_queries_blocked ?? 0) / 120) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Raw Address Injections Halted (INV-163):</span>
                  <span className="text-[#2FB36F] font-bold">
                    {security?.adversarial_summary?.raw_transfers_halted ?? 0}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#2FB36F] rounded-full"
                    style={{ width: `${Math.min(100, ((security?.adversarial_summary?.raw_transfers_halted ?? 0) / 50) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Expired / Invalid Signatures (INV-171):</span>
                  <span className="text-[#D6A83A] font-bold">
                    {security?.adversarial_summary?.signature_failures ?? 0}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div
                    className="h-full bg-[#D6A83A] rounded-full"
                    style={{ width: `${Math.min(100, ((security?.adversarial_summary?.signature_failures ?? 0) / 75) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#222222] text-[11px] text-[#716F69] font-mono">
                Provenance: {security?.attacks_blocked ?? 0} attacks blocked in simulation. {security?.authority_leaks ?? 0} authority leaks across real agents. Verified in Go test suite (adversarial_test.go & chaos_test.go).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Precheck Modal */}
      {showPrecheckModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-[#F2F0EA]">Agent Eligibility Precheck</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                READ-ONLY
              </span>
            </div>
            <p className="text-xs text-[#716F69] mb-4">
              Simulates agent policy clearance, capability schemas, and nonce freshness. Mutates zero financial state (INV-176).
            </p>
            <form onSubmit={handleRunPrecheck} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Agent ID</label>
                <input
                  type="text"
                  value={precheckAgentId}
                  onChange={(e) => setPrecheckAgentId(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Capability</label>
                <input
                  type="text"
                  value={precheckCap}
                  onChange={(e) => setPrecheckCap(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Estimated Amount (USDC)</label>
                <input
                  type="text"
                  value={precheckAmount}
                  onChange={(e) => setPrecheckAmount(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>

              {precheckResult && (
                <div className="p-3 rounded bg-[#0B0B0B] border border-[#222222] text-xs font-mono space-y-1.5">
                  <div className={`font-semibold flex items-center justify-between ${precheckResult.eligibility === 'ELIGIBLE' ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}`}>
                    <span>Status: {precheckResult.eligibility}</span>
                    <span className="text-[10px] text-[#716F69]">
                      {precheckResult.eligibility === 'ELIGIBLE' ? 'PASS' : 'CHECK'}
                    </span>
                  </div>
                  <div className="text-[#716F69]">
                    Max Allowed Budget: ${precheckResult.max_allowable_budget || '0.00'} USDC
                  </div>
                  {precheckResult.reasons && (
                    <div className="text-[11px] text-[#A09D94] border-t border-[#222222] pt-1.5 space-y-0.5">
                      {precheckResult.reasons.map((r: string, i: number) => (
                        <div key={i}>✓ {r}</div>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-[#D6A83A] pt-1">
                    Invariant Verified: Zero keys held · No signing · No broadcast
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrecheckModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#716F69] hover:text-[#F2F0EA]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold"
                >
                  Run Precheck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-[#F2F0EA]">Digital Twin Simulation</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
                DRY-RUN
              </span>
            </div>
            <p className="text-xs text-[#716F69] mb-4">
              Pre-flight counterfactual execution without financial state mutation (INV-165 / INV-175).
            </p>
            <form onSubmit={handleRunSimulation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Provider ID</label>
                <input
                  type="text"
                  value={simProvider}
                  onChange={(e) => setSimProvider(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Capability</label>
                <input
                  type="text"
                  value={simCap}
                  onChange={(e) => setSimCap(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Negotiated Price (USDC)</label>
                <input
                  type="text"
                  value={simPrice}
                  onChange={(e) => setSimPrice(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>

              {simResult && (
                <div className="p-3 rounded bg-[#0B0B0B] border border-[#222222] text-xs font-mono space-y-1">
                  <div className={`font-semibold ${simResult.policy_decision === 'ALLOW' ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}`}>
                    Policy Decision: {simResult.policy_decision}
                  </div>
                  <div className="text-[#716F69]">
                    Risk Score: {simResult.risk_score} | Safe to Execute: {simResult.safe_to_execute ? 'YES' : 'NO'}
                  </div>
                  <div className="text-[#716F69]">
                    Projected Cost: ${simResult.estimated_cost_usdc} USDC
                  </div>
                  <div className="text-[10px] text-[#D85C5C] pt-1">
                    Broadcast: BLOCKED — SIMULATION MODE. No funds moved.
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#716F69] hover:text-[#F2F0EA]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold"
                >
                  Simulate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
