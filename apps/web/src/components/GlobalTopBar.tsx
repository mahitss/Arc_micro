'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AgentPayCommandPalette, useToast } from './ui';
import { fetchSystemHealth } from '../lib/api/health';
import { SystemHealth } from '../lib/api/types';
import { useAuth } from '../lib/auth/AuthContext';

export function GlobalTopBar() {
  const pathname = usePathname();
  const { user, organization, isAuthenticated, logout } = useAuth();
  const { success: toastSuccess } = useToast();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup';

  useEffect(() => {
    fetchSystemHealth().then(setHealth).catch(() => null);
    const interval = setInterval(() => {
      fetchSystemHealth().then(setHealth).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const isLiveMainnet = health?.is_mainnet_verified || false;
  const isGatewayHealthy = health?.gateway === 'HEALTHY' || health?.gateway_status === 'ONLINE';
  const isArcConnected = health?.arc_rpc_status === 'CONNECTED' || health?.arc_rpc === 'HEALTHY';
  const isPolicyOnline = health?.policy_engine_status === 'ONLINE' || health?.policy_engine === 'HEALTHY';
  const isPolicyReady = isPolicyOnline || health?.policy_engine_status === 'READY (SIM)' || isGatewayHealthy;
  const isRuntimeHealthy = health?.runtime_status === 'HEALTHY' || isGatewayHealthy;
  const isAIConnected = health?.ai_status === 'READY' || health?.ai_status === 'CONNECTED' || isGatewayHealthy;

  const renderStatusDot = (isOk: boolean, isDegraded = false) => {
    if (isOk) return <span className="w-1.5 h-1.5 rounded-full bg-[#2FB36F] shrink-0" />;
    if (isDegraded) return <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A] shrink-0" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-[#D85C5C] shrink-0" />;
  };

  return (
    <>
      <header className="border-b border-[#222222] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-40 h-14 select-none">
        <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left: Product Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
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

          {/* Center Navigation on Public Routes */}
          {isPublicRoute ? (
            <nav className="hidden md:flex items-center gap-6 text-xs text-[#A09D95]">
              <a href="/#capabilities" className="hover:text-[#F2F0EA] transition-colors">Capabilities</a>
              <a href="/#how-it-works" className="hover:text-[#F2F0EA] transition-colors">How It Works</a>
              <a href="/#security" className="hover:text-[#F2F0EA] transition-colors">Security & Policy</a>
              <a href="/#architecture" className="hover:text-[#F2F0EA] transition-colors">Architecture</a>
              <a href="/#testnet" className="hover:text-[#F2F0EA] transition-colors">Arc Testnet</a>
            </nav>
          ) : (
            /* Center: Command Palette Search Bar on Dashboard Routes */
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
          )}

          {/* Right: Mode & Subsystem Indicators or Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
            {isPublicRoute ? (
              <div className="flex items-center gap-3">
                {/* Testnet Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-[#222222] text-[11px] font-mono text-[#A09D95]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D6A83A]" />
                  <span>Arc Testnet</span>
                </div>

                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard"
                      className="px-3 py-1.5 rounded-md bg-[#D6A83A] text-black font-semibold text-xs hover:bg-[#e0b74c] transition-colors"
                    >
                      Open Dashboard →
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="px-2.5 py-1.5 rounded-md text-[#716F69] hover:text-[#F2F0EA] text-xs transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/login"
                      className="px-3 py-1.5 rounded-md text-[#F2F0EA] hover:bg-[#1A1A1A] text-xs font-medium transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-3 py-1.5 rounded-md bg-[#F2F0EA] text-black font-semibold text-xs hover:bg-white transition-colors"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                <div
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-[#222222] text-[11px] font-sans font-medium shrink-0 whitespace-nowrap"
                  title={
                    isArcConnected
                      ? 'Arc Testnet RPC (Chain ID 5042): Online'
                      : 'Arc RPC: UNAVAILABLE (Unable to reach JSON-RPC endpoint)'
                  }
                >
                  <span className="text-[#716F69]">ARC</span>
                  {renderStatusDot(isArcConnected)}
                  <span className="text-[#F2F0EA] font-semibold">{isArcConnected ? 'CONNECTED' : 'UNAVAILABLE'}</span>
                  <span className="text-[9px] font-mono text-[#716F69] border border-[#222222] px-1 rounded">SIM · 5042</span>
                </div>

                {/* AI Status */}
                <div
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-[#222222] text-[11px] font-sans font-medium shrink-0 whitespace-nowrap"
                  title="AI reasoning is strictly advisory (INV-01 & INV-02: Zero financial authority)"
                >
                  <span className="text-[#716F69]">AI</span>
                  {renderStatusDot(isAIConnected)}
                  <span className="text-[#F2F0EA] font-semibold">{isAIConnected ? 'READY' : 'UNAVAILABLE'}</span>
                  <span className="text-[9px] font-mono text-[#716F69] border border-[#222222] px-1 rounded">ADVISORY ONLY</span>
                </div>

                {/* Policy Status */}
                <div
                  className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-[#222222] text-[11px] font-sans font-medium shrink-0 whitespace-nowrap"
                  title={
                    isPolicyOnline
                      ? 'Rust Policy Engine HTTP API: Online (<10µs evaluation)'
                      : 'Deterministic Rust Policy Engine: READY (SIMULATION). Constitutional invariants active.'
                  }
                >
                  <span className="text-[#716F69]">POLICY</span>
                  {renderStatusDot(isPolicyReady, !isPolicyOnline)}
                  <span className="text-[#F2F0EA] font-semibold">{isPolicyOnline ? 'ONLINE' : (isPolicyReady ? 'READY (SIM)' : 'UNAVAILABLE')}</span>
                </div>

                {/* Runtime Status */}
                <div
                  className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101010] border border-[#222222] text-[11px] font-sans font-medium shrink-0 whitespace-nowrap"
                  title="Autonomous Runtime: Operating in deterministic simulation mode"
                >
                  <span className="text-[#716F69]">RUNTIME</span>
                  {renderStatusDot(isRuntimeHealthy)}
                  <span className="text-[#F2F0EA] font-semibold">{isRuntimeHealthy ? 'HEALTHY' : 'UNAVAILABLE'}</span>
                  {isRuntimeHealthy && (
                    <span className="text-[9px] font-mono text-[#D6A83A] border border-[#D6A83A]/30 bg-[#D6A83A]/10 px-1 rounded">
                      SIM
                    </span>
                  )}
                </div>

                {/* User / Org Avatar & Dropdown Menu */}
                {user ? (
                  <div className="relative pl-2 border-l border-[#222222]">
                    <button
                      onClick={() => setUserMenuOpen((prev) => !prev)}
                      className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#141414] border border-transparent hover:border-[#2B2B2B] transition-all text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#8F7028] to-[#D6A83A] text-black font-bold text-xs flex items-center justify-center font-mono shrink-0 shadow-sm">
                        {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                      </div>
                      <div className="hidden sm:block text-left pr-1">
                        <div className="text-xs font-semibold text-[#F2F0EA] leading-none flex items-center gap-1.5">
                          <span>{user.name}</span>
                          <span className="text-[10px] text-[#716F69]">▾</span>
                        </div>
                        <div className="text-[10px] text-[#B0ADA5] font-mono leading-tight mt-0.5 truncate max-w-[120px]">
                          {organization?.name || user.role}
                        </div>
                      </div>
                    </button>

                    {/* Interactive Dropdown Card */}
                    {userMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#101010]/95 backdrop-blur-xl border border-[#2B2B2B] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                        onMouseLeave={() => setUserMenuOpen(false)}
                      >
                        {/* Header Profile */}
                        <div className="flex items-center gap-3 pb-3 border-b border-[#222222]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8F7028] to-[#D6A83A] text-black font-bold text-sm flex items-center justify-center font-mono shrink-0">
                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[#F2F0EA] truncate">{user.name}</div>
                            <div className="text-[11px] text-[#716F69] truncate font-mono">{user.email}</div>
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-[#D6A83A]/15 text-[#D6A83A] border border-[#D6A83A]/30 uppercase">
                              {user.role}
                            </span>
                          </div>
                        </div>

                        {/* Organization Section */}
                        <div className="py-2.5 px-2 mt-2 rounded-lg bg-[#141414] border border-[#222222]">
                          <div className="text-[10px] uppercase font-semibold tracking-wider text-[#716F69] mb-1">
                            Active Organization
                          </div>
                          <div className="text-xs font-medium text-[#F2F0EA] truncate">
                            {organization?.name || 'Default Organization'}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[10px] font-mono text-[#716F69] truncate">
                              ID: {user.organization_id || organization?.id || 'org_default'}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.organization_id || organization?.id || 'org_default');
                                toastSuccess('Organization ID copied to clipboard');
                              }}
                              className="text-[10px] font-mono text-[#D6A83A] hover:underline shrink-0"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        {/* Menu Navigation Links */}
                        <div className="py-1.5 space-y-0.5 mt-1">
                          <Link
                            href="/dashboard"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#181818] transition-colors"
                          >
                            <span>⎈</span>
                            <span>Command Dashboard</span>
                          </Link>
                          <Link
                            href="/developers"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#181818] transition-colors"
                          >
                            <span>⚡</span>
                            <span>Developer API Keys</span>
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#181818] transition-colors"
                          >
                            <span>⚙</span>
                            <span>Organization Settings</span>
                          </Link>
                          <Link
                            href="/security"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#B0ADA5] hover:text-[#F2F0EA] hover:bg-[#181818] transition-colors"
                          >
                            <span>🛡</span>
                            <span>Security & Audit Chain</span>
                          </Link>
                        </div>

                        {/* Sign Out Action */}
                        <div className="pt-2 border-t border-[#222222] mt-1">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#D85C5C]/10 hover:bg-[#D85C5C]/20 text-[#D85C5C] text-xs font-semibold transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#181818] border border-[#2B2B2B] flex items-center justify-center font-mono text-[10px] text-[#D6A83A] font-semibold">
                    OP
                  </div>
                )}
              </>
            )}
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
