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
                <Link
                  href="/overview"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Overview
                </Link>
                <Link
                  href="/missions"
                  className="px-3 py-1.5 rounded-lg text-teal-300 font-semibold bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                >
                  Missions
                </Link>
                <Link
                  href="/agents"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Agents
                </Link>
                <Link
                  href="/marketplace"
                  className="px-3 py-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-colors"
                >
                  Marketplace
                </Link>
                <Link
                  href="/economy"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Economy
                </Link>
                <Link
                  href="/approvals"
                  className="px-3 py-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors"
                >
                  Approvals
                </Link>
                <Link
                  href="/activity"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Activity
                </Link>
                <Link
                  href="/security"
                  className="px-3 py-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Security
                </Link>
                <Link
                  href="/demo"
                  className="px-3 py-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-colors"
                >
                  Live Demo
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <SystemStatusBanner />
            </div>
          </div>

          {/* Mobile sub-nav */}
          <div className="lg:hidden flex items-center space-x-1 px-4 py-2 border-t border-slate-800/60 overflow-x-auto text-xs font-mono">
            <Link href="/overview" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Overview
            </Link>
            <Link href="/missions" className="px-2.5 py-1 rounded text-teal-300 font-semibold bg-teal-500/10 whitespace-nowrap">
              Missions
            </Link>
            <Link href="/agents" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Agents
            </Link>
            <Link href="/marketplace" className="px-2.5 py-1 rounded text-cyan-300 hover:text-white whitespace-nowrap">
              Marketplace
            </Link>
            <Link href="/economy" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Economy
            </Link>
            <Link href="/approvals" className="px-2.5 py-1 rounded text-amber-300 hover:text-white whitespace-nowrap">
              Approvals
            </Link>
            <Link href="/activity" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Activity
            </Link>
            <Link href="/security" className="px-2.5 py-1 rounded text-rose-300 hover:text-white whitespace-nowrap">
              Security
            </Link>
            <Link href="/demo" className="px-2.5 py-1 rounded text-indigo-300 hover:text-white whitespace-nowrap">
              Demo
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
