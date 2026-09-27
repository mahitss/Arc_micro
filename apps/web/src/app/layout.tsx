import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { HeaderNav } from '../components/HeaderNav';
import { SystemStatusBanner } from '../components/SystemStatusBanner';
import { GlobalTopBar } from '../components/GlobalTopBar';
import { AgentPayShell } from '../components/AgentPayShell';

export const metadata: Metadata = {
  title: 'AgentPay — Autonomous Economic Operating System',
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
      <body className="min-h-screen bg-[#080808] text-[#F2F0EA] antialiased selection:bg-[#1A1A1A] selection:text-white">
        <GlobalTopBar />
        <div className="hidden w-full" aria-hidden="true">
          <HeaderNav />
          <SystemStatusBanner />
        </div>
        <AgentPayShell>{children}</AgentPayShell>
      </body>
    </html>
  );
}
