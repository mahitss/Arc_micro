import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { NetworkBadge } from '../components/NetworkBadge';

export const metadata: Metadata = {
  title: 'AgentPay - Programmable USDC Infrastructure for Autonomous Agents',
  description:
    'Developer control center for autonomous AI agents, deterministic spending policies, and on-chain Arc USDC settlement.',
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
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                  AP
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-base tracking-tight text-white group-hover:text-teal-400 transition-colors">
                    AgentPay
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 leading-none">
                    Control Center
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
                <Link
                  href="/demo"
                  className="px-3 py-1.5 rounded-lg text-teal-300 font-semibold bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                >
                  Live Demo
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/agents"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Agents
                </Link>
                <Link
                  href="/payment-intents"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Payment Intents
                </Link>
                <Link
                  href="/transactions"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Transactions
                </Link>
                <Link
                  href="/services"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Services
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <NetworkBadge isVerifiedMainnet={false} />
            </div>
          </div>

          {/* Mobile sub-nav */}
          <div className="md:hidden flex items-center space-x-1 px-4 py-2 border-t border-slate-800/60 overflow-x-auto text-xs font-mono">
            <Link href="/demo" className="px-2.5 py-1 rounded text-teal-300 font-semibold bg-teal-500/10 whitespace-nowrap">
              Demo
            </Link>
            <Link href="/dashboard" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Dashboard
            </Link>
            <Link href="/agents" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Agents
            </Link>
            <Link href="/payment-intents" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Intents
            </Link>
            <Link href="/transactions" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Transactions
            </Link>
            <Link href="/services" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Services
            </Link>
            <Link href="/settings" className="px-2.5 py-1 rounded text-slate-300 hover:text-white whitespace-nowrap">
              Settings
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
