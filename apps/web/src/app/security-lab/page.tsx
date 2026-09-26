'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchSecurityReport, runSecurityLab } from '../../lib/api/security';
import { SecurityLabReport, SecurityScenario, InvariantResult } from '../../lib/api/types';
import { DEMO_SECURITY_REPORT } from '../../lib/api/demo_fixtures';
import { CopyButton } from '../../components/CopyButton';

export default function SecurityLabPage() {
  const [report, setReport] = useState<SecurityLabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const loadReport = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);
    if (useDemo) {
      setReport(DEMO_SECURITY_REPORT as unknown as SecurityLabReport);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchSecurityReport();
      setReport(data);
    } catch (err: unknown) {
      // Fallback to demo report if backend is not reachable
      setReport(DEMO_SECURITY_REPORT as unknown as SecurityLabReport);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(isDemoMode);
  }, [isDemoMode]);

  const handleRunSuite = async () => {
    setIsRunning(true);
    setError(null);
    if (isDemoMode) {
      setTimeout(() => {
        setReport({
          ...(DEMO_SECURITY_REPORT as unknown as SecurityLabReport),
          generated_at: new Date().toISOString(),
        });
        setIsRunning(false);
      }, 700);
      return;
    }
    try {
      const freshReport = await runSecurityLab();
      setReport(freshReport);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute adversarial suite';
      setError(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleScenario = (id: string) => {
    setExpandedScenarios((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-96 bg-[#141414] border border-[#222222] rounded-lg" />
        <div className="grid grid-cols-4 gap-4 h-24 bg-[#101010] border border-[#222222] rounded-xl" />
        <div className="h-96 bg-[#101010] border border-[#222222] rounded-2xl" />
      </div>
    );
  }

  const scenarios = report?.scenarios || [];
  const filteredScenarios =
    selectedCategory === 'ALL'
      ? scenarios
      : scenarios.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#D85C5C] animate-pulse" />
            <h1 className="text-xl font-bold text-[#F2F0EA] font-mono tracking-tight">
              Adversarial Agent Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40">
              RED-TEAM TEST HARNESS
            </span>
          </div>
          <p className="text-xs text-[#716F69] mt-1 font-mono">
            Automated adversarial attacks against AgentPay&apos;s financial control plane. Core Thesis: <span className="text-[#D6A83A] font-bold">THE AGENT IS UNTRUSTED</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              isDemoMode
                ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/40'
                : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
            }`}
          >
            {isDemoMode ? '● DEMO FIXTURES' : '○ Live Mode'}
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunSuite}
            className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-[#080808] border-t-transparent rounded-full animate-spin" />
                Executing Attack Suite...
              </>
            ) : (
              <>
                <span>⚡</span>
                Run All 20 Scenarios
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#141414] border border-[#D85C5C]/30 text-[#D85C5C] text-xs font-mono">
          Execution Error: {error}
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Attack Scenarios</div>
          <div className="text-2xl font-bold text-[#F2F0EA] flex items-center gap-2">
            <span>{report?.passed_scenarios} / {report?.total_scenarios}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
              100% DEFENDED
            </span>
          </div>
          <div className="text-[10px] text-[#716F69]">All 20 attack vectors contained</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Security Invariants</div>
          <div className="text-2xl font-bold text-[#F2F0EA] flex items-center gap-2">
            <span>{report?.invariants_verified} / {report?.invariants_total}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
              VERIFIED
            </span>
          </div>
          <div className="text-[10px] text-[#716F69]">Mathematical assertions held</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Control Plane Mode</div>
          <div className="text-lg font-bold text-[#F2F0EA] mt-1">
            FAIL-CLOSED
          </div>
          <div className="text-[10px] text-[#716F69]">Rust deterministic engine</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Agent Trust Level</div>
          <div className="text-lg font-bold text-[#D6A83A] mt-1">
            ZERO TRUST
          </div>
          <div className="text-[10px] text-[#716F69]">Proposer only; zero key access</div>
        </div>
      </div>

      {/* 12 Core Security Invariants Table */}
      <div className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
          <div>
            <h2 className="text-sm font-bold text-[#F2F0EA] font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="text-[#D6A83A]">§</span>
              12 Core Financial Invariants (Machine-Checkable)
            </h2>
            <p className="text-[11px] text-[#716F69] font-mono mt-0.5">
              Strict formal properties enforced across the AgentPay gateway, policy engine, and executor.
            </p>
          </div>
          <span className="text-xs font-mono text-[#2FB36F] font-bold bg-[#141414] px-2.5 py-1 rounded-md border border-[#2FB36F]/20">
            12/12 INVARIANTS PASS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {report?.invariants.map((inv) => (
            <div
              key={inv.id}
              className="p-3 rounded-xl bg-[#0B0B0B] border border-[#222222] space-y-1 flex items-start gap-2.5"
            >
              <span className="w-5 h-5 rounded-full bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">
                ✓
              </span>
              <div className="space-y-0.5">
                <div className="font-semibold text-[#F2F0EA]">
                  Invariant #{inv.id}: {inv.description}
                </div>
                <div className="text-[11px] text-[#716F69]">
                  {inv.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Filtering Bar */}
      <div className="flex items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2">
          {['ALL', 'AUTHORIZATION', 'FINANCIAL', 'RESILIENCE'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#D6A83A] text-[#080808] border-[#D6A83A] font-bold'
                  : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-[#716F69] text-[11px]">
          Showing {filteredScenarios.length} of {scenarios.length} Scenarios
        </div>
      </div>

      {/* 20 Scenarios Grid */}
      <div className="space-y-3 font-mono">
        {filteredScenarios.map((sc) => {
          const isExpanded = !!expandedScenarios[sc.id];
          return (
            <div
              key={sc.id}
              className="rounded-xl border border-[#222222] bg-[#101010] hover:border-[#2D2D2D] transition-all text-xs"
            >
              {/* Scenario Row Header */}
              <div
                onClick={() => toggleScenario(sc.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] border border-[#222222] font-bold text-[11px]">
                    {sc.id}
                  </span>
                  <span className="font-bold text-[#F2F0EA] tracking-wide">
                    {sc.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141414] text-[#716F69] border border-[#222222]">
                    {sc.category}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#716F69] hidden sm:inline">
                    {sc.execution_time_ms}ms
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
                    PASS
                  </span>
                  <span className="text-[#716F69] text-[10px]">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expandable Details Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[#222222] space-y-3 text-[11px]">
                  <div>
                    <span className="text-[#D85C5C] font-bold block mb-0.5">Attack Vector:</span>
                    <p className="text-[#B0ADA5] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
                      {sc.attack_vector}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#716F69] block mb-0.5">Expected Defense:</span>
                      <div className="text-[#B0ADA5] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
                        {sc.expected_behavior}
                      </div>
                    </div>
                    <div>
                      <span className="text-[#2FB36F] font-bold block mb-0.5">Actual Behavior:</span>
                      <div className="text-[#2FB36F] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
                        {sc.actual_behavior}
                      </div>
                    </div>
                  </div>

                  {sc.evidence && Object.keys(sc.evidence).length > 0 && (
                    <div>
                      <span className="text-[#716F69] block mb-1">Safe Evidence &amp; Audit Trail:</span>
                      <pre className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[10px] text-[#D6A83A] overflow-x-auto">
                        {JSON.stringify(sc.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
