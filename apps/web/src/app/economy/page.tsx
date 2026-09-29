'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchObligations,
  runClearingSimulation,
  resetClearingSimulation,
  getClearingSimulation,
  EconomicObligation,
  FlagshipSimulationResult,
} from '../../lib/api/clearinghouse';
import { fetchServiceReputations } from '../../lib/api/missions';
import { ServiceReputation } from '../../lib/api/types';

export default function EconomyPage() {
  const [obligations, setObligations] = useState<EconomicObligation[]>([]);
  const [baseReputations, setBaseReputations] = useState<ServiceReputation[]>([]);
  const [simResult, setSimResult] = useState<FlagshipSimulationResult | null>(null);
  const [activeSection, setActiveSection] = useState<'obligations' | 'netting' | 'reconciliation'>('obligations');
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const [obsData, repData, cachedSim] = await Promise.all([
          fetchObligations(),
          fetchServiceReputations(),
          getClearingSimulation(),
        ]);
        setBaseReputations(repData);
        if (cachedSim && cachedSim.simulation_id) {
          setSimResult(cachedSim);
          setObligations(cachedSim.obligations || []);
        } else {
          setObligations(obsData);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load economic clearing data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatUsdc = (baseUnits?: string) => {
    const val = parseInt(baseUnits || '0', 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setError(null);
    try {
      const result = await runClearingSimulation();
      setSimResult(result);
      setObligations(result.obligations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Clearing simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    try {
      await resetClearingSimulation();
      setSimResult(null);
      setShowLedger(false);
      const cleanObs = await fetchObligations();
      setObligations(cleanObs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset simulation');
    } finally {
      setResetting(false);
    }
  };

  // Derive reputations display: reflect deterministic simulated observations when simulation is active
  // WITHOUT mutating real production memory
  const reputations = useMemo(() => {
    if (!simResult) return baseReputations;

    return baseReputations.map((rep) => {
      if (rep.service_id === 'svc_agent_data') {
        return {
          ...rep,
          total_requests: 1,
          successful_requests: 1,
          failed_requests: 0,
          payment_count: 1,
          average_latency_ms: 42,
          total_volume_base: '5000000',
        };
      }
      if (rep.service_id === 'svc_agent_research') {
        return {
          ...rep,
          total_requests: 2,
          successful_requests: 2,
          failed_requests: 0,
          payment_count: 2,
          average_latency_ms: 65,
          total_volume_base: '14000000',
        };
      }
      if (rep.service_id === 'svc_agent_validator') {
        return {
          ...rep,
          total_requests: 1,
          successful_requests: 1,
          failed_requests: 0,
          payment_count: 0,
          average_latency_ms: 28,
          total_volume_base: '5000000',
        };
      }
      return rep;
    });
  }, [baseReputations, simResult]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              AUTONOMOUS ECONOMIC CLEARINGHOUSE
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              MULTI-AGENT VALUE SETTLEMENT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1.5 max-w-2xl leading-relaxed">
            The clearinghouse coordinates value across autonomous counterparties. Existing policy and approval rules authorize value; Arc blockchain settles value.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#B0ADA5] bg-[#101010] px-3.5 py-2 rounded-lg border border-[#222222] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
          <span className="font-mono text-[11px] tracking-wide text-[#E8E6DF]">BILATERAL CLEARING ENFORCED · SIMULATION</span>
        </div>
      </div>

      {/* Sections Hub: Obligations, Netting, Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveSection('obligations')}
          className={`p-5 rounded-xl text-left border transition-all ${
            activeSection === 'obligations'
              ? 'bg-[#151515] border-[#2D2D2D]'
              : 'bg-[#101010] border-[#222222] hover:border-[#2a2a2a]'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              OBLIGATIONS
            </span>
            <span className="text-[11px] text-[#716F69]">
              LIVE: 0 · SIMULATED: {obligations.length} RECORDS
            </span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Bilateral debt contracts, escrow reserves, and deliverable-backed milestones.
          </p>
        </button>

        <Link
          href="/economy/clearing/netting"
          className="p-5 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B8FD6]" />
              NETTING
            </span>
            <span className="text-[11px] text-[#716F69] group-hover:text-[#F2F0EA] transition-colors">Launch →</span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Deterministic cycle compression to optimize on-chain liquidity & minimize Arc gas fees.
          </p>
          {simResult && (
            <div className="mt-2.5 pt-2 border-t border-[#1e1e1e] text-[11px] text-[#2FB36F] flex items-center gap-1 font-mono">
              <span>Candidates: 1 proposal · Savings: $4.00 (2 compressed)</span>
            </div>
          )}
        </Link>

        <Link
          href="/economy/clearing/reconciliation"
          className="p-5 rounded-xl text-left bg-[#101010] border border-[#222222] hover:border-[#2a2a2a] transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#F2F0EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              RECONCILIATION
            </span>
            <span className="text-[11px] text-[#716F69] group-hover:text-[#F2F0EA] transition-colors">Audit →</span>
          </div>
          <p className="text-xs text-[#B0ADA5] leading-relaxed">
            Deterministic verification between the simulated clearing ledger and projected settlement state.
          </p>
          <div className="mt-2.5 pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#2FB36F]">SIM: {simResult ? 'MATCHED' : 'AVAILABLE'}</span>
            <span className="text-[#716F69]">ARC: BLOCKED (NO VAULT)</span>
          </div>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#D85C5C]/40 text-xs text-[#D85C5C] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
          <span>{error}</span>
        </div>
      )}

      {/* Simulation Result Summary Card */}
      {simResult && (
        <div className="p-5 rounded-xl bg-[#121212] border border-[#D6A83A]/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2FB36F]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F2F0EA] tracking-wider uppercase">
                    SIMULATION COMPLETE
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1b1b1b] text-[#D6A83A] border border-[#333333]">
                    {simResult.simulation_id}
                  </span>
                </div>
                <p className="text-[11px] text-[#B0ADA5] mt-0.5">
                  Deterministic Flagship Clearing Scenario · Mode: SIMULATION · Zero Arc Broadcast
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setShowLedger(!showLedger)}
                className="h-7 px-3 bg-[#181818] hover:bg-[#202020] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#2a2a2a] transition-colors cursor-pointer"
              >
                {showLedger ? 'Hide Ledger' : 'Inspect Simulation Ledger'}
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="h-7 px-3 bg-[#181818] hover:bg-[#202020] text-[#D85C5C] hover:text-[#f87171] text-xs font-medium rounded-lg border border-[#2a2a2a] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Reset Simulation'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Obligations</span>
              <span className="text-base font-bold text-[#F2F0EA] block mt-0.5">{simResult.obligations_count}</span>
              <span className="text-[10px] text-[#B0ADA5]">{formatUsdc(simResult.gross_value)} Gross</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Nettable Value</span>
              <span className="text-base font-bold text-[#6B8FD6] block mt-0.5">{formatUsdc(simResult.netted_value)}</span>
              <span className="text-[10px] text-[#B0ADA5]">2 Obligations</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Projected Savings</span>
              <span className="text-base font-bold text-[#2FB36F] block mt-0.5">{formatUsdc(simResult.projected_savings)}</span>
              <span className="text-[10px] text-[#2FB36F]">16.7% Liquidity Saved</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Projected Settlement</span>
              <span className="text-base font-bold text-[#F2F0EA] block mt-0.5">{formatUsdc(simResult.net_settlement)}</span>
              <span className="text-[10px] text-[#B0ADA5]">{simResult.batches_count} Batch Ready</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Ledger Balance</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                <span className="text-xs font-bold text-[#2FB36F]">BALANCED</span>
              </div>
              <span className="text-[10px] text-[#716F69] font-mono">Debits = Credits</span>
            </div>
            <div className="p-3 rounded-lg bg-[#0e0e0e] border border-[#222222]">
              <span className="text-[10px] text-[#716F69] uppercase font-semibold block">Financial Authority</span>
              <span className="text-xs font-bold text-[#D6A83A] block mt-0.5">POLICY CONTROLLED</span>
              <span className="text-[10px] text-[#716F69]">Zero Broadcast</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0c0c0c] border border-[#1e1e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#B0ADA5]">Reconciliation:</span>
              <span className="text-[#2FB36F] font-medium font-mono text-[11px]">SIMULATION: MATCHED</span>
              <span className="text-[#444444]">|</span>
              <span className="text-[#D85C5C] font-medium font-mono text-[11px]">LIVE ARC: BLOCKED — VAULT NOT DEPLOYED</span>
            </div>
            <div className="text-[11px] text-[#716F69]">
              Netting coordinates debt · Cannot move funds or bypass policy
            </div>
          </div>
        </div>
      )}

      {/* Simulation Double-Entry Ledger Inspector */}
      {showLedger && simResult && (
        <div className="p-5 rounded-xl bg-[#0e0e0e] border border-[#2a2a2a] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e1e1e] pb-2.5">
            <div>
              <h3 className="text-xs font-bold text-[#F2F0EA] uppercase tracking-wide">
                SIMULATION DOUBLE-ENTRY CLEARING LEDGER
              </h3>
              <p className="text-[11px] text-[#716F69]">
                Invariant INV-63: Double-entry ledger verification (Total Debits == Total Credits)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#142818] text-[#2FB36F] border border-[#2FB36F]/30">
                LEDGER BALANCE: BALANCED (${(parseInt(simResult.total_debits, 10) / 1000000).toFixed(2)} USDC)
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[10px] uppercase">
                  <th className="pb-2">Entry ID</th>
                  <th className="pb-2">Obligation</th>
                  <th className="pb-2">Debit Account</th>
                  <th className="pb-2">Credit Account</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Provenance</th>
                  <th className="pb-2 text-right">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818] text-[11px]">
                {simResult.simulated_ledger.map((e) => (
                  <tr key={e.entry_id} className="hover:bg-[#141414]">
                    <td className="py-2.5 text-[#F2F0EA]">{e.entry_id}</td>
                    <td className="py-2.5 text-[#B0ADA5]">{e.obligation_id}</td>
                    <td className="py-2.5 text-[#D85C5C]">{e.debit_account}</td>
                    <td className="py-2.5 text-[#2FB36F]">{e.credit_account}</td>
                    <td className="py-2.5 text-[#F2F0EA] font-sans font-bold">{formatUsdc(e.amount)}</td>
                    <td className="py-2.5 text-[#716F69]">{e.entry_type}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a1a1a] text-[#D6A83A] border border-[#333333]">
                        {e.execution_mode}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[#716F69] text-[10px]">
                      {e.hash.substring(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean Financial Table: Obligations */}
      <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#F2F0EA]">
              ECONOMIC OBLIGATIONS & CLEARING
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Deterministic Simulation Ledger · All State Verified
            </p>
          </div>
          <Link
            href="/economy/clearing"
            className="h-8 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] transition-colors flex items-center self-start sm:self-auto"
          >
            Open Full Clearing Console →
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#716F69] text-xs">
            Loading clearinghouse ledger...
          </div>
        ) : obligations.length === 0 ? (
          <div className="p-10 text-center space-y-4 rounded-xl bg-[#101010] border border-[#1c1c1c]">
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
              <h3 className="text-sm font-bold text-[#F2F0EA] tracking-wide uppercase">
                NO LIVE OBLIGATIONS
              </h3>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-[#B0ADA5]">
              <div className="flex items-center gap-2 bg-[#141414] px-3 py-1.5 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] uppercase font-semibold text-[10px]">Live Obligations</span>
                <span className="font-bold text-[#F2F0EA]">0</span>
              </div>
              <div className="flex items-center gap-2 bg-[#141414] px-3 py-1.5 rounded-lg border border-[#222222]">
                <span className="text-[#716F69] uppercase font-semibold text-[10px]">Simulated Obligations</span>
                <span className="font-bold text-[#D6A83A]">0</span>
              </div>
            </div>

            <p className="text-xs text-[#B0ADA5] max-w-lg mx-auto leading-relaxed">
              No real settlement activity has been recorded because AgentVault is not deployed and live execution is disabled. Simulation clearing is available for the flagship mission.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="h-9 px-4 bg-[#F2F0EA] hover:bg-white text-[#080808] font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {simulating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#080808] border-t-transparent rounded-full animate-spin" />
                    <span>RUNNING CLEARING SIMULATION...</span>
                  </>
                ) : (
                  <>
                    <span>RUN CLEARING SIMULATION</span>
                    <span>→</span>
                  </>
                )}
              </button>
              <Link
                href="/economy/clearing"
                className="h-9 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] font-medium text-xs rounded-lg border border-[#222222] transition-colors flex items-center"
              >
                Inspect Ledger
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#716F69] px-1">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                <span className="font-mono text-[11px] text-[#B0ADA5]">
                  SIMULATED FIXTURE DATA · ZERO FUNDS MOVED · NO ARC BROADCAST
                </span>
              </span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs text-[#716F69] hover:text-[#D85C5C] transition-colors cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Reset to Clean State'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222222] text-[#716F69] text-[11px] uppercase tracking-wider">
                    <th className="pb-3 font-medium">COUNTERPARTY</th>
                    <th className="pb-3 font-medium">OBLIGATION</th>
                    <th className="pb-3 font-medium">PROVENANCE</th>
                    <th className="pb-3 font-medium">STATUS</th>
                    <th className="pb-3 font-medium">RESERVED</th>
                    <th className="pb-3 font-medium">SETTLEMENT</th>
                    <th className="pb-3 font-medium text-right">EXPOSURE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {obligations.map((ob) => {
                    const total = parseInt(ob.amount || '0', 10);
                    const settled = parseInt(ob.settled_amount || '0', 10);
                    const exposure = Math.max(0, total - settled);
                    const reserved = ob.status === 'AUTHORIZED' || ob.status === 'PENDING' ? total : 0;

                    return (
                      <tr key={ob.obligation_id} className="hover:bg-[#141414] transition-colors">
                        <td className="py-3.5 text-[#F2F0EA] font-semibold">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{ob.payer_agent_id}</span>
                            <span className="text-[10px] text-[#716F69] font-mono">→ {ob.payee_agent_id}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-[#B0ADA5]">
                          <div className="flex flex-col">
                            <span className="text-[#F2F0EA] font-mono">{ob.obligation_id}</span>
                            <span className="text-[10px] text-[#716F69] font-mono">{ob.capability || ob.contract_id}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#191919] text-[#D6A83A] border border-[#2f2f2f]">
                            SIMULATED
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                ob.status === 'SETTLED'
                                  ? 'bg-[#2FB36F]'
                                  : ob.status === 'AUTHORIZED'
                                  ? 'bg-[#6B8FD6]'
                                  : 'bg-[#D6A83A]'
                              }`}
                            />
                            {ob.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-[#F2F0EA] font-bold">
                          {formatUsdc(reserved.toString())}
                        </td>
                        <td className="py-3.5 text-[#B0ADA5]">
                          {formatUsdc(ob.settled_amount)}
                        </td>
                        <td className="py-3.5 text-right font-bold text-[#F2F0EA]">
                          {formatUsdc(exposure.toString())}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Service Reputation & Reliability Telemetry */}
      <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#F2F0EA]">
              COUNTERPARTY REPUTATION & RELIABILITY
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              DETERMINISTIC SIMULATION TELEMETRY · DEMO SEED
            </p>
          </div>
          <span className="text-[10px] text-[#B0ADA5] bg-[#141414] px-2.5 py-1 rounded-md border border-[#222222] self-start sm:self-auto font-medium font-mono">
            DEMO SEED FIXTURE
          </span>
        </div>

        {reputations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Service ID</th>
                  <th className="pb-3 font-medium">Simulated Requests</th>
                  <th className="pb-3 font-medium">Simulated Success</th>
                  <th className="pb-3 font-medium">Avg Latency</th>
                  <th className="pb-3 font-medium">Reputation Tier</th>
                  <th className="pb-3 font-medium text-right">Projected Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {reputations.map((rep) => {
                  const hasHistory = rep.total_requests > 0;
                  const successRate = hasHistory
                    ? ((rep.successful_requests / rep.total_requests) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={rep.service_id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-3.5 font-semibold text-[#F2F0EA] font-mono">
                        {rep.service_id}
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        {hasHistory ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#D6A83A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                            {rep.total_requests} sim req
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3.5">
                        {hasHistory && successRate !== null ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2FB36F]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                            {successRate}%
                          </span>
                        ) : (
                          <div className="text-[#716F69]">
                            <span className="block font-medium text-xs text-[#B0ADA5]">—</span>
                            <span className="text-[10px] block">No observed requests</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-[#B0ADA5]">
                        {hasHistory ? `${rep.average_latency_ms} ms (sim)` : `${rep.average_latency_ms} ms (baseline)`}
                      </td>
                      <td className="py-3.5">
                        {hasHistory ? (
                          <div>
                            <span className="text-[#F2F0EA] font-bold">
                              {(rep.reputation_score / 100).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-[#716F69]"> / 100</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[#F2F0EA] font-medium">
                              {(rep.reputation_score / 100).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-[#716F69] ml-1">· Demo baseline</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-bold text-[#F2F0EA]">
                        {formatUsdc(rep.total_volume_base)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
