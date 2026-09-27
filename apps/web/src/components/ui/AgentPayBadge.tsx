import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
export type ProvenanceVariant = 'LIVE' | 'VERIFIED' | 'PROJECTED' | 'SIMULATED' | 'CACHED' | 'UNAVAILABLE';

export interface AgentPayBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
}

export function AgentPayBadge({
  variant = 'neutral',
  dot = true,
  pulse = false,
  className = '',
  children,
  ...props
}: AgentPayBadgeProps) {
  const styles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    success: {
      bg: 'bg-[#101010]',
      text: 'text-[#F2F0EA]',
      border: 'border-[#2FB36F]/40',
      dotColor: 'bg-[#2FB36F]',
    },
    warning: {
      bg: 'bg-[#101010]',
      text: 'text-[#F2F0EA]',
      border: 'border-[#D6A83A]/40',
      dotColor: 'bg-[#D6A83A]',
    },
    danger: {
      bg: 'bg-[#101010]',
      text: 'text-[#F2F0EA]',
      border: 'border-[#D85C5C]/40',
      dotColor: 'bg-[#D85C5C]',
    },
    info: {
      bg: 'bg-[#101010]',
      text: 'text-[#F2F0EA]',
      border: 'border-[#6B8FD6]/40',
      dotColor: 'bg-[#6B8FD6]',
    },
    accent: {
      bg: 'bg-[#101010]',
      text: 'text-[#F2F0EA]',
      border: 'border-[#D6A83A]',
      dotColor: 'bg-[#D6A83A]',
    },
    neutral: {
      bg: 'bg-[#101010]',
      text: 'text-[#B0ADA5]',
      border: 'border-[#222222]',
      dotColor: 'bg-[#716F69]',
    },
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-sans font-medium uppercase tracking-wider border ${current.bg} ${current.text} ${current.border} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${current.dotColor} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
}

export function AgentPayProvenanceBadge({
  type,
  className = '',
}: {
  type: ProvenanceVariant;
  className?: string;
}) {
  switch (type) {
    case 'LIVE':
      return (
        <AgentPayBadge variant="success" dot className={className}>
          LIVE
        </AgentPayBadge>
      );
    case 'VERIFIED':
      return (
        <AgentPayBadge variant="success" dot className={className}>
          VERIFIED
        </AgentPayBadge>
      );
    case 'PROJECTED':
      return (
        <AgentPayBadge variant="warning" dot className={className}>
          PROJECTED
        </AgentPayBadge>
      );
    case 'SIMULATED':
      return (
        <AgentPayBadge variant="warning" dot className={className}>
          SIMULATED
        </AgentPayBadge>
      );
    case 'CACHED':
      return (
        <AgentPayBadge variant="neutral" dot className={className}>
          CACHED
        </AgentPayBadge>
      );
    case 'UNAVAILABLE':
      return (
        <AgentPayBadge variant="danger" dot className={className}>
          UNAVAILABLE
        </AgentPayBadge>
      );
  }
}
