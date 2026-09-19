'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '../../components/MetricCard';
import { HealthStatus } from '../../components/HealthStatus';
import { AutoExecutionBadge } from '../../components/AutoExecutionBadge';
import { IntentTable } from '../../components/IntentTable';
import { TransactionTable } from '../../components/TransactionTable';
import { ErrorState } from '../../components/ErrorState';
import { fetchAgents } from '../../lib/api/agents';
import { fetchIntents } from '../../lib/api/intents';
import { fetchTransactions } from '../../lib/api/transactions';
import { fetchSystemHealth } from '../../lib/api/health';
import { Agent, PaymentIntent, TransactionRecord, SystemHealth } from '../../lib/api/types';
import { DEMO_AGENTS, DEMO_INTENTS, DEMO_TRANSACTIONS } from '../../lib/api/demo_fixtures';

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [health, setHealth] = useState<SystemHealth>({
    gateway: 'OFFLINE',
    policy_engine: 'OFFLINE',
    arc_rpc: 'OFFLINE',
    database: 'OFFLINE',
    network_name: 'Arc Network (Chain ID 5042)',
    is_mainnet_verified: false,
    auto_execution_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadData = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setAgents(DEMO_AGENTS);
      setIntents(DEMO_INTENTS);
      setTransactions(DEMO_TRANSACTIONS);
      setHealth({
        gateway: 'HEALTHY',
        policy_engine: 'HEALTHY',
        arc_rpc: 'HEALTHY',
        database: 'HEALTHY',
        network_name: 'Arc Network (Chain ID 5042)',
        is_mainnet_verified: false,
        auto_execution_enabled: false,
      });
      setLoading(false);
      return;
    }

    try {
      const [agentsData, intentsData, txData, healthData] = await Promise.all([
        fetchAgents().catch(() => []),
        fetchIntents().catch(() => []),
        fetchTransactions().catch(() => []),
        fetchSystemHealth(),
      ]);

      setAgents(agentsData);
      setIntents(intentsData);
      setTransactions(txData);
      setHealth(healthData);

      if (healthData.gateway === 'OFFLINE') {
        setError('Go Gateway is currently unreachable at the configured API endpoint.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to AgentPay Gateway';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(isDemoMode);
  }, [isDemoMode]);

  // Aggregate metrics
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'ACTIVE').length;
  const pendingIntents = intents.filter((i) => i.status === 'CREATED' || i.status === 'AUTHORIZED').length;
  const confirmedPayments = intents.filter((i) => i.status === 'CONFIRMED').length;

  // Controlled USDC calculation
  const totalBalance = agents.reduce((acc, a) => {
    const val = parseFloat(a.usdc_balance || '0');
    return isNaN(val) ? acc : acc + val;
  }, 0);

  const totalSpentToday = agents.reduce((acc, a) => {
    const val = parseFloat(a.daily_spent || '0');
    return isNaN(val) ? acc : acc + val;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AgentPay Web Control Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Infrastructure monitor for autonomous agents, deterministic spending policies, and Arc USDC settlement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
              isDemoMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
          >
            {isDemoMode ? '● DEMO MODE ACTIVE' : '○ Enable Demo Mode'}
          </button>
          <AutoExecutionBadge autoExecutionEnabled={health.auto_execution_enabled} />
        </div>
      </div>

      {error && !isDemoMode && (
        <ErrorState
          title="Network Unavailable"
          message={`${error} If running locally, ensure services/gateway is running on port 8080 or toggle Demo Mode above to preview the interface.`}
          onRetry={() => loadData(false)}
          isRetrying={loading}
        />
      )}

      {/* Infrastructure KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Agents"
          value={totalAgents}
          subtitle={`${activeAgents} currently active`}
          loading={loading}
        />

        <MetricCard
          title="Active Agents"
          value={activeAgents}
          unit="agents"
          subtitle="Operational status"
          loading={loading}
        />

        <MetricCard
          title="USDC Controlled"
          value={health.arc_rpc === 'OFFLINE' && !isDemoMode ? 'Unavailable' : `$${totalBalance.toFixed(2)}`}
          unit={health.arc_rpc === 'OFFLINE' && !isDemoMode ? undefined : 'USDC'}
          subtitle={health.arc_rpc === 'OFFLINE' && !isDemoMode ? 'Arc RPC offline' : 'AgentVault custody'}
          loading={loading}
        />

        <MetricCard
          title="Today's Spending"
          value={`$${totalSpentToday.toFixed(2)}`}
          unit="USDC"
          subtitle="Across all active agents"
          loading={loading}
        />

        <MetricCard
          title="Pending Intents"
          value={pendingIntents}
          subtitle="Awaiting authorization/confirm"
          loading={loading}
        />

        <MetricCard
          title="Confirmed Payments"
          value={confirmedPayments}
          subtitle="Settled on Arc"
          loading={loading}
        />
      </div>

      {/* System Infrastructure Health */}
      <HealthStatus health={health} loading={loading} />

      {/* Recent Payment Intents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Payment Intents</h2>
            <p className="text-xs text-slate-400">
              Autonomous requests evaluated by the Rust Policy Engine.
            </p>
          </div>
          <Link
            href="/payment-intents"
            className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors"
          >
            View all intents →
          </Link>
        </div>

        <IntentTable intents={intents.slice(0, 5)} />
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Arc Transactions</h2>
            <p className="text-xs text-slate-400">
              On-chain settlement records executed via AgentVault.
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors"
          >
            View all transactions →
          </Link>
        </div>

        <TransactionTable transactions={transactions.slice(0, 5)} />
      </div>
    </div>
  );
}
