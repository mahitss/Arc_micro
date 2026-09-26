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
      recipient: 'agent_modeler_01',
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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24">
      {/* HEADER */}
      <section className="bg-[#080808] border-b border-[#222222] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A] font-bold">APPROVAL CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D6A83A] border border-[#2D2D2D] text-xs font-mono font-bold">
            HUMAN OVERSIGHT GATEWAY
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F2F0EA] font-mono">
            FINANCIAL APPROVAL CENTER
          </h1>
          <p className="text-sm text-[#B0ADA5] mt-1">
            Review and resolve payment requests requiring human authorization under Constitution policy rules.
          </p>
        </div>

        {notification && (
          <div className="p-3 bg-[#141414] border border-[#D6A83A]/40 rounded-lg text-xs font-mono text-[#D6A83A] flex justify-between items-center">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-[#716F69] hover:text-[#F2F0EA]">
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
                  ? 'bg-[#101010] border-[#222222]'
                  : 'bg-[#101010] border-[#D85C5C]/40'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#F2F0EA] font-bold text-base">{req.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.policy_decision === 'REQUIRE_APPROVAL'
                          ? 'bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/20'
                          : 'bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/20'
                      }`}
                    >
                      {req.policy_decision}
                    </span>
                    <span className="text-[#716F69] text-xs">
                      Risk Score: <strong className={req.risk_score > 50 ? 'text-[#D85C5C]' : 'text-[#2FB36F]'}>{req.risk_score}/100</strong>
                    </span>
                  </div>

                  <p className="text-xs text-[#B0ADA5] mt-2">{req.reason}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs text-[#716F69] pt-3 border-t border-[#222222]">
                    <div>
                      Requester: <span className="text-[#F2F0EA] block">{req.requester_agent}</span>
                    </div>
                    <div>
                      Mission: <span className="text-[#F2F0EA] block">{req.mission_id}</span>
                    </div>
                    <div>
                      Amount: <span className="text-[#F2F0EA] font-bold block">{formatMicroUSDC(req.amount)}</span>
                    </div>
                    <div>
                      Recipient: <span className="text-[#F2F0EA] truncate block">{req.recipient}</span>
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
                            ? 'bg-[#F2F0EA] text-[#080808] hover:bg-white'
                            : 'bg-[#151515] text-[#50504C] cursor-not-allowed border border-[#222222]'
                        }`}
                        title={!req.eligible_for_approval ? req.block_reason : 'Approve payment request'}
                      >
                        APPROVE
                      </button>

                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#151515] text-[#D85C5C] border border-[#D85C5C]/30 hover:bg-[#1C1C1C] transition-colors"
                      >
                        REJECT
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] text-xs font-bold">
                      RESOLVED: {req.status}
                    </span>
                  )}
                </div>
              </div>

              {!req.eligible_for_approval && (
                <div className="mt-3 p-2.5 bg-[#0B0B0B] border border-[#D85C5C]/40 rounded-lg text-[11px] font-mono text-[#D85C5C]">
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
