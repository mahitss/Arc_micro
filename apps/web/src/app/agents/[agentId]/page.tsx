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
      <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="text-xs font-mono text-[#716F69] hover:text-[#D6A83A] transition-colors"
          >
            ← Agents
          </Link>
          <span className="text-[#50504C]">/</span>
          <h1 className="text-xl font-bold text-[#F2F0EA] font-mono">{agentId}</h1>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
            isDemoMode
              ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
              : 'bg-[#101010] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
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
          <div className="h-32 rounded-2xl bg-[#101010] border border-[#222222]" />
          <div className="h-64 rounded-2xl bg-[#101010] border border-[#222222]" />
        </div>
      ) : agent ? (
        <>
          {/* Identity & Balance Banner */}
          <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-mono text-[#716F69] uppercase">Agent Name</div>
              <div className="text-lg font-bold text-[#F2F0EA] mt-1">{agent.name}</div>
              <div className="mt-2">
                <StatusBadge status={agent.status} size="sm" />
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-[#716F69] uppercase">Custodial Vault</div>
              <div className="mt-1">
                <AddressDisplay
                  address={agent.vault_address || ''}
                  truncate={true}
                  copyable={true}
                  label="Vault Address"
                />
              </div>
              <div className="text-[11px] font-mono text-[#50504C] mt-1">{agent.network}</div>
            </div>

            <div>
              <div className="text-xs font-mono text-[#716F69] uppercase">USDC Balance</div>
              <div className="text-2xl font-bold text-[#F2F0EA] mt-1">
                {agent.usdc_balance ? (
                  <>
                    {agent.usdc_balance} <span className="text-xs font-normal text-[#D6A83A]">USDC</span>
                  </>
                ) : (
                  <span className="text-xs text-[#716F69] font-normal">Balance unavailable</span>
                )}
              </div>
              <div className="text-[11px] text-[#50504C] mt-1">AgentVault ERC-20 contract</div>
            </div>

            <div>
              <div className="text-xs font-mono text-[#716F69] uppercase">Registered At</div>
              <div className="text-xs font-mono text-[#B0ADA5] mt-1">
                {new Date(agent.created_at).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#2FB36F] font-mono mt-2">Zero-Float Invariant Active</div>
            </div>
          </div>

          {/* Spending Policy Card */}
          {agent.policy && <PolicyCard policy={agent.policy} />}

          {/* Recent Intents for Agent */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-[#F2F0EA]">Payment Intents for {agent.name}</h2>
            <IntentTable intents={intents} />
          </div>
        </>
      ) : null}
    </div>
  );
}
