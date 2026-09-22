'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchMarketplaceService } from '../../../lib/api/missions';
import { fetchServiceQuote } from '../../../lib/api/services';
import { MarketplaceService, ServiceQuote } from '../../../lib/api/types';

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params.id as string;

  const [service, setService] = useState<MarketplaceService | null>(null);
  const [quote, setQuote] = useState<ServiceQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingQuote, setRequestingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;

    fetchMarketplaceService(serviceId, { useDemo: true })
      .then((s) => {
        setService(s);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const handleRequestQuote = async () => {
    if (!service) return;
    setRequestingQuote(true);
    setQuoteError(null);

    try {
      const q = await fetchServiceQuote(service.id, service.max_price, service.asset);
      setQuote(q);
    } catch (err: unknown) {
      setQuoteError(err instanceof Error ? err.message : 'Failed to obtain quote from Gateway');
    } finally {
      setRequestingQuote(false);
    }
  };

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-mono text-sm max-w-4xl mx-auto">
        Querying Service Registry Profile...
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error || 'Service not found'}
        </div>
        <Link href="/marketplace" className="inline-block px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/marketplace"
          className="text-xs font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1.5"
        >
          ← Back to Marketplace Directory
        </Link>
        <span className="text-xs font-mono text-slate-500">ID: {service.id}</span>
      </div>

      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700">
                {service.category}
              </span>
              {service.verified && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  VERIFIED PROVIDER
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{service.name}</h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{service.description}</p>
          </div>

          <button
            onClick={handleRequestQuote}
            disabled={requestingQuote}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 whitespace-nowrap"
          >
            {requestingQuote ? 'Requesting Quote...' : 'REQUEST BINDING QUOTE'}
          </button>
        </div>

        {/* Capabilities Tagging */}
        <div className="pt-2 flex flex-wrap gap-1.5">
          {service.capabilities.map((cap) => (
            <span
              key={cap}
              className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">HISTORICAL RELIABILITY</span>
          <span className="text-xl font-bold text-emerald-400">
            {(service.success_rate_bps / 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Empirical uptime</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">AVG LATENCY</span>
          <span className="text-xl font-bold text-cyan-300">{service.average_latency_ms} ms</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Response SLA</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">MAX ALLOWABLE PRICE</span>
          <span className="text-xl font-bold text-white">{formatUsdc(service.max_price)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Base ceiling in USDC</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">RISK SCORE</span>
          <span className="text-xl font-bold text-teal-300">{service.risk_score} / 100</span>
          <span className="text-[10px] text-teal-500 block mt-0.5">Counterparty risk</span>
        </div>
      </div>

      {/* Quote Display if requested */}
      {quote && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-3 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-teal-400 font-bold">BINDING CRYPTOGRAPHIC QUOTE RECEIVED</span>
            <span className="text-slate-400">Quote ID: {quote.quote_id}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
            <div>Quoted Price: <span className="text-white font-bold">{formatUsdc(quote.amount)}</span></div>
            <div>Asset: <span className="text-cyan-300 font-bold">{quote.asset}</span></div>
            <div>Valid Until: <span className="text-slate-400">{new Date(quote.expires_at).toLocaleTimeString()}</span></div>
            <div>Recipient Binding: <span className="text-emerald-400 font-bold">AUTHORITATIVE</span></div>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            Quote is immutable for 15 minutes. To execute, submit via an Autonomous Mission objective.
          </p>
        </div>
      )}

      {quoteError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          Quote Solicitation Error: {quoteError}
        </div>
      )}

      {/* Recipient Binding & Security Box */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-3 text-slate-400">
        <span className="text-white font-bold block uppercase tracking-wider">
          Security Boundary: Authoritative Recipient Binding (INV-E5)
        </span>
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
          <span className="text-slate-500 block mb-1">SETTLEMENT DESTINATION ON ARC:</span>
          <span className="text-teal-300 font-bold break-all">{service.recipient}</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          The settlement address is immutably registered server-side. AI agents and external callers cannot inject alternate payout addresses or divert funds during mission execution.
        </p>
      </div>
    </div>
  );
}
