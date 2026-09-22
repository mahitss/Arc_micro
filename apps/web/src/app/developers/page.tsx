'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<'typescript' | 'python' | 'cli'>('typescript');

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                DEVELOPER PLATFORM v1
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ARC CHAIN ID: 5042
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Give Your AI Agent Controlled Access to Payments
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base">
              Integrate programmable payments into autonomous agents without handling blockchain private keys,
              transaction signing, arbitrary recipients, or contract calldata.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/developers/quickstart"
              className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all shadow-lg shadow-cyan-900/30"
            >
              Quickstart Guide →
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/80 transition-all"
            >
              API Keys
            </Link>
          </div>
        </div>

        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg mb-3">
              🛡️
            </div>
            <h3 className="text-base font-semibold text-white">Zero Private Key Exposure</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Your agent code never touches private keys or signing logic. AgentPay functions as the isolated financial control plane.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
              ⚖️
            </div>
            <h3 className="text-base font-semibold text-white">Deterministic Policy Engine</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Spending limits, daily velocity throttles, and recipient allowlists are enforced server-side before execution.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-3">
              🛰️
            </div>
            <h3 className="text-base font-semibold text-white">Financial Flight Recorder</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Every payment generates an immutable, step-by-step audit trace with policy, human approval, and on-chain Arc evidence.
            </p>
          </div>
        </div>

        {/* Execution Modes Explanation */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950 border border-slate-800">
          <h2 className="text-base font-semibold text-white mb-3">Execution Environments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-semibold text-amber-400">SIMULATION MODE</span>
              </div>
              <p className="text-slate-400">
                Ideal for agent development, testing, and dry-run policy evaluation. Zero real USDC is transferred and no on-chain state is altered.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-semibold text-emerald-400">LIVE ARC MAINNET</span>
              </div>
              <p className="text-slate-400">
                Full production mode. Settles USDC directly on Arc Mainnet Chain ID 5042 from the enterprise-controlled AgentVault.
              </p>
            </div>
          </div>
        </div>

        {/* Code Snippet Tabs */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800/90 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/70">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('typescript')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'typescript' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                TypeScript SDK
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'python' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python SDK
              </button>
              <button
                onClick={() => setActiveTab('cli')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'cli' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                AgentPay CLI
              </button>
            </div>
            <span className="text-xs text-slate-500 font-mono">Package: @agentpay/sdk</span>
          </div>

          <div className="p-5 font-mono text-xs text-slate-300 overflow-x-auto bg-[#070a10]">
            {activeTab === 'typescript' && (
              <pre>
{`import { AgentPay } from '@agentpay/sdk';

// 1. Initialize client using organization API key
const client = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

// 2. Discover approved external services
const services = await client.services.list({ enabled: true });

// 3. Request time-bound price quote (micro-USDC: 6 decimals)
const quote = await client.services.getQuote(services[0].id, { amount: "180000" });

// 4. Request programmable payment with Idempotency Key
const payment = await client.payments.create(
  {
    agentId: 'agent_default',
    serviceId: quote.service_id,
    quoteId: quote.quote_id,
    amount: quote.amount,
    asset: 'USDC',
    purpose: 'Autonomous web research procurement'
  },
  { idempotencyKey: \`req_\${Date.now()}\` }
);

// 5. Inspect Financial Flight Recorder trace
const trace = await client.payments.trace(payment.id);
console.log('Trace status:', trace.status, 'Mode:', trace.execution_mode);`}
              </pre>
            )}

            {activeTab === 'python' && (
              <pre>
{`from agentpay import AgentPay

# 1. Initialize client using organization API key
client = AgentPay(api_key=os.environ.get("AGENTPAY_API_KEY"))

# 2. Discover approved external services
services = client.services.list(enabled=True)

# 3. Request time-bound price quote (safe string representation)
quote = client.services.quote(service_id=services[0]["id"], amount="180000")

# 4. Request programmable payment with Idempotency Key
payment = client.payments.create(
    service_id=quote["service_id"],
    quote_id=quote["quote_id"],
    amount=quote["amount"],
    asset="USDC",
    purpose="Autonomous web research procurement",
    idempotency_key=f"idem_{int(time.time() * 1000)}"
)

# 5. Inspect Financial Flight Recorder trace
trace = client.payments.trace(payment["id"])
print(f"Status: {trace['status']}, Mode: {trace['execution_mode']}")`}
              </pre>
            )}

            {activeTab === 'cli' && (
              <pre>
{`# 1. Configure CLI with API key
agentpay config set api-key ap_live_...

# 2. Discover approved service marketplace
agentpay services list

# 3. Request price quote
agentpay services quote web-research --amount 180000

# 4. Create payment intent
agentpay payments create \\
  --agent agent_alpha \\
  --service web-research \\
  --quote quote_123 \\
  --amount 180000 \\
  --purpose "Autonomous web research" \\
  --idempotency-key idem_cli_001

# 5. Retrieve Flight Recorder trace
agentpay payments trace pi_123 --json`}
              </pre>
            )}
          </div>
        </div>

        {/* Quick Links Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <Link href="/developers/quickstart" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            📖 Developer Quickstart →
          </Link>
          <Link href="/developers/webhooks" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            🔔 Webhooks Management →
          </Link>
          <Link href="/developers/events" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            📜 Domain Audit Events →
          </Link>
          <Link href="/security-lab" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            🛡️ Adversarial Security Lab →
          </Link>
        </div>
      </div>
    </div>
  );
}
