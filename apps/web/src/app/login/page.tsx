'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push('/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // Navigation is handled inside login()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
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
            Sign in to AgentPay
          </h1>
          <p className="text-xs text-[#A09D95] mt-1">
            Access your organization&apos;s autonomous agents and spending policies.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0F0F0F] border border-[#222222] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[#D85C5C]/10 border border-[#D85C5C]/30 text-xs text-[#D85C5C] font-mono">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A09D95]">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@company.com"
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#D6A83A] rounded-lg px-3 py-2 text-sm text-[#F2F0EA] outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A09D95]">Password</label>
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
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1C1C1C] text-center text-xs text-[#716F69]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#D6A83A] hover:underline font-medium">
              Create an organization
            </Link>
          </div>
        </div>

        <div className="text-center text-[11px] text-[#555] mt-6">
          Protected by deterministic tenant isolation and HTTP-only sessions.
        </div>
      </div>
    </div>
  );
}
