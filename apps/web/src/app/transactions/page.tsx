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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">On-Chain Transactions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Settlement records executed on the Arc network through AgentVault.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border self-start sm:self-auto transition-colors ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
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
        <div className="h-64 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-pulse" />
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
