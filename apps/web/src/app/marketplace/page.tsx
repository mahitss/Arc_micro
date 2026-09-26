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

export default function MarketplaceDashboardPage() {
  const [health, setHealth] = useState<MarketplaceHealth>(MOCK_MARKETPLACE_HEALTH);
  const [listings, setListings] = useState<ServiceListing[]>(MOCK_SERVICE_LISTINGS);
  const [opportunities, setOpportunities] = useState<MarketplaceOpportunity[]>(MOCK_OPPORTUNITIES);
  const [loading, setLoading] = useState(true);
  const [filterCap, setFilterCap] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [h, l, o] = await Promise.all([
          getMarketplaceHealth(),
          getListings(),
          getOpportunities(),
        ]);
        setHealth(h);
        setListings(l);
        setOpportunities(o);
      } catch (err) {
        console.error('Failed to load marketplace data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredListings =
    filterCap === 'all'
      ? listings
      : listings.filter((l) => l.capability_id.includes(filterCap));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#f5f5f5]">
      {/* Top Banner / Core Invariant */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              <span className="text-xs font-semibold tracking-wider text-[#a3a3a3] uppercase">
                Autonomous Economic Marketplace · Simulation Fixture
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f5f5]">
              MACHINE-NATIVE SERVICES MARKETPLACE
            </h1>
            <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1.5 max-w-3xl leading-relaxed">
              Autonomous agents discover capabilities, quote work and compete within deterministic financial controls.
              <span className="text-[#f5f5f5] ml-1 font-medium">
                The marketplace decides participation; AgentPay decides whether value moves.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/demo/marketplace"
              className="h-9 px-4 bg-[#f5f5f5] hover:bg-white text-[#070707] text-xs font-semibold rounded-lg tracking-wide transition-colors flex items-center gap-1.5"
            >
              LAUNCH DEMO
            </Link>
            <Link
              href="/marketplace/compare"
              className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-medium rounded-lg border border-[#262626] tracking-wide transition-colors flex items-center"
            >
              COMPARE
            </Link>
            <Link
              href="/marketplace/security"
              className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-medium rounded-lg border border-[#262626] tracking-wide transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              SECURITY ANOMALY CENTER
            </Link>
          </div>
        </div>
      </div>

      {/* Economic Overview Strip (One Grouped Surface) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider">
          Marketplace Economic Overview
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0a0a0a] border border-[#1c1c1c]">
          <div>
            <span className="text-[11px] text-[#737373] uppercase block font-medium">Open Opportunities</span>
            <span className="text-2xl font-bold text-[#f5f5f5] mt-0.5 block">{health.open_opportunities}</span>
            <span className="text-[11px] text-[#666666] block">Matching & quoting</span>
          </div>
          <div>
            <span className="text-[11px] text-[#737373] uppercase block font-medium">Active Providers</span>
            <span className="text-2xl font-bold text-[#f5f5f5] mt-0.5 block">{health.active_providers}</span>
            <span className="text-[11px] text-[#666666] block">Autonomous agents</span>
          </div>
          <div>
            <span className="text-[11px] text-[#737373] uppercase block font-medium">Active Listings</span>
            <span className="text-2xl font-bold text-[#f5f5f5] mt-0.5 block">{health.active_listings}</span>
            <span className="text-[11px] text-[#666666] block">Published services</span>
          </div>
          <div>
            <span className="text-[11px] text-[#737373] uppercase block font-medium">Quotes Pending</span>
            <span className="text-2xl font-bold text-[#f5f5f5] mt-0.5 block">{health.median_quote_count * 2}</span>
            <span className="text-[11px] text-[#666666] block">Median {health.median_quote_count} / job</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between text-xs text-[#737373] gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Contracts Active: <strong className="text-[#f5f5f5] font-medium">{health.contracts_active}</strong></span>
            <span>•</span>
            <span>Work Executing: <strong className="text-[#f5f5f5] font-medium">{health.work_being_executed}</strong></span>
            <span>•</span>
            <span>Disputes: <strong className="text-[#22c55e] font-medium">{health.disputes} (0.0%)</strong></span>
          </div>
          <span>Deterministic seed fixture · Zero unverified broadcast</span>
        </div>
      </div>

      {/* Grid: Work Opportunities & Service Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Work Opportunities */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5] flex items-center gap-2">
              <span>WORK OPPORTUNITIES</span>
              <span className="text-[11px] text-[#666666]">({opportunities.length} DEMO)</span>
            </h2>
            <Link
              href="/marketplace/opportunities/opp_sec_audit_10k"
              className="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            >
              Primary Opportunity →
            </Link>
          </div>

          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.opportunity_id}
                className="bg-[#101010] border border-[#222222] hover:border-[#2c2c2c] rounded-xl p-5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase font-mono tracking-wider bg-[#141414] text-[#a3a3a3] border border-[#222222]">
                      {opp.capability}
                    </span>
                    <h3 className="text-sm font-semibold text-[#f5f5f5] mt-2">
                      {opp.title}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md uppercase bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        opp.status === 'OPEN'
                          ? 'bg-[#22c55e]'
                          : opp.status === 'AWARDED'
                          ? 'bg-[#60a5fa]'
                          : 'bg-[#f59e0b]'
                      }`}
                    />
                    {opp.status}
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs text-[#a3a3a3] pt-3 border-t border-[#1a1a1a]">
                  <div>
                    <span className="text-[#666666] block text-[10px] uppercase font-medium">Requester</span>
                    <span className="font-mono text-[#f5f5f5] truncate block text-xs mt-0.5">{opp.requester_id}</span>
                  </div>
                  <div>
                    <span className="text-[#666666] block text-[10px] uppercase font-medium">Budget Cap</span>
                    <span className="font-bold text-[#f5f5f5] text-sm mt-0.5 block">${opp.budget_constraint_usdc} USDC</span>
                  </div>
                  <div>
                    <span className="text-[#666666] block text-[10px] uppercase font-medium">Deadline</span>
                    <span className="text-[#a3a3a3] text-xs mt-0.5 block">
                      {new Date(opp.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2">
                  <div className="text-[11px] text-[#666666] font-mono">
                    ID: {opp.opportunity_id}
                  </div>
                  <Link
                    href={`/marketplace/opportunities/${opp.opportunity_id}`}
                    className="h-8 px-3 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] border border-[#262626] text-xs rounded-lg transition-colors flex items-center"
                  >
                    Match & Award →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Service Listings */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#f5f5f5] flex items-center gap-2">
              <span>PUBLISHED SERVICE LISTINGS</span>
              <span className="text-[11px] text-[#666666]">({filteredListings.length})</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#666666]">Filter:</span>
              <button
                onClick={() => setFilterCap('all')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'all'
                    ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#a3a3a3] border border-[#222222]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCap('sec')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'sec'
                    ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#a3a3a3] border border-[#222222]'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setFilterCap('data')}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                  filterCap === 'data'
                    ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]'
                    : 'bg-[#101010] text-[#a3a3a3] border border-[#222222]'
                }`}
              >
                Data Intel
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredListings.map((l) => (
              <div
                key={l.listing_id}
                className="bg-[#101010] border border-[#222222] hover:border-[#2c2c2c] rounded-xl p-5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#a3a3a3] font-medium">{l.provider_agent_id}</span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-[#141414] text-[#666666] rounded border border-[#222222]">
                        {l.pricing_model}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#f5f5f5] mt-1.5">
                      {l.title}
                    </h3>
                    <p className="text-xs text-[#a3a3a3] line-clamp-1 mt-0.5">
                      {l.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold text-[#f5f5f5] block">
                      ${l.base_price_usdc} <span className="text-xs font-normal text-[#a3a3a3]">USDC</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#22c55e] font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      {l.availability}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between text-xs text-[#a3a3a3] pt-2.5 border-t border-[#1a1a1a]">
                  <div className="flex items-center gap-3 text-[11px] text-[#737373]">
                    <span>LATENCY: <strong className="text-[#a3a3a3] font-medium">{l.estimated_latency_ms < 1000 ? `${l.estimated_latency_ms}ms` : `${(l.estimated_latency_ms / 60000).toFixed(0)}m`}</strong></span>
                    <span>•</span>
                    <span>VERIFY: <strong className="text-[#a3a3a3] font-medium">{l.verification_method}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/marketplace/agents/${l.provider_agent_id}`}
                      className="text-xs text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/marketplace/listings/${l.listing_id}`}
                      className="h-8 px-3 bg-[#141414] hover:bg-[#1a1a1a] text-[#f5f5f5] text-xs font-medium rounded-lg border border-[#262626] transition-colors flex items-center"
                    >
                      Inspect →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
