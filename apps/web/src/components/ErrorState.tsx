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
    <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center">
      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2.5 text-xs font-bold font-mono">
        !
      </div>
      <h3 className="text-sm font-semibold text-rose-300">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition-colors border border-rose-500/30 disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Retry Connection'}
        </button>
      )}
    </div>
  );
}
