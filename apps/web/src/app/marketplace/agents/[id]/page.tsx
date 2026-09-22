'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getAgentServices,
  requestAgentQuote,
  counterAgentQuote,
  acceptAgentQuote,
  createHire,
  executeHirePayment,
} from '@/lib/api/a2a';
import type { AgentQuote, AgentService, Hire } from '@/lib/api/types';

export default function AgentNegotiationPage() {
  const params = useParams();
  const agentId = (params?.id as string) || 'agent_research_01';

  const [services, setServices] = useState<AgentService[]>([]);
  const [selectedService, setSelectedService] = useState<AgentService | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Negotiation State
  const [activeQuote, setActiveQuote] = useState<AgentQuote | null>(null);
  const [proposedPrice, setProposedPrice] = useState<string>('300000');
  const [negotiating, setNegotiating] = useState<boolean>(false);
  const [hire, setHire] = useState<Hire | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgent() {
      setLoading(true);
      setError(null);
      try {
        const svcs = await getAgentServices(agentId);
        if (svcs.length > 0) {
          setServices(svcs);
          setSelectedService(svcs[0]);
          setProposedPrice(svcs[0].base_price || '300000');
        } else {
          // Fallback if not loaded yet
          const fallbackSvc: AgentService = {
            agent_id: agentId,
            service_id: 'web-research',
            organization_id: 'org_default',
            name: `${agentId} Specialized Service`,
            description: 'Autonomous peer agent providing verifiable research, data extraction, and computation.',
            capabilities: ['data_extraction', 'search', 'summarization'],
            pricing_model: 'VARIABLE',
            base_price: '300000',
            max_price: '1000000',
            supported_assets: ['USDC'],
            availability: 'ONLINE',
            reputation: 9850,
            success_rate_bps: 9940,
            average_latency_ms: 180,
            risk_profile: 'LOW',
            enabled: true,
            verified: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setServices([fallbackSvc]);
          setSelectedService(fallbackSvc);
          setProposedPrice(fallbackSvc.base_price);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent profile');
      } finally {
        setLoading(false);
      }
    }
    loadAgent();
  }, [agentId]);

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  const handleRequestQuote = async () => {
    if (!selectedService) return;
    setNegotiating(true);
    setError(null);
    try {
      const q = await requestAgentQuote(selectedService.service_id, {
        buyer_agent_id: 'agent_coordinator_01',
        proposed_price: proposedPrice,
        mission_id: 'mission_root_demo',
      });
      setActiveQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quote request failed');
    } finally {
      setNegotiating(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!activeQuote) return;
    setNegotiating(true);
    setError(null);
    try {
      const q = await counterAgentQuote(activeQuote.quote_id, {
        agent_id: 'agent_coordinator_01',
        proposed_price: proposedPrice,
      });
      setActiveQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Counter offer failed');
    } finally {
      setNegotiating(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!activeQuote) return;
    setNegotiating(true);
    setError(null);
    try {
      const accepted = await acceptAgentQuote(activeQuote.quote_id);
      setActiveQuote(accepted);

      // Create hire agreement
      const createdHire = await createHire({
        buyer_agent_id: 'agent_coordinator_01',
        quote_id: accepted.quote_id,
        mission_id: 'mission_root_demo',
        expected_result: 'structured_verified_output',
      });
      setHire(createdHire);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acceptance failed');
    } finally {
      setNegotiating(false);
    }
  };

  const handleExecutePayment = async () => {
    if (!hire) return;
    setNegotiating(true);
    setPaymentStatus('Routing to AgentPay Policy Engine...');
    try {
      const paid = await executeHirePayment(hire.id);
      setHire(paid);
      setPaymentStatus('Payment Confirmed on Arc! Funds disbursed to server-resolved recipient.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment authorization failed');
      setPaymentStatus(null);
    } finally {
      setNegotiating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              &larr; Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">{agentId}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Peer Agent Negotiation &amp; Hiring
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated inter-agent price negotiation under non-bypassable policy guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">Financial Control Plane: AgentPay</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading peer agent capabilities and telemetry...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Capability & Telemetry Overview */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedService?.name}</h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{agentId}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {selectedService?.availability || 'ONLINE'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedService?.description}
              </p>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-mono text-slate-400 block mb-2">Capabilities:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedService?.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-center font-mono text-xs">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">REPUTATION</span>
                  <span className="text-emerald-400 font-bold">
                    {((selectedService?.reputation || 0) / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">BASE PRICE</span>
                  <span className="text-white font-bold">{formatUsdc(selectedService?.base_price)}</span>
                </div>
              </div>
            </div>

            {/* Invariants Assurance Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs font-mono">
              <span className="text-teal-400 font-bold block mb-1">AgentPay Non-Bypassable Guarantees:</span>
              <div className="text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">&check;</span> Keyless Agent — Zero Private Keys
              </div>
              <div className="text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">&check;</span> Server-Resolved Recipient Binding
              </div>
              <div className="text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">&check;</span> Hard Recursion Ceiling (Depth &le; 3)
              </div>
              <div className="text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">&check;</span> Deterministic Arc Settlement
              </div>
            </div>
          </div>

          {/* Interactive Negotiation & Hiring Console */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Economic Negotiation Engine
                </h3>
                {activeQuote && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Quote Status: {activeQuote.status}
                  </span>
                )}
              </div>

              {/* Negotiation Flow Step 1: Initial Offer / Counter */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block">Proposed Price (micro-USDC):</label>
                    <span className="text-[11px] font-mono text-slate-500">
                      Standard Range: {formatUsdc(selectedService?.base_price)} &mdash; {formatUsdc(selectedService?.max_price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      disabled={activeQuote?.status === 'ACCEPTED' || negotiating}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-teal-500 w-36 text-right"
                    />
                    <span className="text-xs font-mono text-slate-400">({formatUsdc(proposedPrice)})</span>
                  </div>
                </div>

                {!activeQuote ? (
                  <button
                    onClick={handleRequestQuote}
                    disabled={negotiating}
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50"
                  >
                    {negotiating ? 'Requesting Cryptographic Quote...' : 'Request Formal Quote &rarr;'}
                  </button>
                ) : activeQuote.status !== 'ACCEPTED' ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCounterOffer}
                      disabled={negotiating}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono font-semibold text-xs border border-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      Counter-Offer ({formatUsdc(proposedPrice)})
                    </button>
                    <button
                      onClick={handleAcceptQuote}
                      disabled={negotiating}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      Accept Quote ({formatUsdc(activeQuote.price)})
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Active Quote Transcript */}
              {activeQuote && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Quote ID:</span>
                    <span className="text-white font-medium">{activeQuote.quote_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Binding Price:</span>
                    <span className="text-emerald-400 font-bold">{formatUsdc(activeQuote.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Quality Guarantee:</span>
                    <span className="text-slate-200">{(activeQuote.quality / 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Estimated Latency:</span>
                    <span className="text-slate-200">{activeQuote.estimated_latency_ms} ms</span>
                  </div>

                  {activeQuote.negotiation_rounds && activeQuote.negotiation_rounds.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block mb-1">Negotiation History:</span>
                      <div className="space-y-1">
                        {activeQuote.negotiation_rounds.map((r) => (
                          <div key={r.round} className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Round {r.round} ({r.proposer_agent_id}):</span>
                            <span className="text-amber-300">{formatUsdc(r.proposed_price)} ({r.status})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hire Execution Card */}
              {hire && (
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">
                        Binding Hire Agreement Formed
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">Hire ID: {hire.id}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {hire.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Agreement locked at <strong className="text-white">{formatUsdc(hire.price)}</strong>. Payment requires execution through AgentPay canonical policy, risk, and treasury verification gates.
                  </p>

                  {hire.status === 'CREATED' && (
                    <button
                      onClick={handleExecutePayment}
                      disabled={negotiating}
                      className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {negotiating ? 'Verifying Financial Policy & Signer...' : 'Authorize & Execute Arc USDC Payment \u2192'}
                    </button>
                  )}

                  {paymentStatus && (
                    <div className="p-3 rounded bg-slate-950 border border-emerald-500/30 font-mono text-xs text-emerald-300">
                      {paymentStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
