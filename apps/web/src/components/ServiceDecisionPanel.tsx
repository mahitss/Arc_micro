'use client';

import React from 'react';

export interface DecisionCandidate {
  service_id: string;
  service_name?: string;
  capability: string;
  price_usdc: string;
  quality_score_bps: number;
  reliability_score_bps: number;
  latency_ms: number;
  reputation_score_bps: number;
  risk_score: number;
  status: 'SELECTED' | 'REJECTED';
  rejection_reason?: string;
  is_mock?: boolean;
  source?: 'REAL_REGISTRY' | 'MOCK';
  rank?: number;
  utility_score?: number;
  capability_evidence?: string;
}

interface ServiceDecisionPanelProps {
  stepId: string;
  requiredCapability: string;
  candidates: DecisionCandidate[];
}

export function ServiceDecisionPanel({
  stepId,
  requiredCapability,
  candidates,
}: ServiceDecisionPanelProps) {
  return (
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Deterministic Service Selection &amp; Quote Evaluation — {stepId}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#B0ADA5]">
          <span>
            Capability: <span className="font-bold text-[#F2F0EA]">{requiredCapability}</span>
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] text-[#716F69] border border-[#222222]">
            DETERMINISTIC RANKING
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((cand, idx) => {
          const isSelected = cand.status === 'SELECTED';
          const isMock = cand.is_mock || cand.source === 'MOCK' || cand.service_id.startsWith('mock-');

          return (
            <div
              key={cand.service_id}
              className={`p-4 rounded-xl border transition-all space-y-3 text-xs ${
                isSelected
                  ? 'bg-[#141414] border border-[#2FB36F]/50 shadow-sm'
                  : 'bg-[#101010] border border-[#222222] opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{cand.service_name || cand.service_id}</h3>
                    {cand.rank && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#0c0c0c] text-[#716F69] border border-[#222222]">
                        #{cand.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#85827B]">{cand.service_id}</span>
                    {/* Clear Mock vs Real integration badge */}
                    {isMock ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">
                        MOCK INTEGRATION
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                        REAL REGISTRY PROVIDER
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                    isSelected
                      ? 'bg-[#2FB36F]/10 text-[#2FB36F] border-[#2FB36F]/40'
                      : 'bg-[#D85C5C]/10 text-[#D85C5C] border-[#D85C5C]/40'
                  }`}
                >
                  {cand.status}
                </span>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">PRICE</span>
                  <span className="text-white font-bold">{cand.price_usdc}</span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">RELIABILITY</span>
                  <span className="text-[#2FB36F] font-bold">
                    {(cand.reliability_score_bps / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">LATENCY</span>
                  <span className="text-[#B0ADA5] font-bold">{cand.latency_ms} ms</span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">QUALITY</span>
                  <span className="text-[#F2F0EA] font-bold">
                    {(cand.quality_score_bps / 100).toFixed(1)}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">UTILITY</span>
                  <span className="text-[#D6A83A] font-bold">
                    {cand.utility_score !== undefined ? `${cand.utility_score} bps` : `${Math.round(cand.quality_score_bps * 0.9)} bps`}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">RISK</span>
                  <span className={cand.risk_score > 20 ? 'text-[#D6A83A] font-bold' : 'text-[#B0ADA5]'}>
                    {cand.risk_score}
                  </span>
                </div>
              </div>

              {/* Capability evidence */}
              {cand.capability_evidence && (
                <div className="p-2 rounded bg-[#0b0b0b] border border-[#1a1a1a] text-[10px] text-[#716F69]">
                  Evidence: <span className="text-[#B0ADA5]">{cand.capability_evidence}</span>
                </div>
              )}

              {/* Rejection reason callout if not selected */}
              {!isSelected && cand.rejection_reason && (
                <div className="p-2.5 rounded bg-[#141414] border border-[#D85C5C]/30 text-[11px] text-[#D85C5C] space-y-0.5">
                  <span className="font-bold block uppercase text-[10px]">Filter Denial Reason:</span>
                  <span>{cand.rejection_reason}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
