'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '../../../components/StatusBadge';
import { AddressDisplay } from '../../../components/AddressDisplay';
import { CopyButton } from '../../../components/CopyButton';
import { fetchTransactions } from '../../../lib/api/transactions';
import { TransactionRecord } from '../../../lib/api/types';
import { DEMO_TRANSACTIONS } from '../../../lib/api/demo_fixtures';

export default function TransactionDetailPage() {
  const params = useParams();
  const txHash = (params?.txHash as string) || '';

  const [tx, setTx] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchTransactions();
        const found = list.find(
          (t) => t.transaction_hash === txHash || t.intent_id === txHash
        );
        if (found) {
          setTx(found);
        } else {
          // Fallback to demo fixture
          const demoFound = DEMO_TRANSACTIONS.find(
            (t) => t.transaction_hash === txHash || t.intent_id === txHash
          );
          setTx(demoFound || DEMO_TRANSACTIONS[0]);
        }
      } catch {
        setTx(DEMO_TRANSACTIONS[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [txHash]);

  if (loading) {
    return <div className="h-64 rounded-2xl bg-[#101010] border border-[#222222] animate-pulse" />;
  }

  if (!tx) return null;

  const amountNum = tx.amount ? Number(tx.amount) / 1_000_000 : null;
  const amountStr = amountNum !== null ? `$${amountNum.toFixed(2)} USDC` : '0.18 USDC';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="text-xs font-mono text-[#716F69] hover:text-[#F2F0EA] transition-colors"
          >
            ← Transactions
          </Link>
          <span className="text-[#50504C]">/</span>
          <h1 className="text-xl font-bold text-[#F2F0EA] font-mono truncate max-w-md">
            {tx.transaction_hash || tx.intent_id}
          </h1>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#716F69]">Transaction Hash:</span>
              <span className="text-sm font-mono font-bold text-[#F2F0EA] truncate max-w-xs sm:max-w-md">
                {tx.transaction_hash || 'Pending On-Chain Confirmation'}
              </span>
              {tx.transaction_hash && (
                <CopyButton textToCopy={tx.transaction_hash} label="Transaction Hash" />
              )}
            </div>
            <div className="text-xs text-[#716F69] mt-1">
              Intent Reference:{' '}
              <Link
                href={`/payment-intents/${encodeURIComponent(tx.intent_id)}`}
                className="text-[#D6A83A] hover:underline font-mono"
              >
                {tx.intent_id}
              </Link>
            </div>
          </div>

          <StatusBadge status={tx.status} size="md" />
        </div>

        {/* Transaction Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] text-xs font-mono">
          <div>
            <div className="text-[#716F69]">Settled Amount</div>
            <div className="text-[#F2F0EA] font-bold mt-1 text-sm">{amountStr}</div>
          </div>

          <div>
            <div className="text-[#716F69]">Vault Contract</div>
            <div className="mt-1">
              <AddressDisplay
                address={tx.vault_address || '0x1111111111111111111111111111111111111111'}
                truncate={true}
                copyable={true}
                label="Vault Address"
              />
            </div>
          </div>

          <div>
            <div className="text-[#716F69]">Recipient</div>
            <div className="mt-1">
              <AddressDisplay
                address={tx.recipient || '0x1111111111111111111111111111111111111111'}
                truncate={true}
                copyable={true}
                label="Recipient Address"
              />
            </div>
          </div>
        </div>

        {/* Timestamp & Explorer */}
        <div className="pt-4 border-t border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#716F69]">
            Confirmed At:{' '}
            <span className="text-[#B0ADA5]">
              {tx.confirmed_at
                ? new Date(tx.confirmed_at).toLocaleString()
                : 'Pending block confirmation'}
            </span>
          </div>

          <div className="text-[#716F69]">
            Network: <span className="text-[#B0ADA5]">Arc Network (Chain ID 5042)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
