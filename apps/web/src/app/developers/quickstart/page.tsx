'use client';

import React from 'react';
import Link from 'next/link';

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/developers" className="text-xs text-cyan-400 hover:underline mb-2 inline-block">
            ← Back to Developer Overview
          </Link>
          <h1 className="text-3xl font-extrabold text-white">Developer Quickstart: Zero to First Payment</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Follow this guide to give your AI agent controlled access to programmable USDC payments in under 5 minutes.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h2 className="text-base font-semibold text-white">Generate an Organization API Key</h2>
            </div>
            <p className="text-xs text-slate-300">
              Navigate to the <Link href="/settings" className="text-cyan-400 hover:underline">API Keys</Link> page and create a secret key with <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">payments:create</code> and <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">services:read</code> scopes.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-400">
              export AGENTPAY_API_KEY=&quot;ap_live_your_organization_key&quot;
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h2 className="text-base font-semibold text-white">Install the SDK</h2>
            </div>
            <p className="text-xs text-slate-300">
              Install the lightweight SDK in your autonomous agent environment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                <span className="text-slate-500"># TypeScript / Node.js</span>
                <br />npm install @agentpay/sdk
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                <span className="text-slate-500"># Python</span>
                <br />pip install agentpay
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h2 className="text-base font-semibold text-white">Discover Services &amp; Request a Quote</h2>
            </div>
            <p className="text-xs text-slate-300">
              Autonomous agents discover available services from the registry rather than receiving arbitrary wallet addresses.
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
{`const services = await client.services.list({ enabled: true });
const quote = await client.services.getQuote(services[0].id, {
  amount: "180000", // 0.18 USDC in micro-units
  asset: "USDC"
});`}
            </pre>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h2 className="text-base font-semibold text-white">Create Payment Intent with Idempotency Key</h2>
            </div>
            <p className="text-xs text-slate-300">
              Provide an <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">idempotencyKey</code> to guarantee that retrying a network failure never causes double-charging.
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
{`const payment = await client.payments.create(
  {
    agentId: 'agent_alpha',
    serviceId: quote.service_id,
    quoteId: quote.quote_id,
    amount: quote.amount,
    asset: 'USDC',
    purpose: 'Market research query'
  },
  { idempotencyKey: 'task_001_run_01' }
);

console.log('Payment status:', payment.status); // AUTHORIZED, APPROVAL_REQUIRED, or DENIED`}
            </pre>
          </div>

          {/* Step 5 */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                5
              </span>
              <h2 className="text-base font-semibold text-white">Inspect Financial Flight Recorder Trace</h2>
            </div>
            <p className="text-xs text-slate-300">
              Verify the complete policy decision and blockchain settlement trail:
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto">
{`const trace = await client.payments.trace(payment.id);
console.log('Trace ID:', trace.trace_id);
console.log('Steps:', trace.steps.map(s => \`[\${s.type}] \${s.status}\`));`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
