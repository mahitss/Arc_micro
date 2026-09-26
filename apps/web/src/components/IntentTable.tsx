import React from 'react';
import Link from 'next/link';
import { PaymentIntent } from '../lib/api/types';
import { StatusBadge } from './StatusBadge';
import { CopyButton } from './CopyButton';

interface IntentTableProps {
  intents: PaymentIntent[];
  onSelectIntent?: (intent: PaymentIntent) => void;
}

export function IntentTable({ intents, onSelectIntent }: IntentTableProps) {
  if (intents.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[#716F69] bg-[#101010] rounded-xl border border-[#222222]">
        No payment intents matching the current filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#222222] bg-[#101010]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#222222] bg-[#141414] text-[#85827B] font-mono">
            <th className="py-3 px-4 font-medium">Intent ID</th>
            <th className="py-3 px-4 font-medium">Agent</th>
            <th className="py-3 px-4 font-medium">Service</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Purpose</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Created</th>
            <th className="py-3 px-4 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222222] font-mono">
          {intents.map((intent) => {
            const amountNum = Number(intent.amount) / 1_000_000;
            const amountStr = isNaN(amountNum) ? intent.amount : `$${amountNum.toFixed(2)}`;
            const createdDate = new Date(intent.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <tr
                key={intent.intent_id}
                className="hover:bg-[#141414] transition-colors group cursor-pointer"
                onClick={() => onSelectIntent?.(intent)}
              >
                <td className="py-3 px-4 font-semibold text-[#F2F0EA]">
                  <div className="flex items-center gap-1.5">
                    <span>{intent.intent_id}</span>
                    <CopyButton textToCopy={intent.intent_id} label="Intent ID" />
                  </div>
                </td>
                <td className="py-3 px-4 text-[#B0ADA5]">{intent.agent_id}</td>
                <td className="py-3 px-4 text-[#F2F0EA]">{intent.service}</td>
                <td className="py-3 px-4 font-bold text-[#F2F0EA]">
                  {amountStr} <span className="text-[10px] text-[#B0ADA5] font-normal">USDC</span>
                </td>
                <td className="py-3 px-4 text-[#B0ADA5] truncate max-w-[120px]">{intent.purpose}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={intent.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-[#716F69]">{createdDate}</td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/payment-intents/${encodeURIComponent(intent.intent_id)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-[#D6A83A] hover:text-[#F2F0EA] font-sans font-medium hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
