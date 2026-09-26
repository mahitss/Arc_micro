'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'control', label: 'CONTROL', href: '/control', icon: '⎈' },
  { id: 'missions', label: 'MISSIONS', href: '/missions', icon: '◈' },
  { id: 'marketplace', label: 'MARKETPLACE', href: '/marketplace', icon: '⇄' },
  { id: 'economy', label: 'ECONOMY', href: '/economy', icon: '📈' },
  { id: 'network', label: 'NETWORK', href: '/network', icon: '⛶' },
  { id: 'security', label: 'SECURITY', href: '/security', icon: '🛡' },
  { id: 'arc', label: 'ARC', href: '/arc', icon: '▲' },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'operations', label: 'OPERATIONS', href: '/control/operations', icon: '⚙' },
  { id: 'runtime', label: 'RUNTIME', href: '/control/runtime', icon: '▶' },
  { id: 'treasury', label: 'TREASURY', href: '/treasury', icon: '🏦' },
  { id: 'clearinghouse', label: 'CLEARINGHOUSE', href: '/economy/clearing', icon: '⚖' },
];

export function SimulatorCommandRail() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile (< 900px) Drawer & Command Rail Bar */}
      <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#101010] border border-[#222222] flex items-center justify-center font-bold text-[#F2F0EA] text-[10px]">
            AP
          </div>
          <span className="font-bold text-[#F2F0EA] tracking-wide">COMMAND RAIL</span>
          <span className="text-[#8A8882]">/</span>
          <span className="text-[#D6A83A] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A] animate-pulse" />
            SIMULATOR
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle Command Rail Navigation"
          className="rounded border border-[#222222] bg-[#121212] px-2.5 py-1 text-[11px] text-[#F2F0EA] hover:bg-[#181818] transition-colors duration-150"
        >
          {mobileOpen ? 'CLOSE ✕' : 'MENU ☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] p-4 text-xs font-mono space-y-4">
          <div>
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              WORKSPACES
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#121212] transition-colors duration-150"
                >
                  <span className="opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              SUBSYSTEMS
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#121212] transition-colors duration-150"
                >
                  <span className="opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              SYSTEM STATUS
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center justify-between p-2 rounded bg-[#101010] border border-[#222222]">
                <span className="text-[#8A8882]">GATEWAY</span>
                <span className="text-[#2FB36F] font-bold">● ONLINE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#101010] border border-[#222222]">
                <span className="text-[#8A8882]">ARC</span>
                <span className="text-[#D6A83A] font-bold">● SIM · 5042</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#101010] border border-[#222222]">
                <span className="text-[#8A8882]">LIVE EXEC</span>
                <span className="text-[#D85C5C] font-bold">● DISABLED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#101010] border border-[#222222]">
                <span className="text-[#8A8882]">AGENTVAULT</span>
                <span className="text-[#D85C5C] font-bold">● NOT DEPLOYED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop (>= 900px) Command Rail Sidebar */}
      <aside
        aria-label="Simulator Command Rail"
        className="hidden min-[900px]:flex flex-col w-[72px] min-[1200px]:w-[230px] shrink-0 min-h-[calc(100vh-4rem)] bg-[#0A0A0A] border-r border-[#222222] select-none sticky top-16 z-30"
      >
        {/* 1. Sidebar Header (Compact Terminal Identity) */}
        <div className="p-3.5 min-[1200px]:p-4 border-b border-[#222222] flex items-center justify-center min-[1200px]:justify-start gap-2.5">
          <div className="w-7 h-7 rounded bg-[#101010] border border-[#222222] flex items-center justify-center font-bold text-[#F2F0EA] text-[11px] font-mono shrink-0">
            AP
          </div>
          <div className="hidden min-[1200px]:flex flex-col min-w-0">
            <span className="font-bold text-xs tracking-tight text-[#F2F0EA] font-mono truncate">
              AgentPay
            </span>
            <span className="text-[10px] text-[#65635E] tracking-wider uppercase font-mono truncate">
              Financial Control Plane
            </span>
          </div>
        </div>

        {/* 2. Primary Navigation Workspaces */}
        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {/* Workspaces Group */}
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className="flex items-center justify-center min-[1200px]:justify-start gap-2.5 px-2.5 py-1.5 rounded text-xs font-mono tracking-wider text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#121212] transition-colors duration-150"
            >
              <span className="text-sm shrink-0 w-4 text-center font-mono opacity-80">{item.icon}</span>
              <span className="hidden min-[1200px]:inline truncate">{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="my-2.5 border-t border-[#222222] mx-1" />

          {/* Subsystems Group */}
          {SECONDARY_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className="flex items-center justify-center min-[1200px]:justify-start gap-2.5 px-2.5 py-1.5 rounded text-xs font-mono tracking-wider text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#121212] transition-colors duration-150"
            >
              <span className="text-sm shrink-0 w-4 text-center font-mono opacity-80">{item.icon}</span>
              <span className="hidden min-[1200px]:inline truncate">{item.label}</span>
            </Link>
          ))}

          {/* Divider */}
          <div className="my-2.5 border-t border-[#222222] mx-1" />

          {/* Active Simulator Item */}
          <div
            title="SIMULATOR — ACTIVE"
            className="flex items-center justify-between px-2.5 py-2 rounded bg-[#151515] border-l-2 border-[#D6A83A] text-xs font-mono tracking-wider text-[#F2F0EA] transition-colors duration-150"
          >
            <div className="flex items-center justify-center min-[1200px]:justify-start gap-2.5 min-w-0">
              <span className="text-sm shrink-0 w-4 text-center text-[#D6A83A]">⚗</span>
              <span className="hidden min-[1200px]:inline font-bold truncate">SIMULATOR</span>
            </div>
            <span className="hidden min-[1200px]:flex items-center gap-1 text-[10px] font-mono text-[#D6A83A] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A] animate-pulse" />
              ACTIVE
            </span>
          </div>
        </div>

        {/* 3. Sidebar System Status (Pinned to Bottom) */}
        <div className="p-3 border-t border-[#222222] bg-[#0A0A0A] text-[10px] font-mono space-y-2 mt-auto">
          <div className="hidden min-[1200px]:block text-[9px] uppercase tracking-wider text-[#65635E] font-bold px-1">
            SYSTEM STATUS
          </div>

          {/* GATEWAY: ONLINE */}
          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="GATEWAY: ONLINE">
            <span className="hidden min-[1200px]:inline text-[#8A8882]">GATEWAY</span>
            <span className="flex items-center gap-1 font-semibold text-[#2FB36F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="hidden min-[1200px]:inline">ONLINE</span>
            </span>
          </div>

          {/* ARC: SIMULATION · 5042 */}
          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="ARC: SIMULATION · 5042">
            <span className="hidden min-[1200px]:inline text-[#8A8882]">ARC</span>
            <span className="flex items-center gap-1 font-semibold text-[#D6A83A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              <span className="hidden min-[1200px]:inline">SIMULATION · 5042</span>
            </span>
          </div>

          {/* LIVE EXECUTION: DISABLED */}
          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="LIVE EXECUTION: DISABLED">
            <span className="hidden min-[1200px]:inline text-[#8A8882]">LIVE EXECUTION</span>
            <span className="flex items-center gap-1 font-semibold text-[#D85C5C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
              <span className="hidden min-[1200px]:inline">DISABLED</span>
            </span>
          </div>

          {/* AGENTVAULT: NOT DEPLOYED */}
          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="AGENTVAULT: NOT DEPLOYED">
            <span className="hidden min-[1200px]:inline text-[#8A8882]">AGENTVAULT</span>
            <span className="flex items-center gap-1 font-semibold text-[#D85C5C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
              <span className="hidden min-[1200px]:inline">NOT DEPLOYED</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
