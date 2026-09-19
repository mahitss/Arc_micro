import React from 'react';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  unit?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  badge,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 animate-pulse">
        <div className="h-3 w-20 bg-slate-800 rounded mb-2" />
        <div className="h-7 w-32 bg-slate-800 rounded mb-1" />
        <div className="h-3 w-28 bg-slate-800/60 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{title}</span>
        {badge}
      </div>
      <div className="text-2xl font-bold text-white mt-1.5 flex items-baseline gap-1.5">
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-teal-400 font-mono">{unit}</span>}
      </div>
      {subtitle && <div className="text-[11px] text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}
