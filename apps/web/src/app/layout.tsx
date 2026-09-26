import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SystemStatusBanner } from '../components/SystemStatusBanner';

export const metadata: Metadata = {
  title: 'AgentPay - Autonomous Mission Control Center',
  description:
    'The control center for an autonomous AI economy. Deterministic spending policies, keyless agents, and on-chain Arc USDC settlement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070707] text-[#f5f5f5] antialiased selection:bg-[#202020] selection:text-white">
        <header className="border-b border-[#202020] bg-[#070707] sticky top-0 z-40">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <Link href="/control" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 rounded bg-[#121212] border border-[#262626] flex items-center justify-center font-bold text-[#f5f5f5] text-xs tracking-wider">
                  AP
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-[#f5f5f5]">
                    AgentPay
                  </span>
                  <span className="text-[10px] text-[#a1a1a1] leading-none">
                    Financial Control Plane
                  </span>
                </div>
              </Link>

              <nav className="hidden lg:flex items-center space-x-1 text-xs font-mono font-medium">
                {/* 1. CONTROL */}
                <Link
                  href="/control"
                  className="px-3 py-1.5 rounded text-[#f5f5f5] font-bold bg-[#151515] border border-[#2c2c2c] hover:bg-[#1a1a1a] transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  CONTROL
                </Link>

                {/* 2. MISSIONS */}
                <Link
                  href="/missions"
                  className="px-3 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent hover:border-[#202020] transition-colors flex items-center gap-1.5"
                >
                  MISSIONS
                </Link>

                {/* 3. MARKETPLACE */}
                <Link
                  href="/marketplace"
                  className="px-3 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent hover:border-[#202020] transition-colors flex items-center gap-1.5"
                >
                  MARKETPLACE
                </Link>

                {/* 4. ECONOMY */}
                <Link
                  href="/economy"
                  className="px-3 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent hover:border-[#202020] transition-colors flex items-center gap-1.5"
                >
                  ECONOMY
                </Link>

                {/* 5. SECURITY */}
                <Link
                  href="/security"
                  className="px-3 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent hover:border-[#202020] transition-colors flex items-center gap-1.5"
                >
                  SECURITY
                </Link>

                {/* 6. ARC */}
                <Link
                  href="/arc"
                  className="px-3 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] border border-transparent hover:border-[#202020] transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                  ARC
                </Link>

                {/* Secondary Subsystems Dropdown (No functionality lost) */}
                <div className="relative group ml-1">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#121212] transition-colors flex items-center gap-1 text-[11px] font-mono border border-transparent hover:border-[#202020]"
                  >
                    <span>MORE</span>
                    <span className="text-[9px] text-[#666666] group-hover:text-[#a1a1a1]">▼</span>
                  </button>
                  <div className="absolute left-0 mt-1 w-64 bg-[#101010] border border-[#202020] rounded-lg shadow-2xl p-2 hidden group-hover:grid grid-cols-2 gap-1 z-50">
                    <Link href="/control/autonomy" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Autonomy</Link>
                    <Link href="/control/objectives" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Objectives</Link>
                    <Link href="/control/protocol" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Protocol</Link>
                    <Link href="/control/runtime" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Runtime</Link>
                    <Link href="/control/operations" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Operations</Link>
                    <Link href="/economy/clearing" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Clearinghouse</Link>
                    <Link href="/treasury" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Treasury</Link>
                    <Link href="/swarms" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Swarms</Link>
                    <Link href="/simulator" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Simulator</Link>
                    <Link href="/constitution" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Constitution</Link>
                    <Link href="/approvals" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Approvals</Link>
                    <Link href="/activity" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Activity</Link>
                    <Link href="/overview" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Overview</Link>
                    <Link href="/agents" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Agents</Link>
                    <Link href="/network" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Network</Link>
                    <Link href="/demo" className="px-2.5 py-1.5 text-xs text-[#a1a1a1] hover:text-[#f5f5f5] hover:bg-[#151515] rounded transition-colors">Replay Demo</Link>
                  </div>
                </div>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <SystemStatusBanner />
            </div>
          </div>

          {/* Mobile sub-nav: Streamlined to 6 Primary Sections */}
          <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-[#202020] bg-[#070707] overflow-x-auto text-xs font-mono">
            <Link href="/control" className="px-2.5 py-1 rounded text-[#f5f5f5] font-bold bg-[#151515] border border-[#2c2c2c] whitespace-nowrap">
              CONTROL
            </Link>
            <Link href="/missions" className="px-2.5 py-1 rounded text-[#a1a1a1] hover:text-[#f5f5f5] bg-[#101010] border border-[#202020] whitespace-nowrap">
              MISSIONS
            </Link>
            <Link href="/marketplace" className="px-2.5 py-1 rounded text-[#a1a1a1] hover:text-[#f5f5f5] bg-[#101010] border border-[#202020] whitespace-nowrap">
              MARKETPLACE
            </Link>
            <Link href="/economy" className="px-2.5 py-1 rounded text-[#a1a1a1] hover:text-[#f5f5f5] bg-[#101010] border border-[#202020] whitespace-nowrap">
              ECONOMY
            </Link>
            <Link href="/security" className="px-2.5 py-1 rounded text-[#a1a1a1] hover:text-[#f5f5f5] bg-[#101010] border border-[#202020] whitespace-nowrap">
              SECURITY
            </Link>
            <Link href="/arc" className="px-2.5 py-1 rounded text-[#a1a1a1] hover:text-[#f5f5f5] bg-[#101010] border border-[#202020] whitespace-nowrap">
              ARC
            </Link>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
