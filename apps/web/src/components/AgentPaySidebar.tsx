'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  isMatch: (pathname: string) => boolean;
}

export const PRIMARY_ITEMS: NavItem[] = [
  {
    id: 'control',
    label: 'CONTROL',
    href: '/control',
    icon: '⎈',
    isMatch: (p) =>
      p === '/control' ||
      (p.startsWith('/control/') &&
        !p.startsWith('/control/objectives') &&
        !p.startsWith('/control/protocol') &&
        !p.startsWith('/control/runtime') &&
        !p.startsWith('/control/operations')),
  },
  {
    id: 'missions',
    label: 'MISSIONS',
    href: '/missions',
    icon: '◈',
    isMatch: (p) => p.startsWith('/missions') && !p.includes('/replay'),
  },
  {
    id: 'marketplace',
    label: 'MARKETPLACE',
    href: '/marketplace',
    icon: '⇄',
    isMatch: (p) => p.startsWith('/marketplace'),
  },
  {
    id: 'economy',
    label: 'ECONOMY',
    href: '/economy',
    icon: '📈',
    isMatch: (p) =>
      (p === '/economy' || p.startsWith('/economy/')) &&
      !p.startsWith('/economy/clearing'),
  },
  {
    id: 'network',
    label: 'NETWORK',
    href: '/network',
    icon: '⛶',
    isMatch: (p) => p.startsWith('/network'),
  },
  {
    id: 'security',
    label: 'SECURITY',
    href: '/security',
    icon: '🛡',
    isMatch: (p) => p.startsWith('/security'),
  },
  {
    id: 'arc',
    label: 'ARC',
    href: '/arc',
    icon: '▲',
    isMatch: (p) => p.startsWith('/arc'),
  },
];

export const OPERATIONS_ITEMS: NavItem[] = [
  {
    id: 'objectives',
    label: 'OBJECTIVES',
    href: '/control/objectives',
    icon: '🎯',
    isMatch: (p) => p.startsWith('/control/objectives') || p.startsWith('/objectives'),
  },
  {
    id: 'protocol',
    label: 'PROTOCOL',
    href: '/control/protocol',
    icon: '📜',
    isMatch: (p) => p.startsWith('/control/protocol') || p.startsWith('/protocol'),
  },
  {
    id: 'runtime',
    label: 'RUNTIME',
    href: '/control/runtime',
    icon: '▶',
    isMatch: (p) => p.startsWith('/control/runtime') || p.startsWith('/runtime'),
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    href: '/control/operations',
    icon: '⚙',
    isMatch: (p) =>
      (p.startsWith('/control/operations') || p.startsWith('/operations')) &&
      !p.includes('/replay') &&
      !p.includes('/timeline'),
  },
];

export const FINANCIAL_ITEMS: NavItem[] = [
  {
    id: 'clearinghouse',
    label: 'CLEARINGHOUSE',
    href: '/economy/clearing',
    icon: '⚖',
    isMatch: (p) => p.startsWith('/economy/clearing') || p.startsWith('/clearinghouse'),
  },
  {
    id: 'treasury',
    label: 'TREASURY',
    href: '/treasury',
    icon: '🏦',
    isMatch: (p) => p.startsWith('/treasury'),
  },
];

export const TOOLS_ITEMS: NavItem[] = [
  {
    id: 'simulator',
    label: 'SIMULATOR',
    href: '/simulator',
    icon: '⚗',
    isMatch: (p) => p.startsWith('/simulator'),
  },
  {
    id: 'replay',
    label: 'REPLAY',
    href: '/control/operations/timeline',
    icon: '↺',
    isMatch: (p) =>
      p.includes('/replay') || p.startsWith('/replay') || p.includes('/timeline'),
  },
  {
    id: 'demo',
    label: 'DEMO',
    href: '/demo',
    icon: '▶',
    isMatch: (p) => p.startsWith('/demo'),
  },
];

export function AgentPaySidebar() {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      <div className="hidden min-[1200px]:block px-2.5 pb-1 text-[9px] font-mono uppercase tracking-wider text-[#65635E] font-semibold">
        {title}
      </div>
      {items.map((item) => {
        const isActive = item.isMatch(pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            className={`flex items-center justify-center min-[1200px]:justify-between px-2.5 py-1.5 rounded text-xs font-mono tracking-wider transition-colors duration-150 ${
              isActive
                ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515] border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`text-sm shrink-0 w-4 text-center font-mono ${
                  isActive ? 'text-[#D6A83A] opacity-100' : 'opacity-70'
                }`}
              >
                {item.icon}
              </span>
              <span className="hidden min-[1200px]:inline truncate">{item.label}</span>
            </div>
            {isActive && (
              <span className="hidden min-[1200px]:flex items-center gap-1 text-[9px] font-mono text-[#D6A83A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A] animate-pulse" />
                ACTIVE
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Bar (< 900px) */}
      <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#101010] border border-[#222222] flex items-center justify-center font-bold text-[#F2F0EA] text-[10px]">
            AP
          </div>
          <span className="font-bold text-[#F2F0EA] tracking-wide">COMMAND RAIL</span>
          <span className="text-[#8A8882]">/</span>
          <span className="text-[#D6A83A] truncate font-medium">
            {pathname.split('/')[1]?.toUpperCase() || 'WORKSPACE'}
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

      {/* Mobile Expanded Drawer (< 900px) */}
      {mobileOpen && (
        <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] p-4 text-xs font-mono space-y-4 max-h-[80vh] overflow-y-auto shrink-0">
          <div>
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              PRIMARY
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
                >
                  <span className="opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              OPERATIONS
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {OPERATIONS_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
                >
                  <span className="opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#65635E] uppercase tracking-wider block mb-2 font-bold">
              FINANCIAL & TOOLS
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[...FINANCIAL_ITEMS, ...TOOLS_ITEMS].map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
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
                <span className="text-[#8A8882]">LIVE EXECUTION</span>
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

      {/* Desktop & Tablet Persistent Command Rail (>= 900px) */}
      <aside
        aria-label="AgentPay Command Rail"
        className="hidden min-[900px]:flex flex-col w-[72px] min-[1200px]:w-[230px] min-[1200px]:w-[232px] shrink-0 h-[calc(100vh-4rem)] bg-[#0A0A0A] border-r border-[#222222] select-none sticky top-16 z-30"
      >
        {/* 1. Header Identity */}
        <div className="p-3.5 min-[1200px]:p-4 border-b border-[#222222] flex items-center justify-center min-[1200px]:justify-start gap-2.5 shrink-0">
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

        {/* 2. Scrollable Navigation Rail */}
        <div className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
          {renderNavGroup('PRIMARY', PRIMARY_ITEMS)}

          <div className="border-t border-[#222222] mx-1" />

          {renderNavGroup('OPERATIONS', OPERATIONS_ITEMS)}

          <div className="border-t border-[#222222] mx-1" />

          {renderNavGroup('FINANCIAL', FINANCIAL_ITEMS)}

          <div className="border-t border-[#222222] mx-1" />

          {renderNavGroup('TOOLS', TOOLS_ITEMS)}
        </div>

        {/* 3. Pinned System Status Footer */}
        <div className="p-3 border-t border-[#222222] bg-[#0A0A0A] text-[10px] font-mono space-y-2 mt-auto shrink-0">
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

// Alias for backwards compatibility
export { AgentPaySidebar as SimulatorCommandRail };
