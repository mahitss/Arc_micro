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
      <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] animate-pulse">
        <div className="h-3 w-20 bg-[#181818] rounded mb-2" />
        <div className="h-7 w-32 bg-[#181818] rounded mb-1" />
        <div className="h-3 w-28 bg-[#141414] rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[#85827B] uppercase tracking-wider">{title}</span>
        {badge}
      </div>
      <div className="text-2xl font-bold text-[#F2F0EA] mt-1.5 flex items-baseline gap-1.5">
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-[#B0ADA5] font-mono">{unit}</span>}
      </div>
      {subtitle && <div className="text-[11px] text-[#716F69] mt-1">{subtitle}</div>}
    </div>
  );
}
