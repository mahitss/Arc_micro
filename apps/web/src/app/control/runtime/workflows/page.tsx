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
              className="text-xs font-mono text-[#D6A83A] hover:underline"
            >
              ← Runtime Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Durable Workflows</h1>
          <p className="text-xs text-[#85827B] mt-0.5">
            Recoverable state machines executing mission tasks with optimistic version control.
          </p>
        </div>

        {/* State Filter */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#141414] border border-[#222222]">
          {states.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedState(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                selectedState === s.value
                  ? 'bg-[#141414] text-[#F2F0EA] border border-[#222222]'
                  : 'text-[#85827B] hover:text-[#F2F0EA] hover:bg-[#181818]'
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
              ? 'bg-[#141414] border border-[#2FB36F]/30 text-[#2FB36F]'
              : 'bg-[#141414] border border-[#D85C5C]/30 text-[#D85C5C]'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-[#85827B] hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Workflows Table */}
      <div className="rounded-2xl bg-[#101010] border border-[#222222] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0B0B0B] text-[#85827B] uppercase tracking-wider border-b border-[#222222]">
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
            <tbody className="divide-y divide-[#222222] text-[#B0ADA5]">
              {workflows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#50504C]">
                    {loading ? 'Loading workflows...' : 'No workflows found for the selected state.'}
                  </td>
                </tr>
              ) : (
                workflows.map((wf) => (
                  <tr key={wf.workflow_id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <Link
                        href={`/control/runtime/workflows/${wf.workflow_id}`}
                        className="text-[#D6A83A] hover:underline"
                      >
                        {wf.workflow_id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{wf.workflow_type}</div>
                      <div className="text-[10px] text-[#50504C]">
                        {wf.aggregate_type}:{wf.aggregate_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          wf.state === 'RUNNING'
                            ? 'bg-[#141414] text-[#2FB36F] border border-[#222222]'
                            : wf.state === 'PAUSED'
                            ? 'bg-[#141414] text-[#D6A83A] border border-[#222222]'
                            : wf.state === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-[#141414] text-[#D85C5C] border border-[#222222]'
                        }`}
                      >
                        {wf.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#85827B]">v{wf.version}</td>
                    <td className="py-3.5 px-4 text-[#B0ADA5]">{wf.current_step || '—'}</td>
                    <td className="py-3.5 px-4 text-[#85827B]">{wf.retry_count}</td>
                    <td className="py-3.5 px-4 text-[#50504C] text-[11px]">
                      <div>{new Date(wf.created_at).toLocaleTimeString()}</div>
                      <div>{new Date(wf.updated_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {wf.state === 'RUNNING' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handlePause(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-[#141414] text-[#D6A83A] border border-[#222222] text-[10px] transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {wf.state === 'PAUSED' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handleResume(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#2FB36F] border border-[#222222] text-[10px] transition-colors"
                        >
                          Resume
                        </button>
                      )}
                      {wf.state !== 'COMPLETED' && wf.state !== 'CANCELLED' && (
                        <button
                          disabled={actionInProgress === wf.workflow_id}
                          onClick={() => handleCancel(wf.workflow_id)}
                          className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#D85C5C] border border-[#222222] text-[10px] transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <Link
                        href={`/control/runtime/workflows/${wf.workflow_id}`}
                        className="px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1C1C1C] text-[#B0ADA5] border border-[#222222] text-[10px] transition-colors inline-block"
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
