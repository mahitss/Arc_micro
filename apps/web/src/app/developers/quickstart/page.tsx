'use client';

import React from 'react';
import Link from 'next/link';

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/developers" className="text-xs text-[#D6A83A] hover:underline mb-2 inline-block font-mono">
            ← Back to Developer Overview
          </Link>
          <h1 className="text-3xl font-extrabold text-[#F2F0EA]">Developer Quickstart: Zero to First Payment</h1>
          <p className="text-[#716F69] mt-2 text-sm">
            Follow this guide to give your AI agent controlled access to programmable USDC payments in under 5 minutes.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-xs font-mono">
                1
              </span>
              <h2 className="text-base font-semibold text-[#F2F0EA]">Generate an Organization API Key</h2>
            </div>
            <p className="text-xs text-[#B0ADA5]">
              Navigate to the <Link href="/settings" className="text-[#D6A83A] hover:underline">API Keys</Link> page and create a secret key with <code className="bg-[#141414] border border-[#222222] px-1 py-0.5 rounded text-[#F2F0EA]">payments:create</code> and <code className="bg-[#141414] border border-[#222222] px-1 py-0.5 rounded text-[#F2F0EA]">services:read</code> scopes.
            </p>
            <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222] font-mono text-xs text-[#B0ADA5]">
              export AGENTPAY_API_KEY=&quot;ap_live_your_organization_key&quot;
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-xs font-mono">
                2
              </span>
              <h2 className="text-base font-semibold text-[#F2F0EA]">Install the SDK</h2>
            </div>
            <p className="text-xs text-[#B0ADA5]">
              Install the lightweight SDK in your autonomous agent environment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222] font-mono text-xs text-[#F2F0EA]">
                <span className="text-[#716F69]"># TypeScript / Node.js</span>
                <br />npm install @agentpay/sdk
              </div>
              <div className="bg-[#0B0B0B] p-3 rounded-lg border border-[#222222] font-mono text-xs text-[#F2F0EA]">
                <span className="text-[#716F69]"># Python</span>
                <br />pip install agentpay
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-xs font-mono">
                3
              </span>
              <h2 className="text-base font-semibold text-[#F2F0EA]">Discover Services &amp; Request a Quote</h2>
            </div>
            <p className="text-xs text-[#B0ADA5]">
              Autonomous agents discover available services from the registry rather than receiving arbitrary wallet addresses.
            </p>
            <pre className="bg-[#0B0B0B] p-4 rounded-lg border border-[#222222] font-mono text-xs text-[#F2F0EA] overflow-x-auto">
{`const services = await client.services.list({ enabled: true });
const quote = await client.services.getQuote(services[0].id, {
  amount: "180000", // 0.18 USDC in micro-units
  asset: "USDC"
});`}
            </pre>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-xs font-mono">
                4
              </span>
              <h2 className="text-base font-semibold text-[#F2F0EA]">Create Payment Intent with Idempotency Key</h2>
            </div>
            <p className="text-xs text-[#B0ADA5]">
              Provide an <code className="bg-[#141414] border border-[#222222] px-1 py-0.5 rounded text-[#F2F0EA]">idempotencyKey</code> to guarantee that retrying a network failure never causes double-charging.
            </p>
            <pre className="bg-[#0B0B0B] p-4 rounded-lg border border-[#222222] font-mono text-xs text-[#F2F0EA] overflow-x-auto">
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
          <div className="p-6 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-xs font-mono">
                5
              </span>
              <h2 className="text-base font-semibold text-[#F2F0EA]">Inspect Financial Flight Recorder Trace</h2>
            </div>
            <p className="text-xs text-[#B0ADA5]">
              Verify the complete policy decision and blockchain settlement trail:
            </p>
            <pre className="bg-[#0B0B0B] p-4 rounded-lg border border-[#222222] font-mono text-xs text-[#F2F0EA] overflow-x-auto">
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
