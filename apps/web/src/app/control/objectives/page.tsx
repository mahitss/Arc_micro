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
    <div className="min-h-screen bg-[#060911] text-slate-100 p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">
                Autonomous Economic Fabric
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">Objectives Registry</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Economic Objectives
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Machine-readable economic goals compiled to execution blueprints, simulated before dispatch, and governed by deterministic policy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs font-mono rounded-lg shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5"
            >
              <span>+ NEW OBJECTIVE</span>
            </button>
            <Link
              href="/control/autonomy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition-colors"
            >
              Autonomy View →
            </Link>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl flex items-center justify-between text-xs font-mono text-teal-300">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-teal-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
            {['ALL', 'DRAFT', 'PLANNED', 'SIMULATED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterStatus === st
                    ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            Showing <strong className="text-white">{filtered.length}</strong> of {objectives.length} objectives
          </div>
        </div>

        {/* Objectives Table / Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((obj) => (
            <div
              key={obj.objective_id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                      obj.status === 'RUNNING'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : obj.status === 'SIMULATED'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : obj.status === 'PLANNED'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : obj.status === 'COMPLETED'
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {obj.status}
                  </span>
                  <Link
                    href={`/control/objectives/${obj.objective_id}`}
                    className="font-mono text-sm font-bold text-white hover:text-teal-300 transition-colors"
                  >
                    {obj.objective_id}
                  </Link>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 mr-1">Economic:</span>
                    <strong className="text-emerald-400">{obj.economic_budget} USDC</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1">Compute:</span>
                    <strong className="text-cyan-400">{obj.operational_budget} units</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-1">Risk:</span>
                    <strong className="text-amber-400">{obj.risk_tolerance}</strong>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed font-sans">
                {obj.description}
              </div>

              {/* Metadata strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 text-slate-400">
                <div>
                  <span className="text-slate-500">Blueprint: </span>
                  <span className="text-teal-300">{obj.current_blueprint_id || 'None'} (v{obj.blueprint_version || 1})</span>
                </div>
                <div>
                  <span className="text-slate-500">Workflow: </span>
                  <span className="text-indigo-300">{obj.active_workflow_id || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Replans: </span>
                  <span className="text-amber-300">{obj.replan_count} / 3</span>
                </div>
                <div>
                  <span className="text-slate-500">Deadline: </span>
                  <span className="text-slate-300">{obj.deadline ? new Date(obj.deadline).toLocaleDateString() : 'None'}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
                <div className="flex items-center gap-2">
                  {obj.status === 'DRAFT' && (
                    <button
                      onClick={() => handleAction('plan', obj.objective_id)}
                      className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors"
                    >
                      Compile Blueprint
                    </button>
                  )}

                  {['PLANNED', 'DRAFT'].includes(obj.status) && (
                    <button
                      onClick={() => handleAction('simulate', obj.objective_id)}
                      className="px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                    >
                      Run Simulation
                    </button>
                  )}

                  {['SIMULATED', 'PLANNED'].includes(obj.status) && (
                    <button
                      onClick={() => handleAction('start', obj.objective_id)}
                      className="px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold transition-colors"
                    >
                      Start Execution →
                    </button>
                  )}

                  {obj.status === 'RUNNING' && (
                    <>
                      <button
                        onClick={() => handleAction('pause', obj.objective_id)}
                        className="px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleAction('cancel', obj.objective_id)}
                        className="px-3 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {obj.status === 'WAITING' && (
                    <button
                      onClick={() => handleAction('resume', obj.objective_id)}
                      className="px-3 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                    >
                      Resume
                    </button>
                  )}
                </div>

                <Link
                  href={`/control/objectives/${obj.objective_id}`}
                  className="text-teal-400 hover:text-teal-300 font-bold underline flex items-center gap-1"
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
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white font-sans">Create Economic Objective</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Objective Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Produce verified security benchmark for provider cluster"
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400">Max Economic Budget (USDC)</label>
                <input
                  type="text"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Max Operational Budget (Units)</label>
                <input
                  type="text"
                  value={newCompute}
                  onChange={(e) => setNewCompute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400">Risk Tolerance</label>
                <select
                  value={newRisk}
                  onChange={(e) => setNewRisk(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Deadline (Optional)</label>
                <input
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[10px] text-slate-400">
              Note: ObjectiveCompiler translates goals into task DAGs without creating financial authority (INV-142).
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg transition-all"
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
