import React from 'react';
import { NetworkBadge } from '../../components/NetworkBadge';
import { AutoExecutionBadge } from '../../components/AutoExecutionBadge';

export default function SettingsPage() {
  const configItems = [
    { label: 'Go Gateway Port', value: '8080' },
    { label: 'Rust Policy Engine URL', value: 'http://localhost:8081' },
    { label: 'Arc Chain ID', value: '5042 (Arc Mainnet Candidate)' },
    { label: 'USDC Contract Address', value: '0x3600000000000000000000000000000000000000' },
    { label: 'Arc Explorer URL', value: 'https://explorer.arc.io' },
    { label: 'Payment Intent TTL', value: '300 seconds (5 minutes)' },
    { label: 'Agent Auto-Execution', value: 'false (Manual confirmation required)' },
    { label: 'Live Blockchain Execution', value: 'false (Dry-run mode active)' },
    { label: 'Database Storage', value: 'PostgreSQL / Memory Repository' },
    { label: 'AI Reasoning Engine', value: 'Pluggable AgentModel (OpenAI JSON Mode / Mock)' },
  ];

  return (
    <div className="space-y-8">
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-white">Infrastructure Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Read-only system configuration and security boundaries for AgentPay.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="font-semibold text-slate-200">System Security Invariant</div>
          <div className="text-slate-400 mt-0.5">
            Security policies and execution flags are strictly configured via server environment variables. They cannot be altered from browser sessions.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NetworkBadge isVerifiedMainnet={false} />
          <AutoExecutionBadge autoExecutionEnabled={false} />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
        {configItems.map((item) => (
          <div key={item.label} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-400 font-sans">{item.label}</span>
            <span className="text-slate-200 font-semibold">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Developer API Credentials */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Developer Platform API Keys</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Credentials for authenticating external autonomous AI agents via the <code className="text-teal-400">@agentpay/sdk</code>.
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Tenant Isolated
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Public Key ID:</span>
            <span className="text-slate-200">key_default_demo</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Masked Key:</span>
            <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              apk_live_...cdef
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Authorized Scopes:</span>
            <span className="text-teal-400 font-sans text-[11px]">
              payments:read, payments:create, agents:read, services:read, treasury:read
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Storage Model:</span>
            <span className="text-slate-400 font-sans text-[11px]">SHA-256 Hashed (Secret cannot be retrieved)</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic">
          Tip: Generate new scoped keys via <code className="text-slate-400">POST /v1/api-keys</code> or refer to the <code className="text-slate-400">docs/developer-quickstart.md</code> guide.
        </p>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
        <h2 className="text-sm font-semibold text-white">Multi-Tier Security Architecture</h2>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            <strong className="text-slate-200">1. AI is NOT Trusted:</strong> The AI model has no private keys, cannot sign transactions, cannot directly send funds, and cannot invent arbitrary recipient addresses.
          </p>
          <p>
            <strong className="text-slate-200">2. Go Validates AI Output:</strong> The Go Gateway validates JSON schemas, enforces prompt length limits, verifies integer amounts (no floats), and resolves recipients from the Service Registry.
          </p>
          <p>
            <strong className="text-slate-200">3. Rust Decides Policy:</strong> The deterministic Rust Policy Engine evaluates mathematical spending limits and allowlists with zero clock or network side effects.
          </p>
          <p>
            <strong className="text-slate-200">4. Solidity Enforces On-Chain Rules:</strong> The AgentVault smart contract on Arc holds funds, enforces on-chain limits, checks allowlists/blocklists, and provides an emergency pause.
          </p>
          <p>
            <strong className="text-slate-200">5. Executor Holds Signing Capability:</strong> Only the isolated execution service in the Go Gateway holds signing capability. Private keys are never exposed to browser code.
          </p>
        </div>
      </div>
    </div>
  );
}
