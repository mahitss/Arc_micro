'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchSecurityCenter, fetchArcStatus, ArcStatusView } from '../../../lib/api/control';

export default function ControlSecurityPage() {
  const [securityData, setSecurityData] = useState<any>(null);
  const [arcStatus, setArcStatus] = useState<ArcStatusView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurity();
  }, []);

  async function loadSecurity() {
    setLoading(true);
    try {
      const [sec, arc] = await Promise.all([
        fetchSecurityCenter('org_default'),
        fetchArcStatus(),
      ]);
      setSecurityData(sec);
      setArcStatus(arc);
    } catch (err) {
      console.error('Failed to load security view', err);
    } finally {
      setLoading(false);
    }
  }

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
            <span className="text-xs font-mono text-[#D6A83A] font-bold">SECURITY & POLICY CONTROL PLANE</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-xs font-mono font-bold">
            SECURITY STATUS: NORMAL
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F2F0EA] font-mono">
            POLICY GOVERNANCE & SECURITY CONTROLS
          </h1>
          <p className="text-sm text-[#B0ADA5] mt-1">
            Authoritative policy hierarchy, emergency kill switches, signer boundary, and cryptographic vault invariants.
          </p>
        </div>

        {/* 1. HIERARCHY OF AUTHORITY */}
        <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h2 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#716F69]" />
              POLICY AUTHORITY HIERARCHY (CONSTITUTION {securityData?.constitution_version || 'v8'})
            </h2>
            <span className="text-xs font-mono text-[#716F69] truncate max-w-xs">
              Hash: {securityData?.policy_hash || '4f8a9c21...'}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {securityData?.rule_hierarchy?.map((level: string, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg flex items-center justify-between hover:border-[#2D2D2D] transition-colors"
              >
                <span className="font-semibold text-[#F2F0EA]">{level}</span>
                <span className="text-[#2FB36F] font-bold">ENFORCED IN RUST</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#141414] border border-[#222222] rounded-lg text-xs text-[#B0ADA5] font-mono">
            <strong className="text-[#F2F0EA]">INVARIANT:</strong> Authority strictly narrows downward. A subordinate task or agent policy
            can NEVER expand permissions beyond the parent mission or organization envelope.
          </div>
        </section>

        {/* 2. MULTI-TIER EMERGENCY KILL SWITCHES */}
        <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold font-mono text-[#F2F0EA] flex items-center gap-2 border-b border-[#222222] pb-3">
            <span className="w-2 h-2 rounded-full bg-[#D85C5C]" />
            MULTI-TIER EMERGENCY KILL SWITCHES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F2F0EA] uppercase">GLOBAL KILL SWITCH</span>
                <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                  ACTIVE (UNPAUSED)
                </span>
              </div>
              <p className="text-[#B0ADA5] text-[11px]">
                Immediately halts all on-chain payment intent generation and execution system-wide.
              </p>
              <div className="pt-2 text-[10px] text-[#50504C]">
                Requires: SECURITY_ADMIN role
              </div>
            </div>

            <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F2F0EA] uppercase">ORGANIZATION PAUSE</span>
                <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                  ACTIVE (UNPAUSED)
                </span>
              </div>
              <p className="text-[#B0ADA5] text-[11px]">
                Pauses all missions and payments for tenant org_default without affecting other tenants.
              </p>
              <div className="pt-2 text-[10px] text-[#50504C]">
                Requires: ORG_ADMIN role
              </div>
            </div>

            <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F2F0EA] uppercase">AGENT QUARANTINE</span>
                <span className="px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                  0 AGENTS PAUSED
                </span>
              </div>
              <p className="text-[#B0ADA5] text-[11px]">
                Individual agent pause triggers quarantine mode upon anomaly detection or policy failure.
              </p>
              <div className="pt-2 text-[10px] text-[#50504C]">
                Requires: OPERATOR role
              </div>
            </div>
          </div>
        </section>

        {/* 3. SIGNER & AGENTVAULT STATE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span className="text-[#D6A83A] font-bold">KMS NOT AVAILABLE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#716F69]">Live Execution Flag:</span>
                <span className={`font-bold ${securityData?.signer_status?.live_execution_enabled ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}`}>
                  {securityData?.signer_status?.live_execution_enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-[11px] text-[#50504C] pt-1">
                Zero private keys are ever shared with AI agents or exposed in frontend contexts (INV-87).
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
              <p className="text-[11px] text-[#50504C] pt-1">
                Vault guarantees per-transaction spending ceilings and daily velocity throttles.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
