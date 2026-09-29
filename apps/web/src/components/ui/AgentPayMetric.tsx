import React from 'react';
import { AgentPayProvenanceBadge, ProvenanceVariant } from './AgentPayBadge';

export interface AgentPayMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  provenance?: ProvenanceVariant;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  className?: string;
}

export function AgentPayMetric({
  label,
  value,
  subtext,
  provenance,
  change,
  trend,
  highlight = false,
  className = '',
}: AgentPayMetricProps) {
  const isLongValue = typeof value === 'string' && value.length > 7;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl bg-[#101010] border ${
        highlight ? 'border-[#D6A83A]/50 bg-[#141414]' : 'border-[#222222]'
      } flex flex-col justify-between min-w-0 overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2 min-w-0">
        <span
          className="text-[10px] sm:text-[11px] font-sans font-medium uppercase tracking-wider text-[#716F69] truncate"
          title={label}
        >
          {label}
        </span>
        {provenance && (
          <span className="shrink-0">
            <AgentPayProvenanceBadge type={provenance} size="sm" />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className={`${
            isLongValue ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
          } font-bold tracking-tight text-[#F2F0EA] truncate`}
          title={String(value)}
        >
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-medium shrink-0 ${
              trend === 'up'
                ? 'text-[#2FB36F]'
                : trend === 'down'
                ? 'text-[#D85C5C]'
                : 'text-[#B0ADA5]'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <span
          className="text-[11px] text-[#B0ADA5] mt-1.5 leading-snug truncate"
          title={subtext}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}
