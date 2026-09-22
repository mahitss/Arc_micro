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
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Service Decision Matrix — {stepId}
          </h2>
        </div>
        <span className="text-xs font-mono text-cyan-300">
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
                  ? 'bg-teal-950/20 border-teal-500/50 shadow-md shadow-teal-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm">{cand.service_name || cand.service_id}</h3>
                  <span className="text-[10px] text-slate-500">{cand.service_id}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {cand.status}
                </span>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">PRICE</span>
                  <span className="text-white font-bold">{cand.price_usdc}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">RELIABILITY</span>
                  <span className="text-emerald-400 font-bold">
                    {(cand.reliability_score_bps / 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">LATENCY</span>
                  <span className="text-cyan-300 font-bold">{cand.latency_ms} ms</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">QUALITY</span>
                  <span className="text-teal-300 font-bold">
                    {(cand.quality_score_bps / 100).toFixed(1)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">REPUTATION</span>
                  <span className="text-indigo-300 font-bold">
                    {(cand.reputation_score_bps / 100).toFixed(1)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block">RISK</span>
                  <span className={cand.risk_score > 20 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                    {cand.risk_score}
                  </span>
                </div>
              </div>

              {/* Rejection reason callout if not selected */}
              {!isSelected && cand.rejection_reason && (
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
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
