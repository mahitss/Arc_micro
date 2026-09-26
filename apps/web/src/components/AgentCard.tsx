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
      className="group block p-5 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] hover:bg-[#141414] transition-all shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#F2F0EA] group-hover:text-white transition-colors">
            {agent.name}
          </h3>
          <div className="text-[11px] font-mono text-[#716F69] mt-0.5">{agent.id}</div>
        </div>
        <StatusBadge status={agent.status} size="sm" />
      </div>

      <div className="mt-4 pt-4 border-t border-[#1A1A1A] grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] font-mono uppercase text-[#85827B]">Balance</div>
          <div className="font-semibold text-[#F2F0EA] mt-0.5">
            {agent.usdc_balance ? `$${agent.usdc_balance} USDC` : 'Unavailable'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-[#85827B]">Daily Limit</div>
          <div className="font-semibold text-[#F2F0EA] mt-0.5">
            {agent.daily_limit ? `$${agent.daily_limit} USDC` : 'Not configured'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-[#85827B]">Spent Today</div>
          <div className="font-semibold text-[#B0ADA5] mt-0.5">
            {agent.daily_spent ? `$${agent.daily_spent} USDC` : '$0.00 USDC'}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase text-[#85827B]">Pending Intents</div>
          <div className="font-semibold text-[#B0ADA5] mt-0.5">
            {agent.pending_intents !== undefined ? agent.pending_intents : 0}
          </div>
        </div>
      </div>

      {agent.last_activity && (
        <div className="mt-3 text-[10px] font-mono text-[#716F69] flex justify-between items-center">
          <span>Active: {agent.last_activity}</span>
          <span className="text-[#D6A83A] group-hover:translate-x-0.5 transition-transform">→</span>
        </div>
      )}
    </Link>
  );
}
