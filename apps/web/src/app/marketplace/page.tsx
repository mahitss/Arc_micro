'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMarketplaceServices } from '../../lib/api/missions';
import { discoverAgents } from '../../lib/api/a2a';
import { MarketplaceService, AgentService } from '../../lib/api/types';

export default function MarketplacePage() {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [peerAgents, setPeerAgents] = useState<AgentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [servicesData, agentsData] = await Promise.allSettled([
          fetchMarketplaceServices(),
          discoverAgents(),
        ]);
        if (servicesData.status === 'fulfilled') {
          setServices(servicesData.value);
        }
        if (agentsData.status === 'fulfilled') {
          setPeerAgents(agentsData.value);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = ['ALL', 'AGENT', 'RESEARCH', 'COMPUTE', 'DATA'];

  const filteredServices =
    selectedCategory === 'ALL'
      ? services
      : selectedCategory === 'AGENT'
      ? []
      : services.filter((s) => s.category.toUpperCase() === selectedCategory);

  const filteredAgents =
    selectedCategory === 'ALL' || selectedCategory === 'AGENT'
      ? peerAgents
      : [];

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Service Marketplace</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Agent-to-Agent & API Services
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Deterministic registry of vetted external services and peer AI agents.
            Autonomous agents hire and pay these providers using cryptographic quotes under policy controls.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>INV-E5: Authoritative Recipient Binding</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg border transition-colors ${
              selectedCategory === cat
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading vetted economic services...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-lg shadow-black/20 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-semibold text-white">{svc.name}</h3>
                      {svc.verified && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-500">{svc.id}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700">
                    {svc.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{svc.description}</p>

                {/* Capabilities Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {svc.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Economic Telemetry Box */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">SUCCESS RATE</span>
                    <span className="text-emerald-400 font-bold">
                      {(svc.success_rate_bps / 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">AVG LATENCY</span>
                    <span className="text-cyan-300 font-bold">{svc.average_latency_ms} ms</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">MAX PRICE</span>
                    <span className="text-white font-bold">{formatUsdc(svc.max_price)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Settlement Recipient:</span>
                  <span className="text-slate-400">
                    {svc.recipient.slice(0, 8)}...{svc.recipient.slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredAgents.map((agent) => (
            <div
              key={`${agent.agent_id}-${agent.service_id}`}
              className="p-6 rounded-xl bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-500/60 transition-all space-y-4 shadow-lg shadow-black/20 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        PEER AGENT
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{agent.agent_id}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                    {agent.availability || 'ONLINE'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{agent.description}</p>

                {/* Capabilities Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {agent.capabilities?.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Economic Telemetry & Action Box */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">REPUTATION</span>
                    <span className="text-emerald-400 font-bold">
                      {((agent.reputation || 0) / 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">BASE PRICE</span>
                    <span className="text-white font-bold">{formatUsdc(agent.base_price)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">PRICING</span>
                    <span className="text-cyan-300 font-bold">{agent.pricing_model}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/marketplace/agents/${agent.agent_id}`}
                    className="block w-full py-2 px-3 text-center rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-semibold text-xs border border-cyan-500/40 transition-colors"
                  >
                    Negotiate &amp; Hire Agent &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
