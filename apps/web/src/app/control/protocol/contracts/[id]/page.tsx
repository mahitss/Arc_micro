'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchProtocolContract,
  submitProtocolResult,
  requestProtocolPayment,
  ProtocolContract,
} from '../../../../../lib/api/protocol';

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = (params?.id as string) || '';
  const [contract, setContract] = useState<ProtocolContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Submit Result modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState('m2_final_audit');
  const [deliverablePayload, setDeliverablePayload] = useState(
    '{"report_findings": "0 critical vulnerabilities found. 2 low severity findings remediated.", "audit_score": 98}'
  );

  useEffect(() => {
    async function load() {
      if (!contractId) {
        setLoading(false);
        setError('No contract ID specified');
        return;
      }
      setLoading(true);
      try {
        const data = await fetchProtocolContract(contractId);
        if (!data) {
          setError(`Contract not found: ${contractId}`);
        } else {
          setContract(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error fetching contract:', err);
        setError(err?.message || `Failed to load contract ${contractId}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contractId]);

  async function handleSubmitDeliverable(e: React.FormEvent) {
    e.preventDefault();
    if (!contract) return;
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(deliverablePayload);
      } catch {
        parsed = { raw: deliverablePayload };
      }
      const res = await submitProtocolResult({
        contract_id: contract.contract_id,
        milestone_id: activeMilestoneId,
        worker_agent_id: contract.provider_id,
        deliverable_hash: 'sha256_mock_deliverable_' + Date.now(),
        deliverable_payload: parsed,
      });
      setShowSubmitModal(false);
      setFeedback(`Deliverable verified (INV-173): ${res.decision} — Quality seal validated in simulation. Ready for simulated clearing.`);
    } catch (err: any) {
      setShowSubmitModal(false);
      setFeedback(`Deliverable submission error: ${err.message}`);
    }
  }

  async function handleRequestPayment(milestoneId: string, amount: string) {
    if (!contract) return;
    try {
      const res = await requestProtocolPayment({
        contract_id: contract.contract_id,
        milestone_id: milestoneId,
        recipient_service_id: contract.provider_id,
        amount,
        currency: 'USDC',
        quality_verification_hash: 'sha256_verified_' + milestoneId,
      });
      setFeedback(`Simulated Payment Decision: ${res.decision} (Intent ID: ${res.payment_intent_id || 'pi_proto_sim_01'}). Broadcast BLOCKED: AgentVault is NOT deployed.`);
    } catch (err: any) {
      setFeedback(`Payment request error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#716F69] p-8 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3 text-[#D6A83A]">
          <span className="h-3 w-3 rounded-full bg-[#D6A83A] animate-ping" />
          Loading contract...
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-8 flex flex-col items-center justify-center font-mono">
        <div className="p-6 rounded-xl border border-[#D85C5C]/40 bg-[#141414] max-w-md w-full text-center">
          <div className="text-sm font-bold text-[#D85C5C] mb-2">Contract Not Found</div>
          <p className="text-xs text-[#716F69] mb-4">{error || `No contract found matching ID "${contractId}"`}</p>
          <Link
            href="/control/protocol"
            className="inline-block px-4 py-2 rounded-lg text-xs font-bold bg-[#D6A83A] hover:bg-[#c49731] text-[#080808] transition"
          >
            ← Back to Protocol Overview
          </Link>
        </div>
      </div>
    );
  }

  const currentContract = contract;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Top Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/control/protocol"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
          >
            ← Back to Protocol Overview
          </Link>
          <span className="text-xs font-mono text-[#50504C]">/</span>
          <span className="text-xs font-mono text-[#D6A83A]">{currentContract.contract_id}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
            SIMULATED CONTRACT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30 font-mono">
            State: {currentContract.state} (SIMULATED)
          </span>
          <span className="px-2 py-1 rounded text-xs font-mono text-[#716F69] border border-[#222222]">
            NO FUNDS MOVED
          </span>
        </div>
      </div>

      {feedback && (
        <div className="mb-6 p-3 rounded-lg bg-[#141414] border border-[#2FB36F]/40 text-xs text-[#2FB36F] flex justify-between items-center font-mono">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#716F69] hover:text-[#F2F0EA]">✕</button>
        </div>
      )}

      {/* Contract Header Card */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#716F69]">
                Autonomous Protocol Agreement
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                SIMULATION FIXTURE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F0EA] mt-1">
              {currentContract.contract_id}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#716F69] mt-2">
              <span>Capability: <strong className="text-[#D6A83A]">{currentContract.capability}</strong></span>
              <span>•</span>
              <span>Requester: <strong className="text-[#F2F0EA]">{currentContract.requester_id}</strong></span>
              <span>•</span>
              <span>Provider: <strong className="text-[#F2F0EA]">{currentContract.provider_id}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-[#0B0B0B] border border-[#222222] rounded-xl p-4">
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Projected Value</div>
              <div className="text-2xl font-extrabold text-[#2FB36F] mt-0.5">
                ${currentContract.total_amount} {currentContract.currency}
              </div>
              <div className="text-[9px] text-[#D6A83A] font-mono">NO FUNDS MOVED</div>
            </div>
            <div className="border-l border-[#222222] pl-6">
              <div className="text-[10px] uppercase font-semibold text-[#716F69]">Escrow State</div>
              <div className="text-xs font-mono text-[#D6A83A] mt-1 font-bold">
                SIMULATED RESERVATION
              </div>
              <div className="text-[10px] text-[#716F69] font-mono">Locked pending deliverable seals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bounded Contract Constraints (Section 21) */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-5 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA] mb-3">
          Bounded Contract Terms & Authority Guardrails
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">BUDGET CEILING</div>
            <div className="text-[#F2F0EA] font-bold mt-1">${currentContract.total_amount} USDC (MAX)</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">INV-165 Enforced</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">RECIPIENT BINDING</div>
            <div className="text-[#2FB36F] font-bold mt-1">LOCKED TO PROVIDER</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">INV-163 Enforced</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">POLICY VERSION</div>
            <div className="text-[#D6A83A] font-bold mt-1">HASH VERIFIED</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">Canonical Snapshot</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222]">
            <div className="text-[#716F69] text-[10px]">ON-CHAIN EXECUTION</div>
            <div className="text-[#D85C5C] font-bold mt-1">DISABLED</div>
            <div className="text-[10px] text-[#50504C] mt-0.5">AgentVault Not Deployed</div>
          </div>
        </div>
      </div>

      {/* Milestones & Deliverable Quality Gates */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-bold text-[#F2F0EA]">Contract Deliverables & Milestones</h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Result submission does not directly trigger payment (INV-173). Verification gate must pass first.
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F2F0EA] hover:bg-white text-[#080808] transition shadow-sm"
          >
            Submit Milestone Result
          </button>
        </div>

        <div className="space-y-4">
          {(currentContract.milestones || []).map((m) => (
            <div key={m.milestone_id} className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#F2F0EA]">{m.title}</span>
                  <span className="text-[10px] font-mono text-[#716F69]">({m.milestone_id})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    m.status === 'PAID'
                      ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30'
                      : m.status === 'SUBMITTED'
                      ? 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30'
                      : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                  }`}>
                    {m.status} (SIMULATED)
                  </span>
                </div>
                <div className="text-xs text-[#716F69] mt-1 font-mono">
                  Spec: {m.deliverable_spec} · Verification: {m.verification_method}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-sm text-[#2FB36F]">${m.amount} USDC</div>
                  <div className="text-[10px] text-[#716F69] font-mono">No Live Broadcast</div>
                </div>
                {m.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleRequestPayment(m.milestone_id, m.amount)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#2FB36F] border border-[#2FB36F]/30 transition font-mono"
                  >
                    Simulate Payment
                  </button>
                )}
              </div>
            </div>
          ))}
          {(!currentContract.milestones || currentContract.milestones.length === 0) && (
            <div className="py-8 text-center text-xs font-mono text-[#716F69]">
              No milestones specified for this contract.
            </div>
          )}
        </div>
      </div>

      {/* Deliverable Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#F2F0EA] mb-1">Submit Deliverable for Quality Gate</h3>
            <p className="text-xs text-[#716F69] mb-4">
              Cryptographically seal deliverables before requesting clearinghouse disbursement (INV-173).
            </p>
            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Milestone</label>
                <select
                  value={activeMilestoneId}
                  onChange={(e) => setActiveMilestoneId(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                >
                  {(currentContract.milestones || []).map((m) => (
                    <option key={m.milestone_id} value={m.milestone_id}>
                      {m.title} (${m.amount} USDC)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#716F69] mb-1">Deliverable JSON Payload</label>
                <textarea
                  rows={4}
                  value={deliverablePayload}
                  onChange={(e) => setDeliverablePayload(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#222222] rounded-lg p-3 text-xs text-[#F2F0EA] font-mono focus:border-[#D6A83A] outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#716F69] hover:text-[#F2F0EA]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-white text-[#080808] font-bold"
                >
                  Submit & Verify Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
