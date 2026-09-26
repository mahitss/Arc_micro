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
      <div className="p-8 text-center text-xs font-mono text-[#716F69] bg-[#101010] rounded-xl border border-[#222222]">
        No transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#222222] bg-[#101010]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#222222] bg-[#141414] text-[#85827B] font-mono">
            <th className="py-3 px-4 font-medium">Tx Hash</th>
            <th className="py-3 px-4 font-medium">Intent ID</th>
            <th className="py-3 px-4 font-medium">Amount</th>
            <th className="py-3 px-4 font-medium">Recipient</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Timestamp</th>
            <th className="py-3 px-4 font-medium text-right">Explorer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222222] font-mono">
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
              <tr key={tx.intent_id} className="hover:bg-[#141414] transition-colors">
                <td className="py-3 px-4 font-semibold text-[#F2F0EA]">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/transactions/${encodeURIComponent(tx.transaction_hash || tx.intent_id)}`}
                      className="hover:text-[#D6A83A] transition-colors hover:underline"
                    >
                      {truncatedHash}
                    </Link>
                    {tx.transaction_hash && (
                      <CopyButton textToCopy={tx.transaction_hash} label="Tx Hash" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-[#B0ADA5]">
                  <Link
                    href={`/payment-intents/${encodeURIComponent(tx.intent_id)}`}
                    className="hover:text-[#D6A83A] hover:underline"
                  >
                    {tx.intent_id}
                  </Link>
                </td>
                <td className="py-3 px-4 font-bold text-[#F2F0EA]">{amountStr}</td>
                <td className="py-3 px-4">
                  {tx.recipient ? (
                    <AddressDisplay address={tx.recipient} truncate={true} copyable={true} />
                  ) : (
                    <span className="text-[#716F69]">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={tx.status} size="sm" />
                </td>
                <td className="py-3 px-4 text-[#716F69]">{formattedTime}</td>
                <td className="py-3 px-4 text-right">
                  {explorerUrl && tx.transaction_hash && !tx.intent_id.includes('demo') && !tx.transaction_hash.includes('demo') ? (
                    <a
                      href={`${explorerUrl}/tx/${tx.transaction_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#D6A83A] hover:underline text-[11px] font-sans font-medium"
                    >
                      Arc Explorer ↗
                    </a>
                  ) : (
                    <span className="text-[#716F69] font-sans text-[11px]">DATA UNAVAILABLE (Demo)</span>
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
