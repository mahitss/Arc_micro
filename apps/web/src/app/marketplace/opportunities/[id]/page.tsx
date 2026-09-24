'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getOpportunity,
  matchOpportunity,
  awardOpportunity,
  MarketplaceOpportunity,
  CandidateSet,
} from '@/lib/api/marketplace';

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || 'opp_sec_audit_10k';

  const [opp, setOpp] = useState<MarketplaceOpportunity | null>(null);
  const [candidateSet, setCandidateSet] = useState<CandidateSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [awardedContract, setAwardedContract] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [o, c] = await Promise.all([
          getOpportunity(id),
          matchOpportunity(id),
        ]);
        setOpp(o);
        setCandidateSet(c);
        if (o.contract_id) {
          setAwardedContract(o.contract_id);
        }
      } catch (err) {
        console.error('Failed to load opportunity:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleAward = async (providerId: string, quotePrice: string) => {
    if (!opp) return;
    setAwarding(true);
    try {
      const res = await awardOpportunity(opp.opportunity_id, {
        provider_id: providerId,
        quote_id: `quote_auto_${Date.now()}`,
        quote_price_usdc: quotePrice,
      });
      setOpp(res);
      setAwardedContract(res.contract_id || `contract_mkt_${opp.opportunity_id}_${providerId}`);
    } catch (err) {
      console.error('Award failed:', err);
    } finally {
      setAwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">Loading opportunity detail...</div>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="text-red-400">Opportunity not found.</div>
        <Link href="/marketplace" className="text-cyan-400 underline mt-4 block">← Back to Marketplace</Link>
      </div>
    );
  }

  const topMatch = candidateSet?.candidates?.[0];
  const explanation = candidateSet?.explanation;

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
            <span className="font-mono text-xs text-cyan-400">{opp.opportunity_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5">{opp.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>Requester: <strong className="text-slate-200 font-mono">{opp.requester_id}</strong></span>
            <span>•</span>
            <span>Capability: <strong className="text-slate-200">{opp.capability}</strong></span>
            <span>•</span>
            <span>Budget Cap: <strong className="text-emerald-400">{opp.budget_constraint_usdc} USDC</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              opp.status === 'AWARDED'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}
          >
            {opp.status}
          </span>
          {awardedContract && (
            <div className="text-xs font-mono text-slate-300 bg-slate-900 px-3 py-1 rounded border border-slate-800">
              Contract: {awardedContract}
            </div>
          )}
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Requirements, Policy, Workflow */}
        <div className="lg:col-span-7 space-y-6">
          {/* Work Requirements & Constraints */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Opportunity Requirements & Constraints
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Deadline</span>
                <span className="font-medium text-slate-200">{new Date(opp.deadline).toLocaleString()}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Max Risk Requirement</span>
                <span className="font-medium text-cyan-300">LOW (Score &lt; 25)</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Quality Standard</span>
                <span className="font-medium text-purple-300">Confidence &gt; 95%</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Specification Payload</span>
              <pre className="text-xs font-mono text-cyan-200/90 whitespace-pre-wrap">
                {JSON.stringify(opp.requirements || { task: '10,000 security logs deep scan' }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Policy & Risk Boundaries */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              AgentPay Financial Controls Envelope
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-300">INV-181: Matching Payment Invariant</span>
                <span className="text-emerald-400 font-mono font-medium">ENFORCED (No Direct Authority)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-300">INV-182: Constitution Policy Rule</span>
                <span className="text-emerald-400 font-mono font-medium">ALLOWED (Within daily envelope)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded border border-slate-800">
                <span className="text-slate-300">INV-185: Budget Hard Ceiling</span>
                <span className="text-emerald-400 font-mono font-medium">LOCKED (Max {opp.budget_constraint_usdc} USDC)</span>
              </div>
            </div>
          </div>

          {/* Workflow Milestones */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contract Milestones & Result Verification
            </h2>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Milestone 1: Preliminary Static Scan</div>
                  <div className="text-[11px] text-slate-400">Hash attestation submission</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">15.00 USDC</div>
                  <div className="text-[10px] text-slate-500">Payable post-verification</div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Milestone 2: Final Formal Verification Report</div>
                  <div className="text-[11px] text-slate-400">Cryptographic audit proof verification</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">25.00 USDC</div>
                  <div className="text-[10px] text-slate-500">Settles on Arc via AgentVault</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Candidate Matches & WHY THIS PROVIDER? Explainer */}
        <div className="lg:col-span-5 space-y-6">
          {/* Explainer Panel (Section 47) */}
          {explanation && (
            <div className="bg-gradient-to-br from-cyan-950/50 via-slate-900/90 to-blue-950/40 border border-cyan-500/40 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <span>💡 Why This Provider?</span>
                </h3>
                <span className="text-[10px] font-mono text-cyan-300/80 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  Deterministic Match
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Selected Provider:</span>
                  <span className="font-mono font-bold text-white">{explanation.selected_provider_id}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Capability Compatibility:</span>
                  <span className="font-semibold text-emerald-400">{explanation.capability_match}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Deadline Feasibility:</span>
                  <span className="font-semibold text-emerald-400">{explanation.deadline_feasibility}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Constitutional Policy:</span>
                  <span className="font-semibold text-emerald-400">{explanation.policy_status}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Risk Assessment:</span>
                  <span className="font-semibold text-emerald-400">{explanation.risk_status}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Historical Performance:</span>
                  <span className="text-white font-medium">
                    {explanation.historical_success} (Sample: N={explanation.sample_size})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-cyan-900/40">
                  <span className="text-slate-400">Price Quote:</span>
                  <span className="text-emerald-300 font-bold">{explanation.quote_amount_usdc} USDC</span>
                </div>
                <div className="pt-2 text-slate-300">
                  <span className="text-slate-500 block text-[10px]">Deterministic Tie-Break Reason</span>
                  <span className="italic">{explanation.tie_break_reason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ranked Candidates */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Evaluated Candidate Quotes ({candidateSet?.candidates?.length || 0})
            </h3>

            <div className="space-y-3">
              {candidateSet?.candidates?.map((cand) => (
                <div
                  key={cand.provider_id}
                  className={`p-4 rounded-lg border transition-all ${
                    cand.rank === 1
                      ? 'bg-slate-900/90 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Rank #{cand.rank}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {cand.provider_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Historical: {((cand.historical_success_rate || 0.95) * 100).toFixed(1)}% (N={cand.sample_size})
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-emerald-400 block">
                        {cand.estimated_cost_usdc} USDC
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Risk: {cand.risk_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400">
                      Policy: {cand.policy_compatible ? '✅ COMPATIBLE' : '❌ DENIED'}
                    </span>
                    {opp.status !== 'AWARDED' ? (
                      <button
                        onClick={() => handleAward(cand.provider_id, cand.estimated_cost_usdc)}
                        disabled={awarding}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded shadow transition-all disabled:opacity-50"
                      >
                        {awarding ? 'Awarding...' : 'Award Contract'}
                      </button>
                    ) : (
                      <span className="text-xs text-purple-400 font-semibold">
                        {opp.awarded_provider_id === cand.provider_id ? '★ Awarded Winner' : 'Alternative'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
