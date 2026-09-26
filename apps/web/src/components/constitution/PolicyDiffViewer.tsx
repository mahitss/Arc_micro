'use client';

import React from 'react';
import type { PolicyDiff } from '@/lib/api/constitution';
import { AuthorityDeltaBadge } from './AuthorityDeltaBadge';

interface PolicyDiffViewerProps {
  diff: PolicyDiff;
}

export function PolicyDiffViewer({ diff }: PolicyDiffViewerProps) {
  return (
    <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              Constitutional Diff: v{diff.old_version} &rarr; v{diff.new_version}
            </h3>
            <AuthorityDeltaBadge delta={diff.authority_delta} />
          </div>
          <p className="text-xs text-[#85827B] mt-1">
            {diff.authority_delta?.explanation || 'Structural policy difference computed across all constitutional rules.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#2FB36F] border border-[#222222]">
            +{diff.added_rules?.length || 0} Added
          </span>
          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D85C5C] border border-[#222222]">
            -{diff.removed_rules?.length || 0} Removed
          </span>
          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D6A83A] border border-[#222222]">
            ~{diff.modified_rules?.length || 0} Modified
          </span>
        </div>
      </div>

      {/* Authority Delta Dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3">
          <div className="text-[10px] font-mono text-[#85827B] uppercase">Spending Authority</div>
          <div className="text-xs font-mono font-bold mt-1 text-[#F2F0EA]">
            {diff.authority_delta?.spending_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3">
          <div className="text-[10px] font-mono text-[#85827B] uppercase">Recipient Whitelist</div>
          <div className="text-xs font-mono font-bold mt-1 text-[#F2F0EA]">
            {diff.authority_delta?.recipient_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3">
          <div className="text-[10px] font-mono text-[#85827B] uppercase">Delegation Bounds</div>
          <div className="text-xs font-mono font-bold mt-1 text-[#F2F0EA]">
            {diff.authority_delta?.delegation_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3">
          <div className="text-[10px] font-mono text-[#85827B] uppercase">Risk Ceiling</div>
          <div className="text-xs font-mono font-bold mt-1 text-[#F2F0EA]">
            {diff.authority_delta?.risk_tolerance_delta || 'UNCHANGED'}
          </div>
        </div>
        <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-3">
          <div className="text-[10px] font-mono text-[#85827B] uppercase">Human Approval</div>
          <div className="text-xs font-mono font-bold mt-1 text-[#F2F0EA]">
            {diff.authority_delta?.approval_delta || 'UNCHANGED'}
          </div>
        </div>
      </div>

      {/* Modified Rules */}
      {diff.modified_rules && diff.modified_rules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-[#D6A83A] uppercase tracking-wider">
            Modified Rules (~{diff.modified_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.modified_rules.map((m) => (
              <div key={m.rule_id} className="bg-[#141414] border border-[#222222] rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-[#F2F0EA]">{m.rule_id}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181818] text-[#D6A83A]">
                    {m.change_type}
                  </span>
                </div>
                <div className="text-[#85827B] mb-2">{m.description}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-[#101010] border border-[#D85C5C]/30 rounded p-2 text-[#D85C5C]">
                    <span className="text-[10px] text-[#D85C5C] font-bold block mb-0.5">PRIOR (v{diff.old_version}):</span>
                    {m.old_details}
                  </div>
                  <div className="bg-[#101010] border border-[#2FB36F]/30 rounded p-2 text-[#2FB36F]">
                    <span className="text-[10px] text-[#2FB36F] font-bold block mb-0.5">PROPOSED (v{diff.new_version}):</span>
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
          <h4 className="text-xs font-mono font-semibold text-[#2FB36F] uppercase tracking-wider">
            Added Rules (+{diff.added_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.added_rules.map((r) => (
              <div key={r.rule_id} className="bg-[#141414] border border-[#222222] rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#2FB36F]">{r.rule_id} ({r.type})</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181818] text-[#2FB36F]">
                    PRIORITY {r.priority}
                  </span>
                </div>
                <p className="text-[#B0ADA5]">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Rules */}
      {diff.removed_rules && diff.removed_rules.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-semibold text-[#D85C5C] uppercase tracking-wider">
            Removed Rules (-{diff.removed_rules.length})
          </h4>
          <div className="space-y-2">
            {diff.removed_rules.map((r) => (
              <div key={r.rule_id} className="bg-[#141414] border border-[#222222] rounded-lg p-3 text-xs opacity-75">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-[#D85C5C] line-through">{r.rule_id} ({r.type})</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#181818] text-[#D85C5C]">REMOVED</span>
                </div>
                <p className="text-[#85827B] line-through">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
