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
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Approval Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#141414] text-[#D6A83A] border border-[#222222]">
              Human-in-the-Loop Gate
            </span>
          </div>
          <p className="text-sm text-[#B0ADA5] mt-1.5 max-w-2xl">
            Pending economic payment intents requiring human authorization before settlement.
            Approvals are strictly subordinated to deterministic Rust policy: a hard DENY cannot be approved.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#716F69] bg-[#101010] px-3 py-2 rounded-lg border border-[#222222]">
          <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
          <span>INV-E7: Subordinated to Hard DENY</span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#2FB36F]/30 text-[#2FB36F] font-mono text-xs">
          ✓ {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#D85C5C]/30 text-[#D85C5C] font-mono text-xs">
          {error}
        </div>
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-[#716F69] font-mono text-xs">
            Scanning pending approval queue...
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#101010] border border-[#222222] text-[#716F69] font-mono text-xs space-y-2">
            <span className="text-[#2FB36F] text-base block">✓ Queue Clear</span>
            <p>No transactions currently require human authorization.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((app) => {
              const isHardDenied = app.policy_evaluation === 'DENY';

              return (
                <div
                  key={app.id}
                  className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#222222]">
                        {app.status}
                      </span>
                      <span className="font-mono text-xs text-[#F2F0EA] font-bold">{app.id}</span>
                      {app.mission_id && (
                        <Link
                          href={`/missions/${app.mission_id}`}
                          className="text-xs font-mono text-[#D6A83A] hover:underline"
                        >
                          Mission: {app.mission_id} →
                        </Link>
                      )}
                    </div>
                    <span className="text-xs font-mono text-[#716F69]">
                      Requested: {new Date(app.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                      <span className="text-[#716F69] block text-[10px]">AGENT</span>
                      <span className="text-[#F2F0EA] font-bold">{app.agent_id}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                      <span className="text-[#716F69] block text-[10px]">SERVICE</span>
                      <span className="text-[#F2F0EA] font-bold">{app.service_id}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                      <span className="text-[#716F69] block text-[10px]">AMOUNT</span>
                      <span className="text-[#F2F0EA] font-bold text-sm">{formatUsdc(app.amount)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222]">
                      <span className="text-[#716F69] block text-[10px]">RISK LEVEL</span>
                      <span className="text-[#D6A83A] font-bold">{app.risk_level}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222] font-mono text-xs text-[#B0ADA5]">
                    <span className="text-[#716F69] block text-[10px] mb-0.5">AUTHORIZATION REASON</span>
                    {app.reason}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-mono text-[#716F69]">
                      {isHardDenied
                        ? 'Hard policy DENY active — approval button disabled by INV-E7'
                        : 'Action logs immutable signature into audit outbox'}
                    </span>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <button
                        onClick={() => handleReject(app.id)}
                        disabled={processingId === app.id}
                        className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#181818] text-[#D85C5C] border border-[#D85C5C]/40 disabled:opacity-50"
                      >
                        REJECT INTENT
                      </button>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={processingId === app.id || isHardDenied}
                        className="px-5 py-2 rounded-xl bg-[#F2F0EA] hover:bg-[#E2DFD7] text-[#080808] font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
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
