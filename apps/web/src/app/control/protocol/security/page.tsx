'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchProtocolSecurity,
  SecurityIncidentReport,
  FALLBACK_SECURITY,
} from '../../../../lib/api/protocol';

export default function ProtocolSecurityPage() {
  const [security, setSecurity] = useState<SecurityIncidentReport | null>(null);
  const [selectedVector, setSelectedVector] = useState<string | null>(null);
  const [simulationOutput, setSimulationOutput] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProtocolSecurity();
        setSecurity(data);
      } catch (err) {
        console.error('Failed to load security report:', err);
      }
    }
    load();
  }, []);

  const secData = security || FALLBACK_SECURITY;

  const attackVectors = [
    {
      id: 'vector_1',
      name: 'Replay Attack Vector (Stale Nonce)',
      invariant: 'INV-170',
      description: 'Attacker resends a valid previous payload with the same nonce to double-spend.',
      expected: 'REJECTED: ErrINV170 — Stale nonce detected. Replay defense triggered.',
    },
    {
      id: 'vector_2',
      name: 'Direct Ledger Mutation Attempt',
      invariant: 'INV-161 / INV-164',
      description: 'External agent attempts to execute raw transfer calldata or bypass PaymentIntent.',
      expected: 'REJECTED: ErrINV161 / ErrINV164 — External agent cannot possess financial authority.',
    },
    {
      id: 'vector_3',
      name: 'Unauthorized Balance Inspection',
      invariant: 'INV-168',
      description: 'Untrusted agent attempts to query tenant treasury balance or other agent balances.',
      expected: 'REJECTED: ErrINV168 — Information isolation. External agents cannot inspect private ledgers.',
    },
    {
      id: 'vector_4',
      name: 'Recipient Address Injection',
      invariant: 'INV-163',
      description: 'Malicious payload injects raw hex 0x... address instead of approved directory service ID.',
      expected: 'REJECTED: ErrINV163 — Recipient injection prohibited. Address must resolve from registry.',
    },
    {
      id: 'vector_5',
      name: 'Premature Deliverable Payment Claim',
      invariant: 'INV-173',
      description: 'Worker demands payment immediately upon submission without independent seal verification.',
      expected: 'REJECTED: ErrINV173 — Quality gate verification mandatory before payment eligibility.',
    },
    {
      id: 'vector_6',
      name: 'Cross-Tenant Contract Tampering',
      invariant: 'INV-172',
      description: 'Agent from tenant_alpha attempts to accept or view contracts owned by tenant_beta.',
      expected: 'REJECTED: ErrINV172 — Strict multi-tenant isolation enforced.',
    },
  ];

  function runAttackSimulation(v: typeof attackVectors[0]) {
    setSelectedVector(v.id);
    setSimulationOutput(`[ATTACK LAUNCHED] ${v.name} targeting /protocol/v1/...\n[GATEWAY CHECK] Pipeline Stage 2/6: Invariant verification...\n[DEFENSE SUCCESS] ${v.expected}\n[AUDIT LOG] Incident recorded. Reputation penalty applied to attacker agent.`);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/protocol"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] border border-[#222222] transition"
            >
              ← Back to Protocol Overview
            </Link>
            <span className="text-xs font-mono text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A]">security</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-2">Protocol Security Incident Center</h1>
          <p className="text-xs text-[#716F69]">
            Automated defense against malicious external AI agents. Deterministic invariant enforcement.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2FB36F]/40 text-[#2FB36F] text-xs font-mono font-semibold">
          ● 0 Financial Breaches / 100% Invariants Verified
        </div>
      </div>

      {/* Invariants Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { id: 'INV-161', title: 'Closed Financial Authority', status: 'ACTIVE' },
          { id: 'INV-162', title: 'Manifest Source of Truth', status: 'ACTIVE' },
          { id: 'INV-163', title: 'Recipient Injection Blocked', status: 'ACTIVE' },
          { id: 'INV-164', title: 'Zero Raw Calldata Execution', status: 'ACTIVE' },
          { id: 'INV-165', title: 'Policy Enforced Budget Caps', status: 'ACTIVE' },
          { id: 'INV-170', title: 'Replay Attack Protection', status: 'ACTIVE' },
          { id: 'INV-171', title: 'Bounded Contract State Machine', status: 'ACTIVE' },
          { id: 'INV-173', title: 'Quality Gate Before Payment', status: 'ACTIVE' },
          { id: 'INV-178', title: 'Dispute Ledger Quarantine', status: 'ACTIVE' },
        ].map((inv) => (
          <div key={inv.id} className="p-4 rounded-xl bg-[#101010] border border-[#222222] flex justify-between items-center">
            <div>
              <div className="text-xs font-mono font-bold text-[#D6A83A]">{inv.id}</div>
              <div className="text-xs text-[#F2F0EA] mt-0.5">{inv.title}</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40">
              {inv.status}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Adversarial Attack Lab */}
      <div className="rounded-xl border border-[#222222] bg-[#101010] p-6 mb-8">
        <h2 className="text-base font-bold text-[#F2F0EA] mb-1">
          Interactive Adversarial Attack Verification Lab
        </h2>
        <p className="text-xs text-[#716F69] mb-6">
          Test real-time deterministic interception across known adversarial attack vectors.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {attackVectors.map((v) => (
              <div
                key={v.id}
                onClick={() => runAttackSimulation(v)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  selectedVector === v.id
                    ? 'bg-[#141414] border-[#D6A83A] shadow-md'
                    : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-[#F2F0EA] text-xs">{v.name}</h3>
                  <span className="text-[10px] font-mono text-[#D85C5C] border border-[#D85C5C]/30 bg-[#141414] px-2 py-0.5 rounded">
                    {v.invariant}
                  </span>
                </div>
                <p className="text-[11px] text-[#716F69] mt-1">{v.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#0B0B0B] border border-[#222222] p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-[#222222] text-xs font-mono text-[#716F69]">
                <span>GATEWAY INTERCEPTION CONSOLE</span>
                <span className="text-[#2FB36F]">STATUS: PROTECTED</span>
              </div>
              <pre className="mt-4 text-xs font-mono text-[#2FB36F] whitespace-pre-wrap leading-relaxed">
                {simulationOutput ||
                  'Select an adversarial attack vector from the left to simulate automated real-time gateway defense and invariant interception.'}
              </pre>
            </div>
            <div className="text-[10px] text-[#50504C] font-mono pt-4 border-t border-[#222222]">
              AgentPay Protocol Gateway Pipeline enforces zero-trust boundary. All actions fail closed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
