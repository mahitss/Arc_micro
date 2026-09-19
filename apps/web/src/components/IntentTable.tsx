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
      <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/80">
        No payment intents matching the current filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-mono">
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
        <tbody className="divide-y divide-slate-800/60 font-mono">
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
                className="hover:bg-slate-850/50 transition-colors group cursor-pointer"
                onClick={() => onSelectIntent?.(intent)}
              >
                <td className="py-3 px-4 font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span>{intent.intent_id}</span>
                    <CopyButton textToCopy={intent.intent_id} label="Intent ID" />
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">{intent.agent_id}</td>
                <td className="py-3 px-4 text-teal-400">{intent.service}</td>
                <td className="py-3 px-4 font-bold text-white">
                  {amountStr} <span className="text-[10px] text-teal-400 font-normal">USDC</span>
                </td>
                <td className="py-3 px-4 text-slate-400 truncate max-w-[120px]">{intent.purpose}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={intent.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-500">{createdDate}</td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/payment-intents/${encodeURIComponent(intent.intent_id)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-sans font-medium hover:underline"
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
