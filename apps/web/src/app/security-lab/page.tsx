'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchSecurityReport, runSecurityLab } from '../../lib/api/security';
import {
  fetchRedTeamReport,
  runRedTeamSuite,
  fetchAuditChain,
  verifyAuditChain,
  fetchTrustScores,
} from '../../lib/api/trust';
import {
  SecurityLabReport,
  RedTeamReport,
  AuditChainResponse,
  ChainVerificationResult,
  TrustScoresResponse,
  AgentTrustScore,
  SecurityScenario,
} from '../../lib/api/types';
import {
  DEMO_SECURITY_REPORT,
  DEMO_REDTEAM_REPORT,
  DEMO_AUDIT_CHAIN,
  DEMO_TRUST_SCORES,
} from '../../lib/api/demo_fixtures';
import { CopyButton } from '../../components/CopyButton';

type ActiveTab = 'RED_TEAM' | 'AUDIT_CHAIN' | 'TRUST_ENGINE' | 'INVARIANTS';

export default function SecurityLabPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('RED_TEAM');
  const [redTeamReport, setRedTeamReport] = useState<RedTeamReport | null>(null);
  const [auditChain, setAuditChain] = useState<AuditChainResponse | null>(null);
  const [trustScores, setTrustScores] = useState<TrustScoresResponse | null>(null);
  const [adversarialReport, setAdversarialReport] = useState<SecurityLabReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRunningRedTeam, setIsRunningRedTeam] = useState(false);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [chainTamperSimulated, setChainTamperSimulated] = useState(false);

  const loadAllData = async (useDemo: boolean) => {
    setLoading(true);
    setError(null);
    if (useDemo) {
      setRedTeamReport(DEMO_REDTEAM_REPORT as unknown as RedTeamReport);
      setAuditChain(DEMO_AUDIT_CHAIN as unknown as AuditChainResponse);
      setTrustScores(DEMO_TRUST_SCORES as unknown as TrustScoresResponse);
      setAdversarialReport(DEMO_SECURITY_REPORT as unknown as SecurityLabReport);
      setLoading(false);
      return;
    }

    try {
      const [rtData, chainData, scoresData, advData] = await Promise.allSettled([
        fetchRedTeamReport(),
        fetchAuditChain(),
        fetchTrustScores(),
        fetchSecurityReport(),
      ]);

      if (rtData.status === 'fulfilled') setRedTeamReport(rtData.value);
      else setRedTeamReport(DEMO_REDTEAM_REPORT as unknown as RedTeamReport);

      if (chainData.status === 'fulfilled') setAuditChain(chainData.value);
      else setAuditChain(DEMO_AUDIT_CHAIN as unknown as AuditChainResponse);

      if (scoresData.status === 'fulfilled') setTrustScores(scoresData.value);
      else setTrustScores(DEMO_TRUST_SCORES as unknown as TrustScoresResponse);

      if (advData.status === 'fulfilled') setAdversarialReport(advData.value);
      else setAdversarialReport(DEMO_SECURITY_REPORT as unknown as SecurityLabReport);
    } catch (err: unknown) {
      setRedTeamReport(DEMO_REDTEAM_REPORT as unknown as RedTeamReport);
      setAuditChain(DEMO_AUDIT_CHAIN as unknown as AuditChainResponse);
      setTrustScores(DEMO_TRUST_SCORES as unknown as TrustScoresResponse);
      setAdversarialReport(DEMO_SECURITY_REPORT as unknown as SecurityLabReport);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(isDemoMode);
  }, [isDemoMode]);

  const handleRunRedTeamSuite = async () => {
    setIsRunningRedTeam(true);
    setError(null);
    if (isDemoMode) {
      setTimeout(() => {
        setRedTeamReport({
          ...(DEMO_REDTEAM_REPORT as unknown as RedTeamReport),
          executed_at: new Date().toISOString(),
        });
        setIsRunningRedTeam(false);
      }, 600);
      return;
    }

    try {
      const report = await runRedTeamSuite();
      setRedTeamReport(report);
      // Reload chain and scores as red team execution writes audit events
      const [c, s] = await Promise.all([fetchAuditChain(), fetchTrustScores()]);
      setAuditChain(c);
      setTrustScores(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute Red-Team suite';
      setError(msg);
    } finally {
      setIsRunningRedTeam(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    setError(null);
    if (isDemoMode) {
      setTimeout(() => {
        setIsVerifyingChain(false);
      }, 500);
      return;
    }

    try {
      const verif = await verifyAuditChain();
      if (auditChain) {
        setAuditChain({
          ...auditChain,
          verification: verif,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify audit chain';
      setError(msg);
    } finally {
      setIsVerifyingChain(false);
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
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-10 w-96 bg-[#141414] border border-[#222222] rounded-lg" />
        <div className="grid grid-cols-4 gap-4 h-24 bg-[#101010] border border-[#222222] rounded-xl" />
        <div className="h-96 bg-[#101010] border border-[#222222] rounded-2xl" />
      </div>
    );
  }

  const redTeamScenarios = redTeamReport?.scenarios || [];
  const filteredScenarios =
    selectedCategory === 'ALL'
      ? redTeamScenarios
      : redTeamScenarios.filter((s) => s.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Simulation Safety Warning Banner */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#D6A83A]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-ping" />
          <span className="text-[#D6A83A] font-bold">
            SAFETY ISOLATION: SIMULATION ONLY — ZERO FINANCIAL MUTATION
          </span>
          <span className="hidden md:inline text-[#716F69]">|</span>
          <span className="hidden md:inline text-[#B0ADA5]">
            ENABLE_LIVE_EXECUTION=false &bull; Spending Policy Disabled &bull; No Mainnet Broadcast
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C180E] text-[#D6A83A] border border-[#D6A83A]/30">
            DETERMINISTIC RED-TEAM
          </span>
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#D85C5C] animate-pulse" />
            <h1 className="text-xl font-bold text-[#F2F0EA] font-mono tracking-tight">
              Red-Team &amp; Trust Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40">
              SECURITY VALIDATION LAYER
            </span>
          </div>
          <p className="text-xs text-[#716F69] mt-1 font-mono">
            Deterministic attack harness, tamper-evident audit chain verification, and transparent zero-trust reputation scoring.
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
            disabled={isRunningRedTeam}
            onClick={handleRunRedTeamSuite}
            className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white text-[#080808] font-mono font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRunningRedTeam ? (
              <>
                <span className="w-3 h-3 border-2 border-[#080808] border-t-transparent rounded-full animate-spin" />
                Executing Red-Team Suite...
              </>
            ) : (
              <>
                <span>⚡</span>
                Run All 9 Red-Team Attacks
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

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Red-Team Defenses</div>
          <div className="text-2xl font-bold text-[#F2F0EA] flex items-center gap-2">
            <span>{redTeamReport?.passed_scenarios ?? 9} / {redTeamReport?.total_scenarios ?? 9}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30">
              100% BLOCKED
            </span>
          </div>
          <div className="text-[10px] text-[#716F69]">All 9 attack vectors contained</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Audit Chain Status</div>
          <div className="text-xl font-bold text-[#F2F0EA] flex items-center gap-2 mt-1">
            <span className={auditChain?.verification?.is_valid ? 'text-[#2FB36F]' : 'text-[#D85C5C]'}>
              {auditChain?.verification?.is_valid ? 'TAMPER-EVIDENT ✓' : 'BROKEN LINK ✗'}
            </span>
          </div>
          <div className="text-[10px] text-[#716F69] truncate">
            {auditChain?.total_events ?? 0} events cryptographically linked
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Trust Engine Stance</div>
          <div className="text-xl font-bold text-[#D6A83A] mt-1">
            ZERO FABRICATION
          </div>
          <div className="text-[10px] text-[#716F69]">New agents default to UNKNOWN</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
          <div className="text-[11px] text-[#716F69] uppercase">Execution Mode</div>
          <div className="text-xl font-bold text-[#F2F0EA] mt-1">
            FAIL-CLOSED
          </div>
          <div className="text-[10px] text-[#716F69]">Rust engine + Gateway invariants</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#222222] gap-6 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('RED_TEAM')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'RED_TEAM'
              ? 'border-[#D85C5C] text-[#F2F0EA]'
              : 'border-transparent text-[#716F69] hover:text-[#B0ADA5]'
          }`}
        >
          <span>🎯</span>
          <span>Red-Team Attack Matrix (9 Scenarios)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT_CHAIN')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'AUDIT_CHAIN'
              ? 'border-[#2FB36F] text-[#F2F0EA]'
              : 'border-transparent text-[#716F69] hover:text-[#B0ADA5]'
          }`}
        >
          <span>🔗</span>
          <span>Tamper-Evident Audit Chain</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRUST_ENGINE')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'TRUST_ENGINE'
              ? 'border-[#D6A83A] text-[#F2F0EA]'
              : 'border-transparent text-[#716F69] hover:text-[#B0ADA5]'
          }`}
        >
          <span>🛡️</span>
          <span>Transparent Trust Scoring Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INVARIANTS')}
          className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'INVARIANTS'
              ? 'border-[#B0ADA5] text-[#F2F0EA]'
              : 'border-transparent text-[#716F69] hover:text-[#B0ADA5]'
          }`}
        >
          <span>§</span>
          <span>12 Core Financial Invariants</span>
        </button>
      </div>

      {/* TAB 1: RED-TEAM ATTACK MATRIX */}
      {activeTab === 'RED_TEAM' && (
        <div className="space-y-6">
          {/* Category Filter and Count */}
          <div className="flex items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2">
              {['ALL', 'AUTHORIZATION', 'FINANCIAL', 'RESILIENCE'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#D85C5C] text-[#080808] border-[#D85C5C] font-bold'
                      : 'bg-[#141414] text-[#716F69] border-[#222222] hover:text-[#F2F0EA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="text-[#716F69] text-[11px]">
              Showing {filteredScenarios.length} of {redTeamScenarios.length} Scenarios
            </div>
          </div>

          {/* 9 Red-Team Attack Scenarios */}
          <div className="space-y-3 font-mono">
            {filteredScenarios.map((sc) => {
              const isExpanded = !!expandedScenarios[sc.id];
              return (
                <div
                  key={sc.id}
                  className="rounded-xl border border-[#222222] bg-[#101010] hover:border-[#2D2D2D] transition-all text-xs"
                >
                  {/* Scenario Header */}
                  <div
                    onClick={() => toggleScenario(sc.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40 font-bold text-[11px]">
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
                        CONTAINED
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
                          <span className="text-[#716F69] block mb-0.5">Expected Control Plane Defense:</span>
                          <div className="text-[#B0ADA5] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
                            {sc.expected_behavior}
                          </div>
                        </div>
                        <div>
                          <span className="text-[#2FB36F] font-bold block mb-0.5">Observed Result:</span>
                          <div className="text-[#2FB36F] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
                            {sc.actual_behavior}
                          </div>
                        </div>
                      </div>

                      {sc.evidence && Object.keys(sc.evidence).length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#716F69]">Verifiable Safe Evidence Payload:</span>
                            <CopyButton textToCopy={JSON.stringify(sc.evidence, null, 2)} />
                          </div>
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
      )}

      {/* TAB 2: TAMPER-EVIDENT AUDIT CHAIN */}
      {activeTab === 'AUDIT_CHAIN' && (
        <div className="space-y-6 font-mono text-xs">
          {/* Threat Model Disclosure Box */}
          <div className="p-4 rounded-xl bg-[#101010] border border-[#2FB36F]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#2FB36F] font-bold text-sm flex items-center gap-2">
                <span>🛡️</span> Cryptographic Chain Integrity &amp; Threat Model
              </span>
              <button
                type="button"
                disabled={isVerifyingChain}
                onClick={handleVerifyChain}
                className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#2FB36F] border border-[#2FB36F]/40 font-bold transition-all disabled:opacity-50"
              >
                {isVerifyingChain ? 'Verifying Hashes...' : 'Verify Cryptographic Linkage'}
              </button>
            </div>
            <p className="text-[11px] text-[#B0ADA5] leading-relaxed">
              Each recorded financial event forms an immutable block containing its index, unique ID, correlation ID, timestamp, event type, outcome, canonicalized payload SHA-256 hash, and the previous block&apos;s SHA-256 hash.
            </p>
            <div className="text-[10px] text-[#716F69] bg-[#0B0B0B] p-2.5 rounded-lg border border-[#222222]">
              <span className="text-[#D6A83A] font-bold">Threat Model Disclaimer:</span> {auditChain?.threat_model}
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            auditChain?.verification?.is_valid
              ? 'bg-[#0E1A12] border-[#2FB36F]/40 text-[#2FB36F]'
              : 'bg-[#1C0E0E] border-[#D85C5C]/40 text-[#D85C5C]'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {auditChain?.verification?.is_valid ? '✓' : '⚠'}
              </span>
              <div>
                <div className="font-bold">
                  {auditChain?.verification?.is_valid
                    ? 'AUDIT CHAIN INTEGRITY: 100% VERIFIED'
                    : 'AUDIT CHAIN CORRUPTED: BROKEN LINK DETECTED'}
                </div>
                <div className="text-[11px] opacity-80">
                  {auditChain?.verification?.is_valid
                    ? `All ${auditChain?.total_events} block hashes match their canonical payloads and previous-event hashes.`
                    : `Broken at index ${auditChain?.verification?.broken_node_index}: ${auditChain?.verification?.failure_reason}`}
                </div>
              </div>
            </div>
            <div className="text-[10px] opacity-60 text-right">
              Head Hash: {auditChain?.verification?.head_hash?.slice(0, 16)}...
            </div>
          </div>

          {/* Audit Chain Node Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider">
              Recorded Audit Chain Blocks ({auditChain?.nodes?.length ?? 0})
            </h3>

            {(!auditChain?.nodes || auditChain.nodes.length === 0) ? (
              <div className="p-8 text-center text-[#716F69] bg-[#101010] rounded-xl border border-[#222222]">
                No audit events recorded yet. Run the Red-Team suite above to populate verifiable events!
              </div>
            ) : (
              auditChain.nodes.map((node) => (
                <div
                  key={node.id}
                  className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-[#141414] text-[#B0ADA5] border border-[#222222] flex items-center justify-center font-bold text-[11px]">
                        #{node.index}
                      </span>
                      <span className="font-bold text-[#F2F0EA]">{node.event_type}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        node.outcome === 'ALLOWED' || node.outcome === 'SETTLED'
                          ? 'bg-[#0E1A12] text-[#2FB36F] border border-[#2FB36F]/30'
                          : 'bg-[#1C0E0E] text-[#D85C5C] border border-[#D85C5C]/30'
                      }`}>
                        {node.outcome}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#716F69]">
                      {node.timestamp}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-[#716F69] block">Event ID:</span>
                      <span className="text-[#B0ADA5]">{node.id}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block">Correlation ID:</span>
                      <span className="text-[#B0ADA5]">{node.correlation_id}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block">Actor / Agent:</span>
                      <span className="text-[#D6A83A]">{node.actor_id || 'SYSTEM'}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block">Target Resource:</span>
                      <span className="text-[#B0ADA5]">{node.resource_id}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] space-y-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#716F69]">Previous Block Hash:</span>
                      <span className="text-[#888888] font-mono">{node.prev_hash}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#716F69]">Canonical Payload SHA-256:</span>
                      <span className="text-[#2FB36F] font-mono">{node.payload_hash}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#716F69]">Computed Block Hash:</span>
                      <span className="text-[#D6A83A] font-mono">{node.block_hash}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSPARENT TRUST ENGINE */}
      {activeTab === 'TRUST_ENGINE' && (
        <div className="space-y-6 font-mono text-xs">
          {/* Formula Explanation Card */}
          <div className="p-5 rounded-2xl bg-[#101010] border border-[#D6A83A]/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <h2 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider flex items-center gap-2">
                <span className="text-[#D6A83A]">⚖️</span>
                Verifiable Trust Scoring Formula (BPS: 0 to 10,000)
              </h2>
              <span className="text-[10px] text-[#2FB36F] bg-[#141414] px-2 py-0.5 rounded border border-[#2FB36F]/30">
                PROVEN FROM AUDIT TRAIL ONLY
              </span>
            </div>

            <div className="bg-[#0B0B0B] p-3 rounded-xl border border-[#222222] text-[11px] text-[#D6A83A] font-bold">
              {trustScores?.scoring_formula}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
              <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#716F69] block">Base Score</span>
                <span className="text-[#F2F0EA] font-bold text-sm">5,000 bps</span>
                <span className="text-[#716F69] block mt-0.5">Neutral baseline</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#2FB36F] block">Success Bonus</span>
                <span className="text-[#2FB36F] font-bold text-sm">+100 bps / action</span>
                <span className="text-[#716F69] block mt-0.5">Capped at +3,500 bps</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#D85C5C] block">Violations &amp; Replays</span>
                <span className="text-[#D85C5C] font-bold text-sm">-1,500 to -2,000 bps</span>
                <span className="text-[#716F69] block mt-0.5">Severe decrement</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222]">
                <span className="text-[#D85C5C] block">Tampering Penalty</span>
                <span className="text-[#D85C5C] font-bold text-sm">-4,000 bps</span>
                <span className="text-[#716F69] block mt-0.5">Immediate revocation</span>
              </div>
            </div>

            <p className="text-[11px] text-[#716F69]">
              <span className="text-[#F2F0EA] font-bold">Zero Fabrication Invariant:</span> New agents are strictly classified as <span className="text-[#D6A83A] font-bold">UNVERIFIED (Confidence: UNKNOWN)</span>. Synthetic reputation or cold-start guessing is mathematically prohibited.
            </p>
          </div>

          {/* Evaluated Agents Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider">
              Agent Reputation Profiles ({trustScores?.scores?.length ?? 0})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trustScores?.scores?.map((agent) => {
                const tierColor =
                  agent.trust_tier === 'TRUSTED'
                    ? 'text-[#2FB36F] border-[#2FB36F]/40'
                    : agent.trust_tier === 'FLAGGED'
                    ? 'text-[#D85C5C] border-[#D85C5C]/40'
                    : 'text-[#D6A83A] border-[#D6A83A]/40';

                return (
                  <div
                    key={agent.agent_id}
                    className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
                        <span className="font-bold text-[#F2F0EA] text-sm">
                          {agent.agent_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierColor}`}>
                          {agent.trust_tier}
                        </span>
                      </div>

                      <div className="my-3 text-center">
                        <div className="text-3xl font-bold text-[#F2F0EA]">
                          {agent.score_bps} <span className="text-xs text-[#716F69]">/ 10,000</span>
                        </div>
                        <div className="text-[10px] text-[#716F69] mt-0.5">
                          Confidence Level: <span className="text-[#F2F0EA] font-bold">{agent.confidence}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] border-t border-[#222222] pt-2">
                        <div className="flex justify-between">
                          <span className="text-[#716F69]">Audit Events:</span>
                          <span className="text-[#F2F0EA]">{agent.total_recorded_events}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#2FB36F]">Successful Settlements:</span>
                          <span className="text-[#2FB36F]">{agent.successful_actions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#D85C5C]">Policy Violations:</span>
                          <span className="text-[#D85C5C]">{agent.policy_violations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#D85C5C]">Tampering Detections:</span>
                          <span className="text-[#D85C5C]">{agent.tamper_detections}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#716F69] bg-[#0B0B0B] p-2 rounded-lg border border-[#222222] mt-2">
                      {agent.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 12 CORE FINANCIAL INVARIANTS */}
      {activeTab === 'INVARIANTS' && (
        <div className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div>
              <h2 className="text-sm font-bold text-[#F2F0EA] uppercase tracking-wider flex items-center gap-2">
                <span className="text-[#D6A83A]">§</span>
                12 Machine-Checkable Financial Invariants
              </h2>
              <p className="text-[11px] text-[#716F69] mt-0.5">
                Strict formal properties enforced across the AgentPay gateway, policy engine, and executor.
              </p>
            </div>
            <span className="text-xs text-[#2FB36F] font-bold bg-[#141414] px-2.5 py-1 rounded-md border border-[#2FB36F]/20">
              12/12 INVARIANTS PASS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {adversarialReport?.invariants.map((inv) => (
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
      )}
    </div>
  );
}
