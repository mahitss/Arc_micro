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
  const [newPurpose, setNewPurpose] = useState('Autonomous Pipeline Test');
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/treasury" className="text-xs font-mono text-[#D6A83A] hover:underline">
              ← Treasury Dashboard
            </Link>
            <span className="text-[#222222]">/</span>
            <span className="text-xs font-mono text-[#716F69]">Reservation Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA] mt-2 flex items-center gap-2">
            Liquidity Reservations & Envelopes
          </h1>
          <p className="mt-1 text-sm text-[#716F69]">
            Atomic lifecycle management of encumbered treasury capital with automated timeout garbage collection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#0B0B0B] border border-[#222222] rounded-lg p-1 flex items-center">
            <button
              onClick={() => setMode('REAL')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'REAL'
                  ? 'bg-[#D6A83A] text-[#080808]'
                  : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              REAL
            </button>
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-[#F2F0EA] text-[#080808]'
                  : 'text-[#716F69] hover:text-[#F2F0EA]'
              }`}
            >
              SIMULATION
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-bold text-xs transition flex items-center gap-1.5"
          >
            <span>+</span> New Reservation
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#101010] border border-[#222222] rounded-xl p-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-[#D6A83A] text-[#080808]'
                  : 'bg-[#0B0B0B] border border-[#222222] text-[#716F69] hover:text-[#F2F0EA]'
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
            className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg py-1.5 px-3 text-xs font-mono text-[#F2F0EA] placeholder-[#716F69] focus:outline-none focus:border-[#D6A83A]"
          />
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0B0B0B] text-[#716F69] border-b border-[#222222]">
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
            <tbody className="divide-y divide-[#222222] text-[#B0ADA5]">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#716F69]">
                    No liquidity reservations matching query in [{mode}] mode.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res.reservation_id} className="hover:bg-[#141414] transition">
                    <td className="py-3 px-4 text-[#D6A83A] font-bold">{res.reservation_id}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-[#716F69] block text-[10px]">{res.source}</span>
                      <span className="truncate block" title={res.purpose}>{res.purpose || '---'}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#F2F0EA]">{formatUsdc(res.amount)}</td>
                    <td className="py-3 px-4">
                      {res.agent_id && <div className="text-[#F2F0EA]">{res.agent_id}</div>}
                      {res.mission_id && <div className="text-[10px] text-[#716F69]">{res.mission_id}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#141414] border border-[#222222] text-[#B0ADA5] font-bold">
                        P{res.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {res.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                          ACTIVE
                        </span>
                      ) : res.status === 'CONSUMED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6B8FD6]/10 text-[#6B8FD6] border border-[#6B8FD6]/30">
                          CONSUMED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#716F69] border border-[#222222]">
                          {res.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#716F69] text-[11px]">
                      {res.timeout_seconds}s
                    </td>
                    <td className="py-3 px-4 text-right">
                      {res.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRelease(res.reservation_id)}
                          disabled={actionLoading === res.reservation_id}
                          className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#D85C5C]/20 hover:text-[#D85C5C] border border-[#222222] hover:border-[#D85C5C]/30 text-[#B0ADA5] transition text-[11px]"
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
        <div className="fixed inset-0 z-50 bg-[#080808]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#222222] rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-base font-bold text-[#F2F0EA] font-mono flex items-center gap-2">
                <span>⚡</span> Reserve Liquidity Headroom
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#716F69] hover:text-[#F2F0EA] font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[#716F69] block mb-1">AMOUNT (BASE UNITS / MICRO-USDC)</label>
                <input
                  type="text"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 5000000 (5 USDC)"
                  required
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div>
                <label className="text-[#716F69] block mb-1">SOURCE SUBSYSTEM</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                >
                  <option value="SWARM_ORCHESTRATOR">SWARM_ORCHESTRATOR</option>
                  <option value="AUTONOMOUS_MISSION">AUTONOMOUS_MISSION</option>
                  <option value="CLEARINGHOUSE_OBLIGATION">CLEARINGHOUSE_OBLIGATION</option>
                  <option value="PAYMENT_ROUTER">PAYMENT_ROUTER</option>
                </select>
              </div>

              <div>
                <label className="text-[#716F69] block mb-1">PURPOSE / OBJECTIVE</label>
                <input
                  type="text"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  required
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#716F69] block mb-1">AGENT ID (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                  />
                </div>
                <div>
                  <label className="text-[#716F69] block mb-1">TIMEOUT (SECONDS)</label>
                  <input
                    type="number"
                    value={newTimeout}
                    onChange={(e) => setNewTimeout(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-[#0B0B0B] border border-[#222222] text-[#716F69] text-[11px] space-y-1">
                <div className="text-[#D6A83A] font-bold">Machine Invariant Checks Active:</div>
                <div>• INV-72: Treasury balance floor strictly preserved</div>
                <div>• INV-75: Reservation allocated atomically under mutex</div>
                <div>• INV-76: Automatic expiration will release after {newTimeout}s</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#141414] hover:bg-[#181818] border border-[#222222] text-[#716F69] hover:text-[#F2F0EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold disabled:opacity-50"
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
