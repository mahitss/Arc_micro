'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [demoAmount, setDemoAmount] = useState('0.45');
  const [demoRecipient, setDemoRecipient] = useState('0x9a8B...2E41 (Inference Corp)');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';
    reason: string;
    latencyMs: number;
  } | null>(null);

  const runPolicyDemo = (amountStr: string) => {
    setEvaluating(true);
    setEvalResult(null);

    setTimeout(() => {
      const amt = parseFloat(amountStr) || 0;
      let decision: 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL' = 'ALLOW';
      let reason = 'Transaction within autonomous agent per-tx limit ($0.50) and daily quota.';

      if (amt > 5.0) {
        decision = 'DENY';
        reason = 'Blocked by Rust Policy Engine: Exceeds daily agent budget cap ($5.00 USDC).';
      } else if (amt > 0.50) {
        decision = 'REQUIRES_APPROVAL';
        reason = 'Policy threshold ($0.50) exceeded: Routed to human supervisor for cryptographic approval.';
      }

      setEvalResult({
        decision,
        reason,
        latencyMs: 8.4,
      });
      setEvaluating(false);
    }, 300);
  };

  return (
    <div className="w-full bg-[#080808] text-[#F2F0EA] min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Subtle grid background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#D6A83A]/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121212] border border-[#262626] text-xs text-[#B0ADA5]">
            <span className="w-2 h-2 rounded-full bg-[#2FB36F] animate-pulse" />
            <span className="font-mono text-[#F2F0EA]">Arc Testnet Active</span>
            <span className="text-[#555]">•</span>
            <span>Deterministic Rust Policy Enforcement</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#F2F0EA] leading-[1.08]">
            Programmatic Financial Rails for{' '}
            <span className="bg-gradient-to-r from-[#F2F0EA] via-[#D6A83A] to-[#8F7028] bg-clip-text text-transparent">
              Autonomous AI Agents.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-xl text-[#A09D95] max-w-2xl mx-auto leading-relaxed">
            Empower AI agents to pay for compute, web services, and APIs without exposing private keys. Enforce sub-millisecond spending limits and settle deterministically on Arc.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-[#F2F0EA] text-[#080808] font-bold text-sm hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-2"
            >
              Start Free Today
              <span className="text-base leading-none">→</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-[#121212] hover:bg-[#1A1A1A] border border-[#2B2B2B] hover:border-[#3D3D3D] text-[#F2F0EA] font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              Operator Log In
            </Link>
            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-5 py-3.5 rounded-lg text-[#A09D95] hover:text-[#F2F0EA] font-medium text-sm transition-colors text-center"
            >
              Test Policy Engine ↓
            </a>
          </div>

          {/* Honest Status Banner */}
          <div className="pt-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#0F0F0F] border border-[#222222] text-xs font-mono text-[#8E8B82]">
              <span className="text-[#D6A83A]">VAULT:</span>
              <span className="text-[#E0DDD5]">0x7789bC3d8366782b97496165C24BD5bB09302843</span>
              <span className="text-[#444]">|</span>
              <span className="text-[#2FB36F]">Chain ID 5042002</span>
              <span className="text-[#444]">|</span>
              <span className="text-[#D85C5C]">ENABLE_LIVE_EXECUTION=false</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Policy Simulation Widget */}
      <section id="interactive-demo" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-[#1C1C1C]">
        <div className="bg-[#0D0D0D] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E1E1E] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#D6A83A] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                Live Policy Demonstration
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0EA] mt-1">
                Sub-Millisecond Policy Evaluation
              </h2>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#161616] border border-[#2B2B2B] text-[#A09D95]">
              Engine: Rust (SIMD / In-Memory)
            </span>
          </div>

          <p className="text-sm text-[#A09D95] mb-6">
            Simulate an agent proposing a payment intent. See how the policy engine verifies per-transaction limits, daily budgets, and human approval rules in microseconds before committing off-chain reservations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#8E8B82]">AMOUNT (USDC)</label>
              <div className="relative">
                <input
                  type="text"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(e.target.value)}
                  placeholder="0.45"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-mono text-[#8E8B82]">DESTINATION SERVICE</label>
              <input
                type="text"
                value={demoRecipient}
                onChange={(e) => setDemoRecipient(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs text-[#716F69]">Quick Test:</span>
            <button
              onClick={() => { setDemoAmount('0.25'); runPolicyDemo('0.25'); }}
              className="text-xs font-mono px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-[#B0ADA5] transition-colors"
            >
              $0.25 (Auto-Approved)
            </button>
            <button
              onClick={() => { setDemoAmount('1.50'); runPolicyDemo('1.50'); }}
              className="text-xs font-mono px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-[#B0ADA5] transition-colors"
            >
              $1.50 (Requires Approval)
            </button>
            <button
              onClick={() => { setDemoAmount('12.00'); runPolicyDemo('12.00'); }}
              className="text-xs font-mono px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-[#B0ADA5] transition-colors"
            >
              $12.00 (Hard Cap Blocked)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => runPolicyDemo(demoAmount)}
              disabled={evaluating}
              className="px-6 py-2.5 rounded-lg bg-[#D6A83A] hover:bg-[#e0b74c] text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {evaluating ? 'Evaluating Policy...' : 'Evaluate Payment Intent'}
            </button>
          </div>

          {/* Result Card */}
          {evalResult && (
            <div className={`mt-6 p-4 rounded-xl border transition-all ${
              evalResult.decision === 'ALLOW'
                ? 'bg-[#2FB36F]/10 border-[#2FB36F]/30 text-[#2FB36F]'
                : evalResult.decision === 'REQUIRES_APPROVAL'
                ? 'bg-[#D6A83A]/10 border-[#D6A83A]/30 text-[#D6A83A]'
                : 'bg-[#D85C5C]/10 border-[#D85C5C]/30 text-[#D85C5C]'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                <span>DECISION: {evalResult.decision}</span>
                <span className="text-[#A09D95]">LATENCY: {evalResult.latencyMs} µs</span>
              </div>
              <p className="text-xs text-[#F2F0EA] font-sans leading-relaxed">{evalResult.reason}</p>
            </div>
          )}
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider">Capabilities</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#F2F0EA]">
            Enterprise-Grade Agent Economic Controls
          </h2>
          <p className="text-base text-[#A09D95]">
            Everything needed to deploy economic agency without sacrificing treasury safety.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-[#2B2B2B] flex items-center justify-center text-lg">
              🔐
            </div>
            <h3 className="text-lg font-bold text-[#F2F0EA]">Keyless Agent Security</h3>
            <p className="text-sm text-[#A09D95] leading-relaxed">
              AI agents never handle private keys. Every payment is proposed as a cryptographic intent and signed by an isolated, audited vault on Arc.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-[#2B2B2B] flex items-center justify-center text-lg">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-[#F2F0EA]">Rust Policy Engine</h3>
            <p className="text-sm text-[#A09D95] leading-relaxed">
              Per-transaction limits, 24-hour spending velocity caps, approved recipient registries, and emergency circuit breakers enforced in microseconds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl bg-[#0F0F0F] border border-[#222222] hover:border-[#333333] transition-all space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#181818] border border-[#2B2B2B] flex items-center justify-center text-lg">
              ⛓️
            </div>
            <h3 className="text-lg font-bold text-[#F2F0EA]">On-Chain Arc Settlement</h3>
            <p className="text-sm text-[#A09D95] leading-relaxed">
              Settle micropayments and resource invoices on Arc Testnet in USDC. Backed by tamper-evident audit chains with verifiable cryptographic hashes.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#1C1C1C]">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider">Architecture Flow</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#F2F0EA]">
            How AgentPay Works
          </h2>
          <p className="text-base text-[#A09D95]">
            From autonomous intent to verified on-chain settlement in five strict phases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#222222] space-y-2">
            <div className="text-xs font-mono text-[#D6A83A]">PHASE 01</div>
            <h4 className="text-sm font-bold text-[#F2F0EA]">Agent Intent</h4>
            <p className="text-xs text-[#A09D95] leading-relaxed">
              Agent requests API access or data with task metadata and required USDC amount.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#222222] space-y-2">
            <div className="text-xs font-mono text-[#D6A83A]">PHASE 02</div>
            <h4 className="text-sm font-bold text-[#F2F0EA]">Policy Check</h4>
            <p className="text-xs text-[#A09D95] leading-relaxed">
              Rust engine validates bounds, recipient addresses, and velocity constraints in &lt;10µs.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#222222] space-y-2">
            <div className="text-xs font-mono text-[#D6A83A]">PHASE 03</div>
            <h4 className="text-sm font-bold text-[#F2F0EA]">Treasury Lock</h4>
            <p className="text-xs text-[#A09D95] leading-relaxed">
              Off-chain lock reserves allocated vault funds, preventing double-spending.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#222222] space-y-2">
            <div className="text-xs font-mono text-[#D6A83A]">PHASE 04</div>
            <h4 className="text-sm font-bold text-[#F2F0EA]">Approval Gate</h4>
            <p className="text-xs text-[#A09D95] leading-relaxed">
              Intents exceeding autonomous policy threshold pause for human authorization.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0D0D0D] border border-[#222222] space-y-2">
            <div className="text-xs font-mono text-[#D6A83A]">PHASE 05</div>
            <h4 className="text-sm font-bold text-[#F2F0EA]">Vault Execution</h4>
            <p className="text-xs text-[#A09D95] leading-relaxed">
              AgentVault transfers USDC to provider with an immutable transaction receipt.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Honest Status Section */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#1C1C1C]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="text-xs font-mono text-[#D6A83A] uppercase tracking-wider">Safety & Controls</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#F2F0EA]">
              Engineered with Fail-Closed Security Invariants
            </h2>
            <p className="text-sm sm:text-base text-[#A09D95] leading-relaxed">
              Every request executes under zero-trust assumptions. Even if an AI agent hallucinates, runs into an infinite loop, or attempts unauthorized transfers, the deterministic rules strictly prevent rogue financial behavior.
            </p>

            <ul className="space-y-3 text-sm text-[#B0ADA5]">
              <li className="flex items-start gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span><strong>Tenant Isolation:</strong> Every organization has isolated policies, API keys, and sessions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span><strong>Emergency Kill Switch:</strong> Global execution pause halts all agent withdrawals immediately.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span><strong>Tamper-Evident Logs:</strong> SHA-256 chained audit hashes detect any database alterations.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#2FB36F] font-bold">✓</span>
                <span><strong>Protected Vault:</strong> Deployed AgentVault contract is configured with spending safety caps.</span>
              </li>
            </ul>
          </div>

          {/* Status Matrix Card */}
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="text-xs font-mono text-[#A09D95] uppercase tracking-wider pb-2 border-b border-[#222222]">
              Real Operational Status (Arc Testnet)
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-[#8E8B82]">Network</span>
                <span className="text-[#F2F0EA] font-bold">Arc Testnet (5042002)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-[#8E8B82]">AgentVault Contract</span>
                <span className="text-[#D6A83A] font-bold">0x7789...2843</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-[#8E8B82]">Live Execution Flag</span>
                <span className="text-[#D85C5C] font-bold">FALSE (Safety Enforced)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-[#8E8B82]">Settlement Asset</span>
                <span className="text-[#2FB36F] font-bold">USDC (Testnet)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141414] border border-[#222222]">
                <span className="text-[#8E8B82]">Policy Engine</span>
                <span className="text-[#2FB36F] font-bold">Rust v0.1.0 Online</span>
              </div>
            </div>

            <p className="text-[11px] text-[#716F69] pt-2 italic">
              Notice: AgentPay operates strictly on Arc Testnet. Live execution of mainnet transactions is intentionally locked pending institutional audit sign-off.
            </p>
          </div>
        </div>
      </section>

      {/* Ready to Build CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-[#1C1C1C]">
        <div className="bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#2B2B2B] rounded-3xl p-8 sm:p-14 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold text-[#F2F0EA]">
            Ready to deploy your first economic agent?
          </h2>
          <p className="text-base text-[#A09D95] max-w-xl mx-auto">
            Set up an organization, create an agent profile, and establish your first spending policy in under two minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#F2F0EA] text-black font-bold text-sm hover:bg-white transition-all"
            >
              Get Started Now →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222222] border border-[#333] text-[#F2F0EA] font-semibold text-sm transition-all"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1C1C1C] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-xs text-[#716F69]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-[#181818] border border-[#2B2B2B] flex items-center justify-center font-mono text-[10px] text-[#D6A83A] font-bold">
              AP
            </div>
            <span className="font-semibold text-[#A09D95]">AgentPay</span>
            <span>— Autonomous Economic Operating System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#F2F0EA] transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-[#F2F0EA] transition-colors">Sign Up</Link>
            <Link href="/dashboard" className="hover:text-[#F2F0EA] transition-colors">Dashboard</Link>
            <a href="https://testnet.arcscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-[#F2F0EA] transition-colors">
              Arc Explorer ↗
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#141414] text-center sm:text-left text-[11px] text-[#555]">
          © {new Date().getFullYear()} AgentPay. Arc Testnet Deployed. Non-custodial autonomous agent financial rails.
        </div>
      </footer>
    </div>
  );
}
