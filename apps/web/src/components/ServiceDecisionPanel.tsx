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
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Service Decision Matrix — {stepId}
          </h2>
        </div>
        <span className="text-xs font-mono text-[#B0ADA5]">
          Capability: <span className="font-bold">{requiredCapability}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {candidates.map((cand) => {
          const isSelected = cand.status === 'SELECTED';

          return (
            <div
              key={cand.service_id}
              className={`p-4 rounded-xl border transition-all space-y-3 font-mono text-xs ${
                isSelected
                  ? 'bg-[#141414] border border-[#2D2D2D]'
                  : 'bg-[#101010] border border-[#222222] opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{cand.service_name || cand.service_id}</h3>
                  <span className="text-[10px] text-[#85827B]">{cand.service_id}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isSelected
                      ? 'bg-[#141414] text-[#2FB36F] border border-[#222222]'
                      : 'bg-[#141414] text-[#D85C5C] border border-[#222222]'
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
                  <span className="text-[#85827B] block">REPUTATION</span>
                  <span className="text-[#F2F0EA] font-bold">
                    {(cand.reputation_score_bps / 100).toFixed(1)}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0B0B0B] border border-[#222222]">
                  <span className="text-[#85827B] block">RISK</span>
                  <span className={cand.risk_score > 20 ? 'text-[#D6A83A] font-bold' : 'text-[#B0ADA5]'}>
                    {cand.risk_score}
                  </span>
                </div>
              </div>

              {/* Rejection reason callout if not selected */}
              {!isSelected && cand.rejection_reason && (
                <div className="p-2 rounded bg-[#141414] border border-[#D85C5C]/30 text-[11px] text-[#D85C5C]">
                  Reason: {cand.rejection_reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
