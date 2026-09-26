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
      <nav className="hidden lg:flex items-center space-x-1 text-xs font-mono font-medium">
        {/* 1. CONTROL */}
        <Link
          href="/control"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isControlActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isControlActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          CONTROL
        </Link>

        {/* 2. MISSIONS */}
        <Link
          href="/missions"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isMissionsActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isMissionsActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          MISSIONS
        </Link>

        {/* 3. MARKETPLACE */}
        <Link
          href="/marketplace"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isMarketplaceActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isMarketplaceActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          MARKETPLACE
        </Link>

        {/* 4. ECONOMY */}
        <Link
          href="/economy"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isEconomyActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isEconomyActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          ECONOMY
        </Link>

        {/* 5. SECURITY */}
        <Link
          href="/security"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isSecurityActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isSecurityActive && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />}
          SECURITY
        </Link>

        {/* 6. ARC */}
        <Link
          href="/arc"
          className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
            isArcActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] border border-transparent'
          }`}
        >
          {isArcActive && <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />}
          ARC
        </Link>

        {/* Secondary Subsystems Dropdown */}
        <div className="relative group ml-1">
          <button
            type="button"
            className="px-2.5 py-1.5 rounded text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#131313] transition-colors flex items-center gap-1 text-[11px] font-mono border border-transparent hover:border-[#222222]"
          >
            <span>MORE</span>
            <span className="text-[9px] text-[#666666] group-hover:text-[#a3a3a3]">▼</span>
          </button>
          <div className="absolute left-0 mt-1 w-64 bg-[#101010] border border-[#222222] rounded-lg shadow-2xl p-2 hidden group-hover:grid grid-cols-2 gap-1 z-50">
            <Link href="/control/autonomy" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Autonomy</Link>
            <Link href="/control/objectives" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Objectives</Link>
            <Link href="/control/protocol" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Protocol</Link>
            <Link href="/control/runtime" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Runtime</Link>
            <Link href="/control/operations" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Operations</Link>
            <Link href="/economy/clearing" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Clearinghouse</Link>
            <Link href="/treasury" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Treasury</Link>
            <Link href="/swarms" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Swarms</Link>
            <Link href="/simulator" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Simulator</Link>
            <Link href="/constitution" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Constitution</Link>
            <Link href="/approvals" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Approvals</Link>
            <Link href="/activity" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Activity</Link>
            <Link href="/overview" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Overview</Link>
            <Link href="/agents" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Agents</Link>
            <Link href="/network" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Network</Link>
            <Link href="/demo" className="px-2.5 py-1.5 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#171717] rounded transition-colors">Replay Demo</Link>
          </div>
        </div>
      </nav>

      {/* Mobile sub-nav */}
      <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-[#222222] bg-[#070707] overflow-x-auto text-xs font-mono">
        <Link
          href="/control"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isControlActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          CONTROL
        </Link>
        <Link
          href="/missions"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isMissionsActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          MISSIONS
        </Link>
        <Link
          href="/marketplace"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isMarketplaceActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          MARKETPLACE
        </Link>
        <Link
          href="/economy"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isEconomyActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          ECONOMY
        </Link>
        <Link
          href="/security"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isSecurityActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          SECURITY
        </Link>
        <Link
          href="/arc"
          className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
            isArcActive
              ? 'text-[#f5f5f5] font-bold bg-[#1a1a1a] border border-[#2a2a2a]'
              : 'text-[#a3a3a3] bg-[#101010] border border-[#222222]'
          }`}
        >
          ARC
        </Link>
      </div>
    </>
  );
}
