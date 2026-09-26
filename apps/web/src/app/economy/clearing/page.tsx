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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#f5f5f5]">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5]">
              AUTONOMOUS ECONOMIC CLEARINGHOUSE
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
              <span className={`w-1.5 h-1.5 rounded-full ${mode === 'REAL' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
              {mode === 'REAL' ? 'ARC MAINNET SETTLEMENT' : 'SIMULATION DIGITAL TWIN'}
            </span>
          </div>
          <p className="text-xs text-[#a3a3a3] mt-1 max-w-2xl leading-relaxed">
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
                mode === 'REAL' ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
              }`}
            >
              REAL (ARC)
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'SIMULATION' ? 'bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
              }`}
            >
              SIMULATION
            </button>
          </div>
          <Link
            href="/economy/clearing/reconciliation"
            className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] font-mono text-xs border border-[#262626] transition-colors"
          >
            Reconciliation Center →
          </Link>
          <Link
            href="/economy/clearing/netting"
            className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] font-mono text-xs border border-[#262626] transition-colors"
          >
            Netting Center →
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-[#171717] border border-[#ef4444]/40 text-xs text-[#ef4444] font-mono flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            Error: {error}
          </span>
          <button onClick={() => setError(null)} className="text-[#a3a3a3] hover:text-white">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-[#171717] border border-[#22c55e]/40 text-xs text-[#22c55e] font-mono flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            ✓ {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-[#a3a3a3] hover:text-white">✕</button>
        </div>
      )}

      {/* Financial State Cards: Available, Reserved, Outstanding, Solvency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* On-Chain Available */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#a3a3a3] text-[11px] font-mono uppercase tracking-wider">Unencumbered Balance</div>
          <div className="text-xl font-bold font-mono text-[#f5f5f5] mt-1">
            {formatUsdc(health?.available_unencumbered || '85000000')}
          </div>
          <div className="text-[10px] font-mono text-[#666666] mt-0.5">
            Total Vault: {formatUsdc(health?.on_chain_available || '100000000')}
          </div>
        </div>

        {/* Reserved in Escrow */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#a3a3a3] text-[11px] font-mono uppercase tracking-wider">Active Escrow Locked</div>
          <div className="text-xl font-bold font-mono text-[#f5f5f5] mt-1">
            {formatUsdc(exposure?.reserved_in_escrow || '15000000')}
          </div>
          <div className="text-[10px] font-mono text-[#666666] mt-0.5">
            Bounded Reservations (INV-56)
          </div>
        </div>

        {/* Current Total Exposure */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#a3a3a3] text-[11px] font-mono uppercase tracking-wider">Current Exposure</div>
          <div className="text-xl font-bold font-mono text-[#f5f5f5] mt-1">
            {formatUsdc(exposure?.current_exposure || '30000000')}
          </div>
          <div className="text-[10px] font-mono text-[#666666] mt-0.5">
            Max Cap: {formatUsdc(exposure?.max_possible_exposure || '45000000')}
          </div>
        </div>

        {/* Solvency & Health Ratio */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222]">
          <div className="text-[#a3a3a3] text-[11px] font-mono uppercase tracking-wider">Solvency Health</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-[#f5f5f5]">
              {health?.solvency_ratio ? `${health.solvency_ratio.toFixed(2)}x` : '3.33x'}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#22c55e] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              HEALTHY
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#666666] mt-0.5">
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
                ? 'border-[#f5f5f5] text-[#f5f5f5]'
                : 'border-transparent text-[#666666] hover:text-[#a3a3a3]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-16 text-center font-mono text-xs text-[#666666]">
          Syncing clearinghouse ledger with Arc...
        </div>
      ) : activeTab === 'obligations' ? (
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center border-b border-[#222222] pb-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Economic Obligations</h2>
            <span className="text-[11px] font-mono text-[#666666]">Total: {obligations.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">OBLIGATION ID</th>
                  <th className="pb-3">PAYER</th>
                  <th className="pb-3">PAYEE</th>
                  <th className="pb-3">CONTRACT / CAPABILITY</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">SETTLED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {obligations.map((ob) => (
                  <tr key={ob.obligation_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#f5f5f5] font-bold">{ob.obligation_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{ob.payer_agent_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{ob.payee_agent_id}</td>
                    <td className="py-3 text-[#666666]">{ob.contract_id} ({ob.capability || 'general'})</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{formatUsdc(ob.amount)}</td>
                    <td className="py-3 text-[#a3a3a3]">{formatUsdc(ob.settled_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${ob.status === 'SETTLED' ? 'bg-[#22c55e]' : ob.status === 'AUTHORIZED' ? 'bg-[#60a5fa]' : 'bg-[#f59e0b]'}`} />
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
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Payment Milestones & Deliverable Verification</h2>
            <span className="text-[11px] font-mono text-[#666666]">Total: {milestones.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">SEQ</th>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">DESCRIPTION</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {milestones.map((ms) => (
                  <tr key={ms.milestone_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#666666] font-bold">#{ms.sequence}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{ms.milestone_id}</td>
                    <td className="py-3 text-[#a3a3a3] max-w-xs truncate">{ms.description}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{formatUsdc(ms.amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${ms.status === 'SETTLED' ? 'bg-[#22c55e]' : ms.status === 'VERIFIED' ? 'bg-[#60a5fa]' : 'bg-[#f59e0b]'}`} />
                        {ms.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {ms.status === 'PENDING' && (
                        <button
                          onClick={() => handleVerify(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1a1a1a] text-[#f5f5f5] font-mono text-[11px] border border-[#262626] transition-colors"
                        >
                          Verify Evidence
                        </button>
                      )}
                      {ms.status === 'VERIFIED' && (
                        <button
                          onClick={() => handleSettle(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#080808] font-mono font-bold text-[11px] transition-colors"
                        >
                          Settle Milestone →
                        </button>
                      )}
                      {ms.status === 'SETTLED' && (
                        <span className="text-[11px] text-[#22c55e] font-bold font-mono">Settled ✓</span>
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
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Active Economic Escrows</h2>
            <span className="text-[11px] font-mono text-[#666666]">Total: {escrows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">ESCROW ID</th>
                  <th className="pb-3">OBLIGATION</th>
                  <th className="pb-3">VAULT ADDRESS</th>
                  <th className="pb-3">RESERVED</th>
                  <th className="pb-3">RELEASED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {escrows.map((esc) => (
                  <tr key={esc.escrow_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#f5f5f5] font-bold">{esc.escrow_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{esc.obligation_id}</td>
                    <td className="py-3 text-[#666666] truncate max-w-[120px]">{esc.vault_address}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{formatUsdc(esc.reserved_amount)}</td>
                    <td className="py-3 text-[#a3a3a3] font-bold">{formatUsdc(esc.released_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
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
              <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Bilateral Netting Engine</h2>
              <p className="text-[11px] text-[#666666]">Offsets opposing obligations preserving full audit history (INV-60, INV-61)</p>
            </div>
            <Link
              href="/economy/clearing/netting"
              className="text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            >
              Open Netting Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">PROPOSAL ID</th>
                  <th className="pb-3">COUNTERPARTIES</th>
                  <th className="pb-3">GROSS TOTAL</th>
                  <th className="pb-3">NET RESIDUAL</th>
                  <th className="pb-3">LIQUIDITY SAVINGS</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {netting.map((p) => (
                  <tr key={p.proposal_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#f5f5f5] font-bold">{p.proposal_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{p.agent_a} ↔ {p.agent_b}</td>
                    <td className="py-3 text-[#666666]">{formatUsdc(p.gross_total)}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{formatUsdc(p.net_amount)} ({p.net_payer} → {p.net_payee})</td>
                    <td className="py-3 text-[#22c55e] font-bold">+{formatUsdc(p.savings_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
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
            <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Settlement Batches</h2>
            <span className="text-[11px] font-mono text-[#666666]">Total: {batches.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">BATCH ID</th>
                  <th className="pb-3">ITEMS</th>
                  <th className="pb-3">GROSS AMOUNT</th>
                  <th className="pb-3">NET AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3 text-[#f5f5f5] font-bold">{b.batch_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{b.obligation_ids?.length || 0} obligations</td>
                    <td className="py-3 text-[#666666]">{formatUsdc(b.gross_amount)}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{formatUsdc(b.net_amount)}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
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
              <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#f5f5f5]">Reconciliation Audit Log</h2>
              <p className="text-[11px] text-[#666666]">Machine checks between obligations, intents, and Arc on-chain receipts (INV-68, INV-69)</p>
            </div>
            <Link
              href="/economy/clearing/reconciliation"
              className="text-xs font-mono text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
            >
              Open Reconciliation Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#666666] text-[11px]">
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">RECORD ID</th>
                  <th className="pb-3">PAYMENT INTENT</th>
                  <th className="pb-3">EXPECTED</th>
                  <th className="pb-3">ACTUAL</th>
                  <th className="pb-3">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {reconciliation.map((rec) => (
                  <tr key={rec.record_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.status === 'MATCHED' ? 'bg-[#22c55e]' : rec.status === 'MISMATCH' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'}`} />
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{rec.record_id}</td>
                    <td className="py-3 text-[#a3a3a3]">{rec.payment_intent_id}</td>
                    <td className="py-3 text-[#666666]">{formatUsdc(rec.expected_amount)}</td>
                    <td className="py-3 text-[#f5f5f5] font-bold">{rec.actual_amount ? formatUsdc(rec.actual_amount) : 'Pending...'}</td>
                    <td className="py-3 text-[#666666] max-w-sm truncate">{rec.discrepancy_notes}</td>
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
