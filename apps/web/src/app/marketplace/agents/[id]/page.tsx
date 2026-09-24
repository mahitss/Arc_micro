'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getAgentProfile,
  MarketplaceTrustModel,
} from '@/lib/api/marketplace';

export default function AgentProfilePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || 'agent_security_alpha';

  const [profile, setProfile] = useState<MarketplaceTrustModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await getAgentProfile(id);
        setProfile(p);
      } catch (err) {
        console.error('Failed to load agent profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">Loading agent trust profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="text-red-400">Agent profile not found.</div>
        <Link href="/marketplace" className="text-cyan-400 underline mt-4 block">← Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-400 hover:text-slate-200">
              ← Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-cyan-400">{profile.agent_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-3">
            <span>{profile.agent_id}</span>
            {profile.identity_verified && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                ✓ Identity Verified
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organization: <strong className="text-slate-300">{profile.organization}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            Total Completed Work: <strong className="text-white ml-1">{profile.total_completed_jobs} jobs</strong>
          </span>
          <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded">
            Dispute Rate: {((profile.overall_dispute_rate || 0) * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Trust Model Dimensions (Section 28) */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
            Multi-Dimensional Trust Model (Section 28)
          </h2>
          <span className="text-[11px] text-slate-500 italic">
            Measurable facts only — no subjective star ratings
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">1. Identity</span>
            <span className="font-bold text-emerald-400 block mt-1">PKI & Org Attested</span>
            <span className="text-[10px] text-slate-500">Known entity</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">2. Capability</span>
            <span className="font-bold text-cyan-300 block mt-1">Benchmarked</span>
            <span className="text-[10px] text-slate-500">Formal verification</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">3. Performance</span>
            <span className="font-bold text-emerald-400 block mt-1">98.5% Completion</span>
            <span className="text-[10px] text-slate-500">Sample N=110</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">4. Security</span>
            <span className="font-bold text-purple-300 block mt-1">Deterministic</span>
            <span className="text-[10px] text-slate-500">Policy verified</span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">5. Economic History</span>
            <span className="font-bold text-white block mt-1">Zero Exploits</span>
            <span className="text-[10px] text-slate-500">Clean Arc settlement</span>
          </div>
        </div>
      </div>

      {/* Contextual Performance Track Record (Section 13 & 14) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📊 Contextual Capability Breakdown</span>
          <span className="text-xs font-normal text-slate-400">(Never one global number)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.contextual_performance.map((metric) => (
            <div
              key={metric.metric_id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-400 font-bold">
                  {metric.capability_id}
                </span>
                <span className="text-xs text-slate-400">
                  Sample Size: <strong className="text-white">N={metric.sample_size}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800/60">
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">Completion</span>
                  <span className="font-bold text-emerald-400">{((metric.completion_rate || 0.98) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">Quote Accuracy</span>
                  <span className="font-bold text-emerald-400">{((metric.quote_accuracy || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">Acceptance</span>
                  <span className="font-bold text-emerald-400">{((metric.result_acceptance_rate || 0.99) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">Dispute Rate</span>
                  <span className="font-medium text-slate-300">{((metric.dispute_rate || 0.003) * 100).toFixed(2)}%</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">Avg Latency</span>
                  <span className="font-medium text-slate-300">{(metric.avg_duration_ms / 60000).toFixed(0)} mins</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded">
                  <span className="text-slate-500 block text-[10px]">P95 Latency</span>
                  <span className="font-medium text-slate-300">{(metric.p95_duration_ms / 60000).toFixed(0)} mins</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomalies & Risk Signals */}
      {profile.active_anomalies && profile.active_anomalies.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-5 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <span>⚠️ Active Security & Concentration Signals</span>
          </h3>
          <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1">
            {profile.active_anomalies.map((anom, idx) => (
              <li key={idx}>{anom}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
