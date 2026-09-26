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
  EconomicObjective,
  ObjectiveStatus,
} from '../../../lib/api/fabric';

export default function ObjectivesIndexPage() {
  const [objectives, setObjectives] = useState<EconomicObjective[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Objective Form Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState('50.00');
  const [newCompute, setNewCompute] = useState('50.00');
  const [newRisk, setNewRisk] = useState('MEDIUM');
  const [newDeadline, setNewDeadline] = useState('');

  useEffect(() => {
    loadObjectives();
  }, []);

  async function loadObjectives() {
    setLoading(true);
    try {
      const data = await fetchObjectives();
      setObjectives(data);
    } catch (err) {
      console.error('Failed to load objectives:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterStatus === 'ALL'
    ? objectives
    : objectives.filter((o) => o.status === filterStatus);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesc.trim()) return;

    try {
      const created = await createObjective({
        description: newDesc,
        economic_budget: newBudget,
        operational_budget: newCompute,
        risk_tolerance: newRisk,
        deadline: newDeadline || undefined,
        owner: 'operator',
        tenant_id: 'tenant_default',
      });
      setShowCreateModal(false);
      setNewDesc('');
      setActionFeedback(`Created objective ${created.objective_id}`);
      loadObjectives();
    } catch (err: any) {
      setActionFeedback(`Error creating objective: ${err.message}`);
    }
  }

  async function handleAction(action: 'plan' | 'simulate' | 'start' | 'pause' | 'resume' | 'cancel', id: string) {
    setActionFeedback(`Executing ${action} on ${id}...`);
    try {
      if (action === 'plan') await planObjective(id);
      else if (action === 'simulate') await simulateObjective(id);
      else if (action === 'start') await startObjective(id);
      else if (action === 'pause') await pauseObjective(id, 'Operator pause');
      else if (action === 'resume') await resumeObjective(id);
      else if (action === 'cancel') await cancelObjective(id, 'Operator cancellation');

      setActionFeedback(`Successfully performed ${action} on ${id}`);
      loadObjectives();
    } catch (err: any) {
      setActionFeedback(`Failed to ${action} ${id}: ${err.message}`);
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

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold text-xs font-mono rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>+ NEW OBJECTIVE</span>
            </button>
            <Link
              href="/control/autonomy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] text-xs font-mono rounded-lg transition-colors"
            >
              Autonomy View →
            </Link>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3 bg-[#141414] border border-[#2FB36F]/30 rounded-xl flex items-center justify-between text-xs font-mono text-[#2FB36F]">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
          </div>
        )}

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

        {/* Objectives Table / Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((obj) => (
            <div
              key={obj.objective_id}
              className="bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] rounded-xl p-5 transition-all shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
                <div className="flex items-center gap-3">
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
                        : 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40'
                    }`}
                  >
                    {obj.status}
                  </span>
                  <Link
                    href={`/control/objectives/${obj.objective_id}`}
                    className="font-mono text-sm font-bold text-[#F2F0EA] hover:text-[#D6A83A] transition-colors"
                  >
                    {obj.objective_id}
                  </Link>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#716F69] mr-1">Economic:</span>
                    <strong className="text-[#2FB36F]">{obj.economic_budget} USDC</strong>
                  </div>
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

              {/* Metadata strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222] text-[#716F69]">
                <div>
                  <span className="text-[#716F69]">Blueprint: </span>
                  <span className="text-[#D6A83A]">{obj.current_blueprint_id || 'None'} (v{obj.blueprint_version || 1})</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Workflow: </span>
                  <span className="text-[#B0ADA5]">{obj.active_workflow_id || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Replans: </span>
                  <span className="text-[#D6A83A]">{obj.replan_count} / 3</span>
                </div>
                <div>
                  <span className="text-[#716F69]">Deadline: </span>
                  <span className="text-[#B0ADA5]">{obj.deadline ? new Date(obj.deadline).toLocaleDateString() : 'None'}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
                <div className="flex items-center gap-2">
                  {obj.status === 'DRAFT' && (
                    <button
                      onClick={() => handleAction('plan', obj.objective_id)}
                      className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition-colors"
                    >
                      Compile Blueprint
                    </button>
                  )}

                  {['PLANNED', 'DRAFT'].includes(obj.status) && (
                    <button
                      onClick={() => handleAction('simulate', obj.objective_id)}
                      className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors"
                    >
                      Run Simulation
                    </button>
                  )}

                  {['SIMULATED', 'PLANNED'].includes(obj.status) && (
                    <button
                      onClick={() => handleAction('start', obj.objective_id)}
                      className="px-3 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition-colors"
                    >
                      Start Execution →
                    </button>
                  )}

                  {obj.status === 'RUNNING' && (
                    <>
                      <button
                        onClick={() => handleAction('pause', obj.objective_id)}
                        className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40 transition-colors"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleAction('cancel', obj.objective_id)}
                        className="px-3 py-1 rounded bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/40 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {obj.status === 'WAITING' && (
                    <button
                      onClick={() => handleAction('resume', obj.objective_id)}
                      className="px-3 py-1 rounded bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold transition-colors"
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
          ))}
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
              <label className="text-[#716F69]">Objective Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Produce verified security benchmark for provider cluster"
                rows={3}
                required
                className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2.5 text-[#F2F0EA] placeholder-[#50504C] focus:outline-none focus:border-[#D6A83A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[#716F69]">Max Economic Budget (USDC)</label>
                <input
                  type="text"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#716F69]">Max Operational Budget (Units)</label>
                <input
                  type="text"
                  value={newCompute}
                  onChange={(e) => setNewCompute(e.target.value)}
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

            <div className="p-3 bg-[#0B0B0B] rounded-lg border border-[#222222] text-[10px] text-[#716F69]">
              Note: ObjectiveCompiler translates goals into task DAGs without creating financial authority (INV-142).
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
                className="px-4 py-1.5 bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold rounded-lg transition-all"
              >
                Create Objective
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
