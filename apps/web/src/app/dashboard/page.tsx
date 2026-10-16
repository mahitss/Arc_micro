'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MetricCard } from '../../components/MetricCard';
import { HealthStatus } from '../../components/HealthStatus';
import { AutoExecutionBadge } from '../../components/AutoExecutionBadge';
import { IntentTable } from '../../components/IntentTable';
import { TransactionTable } from '../../components/TransactionTable';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorState } from '../../components/ErrorState';
import {
  fetchAgents,
  createAgent,
  updateAgentPolicy,
  fetchAgentPolicy,
  pauseAgent,
  resumeAgent,
} from '../../lib/api/agents';
import {
  fetchIntents,
  fetchApprovals,
  approveIntent,
  rejectIntent,
} from '../../lib/api/intents';
import { fetchTransactions } from '../../lib/api/transactions';
import { fetchSystemHealth } from '../../lib/api/health';
import { fetchArcStatus, ArcStatusView, FALLBACK_ARC_STATUS } from '../../lib/api/control';
import { Agent, PaymentIntent, TransactionRecord, SystemHealth } from '../../lib/api/types';
import { useAuth } from '../../lib/auth/AuthContext';

import { useToast } from '../../components/ui/Toast';

export default function DashboardPage() {
  const { user, organization, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentVault, setNewAgentVault] = useState('0x7789bC3d8366782b97496165C24BD5bB09302843');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentActionError, setAgentActionError] = useState<string | null>(null);

  // Policy Modal state
  const [policyModalAgent, setPolicyModalAgent] = useState<Agent | null>(null);
  const [policyPerTx, setPolicyPerTx] = useState('0.50');
  const [policyDaily, setPolicyDaily] = useState('5.00');
  const [policyMaxTx, setPolicyMaxTx] = useState('20');
  const [policyThreshold, setPolicyThreshold] = useState('0.50');
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySuccess, setPolicySuccess] = useState(false);

  // Approval action state
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [agentsData, intentsData, txData, approvalsData, healthData, arcData] = await Promise.all([
        fetchAgents().catch(() => []),
        fetchIntents().catch(() => []),
        fetchTransactions().catch(() => []),
        fetchApprovals().catch(() => []),
        fetchSystemHealth(),
        fetchArcStatus().catch(() => FALLBACK_ARC_STATUS),
      ]);

      setAgents(agentsData);
      setIntents(intentsData);
      setTransactions(txData);
      setApprovals(approvalsData);
      setHealth(healthData);
      setArcStatus(arcData);

      if (healthData.gateway === 'OFFLINE') {
        setError('Go Gateway is currently offline. Start the gateway on port 8080.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to AgentPay Gateway';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handler for creating an agent
  const handleCreateAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentActionError(null);
    if (!newAgentName.trim()) {
      setAgentActionError('Agent name is required');
      toast.warning('Agent name is required');
      return;
    }

    setCreatingAgent(true);
    try {
      await createAgent({
        name: newAgentName.trim(),
        description: newAgentDesc.trim(),
        vault_address: newAgentVault.trim(),
      });
      setCreateAgentOpen(false);
      setNewAgentName('');
      setNewAgentDesc('');
      toast.success(`Agent "${newAgentName}" registered successfully!`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create agent';
      setAgentActionError(msg);
      toast.error(msg, 'Agent Creation Failed');
    } finally {
      setCreatingAgent(false);
    }
  };

  // Handler for opening policy modal
  const handleOpenPolicyModal = async (agent: Agent) => {
    setPolicyModalAgent(agent);
    setPolicySuccess(false);
    setAgentActionError(null);

    try {
      const pol = await fetchAgentPolicy(agent.id);
      if (pol) {
        setPolicyPerTx((parseFloat(pol.per_transaction_limit || '500000') / 1_000_000).toFixed(2));
        setPolicyDaily((parseFloat(pol.daily_limit || '5000000') / 1_000_000).toFixed(2));
        setPolicyThreshold((parseFloat(pol.approval_threshold || '500000') / 1_000_000).toFixed(2));
        setPolicyMaxTx((pol.max_transactions_per_day || 20).toString());
        setPolicyEnabled(pol.enabled ?? true);
      }
    } catch {
      // Default values
      setPolicyPerTx('0.50');
      setPolicyDaily('5.00');
      setPolicyThreshold('0.50');
      setPolicyMaxTx('20');
      setPolicyEnabled(true);
    }
  };

  // Handler for saving policy
  const handleSavePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyModalAgent) return;
    setSavingPolicy(true);
    setAgentActionError(null);
    setPolicySuccess(false);

    try {
      const perTxMicro = Math.round(parseFloat(policyPerTx || '0.50') * 1_000_000).toString();
      const dailyMicro = Math.round(parseFloat(policyDaily || '5.00') * 1_000_000).toString();
      const thresholdMicro = Math.round(parseFloat(policyThreshold || '0.50') * 1_000_000).toString();

      await updateAgentPolicy(policyModalAgent.id, {
        per_transaction_limit: perTxMicro,
        daily_limit: dailyMicro,
        approval_threshold: thresholdMicro,
        max_transactions_per_day: parseInt(policyMaxTx, 10) || 20,
        enabled: policyEnabled,
      });

      setPolicySuccess(true);
      toast.success('Autonomous spending policy updated successfully!');
      await loadData();
      setTimeout(() => {
        setPolicyModalAgent(null);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save policy';
      setAgentActionError(msg);
      toast.error(msg, 'Policy Update Failed');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handler for Pause / Resume
  const handleToggleAgentStatus = async (agent: Agent) => {
    try {
      if (agent.status === 'PAUSED') {
        await resumeAgent(agent.id);
        toast.success(`Agent "${agent.name}" resumed`);
      } else {
        await pauseAgent(agent.id);
        toast.warning(`Agent "${agent.name}" paused`);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update agent status';
      toast.error(msg);
    }
  };

  // Handler for approving an intent
  const handleApprove = async (approvalId: string) => {
    setResolvingApprovalId(approvalId);
    try {
      await approveIntent(approvalId, user?.id || 'operator', 'Approved via Web Dashboard');
      toast.success('Payment intent approved');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve intent';
      toast.error(msg);
    } finally {
      setResolvingApprovalId(null);
    }
  };

  // Handler for rejecting an intent
  const handleReject = async (approvalId: string) => {
    setResolvingApprovalId(approvalId);
    try {
      await rejectIntent(approvalId, user?.id || 'operator', 'Rejected via Web Dashboard');
      toast.info('Payment intent rejected');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject intent';
      toast.error(msg);
    } finally {
      setResolvingApprovalId(null);
    }
  };

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'ACTIVE').length;
  const pendingIntents = intents.filter((i) => i.status === 'CREATED' || i.status === 'AUTHORIZED' || i.status === 'APPROVAL_REQUIRED').length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;

  const testnetContract = arcStatus?.testnet_agent_vault_address || '0x7789bC3d8366782b97496165C24BD5bB09302843';
  const testnetTx = arcStatus?.testnet_deployment_tx || '0xcc3485dc1958fde3b7bb75623e01c00e8dc155723d69cb64516fefdde2dccb70';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
              {organization?.name || 'Economic Control Plane'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              ARC TESTNET 5042002
            </span>
          </div>
          <p className="text-xs text-[#716F69] mt-1">
            {user ? `Operator: ${user.name} (${user.email})` : 'Infrastructure control for autonomous agents, spending policies, and Arc settlement.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateAgentOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#D6A83A] hover:bg-[#e0b74c] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <span>+</span> Register AI Agent
          </button>
          <AutoExecutionBadge autoExecutionEnabled={health.auto_execution_enabled} />
        </div>
      </div>

      {/* Honest Status & Safety Invariant Banner */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#222222] bg-[#101010] shadow-sm space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c1c1c] pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-2 w-2 rounded-full bg-[#2FB36F] animate-pulse" />
            <span className="text-xs font-bold text-[#F2F0EA] tracking-wide">
              ARC TESTNET OPERATIONAL STATUS
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">
              TESTNET ACTIVE
            </span>
            <span className="text-[11px] text-[#716F69]">
              Chain ID: 5042002
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://testnet.arcscan.app/address/${testnetContract}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141414] hover:bg-[#1a1a1a] text-[#D6A83A] hover:text-[#F2F0EA] border border-[#222222] transition-colors flex items-center gap-1"
            >
              <span>ArcScan Vault</span>
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
            <span className="text-[10px] text-[#2FB36F] block">Bytecode Confirmed</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">Safety Invariant Flag</span>
            <div className="font-semibold text-[#D85C5C] text-[11px]">
              ENABLE_LIVE_EXECUTION = false
            </div>
            <span className="text-[10px] text-[#716F69] block">Mainnet transfers blocked by system design</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">Vault Spending Policy</span>
            <div className="font-semibold text-[#D6A83A] text-[11px]">
              Disabled on Contract Level
            </div>
            <span className="text-[10px] text-[#716F69] block">Off-chain Rust rules strictly enforce limits</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="ACTIVE AGENTS"
          value={`${activeAgents} / ${totalAgents}`}
          subtitle={`${totalAgents} registered in organization`}
        />
        <MetricCard
          title="PENDING APPROVALS"
          value={pendingApprovalsCount.toString()}
          subtitle={pendingApprovalsCount > 0 ? 'Requires human authorization' : 'All clear'}
        />
        <MetricCard
          title="PAYMENT INTENTS"
          value={intents.length.toString()}
          subtitle={`${pendingIntents} in flight`}
        />
        <MetricCard
          title="SETTLED TRANSACTIONS"
          value={transactions.length.toString()}
          subtitle="Arc Testnet USDC"
        />
      </div>

      {/* System Health */}
      <HealthStatus health={health} />

      {/* Error state */}
      {error && (
        <ErrorState
          title="Connection Notice"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* Real AI Agents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Registered AI Agents</h2>
            <p className="text-xs text-[#716F69]">
              Agents owned by your organization with isolated spending policies.
            </p>
          </div>
          <button
            onClick={() => setCreateAgentOpen(true)}
            className="text-xs text-[#D6A83A] hover:underline font-medium"
          >
            + New Agent
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0F0F0F] border border-[#222222] text-center space-y-3">
            <div className="text-2xl">🤖</div>
            <h3 className="text-sm font-semibold text-[#F2F0EA]">No Agents Registered Yet</h3>
            <p className="text-xs text-[#716F69] max-w-md mx-auto">
              Create an AI agent to establish off-chain spending policies and allow autonomous payments.
            </p>
            <button
              onClick={() => setCreateAgentOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-semibold text-xs transition-colors"
            >
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-5 rounded-xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#F2F0EA]">{agent.name}</h3>
                      <span className="text-[10px] font-mono text-[#716F69] block truncate max-w-[180px]">
                        ID: {agent.id}
                      </span>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>

                  {agent.description && (
                    <p className="text-xs text-[#A09D95] line-clamp-2">{agent.description}</p>
                  )}

                  <div className="p-2.5 rounded-lg bg-[#141414] border border-[#1F1F1F] text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#716F69]">VAULT:</span>
                      <span className="text-[#D6A83A] truncate max-w-[140px]" title={agent.vault_address || testnetContract}>
                        {agent.vault_address || testnetContract}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#716F69]">NETWORK:</span>
                      <span className="text-[#F2F0EA]">Arc Testnet</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1C1C1C]">
                  <button
                    onClick={() => handleOpenPolicyModal(agent)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-xs font-medium text-[#F2F0EA] transition-colors"
                  >
                    Configure Policy
                  </button>
                  <button
                    onClick={() => handleToggleAgentStatus(agent)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-mono font-medium transition-colors ${
                      agent.status === 'PAUSED'
                        ? 'bg-[#2FB36F]/10 border-[#2FB36F]/30 text-[#2FB36F] hover:bg-[#2FB36F]/20'
                        : 'bg-[#D85C5C]/10 border-[#D85C5C]/30 text-[#D85C5C] hover:bg-[#D85C5C]/20'
                    }`}
                  >
                    {agent.status === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Human Approvals Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Pending Human Approvals</h2>
            <p className="text-xs text-[#716F69]">
              High-value payment proposals exceeding agent autonomous thresholds.
            </p>
          </div>
          <span className="text-xs font-mono text-[#D6A83A]">
            {pendingApprovalsCount} Pending
          </span>
        </div>

        {approvals.filter((a) => a.status === 'PENDING').length === 0 ? (
          <div className="p-6 rounded-xl bg-[#0F0F0F] border border-[#222222] text-center text-xs text-[#716F69]">
            ✓ No pending human approvals. All agent transactions within autonomous policy limits.
          </div>
        ) : (
          <div className="space-y-3">
            {approvals
              .filter((a) => a.status === 'PENDING')
              .map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl bg-[#0F0F0F] border border-[#2B2B2B] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D6A83A] animate-pulse" />
                      <span className="text-xs font-mono font-bold text-[#F2F0EA]">
                        Approval ID: {app.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">
                        PENDING
                      </span>
                    </div>
                    <div className="text-xs text-[#A09D95]">
                      Payment Intent: <span className="font-mono text-[#F2F0EA]">{app.payment_intent_id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={resolvingApprovalId === app.id}
                      className="px-4 py-1.5 rounded-lg bg-[#2FB36F] hover:bg-[#34c77b] text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {resolvingApprovalId === app.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={resolvingApprovalId === app.id}
                      className="px-4 py-1.5 rounded-lg bg-[#D85C5C]/20 hover:bg-[#D85C5C]/30 border border-[#D85C5C]/40 text-[#D85C5C] font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Payment Intents Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F2F0EA]">Recent Payment Intents</h2>
          <Link href="/payment-intents" className="text-xs text-[#D6A83A] hover:underline">
            View All Intents →
          </Link>
        </div>
        <IntentTable intents={intents.slice(0, 5)} />
      </div>

      {/* Settlements Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F2F0EA]">Settled Transactions (Arc Testnet)</h2>
          <Link href="/transactions" className="text-xs text-[#D6A83A] hover:underline">
            View All Transactions →
          </Link>
        </div>
        <TransactionTable transactions={transactions.slice(0, 5)} />
      </div>

      {/* CREATE AGENT MODAL */}
      {createAgentOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F0F0F] border border-[#2B2B2B] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <h3 className="text-lg font-bold text-[#F2F0EA]">Register New AI Agent</h3>
              <button
                onClick={() => setCreateAgentOpen(false)}
                className="text-xs text-[#716F69] hover:text-[#F2F0EA]"
              >
                ✕
              </button>
            </div>

            {agentActionError && (
              <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
                {agentActionError}
              </div>
            )}

            <form onSubmit={handleCreateAgentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Agent Name / Handle</label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. inference-worker-02"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Description</label>
                <input
                  type="text"
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="e.g. Web scraping and automated inference agent"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Vault Address</label>
                <input
                  type="text"
                  value={newAgentVault}
                  onChange={(e) => setNewAgentVault(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-xs text-[#D6A83A] font-mono outline-none"
                />
                <span className="text-[10px] text-[#716F69]">Arc Testnet AgentVault pre-configured</span>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateAgentOpen(false)}
                  className="py-2.5 px-4 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#2B2B2B] text-xs font-medium text-[#A09D95] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAgent}
                  className="flex-1 py-2.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {creatingAgent ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POLICY CONFIGURATION MODAL */}
      {policyModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F0F0F] border border-[#2B2B2B] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#F2F0EA]">Policy Configuration</h3>
                <span className="text-xs font-mono text-[#D6A83A]">Agent: {policyModalAgent.name} ({policyModalAgent.id})</span>
              </div>
              <button
                onClick={() => setPolicyModalAgent(null)}
                className="text-xs text-[#716F69] hover:text-[#F2F0EA]"
              >
                ✕
              </button>
            </div>

            {agentActionError && (
              <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
                {agentActionError}
              </div>
            )}

            {policySuccess && (
              <div className="p-3 rounded-lg bg-[#2FB36F]/10 border border-[#2FB36F]/30 text-xs text-[#2FB36F] font-mono">
                ✓ Policy successfully updated and active in Rust Policy Engine.
              </div>
            )}

            <form onSubmit={handleSavePolicySubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-xs font-medium text-[#F2F0EA]">Policy Enforcement</span>
                <button
                  type="button"
                  onClick={() => setPolicyEnabled(!policyEnabled)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    policyEnabled
                      ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                      : 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                  }`}
                >
                  {policyEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A09D95]">Per-Transaction Limit</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={policyPerTx}
                      onChange={(e) => setPolicyPerTx(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A09D95]">Daily Spending Cap</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.10"
                      min="0.10"
                      required
                      value={policyDaily}
                      onChange={(e) => setPolicyDaily(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A09D95]">Max Transactions Per Day</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyMaxTx}
                    onChange={(e) => setPolicyMaxTx(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A09D95]">Human Approval Threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={policyThreshold}
                      onChange={(e) => setPolicyThreshold(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setPolicyModalAgent(null)}
                  className="py-2.5 px-4 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#2B2B2B] text-xs font-medium text-[#A09D95] transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="flex-1 py-2.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {savingPolicy ? 'Saving Changes...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
