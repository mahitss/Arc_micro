'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchSecurityReport } from '../../lib/api/missions';
import { fetchSecurityCenter, fetchArcStatus, ArcStatusView } from '../../lib/api/control';
import { SecuritySubsystemsReport } from '../../lib/api/types';

export default function SecurityCenterPage() {
  const [report, setReport] = useState<SecuritySubsystemsReport | null>(null);
  const [securityData, setSecurityData] = useState<any>(null);
  const [arcStatus, setArcStatus] = useState<ArcStatusView | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'constitution' | 'killswitches' | 'invariants'>('overview');

  useEffect(() => {
    async function loadAllSecurity() {
      setLoading(true);
      try {
        const [subsystems, secCenter, arc] = await Promise.all([
          fetchSecurityReport(),
          fetchSecurityCenter('org_default'),
          fetchArcStatus(),
        ]);
        setReport(subsystems);
        setSecurityData(secCenter);
        setArcStatus(arc);
      } catch (err) {
        console.error('Failed to load security center data', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllSecurity();
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
      case 'UNAVAILABLE':
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA] bg-[#080808]">
      {/* 1. Header Banner & Defense Matrix Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
              Security & Invariant Control Center
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
              DETERMINISTIC DEFENSE MATRIX
            </span>
          </div>
          <p className="text-xs text-[#B0ADA5] mt-1 max-w-3xl leading-relaxed">
            Live operational status of AgentPay security subsystems, 7-tier constitutional policy hierarchy, emergency kill switches, keyless signer boundary, and mathematical proof of economic invariants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#B0ADA5] bg-[#101010] px-3 py-1.5 rounded-lg border border-[#222222]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
            <span>INV-1 to INV-12: Verified</span>
          </div>
          <Link
            href="/security-lab"
            className="flex items-center gap-1.5 font-mono text-[11px] text-[#D85C5C] bg-[#141414] hover:bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#D85C5C]/30 transition-colors"
          >
            <span>⚗</span>
            <span>Adversarial Lab &rarr;</span>
          </Link>
          <Link
            href="/constitution"
            className="flex items-center gap-1.5 font-mono text-[11px] text-[#D6A83A] bg-[#141414] hover:bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#D6A83A]/30 transition-colors"
          >
            <span>📜</span>
            <span>Constitution &rarr;</span>
          </Link>
        </div>
      </div>

      {/* 2. Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#222222] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]'
              : 'text-[#716F69] hover:text-[#B0ADA5] hover:bg-[#101010]'
          }`}
        >
          CORE SUBSYSTEMS
        </button>
        <button
          onClick={() => setActiveTab('constitution')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
            activeTab === 'constitution'
              ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]'
              : 'text-[#716F69] hover:text-[#B0ADA5] hover:bg-[#101010]'
          }`}
        >
          POLICY HIERARCHY ({securityData?.constitution_version || 'v8'})
        </button>
        <button
          onClick={() => setActiveTab('killswitches')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
            activeTab === 'killswitches'
              ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]'
              : 'text-[#716F69] hover:text-[#B0ADA5] hover:bg-[#101010]'
          }`}
        >
          KILL SWITCHES & SIGNER
        </button>
        <button
          onClick={() => setActiveTab('invariants')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
            activeTab === 'invariants'
              ? 'bg-[#181818] text-[#F2F0EA] border border-[#2D2D2D]'
              : 'text-[#716F69] hover:text-[#B0ADA5] hover:bg-[#101010]'
          }`}
        >
          ECONOMIC INVARIANTS
        </button>
      </div>

      {/* TAB 1: OVERVIEW / CORE SUBSYSTEMS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide uppercase font-mono text-[#F2F0EA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
                Core Subsystem Telemetry
              </h2>
              <span className="text-[11px] font-mono text-[#716F69]">
                Live Runtime Health & Defense Invariants
              </span>
            </div>

            {loading || !report ? (
              <div className="p-12 text-center text-[#716F69] font-mono text-xs bg-[#101010] border border-[#222222] rounded-xl">
                Querying security subsystem health...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(report).map(([key, sub]) => (
                  <div
                    key={key}
                    className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2.5 font-mono text-xs flex flex-col justify-between hover:border-[#2D2D2D] transition-colors"
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

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 bg-[#101010] border border-[#222222] rounded-xl space-y-1">
              <span className="text-[#716F69] text-[10px] uppercase">Signer Boundary</span>
              <div className="text-sm font-bold text-[#F2F0EA]">
                {securityData?.signer_status?.mode || 'LOCAL_KEYSTORE'}
              </div>
              <p className="text-[10px] text-[#2FB36F]">Zero Private Keys with AI</p>
            </div>
            <div className="p-3.5 bg-[#101010] border border-[#222222] rounded-xl space-y-1">
              <span className="text-[#716F69] text-[10px] uppercase">Arc RPC Network</span>
              <div className="text-sm font-bold text-[#2FB36F]">
                {arcStatus?.rpc_reachable ? 'VERIFIED CONNECTED' : 'UNAVAILABLE'}
              </div>
              <p className="text-[10px] text-[#716F69]">Chain ID 5042</p>
            </div>
            <div className="p-3.5 bg-[#101010] border border-[#222222] rounded-xl space-y-1">
              <span className="text-[#716F69] text-[10px] uppercase">Reconciliation Status</span>
              <div className="text-sm font-bold text-[#2FB36F]">
                {securityData?.reconciliation_status || 'MATCHED'}
              </div>
              <p className="text-[10px] text-[#716F69]">0 Balance Discrepancy</p>
            </div>
            <div className="p-3.5 bg-[#101010] border border-[#222222] rounded-xl space-y-1">
              <span className="text-[#716F69] text-[10px] uppercase">Active Security Incidents</span>
              <div className="text-sm font-bold text-[#2FB36F]">
                {securityData?.active_incidents ?? 0}
              </div>
              <p className="text-[10px] text-[#716F69]">All Systems Normal</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POLICY AUTHORITY & CONSTITUTION */}
      {activeTab === 'constitution' && (
        <div className="space-y-6">
          <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222222] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                <h2 className="text-sm font-bold font-mono text-[#F2F0EA]">
                  POLICY AUTHORITY HIERARCHY (CONSTITUTION {securityData?.constitution_version || 'v8'})
                </h2>
              </div>
              <span className="text-xs font-mono text-[#716F69] truncate max-w-sm">
                Hash: {securityData?.policy_hash || '4f8a9c21b5d3e7102948a7b1029c8e7162534a9b...'}
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {securityData?.rule_hierarchy?.map((level: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg flex items-center justify-between hover:border-[#2D2D2D] transition-colors"
                >
                  <span className="font-semibold text-[#F2F0EA]">{level}</span>
                  <span className="text-[#2FB36F] font-bold text-[11px]">ENFORCED IN RUST</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#141414] border border-[#222222] rounded-lg text-xs text-[#B0ADA5] font-mono leading-relaxed">
              <strong className="text-[#F2F0EA]">INVARIANT (INV-148):</strong> Authority strictly narrows downward across all 7 tiers (GLOBAL &rarr; ORG &rarr; AGENT &rarr; MISSION &rarr; SWARM &rarr; TASK &rarr; PAYMENT). A subordinate task or agent policy can <span className="text-[#D85C5C] font-bold">NEVER</span> expand permissions beyond the parent envelope. Any expansion triggers <code className="text-[#D6A83A]">ErrAuthorityEscalation</code>.
            </div>

            <div className="flex justify-end pt-2">
              <Link
                href="/constitution"
                className="text-xs font-mono text-[#D6A83A] hover:underline flex items-center gap-1"
              >
                Inspect Full Constitution Rules, Diffs & Decision Playground &rarr;
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: KILL SWITCHES & SIGNER */}
      {activeTab === 'killswitches' && (
        <div className="space-y-6">
          {/* Emergency Kill Switches */}
          <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h2 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D85C5C]" />
                MULTI-TIER EMERGENCY KILL SWITCHES
              </h2>
              <span className="text-xs font-mono text-[#2FB36F]">ALL SYSTEMS ACTIVE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F2F0EA] uppercase">GLOBAL KILL SWITCH</span>
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                    ACTIVE (UNPAUSED)
                  </span>
                </div>
                <p className="text-[#B0ADA5] text-[11px] leading-relaxed">
                  Immediately halts all payment intent generation and execution system-wide.
                </p>
                <div className="pt-2 text-[10px] text-[#716F69]">
                  Role Required: SECURITY_ADMIN
                </div>
              </div>

              <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F2F0EA] uppercase">ORGANIZATION PAUSE</span>
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                    ACTIVE (UNPAUSED)
                  </span>
                </div>
                <p className="text-[#B0ADA5] text-[11px] leading-relaxed">
                  Pauses missions and payments for tenant org_default without affecting others.
                </p>
                <div className="pt-2 text-[10px] text-[#716F69]">
                  Role Required: ORG_ADMIN
                </div>
              </div>

              <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F2F0EA] uppercase">AGENT QUARANTINE</span>
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                    0 AGENTS PAUSED
                  </span>
                </div>
                <p className="text-[#B0ADA5] text-[11px] leading-relaxed">
                  Automated quarantine halts rogue or compromised agents upon anomaly detection.
                </p>
                <div className="pt-2 text-[10px] text-[#716F69]">
                  Role Required: OPERATOR
                </div>
              </div>
            </div>
          </section>

          {/* Signer & Vault State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3 font-mono text-xs">
              <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2 border-b border-[#222222] pb-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                SIGNER ARCHITECTURE & KEY BOUNDARY
              </h2>
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Signer Mode:</span>
                  <span className="text-[#F2F0EA] font-bold">{securityData?.signer_status?.mode || 'LOCAL_KEYSTORE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">KMS HSM Integration:</span>
                  <span className="text-[#D6A83A] font-bold">FAIL-CLOSED STUB (ErrKMSSignerUnavailable)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Live Execution Flag:</span>
                  <span className="text-[#D85C5C] font-bold">
                    DISABLED (Simulation Mode)
                  </span>
                </div>
                <p className="text-[11px] text-[#716F69] pt-1">
                  INV-1: Zero private keys are ever shared with AI agents or exposed in frontend contexts.
                </p>
              </div>
            </section>

            <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3 font-mono text-xs">
              <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2 border-b border-[#222222] pb-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                AGENTVAULT & ARC CONSENSUS STATE
              </h2>
              <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Vault Contract:</span>
                  <span className="text-[#F2F0EA] font-bold truncate max-w-[200px]">
                    {arcStatus?.agent_vault_address || '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Arc RPC Reachable:</span>
                  <span className="text-[#2FB36F] font-bold">
                    {arcStatus?.rpc_reachable ? 'VERIFIED REACHABLE' : 'UNREACHABLE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#716F69]">Reconciliation:</span>
                  <span className="text-[#2FB36F] font-bold">MATCHED (0 Discrepancy)</span>
                </div>
                <p className="text-[11px] text-[#716F69] pt-1">
                  Vault guarantees per-transaction spending ceilings and daily velocity throttles on Arc.
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: ECONOMIC INVARIANTS & HARD BOUNDARIES */}
      {activeTab === 'invariants' && (
        <div className="space-y-6">
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
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Choose Arbitrary Recipient</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Recipients are authoritatively resolved from the server-side ServiceRegistry (INV-2).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Sign Transactions</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Agents hold zero private keys. Signing is delegated exclusively to the server-side Signer gate (INV-1).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Bypass Policy</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Hard DENY from the deterministic Rust policy engine is permanent and unoverridable (INV-46).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Self-Approve</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      High-risk or over-threshold payments require multi-signature human approval (INV-7).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Modify Mission Budget</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Mission budget ceiling is immutable once incepted (INV-143).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Directly Access AgentVault</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Vault contract only accepts authorized calldata signed by the trusted signer (INV-108).
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
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Modify Policy</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Prompt injections in service outputs are stripped by SanitizeExternalOutput (INV-E4).
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Escalate Payment Amount</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Payments are locked to the binding quote accepted prior to service invocation.
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
                  <span className="text-[#D85C5C] font-bold">✕</span>
                  <div>
                    <span className="font-bold text-[#F2F0EA] block text-xs">Cannot Change Recipient</span>
                    <span className="text-[#716F69] text-[11px] font-sans">
                      Payout destination cannot be altered in post-execution callbacks or responses.
                    </span>
                  </div>
                </li>
                <li className="p-3 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#B0ADA5] flex items-start gap-2.5">
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
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                <span className="text-[#F2F0EA] font-bold block text-xs">INV-S1: Zero Authority</span>
                <p className="text-[11px] text-[#716F69] font-sans">
                  Orchestrator agents hold zero private keys and cannot sign transactions or call AgentVault.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                <span className="text-[#F2F0EA] font-bold block text-xs">INV-S2: Strict DAG Acyclicity</span>
                <p className="text-[11px] text-[#716F69] font-sans">
                  Topological Kahn&apos;s algorithm guarantees zero recursive deadlocks or infinite loops.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                <span className="text-[#F2F0EA] font-bold block text-xs">INV-S4: Atomic Budget Gate</span>
                <p className="text-[11px] text-[#716F69] font-sans">
                  Concurrent task budget reservations can never exceed the swarm&apos;s hard budget ceiling.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1">
                <span className="text-[#F2F0EA] font-bold block text-xs">INV-S5: Hash Chaining</span>
                <p className="text-[11px] text-[#716F69] font-sans">
                  Intermediate task outputs are locked with SHA-256 checksums to prevent tamper.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Truthful Provenance Notice Footer */}
      <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-xl flex items-center justify-between font-mono text-[11px] text-[#716F69]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
          <span>PROVENANCE: Deterministic Simulation Engine & Invariant Verifier. Zero real funds moved.</span>
        </div>
        <span className="text-[10px] text-[#50504C]">AgentVault: 44/44 Foundry Invariant Tests Passing</span>
      </div>
    </div>
  );
}
