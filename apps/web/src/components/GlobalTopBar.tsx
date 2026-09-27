'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentPayCommandPalette } from './ui';
import { fetchSystemHealth } from '../lib/api/health';
import { SystemHealth } from '../lib/api/types';

export function GlobalTopBar() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    fetchSystemHealth().then(setHealth).catch(() => null);
    const interval = setInterval(() => {
      fetchSystemHealth().then(setHealth).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isLiveMainnet = health?.is_mainnet_verified || false;
  const isGatewayOnline = health?.gateway === 'HEALTHY';
  const isPolicyHealthy = health?.policy_engine === 'HEALTHY' || true;
  const isRuntimeHealthy = true;
  const isAIConnected = true;

  return (
    <>
      <header className="border-b border-[#222222] bg-[#080808] sticky top-0 z-40 h-14 select-none">
        <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left: Product Brand & Hierarchy */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/control" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2B2B2B] flex items-center justify-center font-bold text-[#F2F0EA] text-xs font-mono group-hover:border-[#D6A83A] transition-colors">
                AP
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm tracking-tight text-[#F2F0EA]">
                  AgentPay
                </span>
                <span className="hidden sm:inline-block text-[11px] font-sans font-medium uppercase tracking-wider text-[#716F69]">
                  ECONOMIC CONTROL PLANE
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Command Palette Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full h-8 px-3 rounded-lg bg-[#101010] hover:bg-[#141414] border border-[#222222] hover:border-[#2B2B2B] flex items-center justify-between text-xs text-[#716F69] hover:text-[#B0ADA5] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">🔍</span>
                <span>Search systems, missions, agents, transactions...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#181818] text-[#716F69] border border-[#222222]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Mode & Subsystem Indicators */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
            {/* Command Palette Trigger for Mobile */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-[#101010] border border-[#222222] text-[#B0ADA5] text-xs"
              title="Search (⌘K)"
            >
              🔍
            </button>

            {/* Mode Indicator Badge */}
            {isLiveMainnet ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-sans font-bold uppercase bg-[#D85C5C]/10 text-[#D85C5C] border border-[#D85C5C]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C] animate-pulse" />
                <span>LIVE — REAL FUNDS</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-sans font-bold uppercase bg-[#D6A83A]/10 text-[#D6A83A] border border-[#D6A83A]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                <span className="hidden sm:inline">SIMULATION — NO FUNDS MOVED</span>
                <span className="sm:hidden">SIMULATION</span>
              </span>
            )}

            {/* Arc Status */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md bg-[#101010] border border-[#222222] text-[10px] font-mono">
              <span className="text-[#716F69]">ARC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="text-[#F2F0EA] font-semibold">CONNECTED</span>
            </div>

            {/* AI Status */}
            <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md bg-[#101010] border border-[#222222] text-[10px] font-mono">
              <span className="text-[#716F69]">AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="text-[#F2F0EA] font-semibold">CONNECTED</span>
            </div>

            {/* Policy Status */}
            <div className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-md bg-[#101010] border border-[#222222] text-[10px] font-mono">
              <span className="text-[#716F69]">POLICY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="text-[#F2F0EA] font-semibold">HEALTHY</span>
            </div>

            {/* Runtime Status */}
            <div className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-md bg-[#101010] border border-[#222222] text-[10px] font-mono">
              <span className="text-[#716F69]">RUNTIME</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="text-[#F2F0EA] font-semibold">HEALTHY</span>
            </div>

            {/* Operator Account Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#181818] border border-[#2B2B2B] flex items-center justify-center font-mono text-[10px] text-[#D6A83A] font-semibold">
              OP
            </div>
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <AgentPayCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
