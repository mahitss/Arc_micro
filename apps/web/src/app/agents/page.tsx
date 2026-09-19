'use client';

import React, { useEffect, useState } from 'react';
import { AgentCard } from '../../components/AgentCard';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { fetchAgents } from '../../lib/api/agents';
import { Agent } from '../../lib/api/types';
import { DEMO_AGENTS } from '../../lib/api/demo_fixtures';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadAgents = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      setAgents(DEMO_AGENTS);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load agents';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents(isDemoMode);
  }, [isDemoMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Autonomous Agents</h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered AI agents authorized to request economic payments through AgentPay.
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
          title="Agents Unavailable"
          message={error}
          onRetry={() => loadAgents(false)}
          isRetrying={loading}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-slate-900/60 border border-slate-800/80" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          title="No Agents Registered"
          description="There are currently no active AI agents registered in the storage repository."
          actionText="Load Demo Agents"
          onAction={() => setIsDemoMode(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
