import React from 'react';

export interface AgentPayEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: string;
  className?: string;
}

export function AgentPayEmptyState({
  title,
  description,
  actionText,
  onAction,
  icon = '◈',
  className = '',
}: AgentPayEmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-[#222222] bg-[#0B0B0B] p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#141414] border border-[#222222] flex items-center justify-center text-[#D6A83A] text-lg font-mono mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#F2F0EA] mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-[#B0ADA5] max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="h-8 px-4 bg-[#F2F0EA] hover:bg-white text-[#080808] rounded-lg text-xs font-semibold transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export interface AgentPayErrorStateProps {
  title?: string;
  message: string;
  lastKnownState?: string;
  onRetry?: () => void;
  className?: string;
}

export function AgentPayErrorState({
  title = 'CONTROL PLANE UNAVAILABLE',
  message,
  lastKnownState,
  onRetry,
  className = '',
}: AgentPayErrorStateProps) {
  return (
    <div
      className={`rounded-xl border border-[#D85C5C]/40 bg-[#101010] p-6 sm:p-8 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#D85C5C]/50 flex items-center justify-center text-[#D85C5C] text-lg font-mono mb-3">
        ⚠
      </div>
      <h3 className="text-sm font-bold tracking-wider text-[#D85C5C] uppercase mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#B0ADA5] max-w-lg mb-3 leading-relaxed">
        {message}
      </p>
      {lastKnownState && (
        <span className="text-[11px] font-mono text-[#716F69] mb-4">
          Last known state: {lastKnownState}
        </span>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-8 px-4 bg-[#181818] hover:bg-[#202020] text-[#F2F0EA] border border-[#2B2B2B] rounded-lg text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function AgentPaySkeleton({
  height = 'h-4',
  width = 'w-full',
  className = '',
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-[#181818] rounded ${height} ${width} ${className}`}
    />
  );
}
