'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchObjectives,
  createObjective,
  planObjective,
  simulateObjective,
  startObjective,
  pauseObjective,
  resumeObjective,
  cancelObjective,
  runDemoObjective,
  resetDemoObjective,
  EconomicObjective,
  ObjectiveStatus,
} from '../../../lib/api/fabric';

export default function ObjectivesIndexPage() {
  const [objectives, setObjectives] = useState<EconomicObjective[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'OK' | 'UNAVAILABLE'>('OK');

  // New Objective Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState('25.00');
  const [newCompute, setNewCompute] = useState('50.00');
  const [newRisk, setNewRisk] = useState('LOW');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCapabilities, setNewCapabilities] = useState('market-intel, benchmarking, synthesis');

  useEffect(() => {
    loadObjectives();
  }, []);

  async function loadObjectives() {
    setLoading(true);
    try {
      const data = await fetchObjectives();
      setObjectives(data);
      setServiceStatus('OK');
    } catch (err) {
      console.error('Failed to load objectives:', err);
      setServiceStatus('UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  }

  // Canonical status mapping
  const filtered = filterStatus === 'ALL'
    ? objectives
    : objectives.filter((o) => {
        if (filterStatus === 'RUNNING') {
          return o.status === 'RUNNING' || o.status === 'DEGRADED' || o.status === 'RECOVERING';
        }
        if (filterStatus === 'PLANNED') {
          return o.status === 'PLANNED' || o.status === 'APPROVED';
        }
        if (filterStatus === 'FAILED') {
          return o.status === 'FAILED' || o.status === 'CANCELLED' || o.status === 'EXPIRED';
        }
        return o.status === filterStatus;
      });

  // Summary Metrics derivation
  const totalCount = objectives.length;
  const activeCount = objectives.filter((o) => ['RUNNING', 'WAITING', 'DEGRADED', 'RECOVERING'].includes(o.status)).length;
  const simulatedCount = objectives.filter((o) => o.status === 'SIMULATED').length;
  const completedCount = objectives.filter((o) => o.status === 'COMPLETED').length;
  const failedCount = objectives.filter((o) => ['FAILED', 'CANCELLED', 'EXPIRED'].includes(o.status)).length;
  const totalBudgetCeiling = objectives.reduce((acc, curr) => acc + (parseFloat(curr.economic_budget) || 0), 0);
  const hasDemoObjective = objectives.some((o) => o.objective_id === 'obj_market_intel_01' || o.provenance === 'DEMO FIXTURE');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesc.trim()) return;

    setActionLoading(true);
    try {
      const capabilities = newCapabilities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await createObjective({
        description: newDesc,
        economic_budget: newBudget,
        operational_budget: newCompute,
        risk_tolerance: newRisk,
        deadline: newDeadline || undefined,
        required_capabilities: capabilities,
        owner: 'operator',
        tenant_id: 'tenant_default',
        constraints: {
          max_budget: newBudget,
          required_capability: capabilities[0] || 'market-intel',
        },
      });
      setShowCreateModal(false);
      setNewDesc('');
      setActionFeedback(`Created objective ${created.objective_id} (DRAFT) — No funds moved (INV-142)`);
      await loadObjectives();
    } catch (err: any) {
      setActionFeedback(`OBJECTIVE CREATION FAILED: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRunDemo() {
    setActionLoading(true);
    setActionFeedback('Compiling and simulating deterministic flagship objective (INV-142, INV-156)...');
    try {
      const res = await runDemoObjective();
      setActionFeedback(`Flagship demo objective ${res.objective.objective_id} simulated safely. SIMULATION — NO FUNDS MOVED.`);
      await loadObjectives();
    } catch (err: any) {
      setActionFeedback(`DEMO OBJECTIVE FAILED: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetDemo() {
    setActionLoading(true);
    setActionFeedback('Resetting demo fixture...');
    try {
      await resetDemoObjective();
      setActionFeedback('Demo fixture cleared. Operating in clean state.');
      await loadObjectives();
    } catch (err: any) {
      setActionFeedback(`Reset failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAction(action: 'plan' | 'simulate' | 'start' | 'pause' | 'resume' | 'cancel', id: string) {
    setActionLoading(true);
    setActionFeedback(`Executing ${action} on ${id}...`);
    try {
      if (action === 'plan') await planObjective(id);
      else if (action === 'simulate') await simulateObjective(id);
      else if (action === 'start') await startObjective(id);
      else if (action === 'pause') await pauseObjective(id, 'Operator pause');
      else if (action === 'resume') await resumeObjective(id);
      else if (action === 'cancel') await cancelObjective(id, 'Operator cancellation');

      setActionFeedback(`Successfully performed ${action} on ${id}`);
      await loadObjectives();
    } catch (err: any) {
      setActionFeedback(`Failed to ${action} ${id}: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#D6A83A] font-bold uppercase tracking-wider">
                Autonomous Economic Fabric
              </span>
              <span className="text-xs text-[#50504C]">•</span>
              <span className="text-xs font-mono text-[#716F69]">Objectives Registry</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Economic Objectives
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Machine-readable economic goals compiled to execution blueprints, simulated before dispatch, and governed by deterministic policy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>+ NEW OBJECTIVE</span>
            </button>

            <button
              onClick={handleRunDemo}
              disabled={actionLoading}
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 font-bold text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading && <span className="w-2 h-2 rounded-full bg-[#D6A83A] animate-ping" />}
              <span>RUN DEMO OBJECTIVE</span>
            </button>

            {hasDemoObjective && (
              <button
                onClick={handleResetDemo}
                disabled={actionLoading}
                title="Remove deterministic demo fixture"
                className="px-3 py-2 bg-[#141414] hover:bg-[#181818] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222] text-xs font-mono rounded-lg transition-colors disabled:opacity-50"
              >
                Reset Demo
              </button>
            )}

            <Link
              href="/control/autonomy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] text-xs font-mono rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Autonomy View</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Service Notice if unavailable */}
        {serviceStatus === 'UNAVAILABLE' && (
          <div className="p-3 bg-[#141414] border border-[#D85C5C]/40 rounded-xl flex items-center justify-between text-xs font-mono text-[#D85C5C]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D85C5C] animate-pulse" />
              <span>OBJECTIVE SERVICE UNAVAILABLE · Operating in DEMO / LOCAL SIMULATION fallback mode</span>
            </div>
          </div>
        )}

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3 bg-[#141414] border border-[#2FB36F]/30 rounded-xl flex items-center justify-between text-xs font-mono text-[#2FB36F]">
            <span className="truncate pr-4">{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
          </div>
        )}

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Total Objectives</span>
            <strong className="text-xl font-bold font-mono text-[#F2F0EA] mt-0.5 block">{totalCount}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">Canonical Registry</span>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Active / Running</span>
            <strong className="text-xl font-bold font-mono text-[#2FB36F] mt-0.5 block">{activeCount}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">Under Runtime Leases</span>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Simulated</span>
            <strong className="text-xl font-bold font-mono text-[#D6A83A] mt-0.5 block">{simulatedCount}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">Digital Twin Validated</span>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Completed</span>
            <strong className="text-xl font-bold font-mono text-[#B0ADA5] mt-0.5 block">{completedCount}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">Quality Gate Passed</span>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Failed / Cancelled</span>
            <strong className="text-xl font-bold font-mono text-[#D85C5C] mt-0.5 block">{failedCount}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">Policy or SLA Bounds</span>
          </div>

          <div className="bg-[#101010] border border-[#222222] rounded-xl p-3.5">
            <span className="text-[10px] font-mono uppercase text-[#716F69] block">Budget Ceiling</span>
            <strong className="text-xl font-bold font-mono text-[#6B8FD6] mt-0.5 block">${totalBudgetCeiling.toFixed(2)}</strong>
            <span className="text-[10px] font-mono text-[#50504C] mt-1 block">USDC Authorized Max</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#101010] border border-[#222222] p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
            {['ALL', 'DRAFT', 'PLANNED', 'SIMULATED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterStatus === st
                    ? 'bg-[#D6A83A] text-[#080808] font-bold border border-[#D6A83A]'
                    : 'text-[#716F69] hover:text-[#F2F0EA] hover:bg-[#141414]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-[#716F69]">
            Showing <strong className="text-[#F2F0EA]">{filtered.length}</strong> of {objectives.length} objectives
          </div>
        </div>

        {/* Empty State: Zero Objectives in Database */}
        {!loading && objectives.length === 0 && (
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#181818] border border-[#222222] flex items-center justify-center mx-auto text-[#D6A83A] font-mono text-xl">
              🎯
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F2F0EA] font-sans tracking-tight">NO OBJECTIVES YET</h3>
              <p className="text-sm text-[#716F69] max-w-md mx-auto mt-1 leading-relaxed">
                Create your first autonomous economic objective to begin the lifecycle, or launch the deterministic flagship simulation.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono rounded-lg transition-all"
              >
                + NEW OBJECTIVE
              </button>
              <button
                onClick={handleRunDemo}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 font-bold text-xs font-mono rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <span className="w-2 h-2 rounded-full bg-[#D6A83A] animate-ping" />}
                <span>RUN DEMO OBJECTIVE</span>
              </button>
            </div>
            <div className="pt-3 text-[11px] font-mono text-[#50504C] border-t border-[#181818] max-w-md mx-auto">
              SOURCE: DEMO FIXTURE · MODE: SIMULATION · FINANCIAL STATE: NO FUNDS MOVED
            </div>
          </div>
        )}

        {/* Empty Filter State: Objectives exist, but none match current filter */}
        {!loading && objectives.length > 0 && filtered.length === 0 && (
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-8 text-center space-y-2">
            <p className="text-sm text-[#716F69] font-mono">
              No objectives found with status: <strong className="text-[#D6A83A]">{filterStatus}</strong>
            </p>
            <button
              onClick={() => setFilterStatus('ALL')}
              className="text-xs font-mono text-[#6B8FD6] hover:underline"
            >
              Show all ({objectives.length}) objectives
            </button>
          </div>
        )}

        {/* Objectives Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((obj) => {
            const isDemo = obj.provenance === 'DEMO FIXTURE' || obj.objective_id === 'obj_market_intel_01';
            const projectedSpend = obj.status === 'SIMULATED' ? (Number(obj.economic_budget) * 0.75).toFixed(2) : null;

            return (
              <div
                key={obj.objective_id}
                className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-xl p-5 transition-all shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                        obj.status === 'RUNNING'
                          ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40'
                          : obj.status === 'SIMULATED'
                          ? 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40'
                          : obj.status === 'PLANNED'
                          ? 'bg-[#141414] text-[#B0ADA5] border border-[#222222]'
                          : obj.status === 'COMPLETED'
                          ? 'bg-[#141414] text-[#716F69] border border-[#222222]'
                          : obj.status === 'FAILED'
                          ? 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40'
                          : 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40'
                      }`}
                    >
                      {obj.status}
                    </span>

                    {/* Objective ID & Link */}
                    <Link
                      href={`/control/objectives/${obj.objective_id}`}
                      className="font-mono text-sm font-bold text-[#F2F0EA] hover:text-[#D6A83A] transition-colors"
                    >
                      {obj.objective_id}
                    </Link>

                    {/* Demo / Simulation Provenance Badge */}
                    {isDemo && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#D6A83A]/30 text-[#D6A83A] font-semibold uppercase tracking-wider">
                        DEMO FIXTURE · SIMULATION (NO FUNDS MOVED)
                      </span>
                    )}
                  </div>

                  {/* Financial & Risk Summary */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[#716F69] mr-1">Authorized Budget:</span>
                      <strong className="text-[#2FB36F]">{obj.economic_budget} USDC</strong>
                    </div>
                    {projectedSpend && (
                      <div>
                        <span className="text-[#716F69] mr-1">Projected Spend:</span>
                        <strong className="text-[#D6A83A]">~{projectedSpend} USDC</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-[#716F69] mr-1">Compute:</span>
                      <strong className="text-[#B0ADA5]">{obj.operational_budget} units</strong>
                    </div>
                    <div>
                      <span className="text-[#716F69] mr-1">Risk:</span>
                      <strong className="text-[#D6A83A]">{obj.risk_tolerance}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#B0ADA5] leading-relaxed font-sans">
                  {obj.description}
                </div>

                {/* Metadata Strip */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] font-mono bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222] text-[#716F69]">
                  <div>
                    <span className="text-[#716F69]">Blueprint: </span>
                    <span className="text-[#D6A83A]">{obj.current_blueprint_id || 'Uncompiled'} (v{obj.blueprint_version || 1})</span>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Mission: </span>
                    <span className="text-[#6B8FD6]">{obj.active_mission_id || 'Unbound'}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Workflow: </span>
                    <span className="text-[#B0ADA5]">{obj.active_workflow_id || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Policy Check: </span>
                    <span className="text-[#2FB36F]">ALLOW (v15)</span>
                  </div>
                  <div>
                    <span className="text-[#716F69]">Mode: </span>
                    <span className="text-[#D6A83A]">{obj.mode || 'SIMULATION'}</span>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    {obj.status === 'DRAFT' && (
                      <button
                        onClick={() => handleAction('plan', obj.objective_id)}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors disabled:opacity-50"
                      >
                        Compile Blueprint
                      </button>
                    )}

                    {['PLANNED', 'DRAFT'].includes(obj.status) && (
                      <button
                        onClick={() => handleAction('simulate', obj.objective_id)}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors disabled:opacity-50"
                      >
                        Run Simulation
                      </button>
                    )}

                    {['SIMULATED', 'PLANNED'].includes(obj.status) && (
                      <button
                        onClick={() => handleAction('start', obj.objective_id)}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition-colors disabled:opacity-50"
                      >
                        Start Execution →
                      </button>
                    )}

                    {obj.status === 'RUNNING' && (
                      <>
                        <button
                          onClick={() => handleAction('pause', obj.objective_id)}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors disabled:opacity-50"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => handleAction('cancel', obj.objective_id)}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/40 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {obj.status === 'WAITING' && (
                      <button
                        onClick={() => handleAction('resume', obj.objective_id)}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition-colors disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/control/objectives/${obj.objective_id}`}
                    className="text-[#D6A83A] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Inspect Trace & Proofs</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Objective Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#101010] border border-[#222222] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="font-bold text-base text-[#F2F0EA] font-sans">Create Economic Objective</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#716F69] hover:text-[#F2F0EA]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[#716F69]">Objective Description / Goal</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Produce verified benchmark report for distributed provider cluster"
                rows={3}
                required
                className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2.5 text-[#F2F0EA] placeholder-[#50504C] focus:outline-none focus:border-[#D6A83A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[#716F69]">Authorized Budget Ceiling (USDC)</label>
                <input
                  type="text"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  placeholder="25.00"
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#716F69]">Compute Concurrency Slots</label>
                <input
                  type="text"
                  value={newCompute}
                  onChange={(e) => setNewCompute(e.target.value)}
                  placeholder="50.00"
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[#716F69]">Risk Tolerance</label>
                <select
                  value={newRisk}
                  onChange={(e) => setNewRisk(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[#716F69]">Deadline (Optional)</label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[#716F69]">Required Capabilities (comma-separated)</label>
              <input
                type="text"
                value={newCapabilities}
                onChange={(e) => setNewCapabilities(e.target.value)}
                placeholder="market-intel, benchmarking, synthesis"
                className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
              />
            </div>

            <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222] text-[10px] text-[#716F69] space-y-1">
              <p className="font-bold text-[#B0ADA5]">Autonomous Economic Safety Invariants:</p>
              <p>• Objective creation creates an economic intent/envelope ceiling only (INV-142).</p>
              <p>• Zero financial authority is created, no keys are accessed, and zero funds move (INV-141, INV-156).</p>
              <p>• Dispatched execution remains gated behind Policy, Risk, and Treasury reservations.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-[#141414] hover:bg-[#181818] text-[#716F69] border border-[#222222] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Creating...' : 'Create Objective'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
