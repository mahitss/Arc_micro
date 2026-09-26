'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  NettingProposal,
  fetchNettingProposals,
} from '../../../../lib/api/clearinghouse';

export default function NettingCenterPage() {
  const [proposals, setProposals] = useState<NettingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await fetchNettingProposals();
      setProposals(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const formatUsdc = (baseUnits?: string) => {
    if (!baseUnits) return '$0.00';
    const val = parseInt(baseUnits, 10);
    return `$${(val / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalGross = proposals.reduce((acc, p) => acc + parseInt(p.gross_total || '0', 10), 0);
  const totalNet = proposals.reduce((acc, p) => acc + parseInt(p.net_amount || '0', 10), 0);
  const totalSavings = proposals.reduce((acc, p) => acc + parseInt(p.savings_amount || '0', 10), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#716F69] mb-1">
            <Link href="/economy/clearing" className="hover:text-[#D6A83A]">Clearinghouse</Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-[#F2F0EA]">Netting Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Bilateral & Multilateral Netting Center</h1>
          <p className="text-sm text-[#716F69] mt-1 max-w-2xl">
            Optimizes inter-agent liquidity by computing offsetting mutual obligations. Settles only the net residual value on Arc while preserving immutable history of all underlying contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#716F69] bg-[#101010] px-3 py-2 rounded-lg border border-[#222222]">
          <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
          <span>INV-61: Preserves Original History</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#D6A83A]/30 text-[#D6A83A] font-mono text-xs flex justify-between items-center">
          <span>✓ {statusMessage}</span>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Liquidity Efficiency Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-xs uppercase tracking-wider">Gross Obligations Volume</div>
          <div className="text-2xl font-bold text-[#F2F0EA] mt-2">{formatUsdc(String(totalGross))}</div>
          <div className="text-[11px] text-[#716F69] mt-1">Full face value before netting</div>
        </div>

        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-xs uppercase tracking-wider">Net Residual Settlement</div>
          <div className="text-2xl font-bold text-[#D6A83A] mt-2">{formatUsdc(String(totalNet))}</div>
          <div className="text-[11px] text-[#716F69] mt-1">Actual on-chain capital required</div>
        </div>

        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-xs uppercase tracking-wider">Capital Liquidity Saved</div>
          <div className="text-2xl font-bold text-[#2FB36F] mt-2">+{formatUsdc(String(totalSavings))}</div>
          <div className="text-[11px] text-[#716F69] mt-1">
            {totalGross > 0 ? `${((totalSavings / totalGross) * 100).toFixed(1)}% liquidity reduction` : '0%'}
          </div>
        </div>
      </div>

      {/* Netting Proposals List */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#F2F0EA]">Active Netting Proposals</h2>
          <span className="text-xs font-mono text-[#716F69]">Total: {proposals.length}</span>
        </div>

        {loading ? (
          <div className="p-16 text-center font-mono text-sm text-[#716F69]">
            Calculating bilateral offset matrices...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">PROPOSAL ID</th>
                  <th className="pb-3">PEER COUNTERPARTIES</th>
                  <th className="pb-3">GROSS TOTAL</th>
                  <th className="pb-3">NET RESIDUAL PAYMENT</th>
                  <th className="pb-3">SAVINGS</th>
                  <th className="pb-3">APPROVALS</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {proposals.map((p) => (
                  <tr key={p.proposal_id} className="hover:bg-[#141414]">
                    <td className="py-4 text-[#F2F0EA] font-bold">{p.proposal_id}</td>
                    <td className="py-4 text-[#B0ADA5]">
                      <div>{p.agent_a}</div>
                      <div className="text-[10px] text-[#716F69]">↔ {p.agent_b}</div>
                    </td>
                    <td className="py-4 text-[#716F69]">{formatUsdc(p.gross_total)}</td>
                    <td className="py-4 text-[#2FB36F] font-bold">
                      {formatUsdc(p.net_amount)} ({p.net_payer} → {p.net_payee})
                    </td>
                    <td className="py-4 text-[#D6A83A] font-bold">+{formatUsdc(p.savings_amount)}</td>
                    <td className="py-4 space-x-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${p.approved_by_a ? 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/30' : 'bg-[#141414] text-[#716F69] border-[#222222]'}`}>
                        A: {p.approved_by_a ? '✓' : 'Pending'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${p.approved_by_b ? 'bg-[#141414] text-[#2FB36F] border-[#2FB36F]/30' : 'bg-[#141414] text-[#716F69] border-[#222222]'}`}>
                        B: {p.approved_by_b ? '✓' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {p.status === 'PROPOSED' && (
                        <button
                          onClick={() => setStatusMessage(`Approved proposal ${p.proposal_id} as agent_b`)}
                          className="px-2.5 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono text-[11px] font-bold"
                        >
                          Approve →
                        </button>
                      )}
                      {p.status === 'APPROVED' && (
                        <button
                          onClick={() => setStatusMessage(`Executed net settlement for ${p.proposal_id}`)}
                          className="px-2.5 py-1 rounded bg-[#2FB36F] hover:bg-[#2FB36F]/80 text-[#080808] font-mono text-[11px] font-bold"
                        >
                          Execute Settlement →
                        </button>
                      )}
                      {p.status === 'EXECUTED' && (
                        <span className="text-[11px] text-[#2FB36F] font-bold">Settled ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
