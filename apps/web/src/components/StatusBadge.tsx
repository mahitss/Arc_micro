import React from 'react';
import { IntentStatus } from '../lib/api/types';

interface StatusBadgeProps {
  status: IntentStatus | 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  switch (normalized) {
    case 'CONFIRMED':
    case 'ACTIVE':
    case 'HEALTHY':
    case 'ENABLED':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      dotColor = 'bg-emerald-400';
      break;

    case 'AUTHORIZED':
      colorClasses = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      dotColor = 'bg-teal-400';
      break;

    case 'EXECUTING':
    case 'SUBMITTED':
      colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      dotColor = 'bg-cyan-400 animate-pulse';
      break;

    case 'CREATED':
    case 'PENDING':
    case 'DEGRADED':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      dotColor = 'bg-amber-400';
      break;

    case 'DENIED':
    case 'FAILED':
    case 'OFFLINE':
    case 'DISABLED':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      dotColor = 'bg-rose-400';
      break;

    case 'EXPIRED':
    case 'PAUSED':
    case 'INACTIVE':
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
      dotColor = 'bg-slate-500';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${colorClasses} ${sizeClasses}`}
      role="status"
      aria-label={`Status: ${normalized}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{normalized}</span>
    </span>
  );
}
