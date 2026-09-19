import React from 'react';
import Link from 'next/link';
import { TransactionRecord } from '../lib/api/types';
import { StatusBadge } from './StatusBadge';
import { AddressDisplay } from './AddressDisplay';
import { CopyButton } from './CopyButton';

interface TransactionTableProps {
  transactions: TransactionRecord[];
  explorerUrl?: string;
}

export function TransactionTable({ transactions, explorerUrl }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/80">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-mono">
            <th className="py-3 px-4 font-medium">Tx Hash</th>
            <th className="py-3 px-4 font-medium">Intent ID</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Recipient</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Timestamp</th>
            <th className="py-3 px-4 font-medium text-right">Explorer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono">
          {transactions.map((tx) => {
            const amountNum = tx.amount ? Number(tx.amount) / 1_000_000 : null;
            const amountStr = amountNum !== null ? `$${amountNum.toFixed(2)} USDC` : '—';
            const timestamp = tx.confirmed_at || tx.submitted_at || '';
            const formattedTime = timestamp
              ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—';

            const truncatedHash =
              tx.transaction_hash && tx.transaction_hash.length > 14
                ? `${tx.transaction_hash.slice(0, 8)}...${tx.transaction_hash.slice(-6)}`
                : tx.transaction_hash || 'Pending';

            return (
              <tr key={tx.intent_id} className="hover:bg-slate-850/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/transactions/${encodeURIComponent(tx.transaction_hash || tx.intent_id)}`}
                      className="hover:text-teal-400 transition-colors hover:underline"
                    >
                      {truncatedHash}
                    </Link>
                    {tx.transaction_hash && (
                      <CopyButton textToCopy={tx.transaction_hash} label="Tx Hash" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  <Link
                    href={`/payment-intents/${encodeURIComponent(tx.intent_id)}`}
                    className="hover:text-teal-400 hover:underline"
                  >
                    {tx.intent_id}
                  </Link>
                </td>
                <td className="py-3 px-4 font-bold text-white">{amountStr}</td>
                <td className="py-3 px-4">
                  {tx.recipient ? (
                    <AddressDisplay address={tx.recipient} truncate={true} copyable={true} />
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={tx.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-500">{formattedTime}</td>
                <td className="py-3 px-4 text-right">
                  {explorerUrl && tx.transaction_hash ? (
                    <a
                      href={`${explorerUrl}/tx/${tx.transaction_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:underline text-[11px] font-sans font-medium"
                    >
                      Arc Explorer ↗
                    </a>
                  ) : (
                    <span className="text-slate-600 font-sans text-[11px]">Unverified</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
