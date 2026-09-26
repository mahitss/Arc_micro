import React from 'react';

interface AutoExecutionBadgeProps {
  autoExecutionEnabled: boolean;
}

export function AutoExecutionBadge({ autoExecutionEnabled }: AutoExecutionBadgeProps) {
  if (autoExecutionEnabled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-[#141414] text-[#2FB36F] border border-[#222222]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
        <span>Auto Execution Enabled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-[#101010] text-[#B0ADA5] border border-[#222222]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#716F69]" />
      <span>Manual Confirmation Required</span>
    </span>
  );
}
