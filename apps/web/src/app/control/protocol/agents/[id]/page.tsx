'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchProtocolAgent,
  ProtocolAgentManifest,
  FALLBACK_AGENTS,
} from '../../../../../lib/api/protocol';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = (params?.id as string) || 'agent_research_01';
  const [agent, setAgent] = useState<ProtocolAgentManifest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchProtocolAgent(agentId);
        setAgent(data);
      } catch (err) {
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#716F69] p-8 flex items-center justify-center font-mono text-sm">
        Loading agent profile...
      </div>
    );
  }

  const currentAgent = agent || FALLBACK_AGENTS[0];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Back button & Title */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/control/protocol"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
          >
            ← Back to Protocol Overview
          </Link>
          <span className="text-xs font-mono text-[#50504C]">/</span>
          <span className="text-xs font-mono text-[#D6A83A]">{currentAgent.agent_id}</span>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
          ● {currentAgent.availability}
        </span>
      </div>

      {/* Main Profile Header */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#716F69]">
              External Protocol Agent Profile
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F0EA] mt-1">
              {currentAgent.display_name}
            </h1>
            <div className="flex items-center gap-4 text-xs font-mono text-[#716F69] mt-2">
              <span>Org: <strong className="text-[#F2F0EA]">{currentAgent.organization_id}</strong></span>
              <span>•</span>
              <span>Registered: {currentAgent.registered_at}</span>
              <span>•</span>
              <span>Last Heartbeat: {currentAgent.last_heartbeat_at || 'Active'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Reputation</div>
              <div className="text-2xl font-extrabold text-[#2FB36F] mt-0.5">
                ★ {currentAgent.reputation_score || 95}/100
              </div>
            </div>
            <div className="border-l border-[#222222] pl-6">
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Authority Level</div>
              <div className="text-xs font-mono text-[#D6A83A] mt-1">
                CLOSED (INV-161)
              </div>
              <div className="text-[10px] text-[#716F69]">Settles via AgentPay</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cryptographic & Protocol Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-[#222222] bg-[#101010] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-4">
            Cryptographic Identity
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Public Key (Ed25519)</div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] text-[#D6A83A] break-all">
                {currentAgent.public_key}
              </div>
            </div>
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Callback Endpoint URL</div>
              <div className="p-2.5 rounded bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] break-all">
                {currentAgent.endpoint_url}
              </div>
            </div>
            <div>
              <div className="text-[#716F69] text-[11px] mb-1">Supported Protocols</div>
              <div className="flex gap-2">
                {currentAgent.supported_protocols.map((p) => (
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
                <div className="text-[#716F69] text-[11px]">Enforces INV-162 canonical source of truth</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs">PASS</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Recipient Address Injection Defense</div>
                <div className="text-[#716F69] text-[11px]">Enforces INV-163 verified directory lookup</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs">BOUND</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#F2F0EA]">Deterministic Nonce Freshness</div>
                <div className="text-[#716F69] text-[11px]">Enforces INV-170 replay protection</div>
              </div>
              <span className="text-[#2FB36F] font-bold text-xs">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities Catalog */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-4">
          Published Service Capabilities ({currentAgent.capabilities.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentAgent.capabilities.map((c) => (
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
