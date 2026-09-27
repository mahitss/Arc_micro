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
  return (
    <div
      className={`p-4 rounded-xl bg-[#101010] border ${
        highlight ? 'border-[#D6A83A]/50 bg-[#141414]' : 'border-[#222222]'
      } flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#716F69]">
          {label}
        </span>
        {provenance && <AgentPayProvenanceBadge type={provenance} />}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#F2F0EA]">
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-medium ${
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
        <span className="text-xs text-[#B0ADA5] mt-1.5 leading-snug">
          {subtext}
        </span>
      )}
    </div>
  );
}
