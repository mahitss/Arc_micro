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

// 1. PRIMARY Group (Task 36 & Task 38 Harmonized)
export const PRIMARY_ITEMS: NavItem[] = [
  {
    id: 'control',
    label: 'CONTROL',
    href: '/control',
    icon: '⎈',
    isMatch: (p) => p === '/control' || p === '/',
  },
  {
    id: 'missions',
    label: 'MISSIONS',
    href: '/missions',
    icon: '◈',
    isMatch: (p) => p.startsWith('/missions'),
  },
  {
    id: 'activity',
    label: 'ACTIVITY',
    href: '/activity',
    icon: '☰',
    isMatch: (p) => p.startsWith('/activity'),
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
    isMatch: (p) => (p === '/economy' || p.startsWith('/economy/')) && !p.startsWith('/economy/clearing'),
  },
  {
    id: 'network',
    label: 'NETWORK',
    href: '/network',
    icon: '⛶',
    isMatch: (p) => p.startsWith('/network') || p.startsWith('/agents'),
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

// 2. OPERATIONS Group
export const OPERATIONS_ITEMS: NavItem[] = [
  {
    id: 'objectives',
    label: 'OBJECTIVES',
    href: '/control/objectives',
    icon: '🎯',
    isMatch: (p) => p.startsWith('/control/objectives'),
  },
  {
    id: 'protocol',
    label: 'PROTOCOL',
    href: '/control/protocol',
    icon: '⛓',
    isMatch: (p) => p.startsWith('/control/protocol'),
  },
  {
    id: 'runtime',
    label: 'RUNTIME',
    href: '/control/runtime',
    icon: '▶',
    isMatch: (p) => p.startsWith('/control/runtime'),
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    href: '/control/operations',
    icon: '⚙',
    isMatch: (p) => p.startsWith('/control/operations'),
  },
  {
    id: 'incidents',
    label: 'INCIDENTS',
    href: '/incidents',
    icon: '⚠',
    isMatch: (p) => p.startsWith('/incidents') || p.startsWith('/control/incidents'),
  },
];

// 3. FINANCIAL Group
export const FINANCIAL_ITEMS: NavItem[] = [
  {
    id: 'clearinghouse',
    label: 'CLEARINGHOUSE',
    href: '/economy/clearing',
    icon: '⚖',
    isMatch: (p) => p.startsWith('/economy/clearing'),
  },
  {
    id: 'treasury',
    label: 'TREASURY',
    href: '/treasury',
    icon: '🏦',
    isMatch: (p) => p.startsWith('/treasury'),
  },
];

// 4. TOOLS Group
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
    isMatch: (p) => p.includes('/replay') || p.includes('/timeline'),
  },
  {
    id: 'ai-providers',
    label: 'AI PROVIDERS',
    href: '/settings/ai',
    icon: '⚡',
    isMatch: (p) => p.startsWith('/settings/ai'),
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
      <div className="hidden min-[1200px]:block px-2.5 pb-1 text-[10px] font-sans font-semibold uppercase tracking-wider text-[#716F69]">
        {title}
      </div>
      {items.map((item) => {
        const isActive = item.isMatch(pathname);
        return (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            className={`flex items-center justify-center min-[1200px]:justify-between px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors duration-150 ${
              isActive
                ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515] border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`text-sm shrink-0 w-4 text-center font-mono ${
                  isActive ? 'text-[#D6A83A]' : 'text-[#716F69]'
                }`}
              >
                {item.icon}
              </span>
              <span className="hidden min-[1200px]:inline truncate">{item.label}</span>
            </div>
            {isActive && (
              <span className="hidden min-[1200px]:inline-block w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Bar (< 900px) */}
      <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] px-4 py-2.5 flex items-center justify-between text-xs font-sans shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#101010] border border-[#222222] flex items-center justify-center font-bold text-[#F2F0EA] text-[10px] font-mono">
            AP
          </div>
          <span className="font-bold text-[#F2F0EA] tracking-wide">CONTROL TOWER</span>
          <span className="text-[#716F69]">/</span>
          <span className="text-[#D6A83A] truncate font-medium">
            {pathname.split('/')[1]?.toUpperCase() || 'WORKSPACE'}
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle Navigation"
          className="rounded-lg border border-[#222222] bg-[#121212] px-2.5 py-1 text-[11px] text-[#F2F0EA] hover:bg-[#181818] transition-colors duration-150"
        >
          {mobileOpen ? 'CLOSE ✕' : 'MENU ☰'}
        </button>
      </div>

      {/* Mobile Expanded Drawer (< 900px) */}
      {mobileOpen && (
        <div className="min-[900px]:hidden w-full border-b border-[#222222] bg-[#0A0A0A] p-4 text-xs font-sans space-y-4 max-h-[80vh] overflow-y-auto shrink-0">
          <div>
            <span className="text-[10px] text-[#716F69] uppercase tracking-wider block mb-2 font-bold">
              PRIMARY
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#716F69] uppercase tracking-wider block mb-2 font-bold">
              OPERATIONS
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {OPERATIONS_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222222] pt-3">
            <span className="text-[10px] text-[#716F69] uppercase tracking-wider block mb-2 font-bold">
              FINANCIAL & TOOLS
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[...FINANCIAL_ITEMS, ...TOOLS_ITEMS].map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-150 ${
                    item.isMatch(pathname)
                      ? 'bg-[#151515] text-[#F2F0EA] border-l-2 border-[#D6A83A] font-semibold'
                      : 'text-[#8A8882] hover:text-[#F2F0EA] hover:bg-[#151515]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar (>= 900px, 72px / 232px) */}
      <aside
        aria-label="AgentPay Command Sidebar"
        className="hidden min-[900px]:flex flex-col w-[72px] min-[1200px]:w-[230px] min-[1200px]:w-[232px] shrink-0 h-[calc(100vh-3.5rem)] bg-[#0A0A0A] border-r border-[#222222] select-none sticky top-14 sticky top-16 z-30"
      >
        {/* Navigation Groups */}
        <div className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
          {renderNavGroup('PRIMARY', PRIMARY_ITEMS)}
          <div className="border-t border-[#222222] mx-1" />
          {renderNavGroup('OPERATIONS', OPERATIONS_ITEMS)}
          <div className="border-t border-[#222222] mx-1" />
          {renderNavGroup('FINANCIAL', FINANCIAL_ITEMS)}
          <div className="border-t border-[#222222] mx-1" />
          {renderNavGroup('TOOLS', TOOLS_ITEMS)}
        </div>

        {/* Pinned Bottom Status & Settings */}
        <div className="p-3 border-t border-[#222222] bg-[#0A0A0A] text-[10px] space-y-2 mt-auto shrink-0 font-mono">
          <div className="hidden min-[1200px]:block text-[9px] uppercase tracking-wider text-[#716F69] font-bold px-1">
            SYSTEM STATUS
          </div>

          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="GATEWAY: ONLINE">
            <span className="hidden min-[1200px]:inline text-[#716F69]">GATEWAY</span>
            <span className="flex items-center gap-1 font-semibold text-[#2FB36F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F]" />
              <span className="hidden min-[1200px]:inline">ONLINE</span>
            </span>
          </div>

          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="ARC: SIMULATION">
            <span className="hidden min-[1200px]:inline text-[#716F69]">ARC</span>
            <span className="flex items-center gap-1 font-semibold text-[#D6A83A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
              <span className="hidden min-[1200px]:inline">SIMULATION · 5042</span>
            </span>
          </div>

          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="LIVE EXECUTION: DISABLED">
            <span className="hidden min-[1200px]:inline text-[#716F69]">EXECUTION</span>
            <span className="flex items-center gap-1 font-semibold text-[#D85C5C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
              <span className="hidden min-[1200px]:inline">DISABLED</span>
            </span>
          </div>

          <div className="flex items-center justify-center min-[1200px]:justify-between px-1" title="AGENTVAULT: NOT DEPLOYED">
            <span className="hidden min-[1200px]:inline text-[#716F69]">VAULT</span>
            <span className="flex items-center gap-1 font-semibold text-[#D85C5C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C]" />
              <span className="hidden min-[1200px]:inline">NOT DEPLOYED</span>
            </span>
          </div>

          <div className="border-t border-[#222222] pt-2 px-1">
            <Link
              href="/settings"
              className="flex items-center justify-center min-[1200px]:justify-between text-[#8A8882] hover:text-[#F2F0EA] transition-colors font-sans text-xs"
            >
              <span className="flex items-center gap-2">
                <span>⚙</span>
                <span className="hidden min-[1200px]:inline">Settings</span>
              </span>
              <span className="hidden min-[1200px]:inline text-[10px] text-[#716F69]">v1.0</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export { AgentPaySidebar as SimulatorCommandRail };
