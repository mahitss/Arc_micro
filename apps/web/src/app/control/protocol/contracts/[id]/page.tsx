'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchProtocolContract,
  submitProtocolResult,
  requestProtocolPayment,
  ProtocolContract,
  FALLBACK_CONTRACTS,
} from '../../../../../lib/api/protocol';

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = (params?.id as string) || 'contract_live_01';
  const [contract, setContract] = useState<ProtocolContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Submit Result modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState('m2_final_audit');
  const [deliverablePayload, setDeliverablePayload] = useState('{"report_findings": "0 critical vulnerabilities found. 2 low severity findings remediated.", "audit_score": 98}');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchProtocolContract(contractId);
        setContract(data);
      } catch (err) {
        console.error('Error fetching contract:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contractId]);

  const currentContract = contract || FALLBACK_CONTRACTS[0];

  async function handleSubmitDeliverable(e: React.FormEvent) {
    e.preventDefault();
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(deliverablePayload);
      } catch {
        parsed = { raw: deliverablePayload };
      }
      const res = await submitProtocolResult({
        contract_id: currentContract.contract_id,
        milestone_id: activeMilestoneId,
        worker_agent_id: currentContract.provider_id,
        deliverable_hash: 'sha256_mock_deliverable_' + Date.now(),
        deliverable_payload: parsed,
      });
      setShowSubmitModal(false);
      setFeedback(`Deliverable verification result: ${res.decision} (Eligible for payment: ${res.eligible_for_payment})`);
    } catch (err: any) {
      setFeedback(`Deliverable error: ${err.message}`);
    }
  }

  async function handleRequestPayment(milestoneId: string, amount: string) {
    try {
      const res = await requestProtocolPayment({
        contract_id: currentContract.contract_id,
        milestone_id: milestoneId,
        recipient_service_id: currentContract.provider_id,
        amount,
        currency: 'USDC',
        quality_verification_hash: 'sha256_verified_' + milestoneId,
      });
      setFeedback(`Payment decision: ${res.decision} (Intent ID: ${res.payment_intent_id || 'intent_clearinghouse'})`);
    } catch (err: any) {
      setFeedback(`Payment request error: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Top Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/control/protocol"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            ← Back to Protocol Overview
          </Link>
          <span className="text-xs font-mono text-slate-500">/</span>
          <span className="text-xs font-mono text-indigo-400">{currentContract.contract_id}</span>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/50">
          State: {currentContract.state}
        </span>
      </div>

      {feedback && (
        <div className="mb-6 p-3 rounded-lg bg-indigo-900/40 border border-indigo-500/50 text-xs text-indigo-200 flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Contract Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Autonomous Protocol Agreement
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {currentContract.contract_id}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-2">
              <span>Capability: <strong className="text-indigo-300">{currentContract.capability}</strong></span>
              <span>•</span>
              <span>Requester: <strong className="text-white">{currentContract.requester_id}</strong></span>
              <span>•</span>
              <span>Provider: <strong className="text-white">{currentContract.provider_id}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Total Value</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                ${currentContract.total_amount} {currentContract.currency}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Escrow Status</div>
              <div className="text-xs font-mono text-indigo-300 mt-1">
                {currentContract.escrow_id || 'HELD IN CLEARINGHOUSE'}
              </div>
              <div className="text-[10px] text-slate-500">Locked pending seals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones & Deliverable Quality Gates */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-bold text-white">Contract Deliverables & Milestones</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Result submission does not directly trigger payment (INV-173). Verification gate must pass first.
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition"
          >
            + Submit Milestone Deliverable
          </button>
        </div>

        <div className="space-y-4">
          {(currentContract.milestones || []).map((m, idx) => (
            <div
              key={m.milestone_id}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                  <h3 className="font-semibold text-white text-sm">{m.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      m.status === 'PAID'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                        : m.status === 'SUBMITTED'
                        ? 'bg-indigo-950 text-indigo-400 border-indigo-800/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">{m.deliverable_spec}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Due: {m.due_at} | Method: {m.verification_method}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">${m.amount} USDC</div>
                  <div className="text-[10px] text-slate-500 font-mono">Clearinghouse Netted</div>
                </div>

                {m.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleRequestPayment(m.milestone_id, m.amount)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
                  >
                    Disburse Payment →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Invariant Proofs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
          Authoritative Security Ledger & Invariant Guardrails
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-500 text-[10px]">POLICY SNAPSHOT HASH (INV-165)</div>
            <div className="text-indigo-400 mt-1 break-all">{currentContract.policy_snapshot_hash}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-500 text-[10px]">RECIPIENT RESOLUTION (INV-163)</div>
            <div className="text-emerald-400 mt-1">BOUND VIA AGENTPAY DIRECTORY</div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-500 text-[10px]">DISPUTE PROTOCOL (INV-178)</div>
            <div className="text-slate-300 mt-1">ARBITRATOR: CLEARINGHOUSE</div>
          </div>
        </div>
      </div>

      {/* Submit Result Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Submit Milestone Deliverable</h3>
            <p className="text-xs text-slate-400 mb-4">
              Submit work deliverable for quality gate verification. Untrusted deliverable requires independent seal matching.
            </p>
            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Milestone</label>
                <select
                  value={activeMilestoneId}
                  onChange={(e) => setActiveMilestoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                >
                  {(currentContract.milestones || []).map((m) => (
                    <option key={m.milestone_id} value={m.milestone_id}>
                      {m.title} (${m.amount} USDC)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Deliverable JSON Payload</label>
                <textarea
                  rows={4}
                  value={deliverablePayload}
                  onChange={(e) => setDeliverablePayload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Verify & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
