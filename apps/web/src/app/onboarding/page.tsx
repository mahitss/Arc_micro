'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiRequest } from '../../lib/api/client';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, organization, isAuthenticated, loading: authLoading } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Agent fields
  const [agentName, setAgentName] = useState('autonomous-scout');
  const [agentDescription, setAgentDescription] = useState('Autonomous market research and inference agent');
  const [vaultAddress, setVaultAddress] = useState('0x7789bC3d8366782b97496165C24BD5bB09302843');
  const [createdAgentId, setCreatedAgentId] = useState<string>('');

  // Step 2: Policy fields
  const [perTxLimit, setPerTxLimit] = useState('0.50');
  const [dailyLimit, setDailyLimit] = useState('5.00');
  const [maxTxPerDay, setMaxTxPerDay] = useState('20');
  const [approvalThreshold, setApprovalThreshold] = useState('0.50');

  // Submissions & Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Agent (Step 1 -> Step 2)
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agentName.trim()) {
      setError('Agent name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ agent: { id: string; name: string } }>('/v1/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: agentName.trim(),
          description: agentDescription.trim(),
          vault_address: vaultAddress.trim(),
        }),
      });

      const agentId = res.agent.id;
      setCreatedAgentId(agentId);
      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create agent';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Configure Policy (Step 2 -> Step 3)
  const handleConfigurePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      // Convert dollars to micro-USDC (6 decimals)
      const perTxMicro = Math.round(parseFloat(perTxLimit || '0.50') * 1_000_000).toString();
      const dailyMicro = Math.round(parseFloat(dailyLimit || '5.00') * 1_000_000).toString();
      const approvalMicro = Math.round(parseFloat(approvalThreshold || '0.50') * 1_000_000).toString();
      const maxTx = parseInt(maxTxPerDay || '20', 10);

      await apiRequest(`/v1/policies/${createdAgentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          agent_id: createdAgentId,
          enabled: true,
          per_transaction_limit: perTxMicro,
          daily_limit: dailyMicro,
          max_transactions_per_day: maxTx,
          approval_threshold: approvalMicro,
          allowed_assets: 'USDC',
        }),
      });

      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save policy';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-xs font-mono text-[#716F69]">
        Loading organization session...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-12 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Progress Stepper */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#D6A83A]">
              Step {step} of 3
            </span>
            <span className="text-xs text-[#555]">•</span>
            <span className="text-xs text-[#A09D95]">
              {organization?.name || 'Organization'} Setup
            </span>
          </div>
          <Link href="/dashboard" className="text-xs text-[#716F69] hover:text-[#A09D95]">
            Skip to Dashboard →
          </Link>
        </div>

        {/* Stepper bar */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`h-1.5 rounded-full ${step >= 1 ? 'bg-[#D6A83A]' : 'bg-[#222222]'}`} />
          <div className={`h-1.5 rounded-full ${step >= 2 ? 'bg-[#D6A83A]' : 'bg-[#222222]'}`} />
          <div className={`h-1.5 rounded-full ${step >= 3 ? 'bg-[#2FB36F]' : 'bg-[#222222]'}`} />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
          {error}
        </div>
      )}

      {/* STEP 1: CREATE AGENT */}
      {step === 1 && (
        <div className="bg-[#0F0F0F] border border-[#222222] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F2F0EA]">
              Create Your First AI Agent
            </h1>
            <p className="text-xs sm:text-sm text-[#A09D95] mt-1">
              Register an economic agent. Agents propose payment intents without managing private keys.
            </p>
          </div>

          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A09D95]">Agent Name / Slug</label>
              <input
                type="text"
                required
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. data-scout-01"
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A09D95]">Role Description</label>
              <input
                type="text"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                placeholder="e.g. Autonomous agent for API queries and model fine-tuning"
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A09D95]">Arc Vault Address</label>
                <span className="text-[10px] text-[#2FB36F] font-mono">Arc Testnet Verified</span>
              </div>
              <input
                type="text"
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-xs text-[#D6A83A] font-mono outline-none"
              />
              <p className="text-[10px] text-[#716F69]">
                Pre-configured with Arc Testnet AgentVault contract (0x7789...2843).
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {submitting ? 'Registering Agent...' : 'Save Agent & Configure Policy →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: CONFIGURE POLICY */}
      {step === 2 && (
        <div className="bg-[#0F0F0F] border border-[#222222] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <div className="text-xs font-mono text-[#D6A83A] uppercase mb-1">
              Agent ID: {createdAgentId}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F2F0EA]">
              Define Spending & Approval Policy
            </h1>
            <p className="text-xs sm:text-sm text-[#A09D95] mt-1">
              Deterministic limits enforced by the Rust Policy Engine in microseconds.
            </p>
          </div>

          <form onSubmit={handleConfigurePolicy} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Per-Transaction Limit (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={perTxLimit}
                    onChange={(e) => setPerTxLimit(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                </div>
                <p className="text-[10px] text-[#716F69]">Max amount agent can spend in a single call.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Daily Spending Cap (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.10"
                    min="0.10"
                    required
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                </div>
                <p className="text-[10px] text-[#716F69]">Total budget available over any 24h rolling window.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Max Transactions Per Day</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxTxPerDay}
                  onChange={(e) => setMaxTxPerDay(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                />
                <p className="text-[10px] text-[#716F69]">Velocity throttle to prevent runaway looping.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Human Approval Threshold</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] font-mono outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#666]">USDC</span>
                </div>
                <p className="text-[10px] text-[#716F69]">Amounts above this require human supervisor sign-off.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#2B2B2B] text-xs font-medium text-[#A09D95] transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {submitting ? 'Applying Policy...' : 'Save Policy & Finalize →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: VERIFICATION & COMPLETION */}
      {step === 3 && (
        <div className="bg-[#0F0F0F] border border-[#222222] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-[#2FB36F]/10 border border-[#2FB36F]/30 flex items-center justify-center text-[#2FB36F] text-xl mx-auto">
            ✓
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#F2F0EA]">Setup Complete</h1>
            <p className="text-xs sm:text-sm text-[#A09D95]">
              Your AI agent and deterministic policy rules are committed to the database.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#716F69]">ORGANIZATION:</span>
              <span className="text-[#F2F0EA]">{organization?.name || user?.organization_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716F69]">AGENT:</span>
              <span className="text-[#D6A83A]">{agentName} ({createdAgentId})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716F69]">PER-TX CAP:</span>
              <span className="text-[#2FB36F]">${perTxLimit} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716F69]">DAILY CAP:</span>
              <span className="text-[#2FB36F]">${dailyLimit} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716F69]">ARC VAULT:</span>
              <span className="text-[#B0ADA5]">0x7789bC3d8366782b97496165C24BD5bB09302843</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#716F69]">LIVE EXECUTION:</span>
              <span className="text-[#D85C5C]">DISABLED (Testnet Safe Mode)</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-lg bg-[#D6A83A] hover:bg-[#e0b74c] text-black font-bold text-xs uppercase tracking-wider transition-all"
          >
            Open Management Dashboard →
          </button>
        </div>
      )}
    </div>
  );
}
