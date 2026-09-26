import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SystemStatusBanner } from '../components/SystemStatusBanner';
import { HeaderNav } from '../components/HeaderNav';

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

              <HeaderNav />
            </div>

            <div className="flex items-center space-x-3">
              <SystemStatusBanner />
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
