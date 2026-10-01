'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchProtocolAgent,
  runProtocolPrecheck,
  ProtocolAgentManifest,
} from '../../../../../lib/api/protocol';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = (params?.id as string) || '';
  const [agent, setAgent] = useState<ProtocolAgentManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [precheckResult, setPrecheckResult] = useState<any>(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!agentId) {
        setLoading(false);
        setError('No agent ID provided');
        return;
      }
      setLoading(true);
      try {
        const data = await fetchProtocolAgent(agentId);
        if (!data) {
          setError(`Agent not found: ${agentId}`);
        } else {
          setAgent(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error fetching agent:', err);
        setError(err?.message || `Failed to load agent ${agentId}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId]);

  async function handleQuickPrecheck() {
    if (!agent) return;
    setPrecheckLoading(true);
    try {
      const res = await runProtocolPrecheck({
        agent_id: agent.agent_id,
        capability: agent.capabilities[0]?.capability_id || 'market-research@1.0',
        estimated_amount: '50.00',
        currency: 'USDC',
      });
      setPrecheckResult(res);
    } catch (err: any) {
      setPrecheckResult({
        eligibility: 'INELIGIBLE',
        reasons: [`Precheck evaluation error: ${err.message || 'Gateway error'}`],
        max_allowable_budget: '0.00',
      });
    } finally {
      setPrecheckLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#716F69] p-8 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3 text-[#D6A83A]">
          <span className="h-3 w-3 rounded-full bg-[#D6A83A] animate-ping" />
          Loading agent profile...
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8 flex flex-col items-center justify-center font-mono">
        <div className="p-6 rounded-xl border border-[#D85C5C]/40 bg-[#141414] max-w-md w-full text-center">
          <div className="text-sm font-bold text-[#D85C5C] mb-2">Agent Not Found</div>
          <p className="text-xs text-[#716F69] mb-4">{error || `No agent found matching ID "${agentId}"`}</p>
          <Link
            href="/control/protocol"
            className="inline-block px-4 py-2 rounded-lg text-xs font-bold bg-[#D6A83A] hover:bg-[#c49731] text-[#080808] transition"
          >
            ← Back to Protocol Overview
          </Link>
        </div>
      </div>
    );
  }

  const currentAgent = agent;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Back button & Title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/control/protocol"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
          >
            ← Back to Protocol Overview
          </Link>
          <span className="text-xs font-mono text-[#50504C]">/</span>
          <span className="text-xs font-mono text-[#D6A83A]">{currentAgent.agent_id}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
            SIMULATED AGENT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickPrecheck}
            disabled={precheckLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition font-mono"
          >
            {precheckLoading ? 'Evaluating...' : 'Run Policy Precheck'}
          </button>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 font-mono">
            ● SIMULATED {currentAgent.availability}
          </span>
        </div>
      </div>

      {precheckResult && (
        <div className="mb-6 p-4 rounded-xl bg-[#101010] border border-[#2FB36F]/40 text-xs font-mono space-y-1.5">
          <div className="flex justify-between items-center text-[#2FB36F] font-bold">
            <span>PRECHECK OUTCOME: {precheckResult.eligibility}</span>
            <button onClick={() => setPrecheckResult(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
          </div>
          <div className="text-[#716F69]">
            Max Allowable Budget Ceiling: ${precheckResult.max_allowable_budget || '0.00'} USDC
          </div>
          {precheckResult.reasons && (
            <div className="text-[11px] text-[#A09D94] pt-1 space-y-0.5">
              {precheckResult.reasons.map((r: string, i: number) => (
                <div key={i}>✓ {r}</div>
              ))}
            </div>
          )}
          <div className="text-[10px] text-[#D6A83A] pt-1">
            Enforced Boundary: Read-only simulation. Zero private keys held. No broadcast performed.
          </div>
        </div>
      )}

      {/* Main Profile Header */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#716F69]">
                External Protocol Agent Profile
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                DEMO FIXTURE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F0EA] mt-1">
              {currentAgent.display_name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#716F69] mt-2">
              <span>
                Organization:{' '}
                <strong className="text-[#F2F0EA]">{currentAgent.organization_id}</strong>{' '}
                <span className="text-[10px] text-[#50504C]">(DEMO ORG)</span>
              </span>
              <span>•</span>
              <span>Registered: {currentAgent.registered_at || 'Simulated Manifest'}</span>
              <span>•</span>
              <span>Heartbeat: {currentAgent.last_heartbeat_at || 'Simulated Active'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Reputation</div>
              <div className="text-2xl font-extrabold text-[#2FB36F] mt-0.5">
                ★ {currentAgent.reputation_score !== undefined ? `${currentAgent.reputation_score}/100` : 'N/A'}
              </div>
              <div className="text-[9px] text-[#716F69] font-mono">SIMULATED SCORE</div>
            </div>
            <div className="border-l border-[#222222] pl-6">
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Financial Authority</div>
              <div className="text-xs font-mono font-bold text-[#D6A83A] mt-1">
                CLOSED (INV-161)
              </div>
              <div className="text-[10px] text-[#716F69] font-mono">Settles strictly via AgentPay</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Boundary & Policy Enclosure */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-5 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA]">
            Strict Financial Boundary (Inviolable Axiom)
          </h2>
          <span className="text-[10px] font-mono text-[#2FB36F] font-bold">INV-161 TO INV-180 ACTIVE</span>
        </div>
        <p className="text-xs text-[#716F69] mb-4">
          Autonomy can expand; financial authority cannot. External agents are completely isolated from raw private keys and ledger mutations.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">Private Keys</div>
            <div className="text-[#2FB36F] font-bold mt-1">NONE HELD</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">INV-162 Enforced</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">Direct Signer Access</div>
            <div className="text-[#2FB36F] font-bold mt-1">BLOCKED</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">INV-161 Enforced</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">Direct AgentVault Access</div>
            <div className="text-[#2FB36F] font-bold mt-1">PROHIBITED</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">INV-164 Enforced</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">Execution Pathway</div>
            <div className="text-[#D6A83A] font-bold mt-1">AGENTPAY ONLY</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">Policy & Gate Protected</div>
          </div>
        </div>
      </div>

      {/* Cryptographic & Protocol Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-4">
            Cryptographic Identity & Endpoint
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Public Key (Ed25519)</div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] text-[#D6A83A] break-all">
                {currentAgent.public_key || 'ed25519:unspecified'}
              </div>
            </div>
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Callback Endpoint URL</div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] break-all">
                {currentAgent.endpoint_url || 'https://agents.agentpay.arc/task'}
              </div>
            </div>
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Supported Protocols</div>
              <div className="flex gap-2">
                {(currentAgent.supported_protocols || ['agentpay.protocol.v1']).map((p) => (
                  <span key={p} className="px-2.5 py-1 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] text-xs">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-4">
            Policy & Security Verification
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Manifest Registry Verification</div>
                <div className="text-[#716F69] text-[11px] font-mono">Enforces INV-162 canonical source of truth</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs font-mono">
                {currentAgent.capabilities?.length > 0 ? 'VALID' : 'INVALID'}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Recipient Address Injection Defense</div>
                <div className="text-[#716F69] text-[11px] font-mono">Enforces INV-163 directory binding</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs font-mono">BOUND</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Deterministic Nonce Freshness</div>
                <div className="text-[#716F69] text-[11px] font-mono">Enforces INV-170 replay protection</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs font-mono">ACTIVE</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Reputation Authority Ceiling</div>
                <div className="text-[#716F69] text-[11px] font-mono">Enforces INV-180 (no financial override)</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs font-mono">RESTRICTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities Catalog */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-4">
          Published Service Capabilities ({currentAgent.capabilities?.length || 0})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentAgent.capabilities || []).map((c) => (
            <div key={c.capability_id} className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[#F2F0EA] text-base">{c.name}</h3>
                  <p className="text-xs text-[#716F69] mt-1">{c.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30 text-xs font-mono font-semibold">
                  ${c.base_price_usdc} USDC
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#222222] text-xs font-mono">
                <div>
                  <span className="text-[#716F69]">Pricing Model:</span>{' '}
                  <span className="text-[#F2F0EA]">{c.pricing_model}</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Target SLA:</span>{' '}
                  <span className="text-[#F2F0EA]">{c.sla_seconds}s</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Verification:</span>{' '}
                  <span className="text-[#D6A83A]">{c.verification_method}</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Min Reputation:</span>{' '}
                  <span className="text-[#2FB36F]">★ {c.reputation_minimum}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
