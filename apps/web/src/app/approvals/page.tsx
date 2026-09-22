'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApprovals, approveApproval, rejectApproval } from '../../lib/api/missions';
import { ApprovalItem } from '../../lib/api/types';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApprovals({ useDemo: true });
      setApprovals(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);
    try {
      await approveApproval(id, 'human-admin', 'Approved via Mission Control');
      setActionMessage(`Approval ${id} granted. Payment intent submitted to execution gate.`);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);
    try {
      await rejectApproval(id, 'human-admin', 'Rejected via Mission Control');
      setActionMessage(`Approval ${id} rejected.`);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const formatUsdc = (baseUnits: string) => {
    const val = parseInt(baseUnits, 10);
    return `$${(val / 1000000).toFixed(2)}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Approval Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Human-in-the-Loop Gate
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Pending economic payment intents requiring human authorization before settlement.
            Approvals are strictly subordinated to deterministic Rust policy: a hard DENY cannot be approved.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>INV-E7: Subordinated to Hard DENY</span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-xs">
          ✓ {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs">
          {error}
        </div>
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Scanning pending approval queue...
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
            <span className="text-emerald-400 text-base block">✓ Queue Clear</span>
            <p>No transactions currently require human authorization.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((app) => {
              const isHardDenied = app.policy_evaluation === 'DENY';

              return (
                <div
                  key={app.id}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {app.status}
                      </span>
                      <span className="font-mono text-xs text-white font-bold">{app.id}</span>
                      {app.mission_id && (
                        <Link
                          href={`/missions/${app.mission_id}`}
                          className="text-xs font-mono text-teal-400 hover:text-teal-300"
                        >
                          Mission: {app.mission_id} →
                        </Link>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      Requested: {new Date(app.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">AGENT</span>
                      <span className="text-teal-300 font-bold">{app.agent_id}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">SERVICE</span>
                      <span className="text-white font-bold">{app.service_id}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">AMOUNT</span>
                      <span className="text-emerald-400 font-bold text-sm">{formatUsdc(app.amount)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">RISK LEVEL</span>
                      <span className="text-amber-400 font-bold">{app.risk_level}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                    <span className="text-slate-500 block text-[10px] mb-0.5">AUTHORIZATION REASON</span>
                    {app.reason}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {isHardDenied
                        ? 'Hard policy DENY active — approval button disabled by INV-E7'
                        : 'Action logs immutable signature into audit outbox'}
                    </span>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <button
                        onClick={() => handleReject(app.id)}
                        disabled={processingId === app.id}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 disabled:opacity-50"
                      >
                        REJECT INTENT
                      </button>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={processingId === app.id || isHardDenied}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold shadow-md shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {processingId === app.id ? 'Authorizing...' : 'APPROVE & EXECUTE →'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
