import React from 'react';

interface AutoExecutionBadgeProps {
  autoExecutionEnabled: boolean;
}

export function AutoExecutionBadge({ autoExecutionEnabled }: AutoExecutionBadgeProps) {
  if (autoExecutionEnabled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>Auto Execution Enabled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase bg-slate-800 text-slate-400 border border-slate-700">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      <span>Manual Confirmation Required</span>
    </span>
  );
}
