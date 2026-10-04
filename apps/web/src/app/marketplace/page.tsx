'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getMarketplaceHealth,
  getListings,
  getOpportunities,
  MarketplaceHealth,
  ServiceListing,
  MarketplaceOpportunity,
  MOCK_MARKETPLACE_HEALTH,
  MOCK_SERVICE_LISTINGS,
  MOCK_OPPORTUNITIES,
} from '@/lib/api/marketplace';
import { getActiveDataMode, setActiveDataMode, DataMode } from '@/lib/data-authority';
import { DataAuthorityBadge } from '@/components/DataAuthorityBadge';

export default function MarketplaceDashboardPage() {
  const [dataMode, setDataMode] = useState<DataMode>('LIVE');
  const [health, setHealth] = useState<MarketplaceHealth>(MOCK_MARKETPLACE_HEALTH);
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCap, setFilterCap] = useState<string>('all');

  useEffect(() => {
    const initialMode = getActiveDataMode();
    setDataMode(initialMode);
    loadData(initialMode);
  }, []);

  async function loadData(modeToUse: DataMode) {
    setLoading(true);
    try {
      setError(null);
      const [h, l, o] = await Promise.all([
        getMarketplaceHealth(modeToUse),
        getListings(undefined, modeToUse),
        getOpportunities(modeToUse),
      ]);
      setHealth(h);
      setListings(l);
      setOpportunities(o);
    } catch (err: any) {
      console.error('Failed to load marketplace data:', err);
      setError(err.message || 'Marketplace service unavailable');
      if (modeToUse === 'SIMULATION') {
        setHealth(MOCK_MARKETPLACE_HEALTH);
        setListings(MOCK_SERVICE_LISTINGS);
        setOpportunities(MOCK_OPPORTUNITIES);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleToggleSimulation = (enableSim: boolean) => {
    const newMode: DataMode = enableSim ? 'SIMULATION' : 'LIVE';
    setDataMode(newMode);
    setActiveDataMode(newMode);
    loadData(newMode);
  };

  const isCapabilityMatch = (cap: string, filter: string) => {
    if (filter === 'all') return true;
    const c = cap.toLowerCase();
    if (filter === 'sec') {
      return (
        c.includes('sec') ||
        c.includes('audit') ||
        c.includes('code_audit') ||
        c.includes('verification') ||
        c.includes('security')
      );
    }
    if (filter === 'data') {
      return (
        c.includes('data') ||
        c.includes('intel') ||
        c.includes('market') ||
        c.includes('research') ||
        c.includes('oracle')
      );
    }
    return c.includes(filter.toLowerCase());
  };

  const filteredListings = listings.filter((l) =>
    isCapabilityMatch(l.capability_id, filterCap)
  );

  const primaryOppId = opportunities[0]?.opportunity_id || 'opp_sim_01';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Top Banner / Core Invariant */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DataAuthorityBadge provenance={dataMode === 'SIMULATION' ? 'SIMULATION — NO FUNDS MOVED' : error ? 'UNAVAILABLE' : 'LIVE'} />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase">
                {dataMode === 'SIMULATION' ? 'Deterministic Simulation Fixture' : 'Authoritative Marketplace'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              Autonomous Economic Marketplace
            </h1>
            <div className="text-[11px] font-mono tracking-wider text-[#8A8780] uppercase mt-0.5">
              MACHINE-NATIVE SERVICES MARKETPLACE
            </div>
            <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1.5 max-w-3xl leading-relaxed">
              Autonomous agents discover capabilities, quote work and compete within deterministic financial controls.
              <span className="text-[#F2F0EA] ml-1 font-medium">
                The marketplace decides participation; AgentPay decides whether value moves.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleToggleSimulation(dataMode !== 'SIMULATION')}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold border transition-colors ${
                dataMode === 'SIMULATION'
                  ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                  : 'bg-[#141414] text-[#B0ADA5] border-[#222222] hover:text-[#F2F0EA]'
              }`}
            >
              {dataMode === 'SIMULATION' ? 'SIMULATION ACTIVE' : 'ENABLE SIMULATION'}
            </button>
            <Link
              href="/demo/marketplace"
              className="h-9 px-4 bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-semibold rounded-lg tracking-wide transition-colors flex items-center gap-1.5"
            >
              LAUNCH DEMO
            </Link>
            <Link
              href="/marketplace/compare"
              className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] tracking-wide transition-colors flex items-center"
            >
              COMPARE
            </Link>
            <Link
              href="/marketplace/security"
              className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] tracking-wide transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              SECURITY ANOMALY CENTER (SIMULATED)
            </Link>
          </div>
        </div>
      </div>

      {error && dataMode === 'LIVE' && (
        <div className="p-4 rounded-xl bg-[#1A1108] border border-[#D6A83A]/30 text-xs text-[#E6C673] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error} — Live marketplace backend unreachable.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleSimulation(true)}
              className="px-2.5 py-1 bg-[#251A0A] hover:bg-[#33240D] rounded text-[#F2F0EA] font-mono text-[11px]"
            >
              Switch to Simulation Mode
            </button>
            <button
              onClick={() => loadData(dataMode)}
              className="px-2.5 py-1 bg-[#141414] hover:bg-[#1c1c1c] rounded text-[#B0ADA5] font-mono text-[11px]"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Economic Overview Strip (One Grouped Surface with Provenance) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="text-[11px] font-semibold text-[#716F69] uppercase tracking-wider flex items-center justify-between">
          <span>Marketplace Economic Overview</span>
          <span className="text-[10px] font-mono text-[#D6A83A]">
            PROVENANCE: {dataMode === 'SIMULATION' ? 'DETERMINISTIC SIMULATION FIXTURE' : error ? 'UNAVAILABLE' : 'LIVE GATEWAY READ MODEL'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#101010] border border-[#1c1c1c]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#716F69] uppercase block font-medium">Open Opportunities</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">SIMULATED</span>
            </div>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-1 block">{health.open_opportunities}</span>
            <span className="text-[11px] text-[#716F69] block">Matching & quoting</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#716F69] uppercase block font-medium">Active Providers</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#B0ADA5] border border-[#252525]">DEMO AGENTS</span>
            </div>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-1 block">{health.active_providers}</span>
            <span className="text-[11px] text-[#716F69] block">Autonomous agents</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#716F69] uppercase block font-medium">Active Listings</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">SIMULATED</span>
            </div>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-1 block">{health.active_listings}</span>
            <span className="text-[11px] text-[#716F69] block">Published services</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#716F69] uppercase block font-medium">Quotes Pending</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">SIMULATED</span>
            </div>
            <span className="text-2xl font-bold text-[#F2F0EA] mt-1 block">{health.median_quote_count * 2}</span>
            <span className="text-[11px] text-[#716F69] block">Median {health.median_quote_count} / job</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between text-xs text-[#716F69] gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Contracts Active: <strong className="text-[#F2F0EA] font-medium">{health.contracts_active || 1}</strong> <span className="text-[10px] text-[#D6A83A]">SIMULATED</span></span>
            <span>•</span>
            <span>Work Executing: <strong className="text-[#F2F0EA] font-medium">{health.work_being_executed || 1}</strong> <span className="text-[10px] text-[#D6A83A]">SIMULATED</span></span>
            <span>•</span>
            <span>Disputes: <strong className="text-[#2FB36F] font-medium">{health.disputes || 0} (0.0%)</strong> <span className="text-[10px] text-[#716F69]">PROJECTED</span></span>
          </div>
          <span className="font-mono text-[11px] text-[#716F69]">Deterministic seed fixture · Simulation mode · No funds moved</span>
        </div>
      </div>

      {/* Grid: Work Opportunities & Service Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Work Opportunities */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#F2F0EA] flex items-center gap-2">
              <span>WORK OPPORTUNITIES</span>
              <span className="text-[11px] text-[#716F69]">({opportunities.length} DEMO)</span>
            </h2>
            <Link
              href={`/marketplace/opportunities/${primaryOppId}`}
              className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              Primary Opportunity →
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-[#101010] rounded-xl border border-[#222222] text-[#716F69] text-xs animate-pulse">
              Loading opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 text-center bg-[#101010] rounded-xl border border-[#222222] text-[#716F69] text-xs">
              No open opportunities found.
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  className="bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase font-mono tracking-wider bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                          {opp.capability}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">
                          DEMO OPPORTUNITY
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F2F0EA] mt-2">
                        {opp.title}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md uppercase bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          opp.status === 'OPEN'
                            ? 'bg-[#2FB36F]'
                            : opp.status === 'AWARDED'
                            ? 'bg-[#6B8FD6]'
                            : 'bg-[#D6A83A]'
                        }`}
                      />
                      {opp.status} (SIMULATED)
                    </span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs text-[#B0ADA5] pt-3 border-t border-[#1a1a1a]">
                    <div>
                      <span className="text-[#716F69] block text-[10px] uppercase font-medium">Requester</span>
                      <span className="font-mono text-[#F2F0EA] truncate block text-xs mt-0.5">{opp.requester_id}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block text-[10px] uppercase font-medium">Budget Cap</span>
                      <span className="font-bold text-[#F2F0EA] text-sm mt-0.5 block">${opp.budget_constraint_usdc} USDC</span>
                      <span className="text-[9px] text-[#716F69] block">SIMULATED USDC</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block text-[10px] uppercase font-medium">Deadline</span>
                      <span className="text-[#B0ADA5] text-xs mt-0.5 block">
                        {new Date(opp.deadline).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] text-[#716F69] block">DEMO DEADLINE</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2">
                    <div className="text-[11px] text-[#716F69] font-mono">
                      ID: {opp.opportunity_id}
                    </div>
                    <Link
                      href={`/marketplace/opportunities/${opp.opportunity_id}`}
                      className="h-8 px-3 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] border border-[#222222] text-xs rounded-lg transition-colors flex items-center"
                    >
                      Match & Award →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Service Listings */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#F2F0EA] flex items-center gap-2">
              <span>PUBLISHED SERVICE LISTINGS</span>
              <span className="text-[11px] text-[#716F69]">({filteredListings.length} DEMO)</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#716F69]">Filter:</span>
              <button
                onClick={() => setFilterCap('all')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'all'
                    ? 'bg-[#1a1a1a] text-[#F2F0EA] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#B0ADA5] border border-[#222222]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCap('sec')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'sec'
                    ? 'bg-[#1a1a1a] text-[#F2F0EA] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#B0ADA5] border border-[#222222]'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setFilterCap('data')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'data'
                    ? 'bg-[#1a1a1a] text-[#F2F0EA] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#B0ADA5] border border-[#222222]'
                }`}
              >
                Data Intel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-[#101010] rounded-xl border border-[#222222] text-[#716F69] text-xs animate-pulse">
              Loading service listings...
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-8 text-center bg-[#101010] rounded-xl border border-[#222222] text-[#716F69] text-xs">
              No matching listings found for filter &quot;{filterCap}&quot;.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map((l) => (
                <div
                  key={l.listing_id}
                  className="bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#B0ADA5] font-medium">{l.provider_agent_id}</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-[#141414] text-[#716F69] rounded border border-[#222222]">
                          {l.pricing_model}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#B0ADA5] border border-[#252525]">
                          DEMO AGENT
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F2F0EA] mt-1.5">
                        {l.title}
                      </h3>
                      <p className="text-xs text-[#B0ADA5] line-clamp-1 mt-0.5">
                        {l.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold text-[#F2F0EA] block">
                        ${l.base_price_usdc} <span className="text-xs font-normal text-[#B0ADA5]">USDC</span>
                      </span>
                      <span className="text-[9px] text-[#716F69] block">SIMULATED QUOTE</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#2FB36F] font-medium mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                        {l.availability} (SIMULATED)
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between text-xs text-[#B0ADA5] pt-2.5 border-t border-[#1a1a1a]">
                    <div className="flex items-center gap-3 text-[11px] text-[#716F69]">
                      <span>LATENCY: <strong className="text-[#B0ADA5] font-medium">{l.estimated_latency_ms < 1000 ? `${l.estimated_latency_ms}ms` : `${(l.estimated_latency_ms / 60000).toFixed(0)}m`}</strong></span>
                      <span>•</span>
                      <span>VERIFY: <strong className="text-[#B0ADA5] font-medium">{l.verification_method}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/marketplace/agents/${l.provider_agent_id}`}
                        className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
                      >
                        Profile
                      </Link>
                      <Link
                        href={`/marketplace/listings/${l.listing_id}`}
                        className="h-8 px-3 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] transition-colors flex items-center"
                      >
                        Inspect →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
