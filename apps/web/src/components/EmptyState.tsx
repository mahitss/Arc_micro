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
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
      {icon ? (
        <div className="mb-3 text-slate-500">{icon}</div>
      ) : (
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 font-mono text-sm">
          ∅
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-medium transition-colors border border-slate-700/80"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
