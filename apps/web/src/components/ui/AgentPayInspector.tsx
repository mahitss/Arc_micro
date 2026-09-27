'use client';

import React from 'react';
import { AgentPayBadge, ProvenanceVariant } from './AgentPayBadge';

export interface InspectorEntity {
  type:
    | 'MISSION'
    | 'AGENT'
    | 'SERVICE'
    | 'PAYMENT'
    | 'POLICY_DECISION'
    | 'APPROVAL'
    | 'TRANSACTION'
    | 'WORKFLOW'
    | 'AI_PROPOSAL'
    | 'SIMULATION';
  id: string;
  title: string;
  status: string;
  statusVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
  provenance?: ProvenanceVariant;
  timestamp?: string;
  summary: string;
  // Key attributes
  identity?: {
    ownerOrAgent?: string;
    organization?: string;
    correlationId?: string;
    recipientAddress?: string;
  };
  decision?: {
    action: string;
    rule?: string;
    latencyUs?: number | string;
    outcome: 'ALLOWED' | 'BLOCKED' | 'PENDING' | 'SIMULATED';
    explanation: string;
  };
  financials?: {
    amountRequested?: string;
    amountAuthorized?: string;
    budgetCap?: string;
    treasuryReserved?: string;
    riskScore?: string | number;
  };
  relationships?: Array<{ label: string; id: string; type: string }>;
  evidence?: Array<{ label: string; value: string }>;
  auditTrail?: Array<{ timestamp: string; step: string; actor: string; status: string }>;
}

export interface AgentPayInspectorProps {
  entity: InspectorEntity | null;
  onClose: () => void;
}

export function AgentPayInspector({ entity, onClose }: AgentPayInspectorProps) {
  if (!entity) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#101010] border-l border-[#2B2B2B] h-full flex flex-col shadow-2xl text-[#F2F0EA] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#222222] bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#181818] text-[#D6A83A] border border-[#2B2B2B]">
              {entity.type}
            </span>
            <span className="font-mono text-xs text-[#716F69]">{entity.id}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#222222] text-[#B0ADA5] hover:text-[#F2F0EA] flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity & Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-[#F2F0EA]">
                {entity.title}
              </h2>
              <AgentPayBadge variant={entity.statusVariant || 'neutral'}>
                {entity.status}
              </AgentPayBadge>
            </div>
            <p className="text-xs sm:text-sm text-[#B0ADA5] leading-relaxed">
              {entity.summary}
            </p>
            {entity.timestamp && (
              <span className="inline-block text-[11px] font-mono text-[#716F69]">
                Recorded: {entity.timestamp}
              </span>
            )}
          </div>

          {/* Decision Panel if present */}
          {entity.decision && (
            <div className="p-4 rounded-xl border border-[#222222] bg-[#141414] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#716F69]">
                  Deterministic Decision
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    entity.decision.outcome === 'ALLOWED'
                      ? 'bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30'
                      : entity.decision.outcome === 'BLOCKED'
                      ? 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30'
                      : 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30'
                  }`}
                >
                  {entity.decision.outcome}
                </span>
              </div>
              <div className="text-xs text-[#F2F0EA]">
                <strong>Action:</strong> {entity.decision.action}
              </div>
              {entity.decision.rule && (
                <div className="text-xs font-mono text-[#D6A83A]">
                  Rule: {entity.decision.rule}
                </div>
              )}
              {entity.decision.latencyUs && (
                <div className="text-[11px] font-mono text-[#716F69]">
                  Evaluation Latency: {entity.decision.latencyUs}
                </div>
              )}
              <div className="text-xs text-[#B0ADA5] pt-1 border-t border-[#222222]">
                {entity.decision.explanation}
              </div>
            </div>
          )}

          {/* Financial Breakdown if present */}
          {entity.financials && (
            <div className="p-4 rounded-xl border border-[#222222] bg-[#141414] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#716F69] block">
                Financial Breakdown
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {entity.financials.amountRequested && (
                  <div>
                    <span className="text-[#716F69] block">Requested</span>
                    <span className="font-mono text-[#F2F0EA] font-semibold">
                      {entity.financials.amountRequested}
                    </span>
                  </div>
                )}
                {entity.financials.amountAuthorized && (
                  <div>
                    <span className="text-[#716F69] block">Authorized</span>
                    <span className="font-mono text-[#2FB36F] font-semibold">
                      {entity.financials.amountAuthorized}
                    </span>
                  </div>
                )}
                {entity.financials.budgetCap && (
                  <div>
                    <span className="text-[#716F69] block">Budget Ceiling</span>
                    <span className="font-mono text-[#B0ADA5]">
                      {entity.financials.budgetCap}
                    </span>
                  </div>
                )}
                {entity.financials.treasuryReserved && (
                  <div>
                    <span className="text-[#716F69] block">Encumbered</span>
                    <span className="font-mono text-[#D6A83A]">
                      {entity.financials.treasuryReserved}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Relationships if present */}
          {entity.relationships && entity.relationships.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#716F69] block">
                Connected Entities
              </span>
              <div className="space-y-1.5">
                {entity.relationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-[#222222] bg-[#141414] flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-[#B0ADA5]">{rel.label}</span>
                    <span className="text-[#D6A83A]">{rel.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence if present */}
          {entity.evidence && entity.evidence.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#716F69] block">
                Deterministic Evidence
              </span>
              <div className="space-y-1.5">
                {entity.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-[#222222] bg-[#141414] text-xs"
                  >
                    <span className="text-[#716F69] block text-[11px] font-mono">
                      {ev.label}
                    </span>
                    <span className="text-[#F2F0EA] font-mono break-all">{ev.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail if present */}
          {entity.auditTrail && entity.auditTrail.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#716F69] block">
                Causal Audit Trail
              </span>
              <div className="space-y-2 border-l border-[#2B2B2B] ml-2 pl-3">
                {entity.auditTrail.map((at, idx) => (
                  <div key={idx} className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#716F69]">
                        {at.timestamp}
                      </span>
                      <span className="font-semibold text-[#F2F0EA]">{at.step}</span>
                    </div>
                    <div className="text-[11px] text-[#B0ADA5] flex items-center gap-2">
                      <span>Actor: {at.actor}</span>
                      <span>·</span>
                      <span className="font-mono text-[#D6A83A]">{at.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222222] bg-[#0A0A0A] flex items-center justify-between text-xs text-[#716F69]">
          <span className="font-mono text-[11px]">AGENTPAY INSPECTOR · READ-ONLY</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] border border-[#222222] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
