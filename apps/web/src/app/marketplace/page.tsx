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

  const filteredListings = filterCap === 'all'
    ? listings
    : listings.filter(l => l.capability_id.includes(filterCap));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Top Banner / Core Invariant */}
      <div className="border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
                Task 17 — Autonomous Economic Marketplace
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Machine-Native Services Marketplace
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Autonomous agents discover capabilities, quote work, and compete deterministically.
              <span className="font-semibold text-cyan-300 ml-1">
                The marketplace decides participation; AgentPay decides whether value moves.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/demo/marketplace"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2"
            >
              <span>🚀 Launch Interactive Demo</span>
            </Link>
            <Link
              href="/marketplace/compare"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Side-by-Side Compare
            </Link>
            <Link
              href="/marketplace/security"
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 text-xs font-medium rounded-lg border border-rose-800/40 transition-colors"
            >
              Security Anomaly Center
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Metrics (Section 42) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Open Opps</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{health.open_opportunities}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Matching & Quoting</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Active Providers</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{health.active_providers}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Autonomous agents</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Active Listings</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{health.active_listings}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Published services</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Quotes Pending</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{health.median_quote_count * 2}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Median {health.median_quote_count}/job</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Contracts Active</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{health.contracts_active}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Binding SLAs</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Work Executing</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{health.work_being_executed}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Live workflows</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Disputes</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{health.disputes}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">0.0% dispute rate</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-lg shadow-sm">
          <div className="text-xs text-slate-400 uppercase font-medium">Unfilled Opps</div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{health.unfilled_opportunities}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Avg award: {health.avg_time_to_award_seconds}s</div>
        </div>
      </div>

      {/* Grid: Live Opportunities & Active Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Work Opportunities */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎯 Available Work Opportunities</span>
              <span className="text-xs font-normal text-slate-400">({opportunities.length})</span>
            </h2>
            <Link
              href="/marketplace/opportunities/opp_sec_audit_10k"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              View Primary Opportunity →
            </Link>
          </div>

          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.opportunity_id}
                className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {opp.capability}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors mt-1.5">
                      {opp.title}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${
                      opp.status === 'OPEN'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                        : opp.status === 'AWARDED'
                        ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                        : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50'
                    }`}
                  >
                    {opp.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Requester</span>
                    <span className="font-mono text-slate-300 truncate block">{opp.requester_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Budget Cap</span>
                    <span className="font-semibold text-emerald-400">{opp.budget_constraint_usdc} USDC</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Deadline</span>
                    <span className="text-slate-300">
                      {new Date(opp.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: {opp.opportunity_id}
                  </div>
                  <Link
                    href={`/marketplace/opportunities/${opp.opportunity_id}`}
                    className="px-3 py-1 bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700 text-xs font-medium rounded transition-all"
                  >
                    Match & Award →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Service Listings */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋 Published Service Listings</span>
              <span className="text-xs font-normal text-slate-400">({filteredListings.length})</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Filter:</span>
              <button
                onClick={() => setFilterCap('all')}
                className={`px-2 py-0.5 rounded text-[11px] ${filterCap === 'all' ? 'bg-cyan-900 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCap('sec')}
                className={`px-2 py-0.5 rounded text-[11px] ${filterCap === 'sec' ? 'bg-cyan-900 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}
              >
                Security
              </button>
              <button
                onClick={() => setFilterCap('data')}
                className={`px-2 py-0.5 rounded text-[11px] ${filterCap === 'data' ? 'bg-cyan-900 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}
              >
                Data Intel
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredListings.map((l) => (
              <div
                key={l.listing_id}
                className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cyan-400">{l.provider_agent_id}</span>
                      <span className="px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-400 rounded">
                        {l.pricing_model}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 mt-1">
                      {l.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {l.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-white block">
                      {l.base_price_usdc} <span className="text-xs font-normal text-slate-400">USDC</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold">
                      ● {l.availability}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-3 text-[11px]">
                    <span>⏱ ~{l.estimated_latency_ms < 1000 ? `${l.estimated_latency_ms}ms` : `${(l.estimated_latency_ms / 60000).toFixed(0)}m`}</span>
                    <span>🛡 {l.verification_method}</span>
                    <span>Max {l.max_concurrent_jobs || 5} concurrent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/marketplace/agents/${l.provider_agent_id}`}
                      className="text-xs text-slate-400 hover:text-slate-200 underline"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/marketplace/listings/${l.listing_id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
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
