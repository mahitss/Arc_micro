'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<'typescript' | 'python' | 'cli'>('typescript');

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-[#222222] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-[#141414] text-[#B0ADA5] border border-[#222222]">
                DEVELOPER PLATFORM v1
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30">
                ARC CHAIN ID: 5042
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#F2F0EA]">
              Give Your AI Agent Controlled Access to Payments
            </h1>
            <p className="text-[#716F69] mt-2 max-w-2xl text-sm md:text-base">
              Integrate programmable payments into autonomous agents without handling blockchain private keys,
              transaction signing, arbitrary recipients, or contract calldata.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/developers/quickstart"
              className="px-4 py-2 text-sm font-semibold font-mono bg-[#F2F0EA] hover:bg-white text-[#080808] rounded-lg transition-all"
            >
              Quickstart Guide →
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 text-sm font-semibold font-mono bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] rounded-lg border border-[#222222] transition-all"
            >
              API Keys
            </Link>
          </div>
        </div>

        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center font-bold text-lg mb-3">
              🛡️
            </div>
            <h3 className="text-base font-semibold text-[#F2F0EA]">Zero Private Key Exposure</h3>
            <p className="text-xs text-[#716F69] mt-1.5 leading-relaxed">
              Your agent code never touches private keys or signing logic. AgentPay functions as the isolated financial control plane.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center font-bold text-lg mb-3">
              ⚖️
            </div>
            <h3 className="text-base font-semibold text-[#F2F0EA]">Deterministic Policy Engine</h3>
            <p className="text-xs text-[#716F69] mt-1.5 leading-relaxed">
              Spending limits, daily velocity throttles, and recipient allowlists are enforced server-side before execution.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] hover:border-[#2D2D2D] transition-all">
            <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center font-bold text-lg mb-3">
              🛰️
            </div>
            <h3 className="text-base font-semibold text-[#F2F0EA]">Financial Flight Recorder</h3>
            <p className="text-xs text-[#716F69] mt-1.5 leading-relaxed">
              Every payment generates an immutable, step-by-step audit trace with policy, human approval, and on-chain Arc evidence.
            </p>
          </div>
        </div>

        {/* Execution Modes Explanation */}
        <div className="p-5 rounded-xl bg-[#101010] border border-[#222222]">
          <h2 className="text-base font-semibold text-[#F2F0EA] mb-3">Execution Environments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]"></span>
                <span className="font-semibold text-[#D6A83A]">SIMULATION MODE</span>
              </div>
              <p className="text-[#716F69]">
                Ideal for agent development, testing, and dry-run policy evaluation. Zero real USDC is transferred and no on-chain state is altered.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F]"></span>
                <span className="font-semibold text-[#2FB36F]">LIVE ARC MAINNET</span>
              </div>
              <p className="text-[#716F69]">
                Target production mode. When ENABLE_LIVE_EXECUTION=true and AgentVault is deployed, settles native USDC on Arc Mainnet Chain ID 5042. Currently in operator-gated simulation mode.
              </p>
            </div>
          </div>
        </div>

        {/* Code Snippet Tabs */}
        <div className="rounded-xl bg-[#101010] border border-[#222222] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#222222] px-4 py-3 bg-[#0B0B0B]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('typescript')}
                className={`px-3 py-1.5 text-xs font-medium font-mono rounded-md transition-all ${
                  activeTab === 'typescript' ? 'bg-[#D6A83A] text-[#080808] font-bold' : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                TypeScript SDK
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1.5 text-xs font-medium font-mono rounded-md transition-all ${
                  activeTab === 'python' ? 'bg-[#D6A83A] text-[#080808] font-bold' : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                Python SDK
              </button>
              <button
                onClick={() => setActiveTab('cli')}
                className={`px-3 py-1.5 text-xs font-medium font-mono rounded-md transition-all ${
                  activeTab === 'cli' ? 'bg-[#D6A83A] text-[#080808] font-bold' : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                AgentPay CLI
              </button>
            </div>
            <span className="text-xs text-[#716F69] font-mono">Package: @agentpay/sdk</span>
          </div>

          <div className="p-5 font-mono text-xs text-[#F2F0EA] overflow-x-auto bg-[#080808]">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#222222]">
          <Link href="/developers/quickstart" className="text-xs text-[#716F69] hover:text-[#D6A83A] transition-colors font-mono">
            📖 Developer Quickstart →
          </Link>
          <Link href="/developers/webhooks" className="text-xs text-[#716F69] hover:text-[#D6A83A] transition-colors font-mono">
            🔔 Webhooks Management →
          </Link>
          <Link href="/developers/events" className="text-xs text-[#716F69] hover:text-[#D6A83A] transition-colors font-mono">
            📜 Domain Audit Events →
          </Link>
          <Link href="/security-lab" className="text-xs text-[#716F69] hover:text-[#D6A83A] transition-colors font-mono">
            🛡️ Adversarial Security Lab →
          </Link>
        </div>
      </div>
    </div>
  );
}
