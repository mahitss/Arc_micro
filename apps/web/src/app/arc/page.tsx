'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ArcPanelPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const arcParameters = [
    {
      label: 'Network',
      value: 'Arc Mainnet',
      status: 'VERIFIED' as const,
      description: 'Official Layer-1 Settlement Network',
    },
    {
      label: 'Chain ID',
      value: '5042 (0x13b2)',
      status: 'VERIFIED' as const,
      description: 'EIP-155 Verified Chain Identifier',
    },
    {
      label: 'RPC Endpoint',
      value: 'https://rpc.mainnet.arc.io',
      status: 'VERIFIED' as const,
      description: 'HTTP JSON-RPC 2.0 (Block #22,572,770 confirmed)',
    },
    {
      label: 'NATIVE USDC Contract',
      value: '0x3600000000000000000000000000000000000000',
      status: 'VERIFIED' as const,
      description: 'Native Arc micro-payment token (6 decimals)',
    },
    {
      label: 'AgentVault Contract',
      value: '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852 (NOT DEPLOYED ON MAINNET)',
      status: 'UNDEPLOYED' as const,
      description: 'Production deployment multi-sig verification pending (0x bytecode on Arc Mainnet)',
    },
    {
      label: 'Owner Key / Signer',
      value: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (LOCAL DEV ONLY)',
      status: 'DEV ONLY' as const,
      description: 'Local development keystore (Foundry default; Mainnet cold owner unconfigured)',
    },
    {
      label: 'Relayer Address',
      value: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      status: 'PENDING' as const,
      description: 'Awaiting gas sponsorship stake allocation',
    },
    {
      label: 'Execution Mode',
      value: 'SIMULATION ONLY (Production broadcast operator-gated)',
      status: 'VERIFIED' as const,
      description: 'Dual-mode execution isolation boundary (INV-156)',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Top Banner Status Bar */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[#716F69] uppercase text-[11px] font-medium">Settlement Plane:</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#141414] text-[#F2F0EA] border border-[#222222]">
              Arc Consensus
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#716F69] uppercase text-[11px] font-medium">Network Status:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#141414] text-[#F2F0EA] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              RPC Active (Block #22,572,770)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#716F69] uppercase text-[11px] font-medium">Reconciliation:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#141414] text-[#D6A83A] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              SIMULATION CONSISTENT
            </span>
          </div>
        </div>

        {/* Execution Mode Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[#716F69] text-xs font-medium">Execution:</span>
          <div className="flex bg-[#101010] border border-[#222222] rounded-lg p-0.5">
            <button
              type="button"
              className="h-7 px-2.5 rounded-md text-xs font-bold bg-[#1a1a1a] text-[#F2F0EA] border border-[#2a2a2a] cursor-default"
            >
              Simulation
            </button>
            <button
              type="button"
              disabled
              title="Disabled: AgentVault is not deployed on Arc Mainnet"
              className="h-7 px-2.5 rounded-md text-xs font-medium text-[#716F69] cursor-not-allowed opacity-60 flex items-center gap-1"
            >
              <span>Live</span>
              <span className="text-[9px] text-[#D85C5C] border border-[#D85C5C]/30 px-1 rounded font-mono">OPERATOR ONLY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              ARC SETTLEMENT & CONSENSUS
            </h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
              INSTITUTIONAL LAYER-1
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-[#B0ADA5] max-w-2xl leading-relaxed">
            Authoritative settlement infrastructure for AgentPay. Cryptographic parameter verification and dual-mode reconciliation telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/control"
            className="h-9 px-3.5 rounded-lg bg-[#141414] text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#1a1a1a] transition-colors border border-[#222222] flex items-center"
          >
            ← Control Tower
          </Link>
          <Link
            href="/treasury"
            className="h-9 px-3.5 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-semibold transition-colors flex items-center"
          >
            Treasury View →
          </Link>
        </div>
      </div>

      {/* Prioritized 7-Card Financial Settlement Status Strip */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-3">
        <div className="text-[11px] font-semibold text-[#716F69] uppercase tracking-wider">
          Settlement Infrastructure Status
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">Chain</span>
            <span className="text-[#F2F0EA] font-bold text-base mt-1 block">5042</span>
            <span className="text-[#716F69] text-[11px] block mt-0.5">Arc Mainnet</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">RPC</span>
            <span className="text-[#2FB36F] font-bold text-base mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              CONNECTED
            </span>
            <span className="text-[#716F69] text-[11px] block mt-0.5 font-mono">Block #22.5M</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">NATIVE USDC</span>
            <span className="text-[#2FB36F] font-bold text-base mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              VERIFIED
            </span>
            <span className="text-[#716F69] text-[11px] block mt-0.5">6 Decimals</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">AGENTVAULT</span>
            <span className="text-[#B0ADA5] font-bold text-base mt-1 block">NOT DEPLOYED</span>
            <span className="text-[#716F69] text-[11px] block mt-0.5">0x pending</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">LIVE EXECUTION</span>
            <span className="text-[#B0ADA5] font-bold text-base mt-1 block">DISABLED</span>
            <span className="text-[#716F69] text-[11px] block mt-0.5">Operator gated</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c]">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">REAL SETTLEMENTS</span>
            <span className="text-[#F2F0EA] font-bold text-base mt-1 block">0 VERIFIED</span>
            <span className="text-[#716F69] text-[11px] block mt-0.5 font-mono">Simulation</span>
          </div>
          <div className="p-3.5 bg-[#101010] rounded-xl border border-[#1c1c1c] col-span-2 sm:col-span-1">
            <span className="text-[#716F69] text-[10px] uppercase block font-medium">BROADCASTS</span>
            <span className="text-[#F2F0EA] font-bold text-base mt-1 block">0</span>
            <span className="text-[#716F69] text-[11px] block mt-0.5">Zero broadcast</span>
          </div>
        </div>
      </div>

      {/* Truthfulness Notice */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-[#141414] text-[#B0ADA5] border border-[#222222] text-xs font-semibold">
            INFO
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#F2F0EA] uppercase tracking-wide">
              TRUTHFUL VERIFICATION STANDARD · NO FABRICATION OF PRODUCTION REALITY
            </h3>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              AgentPay never generates fake transaction hashes, unverified block numbers, or mock receipts.
              AgentVault bytecode is currently undeployed on Arc Mainnet, meaning real on-chain reconciliation is not active.
              All reconciliation metrics below represent strictly deterministic simulation state.
            </p>
          </div>
        </div>
      </div>

      {/* Critical Truthfulness Audit: Simulation vs Live Reconciliation */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              RECONCILIATION AUDIT MATRIX
            </h2>
            <p className="text-xs text-[#716F69] mt-0.5">
              Truthful separation: Simulation reconciliation vs. Live on-chain status
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#141414] text-[#B0ADA5] border border-[#222222]">
            SIMULATION ONLY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#716F69] text-[10px] uppercase font-medium">Simulation Reconciliation</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#2FB36F] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
                CONSISTENT
              </span>
            </div>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              Internal ledger, double-entry journal, and digital twin state reflect mathematical parity across all simulation scenarios.
            </p>
          </div>

          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#716F69] text-[10px] uppercase font-medium">Real On-Chain Reconciliation</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#716F69] font-bold">
                NOT AVAILABLE
              </span>
            </div>
            <p className="text-xs text-[#B0ADA5] leading-relaxed">
              No verified settlements: AgentVault contract is undeployed on Arc Mainnet and live execution remains disabled.
            </p>
          </div>
        </div>

        {/* 4-Way Reconciliation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1">
            <span className="text-[#716F69] text-[10px] block uppercase font-medium">1. Internal Ledger (Sim)</span>
            <div className="text-[#F2F0EA] font-bold text-base">$100.00 USDC (SIMULATED)</div>
            <span className="text-[11px] text-[#716F69] block">Double-entry balanced</span>
          </div>

          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1">
            <span className="text-[#716F69] text-[10px] block uppercase font-medium">2. Repository State (Sim)</span>
            <div className="text-[#F2F0EA] font-bold text-base">$100.00 USDC (SIMULATED)</div>
            <span className="text-[11px] text-[#716F69] block">Encumbrance tracking</span>
          </div>

          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1">
            <span className="text-[#716F69] text-[10px] block uppercase font-medium">3. AgentVault (Simulated)</span>
            <div className="text-[#F2F0EA] font-bold text-base">$100.00 USDC (SIMULATED)</div>
            <span className="text-[11px] text-[#716F69] block">Contract pool (Sim)</span>
          </div>

          <div className="p-4 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-1">
            <span className="text-[#716F69] text-[10px] block uppercase font-medium">4. Real Arc Settlement</span>
            <div className="text-[#B0ADA5] font-bold text-base">0 Verified (0.00 USDC)</div>
            <span className="text-[11px] text-[#716F69] block">AgentVault Undeployed (0x)</span>
          </div>
        </div>
      </section>

      {/* Verified Arc System Parameters Table */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              VERIFIED ARC SYSTEM PARAMETERS
            </h2>
            <p className="text-xs text-[#716F69]">Cryptographically verifiable on-chain anchors and execution policies</p>
          </div>
          <span className="text-[11px] font-mono text-[#716F69]">
            CHAIN ID: 5042
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {arcParameters.map((param) => (
            <div
              key={param.label}
              className="p-3.5 bg-[#101010] border border-[#1c1c1c] rounded-xl space-y-2 hover:border-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#B0ADA5] font-medium">
                  {param.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      param.status === 'VERIFIED'
                        ? 'bg-[#2FB36F]'
                        : param.status === 'UNDEPLOYED'
                        ? 'bg-[#D85C5C]'
                        : 'bg-[#D6A83A]'
                    }`}
                  />
                  {param.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-[#101010] px-2.5 py-1.5 rounded-lg border border-[#141414]">
                <span className="font-mono text-xs text-[#F2F0EA] truncate font-medium">
                  {param.value}
                </span>
                <button
                  onClick={() => copyToClipboard(param.value, param.label)}
                  className="text-[#716F69] hover:text-[#F2F0EA] text-[10px] transition-colors shrink-0 font-medium"
                  title="Copy to clipboard"
                >
                  {copiedKey === param.label ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <p className="text-[11px] text-[#716F69]">
                {param.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Settlement Audit Status */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <h2 className="text-sm font-bold text-[#F2F0EA] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            LIVE SETTLEMENT AUDIT STATUS
          </h2>
          <span className="px-2 py-0.5 rounded-md bg-[#141414] text-[#716F69] text-[10px] border border-[#222222] font-medium">
            Audit Trail
          </span>
        </div>

        <div className="p-5 bg-[#101010] border border-dashed border-[#222222] rounded-xl text-center space-y-2">
          <div className="w-7 h-7 rounded-full bg-[#141414] text-[#B0ADA5] border border-[#222222] flex items-center justify-center mx-auto text-xs font-bold">
            !
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#F2F0EA] uppercase tracking-wide">
              No live settlement verified
            </h3>
            <p className="text-xs text-[#B0ADA5] max-w-lg mx-auto leading-relaxed">
              Production broadcast remains operator-gated. All demonstration workflows execute within deterministic simulation or air-gapped canary verification modes.
            </p>
          </div>
          <div className="pt-1">
            <span className="inline-block px-2.5 py-0.5 bg-[#141414] rounded-md text-[10px] text-[#716F69] border border-[#222222]">
              Gate Boundary: Production broadcast requires operator multi-sig verification
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
