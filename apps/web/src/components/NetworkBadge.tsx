import React from 'react';

interface NetworkBadgeProps {
  isVerifiedMainnet?: boolean;
}

export function NetworkBadge({ isVerifiedMainnet = false }: NetworkBadgeProps) {
  if (isVerifiedMainnet) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Arc Mainnet</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      <span>Local / Test Environment</span>
    </span>
  );
}
