'use client';

import React, { useEffect, useState } from 'react';
import { TransactionTable } from '../../components/TransactionTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { fetchTransactions } from '../../lib/api/transactions';
import { TransactionRecord } from '../../lib/api/types';
import { DEMO_TRANSACTIONS } from '../../lib/api/demo_fixtures';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadTransactions = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setTransactions(DEMO_TRANSACTIONS);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(isDemoMode);
  }, [isDemoMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#222222]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">On-Chain Transactions</h1>
          <p className="text-xs text-[#716F69] mt-1">
            Settlement records executed on the Arc network through AgentVault.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border self-start sm:self-auto transition-colors ${
            isDemoMode
              ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
              : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
          }`}
        >
          {isDemoMode ? '● DEMO MODE ACTIVE' : '○ Enable Demo Mode'}
        </button>
      </div>

      {error && !isDemoMode && (
        <ErrorState
          title="Transactions Unavailable"
          message={error}
          onRetry={() => loadTransactions(false)}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div className="h-64 rounded-xl bg-[#101010] border border-[#222222] animate-pulse" />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No Transactions Found"
          description="There are currently no confirmed or submitted on-chain transactions."
          actionText="Load Demo Transactions"
          onAction={() => setIsDemoMode(true)}
        />
      ) : (
        <TransactionTable transactions={transactions} />
      )}
    </div>
  );
}
