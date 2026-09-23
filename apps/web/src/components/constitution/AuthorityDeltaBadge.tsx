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
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400 ${className}`}>
        NO_DELTA
      </span>
    );
  }

  const classification = delta.classification || 'UNCHANGED';

  if (classification === 'MORE_RESTRICTIVE') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>MORE RESTRICTIVE</span>
        <span className="text-[10px] text-emerald-500/80 font-normal">(-Authority)</span>
      </div>
    );
  }

  if (classification === 'MORE_PERMISSIVE') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
        <span>MORE PERMISSIVE</span>
        <span className="text-[10px] text-rose-500/80 font-normal">(+Authority / Review Required)</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-slate-800 text-slate-300 border border-slate-700 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      <span>UNCHANGED</span>
    </div>
  );
}
