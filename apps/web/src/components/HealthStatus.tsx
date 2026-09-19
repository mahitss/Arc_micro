import React from 'react';
import { StatusBadge } from './StatusBadge';
import { SystemHealth } from '../lib/api/types';

interface HealthStatusProps {
  health: SystemHealth;
  loading?: boolean;
}

export function HealthStatus({ health, loading = false }: HealthStatusProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-800/60 rounded-lg" />
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Web Console', status: 'HEALTHY' },
    { label: 'Go Gateway', status: health.gateway },
    { label: 'Policy Engine', status: health.policy_engine },
    { label: 'Database', status: health.database },
    { label: 'Arc RPC', status: health.arc_rpc },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
      <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
        System Infrastructure Health
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex flex-col justify-between gap-1.5"
          >
            <span className="text-[11px] font-mono text-slate-400 truncate">{item.label}</span>
            <div>
              <StatusBadge status={item.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
