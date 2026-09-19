export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono mb-6">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span>Arc Microgrants Foundation</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-tight">
        AgentPay
      </h1>

      <p className="mt-4 text-xl sm:text-2xl text-slate-300 max-w-2xl font-light">
        Programmable USDC infrastructure for autonomous agents.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
        >
          Open Dashboard →
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700/80 transition-all"
        >
          Architecture Spec
        </a>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full text-left">
        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="text-xs font-mono text-teal-400 uppercase tracking-wider mb-2">01. Gateway</div>
          <div className="text-white font-medium text-sm">High-Throughput Go Ingestion</div>
          <p className="text-xs text-slate-400 mt-1">Direct agent intent streaming, RPC pooling, and WebSocket event telemetry.</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="text-xs font-mono text-teal-400 uppercase tracking-wider mb-2">02. Policy Engine</div>
          <div className="text-white font-medium text-sm">Deterministic Rust Limits</div>
          <p className="text-xs text-slate-400 mt-1">Mathematical spending rules, recipient whitelists, and zero-float precision.</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="text-xs font-mono text-teal-400 uppercase tracking-wider mb-2">03. Settlement</div>
          <div className="text-white font-medium text-sm">On-Chain Arc AgentVault</div>
          <p className="text-xs text-slate-400 mt-1">Finalized programmable USDC settlement directly on the Arc blockchain.</p>
        </div>
      </div>
    </div>
  );
}
