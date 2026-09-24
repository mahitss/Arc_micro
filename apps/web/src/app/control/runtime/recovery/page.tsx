'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchRecoveryQueue,
  fetchRuntimeWorkflows,
  fetchRuntimeIncidents,
  reconcileIncident,
  retryWorkflowStep,
  ExecutionStep,
  DurableWorkflow,
  RuntimeIncident,
} from '../../../../lib/api/runtime';

interface RecoveryCard {
  id: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  whatHappened: string;
  why: string;
  currentState: string;
  safeToDo: string;
  notSafeToDo: string;
  actionableStepId?: string;
  actionableWorkflowId?: string;
  actionableIncidentId?: string;
}

export default function RecoveryCenterPage() {
  const [recoverySteps, setRecoverySteps] = useState<ExecutionStep[]>([]);
  const [incidents, setIncidents] = useState<RuntimeIncident[]>([]);
  const [workflows, setWorkflows] = useState<DurableWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 6000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const [recRes, incRes, wfRes] = await Promise.all([
        fetchRecoveryQueue(),
        fetchRuntimeIncidents(),
        fetchRuntimeWorkflows('RETRYING'),
      ]);
      setRecoverySteps(recRes.recovery_steps);
      setIncidents(incRes.incidents);
      setWorkflows(wfRes.workflows);
    } catch (err) {
      console.error('Failed to load recovery data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcile(incidentId: string) {
    if (!confirm(`Trigger external state reconciliation for incident ${incidentId}? This will query on-chain Arc RPC and durable facts.`)) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await reconcileIncident(incidentId);
      setMessage({ text: `Reconciliation result: ${res.message}`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Reconciliation failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSafeRetry(workflowId: string, stepId: string) {
    if (!confirm(`Are you sure you want to retry step ${stepId}? Preconditions and policy barriers will be re-verified.`)) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      await retryWorkflowStep(workflowId, stepId);
      setMessage({ text: `Step ${stepId} queued for bounded safe retry.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: `Retry failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  // Pre-configured recovery cards mapping to Section 26
  const recoveryScenarios: RecoveryCard[] = [
    {
      id: 'rec_ambiguous_payment',
      category: 'AMBIGUOUS_PAYMENTS',
      severity: 'CRITICAL',
      title: 'Ambiguous On-Chain Blockchain Settlement (INV-106)',
      whatHappened: 'Worker crash occurred during transaction broadcast before receipt was durably stored.',
      why: 'Transient RPC disconnect or node restart while gas transaction was submitted to Arc mempool.',
      currentState: 'Classified as AMBIGUOUS. Blind rebroadcast is permanently prohibited (INV-106 / INV-113).',
      safeToDo: 'Query Arc RPC by idempotency hash; reconstruct durable receipt from block logs; reconcile ledger balance.',
      notSafeToDo: 'DO NOT create a second payment intent. DO NOT sign or rebroadcast another transaction directly.',
      actionableIncidentId: 'inc_rt_02',
    },
    {
      id: 'rec_lease_expiry',
      category: 'EXPIRED_LEASES',
      severity: 'MEDIUM',
      title: 'Distributed Worker Lease Expiration & Fencing (INV-101)',
      whatHappened: 'A worker executing step_collect_quotes missed 3 consecutive heartbeat cycles.',
      why: 'Network partition or host maintenance paused worker node execution.',
      currentState: 'Step marked RECOVERY_REQUIRED. Monotonic fencing token advanced.',
      safeToDo: 'Permit healthy standby worker to acquire new fenced lease and resume from last SHA-256 checkpoint.',
      notSafeToDo: 'DO NOT permit stale worker to commit old results after lease has expired.',
      actionableWorkflowId: 'wf_msn_macro_01',
      actionableStepId: 'step_collect_quotes',
    },
    {
      id: 'rec_retry_exhaustion',
      category: 'RETRY_EXHAUSTION',
      severity: 'HIGH',
      title: 'External Provider Timeout Retry Budget Exhausted',
      whatHappened: 'Provider research-api failed to respond after 5 consecutive backoff attempts.',
      why: 'External endpoint returned 504 Gateway Timeout.',
      currentState: 'Step halted. Resource budget remaining: 2 retries, 180s deadline.',
      safeToDo: 'Trigger Economic Intelligence Replanner to select alternative vetted provider or escalate to human operator.',
      notSafeToDo: 'DO NOT loop retries indefinitely. DO NOT increase economic budget or weaken policy rules.',
      actionableWorkflowId: 'wf_msn_macro_01',
      actionableStepId: 'step_collect_quotes',
    },
    {
      id: 'rec_stale_approval',
      category: 'EXPIRED_APPROVALS',
      severity: 'HIGH',
      title: 'Human Financial Approval Window Expired (INV-114)',
      whatHappened: 'Human approval for transaction exceeding $20.00 USDC expired after 24h SLA.',
      why: 'No authorized signer approved within the configured time-to-live window.',
      currentState: 'Approval EXPIRED. Step permanently blocked from entering payment execution.',
      safeToDo: 'Request fresh approval with updated risk assessment, or cancel workflow safely.',
      notSafeToDo: 'DO NOT execute payment intent using stale or expired approval token.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/control/runtime" className="text-xs font-mono text-indigo-400 hover:underline">
              ← Runtime Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Runtime Recovery Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Durable crash recovery, ambiguous payment reconciliation, and strict safety boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {recoverySteps.length} Steps in Recovery Queue
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            {incidents.filter((i) => i.state === 'OPEN').length} Open Incidents
          </span>
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

      {/* Recovery Scenarios Guide (Section 26 Requirements) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
          Recovery Incidents & Actionable Decisions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recoveryScenarios.map((sc) => (
            <div
              key={sc.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {sc.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sc.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : sc.severity === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {sc.severity}
                </span>
              </div>

              <h3 className="font-bold text-white text-sm">{sc.title}</h3>

              <div className="space-y-2 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400 font-bold">WHAT HAPPENED:</span> {sc.whatHappened}
                </div>
                <div>
                  <span className="text-slate-400 font-bold">WHY:</span> {sc.why}
                </div>
                <div>
                  <span className="text-slate-400 font-bold">CURRENT STATE:</span>{' '}
                  <span className="text-indigo-300">{sc.currentState}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold">✓ WHAT IS SAFE TO DO:</span> {sc.safeToDo}
                </div>
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold">✗ WHAT IS NOT SAFE TO DO:</span> {sc.notSafeToDo}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                {sc.actionableIncidentId && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleReconcile(sc.actionableIncidentId!)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold transition-colors"
                  >
                    Force Safe Reconciliation
                  </button>
                )}
                {sc.actionableWorkflowId && sc.actionableStepId && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleSafeRetry(sc.actionableWorkflowId!, sc.actionableStepId!)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold transition-colors"
                  >
                    Safe Step Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
