'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '../../../components/StatusBadge';
import { AddressDisplay } from '../../../components/AddressDisplay';
import { CopyButton } from '../../../components/CopyButton';
import { ConfirmationDialog } from '../../../components/ConfirmationDialog';
import { ErrorState } from '../../../components/ErrorState';
import { fetchIntent, confirmIntent } from '../../../lib/api/intents';
import { PaymentIntentDetail } from '../../../lib/api/types';
import { DEMO_INTENTS } from '../../../lib/api/demo_fixtures';

export default function PaymentIntentDetailPage() {
  const params = useParams();
  const intentId = (params?.intentId as string) || '';

  const [intentDetail, setIntentDetail] = useState<PaymentIntentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadIntent = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);

    if (useDemo) {
      const match = DEMO_INTENTS.find((i) => i.intent_id === intentId) || DEMO_INTENTS[0];
      setIntentDetail({
        intent: match,
        authorization_status: match.status === 'AUTHORIZED' ? 'AUTHORIZED' : match.status === 'DENIED' ? 'DENIED' : 'PENDING',
        execution_status: match.status === 'CONFIRMED' ? 'CONFIRMED' : 'NONE',
        transaction_hash: match.status === 'CONFIRMED' ? '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b' : undefined,
        timestamps: {
          created_at: match.created_at,
          expires_at: match.expires_at,
          updated_at: match.updated_at,
          confirmed_at: match.status === 'CONFIRMED' ? match.updated_at : undefined,
        },
      });
      setLoading(false);
      return;
    }

    try {
      const data = await fetchIntent(intentId);
      setIntentDetail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load payment intent details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (intentId) {
      loadIntent(isDemoMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentId, isDemoMode]);

  const handleExecuteConfirmation = async () => {
    if (!intentDetail) return;
    setIsConfirming(true);
    setActionMessage(null);

    if (isDemoMode) {
      setTimeout(() => {
        setIntentDetail({
          ...intentDetail,
          intent: {
            ...intentDetail.intent,
            status: 'CONFIRMED',
          },
          execution_status: 'CONFIRMED',
          transaction_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        });
        setIsConfirming(false);
        setIsDialogOpen(false);
        setActionMessage('Payment confirmed and settled on Arc test environment.');
      }, 1000);
      return;
    }

    try {
      const updated = await confirmIntent(intentDetail.intent.intent_id);
      setIntentDetail(updated);
      setIsDialogOpen(false);
      setActionMessage('Payment confirmed and executed successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm payment';
      setActionMessage(`Execution error: ${msg}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleApprovalAction = async (approve: boolean) => {
    if (!intentDetail) return;
    setIsConfirming(true);
    setActionMessage(null);

    if (isDemoMode) {
      setTimeout(() => {
        setIntentDetail({
          ...intentDetail,
          intent: {
            ...intentDetail.intent,
            status: approve ? 'APPROVED' : 'REJECTED',
          },
        });
        setIsConfirming(false);
        setActionMessage(approve ? 'Payment intent approved in demo mode.' : 'Payment intent rejected in demo mode.');
      }, 600);
      return;
    }

    try {
      const org = intentDetail.intent.organization_id || 'org_default';
      const resp = await fetch(`/v1/approvals?organization_id=${encodeURIComponent(org)}`);
      const data = await resp.json();
      const match = data.approvals?.find((a: any) => a.payment_intent_id === intentDetail.intent.intent_id);
      if (!match) {
        throw new Error('No pending approval record found for this intent');
      }
      const endpoint = approve ? `/v1/approvals/${match.id}/approve` : `/v1/approvals/${match.id}/reject`;
      const actionResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver_id: 'usr_compliance_manager', reason: approve ? 'Approved via Web Control Center' : 'Rejected via Web Control Center' }),
      });
      if (!actionResp.ok) {
        const errJson = await actionResp.json();
        throw new Error(errJson.error?.message || 'Approval action failed');
      }
      setActionMessage(approve ? 'Payment intent approved successfully.' : 'Payment intent rejected.');
      await loadIntent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval action failed';
      setActionMessage(`Error: ${msg}`);
    } finally {
      setIsConfirming(false);
    }
  };

  if (loading) {
    return <div className="h-96 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />;
  }

  if (error && !isDemoMode) {
    return (
      <ErrorState
        title="Intent Unavailable"
        message={error}
        onRetry={() => loadIntent(false)}
        isRetrying={loading}
      />
    );
  }

  if (!intentDetail) return null;

  const { intent, timestamps, transaction_hash } = intentDetail;
  const amountNum = Number(intent.amount) / 1_000_000;
  const amountFormatted = isNaN(amountNum) ? intent.amount : `$${amountNum.toFixed(2)}`;

  const isExpired = intent.status === 'EXPIRED';
  const isAuthorized = intent.status === 'AUTHORIZED' || intent.status === 'APPROVED';
  const isApprovalRequired = intent.status === 'APPROVAL_REQUIRED';
  const isApproved = intent.status === 'APPROVED';
  const isDenied = intent.status === 'DENIED';
  const isRejected = intent.status === 'REJECTED';

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            href="/payment-intents"
            className="text-xs font-mono text-slate-400 hover:text-teal-400 transition-colors"
          >
            ← Payment Intents
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-xl font-bold text-white font-mono">{intent.intent_id}</h1>
        </div>

        <button
          type="button"
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
          }`}
        >
          {isDemoMode ? '● DEMO MODE' : '○ Demo Mode'}
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-mono">
          {actionMessage}
        </div>
      )}

      {/* Main Intent Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Intent ID:</span>
              <span className="text-sm font-mono font-bold text-white">{intent.intent_id}</span>
              <CopyButton textToCopy={intent.intent_id} label="Intent ID" />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Purpose: <span className="text-slate-200 font-mono">{intent.purpose}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={intent.status} size="md" />
            {isAuthorized && (
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs shadow-md shadow-teal-500/20 transition-all"
              >
                Confirm Payment →
              </button>
            )}
          </div>
        </div>

        {/* Human Approval Required Box */}
        {isApprovalRequired && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Human Approval Required
              </div>
              <div className="text-slate-300 mt-1">
                This payment exceeded automatic threshold or risk limits and requires human review. Hard policy limits will still be enforced.
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleApprovalAction(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Approve Intent
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleApprovalAction(false)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold text-xs transition-colors"
              >
                Reject Intent
              </button>
            </div>
          </div>
        )}

        {/* Approval Granted Box */}
        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-emerald-300">
                Human Approval Granted — Ready for Execution
              </div>
              <div className="text-slate-400 mt-0.5">
                Authorized by compliance approver. Click confirm to broadcast payment transaction to Arc.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-semibold text-xs whitespace-nowrap self-start sm:self-auto"
            >
              Confirm Payment
            </button>
          </div>
        )}

        {/* Approval Prompt Box if Authorized */}
        {!isApproved && isAuthorized && (
          <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-teal-300">
                Authorization successful — payment requires confirmation.
              </div>
              <div className="text-slate-400 mt-0.5">
                The Rust Policy Engine approved this payment. Click confirm to broadcast the execution transaction.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-semibold text-xs whitespace-nowrap self-start sm:self-auto"
            >
              Confirm Payment
            </button>
          </div>
        )}

        {/* Rejected Box if Rejected */}
        {isRejected && (
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
            <div className="font-semibold text-rose-300">Payment Intent Rejected</div>
            <div className="text-slate-400 mt-0.5">
              A human approver rejected this payment request. It cannot be executed.
            </div>
          </div>
        )}

        {/* Denied Box if Denied */}
        {isDenied && (
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
            <div className="font-semibold text-rose-300">Policy Authorization Denied</div>
            <div className="text-slate-400 mt-0.5">
              Reason: The requested payment violates configured agent spending policies (e.g. daily limit or unauthorized recipient). Execution is strictly blocked.
            </div>
          </div>
        )}

        {/* Expired Box if Expired */}
        {isExpired && (
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs">
            <div className="font-semibold text-slate-300">Payment Intent Expired</div>
            <div className="text-slate-400 mt-0.5">
              The time-to-live (TTL) window for this payment intent has elapsed. Expired intents cannot be authorized or executed.
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono">
          <div>
            <div className="text-slate-500">Agent</div>
            <div className="text-white font-semibold mt-1">
              <Link href={`/agents/${encodeURIComponent(intent.agent_id)}`} className="hover:text-teal-400 hover:underline">
                {intent.agent_id}
              </Link>
            </div>
          </div>

          <div>
            <div className="text-slate-500">Service</div>
            <div className="text-teal-400 font-semibold mt-1">{intent.service}</div>
          </div>

          <div>
            <div className="text-slate-500">Amount</div>
            <div className="text-white font-bold mt-1 text-sm">
              {amountFormatted} <span className="text-xs text-teal-400 font-normal">USDC</span>
            </div>
          </div>

          <div>
            <div className="text-slate-500">Recipient</div>
            <div className="mt-1">
              <AddressDisplay address={intent.recipient} truncate={true} copyable={true} />
            </div>
          </div>
        </div>

        {/* Justification Text */}
        {intent.justification && (
          <div className="text-xs">
            <div className="text-slate-500 font-mono mb-1">AI Agent Justification:</div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/60 text-slate-300 italic">
              &ldquo;{intent.justification}&rdquo;
            </div>
          </div>
        )}

        {/* Blockchain Transaction Hash */}
        {transaction_hash && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-slate-500">On-Chain Transaction Hash:</div>
              <div className="text-slate-200 font-semibold mt-1 flex items-center gap-1.5">
                <span>{transaction_hash}</span>
                <CopyButton textToCopy={transaction_hash} label="Tx Hash" />
              </div>
            </div>
            <Link
              href={`/transactions/${encodeURIComponent(transaction_hash)}`}
              className="text-teal-400 hover:underline"
            >
              View Tx Details →
            </Link>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-mono text-slate-400">
          <div>
            <span className="text-slate-500 block">Created:</span>
            {new Date(timestamps.created_at).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500 block">Expires:</span>
            {new Date(timestamps.expires_at).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500 block">Updated:</span>
            {new Date(timestamps.updated_at).toLocaleString()}
          </div>
          <div>
            <span className="text-slate-500 block">Confirmed:</span>
            {timestamps.confirmed_at ? new Date(timestamps.confirmed_at).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleExecuteConfirmation}
        isConfirming={isConfirming}
        intent={{
          intent_id: intent.intent_id,
          agent_id: intent.agent_id,
          service: intent.service,
          recipient: intent.recipient,
          amount: intent.amount,
          asset: intent.asset,
        }}
      />
    </div>
  );
}
