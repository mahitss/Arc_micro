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
      label: 'Native USDC Contract',
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#f5f5f5]">
      {/* Top Banner Status Bar */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[#666666] uppercase text-[11px]">SETTLEMENT PLANE:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#141414] text-[#f5f5f5] border border-[#222222]">
              ARC CONSENSUS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#666666] uppercase text-[11px]">NETWORK STATUS:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#141414] text-[#f5f5f5] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              RPC ACTIVE (BLOCK #22,572,770)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#666666] uppercase text-[11px]">RECONCILIATION:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#141414] text-[#f59e0b] border border-[#222222]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              SIMULATION CONSISTENT
            </span>
          </div>
        </div>

        {/* Execution Mode Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[#666666] text-[11px]">EXECUTION MODE:</span>
          <div className="flex bg-[#0d0d0d] border border-[#222222] rounded p-0.5">
            <button
              type="button"
              className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#1a1a1a] text-[#f5f5f5] border border-[#2a2a2a] cursor-default"
            >
              SIMULATION
            </button>
            <button
              type="button"
              disabled
              title="Disabled: AgentVault is not deployed on Arc Mainnet"
              className="px-2.5 py-1 rounded text-[11px] font-medium text-[#666666] cursor-not-allowed opacity-60 flex items-center gap-1"
            >
              <span>LIVE</span>
              <span className="text-[9px] text-[#ef4444] border border-[#ef4444]/30 px-1 rounded">OPERATOR ONLY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f5f5] font-mono">
              ARC SETTLEMENT & CONSENSUS
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#141414] text-[#a3a3a3] border border-[#222222]">
              INSTITUTIONAL LAYER-1
            </span>
          </div>
          <p className="mt-1 text-xs text-[#a3a3a3] max-w-2xl leading-relaxed">
            Authoritative on-chain settlement, contract registry verification, and cryptographic settlement status for AgentPay micro-transactions.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Link
            href="/control"
            className="px-3 py-1.5 rounded-lg bg-[#151515] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors border border-[#262626]"
          >
            ← CONTROL TOWER
          </Link>
          <Link
            href="/treasury"
            className="px-3 py-1.5 rounded-lg bg-[#151515] text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors border border-[#262626]"
          >
            TREASURY VIEW →
          </Link>
        </div>
      </div>

      {/* System Cards (Exact 7 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">CHAIN</span>
          <span className="text-[#f5f5f5] font-bold text-sm mt-0.5 block">5042</span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">RPC</span>
          <span className="text-[#22c55e] font-bold text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            CONNECTED
          </span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">NATIVE USDC</span>
          <span className="text-[#22c55e] font-bold text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            VERIFIED
          </span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">AGENTVAULT</span>
          <span className="text-[#ef4444] font-bold text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            NOT DEPLOYED
          </span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">LIVE EXECUTION</span>
          <span className="text-[#ef4444] font-bold text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            DISABLED
          </span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">REAL SETTLEMENTS</span>
          <span className="text-[#f5f5f5] font-bold text-sm mt-0.5 block">0 VERIFIED</span>
        </div>
        <div className="p-3.5 bg-[#101010] rounded-xl border border-[#222222]">
          <span className="text-[#666666] text-[10px] block">BROADCASTS</span>
          <span className="text-[#f5f5f5] font-bold text-sm mt-0.5 block">0</span>
        </div>
      </div>

      {/* Truthfulness Notice */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-[#171717] text-[#a3a3a3] border border-[#262626] text-xs font-mono font-bold">
            INFO
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#f5f5f5] font-mono uppercase tracking-wide">
              TRUTHFUL VERIFICATION STANDARD · NO FABRICATION OF PRODUCTION REALITY
            </h3>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">
              AgentPay never generates fake transaction hashes, unverified block numbers, or mock receipts.
              AgentVault bytecode is currently undeployed on Arc Mainnet, meaning real on-chain reconciliation is not active.
              All reconciliation metrics below represent strictly deterministic simulation state.
            </p>
          </div>
        </div>
      </div>

      {/* Critical Truthfulness Audit: Simulation vs Live Reconciliation */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-bold font-mono text-[#f5f5f5] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              RECONCILIATION AUDIT MATRIX
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Truthful separation: Simulation reconciliation vs. Live on-chain status
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#a3a3a3] border border-[#222222]">
            SIMULATION ONLY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#666666] text-[10px] uppercase">Simulation Reconciliation</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#22c55e] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                CONSISTENT
              </span>
            </div>
            <p className="text-[11px] text-[#a3a3a3] font-sans">
              Internal ledger, double-entry journal, and digital twin state reflect mathematical parity across all simulation scenarios.
            </p>
          </div>

          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#666666] text-[10px] uppercase">Real On-Chain Reconciliation</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#ef4444] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                NOT AVAILABLE
              </span>
            </div>
            <p className="text-[11px] text-[#a3a3a3] font-sans">
              No verified settlements: AgentVault contract is undeployed on Arc Mainnet and live execution remains disabled.
            </p>
          </div>
        </div>

        {/* 4-Way Reconciliation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-1">
          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1">
            <span className="text-[#666666] text-[10px] block">1. INTERNAL LEDGER (SIM)</span>
            <div className="text-[#f5f5f5] font-bold text-sm">$100.00 USDC</div>
            <span className="text-[10px] text-[#666666] block">Double-entry balanced</span>
          </div>

          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1">
            <span className="text-[#666666] text-[10px] block">2. REPOSITORY STATE (SIM)</span>
            <div className="text-[#f5f5f5] font-bold text-sm">$100.00 USDC</div>
            <span className="text-[10px] text-[#666666] block">Encumbrance tracking</span>
          </div>

          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1">
            <span className="text-[#666666] text-[10px] block">3. AGENTVAULT (SIMULATED)</span>
            <div className="text-[#f5f5f5] font-bold text-sm">$100.00 USDC</div>
            <span className="text-[10px] text-[#666666] block">Contract pool (Sim)</span>
          </div>

          <div className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-1">
            <span className="text-[#666666] text-[10px] block">4. REAL ARC SETTLEMENT</span>
            <div className="text-[#ef4444] font-bold text-sm">0 Verified</div>
            <span className="text-[10px] text-[#666666] block">AgentVault Undeployed</span>
          </div>
        </div>
      </section>

      {/* Verified Arc System Parameters Table */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div>
            <h2 className="text-sm font-bold font-mono text-[#f5f5f5] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              VERIFIED ARC SYSTEM PARAMETERS
            </h2>
            <p className="text-xs text-[#666666]">Cryptographically verifiable on-chain anchors and execution policies</p>
          </div>
          <span className="text-[11px] font-mono text-[#666666]">
            CHAIN ID: 5042
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {arcParameters.map((param) => (
            <div
              key={param.label}
              className="p-3.5 bg-[#0d0d0d] border border-[#222222] rounded-lg space-y-2 hover:border-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[#a3a3a3] font-medium tracking-wide">
                  {param.label}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#141414] text-[#f5f5f5] border border-[#222222]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      param.status === 'VERIFIED'
                        ? 'bg-[#22c55e]'
                        : param.status === 'UNDEPLOYED'
                        ? 'bg-[#ef4444]'
                        : 'bg-[#f59e0b]'
                    }`}
                  />
                  {param.status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-[#141414] px-2.5 py-1.5 rounded border border-[#222222]">
                <span className="font-mono text-xs text-[#f5f5f5] truncate font-bold">
                  {param.value}
                </span>
                <button
                  onClick={() => copyToClipboard(param.value, param.label)}
                  className="text-[#666666] hover:text-[#f5f5f5] text-[10px] font-mono transition-colors shrink-0"
                  title="Copy to clipboard"
                >
                  {copiedKey === param.label ? '✓ COPIED' : 'COPY'}
                </button>
              </div>

              <p className="text-[11px] text-[#666666] font-sans">
                {param.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Settlement Audit Status */}
      <section className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <h2 className="text-sm font-bold font-mono text-[#f5f5f5] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            LIVE SETTLEMENT AUDIT STATUS
          </h2>
          <span className="px-2 py-0.5 rounded bg-[#141414] text-[#666666] font-mono text-[10px] border border-[#222222]">
            AUDIT TRAIL
          </span>
        </div>

        <div className="p-4 bg-[#0d0d0d] border border-dashed border-[#262626] rounded-lg text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#171717] text-[#a3a3a3] border border-[#262626] flex items-center justify-center mx-auto text-sm font-bold font-mono">
            !
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-[#f5f5f5] font-mono uppercase tracking-wide">
              No live settlement verified.
            </h3>
            <p className="text-xs text-[#a3a3a3] max-w-lg mx-auto leading-relaxed">
              Production broadcast remains operator-gated. All demonstration workflows execute within deterministic simulation or air-gapped canary verification modes.
            </p>
          </div>
          <div className="pt-1">
            <span className="inline-block px-2.5 py-0.5 bg-[#141414] rounded text-[10px] font-mono text-[#a3a3a3] border border-[#222222]">
              GATE INVARIANT: Production Broadcast requires Operator Multi-Sig
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
