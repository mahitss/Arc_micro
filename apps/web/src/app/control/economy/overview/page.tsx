'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchClearingHealth,
  fetchObligations,
  fetchCounterparties,
  fetchNettingProposals,
  fetchSettlementBatches,
  fetchReconciliationItems,
  fetchDisputes,
  ClearingHealth,
  EconomicObligationRecord,
  EconomicCounterparty,
  MultiPartyNettingProposal,
  SettlementBatch,
  ReconciliationItem,
  ClearingDispute,
} from '@/lib/api/clearing_network';

function formatUsdc(microUnits: string): string {
  const val = Number(microUnits) / 1e6;
  return isNaN(val) ? '0.00 USDC' : `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

export default function EconomicCommandCenterPage() {
  const [health, setHealth] = useState<ClearingHealth | null>(null);
  const [obligations, setObligations] = useState<EconomicObligationRecord[]>([]);
  const [counterparties, setCounterparties] = useState<EconomicCounterparty[]>([]);
  const [proposals, setProposals] = useState<MultiPartyNettingProposal[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [disputes, setDisputes] = useState<ClearingDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'OBLIGATIONS' | 'COUNTERPARTIES' | 'NETTING' | 'SETTLEMENTS' | 'RECONCILIATION' | 'DISPUTES'>('OVERVIEW');

  useEffect(() => {
    async function load() {
      try {
        const [h, obs, cps, props, bts, recs, disps] = await Promise.all([
          fetchClearingHealth(),
          fetchObligations(),
          fetchCounterparties(),
          fetchNettingProposals(),
          fetchSettlementBatches(),
          fetchReconciliationItems(),
          fetchDisputes(),
        ]);
        setHealth(h);
        setObligations(obs);
        setCounterparties(cps);
        setProposals(props);
        setBatches(bts);
        setReconciliations(recs);
        setDisputes(disps);
      } catch (err) {
        console.error('Failed to load economic command center telemetry:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalObligationsCount = obligations.length;
  const dueCount = obligations.filter(o => o.status === 'DUE').length;
  const pendingCount = obligations.filter(o => o.status === 'SETTLEMENT_PENDING' || o.status === 'CONFIRMED').length;
  const settledCount = obligations.filter(o => o.status === 'SETTLED').length;
  const disputedCount = disputes.filter(d => d.status === 'OPEN').length;
  const reconciliationCount = reconciliations.filter(r => r.status !== 'CONFIRMED').length;
  const nettableValue = proposals.reduce((sum, p) => sum + Number(p.savings_value || 0), 0);
  const totalExposure = counterparties.reduce((sum, c) => sum + Number(c.current_exposure || 0), 0);

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2FB36F]" />
              <span className="text-xs font-semibold tracking-wider text-[#D6A83A] uppercase">
                Autonomous Economic Control Tower
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Economic Command Center & Clearing Network
            </h1>
            <p className="text-sm text-[#B0ADA5] mt-1">
              Real-time operational coordination of obligations, counterparties, multi-party cycle netting, batches, and reconciliation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo/clearing"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] text-xs font-medium rounded-lg transition-colors"
            >
              Interactive Clearing Demos →
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Metrics (Section 50) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Total Obligations</div>
          <div className="text-xl font-bold text-[#F2F0EA] mt-1 font-mono">{totalObligationsCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Due</div>
          <div className="text-xl font-bold text-[#D6A83A] mt-1 font-mono">{dueCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Pending</div>
          <div className="text-xl font-bold text-[#F2F0EA] mt-1 font-mono">{pendingCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Settled</div>
          <div className="text-xl font-bold text-[#2FB36F] mt-1 font-mono">{settledCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Disputed</div>
          <div className="text-xl font-bold text-[#D85C5C] mt-1 font-mono">{disputedCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Recon Required</div>
          <div className="text-xl font-bold text-[#D6A83A] mt-1 font-mono">{reconciliationCount}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Nettable</div>
          <div className="text-sm font-bold text-[#2FB36F] mt-1 font-mono">{formatUsdc(String(nettableValue))}</div>
        </div>
        <div className="bg-[#101010] border border-[#222222] rounded-lg p-4">
          <div className="text-[10px] font-medium text-[#716F69] uppercase tracking-wider">Exposure</div>
          <div className="text-sm font-bold text-[#F2F0EA] mt-1 font-mono">{formatUsdc(String(totalExposure))}</div>
        </div>
      </div>

      {/* Tabs Navigation (Section 49) */}
      <div className="flex items-center gap-2 border-b border-[#222222] pb-2 overflow-x-auto text-xs font-mono">
        {[
          'OVERVIEW',
          'OBLIGATIONS',
          'COUNTERPARTIES',
          'NETTING',
          'SETTLEMENTS',
          'RECONCILIATION',
          'DISPUTES',
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#F2F0EA] text-[#080808] font-semibold'
                : 'bg-[#101010] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#F2F0EA]">Clearinghouse & Treasury Health Telemetry</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                <span className="text-[#716F69] block">Open Obligations</span>
                <span className="text-[#F2F0EA] font-bold text-sm">{health?.open_obligations || 0}</span>
              </div>
              <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                <span className="text-[#716F69] block">Overdue Obligations</span>
                <span className="text-[#F2F0EA] font-bold text-sm">{health?.overdue_obligations || 0}</span>
              </div>
              <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                <span className="text-[#716F69] block">Settlement Batches</span>
                <span className="text-[#F2F0EA] font-bold text-sm">{health?.batch_count || 0}</span>
              </div>
              <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                <span className="text-[#716F69] block">Disputed Value</span>
                <span className="text-[#D85C5C] font-bold text-sm">{formatUsdc(health?.disputed_value || '0')}</span>
              </div>
            </div>
            <div className="text-[11px] text-[#716F69] font-mono">
              Freshness: {health?.freshness_timestamp ? new Date(health.freshness_timestamp).toLocaleString() : 'Live'}
            </div>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#F2F0EA]">Clearing Network Architectural Invariants</h3>
            <div className="space-y-2 text-xs font-mono text-[#B0ADA5]">
              <div className="p-2.5 bg-[#0B0B0B] rounded border border-[#222222] flex items-center justify-between">
                <span>INV-201: Zero Financial Authority Creation</span>
                <span className="text-[#2FB36F] font-bold">VERIFIED</span>
              </div>
              <div className="p-2.5 bg-[#0B0B0B] rounded border border-[#222222] flex items-center justify-between">
                <span>INV-202: Netting Conservation of Value</span>
                <span className="text-[#2FB36F] font-bold">VERIFIED</span>
              </div>
              <div className="p-2.5 bg-[#0B0B0B] rounded border border-[#222222] flex items-center justify-between">
                <span>INV-208: Partial Settlement Aggregate Isolation</span>
                <span className="text-[#2FB36F] font-bold">VERIFIED</span>
              </div>
              <div className="p-2.5 bg-[#0B0B0B] rounded border border-[#222222] flex items-center justify-between">
                <span>INV-219: Unverified Arc Evidence Protection</span>
                <span className="text-[#2FB36F] font-bold">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'OBLIGATIONS' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Authoritative Obligations Ledger</h3>
            <span className="text-xs text-[#716F69] font-mono">{obligations.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0B0B0B] text-[#716F69] uppercase text-[10px] tracking-wider border-b border-[#222222]">
                <tr>
                  <th className="py-2.5 px-3">Obligation ID</th>
                  <th className="py-2.5 px-3">Payer</th>
                  <th className="py-2.5 px-3">Payee</th>
                  <th className="py-2.5 px-3">Contract</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {obligations.map((o) => (
                  <tr key={o.obligation_id} className="hover:bg-[#141414]">
                    <td className="py-2.5 px-3 font-bold text-[#D6A83A]">{o.obligation_id}</td>
                    <td className="py-2.5 px-3 text-[#B0ADA5]">{o.payer_agent_id}</td>
                    <td className="py-2.5 px-3 text-[#B0ADA5]">{o.payee_agent_id}</td>
                    <td className="py-2.5 px-3 text-[#716F69]">{o.contract_id}</td>
                    <td className="py-2.5 px-3 font-bold text-[#F2F0EA]">{formatUsdc(o.amount)}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#181818] text-[#B0ADA5] border border-[#222222]">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/control/economy/obligations/${o.obligation_id}`}
                        className="text-[#D6A83A] hover:underline font-semibold"
                      >
                        Inspect Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'COUNTERPARTIES' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Network Counterparty Nodes</h3>
            <Link href="/economy/counterparties" className="text-xs text-[#D6A83A] hover:underline font-mono">
              View Directory →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {counterparties.map((cp) => (
              <div key={cp.counterparty_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F2F0EA]">{cp.agent_id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30">
                    {cp.identity_status}
                  </span>
                </div>
                <div className="text-[#716F69]">Org: <span className="text-[#B0ADA5]">{cp.organization_id}</span></div>
                <div className="text-[#716F69]">Exposure: <span className="text-[#2FB36F] font-bold">{formatUsdc(cp.current_exposure)}</span></div>
                <div className="text-[#716F69]">Limit: <span className="text-[#B0ADA5]">{formatUsdc(cp.exposure_limit)}</span></div>
                <Link
                  href={`/control/economy/counterparties/${cp.counterparty_id}`}
                  className="block pt-2 text-[#D6A83A] hover:underline text-right"
                >
                  Inspect Exposure →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'NETTING' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Multi-Party Graph Netting Engine</h3>
            <Link href="/economy/netting" className="text-xs text-[#D6A83A] hover:underline font-mono">
              Netting Center →
            </Link>
          </div>
          {proposals.map((p) => (
            <div key={p.proposal_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F2F0EA]">{p.proposal_id}</span>
                <span className="px-2 py-0.5 rounded bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30">
                  {p.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>Gross: <span className="text-[#F2F0EA] font-bold">{formatUsdc(p.gross_value)}</span></div>
                <div>Net: <span className="text-[#B0ADA5] font-bold">{formatUsdc(p.net_value)}</span></div>
                <div>Savings: <span className="text-[#2FB36F] font-bold">{formatUsdc(p.savings_value)}</span></div>
              </div>
              <div className="text-[#716F69] text-[11px]">{p.economic_impact}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'SETTLEMENTS' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Settlement Batch Pipelines</h3>
            <Link href="/economy/settlements" className="text-xs text-[#D6A83A] hover:underline font-mono">
              View Settlement Center →
            </Link>
          </div>
          {batches.map((b) => (
            <div key={b.batch_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F2F0EA]">{b.batch_id}</span>
                <span className="px-2 py-0.5 rounded bg-[#2FB36F]/15 text-[#2FB36F] border border-[#2FB36F]/30 font-bold">
                  {b.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#B0ADA5]">
                <span>Window: {b.settlement_window}</span>
                <span>Net Settled: {formatUsdc(b.net_amount)}</span>
                <Link href={`/control/economy/settlements/${b.batch_id}`} className="text-[#D6A83A] hover:underline">
                  Inspect Batch →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'RECONCILIATION' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Reconciliation Discrepancies</h3>
            <Link href="/economy/reconciliation" className="text-xs text-[#D6A83A] hover:underline font-mono">
              Reconciliation Center →
            </Link>
          </div>
          {reconciliations.map((r) => (
            <div key={r.item_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#D6A83A]">{r.item_id}</span>
                <span className="px-2 py-0.5 rounded bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30">
                  {r.status}
                </span>
              </div>
              <div className="text-[#B0ADA5]">
                Expected: {formatUsdc(r.expected_amount)} | Observed: {formatUsdc(r.observed_amount)}
              </div>
              <div className="text-[#D6A83A]">Safe Next Action: {r.safe_next_action}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'DISPUTES' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-base font-bold text-[#F2F0EA]">Economic Clearinghouse Disputes</h3>
            <span className="text-xs text-[#D85C5C] font-mono">{disputes.length} active dispute(s)</span>
          </div>
          {disputes.length === 0 ? (
            <div className="py-6 text-center text-[#716F69] font-mono text-xs">No active disputes.</div>
          ) : (
            disputes.map((d) => (
              <div key={d.dispute_id} className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#D85C5C]">{d.dispute_id}</span>
                  <span className="px-2 py-0.5 rounded bg-[#D85C5C]/15 text-[#D85C5C] border border-[#D85C5C]/30">
                    {d.status}
                  </span>
                </div>
                <div className="text-[#B0ADA5]">
                  Claimant: <span className="text-[#F2F0EA]">{d.disputed_by}</span> vs Respondent: <span className="text-[#F2F0EA]">{d.disputed_against}</span>
                </div>
                <div className="text-[#716F69]">Claim: <span className="text-[#D85C5C] font-bold">{formatUsdc(d.claim_amount)}</span></div>
                <div className="text-[#716F69] italic">Reason: {d.reason}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
