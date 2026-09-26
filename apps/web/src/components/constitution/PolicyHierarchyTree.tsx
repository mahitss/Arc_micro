'use client';

import React from 'react';
import type { EconomicConstitution } from '@/lib/api/constitution';

interface PolicyHierarchyTreeProps {
  constitution: EconomicConstitution;
}

export function PolicyHierarchyTree({ constitution }: PolicyHierarchyTreeProps) {
  return (
    <div className="bg-[#101010] border border-[#222222] rounded-xl p-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
            Monotonic Authority Hierarchy Tree
          </h3>
          <p className="text-xs text-[#B0ADA5] mt-1">
            Constitutional authority flows downward. Subordinates may only restrict bounds; they can never expand parent limits.
          </p>
        </div>
        <div className="px-3 py-1 rounded bg-[#141414] border border-[#222222] text-[#D6A83A] font-mono text-xs">
          INVARIANT: MONOTONIC_SUBSET
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#222222]">
        {/* Level 1: Sovereign Root Invariants */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#D6A83A] border-2 border-[#080808]" />
          <div className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-lg p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#D6A83A]">LEVEL 1: SOVEREIGN ROOT INVARIANTS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#222222]">GLOBAL HARD DENY</span>
            </div>
            <p className="text-xs text-[#B0ADA5] mt-1 font-sans">
              Non-negotiable security boundaries: Zero private key exposure, no negative amounts, Arc USDC settlement strictly enforced.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[#716F69] flex flex-wrap gap-2">
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Priority: 100</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Version: v{constitution.version}</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Hash: {constitution.policy_hash?.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* Level 2: Organization Envelope */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#F2F0EA] border-2 border-[#080808]" />
          <div className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-lg p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#F2F0EA]">LEVEL 2: ORGANIZATION ENVELOPE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222]">SCOPE: ORG</span>
            </div>
            <p className="text-xs text-[#B0ADA5] mt-1 font-sans">
              Corporate treasury budget ceilings, asset whitelist, velocity throttles, and executive multi-sig approval thresholds.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[#716F69] flex flex-wrap gap-2">
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Daily Cap: $10,000.00</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Single Max: $2,500.00</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Approval &gt; $1,000.00</span>
            </div>
          </div>
        </div>

        {/* Level 3: Swarm / Mission Allocations */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#B0ADA5] border-2 border-[#080808]" />
          <div className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-lg p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#B0ADA5]">LEVEL 3: SWARM &amp; MISSION ALLOCATIONS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222]">SCOPE: MISSION / SWARM</span>
            </div>
            <p className="text-xs text-[#B0ADA5] mt-1 font-sans">
              Coordinated group limits: Aggregate swarm budget caps, task concurrency ceilings, and Kahn DAG dependency orderings.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[#716F69] flex flex-wrap gap-2">
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Max Swarm Budget: $5,000.00</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Max Concurrency: 6 Agents</span>
            </div>
          </div>
        </div>

        {/* Level 4: Agent Delegated Subcontracting */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#716F69] border-2 border-[#080808]" />
          <div className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-lg p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#B0ADA5]">LEVEL 4: AGENT DELEGATED LEAF</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222]">SCOPE: SUBCONTRACTOR</span>
            </div>
            <p className="text-xs text-[#B0ADA5] mt-1 font-sans">
              Delegation bounds: Depth ≤ 2 hops, max 50% inherited budget passed to downstream agents, provider verification required.
            </p>
            <div className="mt-2 text-[11px] font-mono text-[#716F69] flex flex-wrap gap-2">
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Inherited Budget: ≤ 50%</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Max Hops: 2</span>
              <span className="bg-[#0B0B0B] px-2 py-0.5 rounded border border-[#222222]">Min Trust: 6,000 bps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
