import React from 'react';
import { IntentStatus } from '../lib/api/types';

interface StatusBadgeProps {
  status: IntentStatus | 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let dotColor = 'bg-[#716F69]';
  let textColor = 'text-[#B0ADA5]';

  switch (normalized) {
    case 'CONFIRMED':
    case 'ACTIVE':
    case 'HEALTHY':
    case 'ENABLED':
    case 'APPROVED':
    case 'VERIFIED':
    case 'ALLOWED':
      dotColor = 'bg-[#2FB36F]';
      textColor = 'text-[#F2F0EA]';
      break;

    case 'AUTHORIZED':
    case 'EXECUTING':
    case 'SUBMITTED':
      dotColor = 'bg-[#6B8FD6]';
      textColor = 'text-[#F2F0EA]';
      break;

    case 'CREATED':
    case 'PENDING':
    case 'DEGRADED':
    case 'APPROVAL_REQUIRED':
    case 'SIMULATION':
      dotColor = 'bg-[#D6A83A]';
      textColor = 'text-[#F2F0EA]';
      break;

    case 'DENIED':
    case 'FAILED':
    case 'OFFLINE':
    case 'DISABLED':
    case 'REJECTED':
    case 'BLOCKED':
    case 'NOT DEPLOYED':
      dotColor = 'bg-[#D85C5C]';
      textColor = 'text-[#D85C5C]';
      break;

    case 'EXPIRED':
    case 'PAUSED':
    case 'INACTIVE':
    case 'CANCELLED':
      dotColor = 'bg-[#716F69]';
      textColor = 'text-[#716F69]';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border border-[#222222] bg-[#101010] ${textColor} ${sizeClasses}`}
      role="status"
      aria-label={`Status: ${normalized}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{normalized}</span>
    </span>
  );
}
