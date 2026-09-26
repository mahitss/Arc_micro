import React from 'react';

interface NetworkBadgeProps {
  isVerifiedMainnet?: boolean;
}

export function NetworkBadge({ isVerifiedMainnet = false }: NetworkBadgeProps) {
  if (isVerifiedMainnet) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-[#141414] text-[#F2F0EA] border border-[#222222]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
        <span>Arc Mainnet</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase bg-[#101010] text-[#B0ADA5] border border-[#222222]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
      <span>Local / Test Environment</span>
    </span>
  );
}
