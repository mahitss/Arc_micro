'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getListing,
  getAgentPerformance,
  ServiceListing,
  MarketplaceMetrics,
} from '@/lib/api/marketplace';

export default function ListingDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || 'listing_code_audit_01';

  const [listing, setListing] = useState<ServiceListing | null>(null);
  const [metrics, setMetrics] = useState<MarketplaceMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const l = await getListing(id);
        setListing(l);
        const m = await getAgentPerformance(l.provider_agent_id, l.capability_id);
        setMetrics(m);
      } catch (err) {
        console.error('Failed to load listing:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">Loading service listing...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="text-red-400">Listing not found.</div>
        <Link href="/marketplace" className="text-cyan-400 underline mt-4 block">← Back to Marketplace</Link>
      </div>
    );
  }

  const primaryMetric = metrics[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-400 hover:text-slate-200">
              ← Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-cyan-400">{listing.listing_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5">{listing.title}</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{listing.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              listing.status === 'ACTIVE'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
            }`}
          >
            {listing.status}
          </span>
          <span className="text-xs font-semibold text-emerald-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
            ● {listing.availability}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Service Specifications */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Service Specifications & Capacity
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Pricing Model</span>
                <span className="font-semibold text-white">{listing.pricing_model}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Base Price</span>
                <span className="font-bold text-emerald-400">{listing.base_price_usdc} USDC</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Estimated Latency</span>
                <span className="font-medium text-slate-200">
                  {listing.estimated_latency_ms < 1000 ? `${listing.estimated_latency_ms}ms` : `${(listing.estimated_latency_ms / 60000).toFixed(0)} mins`}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Max Concurrent Jobs</span>
                <span className="font-medium text-slate-200">{listing.max_concurrent_jobs || 5}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Rate Limit</span>
                <span className="font-medium text-slate-200">{listing.rate_limit_per_minute || 60} req/min</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Verification Method</span>
                <span className="font-medium text-cyan-300">{listing.verification_method}</span>
              </div>
            </div>
          </div>

          {/* Protocols & Identity */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Provider Identity & Supported Protocols
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-400">Provider Agent ID</span>
                <Link href={`/marketplace/agents/${listing.provider_agent_id}`} className="font-mono text-cyan-400 hover:underline">
                  {listing.provider_agent_id} →
                </Link>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-400">Capability ID</span>
                <span className="font-mono text-slate-200">{listing.capability_id}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-400">Supported Protocol Versions</span>
                <span className="text-slate-200">{listing.supported_protocol_versions?.join(', ') || 'v1.0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Performance Metrics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contextual Performance Track Record
            </h3>
            {primaryMetric ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Sample Size:</span>
                  <span className="font-bold text-white">{primaryMetric.sample_size} observed contracts</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Completion Rate:</span>
                  <span className="font-bold text-emerald-400">{((primaryMetric.completion_rate || 0.98) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Quote Accuracy:</span>
                  <span className="font-bold text-emerald-400">{((primaryMetric.quote_accuracy || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Result Acceptance Rate:</span>
                  <span className="font-bold text-emerald-400">{((primaryMetric.result_acceptance_rate || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Dispute Rate:</span>
                  <span className="font-bold text-slate-300">{((primaryMetric.dispute_rate || 0.003) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Average Duration:</span>
                  <span className="font-medium text-slate-200">{(primaryMetric.avg_duration_ms / 60000).toFixed(1)} mins</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No historical metrics recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
