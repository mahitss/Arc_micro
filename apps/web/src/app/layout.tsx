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
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
        <header className="border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <Link href="/overview" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                  AP
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-base tracking-tight text-white group-hover:text-teal-400 transition-colors">
                    AgentPay
                  </span>
                  <span className="text-[10px] font-mono text-teal-400 leading-none">
                    Mission Control
                  </span>
                </div>
              </Link>

              <nav className="hidden lg:flex items-center space-x-1 text-xs font-mono font-medium">
                {/* 1. CONTROL */}
                <Link
                  href="/control"
                  className="px-3 py-1.5 rounded-lg text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  CONTROL
                </Link>

                {/* 2. MISSIONS */}
                <Link
                  href="/missions"
                  className="px-3 py-1.5 rounded-lg text-teal-300 font-bold bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-teal-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  MISSIONS
                </Link>

                {/* 3. MARKETPLACE */}
                <Link
                  href="/marketplace"
                  className="px-3 py-1.5 rounded-lg text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  MARKETPLACE
                </Link>

                {/* 4. ECONOMY */}
                <Link
                  href="/economy"
                  className="px-3 py-1.5 rounded-lg text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ECONOMY
                </Link>

                {/* 5. SECURITY */}
                <Link
                  href="/security"
                  className="px-3 py-1.5 rounded-lg text-rose-300 font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  SECURITY
                </Link>

                {/* 6. ARC */}
                <Link
                  href="/arc"
                  className="px-3 py-1.5 rounded-lg text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5 shadow-sm shadow-cyan-500/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ARC
                </Link>

                {/* Secondary Subsystems Dropdown (No functionality lost) */}
                <div className="relative group ml-1">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-1 text-[11px] font-mono border border-transparent hover:border-slate-800"
                  >
                    <span>MORE</span>
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-300">▼</span>
                  </button>
                  <div className="absolute left-0 mt-1 w-64 bg-[#0a101d] border border-slate-800 rounded-xl shadow-2xl p-2 hidden group-hover:grid grid-cols-2 gap-1 z-50 backdrop-blur-md">
                    <Link href="/control/autonomy" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 rounded transition-colors">Autonomy</Link>
                    <Link href="/control/objectives" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-teal-300 hover:bg-slate-800/80 rounded transition-colors">Objectives</Link>
                    <Link href="/control/protocol" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors">Protocol</Link>
                    <Link href="/control/runtime" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors">Runtime</Link>
                    <Link href="/control/operations" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors">Operations</Link>
                    <Link href="/economy/clearing" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 rounded transition-colors">Clearinghouse</Link>
                    <Link href="/treasury" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors">Treasury</Link>
                    <Link href="/swarms" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-purple-300 hover:bg-slate-800/80 rounded transition-colors">Swarms</Link>
                    <Link href="/simulator" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 rounded transition-colors">Simulator</Link>
                    <Link href="/constitution" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 rounded transition-colors">Constitution</Link>
                    <Link href="/approvals" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-amber-300 hover:bg-slate-800/80 rounded transition-colors">Approvals</Link>
                    <Link href="/activity" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors">Activity</Link>
                    <Link href="/overview" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors">Overview</Link>
                    <Link href="/agents" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded transition-colors">Agents</Link>
                    <Link href="/network" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80 rounded transition-colors">Network</Link>
                    <Link href="/demo" className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-indigo-300 hover:bg-slate-800/80 rounded transition-colors">Replay Demo</Link>
                  </div>
                </div>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <SystemStatusBanner />
            </div>
          </div>

          {/* Mobile sub-nav: Streamlined to 6 Primary Sections */}
          <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-slate-800/60 overflow-x-auto text-xs font-mono">
            <Link href="/control" className="px-2.5 py-1 rounded text-amber-300 font-bold bg-amber-500/10 whitespace-nowrap">
              CONTROL
            </Link>
            <Link href="/missions" className="px-2.5 py-1 rounded text-teal-300 font-bold bg-teal-500/10 whitespace-nowrap">
              MISSIONS
            </Link>
            <Link href="/marketplace" className="px-2.5 py-1 rounded text-cyan-300 font-bold bg-cyan-500/10 whitespace-nowrap">
              MARKETPLACE
            </Link>
            <Link href="/economy" className="px-2.5 py-1 rounded text-emerald-300 font-bold bg-emerald-500/10 whitespace-nowrap">
              ECONOMY
            </Link>
            <Link href="/security" className="px-2.5 py-1 rounded text-rose-300 font-bold bg-rose-500/10 whitespace-nowrap">
              SECURITY
            </Link>
            <Link href="/arc" className="px-2.5 py-1 rounded text-cyan-300 font-bold bg-cyan-500/10 whitespace-nowrap">
              ARC
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
