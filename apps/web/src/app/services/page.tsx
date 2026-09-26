'use client';

import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { AddressDisplay } from '../../components/AddressDisplay';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { fetchServices, fetchServiceQuote } from '../../lib/api/services';
import { RegisteredService, ServiceQuote } from '../../lib/api/types';
import { DEMO_SERVICES } from '../../lib/api/demo_fixtures';

const CATEGORIES = ['ALL', 'RESEARCH', 'DATA', 'COMPUTE', 'ORACLE', 'AI_MODELS'] as const;

export default function ServicesPage() {
  const [services, setServices] = useState<RegisteredService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeQuote, setActiveQuote] = useState<{ serviceId: string; quote?: ServiceQuote; loading?: boolean; error?: string } | null>(null);

  const loadServices = async (useDemo: boolean, cat: string) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      let list = DEMO_SERVICES;
      if (cat !== 'ALL') {
        list = list.filter((s) => s.category === cat);
      }
      setServices(list);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchServices({
        category: cat !== 'ALL' ? cat : undefined,
      });
      setServices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load services';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices(isDemoMode, selectedCategory);
  }, [isDemoMode, selectedCategory]);

  const handleGetQuote = async (service: RegisteredService) => {
    setActiveQuote({ serviceId: service.id, loading: true });
    try {
      const quote = await fetchServiceQuote(service.id, service.fixed_price || service.max_price);
      setActiveQuote({ serviceId: service.id, quote, loading: false });
    } catch (err: any) {
      setActiveQuote({ serviceId: service.id, error: err.message, loading: false });
    }
  };

  const getTrustBadgeClass = (trust?: string) => {
    switch (trust) {
      case 'TRUSTED':
        return 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/30';
      case 'VERIFIED':
        return 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/30';
      case 'UNVERIFIED':
        return 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/30';
      case 'DISABLED':
        return 'bg-[#141414] text-[#D85C5C] border-[#D85C5C]/30';
      default:
        return 'bg-[#141414] text-[#716F69] border-[#222222]';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#222222]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">Service Marketplace & Registry</h1>
          <p className="text-xs text-[#716F69] mt-1">
            Authoritative registry of verified external services. Agents discover, quote, and pay without direct custody of money.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border self-start sm:self-auto transition-colors ${
            isDemoMode
              ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
              : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
          }`}
        >
          {isDemoMode ? '● DEMO MODE ACTIVE' : '○ Enable Demo Mode'}
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] text-xs">
        <div className="font-semibold text-[#F2F0EA] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
          <span>Server-Side Recipient Resolution & Trust Boundary</span>
        </div>
        <p className="text-[#716F69] mt-1 leading-relaxed">
          AI agents select services by identifier only. The AgentPay Service Registry authoritatively resolves recipients and enforces pricing models. External service outputs are treated strictly as untrusted DATA, preventing malicious prompt injection.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-[#D6A83A] text-[#080808] font-bold'
                : 'bg-[#101010] text-[#716F69] border border-[#222222] hover:text-[#F2F0EA]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && !isDemoMode && (
        <ErrorState
          title="Service Registry Unavailable"
          message={error}
          onRetry={() => loadServices(false, selectedCategory)}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div className="h-64 rounded-xl bg-[#101010] border border-[#222222] animate-pulse" />
      ) : services.length === 0 ? (
        <EmptyState
          title="No Services Registered"
          description="There are currently no authorized services registered matching the selected criteria."
          actionText="Load Demo Services"
          onAction={() => setIsDemoMode(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => {
            const maxPriceNum = Number(svc.max_price) / 1_000_000;
            const maxPriceStr = isNaN(maxPriceNum) ? svc.max_price : `$${maxPriceNum.toFixed(2)}`;
            const fixedPriceNum = svc.fixed_price ? Number(svc.fixed_price) / 1_000_000 : null;
            const fixedPriceStr = fixedPriceNum !== null && !isNaN(fixedPriceNum) ? `$${fixedPriceNum.toFixed(2)}` : null;

            return (
              <div
                key={svc.id}
                className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#F2F0EA]">{svc.name}</h3>
                      <div className="text-[11px] font-mono text-[#D6A83A] mt-0.5">{svc.id}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getTrustBadgeClass(svc.trust_status)}`}>
                        {svc.trust_status || 'VERIFIED'}
                      </span>
                      <StatusBadge status={svc.enabled ? 'ENABLED' : 'DISABLED'} size="sm" />
                    </div>
                  </div>

                  {svc.description && (
                    <p className="text-xs text-[#716F69] line-clamp-2 leading-relaxed">
                      {svc.description}
                    </p>
                  )}

                  <div className="pt-3 border-t border-[#222222] space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[#716F69]">Category:</span>
                      <span className="text-[#F2F0EA] font-semibold">{svc.category || 'GENERAL'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#716F69]">Pricing:</span>
                      <span className="text-[#F2F0EA] font-bold">
                        {fixedPriceStr ? `${fixedPriceStr} FIXED` : `${maxPriceStr} CAP`}{' '}
                        <span className="text-[#716F69] font-normal">USDC</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#716F69]">Approved Recipient:</span>
                      <AddressDisplay address={svc.recipient} truncate={true} copyable={true} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => handleGetQuote(svc)}
                    disabled={!svc.enabled || (activeQuote?.serviceId === svc.id && activeQuote.loading)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-medium border border-[#222222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {activeQuote?.serviceId === svc.id && activeQuote.loading ? 'Requesting Quote...' : 'Request Quote'}
                  </button>

                  {activeQuote?.serviceId === svc.id && activeQuote.quote && (
                    <div className="mt-2 p-2.5 rounded bg-[#141414] border border-[#D6A83A]/30 text-[11px] font-mono space-y-1">
                      <div className="text-[#D6A83A] font-semibold">Quote: {activeQuote.quote.quote_id}</div>
                      <div className="text-[#F2F0EA]">Amount: {Number(activeQuote.quote.amount) / 1e6} {activeQuote.quote.asset}</div>
                      <div className="text-[#716F69] text-[10px]">Expires: {new Date(activeQuote.quote.expires_at).toLocaleTimeString()}</div>
                    </div>
                  )}

                  {activeQuote?.serviceId === svc.id && activeQuote.error && (
                    <div className="mt-2 p-2 rounded bg-[#141414] border border-[#D85C5C]/30 text-[11px] font-mono text-[#D85C5C]">
                      {activeQuote.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
