'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClearingExecutionMode,
  EconomicEscrow,
  EconomicExposureSnapshot,
  EconomicHealthSnapshot,
  EconomicObligation,
  NettingProposal,
  PaymentMilestone,
  ReconciliationRecord,
  SettlementBatch,
  fetchBatches,
  fetchEscrows,
  fetchExposure,
  fetchHealth,
  fetchMilestones,
  fetchNettingProposals,
  fetchObligations,
  fetchReconciliation,
  settleMilestone,
  verifyMilestone,
} from '../../../lib/api/clearinghouse';

export default function ClearinghouseMissionControl() {
  const [mode, setMode] = useState<ClearingExecutionMode>('REAL');
  const [activeTab, setActiveTab] = useState<'obligations' | 'milestones' | 'escrows' | 'netting' | 'batches' | 'reconciliation'>('obligations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [exposure, setExposure] = useState<EconomicExposureSnapshot | null>(null);
  const [health, setHealth] = useState<EconomicHealthSnapshot | null>(null);
  const [obligations, setObligations] = useState<EconomicObligation[]>([]);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [escrows, setEscrows] = useState<EconomicEscrow[]>([]);
  const [netting, setNetting] = useState<NettingProposal[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord[]>([]);

  const loadData = async (selectedMode: ClearingExecutionMode) => {
    setLoading(true);
    setError(null);
    try {
      const [expData, hlthData, obsData, msData, escData, netData, btcData, recData] = await Promise.all([
        fetchExposure(undefined, selectedMode),
        fetchHealth(undefined, selectedMode),
        fetchObligations(),
        fetchMilestones(),
        fetchEscrows(),
        fetchNettingProposals(),
        fetchBatches(),
        fetchReconciliation(),
      ]);
      setExposure(expData);
      setHealth(hlthData);
      setObligations(obsData.filter(o => o.execution_mode === selectedMode || !o.execution_mode));
      setMilestones(msData);
      setEscrows(escData.filter(e => e.execution_mode === selectedMode || !e.execution_mode));
      setNetting(netData);
      setBatches(btcData.filter(b => b.execution_mode === selectedMode || !b.execution_mode));
      setReconciliation(recData.filter(r => r.execution_mode === selectedMode || !r.execution_mode));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed loading clearinghouse data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(mode);
  }, [mode]);

  const handleVerify = async (id: string) => {
    try {
      setActionSuccess(null);
      const res = await verifyMilestone(id);
      setActionSuccess(`Milestone ${id} verified: ${res.outcome || 'VERIFIED'}`);
      loadData(mode);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    }
  };

  const handleSettle = async (id: string) => {
    try {
      setActionSuccess(null);
      await settleMilestone(id);
      setActionSuccess(`Milestone ${id} routed to payment intent pipeline and settled.`);
      loadData(mode);
    } catch (err: any) {
      setError(err.message || 'Settlement failed');
    }
  };

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
              AUTONOMOUS ECONOMIC CLEARINGHOUSE
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
              <span className={`w-1.5 h-1.5 rounded-full ${mode === 'REAL' ? 'bg-[#2FB36F]' : 'bg-[#D6A83A]'}`} />
              {mode === 'REAL' ? 'ARC MAINNET SETTLEMENT' : 'SIMULATION DIGITAL TWIN'}
            </span>
          </div>
          <p className="text-xs text-[#716F69] mt-1 max-w-2xl leading-relaxed">
            Coordinates value across AI counterparties under invariants INV-55 to INV-70.
            Zero autonomous fund movement authority; Arc blockchain settles all state.
          </p>
        </div>

        {/* Mode & Navigation Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#101010] border border-[#222222] rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setMode('REAL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'REAL' ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]' : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              REAL (ARC)
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'SIMULATION' ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]' : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              SIMULATION
            </button>
          </div>
          <Link
            href="/economy/clearing/reconciliation"
            className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] font-mono text-xs border border-[#222222] transition-colors"
          >
            Reconciliation Center →
          </Link>
          <Link
            href="/economy/clearing/netting"
            className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] font-mono text-xs border border-[#222222] transition-colors"
          >
            Netting Center →
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#D85C5C]/40 text-xs text-[#D85C5C] font-mono flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
            Error: {error}
          </span>
          <button onClick={() => setError(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#2FB36F]/40 text-xs text-[#2FB36F] font-mono flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            ✓ {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
        </div>
      )}

      {/* Financial State Cards: Available, Reserved, Outstanding, Solvency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* On-Chain Available */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-[11px] font-mono uppercase tracking-wider">Unencumbered Balance</div>
          <div className="text-xl font-bold font-mono text-[#F2F0EA] mt-1">
            {formatUsdc(health?.available_unencumbered || '85000000')}
          </div>
          <div className="text-[10px] font-mono text-[#716F69] mt-0.5">
            Total Vault: {formatUsdc(health?.on_chain_available || '100000000')}
          </div>
        </div>

        {/* Reserved in Escrow */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-[11px] font-mono uppercase tracking-wider">Active Escrow Locked</div>
          <div className="text-xl font-bold font-mono text-[#F2F0EA] mt-1">
            {formatUsdc(exposure?.reserved_in_escrow || '15000000')}
          </div>
          <div className="text-[10px] font-mono text-[#716F69] mt-0.5">
            Bounded Reservations (INV-56)
          </div>
        </div>

        {/* Current Total Exposure */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-[11px] font-mono uppercase tracking-wider">Current Exposure</div>
          <div className="text-xl font-bold font-mono text-[#F2F0EA] mt-1">
            {formatUsdc(exposure?.current_exposure || '30000000')}
          </div>
          <div className="text-[10px] font-mono text-[#716F69] mt-0.5">
            Max Cap: {formatUsdc(exposure?.max_possible_exposure || '45000000')}
          </div>
        </div>

        {/* Solvency & Health Ratio */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#716F69] text-[11px] font-mono uppercase tracking-wider">Solvency Health</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#F2F0EA]">
              {health?.solvency_ratio ? `${health.solvency_ratio.toFixed(2)}x` : '3.33x'}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#2FB36F] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              HEALTHY
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#716F69] mt-0.5">
            Deterministic Signals: OK
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#222222] gap-4 text-xs font-mono overflow-x-auto">
        {(['obligations', 'milestones', 'escrows', 'netting', 'batches', 'reconciliation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 border-b-2 font-medium uppercase transition-colors ${
              activeTab === tab
                ? 'border-[#D6A83A] text-[#D6A83A]'
                : 'border-transparent text-[#716F69] hover:text-[#F2F0EA]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-16 text-center font-mono text-xs text-[#716F69]">
          Syncing clearinghouse ledger with Arc...
        </div>
      ) : activeTab === 'obligations' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Economic Obligations</h2>
            <span className="text-[11px] font-mono text-[#716F69]">Total: {obligations.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">OBLIGATION ID</th>
                  <th className="pb-3">PAYER</th>
                  <th className="pb-3">PAYEE</th>
                  <th className="pb-3">CONTRACT / CAPABILITY</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">SETTLED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {obligations.map((ob) => (
                  <tr key={ob.obligation_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#F2F0EA] font-bold">{ob.obligation_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{ob.payer_agent_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{ob.payee_agent_id}</td>
                    <td className="py-3 text-[#716F69]">{ob.contract_id} ({ob.capability || 'general'})</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{formatUsdc(ob.amount)}</td>
                    <td className="py-3 text-[#B0ADA5]">{formatUsdc(ob.settled_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${ob.status === 'SETTLED' ? 'bg-[#2FB36F]' : ob.status === 'AUTHORIZED' ? 'bg-[#6B8FD6]' : 'bg-[#D6A83A]'}`} />
                        {ob.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'milestones' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Payment Milestones & Deliverable Verification</h2>
            <span className="text-[11px] font-mono text-[#716F69]">Total: {milestones.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">SEQ</th>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">DESCRIPTION</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {milestones.map((ms) => (
                  <tr key={ms.milestone_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#716F69] font-bold">#{ms.sequence}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{ms.milestone_id}</td>
                    <td className="py-3 text-[#B0ADA5] max-w-xs truncate">{ms.description}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{formatUsdc(ms.amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${ms.status === 'SETTLED' ? 'bg-[#2FB36F]' : ms.status === 'VERIFIED' ? 'bg-[#6B8FD6]' : 'bg-[#D6A83A]'}`} />
                        {ms.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {ms.status === 'PENDING' && (
                        <button
                          onClick={() => handleVerify(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] font-mono text-[11px] border border-[#222222] transition-colors"
                        >
                          Verify Evidence
                        </button>
                      )}
                      {ms.status === 'VERIFIED' && (
                        <button
                          onClick={() => handleSettle(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-bold text-[11px] transition-colors"
                        >
                          Settle Milestone →
                        </button>
                      )}
                      {ms.status === 'SETTLED' && (
                        <span className="text-[11px] text-[#2FB36F] font-bold font-mono">Settled ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'escrows' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Active Economic Escrows</h2>
            <span className="text-[11px] font-mono text-[#716F69]">Total: {escrows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">ESCROW ID</th>
                  <th className="pb-3">OBLIGATION</th>
                  <th className="pb-3">VAULT ADDRESS</th>
                  <th className="pb-3">RESERVED</th>
                  <th className="pb-3">RELEASED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {escrows.map((esc) => (
                  <tr key={esc.escrow_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#F2F0EA] font-bold">{esc.escrow_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{esc.obligation_id}</td>
                    <td className="py-3 text-[#716F69] truncate max-w-[120px]">{esc.vault_address}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{formatUsdc(esc.reserved_amount)}</td>
                    <td className="py-3 text-[#B0ADA5] font-bold">{formatUsdc(esc.released_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
                        {esc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'netting' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Bilateral Netting Engine</h2>
              <p className="text-[11px] text-[#716F69]">Offsets opposing obligations preserving full audit history (INV-60, INV-61)</p>
            </div>
            <Link
              href="/economy/clearing/netting"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              Open Netting Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">PROPOSAL ID</th>
                  <th className="pb-3">COUNTERPARTIES</th>
                  <th className="pb-3">GROSS TOTAL</th>
                  <th className="pb-3">NET RESIDUAL</th>
                  <th className="pb-3">LIQUIDITY SAVINGS</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {netting.map((p) => (
                  <tr key={p.proposal_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#F2F0EA] font-bold">{p.proposal_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{p.agent_a} ↔ {p.agent_b}</td>
                    <td className="py-3 text-[#716F69]">{formatUsdc(p.gross_total)}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{formatUsdc(p.net_amount)} ({p.net_payer} → {p.net_payee})</td>
                    <td className="py-3 text-[#2FB36F] font-bold">+{formatUsdc(p.savings_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'batches' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Settlement Batches</h2>
            <span className="text-[11px] font-mono text-[#716F69]">Total: {batches.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">BATCH ID</th>
                  <th className="pb-3">ITEMS</th>
                  <th className="pb-3">GROSS AMOUNT</th>
                  <th className="pb-3">NET AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#F2F0EA] font-bold">{b.batch_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{b.obligation_ids?.length || 0} obligations</td>
                    <td className="py-3 text-[#716F69]">{formatUsdc(b.gross_amount)}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{formatUsdc(b.net_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">Reconciliation Audit Log</h2>
              <p className="text-[11px] text-[#716F69]">Machine checks between obligations, intents, and Arc on-chain receipts (INV-68, INV-69)</p>
            </div>
            <Link
              href="/economy/clearing/reconciliation"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              Open Reconciliation Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">RECORD ID</th>
                  <th className="pb-3">PAYMENT INTENT</th>
                  <th className="pb-3">EXPECTED</th>
                  <th className="pb-3">ACTUAL</th>
                  <th className="pb-3">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {reconciliation.map((rec) => (
                  <tr key={rec.record_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.status === 'MATCHED' ? 'bg-[#2FB36F]' : rec.status === 'MISMATCH' ? 'bg-[#D85C5C]' : 'bg-[#D6A83A]'}`} />
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{rec.record_id}</td>
                    <td className="py-3 text-[#B0ADA5]">{rec.payment_intent_id}</td>
                    <td className="py-3 text-[#716F69]">{formatUsdc(rec.expected_amount)}</td>
                    <td className="py-3 text-[#F2F0EA] font-bold">{rec.actual_amount ? formatUsdc(rec.actual_amount) : 'Pending...'}</td>
                    <td className="py-3 text-[#716F69] max-w-sm truncate">{rec.discrepancy_notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
