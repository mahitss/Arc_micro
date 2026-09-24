'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchSecurityCenter } from '../../../lib/api/control';

export default function ControlIntelligencePage() {
  const [intel, setIntel] = useState<any>({
    recommendations: [
      {
        id: 'rec_01',
        title: 'Optimize Research Provider Routing',
        why: 'Agent agent_crawler_09 demonstrates 18% lower cost and 99.1% verification over 30d sample',
        evidence: 'Empirical telemetry across 45 completed missions',
        confidence: 0.94,
        status: 'RECOMMENDED',
      },
      {
        id: 'rec_02',
        title: 'Increase Safety Buffer Floor for Peak Swarm Window',
        why: 'Correlated swarm activity between 14:00 - 18:00 UTC increases settlement cluster factor to 2.4x',
        evidence: 'Digital twin stress simulation results',
        confidence: 0.89,
        status: 'ACTIVE',
      },
    ],
    performance_drift: {
      avg_verification_rate: 0.988,
      avg_latency_ms: 165,
      cost_variance: '-4.2%',
    },
    forecast_accuracy_30d: '96.4%',
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* HEADER */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold">ECONOMIC INTELLIGENCE CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-mono font-bold">
            OBSERVATIONAL GUIDANCE ONLY
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono">
            ECONOMIC INTELLIGENCE & ADAPTIVE LEARNING
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous counterparty reputation scoring, performance drift analysis, and model-driven recommendations.
          </p>
        </div>

        {/* INVARIANT WARNING BANNER */}
        <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl text-xs font-mono text-blue-300">
          <strong>SECURITY INVARIANT (INV-100):</strong> Recommendations provide operational optimization guidance only.
          Under no circumstances does machine intelligence synthesize financial authorization or bypass deterministic Rust policy checks.
        </div>

        {/* PERFORMANCE DRIFT & ACCURACY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 bg-[#0e1626] border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 uppercase">30D Forecast Accuracy</span>
            <div className="text-2xl font-bold text-emerald-400">{intel.forecast_accuracy_30d}</div>
            <p className="text-[11px] text-slate-500">Continuous calibration against Arc settlement logs</p>
          </div>

          <div className="p-4 bg-[#0e1626] border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 uppercase">Avg Verification Rate</span>
            <div className="text-2xl font-bold text-teal-300">
              {(intel.performance_drift.avg_verification_rate * 100).toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500">Deliverable cryptographic checksum matches</p>
          </div>

          <div className="p-4 bg-[#0e1626] border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 uppercase">Cost Variance vs Quote</span>
            <div className="text-2xl font-bold text-purple-400">{intel.performance_drift.cost_variance}</div>
            <p className="text-[11px] text-slate-500">Net economy savings through competitive quote routing</p>
          </div>
        </div>

        {/* RECOMMENDATIONS LIST */}
        <section className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            ACTIVE OPTIMIZATION RECOMMENDATIONS ({intel.recommendations.length})
          </h2>

          <div className="space-y-4">
            {intel.recommendations.map((rec: any) => (
              <div key={rec.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{rec.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/20 text-[10px]">
                      CONFIDENCE: {(rec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                    {rec.status}
                  </span>
                </div>

                <div className="space-y-1 pt-1 text-slate-300">
                  <div>
                    <span className="text-slate-500 uppercase">Why:</span> {rec.why}
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase">Evidence:</span> {rec.evidence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
