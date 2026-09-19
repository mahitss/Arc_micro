import React from 'react';
import Link from 'next/link';
import { Agent } from '../lib/api/types';
import { StatusBadge } from './StatusBadge';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${encodeURIComponent(agent.id)}`}
      className="group block p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-900/90 transition-all shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors">
            {agent.name}
          </h3>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{agent.id}</div>
        </div>
        <StatusBadge status={agent.status} size="sm" />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] font-mono uppercase text-slate-500">Balance</div>
          <div className="font-semibold text-slate-200 mt-0.5">
            {agent.usdc_balance ? `$${agent.usdc_balance} USDC` : 'Unavailable'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-slate-500">Daily Limit</div>
          <div className="font-semibold text-slate-200 mt-0.5">
            {agent.daily_limit ? `$${agent.daily_limit} USDC` : 'Not configured'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-slate-500">Spent Today</div>
          <div className="font-semibold text-slate-300 mt-0.5">
            {agent.daily_spent ? `$${agent.daily_spent} USDC` : '$0.00 USDC'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-slate-500">Pending Intents</div>
          <div className="font-semibold text-slate-300 mt-0.5">
            {agent.pending_intents !== undefined ? agent.pending_intents : 0}
          </div>
        </div>
      </div>

      {agent.last_activity && (
        <div className="mt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>Active: {agent.last_activity}</span>
          <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      )}
    </Link>
  );
}
