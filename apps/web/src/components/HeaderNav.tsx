'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HeaderNav() {
  const pathname = usePathname() || '';

  // Determine active section based on current route
  const isControlActive = pathname.startsWith('/control');
  const isMissionsActive = pathname.startsWith('/missions');
  const isMarketplaceActive = pathname.startsWith('/marketplace');
  const isEconomyActive = pathname.startsWith('/economy');
  const isSecurityActive = pathname.startsWith('/security');
  const isArcActive = pathname.startsWith('/arc');

  return (
    <>
      <nav className="hidden lg:flex items-center space-x-1 text-xs font-sans font-medium">
        {/* 1. CONTROL */}
        <Link
          href="/control"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isControlActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isControlActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          Control
        </Link>

        {/* 2. MISSIONS */}
        <Link
          href="/missions"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isMissionsActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isMissionsActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          Missions
        </Link>

        {/* 3. MARKETPLACE */}
        <Link
          href="/marketplace"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isMarketplaceActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isMarketplaceActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          Marketplace
        </Link>

        {/* 4. ECONOMY */}
        <Link
          href="/economy"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isEconomyActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isEconomyActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          Economy
        </Link>

        {/* 5. SECURITY */}
        <Link
          href="/security"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isSecurityActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isSecurityActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          Security
        </Link>

        {/* 6. ARC */}
        <Link
          href="/arc"
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            isArcActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent'
          }`}
        >
          {isArcActive && <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />}
          Arc
        </Link>

        {/* 7. MORE Subsystems Dropdown */}
        <div className="relative group ml-1">
          <button
            type="button"
            aria-label="MORE"
            className="px-2.5 py-1.5 rounded-lg text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#121212] transition-colors flex items-center gap-1 text-xs font-sans border border-transparent hover:border-[#222222]"
          >
            <span>More</span>
            <span className="text-[9px] text-[#666666] group-hover:text-[#a3a3a3]">▼</span>
          </button>
          <div className="absolute left-0 mt-1 w-64 bg-[#101010] border border-[#222222] rounded-lg shadow-2xl p-2 hidden group-hover:grid grid-cols-2 gap-1 z-50">
            <Link href="/control/autonomy" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Autonomy</Link>
            <Link href="/control/objectives" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Objectives</Link>
            <Link href="/control/protocol" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Protocol</Link>
            <Link href="/control/runtime" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Runtime</Link>
            <Link href="/control/operations" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Operations</Link>
            <Link href="/economy/clearing" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Clearinghouse</Link>
            <Link href="/treasury" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Treasury</Link>
            <Link href="/swarms" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Swarms</Link>
            <Link href="/simulator" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Simulator</Link>
            <Link href="/constitution" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Constitution</Link>
            <Link href="/approvals" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Approvals</Link>
            <Link href="/activity" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Activity</Link>
            <Link href="/overview" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Overview</Link>
            <Link href="/agents" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Agents</Link>
            <Link href="/network" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Network</Link>
            <Link href="/demo" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors font-sans">Replay Demo</Link>
          </div>
        </div>
      </nav>

      {/* Mobile sub-nav */}
      <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-[#222222] bg-[#070707] overflow-x-auto text-xs font-sans">
        <Link
          href="/control"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isControlActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Control
        </Link>
        <Link
          href="/missions"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isMissionsActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Missions
        </Link>
        <Link
          href="/marketplace"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isMarketplaceActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Marketplace
        </Link>
        <Link
          href="/economy"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isEconomyActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Economy
        </Link>
        <Link
          href="/security"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isSecurityActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Security
        </Link>
        <Link
          href="/arc"
          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
            isArcActive
              ? 'text-[#f5f5f5] font-semibold bg-[#1a1a1a] border border-[#262626]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          Arc
        </Link>
      </div>
    </>
  );
}
