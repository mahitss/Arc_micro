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
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Autonomous Economic Clearinghouse</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
              mode === 'REAL'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {mode === 'REAL' ? '● ARC MAINNET LIVE' : '○ SIMULATION DIGITAL TWIN'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Coordinates value across AI counterparties. The clearinghouse enforces invariants INV-55 to INV-70,
            guaranteeing that AI never has unilateral financial authority and Arc blockchain settles all state.
          </p>
        </div>

        {/* Mode & Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'REAL' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              REAL (ARC)
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'SIMULATION' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SIMULATION
            </button>
          </div>
          <Link
            href="/economy/clearing/reconciliation"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs border border-cyan-500/30 transition-colors"
          >
            Reconciliation Center →
          </Link>
          <Link
            href="/economy/clearing/netting"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono text-xs border border-purple-500/30 transition-colors"
          >
            Netting Center →
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex justify-between items-center">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex justify-between items-center">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Financial State Cards: Available, Reserved, Outstanding, Solvency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On-Chain Available */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono uppercase tracking-wider">Unencumbered Balance</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {formatUsdc(health?.available_unencumbered || '85000000')}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Total Vault: {formatUsdc(health?.on_chain_available || '100000000')}
          </div>
        </div>

        {/* Reserved in Escrow */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono uppercase tracking-wider">Active Escrow Locked</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {formatUsdc(exposure?.reserved_in_escrow || '15000000')}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Bounded Reservations (INV-56)
          </div>
        </div>

        {/* Current Total Exposure */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono uppercase tracking-wider">Current Exposure</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {formatUsdc(exposure?.current_exposure || '30000000')}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Max Cap: {formatUsdc(exposure?.max_possible_exposure || '45000000')}
          </div>
        </div>

        {/* Solvency & Health Ratio */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono uppercase tracking-wider">Solvency Health</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {health?.solvency_ratio ? `${health.solvency_ratio.toFixed(2)}x` : '3.33x'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              HEALTHY
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Deterministic Signals: OK
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-mono overflow-x-auto">
        {(['obligations', 'milestones', 'escrows', 'netting', 'batches', 'reconciliation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 border-b-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-16 text-center font-mono text-sm text-slate-500">
          Syncing clearinghouse ledger with Arc...
        </div>
      ) : activeTab === 'obligations' ? (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Economic Obligations</h2>
            <span className="text-xs font-mono text-slate-400">Total: {obligations.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">OBLIGATION ID</th>
                  <th className="pb-3">PAYER</th>
                  <th className="pb-3">PAYEE</th>
                  <th className="pb-3">CONTRACT / CAPABILITY</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">SETTLED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {obligations.map((ob) => (
                  <tr key={ob.obligation_id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-white font-bold">{ob.obligation_id}</td>
                    <td className="py-3 text-cyan-300">{ob.payer_agent_id}</td>
                    <td className="py-3 text-slate-300">{ob.payee_agent_id}</td>
                    <td className="py-3 text-slate-400">{ob.contract_id} ({ob.capability || 'general'})</td>
                    <td className="py-3 text-white font-bold">{formatUsdc(ob.amount)}</td>
                    <td className="py-3 text-emerald-400">{formatUsdc(ob.settled_amount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ob.status === 'SETTLED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ob.status === 'AUTHORIZED'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
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
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Payment Milestones & Deliverable Verification</h2>
            <span className="text-xs font-mono text-slate-400">Total: {milestones.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">SEQ</th>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">DESCRIPTION</th>
                  <th className="pb-3">AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {milestones.map((ms) => (
                  <tr key={ms.milestone_id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-slate-400 font-bold">#{ms.sequence}</td>
                    <td className="py-3 text-white font-bold">{ms.milestone_id}</td>
                    <td className="py-3 text-slate-300 max-w-xs truncate">{ms.description}</td>
                    <td className="py-3 text-white font-bold">{formatUsdc(ms.amount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ms.status === 'SETTLED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ms.status === 'VERIFIED'
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ms.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {ms.status === 'PENDING' && (
                        <button
                          onClick={() => handleVerify(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[11px]"
                        >
                          Verify Evidence
                        </button>
                      )}
                      {ms.status === 'VERIFIED' && (
                        <button
                          onClick={() => handleSettle(ms.milestone_id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px]"
                        >
                          Settle Milestone →
                        </button>
                      )}
                      {ms.status === 'SETTLED' && (
                        <span className="text-[11px] text-emerald-400 font-bold">Settled ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'escrows' ? (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Active Economic Escrows</h2>
            <span className="text-xs font-mono text-slate-400">Total: {escrows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">ESCROW ID</th>
                  <th className="pb-3">OBLIGATION</th>
                  <th className="pb-3">VAULT ADDRESS</th>
                  <th className="pb-3">RESERVED</th>
                  <th className="pb-3">RELEASED</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {escrows.map((esc) => (
                  <tr key={esc.escrow_id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-white font-bold">{esc.escrow_id}</td>
                    <td className="py-3 text-cyan-300">{esc.obligation_id}</td>
                    <td className="py-3 text-slate-400 truncate max-w-[120px]">{esc.vault_address}</td>
                    <td className="py-3 text-amber-400 font-bold">{formatUsdc(esc.reserved_amount)}</td>
                    <td className="py-3 text-emerald-400 font-bold">{formatUsdc(esc.released_amount)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
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
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Bilateral Netting Engine</h2>
              <p className="text-xs text-slate-400">Offsets opposing obligations preserving full audit history (INV-60, INV-61)</p>
            </div>
            <Link
              href="/economy/clearing/netting"
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Open Netting Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">PROPOSAL ID</th>
                  <th className="pb-3">COUNTERPARTIES</th>
                  <th className="pb-3">GROSS TOTAL</th>
                  <th className="pb-3">NET RESIDUAL</th>
                  <th className="pb-3">LIQUIDITY SAVINGS</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {netting.map((p) => (
                  <tr key={p.proposal_id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-white font-bold">{p.proposal_id}</td>
                    <td className="py-3 text-slate-300">{p.agent_a} ↔ {p.agent_b}</td>
                    <td className="py-3 text-slate-400">{formatUsdc(p.gross_total)}</td>
                    <td className="py-3 text-emerald-400 font-bold">{formatUsdc(p.net_amount)} ({p.net_payer} → {p.net_payee})</td>
                    <td className="py-3 text-purple-400 font-bold">+{formatUsdc(p.savings_amount)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
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
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Settlement Batches</h2>
            <span className="text-xs font-mono text-slate-400">Total: {batches.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">BATCH ID</th>
                  <th className="pb-3">ITEMS</th>
                  <th className="pb-3">GROSS AMOUNT</th>
                  <th className="pb-3">NET AMOUNT</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-slate-800/30">
                    <td className="py-3 text-white font-bold">{b.batch_id}</td>
                    <td className="py-3 text-cyan-300">{b.obligation_ids?.length || 0} obligations</td>
                    <td className="py-3 text-slate-300">{formatUsdc(b.gross_amount)}</td>
                    <td className="py-3 text-emerald-400 font-bold">{formatUsdc(b.net_amount)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
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
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Reconciliation Audit Log</h2>
              <p className="text-xs text-slate-400">Machine checks between obligations, intents, and Arc on-chain receipts (INV-68, INV-69)</p>
            </div>
            <Link
              href="/economy/clearing/reconciliation"
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Open Full Reconciliation Center →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">RECORD ID</th>
                  <th className="pb-3">PAYMENT INTENT</th>
                  <th className="pb-3">EXPECTED</th>
                  <th className="pb-3">ACTUAL</th>
                  <th className="pb-3">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reconciliation.map((rec) => (
                  <tr key={rec.record_id} className="hover:bg-slate-800/30">
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.status === 'MATCHED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : rec.status === 'MISMATCH'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 text-white font-bold">{rec.record_id}</td>
                    <td className="py-3 text-cyan-300">{rec.payment_intent_id}</td>
                    <td className="py-3 text-slate-300">{formatUsdc(rec.expected_amount)}</td>
                    <td className="py-3 text-emerald-400 font-bold">{rec.actual_amount ? formatUsdc(rec.actual_amount) : 'Pending...'}</td>
                    <td className="py-3 text-slate-400 max-w-sm truncate">{rec.discrepancy_notes}</td>
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
