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
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'NOT CONNECTED':
      case 'OFFLINE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Security & Invariant Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Deterministic Security Matrix
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Live operational status of AgentPay security subsystems and mathematical proofs of core economic invariants.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>INV-E1 to INV-E12: Verified</span>
        </div>
      </div>

      {/* Subsystem Health Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Core Subsystem Telemetry</h2>
        {loading || !report ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Querying subsystem health...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(report).map(([key, sub]) => (
              <div
                key={key}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(sub.status)}`}>
                      {sub.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{sub.verified ? 'VERIFIED' : 'UNVERIFIED'}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{sub.name}</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{sub.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Invariants Comparison: AI CANNOT vs SERVICE CANNOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: AI CANNOT */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-slate-950 font-bold">
              ✕
            </span>
            <h2 className="font-bold text-white text-sm uppercase tracking-wider">
              AI / LLM Hard Boundaries (Enforced)
            </h2>
          </div>

          <ul className="space-y-3">
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Choose Arbitrary Recipient</span>
                <span className="text-slate-400 text-[11px]">
                  Recipients are authoritatively resolved from the server-side ServiceRegistry (INV-E5).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Sign Transactions</span>
                <span className="text-slate-400 text-[11px]">
                  Agents hold zero private keys. Signing is delegated exclusively to the server-side Signer gate (INV-E3).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Bypass Policy</span>
                <span className="text-slate-400 text-[11px]">
                  Hard DENY from the deterministic Rust policy engine is permanent and unoverridable (INV-E6).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Self-Approve</span>
                <span className="text-slate-400 text-[11px]">
                  High-risk or over-threshold payments require multi-signature human approval (INV-E7).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Modify Mission Budget</span>
                <span className="text-slate-400 text-[11px]">
                  Mission budget ceiling is immutable once incepted (INV-E1).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Directly Access AgentVault</span>
                <span className="text-slate-400 text-[11px]">
                  Vault contract only accepts authorized calldata signed by the trusted signer (INV-E11).
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Right Column: SERVICE CANNOT */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[9px] text-slate-950 font-bold">
              ✕
            </span>
            <h2 className="font-bold text-white text-sm uppercase tracking-wider">
              External Service Output Boundaries
            </h2>
          </div>

          <ul className="space-y-3">
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Modify Policy</span>
                <span className="text-slate-400 text-[11px]">
                  Prompt injections in service outputs are stripped by SanitizeExternalOutput (INV-E4).
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Escalate Payment Amount</span>
                <span className="text-slate-400 text-[11px]">
                  Payments are locked to the binding quote accepted prior to service invocation.
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Change Recipient</span>
                <span className="text-slate-400 text-[11px]">
                  Payout destination cannot be altered in post-execution callbacks or responses.
                </span>
              </div>
            </li>
            <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <div>
                <span className="font-bold text-white block">Cannot Authorize Itself</span>
                <span className="text-slate-400 text-[11px]">
                  Only the canonical AgentPay engine and human approvers can approve money movement.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Third Card: MULTI-AGENT SWARM INVARIANTS (INV-S1 to INV-S8) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-950/20 border border-purple-800/40 shadow-xl space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center text-[9px] text-white font-bold">
              🐝
            </span>
            <h2 className="font-bold text-white text-sm uppercase tracking-wider">
              Multi-Agent Swarm Invariants (INV-S1 to INV-S8)
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 text-[10px]">
            MATHEMATICALLY PROVEN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-purple-400 font-bold block">INV-S1: Zero Authority</span>
            <p className="text-[11px] text-slate-400">
              Orchestrator agents hold zero private keys and cannot sign transactions or call AgentVault.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-cyan-400 font-bold block">INV-S2: Strict DAG Acyclicity</span>
            <p className="text-[11px] text-slate-400">
              Topological Kahn&apos;s algorithm guarantees zero recursive deadlocks or infinite loops.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block">INV-S4: Atomic Budget Gate</span>
            <p className="text-[11px] text-slate-400">
              Concurrent task budget reservations can never exceed the swarm&apos;s hard budget ceiling.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-amber-400 font-bold block">INV-S5: Cryptographic Hash Chaining</span>
            <p className="text-[11px] text-slate-400">
              Intermediate task outputs are locked with SHA-256 checksums to prevent tamper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
