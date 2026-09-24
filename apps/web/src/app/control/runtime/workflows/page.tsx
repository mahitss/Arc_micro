'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchRuntimeWorkflows,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  DurableWorkflow,
  WorkflowState,
} from '../../../../lib/api/runtime';

export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState<DurableWorkflow[]>([]);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, [selectedState]);

  async function loadWorkflows() {
    setLoading(true);
    try {
      const res = await fetchRuntimeWorkflows(selectedState === 'ALL' ? undefined : selectedState);
      setWorkflows(res.workflows);
    } catch (err) {
      console.error('Failed to load workflows', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePause(id: string) {
    setActionInProgress(id);
    setMessage(null);
    try {
      await pauseWorkflow(id, 'Paused via Control Tower UI');
      setMessage({ text: `Workflow ${id} paused successfully.`, type: 'success' });
      await loadWorkflows();
    } catch (err: any) {
      setMessage({ text: `Failed to pause: ${err.message}`, type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleResume(id: string) {
    setActionInProgress(id);
    setMessage(null);
    try {
      await resumeWorkflow(id);
      setMessage({ text: `Workflow ${id} resumed after precondition revalidation.`, type: 'success' });
      await loadWorkflows();
    } catch (err: any) {
      setMessage({ text: `Failed to resume: ${err.message}`, type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm(`Are you sure you want to safely cancel workflow ${id}?`)) return;
    setActionInProgress(id);
    setMessage(null);
    try {
      await cancelWorkflow(id, 'Cancelled via Control Tower UI');
      setMessage({ text: `Workflow ${id} cancelled.`, type: 'success' });
      await loadWorkflows();
    } catch (err: any) {
      setMessage({ text: `Failed to cancel: ${err.message}`, type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  }

  const states: { label: string; value: string }[] = [
    { label: 'ALL STATES', value: 'ALL' },
    { label: 'RUNNING', value: 'RUNNING' },
    { label: 'WAITING', value: 'WAITING' },
    { label: 'PAUSED', value: 'PAUSED' },
    { label: 'RETRYING', value: 'RETRYING' },
    { label: 'COMPLETED', value: 'COMPLETED' },
    { label: 'FAILED', value: 'FAILED' },
    { label: 'CANCELLED', value: 'CANCELLED' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/control/runtime"
              className="text-xs font-mono text-indigo-400 hover:underline"
            >
              ← Runtime Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Durable Workflows</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Recoverable state machines executing mission tasks with optimistic version control.
          </p>
        </div>

        {/* State Filter */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {states.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedState(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                selectedState === s.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Workflows Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Workflow ID</th>
                <th className="py-3 px-4">Type & Aggregate</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Current Step</th>
                <th className="py-3 px-4">Retries</th>
                <th className="py-3 px-4">Created / Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {workflows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    {loading ? 'Loading workflows...' : 'No workflows found for the selected state.'}
                  </td>
                </tr>
              ) : (
                workflows.map((wf) => (
                  <tr key={wf.workflow_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <Link
                        href={`/control/runtime/workflows/${wf.workflow_id}`}
                        className="text-indigo-400 hover:underline"
                      >
                        {wf.workflow_id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{wf.workflow_type}</div>
                      <div className="text-[10px] text-slate-500">
                        {wf.aggregate_type}:{wf.aggregate_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          wf.state === 'RUNNING'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : wf.state === 'PAUSED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : wf.state === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {wf.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">v{wf.version}</td>
                    <td className="py-3.5 px-4 text-slate-300">{wf.current_step || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{wf.retry_count}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <div>{new Date(wf.created_at).toLocaleTimeString()}</div>
                      <div>{new Date(wf.updated_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {wf.state === 'RUNNING' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handlePause(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {wf.state === 'PAUSED' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handleResume(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      {wf.state !== 'COMPLETED' && wf.state !== 'CANCELLED' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handleCancel(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/control/runtime/workflows/${wf.workflow_id}`}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors inline-block"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
