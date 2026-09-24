'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchTreasuryReservations,
  createTreasuryReservation,
  releaseTreasuryReservation,
  LiquidityReservation,
  TreasuryExecutionMode,
} from '@/lib/api/treasury';

function formatUsdc(microUnits: string | number): string {
  const val = typeof microUnits === 'string' ? parseFloat(microUnits) : microUnits;
  if (isNaN(val)) return '$0.00';
  return `$${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TreasuryReservationsPage() {
  const [mode, setMode] = useState<TreasuryExecutionMode>('REAL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reservations, setReservations] = useState<LiquidityReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [newAmount, setNewAmount] = useState('5000000'); // 5 USDC
  const [newSource, setNewSource] = useState('SWARM_ORCHESTRATOR');
  const [newPurpose, setNewPurpose] = useState('Task 11 Autonomous Pipeline Test');
  const [newAgentId, setNewAgentId] = useState('agent_researcher_01');
  const [newMissionId, setNewMissionId] = useState('msn_demo_01');
  const [newTimeout, setNewTimeout] = useState('3600');

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await fetchTreasuryReservations(
        'org_default',
        mode,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setReservations(data);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [mode, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      await createTreasuryReservation({
        organization_id: 'org_default',
        source: newSource,
        amount_base: newAmount,
        agent_id: newAgentId || undefined,
        mission_id: newMissionId || undefined,
        timeout_seconds: parseInt(newTimeout, 10) || 3600,
        mode,
      });
      setShowModal(false);
      await loadReservations();
    } catch (err) {
      console.error('Failed to create reservation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (resId: string) => {
    setActionLoading(resId);
    try {
      await releaseTreasuryReservation(resId, 'Manual release from Reservations Manager');
      await loadReservations();
    } catch (err) {
      console.error('Failed to release reservation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReservations = reservations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reservation_id.toLowerCase().includes(q) ||
      (r.agent_id && r.agent_id.toLowerCase().includes(q)) ||
      (r.purpose && r.purpose.toLowerCase().includes(q)) ||
      r.source.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/treasury" className="text-xs font-mono text-cyan-400 hover:underline">
              ← Treasury Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-slate-400">Reservation Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            Liquidity Reservations & Envelopes
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Atomic lifecycle management of encumbered treasury capital with automated timeout garbage collection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'REAL'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              REAL
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SIMULATION
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <span>+</span> New Reservation
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by ID, agent, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Reservation ID</th>
                <th className="py-3 px-4">Source / Scope</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Agent / Mission</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timeout</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No liquidity reservations matching query in [{mode}] mode.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res.reservation_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-cyan-300 font-bold">{res.reservation_id}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-slate-400 block text-[10px]">{res.source}</span>
                      <span className="truncate block" title={res.purpose}>{res.purpose || '---'}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{formatUsdc(res.amount)}</td>
                    <td className="py-3 px-4">
                      {res.agent_id && <div className="text-purple-300">{res.agent_id}</div>}
                      {res.mission_id && <div className="text-[10px] text-slate-400">{res.mission_id}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                        P{res.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {res.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      ) : res.status === 'CONSUMED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          CONSUMED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          {res.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {res.timeout_seconds}s
                    </td>
                    <td className="py-3 px-4 text-right">
                      {res.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(res.reservation_id)}
                          disabled={actionLoading === res.reservation_id}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-slate-300 transition text-[11px]"
                        >
                          {actionLoading === res.reservation_id ? '...' : 'Release'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reservation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>⚡</span> Reserve Liquidity Headroom
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">AMOUNT (BASE UNITS / MICRO-USDC)</label>
                <input
                  type="text"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 5000000 (5 USDC)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">SOURCE SUBSYSTEM</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SWARM_ORCHESTRATOR">SWARM_ORCHESTRATOR</option>
                  <option value="AUTONOMOUS_MISSION">AUTONOMOUS_MISSION</option>
                  <option value="CLEARINGHOUSE_OBLIGATION">CLEARINGHOUSE_OBLIGATION</option>
                  <option value="PAYMENT_ROUTER">PAYMENT_ROUTER</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PURPOSE / OBJECTIVE</label>
                <input
                  type="text"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">AGENT ID (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">TIMEOUT (SECONDS)</label>
                  <input
                    type="number"
                    value={newTimeout}
                    onChange={(e) => setNewTimeout(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-cyan-500/20 text-slate-400 text-[11px] space-y-1">
                <div className="text-cyan-400 font-bold">Machine Invariant Checks Active:</div>
                <div>• INV-72: Treasury balance floor strictly preserved</div>
                <div>• INV-75: Reservation allocated atomically under mutex</div>
                <div>• INV-76: Automatic expiration will release after {newTimeout}s</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {actionLoading === 'create' ? 'Reserving...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
