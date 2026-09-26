'use client';

import React from 'react';
import type { AuthorityDelta } from '@/lib/api/constitution';

interface AuthorityDeltaBadgeProps {
  delta?: AuthorityDelta;
  className?: string;
}

export function AuthorityDeltaBadge({ delta, className = '' }: AuthorityDeltaBadgeProps) {
  if (!delta) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-[#141414] text-[#716F69] border border-[#222222] ${className}`}>
        NO_DELTA
      </span>
    );
  }

  const classification = delta.classification || 'UNCHANGED';

  if (classification === 'MORE_RESTRICTIVE') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F] animate-pulse" />
        <span>MORE RESTRICTIVE</span>
        <span className="text-[10px] text-[#2FB36F] font-normal">(-Authority)</span>
      </div>
    );
  }

  if (classification === 'MORE_PERMISSIVE') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C] animate-pulse" />
        <span>MORE PERMISSIVE</span>
        <span className="text-[10px] text-[#D85C5C] font-normal">(+Authority / Review Required)</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-[#141414] text-[#716F69] border border-[#222222] ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#716F69]" />
      <span>UNCHANGED</span>
    </div>
  );
}
