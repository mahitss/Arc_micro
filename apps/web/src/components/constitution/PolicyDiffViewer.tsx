'use client';

import React from 'react';
import type { PolicyDiff } from '@/lib/api/constitution';
import { AuthorityDeltaBadge } from './AuthorityDeltaBadge';

interface PolicyDiffViewerProps {
  diff: PolicyDiff;
}

export function PolicyDiffViewer({ diff }: PolicyDiffViewerProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Constitutional Diff: v{diff.old_version} &rarr; v{diff.new_version}
            </h3>
            <AuthorityDeltaBadge delta={diff.authority_delta} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {diff.authority_delta?.explanation || 'Structural policy difference computed across all constitutional rules.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            +{diff.added_rules?.length || 0} Added
          </span>
          <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
            -{diff.removed_rules?.length || 0} Removed
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            ~{diff.modified_rules?.length || 0} Modified
          </span>
        </div>
      </div>

      {/* Authority Delta Dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Spending Authority</div>
          <div className="text-xs font-mono font-bold mt-1 text-slate-200">
            {diff.authority_delta?.spending_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Recipient Whitelist</div>
          <div className="text-xs font-mono font-bold mt-1 text-slate-200">
            {diff.authority_delta?.recipient_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Delegation Bounds</div>
          <div className="text-xs font-mono font-bold mt-1 text-slate-200">
            {diff.authority_delta?.delegation_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Risk Ceiling</div>
          <div className="text-xs font-mono font-bold mt-1 text-slate-200">
            {diff.authority_delta?.risk_tolerance_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Human Approval</div>
          <div className="text-xs font-mono font-bold mt-1 text-slate-200">
            {diff.authority_delta?.approval_delta || 'UNCHANGED'}
          </div>
        </div>
      </div>

      {/* Modified Rules */}
      {diff.modified_rules && diff.modified_rules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
            Modified Rules (~{diff.modified_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.modified_rules.map((m) => (
              <div key={m.rule_id} className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-slate-200">{m.rule_id}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    {m.change_type}
                  </span>
                </div>
                <div className="text-slate-400 mb-2">{m.description}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-rose-950/30 border border-rose-900/40 rounded p-2 text-rose-300">
                    <span className="text-[10px] text-rose-400 font-bold block mb-0.5">PRIOR (v{diff.old_version}):</span>
                    {m.old_details}
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-900/40 rounded p-2 text-emerald-300">
                    <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">PROPOSED (v{diff.new_version}):</span>
                    {m.new_details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Added Rules */}
      {diff.added_rules && diff.added_rules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
            Added Rules (+{diff.added_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.added_rules.map((r) => (
              <div key={r.rule_id} className="bg-slate-950/80 border border-emerald-500/30 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-emerald-300">{r.rule_id} ({r.type})</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    PRIORITY {r.priority}
                  </span>
                </div>
                <p className="text-slate-300">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Rules */}
      {diff.removed_rules && diff.removed_rules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider">
            Removed Rules (-{diff.removed_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.removed_rules.map((r) => (
              <div key={r.rule_id} className="bg-slate-950/80 border border-rose-500/30 rounded-lg p-3 text-xs opacity-75">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-rose-300 line-through">{r.rule_id} ({r.type})</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">REMOVED</span>
                </div>
                <p className="text-slate-400 line-through">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
