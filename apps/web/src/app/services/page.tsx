'use client';

import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { AddressDisplay } from '../../components/AddressDisplay';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { fetchServices } from '../../lib/api/services';
import { RegisteredService } from '../../lib/api/types';
import { DEMO_SERVICES } from '../../lib/api/demo_fixtures';

export default function ServicesPage() {
  const [services, setServices] = useState<RegisteredService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadServices = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setServices(DEMO_SERVICES);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchServices();
      setServices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load services';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices(isDemoMode);
  }, [isDemoMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Service Registry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Explicitly authorized external services that autonomous AI agents are permitted to pay.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border self-start sm:self-auto transition-colors ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
        >
          {isDemoMode ? '● DEMO MODE ACTIVE' : '○ Enable Demo Mode'}
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs">
        <div className="font-semibold text-teal-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span>Server-Side Recipient Resolution Security Invariant</span>
        </div>
        <p className="text-slate-400 mt-1 leading-relaxed">
          The AI agent selects only a service identifier (e.g., <code className="text-teal-300 font-mono">web-research</code>). The Go Gateway server-side Service Registry resolves the trusted recipient address. Autonomous agents are strictly prohibited from inventing recipient addresses or choosing unapproved calldata.
        </p>
      </div>

      {error && !isDemoMode && (
        <ErrorState
          title="Service Registry Unavailable"
          message={error}
          onRetry={() => loadServices(false)}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div className="h-64 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-pulse" />
      ) : services.length === 0 ? (
        <EmptyState
          title="No Services Registered"
          description="There are currently no authorized paid services registered in the server registry."
          actionText="Load Demo Services"
          onAction={() => setIsDemoMode(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => {
            const maxPriceNum = Number(svc.max_price) / 1_000_000;
            const maxPriceStr = isNaN(maxPriceNum) ? svc.max_price : `$${maxPriceNum.toFixed(2)}`;

            return (
              <div
                key={svc.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{svc.name}</h3>
                    <div className="text-[11px] font-mono text-teal-400 mt-0.5">{svc.id}</div>
                  </div>
                  <StatusBadge status={svc.enabled ? 'ENABLED' : 'DISABLED'} size="sm" />
                </div>

                <div className="pt-3 border-t border-slate-800/60 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Asset:</span>
                    <span className="text-slate-200 font-semibold">{svc.asset}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Max Price:</span>
                    <span className="text-white font-bold">
                      {maxPriceStr} <span className="text-teal-400 font-normal">USDC</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Approved Recipient:</span>
                    <AddressDisplay address={svc.recipient} truncate={true} copyable={true} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
