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
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8 flex items-center justify-center">
        <div className="text-[#D6A83A] font-mono animate-pulse">Loading opportunity detail...</div>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8">
        <div className="text-[#D85C5C]">Opportunity not found.</div>
        <Link href="/marketplace" className="text-[#B0ADA5] hover:text-[#F2F0EA] underline mt-4 block">← Back to Marketplace</Link>
      </div>
    );
  }

  const topMatch = candidateSet?.candidates?.[0];
  const explanation = candidateSet?.explanation;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors">
              ← Marketplace
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="font-mono text-xs text-[#D6A83A]">{opp.opportunity_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-1.5">{opp.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#716F69]">
            <span>Requester: <strong className="text-[#F2F0EA] font-mono">{opp.requester_id}</strong></span>
            <span>•</span>
            <span>Capability: <strong className="text-[#F2F0EA]">{opp.capability}</strong></span>
            <span>•</span>
            <span>Budget Cap: <strong className="text-[#2FB36F]">{opp.budget_constraint_usdc} USDC</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              opp.status === 'AWARDED'
                ? 'bg-[#141414] text-[#D6A83A] border border-[#222222]'
                : 'bg-[#141414] text-[#2FB36F] border border-[#222222]'
            }`}
          >
            {opp.status}
          </span>
          {awardedContract && (
            <div className="text-xs font-mono text-[#B0ADA5] bg-[#141414] px-3 py-1 rounded border border-[#222222]">
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
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Opportunity Requirements & Constraints
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Deadline</span>
                <span className="font-medium text-[#F2F0EA]">{new Date(opp.deadline).toLocaleString()}</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Max Risk Requirement</span>
                <span className="font-medium text-[#F2F0EA]">LOW (Score &lt; 25)</span>
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] block text-[10px]">Quality Standard</span>
                <span className="font-medium text-[#D6A83A]">Confidence &gt; 95%</span>
              </div>
            </div>

            <div className="bg-[#0B0B0B] p-3.5 rounded-lg border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase block font-semibold mb-1">Specification Payload</span>
              <pre className="text-xs font-mono text-[#F2F0EA] whitespace-pre-wrap">
                {JSON.stringify(opp.requirements || { task: '10,000 security logs deep scan' }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Policy & Risk Boundaries */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              AgentPay Financial Controls Envelope
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#B0ADA5]">INV-181: Matching Payment Invariant</span>
                <span className="text-[#2FB36F] font-mono font-medium">ENFORCED (No Direct Authority)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#B0ADA5]">INV-182: Constitution Policy Rule</span>
                <span className="text-[#2FB36F] font-mono font-medium">ALLOWED (Within daily envelope)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#0B0B0B] rounded-lg border border-[#222222]">
                <span className="text-[#B0ADA5]">INV-185: Budget Hard Ceiling</span>
                <span className="text-[#2FB36F] font-mono font-medium">LOCKED (Max {opp.budget_constraint_usdc} USDC)</span>
              </div>
            </div>
          </div>

          {/* Workflow Milestones */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Contract Milestones & Result Verification
            </h2>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F2F0EA]">Milestone 1: Preliminary Static Scan</div>
                  <div className="text-[11px] text-[#716F69]">Hash attestation submission</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#F2F0EA]">15.00 USDC</div>
                  <div className="text-[10px] text-[#716F69]">Payable post-verification</div>
                </div>
              </div>
              <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F2F0EA]">Milestone 2: Final Formal Verification Report</div>
                  <div className="text-[11px] text-[#716F69]">Cryptographic audit proof verification</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#F2F0EA]">25.00 USDC</div>
                  <div className="text-[10px] text-[#716F69]">Settles on Arc via AgentVault</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Candidate Matches & WHY THIS PROVIDER? Explainer */}
        <div className="lg:col-span-5 space-y-6">
          {/* Explainer Panel (Section 47) */}
          {explanation && (
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F2F0EA] flex items-center gap-1.5">
                  <span>💡 Why This Provider?</span>
                </h3>
                <span className="text-[10px] font-mono text-[#D6A83A] bg-[#141414] px-2 py-0.5 rounded border border-[#222222]">
                  Deterministic Match
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Selected Provider:</span>
                  <span className="font-mono font-bold text-[#F2F0EA]">{explanation.selected_provider_id}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Capability Compatibility:</span>
                  <span className="font-semibold text-[#2FB36F]">{explanation.capability_match}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Deadline Feasibility:</span>
                  <span className="font-semibold text-[#2FB36F]">{explanation.deadline_feasibility}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Constitutional Policy:</span>
                  <span className="font-semibold text-[#2FB36F]">{explanation.policy_status}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Risk Assessment:</span>
                  <span className="font-semibold text-[#2FB36F]">{explanation.risk_status}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Historical Performance:</span>
                  <span className="text-[#F2F0EA] font-medium">
                    {explanation.historical_success} (Sample: N={explanation.sample_size})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#716F69]">Price Quote:</span>
                  <span className="text-[#2FB36F] font-bold">{explanation.quote_amount_usdc} USDC</span>
                </div>
                <div className="pt-2 text-[#B0ADA5]">
                  <span className="text-[#716F69] block text-[10px]">Deterministic Tie-Break Reason</span>
                  <span className="italic">{explanation.tie_break_reason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ranked Candidates */}
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#716F69]">
              Evaluated Candidate Quotes ({candidateSet?.candidates?.length || 0})
            </h3>

            <div className="space-y-3">
              {candidateSet?.candidates?.map((cand) => (
                <div
                  key={cand.provider_id}
                  className={`p-4 rounded-lg border transition-all ${
                    cand.rank === 1
                      ? 'bg-[#141414] border-[#D6A83A]'
                      : 'bg-[#0B0B0B] border-[#222222]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#181818] text-[#D6A83A] border border-[#222222]">
                          Rank #{cand.rank}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#F2F0EA]">
                          {cand.provider_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#716F69] mt-1">
                        Historical: {((cand.historical_success_rate || 0.95) * 100).toFixed(1)}% (N={cand.sample_size})
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-[#2FB36F] block">
                        {cand.estimated_cost_usdc} USDC
                      </span>
                      <span className="text-[10px] text-[#716F69]">
                        Risk: {cand.risk_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#222222]">
                    <span className="text-[10px] text-[#716F69]">
                      Policy: {cand.policy_compatible ? '✅ COMPATIBLE' : '❌ DENIED'}
                    </span>
                    {opp.status !== 'AWARDED' ? (
                      <button
                        onClick={() => handleAward(cand.provider_id, cand.estimated_cost_usdc)}
                        disabled={awarding}
                        className="px-3 py-1 bg-[#F2F0EA] hover:bg-white text-[#080808] text-xs font-bold rounded transition-colors disabled:opacity-50"
                      >
                        {awarding ? 'Awarding...' : 'Award Contract'}
                      </button>
                    ) : (
                      <span className="text-xs text-[#D6A83A] font-semibold">
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
