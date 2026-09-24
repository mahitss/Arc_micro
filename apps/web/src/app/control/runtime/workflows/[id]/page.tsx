'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchRuntimeWorkflow,
  fetchWorkflowSteps,
  fetchWorkflowCheckpoints,
  retryWorkflowStep,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  DurableWorkflow,
  ExecutionStep,
  RuntimeCheckpoint,
} from '../../../../../lib/api/runtime';

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = String(params?.id || '');

  const [workflow, setWorkflow] = useState<DurableWorkflow | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [checkpoints, setCheckpoints] = useState<RuntimeCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (workflowId) {
      loadData();
    }
  }, [workflowId]);

  async function loadData() {
    setLoading(true);
    try {
      const [wf, sRes, cpRes] = await Promise.all([
        fetchRuntimeWorkflow(workflowId),
        fetchWorkflowSteps(workflowId),
        fetchWorkflowCheckpoints(workflowId),
      ]);
      setWorkflow(wf);
      setSteps(sRes.steps);
      setCheckpoints(cpRes.checkpoints);
    } catch (err) {
      console.error('Failed to load workflow detail', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryStep(stepId: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      await retryWorkflowStep(workflowId, stepId);
      setMessage({ text: `Step ${stepId} queued for retry with bounded exponential backoff.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Retry failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      await pauseWorkflow(workflowId, 'Paused from detail view');
      setMessage({ text: 'Workflow paused.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Pause failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      await resumeWorkflow(workflowId);
      setMessage({ text: 'Workflow resumed after re-evaluating preconditions.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Resume failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this workflow?')) return;
    setActionLoading(true);
    try {
      await cancelWorkflow(workflowId, 'Cancelled from detail view');
      setMessage({ text: 'Workflow cancelled.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Cancel failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !workflow) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 font-mono text-sm">
        Loading workflow execution state...
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-mono text-sm">
        Workflow {workflowId} not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Navigation Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link href="/control/runtime/workflows" className="text-xs font-mono text-indigo-400 hover:underline">
            ← Workflows
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-mono text-slate-400">{workflow.workflow_id}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-white font-mono">{workflow.workflow_id}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  workflow.state === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : workflow.state === 'PAUSED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : workflow.state === 'COMPLETED'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {workflow.state}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                v{workflow.version}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Type: <span className="text-slate-200">{workflow.workflow_type}</span> | Tenant:{' '}
              <span className="text-slate-200">{workflow.tenant_id}</span> | Idempotency:{' '}
              <span className="text-slate-300">{workflow.idempotency_key}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {workflow.state === 'RUNNING' && (
              <button
                disabled={actionLoading}
                onClick={handlePause}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-semibold transition-colors"
              >
                Pause Workflow
              </button>
            )}
            {workflow.state === 'PAUSED' && (
              <button
                disabled={actionLoading}
                onClick={handleResume}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-colors"
              >
                Resume Workflow
              </button>
            )}
            {workflow.state !== 'COMPLETED' && workflow.state !== 'CANCELLED' && (
              <button
                disabled={actionLoading}
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold transition-colors"
              >
                Cancel Workflow
              </button>
            )}
          </div>
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

      {/* Workflow Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Current Step</div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {workflow.current_step || 'NONE'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">Sequence Position</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Retry Count</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">{workflow.retry_count} / 5 max</div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">Deterministic Backoff</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Checkpoints Captured</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{checkpoints.length}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">SHA-256 State Verified</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Deadline Remaining</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
            {workflow.deadline ? new Date(workflow.deadline).toLocaleTimeString() : 'UNBOUNDED'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">Auto Expire Gated</div>
        </div>
      </div>

      {/* Execution Steps */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-mono">DURABLE EXECUTION STEPS ({steps.length})</h2>
          <span className="text-xs font-mono text-slate-400">Deterministic Recovery Barrier Active</span>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.step_id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">Seq {step.sequence}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      step.state === 'SUCCEEDED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : step.state === 'RUNNING'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : step.state === 'RETRYABLE_FAILURE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {step.state}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">{step.step_id}</span>
                  <span className="text-xs font-mono text-slate-400">({step.step_type})</span>
                </div>

                <div className="text-xs font-mono text-slate-400 flex flex-wrap gap-4 pt-1">
                  <span>Attempt: <span className="text-slate-200">{step.attempt}</span></span>
                  <span>Timeout: <span className="text-slate-200">{step.timeout_seconds}s</span></span>
                  {step.lease_owner && (
                    <span>Lease: <span className="text-amber-300">{step.lease_owner}</span></span>
                  )}
                  {step.error_code && (
                    <span className="text-rose-400">Error: {step.error_code} - {step.error_message}</span>
                  )}
                </div>
              </div>

              <div>
                {(step.state === 'RETRYABLE_FAILURE' || step.state === 'RUNNING') && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRetryStep(step.step_id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-semibold transition-colors"
                  >
                    Retry Step
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkpoints Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white font-mono">CRASH RECOVERY CHECKPOINTS ({checkpoints.length})</h2>
        <div className="space-y-3">
          {checkpoints.map((cp) => (
            <div key={cp.checkpoint_id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{cp.checkpoint_id}</span>
                <span className="text-slate-400">{new Date(cp.created_at).toLocaleString()}</span>
              </div>
              <div className="text-slate-400 mt-1">
                State Hash: <span className="text-indigo-400">{cp.state_hash}</span> | Event Pos: {cp.event_position}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
