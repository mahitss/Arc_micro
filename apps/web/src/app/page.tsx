import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4">
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span>Arc Blockchain Ecosystem</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
        AgentPay
      </h1>

      <p className="mt-4 text-xl sm:text-2xl text-teal-300/90 font-medium max-w-2xl">
        Programmable USDC infrastructure for autonomous agents.
      </p>

      <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl font-normal leading-relaxed">
        Let AI agents request economic actions while deterministic policy and on-chain controls decide what can actually happen.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
        >
          Open Dashboard →
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700/80 transition-all"
        >
          View Architecture
        </Link>
      </div>

      {/* Pipeline Diagram */}
      <div className="mt-16 w-full max-w-4xl p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-left">
        <div className="text-xs font-mono text-teal-400 uppercase tracking-wider mb-6 text-center">
          Execution & Authorization Pipeline
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] font-mono text-teal-400">Step 01</div>
            <div className="text-sm font-semibold text-white mt-1">AI Agent</div>
            <p className="text-xs text-slate-400 mt-1">
              Analyzes user task and creates structured payment intent.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] font-mono text-teal-400">Step 02</div>
            <div className="text-sm font-semibold text-white mt-1">Rust Policy</div>
            <p className="text-xs text-slate-400 mt-1">
              Mathematically evaluates spending limits and allowlists (ALLOW/DENY).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] font-mono text-teal-400">Step 03</div>
            <div className="text-sm font-semibold text-white mt-1">AgentVault</div>
            <p className="text-xs text-slate-400 mt-1">
              On-chain smart contract enforces limits and fund custody.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] font-mono text-teal-400">Step 04</div>
            <div className="text-sm font-semibold text-white mt-1">Arc Settlement</div>
            <p className="text-xs text-slate-400 mt-1">
              Finalized USDC settlement directly on the Arc blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
