'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '../../../components/StatusBadge';
import { AddressDisplay } from '../../../components/AddressDisplay';
import { PolicyCard } from '../../../components/PolicyCard';
import { IntentTable } from '../../../components/IntentTable';
import { ErrorState } from '../../../components/ErrorState';
import { fetchAgent } from '../../../lib/api/agents';
import { fetchIntents } from '../../../lib/api/intents';
import { AgentDetail, PaymentIntent } from '../../../lib/api/types';
import { DEMO_AGENT_DETAIL, DEMO_INTENTS } from '../../../lib/api/demo_fixtures';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || '';

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadAgentDetail = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setAgent({ ...DEMO_AGENT_DETAIL, id: agentId || DEMO_AGENT_DETAIL.id });
      setIntents(DEMO_INTENTS.filter((i) => i.agent_id === (agentId || DEMO_AGENT_DETAIL.id)));
      setLoading(false);
      return;
    }

    try {
      const [agentData, intentsData] = await Promise.all([
        fetchAgent(agentId),
        fetchIntents().catch(() => []),
      ]);
      setAgent(agentData);
      setIntents(intentsData.filter((i) => i.agent_id === agentId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load agent detail';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentId) {
      loadAgentDetail(isDemoMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, isDemoMode]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="text-xs font-mono text-slate-400 hover:text-teal-400 transition-colors"
          >
            ← Agents
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-xl font-bold text-white font-mono">{agentId}</h1>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
        >
          {isDemoMode ? '● DEMO MODE' : '○ Demo Mode'}
        </button>
      </div>

      {error && !isDemoMode && (
        <ErrorState
          title="Agent Data Unavailable"
          message={`${error}. Ensure Go Gateway is running or toggle Demo Mode above.`}
          onRetry={() => loadAgentDetail(false)}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
          <div className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800" />
        </div>
      ) : agent ? (
        <>
          {/* Identity & Balance Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-mono text-slate-500 uppercase">Agent Name</div>
              <div className="text-lg font-bold text-white mt-1">{agent.name}</div>
              <div className="mt-2">
                <StatusBadge status={agent.status} size="sm" />
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-slate-500 uppercase">Custodial Vault</div>
              <div className="mt-1">
                <AddressDisplay
                  address={agent.vault_address || ''}
                  truncate={true}
                  copyable={true}
                  label="Vault Address"
                />
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">{agent.network}</div>
            </div>

            <div>
              <div className="text-xs font-mono text-slate-500 uppercase">USDC Balance</div>
              <div className="text-2xl font-bold text-white mt-1">
                {agent.usdc_balance ? (
                  <>
                    {agent.usdc_balance} <span className="text-xs font-normal text-teal-400">USDC</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-normal">Balance unavailable</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">AgentVault ERC-20 contract</div>
            </div>

            <div>
              <div className="text-xs font-mono text-slate-500 uppercase">Registered At</div>
              <div className="text-xs font-mono text-slate-300 mt-1">
                {new Date(agent.created_at).toLocaleString()}
              </div>
              <div className="text-[11px] text-teal-400 font-mono mt-2">Zero-Float Invariant Active</div>
            </div>
          </div>

          {/* Spending Policy Card */}
          {agent.policy && <PolicyCard policy={agent.policy} />}

          {/* Recent Intents for Agent */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Payment Intents for {agent.name}</h2>
            <IntentTable intents={intents} />
          </div>
        </>
      ) : null}
    </div>
  );
}
