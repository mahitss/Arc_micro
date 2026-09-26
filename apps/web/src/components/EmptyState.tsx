import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#101010] border border-dashed border-[#222222] text-center">
      {icon ? (
        <div className="mb-3 text-[#716F69]">{icon}</div>
      ) : (
        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center text-[#716F69] mb-3 font-mono text-sm">
          ∅
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#F2F0EA]">{title}</h3>
      <p className="text-xs text-[#B0ADA5] mt-1 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] text-xs font-medium transition-colors border border-[#2A2A2A]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
