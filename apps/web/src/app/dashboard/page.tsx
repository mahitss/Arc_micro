export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">AgentPay Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor autonomous agent spending, policy decisions, and Arc vault status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400">Vault Balance</div>
          <div className="text-2xl font-bold text-white mt-1">0.00 <span className="text-sm font-normal text-teal-400">USDC</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Arc Mainnet (Pre-deployment)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400">Gateway Status</div>
          <div className="text-lg font-semibold text-emerald-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Healthy
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Port 8080</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400">Policy Engine</div>
          <div className="text-lg font-semibold text-emerald-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Deterministic
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Zero-Float Invariant</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs font-mono text-slate-400">Active Agents</div>
          <div className="text-2xl font-bold text-white mt-1">0</div>
          <div className="text-[11px] text-slate-500 mt-1">No agents registered yet</div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6">
        <h2 className="text-base font-semibold text-white mb-2">System Pipeline Status</h2>
        <div className="text-xs text-slate-400 font-mono space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          <div>[Pipeline] AI Agent → Payment Intent → Go Gateway → Rust Policy Engine → AgentVault → Arc</div>
          <div>[Contracts] AgentVault smart contracts prepared for Foundry toolchain.</div>
          <div>[Deployment] Arc Mainnet deployment scheduled for subsequent task.</div>
        </div>
      </div>
    </div>
  );
}
