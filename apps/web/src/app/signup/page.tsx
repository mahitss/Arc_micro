'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // If already authenticated and key displayed, allow proceed
  if (isAuthenticated && !createdKey) {
    router.push('/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await signup(email, password, name, orgName);
      if (res.api_key && res.api_key.secret) {
        setCreatedKey(res.api_key.secret);
      } else {
        router.push('/onboarding');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12 bg-[#080808]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2B2B2B] flex items-center justify-center font-bold text-[#F2F0EA] text-xs font-mono">
              AP
            </div>
            <span className="font-bold text-lg text-[#F2F0EA]">AgentPay</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
            Create your organization
          </h1>
          <p className="text-xs text-[#A09D95] mt-1">
            Deploy deterministic financial rails for your autonomous AI agents.
          </p>
        </div>

        {/* API Key Display Modal / Screen after successful creation */}
        {createdKey ? (
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="w-10 h-10 rounded-full bg-[#2FB36F]/10 border border-[#2FB36F]/30 flex items-center justify-center text-[#2FB36F] text-lg mx-auto">
              ✓
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-[#F2F0EA]">Organization Created</h2>
              <p className="text-xs text-[#A09D95]">
                Here is your initial developer API key. Save it securely; it will not be shown again.
              </p>
            </div>

            <div className="p-3 bg-[#141414] border border-[#2B2B2B] rounded-lg">
              <div className="text-[10px] font-mono text-[#716F69] uppercase mb-1">DEVELOPER API KEY</div>
              <div className="text-xs font-mono text-[#D6A83A] break-all select-all font-semibold">
                {createdKey}
              </div>
            </div>

            <button
              onClick={() => router.push('/onboarding')}
              className="w-full py-3 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all"
            >
              Continue to Agent Setup →
            </button>
          </div>
        ) : (
          /* Registration Form */
          <div className="bg-[#0F0F0F] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A09D95]">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Autonomous Labs"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#A09D95]">Password</label>
                  <span className="text-[10px] text-[#716F69]">Min. 8 characters</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#F2F0EA] hover:bg-white text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account & Organization'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#1C1C1C] text-center text-xs text-[#716F69]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#D6A83A] hover:underline font-medium">
                Log in
              </Link>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-[#555] mt-6">
          By registering, your organization is provisioned with Arc Testnet credentials.
        </div>
      </div>
    </div>
  );
}
