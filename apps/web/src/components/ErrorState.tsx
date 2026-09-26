import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorState({
  title = 'Network Unavailable',
  message,
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  return (
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] text-center">
      <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#D85C5C]/40 text-[#D85C5C] flex items-center justify-center mx-auto mb-2.5 text-xs font-bold font-mono">
        !
      </div>
      <h3 className="text-sm font-semibold text-[#F2F0EA]">{title}</h3>
      <p className="text-xs text-[#B0ADA5] mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] text-xs font-medium transition-colors border border-[#2A2A2A] disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </button>
      )}
    </div>
  );
}
