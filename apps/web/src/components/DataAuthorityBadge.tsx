'use client';

import React from 'react';
import { ProvenanceBadgeType } from '../lib/data-authority';

interface DataAuthorityBadgeProps {
  provenance: ProvenanceBadgeType;
  className?: string;
  subtext?: string;
}

export function DataAuthorityBadge({ provenance, className = '', subtext }: DataAuthorityBadgeProps) {
  let badgeStyle = 'bg-[#141414] text-[#B0ADA5] border-[#222222]';
  let dotStyle = 'bg-[#716F69]';
  let label = provenance;

  switch (provenance) {
    case 'LIVE':
      badgeStyle = 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/30';
      dotStyle = 'bg-[#2FB36F]';
      break;
    case 'SIMULATION — NO FUNDS MOVED':
    case 'DEMO FIXTURE':
      badgeStyle = 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30';
      dotStyle = 'bg-[#D6A83A]';
      break;
    case 'PROJECTED':
      badgeStyle = 'bg-[#4B88E8]/10 text-[#4B88E8] border-[#4B88E8]/30';
      dotStyle = 'bg-[#4B88E8]';
      break;
    case 'UNAVAILABLE':
      badgeStyle = 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/30';
      dotStyle = 'bg-[#D85C5C]';
      break;
    case 'STATIC CONFIG':
      badgeStyle = 'bg-[#141414] text-[#8A8882] border-[#2B2B2B]';
      dotStyle = 'bg-[#8A8882]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border select-none ${badgeStyle} ${className}`}
      title={subtext || `Data Authority: ${provenance}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
      <span>{label}</span>
      {subtext && <span className="opacity-70 font-normal">· {subtext}</span>}
    </span>
  );
}
