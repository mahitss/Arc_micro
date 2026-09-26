'use client';

import React, { useEffect, useState } from 'react';
import { fetchSecurityReport } from '../../lib/api/missions';
import { SecuritySubsystemsReport } from '../../lib/api/types';

export default function SecurityCenterPage() {
  const [report, setReport] = useState<SecuritySubsystemsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityReport().then(setReport).finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            OPERATIONAL
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#D6A83A] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            PARTIAL
          </span>
        );
      case 'NOT CONNECTED':
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#D85C5C] border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
              Security & Invariant Center
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              DETERMINISTIC DEFENSE MATRIX
            </span>
          </div>
          <p className="text-xs text-[#B0ADA5] mt-1 max-w-2xl leading-relaxed">
            Live operational status of AgentPay security subsystems and mathematical proofs of core economic invariants.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#B0ADA5] bg-[#101010] px-3 py-1.5 rounded-lg border border-[#222222]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
          <span>INV-E1 to INV-E12: Verified</span>
        </div>
      </div>

      {/* Subsystem Health Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA]">
          Core Subsystem Telemetry
        </h2>
        {loading || !report ? (
          <div className="p-12 text-center text-[#716F69] font-mono text-xs">
            Querying subsystem health...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(report).map(([key, sub]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2.5 font-mono text-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(sub.status)}
                    <span className="text-[10px] text-[#716F69]">{sub.verified ? 'VERIFIED' : 'UNVERIFIED'}</span>
                  </div>
                  <h3 className="font-bold text-[#F2F0EA] text-sm">{sub.name}</h3>
                  <p className="text-[#B0ADA5] text-[11px] leading-relaxed font-sans">{sub.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Invariants Comparison: AI CANNOT vs SERVICE CANNOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: AI CANNOT */}
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D85C5C]" />
            <h2 className="font-bold text-[#F2F0EA] text-xs uppercase tracking-wider">
              AI / LLM Hard Boundaries (Enforced)
            </h2>
          </div>

          <ul className="space-y-2.5">
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Choose Arbitrary Recipient</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Recipients are authoritatively resolved from the server-side ServiceRegistry (INV-E5).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Sign Transactions</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Agents hold zero private keys. Signing is delegated exclusively to the server-side Signer gate (INV-E3).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Bypass Policy</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Hard DENY from the deterministic Rust policy engine is permanent and unoverridable (INV-E6).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Self-Approve</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  High-risk or over-threshold payments require multi-signature human approval (INV-E7).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Modify Mission Budget</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Mission budget ceiling is immutable once incepted (INV-E1).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Directly Access AgentVault</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Vault contract only accepts authorized calldata signed by the trusted signer (INV-E11).
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Right Column: SERVICE CANNOT */}
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D85C5C]" />
            <h2 className="font-bold text-[#F2F0EA] text-xs uppercase tracking-wider">
              External Service Output Boundaries
            </h2>
          </div>

          <ul className="space-y-2.5">
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Modify Policy</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Prompt injections in service outputs are stripped by SanitizeExternalOutput (INV-E4).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Escalate Payment Amount</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Payments are locked to the binding quote accepted prior to service invocation.
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Change Recipient</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Payout destination cannot be altered in post-execution callbacks or responses.
                </span>
              </div>
            </li>
            <li className="p-3 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
              <span className="text-[#D85C5C] font-bold">✕</span>
              <div>
                <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Authorize Itself</span>
                <span className="text-[#716F69] text-[11px] font-sans">
                  Only the canonical AgentPay engine and human approvers can approve money movement.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Third Card: MULTI-AGENT SWARM INVARIANTS (INV-S1 to INV-S8) */}
      <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
            <h2 className="font-bold text-[#F2F0EA] text-xs uppercase tracking-wider">
              Multi-Agent Swarm Invariants (INV-S1 to INV-S8)
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] text-[10px]">
            MATHEMATICALLY PROVEN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-[#101010] border border-[#222222] space-y-1">
            <span className="text-[#F2F0EA] font-bold block text-xs">INV-S1: Zero Authority</span>
            <p className="text-[11px] text-[#716F69] font-sans">
              Orchestrator agents hold zero private keys and cannot sign transactions or call AgentVault.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#101010] border border-[#222222] space-y-1">
            <span className="text-[#F2F0EA] font-bold block text-xs">INV-S2: Strict DAG Acyclicity</span>
            <p className="text-[11px] text-[#716F69] font-sans">
              Topological Kahn&apos;s algorithm guarantees zero recursive deadlocks or infinite loops.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#101010] border border-[#222222] space-y-1">
            <span className="text-[#F2F0EA] font-bold block text-xs">INV-S4: Atomic Budget Gate</span>
            <p className="text-[11px] text-[#716F69] font-sans">
              Concurrent task budget reservations can never exceed the swarm&apos;s hard budget ceiling.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#101010] border border-[#222222] space-y-1">
            <span className="text-[#F2F0EA] font-bold block text-xs">INV-S5: Hash Chaining</span>
            <p className="text-[11px] text-[#716F69] font-sans">
              Intermediate task outputs are locked with SHA-256 checksums to prevent tamper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
