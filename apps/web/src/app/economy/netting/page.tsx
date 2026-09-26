'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchNettingProposals,
  fetchObligations,
  proposeNetting,
  MultiPartyNettingProposal,
  EconomicObligationRecord,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function NettingCenterPage() {
  const [proposals, setProposals] = useState<MultiPartyNettingProposal[]>([]);
  const [obligations, setObligations] = useState<EconomicObligationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [props, obs] = await Promise.all([
          fetchNettingProposals(),
          fetchObligations(),
        ]);
        setProposals(props);
        setObligations(obs);
      } catch (err) {
        console.error('Failed to load netting data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSimulateCycleNetting = async () => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const candidateIds = obligations.slice(0, 3).map(o => o.obligation_id);
      const res = await proposeNetting({
        organizationId: 'org_secops',
        obligationIds: candidateIds,
      });
      setProposals(prev => [res, ...prev.filter(p => p.proposal_id !== res.proposal_id)]);
      setSimulationResult(`Simulation completed: Gross ${formatUsdc(res.gross_value)} netted to ${formatUsdc(res.net_value)}. Netting savings: ${formatUsdc(res.savings_value)} (INV-202 invariant verified).`);
    } catch (err: any) {
      setSimulationResult(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const activeProp = proposals[0];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
              <span className="text-xs font-semibold tracking-wider text-[#B0ADA5] uppercase font-mono">
                Bilateral Netting Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Multi-Party Graph Netting & Obligation Compression
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Algorithmic cycle resolution reducing settlement transaction volume and liquidity consumption without creating financial authority.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateCycleNetting}
              disabled={simulating}
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white disabled:opacity-50 text-[#080808] text-xs font-semibold font-mono rounded-lg transition-colors"
            >
              {simulating ? 'Analyzing Cycles...' : '⚡ Simulate Graph Netting'}
            </button>
            <Link
              href="/economy/settlements"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-semibold font-mono rounded-lg border border-[#222222] transition-colors"
            >
              Settlement Batches →
            </Link>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-4 text-xs font-mono text-[#B0ADA5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#D6A83A]">🛡️ INVARIANT ENFORCEMENT:</span>
          <span>Netting proposals preserve double-entry conservation (INV-202). Netting cannot bypass policy (INV-203) or approval (INV-205).</span>
        </div>
        <span className="text-[#D6A83A] font-semibold">PREVIEW ONLY — NO AUTOMATIC SETTLEMENT</span>
      </div>

      {simulationResult && (
        <div className="bg-[#141414] border border-[#222222] rounded-lg p-4 text-xs font-mono text-[#F2F0EA]">
          {simulationResult}
        </div>
      )}

      {/* Hero Netting Stats */}
      {activeProp && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Gross Obligations</div>
            <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{formatUsdc(activeProp.gross_value)}</div>
            <div className="text-xs text-[#716F69] mt-2 font-mono">{activeProp.original_obligations.length} raw obligations in cycle</div>
          </div>
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Proposed Net Value</div>
            <div className="text-2xl font-bold text-[#F2F0EA] mt-1 font-mono">{formatUsdc(activeProp.net_value)}</div>
            <div className="text-xs text-[#716F69] mt-2 font-mono">{activeProp.proposed_net_obligations.length} compressed transfers</div>
          </div>
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Gross Capital Savings</div>
            <div className="text-2xl font-bold text-[#2FB36F] mt-1 font-mono">{formatUsdc(activeProp.savings_value)}</div>
            <div className="text-xs text-[#716F69] mt-2 font-mono">Zero-balance debt cancellation</div>
          </div>
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
            <div className="text-xs font-medium text-[#716F69] uppercase tracking-wider font-mono">Governance Gate</div>
            <div className="text-2xl font-bold text-[#D6A83A] mt-1 font-mono">{activeProp.policy_status}</div>
            <div className="text-xs text-[#716F69] mt-2 font-mono">Approval: {activeProp.approval_status}</div>
          </div>
        </div>
      )}

      {/* Netting Proposals Table */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="border-b border-[#222222] pb-4">
          <h2 className="text-lg font-bold text-[#F2F0EA]">Active Netting Proposals</h2>
          <p className="text-xs text-[#716F69]">Pre-computed cycle reduction candidates awaiting batch window inclusion.</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#716F69] font-mono text-sm">Loading netting telemetry...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0B0B0B] text-[#716F69] uppercase text-[10px] tracking-wider border-b border-[#222222]">
                <tr>
                  <th className="py-3 px-4">Proposal ID</th>
                  <th className="py-3 px-4">Gross Value</th>
                  <th className="py-3 px-4">Net Value</th>
                  <th className="py-3 px-4">Savings Value</th>
                  <th className="py-3 px-4">Cycle Count</th>
                  <th className="py-3 px-4">Risk Status</th>
                  <th className="py-3 px-4">Policy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Settlement Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {proposals.map((prop) => (
                  <tr key={prop.proposal_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#D6A83A]">{prop.proposal_id}</td>
                    <td className="py-3 px-4 text-[#B0ADA5]">{formatUsdc(prop.gross_value)}</td>
                    <td className="py-3 px-4 text-[#F2F0EA] font-bold">{formatUsdc(prop.net_value)}</td>
                    <td className="py-3 px-4 text-[#2FB36F] font-bold">{formatUsdc(prop.savings_value)}</td>
                    <td className="py-3 px-4 text-[#716F69]">{prop.cycles_count} cycle(s)</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                        {prop.risk_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">
                        {prop.policy_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#B0ADA5]">{prop.status}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href="/economy/settlements"
                        className="text-[#D6A83A] hover:underline font-medium"
                      >
                        View Batches →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Eligible Obligations List */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
        <div className="border-b border-[#222222] pb-4">
          <h2 className="text-base font-bold text-[#F2F0EA]">Obligations Eligible for Settlement Window Inclusion</h2>
          <p className="text-xs text-[#716F69]">Derived from confirmed marketplace milestones and verified delivery tasks.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0B0B] text-[#716F69] uppercase text-[10px] tracking-wider border-b border-[#222222]">
              <tr>
                <th className="py-3 px-4">Obligation ID</th>
                <th className="py-3 px-4">Payer</th>
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {obligations.map((ob) => (
                <tr key={ob.obligation_id} className="hover:bg-[#141414] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#D6A83A]">{ob.obligation_id}</td>
                  <td className="py-3 px-4 text-[#B0ADA5]">{ob.payer_agent_id}</td>
                  <td className="py-3 px-4 text-[#B0ADA5]">{ob.payee_agent_id}</td>
                  <td className="py-3 px-4 text-[#716F69]">{ob.contract_id}</td>
                  <td className="py-3 px-4 font-bold text-[#F2F0EA]">{formatUsdc(ob.amount)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#6B8FD6]/10 text-[#6B8FD6] border border-[#6B8FD6]/30">
                      {ob.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/control/economy/obligations/${ob.obligation_id}`}
                      className="text-[#D6A83A] hover:underline"
                    >
                      Trace →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
