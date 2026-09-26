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
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8 flex items-center justify-center">
        <div className="text-[#D6A83A] font-mono animate-pulse">Loading service listing...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8">
        <div className="text-[#D85C5C]">Listing not found.</div>
        <Link href="/marketplace" className="text-[#B0ADA5] hover:text-[#F2F0EA] underline mt-4 block">← Back to Marketplace</Link>
      </div>
    );
  }

  const primaryMetric = metrics[0];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors">
              ← Marketplace
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="font-mono text-xs text-[#D6A83A]">{listing.listing_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-1.5">{listing.title}</h1>
          <p className="text-sm text-[#716F69] mt-1 max-w-2xl">{listing.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              listing.status === 'ACTIVE'
                ? 'bg-[#141414] text-[#2FB36F] border border-[#222222]'
                : 'bg-[#141414] text-[#D6A83A] border border-[#222222]'
            }`}
          >
            {listing.status}
          </span>
          <span className="text-xs font-semibold text-[#2FB36F] bg-[#141414] px-3 py-1 rounded border border-[#222222]">
            ● {listing.availability}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Service Specifications */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Service Specifications & Capacity
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Pricing Model</span>
                <span className="font-semibold text-[#F2F0EA]">{listing.pricing_model}</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Base Price</span>
                <span className="font-bold text-[#2FB36F]">{listing.base_price_usdc} USDC</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Estimated Latency</span>
                <span className="font-medium text-[#F2F0EA]">
                  {listing.estimated_latency_ms < 1000 ? `${listing.estimated_latency_ms}ms` : `${(listing.estimated_latency_ms / 60000).toFixed(0)} mins`}
                </span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Max Concurrent Jobs</span>
                <span className="font-medium text-[#F2F0EA]">{listing.max_concurrent_jobs || 5}</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Rate Limit</span>
                <span className="font-medium text-[#F2F0EA]">{listing.rate_limit_per_minute || 60} req/min</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Verification Method</span>
                <span className="font-medium text-[#D6A83A]">{listing.verification_method}</span>
              </div>
            </div>
          </div>

          {/* Protocols & Identity */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Provider Identity & Supported Protocols
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#716F69]">Provider Agent ID</span>
                <Link href={`/marketplace/agents/${listing.provider_agent_id}`} className="font-mono text-[#F2F0EA] hover:text-white hover:underline">
                  {listing.provider_agent_id} →
                </Link>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#716F69]">Capability ID</span>
                <span className="font-mono text-[#B0ADA5]">{listing.capability_id}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#716F69]">Supported Protocol Versions</span>
                <span className="text-[#B0ADA5]">{listing.supported_protocol_versions?.join(', ') || 'v1.0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Performance Metrics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Contextual Performance Track Record
            </h3>
            {primaryMetric ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Sample Size:</span>
                  <span className="font-bold text-[#F2F0EA]">{primaryMetric.sample_size} observed contracts</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Completion Rate:</span>
                  <span className="font-bold text-[#2FB36F]">{((primaryMetric.completion_rate || 0.98) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Quote Accuracy:</span>
                  <span className="font-bold text-[#2FB36F]">{((primaryMetric.quote_accuracy || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Result Acceptance Rate:</span>
                  <span className="font-bold text-[#2FB36F]">{((primaryMetric.result_acceptance_rate || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Dispute Rate:</span>
                  <span className="font-bold text-[#B0ADA5]">{((primaryMetric.dispute_rate || 0.003) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                  <span className="text-[#716F69]">Average Duration:</span>
                  <span className="font-medium text-[#F2F0EA]">{(primaryMetric.avg_duration_ms / 60000).toFixed(1)} mins</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#716F69] italic">No historical metrics recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
