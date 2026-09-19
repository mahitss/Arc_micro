import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentPay - Programmable USDC for Autonomous Agents",
  description: "Deterministic, programmable USDC payment infrastructure for autonomous AI agents on the Arc blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
        <header className="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                AP
              </div>
              <span className="font-semibold text-lg tracking-tight text-white group-hover:text-teal-400 transition-colors">
                AgentPay
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Arc Network
              </span>
            </a>

            <nav className="flex items-center space-x-6">
              <a
                href="/"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Overview
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-slate-400 hover:text-teal-400 transition-colors"
              >
                Docs
              </a>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
