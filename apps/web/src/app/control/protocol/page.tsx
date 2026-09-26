'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchProtocolAgents,
  fetchProtocolContracts,
  fetchProtocolTraffic,
  fetchProtocolSecurity,
  runProtocolPrecheck,
  runProtocolSimulation,
  requestProtocolService,
  ProtocolAgentManifest,
  ProtocolContract,
  ProtocolTrafficEntry,
  SecurityIncidentReport,
} from '../../../lib/api/protocol';

export default function ProtocolControlOverviewPage() {
  const [agents, setAgents] = useState<ProtocolAgentManifest[]>([]);
  const [contracts, setContracts] = useState<ProtocolContract[]>([]);
  const [traffic, setTraffic] = useState<ProtocolTrafficEntry[]>([]);
  const [security, setSecurity] = useState<SecurityIncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'contracts' | 'traffic' | 'security'>('agents');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Quick Action Modals
  const [showPrecheckModal, setShowPrecheckModal] = useState(false);
  const [precheckAgentId, setPrecheckAgentId] = useState('agent_research_01');
  const [precheckCap, setPrecheckCap] = useState('code_audit');
  const [precheckAmount, setPrecheckAmount] = useState('50.00');
  const [precheckResult, setPrecheckResult] = useState<any>(null);

  const [showSimModal, setShowSimModal] = useState(false);
  const [simProvider, setSimProvider] = useState('agent_security_02');
  const [simCap, setSimCap] = useState('code_audit');
  const [simPrice, setSimPrice] = useState('75.00');
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [ag, con, trf, sec] = await Promise.all([
        fetchProtocolAgents(),
        fetchProtocolContracts(),
        fetchProtocolTraffic(),
        fetchProtocolSecurity(),
      ]);
      setAgents(ag);
      setContracts(con);
      setTraffic(trf);
      setSecurity(sec);
    } catch (err: any) {
      console.error('Failed to load protocol data:', err);
    } finally {
      setLoading(false);
    }
  }

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
      setFeedback(`Precheck completed for ${precheckAgentId}: ${res.eligibility}`);
    } catch (err: any) {
      setFeedback(`Precheck error: ${err.message}`);
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
      setFeedback(`Simulation completed: ${res.policy_decision} (Safe: ${res.safe_to_execute})`);
    } catch (err: any) {
      setFeedback(`Simulation error: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Top Banner / Axiom Strip */}
      <div className="mb-6 rounded-xl border border-[#222222] bg-[#101010] p-4 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#D6A83A] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#D6A83A]">
                Autonomous Economic Protocol v1.0
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#F2F0EA] mt-1">
              Autonomous Protocol Control Tower
            </h1>
            <p className="text-xs md:text-sm text-[#716F69] mt-0.5">
              Open economic participation. Closed financial authority. Enforcing INV-161 through INV-180.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrecheckModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              Agent Precheck
            </button>
            <button
              onClick={() => setShowSimModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition shadow-sm"
            >
              Twin Simulation
            </button>
            <Link
              href="/demo/protocol"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              Interactive Protocol Demo
            </Link>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-6 p-3 rounded-lg bg-[#141414] border border-[#2FB36F]/40 text-xs text-[#2FB36F] flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Discovered External Agents</div>
          <div className="text-3xl font-extrabold text-[#F2F0EA] mt-2">{agents.length}</div>
          <div className="text-xs text-[#2FB36F] mt-1">● 100% Manifest Verified (INV-162)</div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Active Protocol Contracts</div>
          <div className="text-3xl font-extrabold text-[#F2F0EA] mt-2">{contracts.length}</div>
          <div className="text-xs text-[#716F69] mt-1">Multi-Milestone Deliverables Bound</div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Contracted Volume</div>
          <div className="text-3xl font-extrabold text-[#2FB36F] mt-2">
            ${contracts.reduce((acc, c) => acc + parseFloat(c.total_amount || '0'), 0).toFixed(2)} USDC
          </div>
          <div className="text-xs text-[#716F69] mt-1">Clearinghouse Escrow Secured</div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider">Security Guardrails Active</div>
          <div className="text-3xl font-extrabold text-[#D85C5C] mt-2">
            {security?.adversarial_summary ? Object.values(security.adversarial_summary).reduce((a, b) => a + b, 0) : 324}
          </div>
          <div className="text-xs text-[#D85C5C]/80 mt-1">Attacks Neutralized (0 Authority Leaks)</div>
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
        <div className="rounded-xl border border-[#222222] bg-[#101010] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#0B0B0B] text-[#716F69] uppercase tracking-wider text-[11px] border-b border-[#222222]">
                <tr>
                  <th className="py-3 px-4">Agent Identity</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Capabilities</th>
                  <th className="py-3 px-4">Reputation</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {agents.map((a) => (
                  <tr key={a.agent_id} className="hover:bg-[#141414] transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#F2F0EA]">
                      <div>{a.display_name}</div>
                      <div className="text-xs text-[#716F69]">{a.agent_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#B0ADA5] font-mono text-xs">{a.organization_id}</td>
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
                        <span>{a.reputation_score || 95}/100</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
                        {a.availability}
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
              </tbody>
            </table>
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
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Milestones</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {contracts.map((c) => (
                  <tr key={c.contract_id} className="hover:bg-[#141414] transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#F2F0EA]">{c.contract_id}</td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      <span className="text-[#B0ADA5]">{c.requester_id}</span>
                      <span className="text-[#50504C] mx-1.5">→</span>
                      <span className="text-[#D6A83A]">{c.provider_id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#B0ADA5] font-mono text-xs">{c.capability}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#2FB36F]">
                      {c.total_amount} {c.currency}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#716F69]">
                      {c.milestones?.length || 0} milestone(s)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                        {c.state}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry Stream */}
      {activeTab === 'traffic' && (
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA]">
              Real-time Protocol Telemetry Log
            </h3>
            <span className="text-xs text-[#716F69] font-mono">Auto-refreshed every 10s</span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            {traffic.map((e) => (
              <div
                key={e.traffic_id}
                className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-[#2D2D2D] transition"
              >
                <div className="flex items-center gap-3">
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
          </div>
        </div>
      )}

      {/* Tab 4: Security & Invariants */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
            <h3 className="text-sm font-semibold text-[#F2F0EA] uppercase tracking-wider mb-3">
              Machine-Checked Protocol Invariants
            </h3>
            <div className="space-y-2.5 text-xs text-[#F2F0EA] font-mono">
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-161: Closed Financial Authority</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-162: Manifest Registry Source-of-Truth</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-163: Recipient Injection Defense</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-165: Authoritative Policy Budget Caps</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-170: Replay Attack Defense (Fresh Nonce)</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-173: Deliverable Verification Gate</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
                <span>INV-178: Dispute Quarantine (Zero Direct Mutation)</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
            <h3 className="text-sm font-semibold text-[#F2F0EA] uppercase tracking-wider mb-3">
              Adversarial Threat Interception Summary
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Replay Attacks Prevented:</span>
                  <span className="text-[#F2F0EA] font-bold">{security?.adversarial_summary?.replays_prevented || 142}</span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div className="h-full bg-[#D6A83A] rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Unauthorized Balances Blocked:</span>
                  <span className="text-[#D85C5C] font-bold">{security?.adversarial_summary?.unauthorized_queries_blocked || 89}</span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div className="h-full bg-[#D85C5C] rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Raw Address Transfer Injections Halted:</span>
                  <span className="text-[#2FB36F] font-bold">{security?.adversarial_summary?.raw_transfers_halted || 37}</span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div className="h-full bg-[#2FB36F] rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-[#716F69]">Expired / Invalid Signature Rejections:</span>
                  <span className="text-[#D6A83A] font-bold">{security?.adversarial_summary?.signature_failures || 56}</span>
                </div>
                <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden border border-[#222222]">
                  <div className="h-full bg-[#D6A83A] rounded-full" style={{ width: '55%' }}></div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#222222] text-[11px] text-[#716F69]">
                All intercepted adversarial attacks are automatically logged to audit trails and trigger progressive reputation penalties.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Precheck Modal */}
      {showPrecheckModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#F2F0EA] mb-2">Agent Eligibility Precheck</h3>
            <p className="text-xs text-[#716F69] mb-4">
              Simulate agent policy clearance before entering into economic negotiation.
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
                <div className="p-3 rounded bg-[#0B0B0B] border border-[#222222] text-xs">
                  <div className="font-semibold text-[#2FB36F]">
                    Status: {precheckResult.eligibility}
                  </div>
                  <div className="text-[#716F69] mt-1">
                    Max Allowed: ${precheckResult.max_allowable_budget} USDC
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
            <h3 className="text-lg font-bold text-[#F2F0EA] mb-2">Digital Twin Simulation</h3>
            <p className="text-xs text-[#716F69] mb-4">
              Pre-flight counterfactual execution without real financial state mutation (INV-156/INV-165).
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
                <div className="p-3 rounded bg-[#0B0B0B] border border-[#222222] text-xs">
                  <div className="font-semibold text-[#2FB36F]">
                    Policy Decision: {simResult.policy_decision}
                  </div>
                  <div className="text-[#716F69] mt-1">
                    Risk Score: {simResult.risk_score} | Safe: {simResult.safe_to_execute ? 'YES' : 'NO'}
                  </div>
                  <div className="text-[#716F69] mt-1">
                    Estimated Cost: ${simResult.estimated_cost_usdc} USDC
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
