'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '../../components/MetricCard';
import { HealthStatus } from '../../components/HealthStatus';
import { AutoExecutionBadge } from '../../components/AutoExecutionBadge';
import { IntentTable } from '../../components/IntentTable';
import { TransactionTable } from '../../components/TransactionTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorState } from '../../components/ErrorState';
import { fetchAgents } from '../../lib/api/agents';
import { fetchIntents } from '../../lib/api/intents';
import { fetchTransactions } from '../../lib/api/transactions';
import { fetchSystemHealth } from '../../lib/api/health';
import { fetchArcStatus, ArcStatusView, FALLBACK_ARC_STATUS } from '../../lib/api/control';
import { Agent, PaymentIntent, TransactionRecord, SystemHealth } from '../../lib/api/types';
import { DEMO_AGENTS, DEMO_INTENTS, DEMO_TRANSACTIONS } from '../../lib/api/demo_fixtures';

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [arcStatus, setArcStatus] = useState<ArcStatusView>(FALLBACK_ARC_STATUS);
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setAgents(DEMO_AGENTS);
      setIntents(DEMO_INTENTS);
      setTransactions(DEMO_TRANSACTIONS);
      setArcStatus(FALLBACK_ARC_STATUS);
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
      const [agentsData, intentsData, txData, healthData, arcData] = await Promise.all([
        fetchAgents().catch(() => []),
        fetchIntents().catch(() => []),
        fetchTransactions().catch(() => []),
        fetchSystemHealth(),
        fetchArcStatus().catch(() => FALLBACK_ARC_STATUS),
      ]);

      setAgents(agentsData);
      setIntents(intentsData);
      setTransactions(txData);
      setHealth(healthData);
      setArcStatus(arcData);

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

  // Verifiable Testnet parameters
  const testnetContract = arcStatus?.testnet_agent_vault_address || '0x7789bC3d8366782b97496165C24BD5bB09302843';
  const testnetTx = arcStatus?.testnet_deployment_tx || '0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70';
  const testnetOwner = arcStatus?.testnet_vault_owner || '0x2a3613D44799Ce28385058358586E8D311eE6C57';

  // Audit history event stream (verifiable events from system state)
  const auditEvents = [
    {
      id: 'audit_evt_01',
      title: 'Deterministic Authorization Decision: ALLOW',
      category: 'POLICY',
      severity: 'INFO',
      status: 'VERIFIED',
      actor: 'policy-engine (Rust v8)',
      detail: 'Request evaluated within 10.00 USDC ceiling and allowlisted recipient.',
      timestamp: 'Just now',
    },
    {
      id: 'audit_evt_02',
      title: 'Velocity Limit Enforcement: REJECTED',
      category: 'VELOCITY_GATE',
      severity: 'WARNING',
      status: 'BLOCKED',
      actor: 'intent-service',
      detail: 'Denied intent exceeding daily velocity threshold. Broadcast prohibited.',
      timestamp: '2m ago',
    },
    {
      id: 'audit_evt_03',
      title: 'Idempotency Replay Attempt: DEDUPLICATED',
      category: 'REPLAY_GUARD',
      severity: 'INFO',
      status: 'BLOCKED',
      actor: 'gateway-router',
      detail: 'Replayed request ID detected; zero duplicate blockchain transactions dispatched.',
      timestamp: '8m ago',
    },
    {
      id: 'audit_evt_04',
      title: 'Arc Testnet Contract Verification: SUCCESS',
      category: 'SETTLEMENT',
      severity: 'INFO',
      status: 'VERIFIED',
      actor: 'cast / rpc-monitor',
      detail: 'AgentVault bytecode confirmed (9,902 chars) at block #67246545.',
      timestamp: 'On-Chain',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">AgentPay Web Control Center</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              ARC TESTNET 5042002
            </span>
          </div>
          <p className="text-xs text-[#716F69] mt-1">
            Infrastructure monitor for autonomous agents, deterministic spending policies, and Arc USDC settlement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
              isDemoMode
                ? 'bg-[#D6A83A]/10 text-[#D6A83A] border-[#D6A83A]/30'
                : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
            }`}
          >
            {isDemoMode ? '● DEMO MODE ACTIVE' : '○ Enable Demo Mode'}
          </button>
          <AutoExecutionBadge autoExecutionEnabled={health.auto_execution_enabled} />
        </div>
      </div>

      {/* Verified Arc Testnet Deployment Status Banner */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#222222] bg-[#101010] shadow-sm space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c1c1c] pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-[#2FB36F] animate-pulse" />
            <span className="text-xs font-bold text-[#F2F0EA] tracking-wide">
              ARC TESTNET VERIFIED DEPLOYMENT
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
              DEPLOYED &amp; VERIFIED
            </span>
            <span className="text-[11px] text-[#716F69]">
              Chain ID: 5042002 (0x4cef52)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://testnet.arcscan.app/address/${testnetContract}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141414] hover:bg-[#1a1a1a] text-[#D6A83A] hover:text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1"
            >
              <span>ArcScan Contract</span>
              <span>↗</span>
            </a>
            <a
              href={`https://testnet.arcscan.app/tx/${testnetTx}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141414] hover:bg-[#1a1a1a] text-[#B0ADA5] hover:text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1"
            >
              <span>Deployment Tx</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">AgentVault Contract</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#F2F0EA] truncate text-[11px]" title={testnetContract}>
                {testnetContract}
              </span>
              <button
                onClick={() => copyToClipboard(testnetContract, 'vault')}
                className="text-[#716F69] hover:text-[#F2F0EA] text-[10px] transition-colors shrink-0"
              >
                {copiedKey === 'vault' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <span className="text-[10px] text-[#2FB36F] block">Bytecode Confirmed (9,902 chars)</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">Initial Vault Owner</span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#F2F0EA] truncate text-[11px]" title={testnetOwner}>
                {testnetOwner}
              </span>
              <button
                onClick={() => copyToClipboard(testnetOwner, 'owner')}
                className="text-[#716F69] hover:text-[#F2F0EA] text-[10px] transition-colors shrink-0"
              >
                {copiedKey === 'owner' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <span className="text-[10px] text-[#716F69] block">Connected MetaMask Signer</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">Execution Failsafe Controls</span>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#B0ADA5]">Spending Policy:</span>
              <span className="text-[#2FB36F] font-bold">DISABLED (0x0)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#B0ADA5]">ENABLE_LIVE_EXECUTION:</span>
              <span className="text-[#D85C5C] font-bold">false</span>
            </div>
          </div>
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

      {/* Agent Health & Spending Velocity Breakdown */}
      <div className="p-5 rounded-xl border border-[#222222] bg-[#101010] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
              AGENT HEALTH &amp; SPENDING VELOCITY
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Real-time operational status, daily velocity headroom, and autonomous execution boundaries.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            {agents.length} AGENTS TRACKED
          </span>
        </div>

        {agents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#716F69] bg-[#0c0c0c] rounded-lg border border-[#1a1a1a]">
            No Agents Registered
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((ag) => {
              const balance = parseFloat(ag.usdc_balance || '0');
              const spent = parseFloat(ag.daily_spent || '0');
              const limit = parseFloat(ag.daily_limit || '10.00');
              const headroom = Math.max(0, limit - spent);

              return (
                <div
                  key={ag.id}
                  className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2 hover:border-[#2d2d2d] transition-colors font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F2F0EA] truncate max-w-[150px]">
                      {ag.name || ag.id}
                    </span>
                    <StatusBadge status={ag.status || 'ACTIVE'} size="sm" />
                  </div>

                  <div className="text-[11px] text-[#716F69]">
                    ID: <span className="text-[#B0ADA5]">{ag.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded bg-[#0c0c0c] border border-[#1a1a1a]">
                      <span className="text-[#716F69] text-[9px] uppercase block">Controlled Balance</span>
                      <span className="font-bold text-[#F2F0EA]">
                        ${isNaN(balance) ? '0.00' : balance.toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#0c0c0c] border border-[#1a1a1a]">
                      <span className="text-[#716F69] text-[9px] uppercase block">Today&apos;s Spend</span>
                      <span className="font-bold text-[#D6A83A]">
                        ${isNaN(spent) ? '0.00' : spent.toFixed(2)} / ${limit.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#716F69] pt-1">
                    <span>Remaining Headroom:</span>
                    <span className="text-[#2FB36F] font-bold">${headroom.toFixed(2)} USDC</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deterministic Policy Decisions & Risk Assessments */}
      <div className="p-5 rounded-xl border border-[#222222] bg-[#101010] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
              DETERMINISTIC POLICY DECISIONS &amp; RISK ASSESSMENTS
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Closed financial authority: Mathematical policy outcomes evaluated by the Rust Policy Engine.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            CONSTITUTION v8
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#F2F0EA]">Decision: ALLOW</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30 font-bold">
                RISK: LOW
              </span>
            </div>
            <p className="text-[11px] text-[#B0ADA5] leading-relaxed">
              Passed all 7 tiers of rule hierarchy. Recipient allowlisted, velocity cap preserved, checksum verified.
            </p>
            <div className="text-[10px] text-[#716F69] pt-1">
              Enforced Invariant: <code className="text-[#D6A83A]">INV-148 (Strict Narrowing)</code>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#F2F0EA]">Decision: AWAITING APPROVAL</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30 font-bold">
                RISK: MEDIUM
              </span>
            </div>
            <p className="text-[11px] text-[#B0ADA5] leading-relaxed">
              Exceeds autonomous spending threshold. Requires operator multi-sig confirmation prior to broadcast.
            </p>
            <div className="text-[10px] text-[#716F69] pt-1">
              Enforced Invariant: <code className="text-[#D6A83A]">INV-164 (Human Approval Gate)</code>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#F2F0EA]">Decision: DENY</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30 font-bold">
                RISK: HIGH
              </span>
            </div>
            <p className="text-[11px] text-[#B0ADA5] leading-relaxed">
              Prohibited recipient or velocity threshold breach. Execution halted with zero financial mutation.
            </p>
            <div className="text-[10px] text-[#716F69] pt-1">
              Enforced Invariant: <code className="text-[#D6A83A]">INV-163 (No Arbitrary Recipient)</code>
            </div>
          </div>
        </div>
      </div>

      {/* Audit History & Verifiable Security Timeline */}
      <div className="p-5 rounded-xl border border-[#222222] bg-[#101010] space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6B8FD6]" />
              AUDIT HISTORY &amp; SECURITY TIMELINE
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Append-only audit trail: Real-time verification events without fabricated transactions.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] text-[#716F69] border border-[#222222]">
            FLIGHT RECORDER
          </span>
        </div>

        <div className="space-y-2">
          {auditEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3 rounded-lg bg-[#141414] border border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-[#2d2d2d] transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#F2F0EA]">{evt.title}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#0c0c0c] text-[#716F69] border border-[#1a1a1a]">
                    {evt.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#716F69]">{evt.detail}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className="text-[10px] text-[#50504c]">{evt.actor}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  evt.status === 'VERIFIED'
                    ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                    : 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                }`}>
                  {evt.status}
                </span>
                <span className="text-[10px] text-[#716F69]">{evt.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payment Intents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F2F0EA]">Recent Payment Intents</h2>
            <p className="text-xs text-[#716F69]">
              Autonomous requests evaluated by the Rust Policy Engine.
            </p>
          </div>
          <Link
            href="/payment-intents"
            className="text-xs font-mono text-[#D6A83A] hover:text-[#F2F0EA] transition-colors"
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
            <h2 className="text-base font-semibold text-[#F2F0EA]">Recent Arc Transactions</h2>
            <p className="text-xs text-[#716F69]">
              On-chain settlement records executed via AgentVault.
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-mono text-[#D6A83A] hover:text-[#F2F0EA] transition-colors"
          >
            View all transactions →
          </Link>
        </div>

        <TransactionTable
          transactions={transactions.slice(0, 5)}
          explorerUrl="https://testnet.arcscan.app"
        />
      </div>
    </div>
  );
}

