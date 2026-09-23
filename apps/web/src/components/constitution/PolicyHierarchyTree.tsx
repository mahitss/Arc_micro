'use client';

import React from 'react';
import type { EconomicConstitution } from '@/lib/api/constitution';

interface PolicyHierarchyTreeProps {
  constitution: EconomicConstitution;
}

export function PolicyHierarchyTree({ constitution }: PolicyHierarchyTreeProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Monotonic Authority Hierarchy Tree
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Constitutional authority flows downward. Subordinates may only restrict bounds; they can never expand parent limits.
          </p>
        </div>
        <div className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs">
          INVARIANT: MONOTONIC_SUBSET
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-cyan-500 before:to-emerald-500">
        {/* Level 1: Sovereign Root Invariants */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md shadow-amber-500/50" />
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg p-3.5 hover:border-amber-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">LEVEL 1: SOVEREIGN ROOT INVARIANTS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">GLOBAL HARD DENY</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              Non-negotiable security boundaries: Zero private key exposure, no negative amounts, Arc USDC settlement strictly enforced.
            </p>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Priority: 100</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Version: v{constitution.version}</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Hash: {constitution.policy_hash?.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* Level 2: Organization Envelope */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-md shadow-cyan-500/50" />
          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-lg p-3.5 hover:border-cyan-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">LEVEL 2: ORGANIZATION ENVELOPE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300">SCOPE: ORG</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              Corporate treasury budget ceilings, asset whitelist, velocity throttles, and executive multi-sig approval thresholds.
            </p>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Daily Cap: $10,000.00</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Single Max: $2,500.00</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Approval &gt; $1,000.00</span>
            </div>
          </div>
        </div>

        {/* Level 3: Swarm / Mission Allocations */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-purple-400 border-2 border-slate-950 shadow-md shadow-purple-500/50" />
          <div className="bg-slate-950/80 border border-purple-500/30 rounded-lg p-3.5 hover:border-purple-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400">LEVEL 3: SWARM &amp; MISSION ALLOCATIONS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-400/20 text-purple-300">SCOPE: MISSION / SWARM</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              Coordinated group limits: Aggregate swarm budget caps, task concurrency ceilings, and Kahn DAG dependency orderings.
            </p>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Max Swarm Budget: $5,000.00</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Max Concurrency: 6 Agents</span>
            </div>
          </div>
        </div>

        {/* Level 4: Agent Delegated Subcontracting */}
        <div className="relative pl-4">
          <div className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md shadow-emerald-500/50" />
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-lg p-3.5 hover:border-emerald-400 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">LEVEL 4: AGENT DELEGATED LEAF</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300">SCOPE: SUBCONTRACTOR</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              Delegation bounds: Depth ≤ 2 hops, max 50% inherited budget passed to downstream agents, provider verification required.
            </p>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Inherited Budget: ≤ 50%</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Max Hops: 2</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Min Trust: 6,000 bps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
