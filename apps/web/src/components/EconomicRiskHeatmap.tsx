'use client';

import React, { useState } from 'react';

interface HeatmapService {
  id: string;
  name: string;
  category: string;
  priceUsdc: number;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reliabilityBps: number; // e.g. 9980 = 99.8%
  reputationBps: number;
  isSelected: boolean;
  selectionRank: number;
  reason: string;
}

const DEFAULT_HEATMAP_SERVICES: HeatmapService[] = [
  {
    id: 'web-research',
    name: 'Web Research & Intelligence API',
    category: 'RESEARCH',
    priceUsdc: 0.50,
    riskScore: 12,
    riskLevel: 'LOW',
    reliabilityBps: 9980,
    reputationBps: 9920,
    isSelected: true,
    selectionRank: 1,
    reason: 'Optimal trade-off: lowest risk score (12/100) and verified historical reliability (99.8%) within budget ceiling.',
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis & Extraction Agent',
    category: 'DATA',
    priceUsdc: 0.75,
    riskScore: 22,
    riskLevel: 'LOW',
    reliabilityBps: 9910,
    reputationBps: 9840,
    isSelected: true,
    selectionRank: 2,
    reason: 'Verified on-chain counterparty with active SLA and sub-second average response time.',
  },
  {
    id: 'compute-cluster',
    name: 'GPU Inference Compute Cluster',
    category: 'COMPUTE',
    priceUsdc: 1.00,
    riskScore: 38,
    riskLevel: 'MEDIUM',
    reliabilityBps: 9850,
    reputationBps: 9750,
    isSelected: true,
    selectionRank: 3,
    reason: 'High-performance compute allocation with strict pre-payment reservation check.',
  },
  {
    id: 'cheap-scraper',
    name: 'Budget Scraper Microservice',
    category: 'RESEARCH',
    priceUsdc: 0.15,
    riskScore: 74,
    riskLevel: 'HIGH',
    reliabilityBps: 8420,
    reputationBps: 7900,
    isSelected: false,
    selectionRank: 4,
    reason: 'Rejected by economic selector: high variance in delivery latency and unverified settlement address.',
  },
  {
    id: 'unverified-oracle',
    name: 'Rapid Consensus Feed (Beta)',
    category: 'ORACLE',
    priceUsdc: 0.22,
    riskScore: 82,
    riskLevel: 'HIGH',
    reliabilityBps: 8100,
    reputationBps: 7100,
    isSelected: false,
    selectionRank: 5,
    reason: 'Policy gate rejection: requires human authorization gate due to unverified trust status.',
  },
];

export default function EconomicRiskHeatmap({
  services = DEFAULT_HEATMAP_SERVICES,
}: {
  services?: HeatmapService[];
}) {
  const [selectedService, setSelectedService] = useState<HeatmapService | null>(services[0] || null);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getReliabilityBar = (bps: number) => {
    const pct = Math.min(100, Math.max(0, bps / 100));
    const color = pct >= 99 ? 'bg-emerald-500' : pct >= 95 ? 'bg-amber-500' : 'bg-rose-500';
    return { width: `${pct}%`, color };
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Deterministic Economic Risk Heatmap
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Trade-off matrix based on deterministic economic selection algorithm (Price vs. Inherent Risk vs. Reliability)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Low Risk
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium Risk
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> High Risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((svc) => {
          const rel = getReliabilityBar(svc.reliabilityBps);
          const isCurrent = selectedService?.id === svc.id;

          return (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className={`cursor-pointer rounded-lg border p-3.5 transition-all duration-200 ${
                isCurrent
                  ? 'border-cyan-500/80 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
                  : 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {svc.isSelected && (
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/30">
                        Rank #{svc.selectionRank} Selected
                      </span>
                    )}
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      {svc.category}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-medium text-zinc-100 line-clamp-1">{svc.name}</h4>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${getRiskColor(
                    svc.riskLevel
                  )}`}
                >
                  {svc.riskLevel} ({svc.riskScore})
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-zinc-800/60 pt-2.5">
                <div>
                  <span className="text-zinc-500 text-[11px] block">Projected Cost</span>
                  <span className="font-semibold text-zinc-200 font-mono">
                    ${svc.priceUsdc.toFixed(2)} USDC
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">Reliability SLA</span>
                  <span className="font-semibold text-zinc-200 font-mono">
                    {(svc.reliabilityBps / 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${rel.color}`} style={{ width: rel.width }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedService && (
        <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>Why Was This Service {selectedService.isSelected ? 'Selected' : 'Rejected'}?</span>
            </span>
            <span className="text-zinc-500 font-mono text-[11px]">
              Selector Reason Code: DETERMINISTIC_RANK_{selectedService.selectionRank}
            </span>
          </div>
          <p className="text-zinc-300 leading-relaxed">{selectedService.reason}</p>
        </div>
      )}
    </div>
  );
}
