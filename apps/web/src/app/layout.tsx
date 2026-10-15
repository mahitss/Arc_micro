import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth/AuthContext';
import { GlobalTopBar } from '../components/GlobalTopBar';
import { HeaderNav } from '../components/HeaderNav';
import { SystemStatusBanner } from '../components/SystemStatusBanner';
import { AgentPayShell } from '../components/AgentPayShell';

export const metadata: Metadata = {
  title: 'AgentPay — Autonomous Agent Financial Infrastructure',
  description:
    'Programmatic spending policies, keyless AI agents, and deterministic vault settlement on Arc.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080808] text-[#F2F0EA] antialiased selection:bg-[#1A1A1A] selection:text-white">
        <AuthProvider>
          <GlobalTopBar />
          <div className="hidden w-full" aria-hidden="true">
            <HeaderNav />
            <SystemStatusBanner />
          </div>
          <AgentPayShell>{children}</AgentPayShell>
        </AuthProvider>
      </body>
    </html>
  );
}
