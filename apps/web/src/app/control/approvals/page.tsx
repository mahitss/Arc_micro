'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ApprovalItem {
  id: string;
  requester_agent: string;
  mission_id: string;
  amount: string;
  recipient: string;
  capability: string;
  policy_decision: string;
  risk_score: number;
  reason: string;
  eligible_for_approval: boolean;
  block_reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function ControlApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: 'app_req_01',
      requester_agent: 'agent_lead_analyst',
      mission_id: 'msn_global_macro',
      amount: '22000000', // 22 USDC (Threshold is 20 USDC)
      recipient: '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852',
      capability: 'financial-modeling',
      policy_decision: 'REQUIRE_APPROVAL',
      risk_score: 28,
      reason: 'Transaction exceeds 20.00 USDC automated threshold under Constitution v8',
      eligible_for_approval: true,
      status: 'PENDING',
    },
    {
      id: 'app_req_02',
      requester_agent: 'agent_crawler_09',
      mission_id: 'msn_global_macro',
      amount: '75000000', // 75 USDC (Ceiling is 50 USDC)
      recipient: '0xUnknownRecipient999',
      capability: 'web-research',
      policy_decision: 'DENY',
      risk_score: 84,
      reason: 'Hard DENY: Amount exceeds 50.00 USDC mission ceiling and recipient is unverified (INV-88)',
      eligible_for_approval: false,
      block_reason: 'APPROVAL WILL NOT OVERRIDE HARD DENY (INV-97)',
      status: 'PENDING',
    },
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  function handleApprove(id: string) {
    const item = approvals.find((a) => a.id === id);
    if (!item?.eligible_for_approval) {
      setNotification(`Action Blocked: ${item?.block_reason || 'Ineligible'}`);
      return;
    }
    setApprovals(approvals.map((a) => (a.id === id ? { ...a, status: 'APPROVED' } : a)));
    setNotification(`Approval granted for ${id}. Dispatched to canonical execution pipeline.`);
  }

  function handleReject(id: string) {
    setApprovals(approvals.map((a) => (a.id === id ? { ...a, status: 'REJECTED' } : a)));
    setNotification(`Request ${id} successfully rejected.`);
  }

  const formatMicroUSDC = (baseUnits: string) => {
    const num = Number(baseUnits) / 1000000;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* HEADER */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold">APPROVAL CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-mono font-bold">
            HUMAN OVERSIGHT GATEWAY
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono">
            FINANCIAL APPROVAL CENTER
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and resolve payment requests requiring human authorization under Constitution policy rules.
          </p>
        </div>

        {notification && (
          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300 flex justify-between items-center">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        <div className="space-y-4">
          {approvals.map((req) => (
            <div
              key={req.id}
              className={`p-5 rounded-xl border transition-all ${
                req.eligible_for_approval
                  ? 'bg-[#0e1626] border-slate-800'
                  : 'bg-rose-950/10 border-rose-900/40'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-base">{req.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.policy_decision === 'REQUIRE_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {req.policy_decision}
                    </span>
                    <span className="text-slate-400 text-xs">
                      Risk Score: <strong className={req.risk_score > 50 ? 'text-rose-400' : 'text-teal-300'}>{req.risk_score}/100</strong>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2">{req.reason}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                    <div>
                      Requester: <span className="text-slate-200 block">{req.requester_agent}</span>
                    </div>
                    <div>
                      Mission: <span className="text-slate-200 block">{req.mission_id}</span>
                    </div>
                    <div>
                      Amount: <span className="text-amber-400 font-bold block">{formatMicroUSDC(req.amount)}</span>
                    </div>
                    <div>
                      Recipient: <span className="text-cyan-300 truncate block">{req.recipient}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {req.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={!req.eligible_for_approval}
                        className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                          req.eligible_for_approval
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                        title={!req.eligible_for_approval ? req.block_reason : 'Approve payment request'}
                      >
                        APPROVE
                      </button>

                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
                      >
                        REJECT
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs font-bold">
                      RESOLVED: {req.status}
                    </span>
                  )}
                </div>
              </div>

              {!req.eligible_for_approval && (
                <div className="mt-3 p-2.5 bg-rose-900/20 border border-rose-800/40 rounded-lg text-[11px] font-mono text-rose-300">
                  <strong>SECURITY ENFORCEMENT (INV-97):</strong> {req.block_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
