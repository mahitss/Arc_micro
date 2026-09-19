import React from 'react';
import { CopyButton } from './CopyButton';

interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  copyable?: boolean;
  explorerUrl?: string;
  label?: string;
}

export function AddressDisplay({
  address,
  truncate = true,
  copyable = true,
  explorerUrl,
  label = 'address',
}: AddressDisplayProps) {
  if (!address) {
    return <span className="text-slate-500 font-mono text-xs">None</span>;
  }

  const formatted =
    truncate && address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-300">
      {explorerUrl ? (
        <a
          href={`${explorerUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-teal-400 hover:underline transition-colors"
          title={address}
        >
          {formatted}
        </a>
      ) : (
        <span title={address}>{formatted}</span>
      )}
      {copyable && <CopyButton textToCopy={address} label={label} />}
    </span>
  );
}
