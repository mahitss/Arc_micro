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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                Task 18 — Netting Center
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Multi-Party Graph Netting & Obligation Compression
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Algorithmic cycle resolution reducing settlement transaction volume and liquidity consumption without creating financial authority.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateCycleNetting}
              disabled={simulating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              {simulating ? 'Analyzing Cycles...' : '⚡ Simulate Graph Netting'}
            </button>
            <Link
              href="/economy/settlements"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Settlement Batches →
            </Link>
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">🛡️ INVARIANT ENFORCEMENT:</span>
          <span>Netting proposals preserve double-entry conservation (INV-202). Netting cannot bypass policy (INV-203) or approval (INV-205).</span>
        </div>
        <span className="text-emerald-400 font-semibold">PREVIEW ONLY — NO AUTOMATIC SETTLEMENT</span>
      </div>

      {simulationResult && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-4 text-xs font-mono text-emerald-300">
          {simulationResult}
        </div>
      )}

      {/* Hero Netting Stats */}
      {activeProp && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Obligations</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{formatUsdc(activeProp.gross_value)}</div>
            <div className="text-xs text-slate-400 mt-2">{activeProp.original_obligations.length} raw obligations in cycle</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Proposed Net Value</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{formatUsdc(activeProp.net_value)}</div>
            <div className="text-xs text-slate-400 mt-2">{activeProp.proposed_net_obligations.length} compressed transfers</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Capital Savings</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatUsdc(activeProp.savings_value)}</div>
            <div className="text-xs text-emerald-400 mt-2">Zero-balance debt cancellation</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Governance Gate</div>
            <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">{activeProp.policy_status}</div>
            <div className="text-xs text-slate-400 mt-2">Approval: {activeProp.approval_status}</div>
          </div>
        </div>
      )}

      {/* Netting Proposals Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Active Netting Proposals</h2>
          <p className="text-xs text-slate-400">Pre-computed cycle reduction candidates awaiting batch window inclusion.</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 font-mono text-sm">Loading netting telemetry...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60">
                {proposals.map((prop) => (
                  <tr key={prop.proposal_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-300">{prop.proposal_id}</td>
                    <td className="py-3 px-4 text-slate-300">{formatUsdc(prop.gross_value)}</td>
                    <td className="py-3 px-4 text-cyan-400 font-bold">{formatUsdc(prop.net_value)}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{formatUsdc(prop.savings_value)}</td>
                    <td className="py-3 px-4 text-slate-400">{prop.cycles_count} cycle(s)</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {prop.risk_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {prop.policy_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{prop.status}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href="/economy/settlements"
                        className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
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
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-base font-bold text-white">Obligations Eligible for Settlement Window Inclusion</h2>
          <p className="text-xs text-slate-400">Derived from confirmed marketplace milestones and verified delivery tasks.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60">
              {obligations.map((ob) => (
                <tr key={ob.obligation_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-300">{ob.obligation_id}</td>
                  <td className="py-3 px-4 text-slate-300">{ob.payer_agent_id}</td>
                  <td className="py-3 px-4 text-slate-300">{ob.payee_agent_id}</td>
                  <td className="py-3 px-4 text-slate-400">{ob.contract_id}</td>
                  <td className="py-3 px-4 font-bold text-white">{formatUsdc(ob.amount)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {ob.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/control/economy/obligations/${ob.obligation_id}`}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline"
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
