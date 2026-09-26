'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  EconomicConstitution,
  PolicyDiff,
  PolicyChangeRequest,
  ConstitutionDecision,
  getActiveConstitution,
  listConstitutions,
  getConstitution,
  diffConstitutions,
  evaluateConstitution,
  testConstitution,
  activateConstitution,
  rollbackConstitution,
  listChangeRequests,
  MOCK_GENESIS_CONSTITUTION,
  MOCK_V2_CONSTITUTION,
} from '@/lib/api/constitution';
import { PolicyHierarchyTree } from '@/components/constitution/PolicyHierarchyTree';
import { PolicyDiffViewer } from '@/components/constitution/PolicyDiffViewer';
import { AuthorityDeltaBadge } from '@/components/constitution/AuthorityDeltaBadge';

export default function ConstitutionPage() {
  const [activeConstitution, setActiveConstitution] = useState<EconomicConstitution>(MOCK_GENESIS_CONSTITUTION);
  const [constitutions, setConstitutions] = useState<EconomicConstitution[]>([MOCK_GENESIS_CONSTITUTION, MOCK_V2_CONSTITUTION]);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [currentDiff, setCurrentDiff] = useState<PolicyDiff | null>(null);
  const [changeRequests, setChangeRequests] = useState<PolicyChangeRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'hierarchy' | 'diff' | 'playground' | 'changes'>('rules');

  // Playground state
  const [evalAgentId, setEvalAgentId] = useState('research-agent-01');
  const [evalAmount, setEvalAmount] = useState('1250000000'); // $1,250.00 USDC
  const [evalCurrency, setEvalCurrency] = useState('USDC');
  const [evalRecipient, setEvalRecipient] = useState('agent_auditor_01');
  const [evalRiskScore, setEvalRiskScore] = useState(42);
  const [evalDecision, setEvalDecision] = useState<ConstitutionDecision | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Test suite state
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Activation & Rollback state
  const [isPending, startTransition] = useTransition();
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [activeRes, listRes, changesRes] = await Promise.all([
          getActiveConstitution(),
          listConstitutions(),
          listChangeRequests(),
        ]);
        if (activeRes.constitution) {
          setActiveConstitution(activeRes.constitution);
          setSelectedVersion(activeRes.constitution.version);
        }
        if (listRes.constitutions?.length) {
          setConstitutions(listRes.constitutions);
        }
        if (changesRes.change_requests?.length) {
          setChangeRequests(changesRes.change_requests);
        }
      } catch (err) {
        console.error('Failed to load initial constitution data:', err);
      }
    }
    loadData();
  }, []);

  // Compute diff when switching to diff tab
  useEffect(() => {
    async function loadDiff() {
      try {
        const res = await diffConstitutions(1, 2);
        setCurrentDiff(res.diff);
      } catch (err) {
        console.error('Failed to load diff:', err);
      }
    }
    if (activeTab === 'diff' && !currentDiff) {
      loadDiff();
    }
  }, [activeTab, currentDiff]);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    try {
      const res = await evaluateConstitution({
        agent_id: evalAgentId,
        amount: evalAmount,
        currency: evalCurrency,
        recipient: evalRecipient,
        risk_score: Number(evalRiskScore),
      });
      setEvalDecision(res.decision);
    } catch (err: any) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRunTests = async () => {
    setIsTesting(true);
    try {
      const res = await testConstitution(activeConstitution.version, [
        {
          name: 'Root Invariant Zero Negative Amount',
          context: { amount: '-500', currency: 'USDC' },
          expected_decision: 'DENY',
        },
        {
          name: 'Single Payment Normal Range',
          context: { amount: '250000000', currency: 'USDC' },
          expected_decision: 'ALLOW',
        },
        {
          name: 'Human Approval Threshold Trigger',
          context: { amount: '1200000000', currency: 'USDC' },
          expected_decision: 'APPROVAL_REQUIRED',
        },
        {
          name: 'Exceed Single Payment Ceiling',
          context: { amount: '3500000000', currency: 'USDC' },
          expected_decision: 'DENY',
        },
        {
          name: 'Illegal Non-USDC Asset',
          context: { amount: '100000000', currency: 'ETH' },
          expected_decision: 'DENY',
        },
      ]);
      setTestResult(res.report);
      setActionNotice({ message: `Automated test suite completed: ${res.report.passed_tests}/${res.report.total_tests} passed in ${res.report.duration_ms}ms`, type: 'success' });
    } catch (err: any) {
      setActionNotice({ message: 'Failed to run test suite: ' + err.message, type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleActivateChange = async (requestId: string) => {
    startTransition(async () => {
      try {
        const res = await activateConstitution(requestId);
        setActiveConstitution(res.constitution);
        setSelectedVersion(res.constitution.version);
        setActionNotice({ message: `Successfully activated Constitution v${res.constitution.version}`, type: 'success' });
      } catch (err: any) {
        setActionNotice({ message: 'Activation failed: ' + err.message, type: 'error' });
      }
    });
  };

  const handleRollback = async (version: number) => {
    if (!confirm(`Are you sure you want to rollback to Constitution v${version}? This will revert sovereign spending constraints.`)) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await rollbackConstitution(version);
        setActiveConstitution(res.constitution);
        setSelectedVersion(res.constitution.version);
        setActionNotice({ message: `Successfully rolled back to Constitution v${version}`, type: 'success' });
      } catch (err: any) {
        setActionNotice({ message: 'Rollback failed: ' + err.message, type: 'error' });
      }
    });
  };

  const formatUsdc = (units?: string) => {
    if (!units) return '$0.00';
    const val = Number(units) / 1_000_000;
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] pb-20">
      {/* Top Banner Notice */}
      {actionNotice && (
        <div className={`py-2 px-4 text-center text-xs font-mono font-medium flex items-center justify-center gap-2 ${
          actionNotice.type === 'success' ? 'bg-[#141414] text-[#2FB36F] border-b border-[#2FB36F]/40' : 'bg-[#141414] text-[#D85C5C] border-b border-[#D85C5C]/40'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="ml-3 text-[#85827B] hover:text-white">&times;</button>
        </div>
      )}

      {/* Hero Header */}
      <div className="border-b border-[#222222] bg-[#080808] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center text-[#D6A83A] font-bold text-lg">
                  ⚖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                      Autonomous Economic Constitution
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30">
                      v{activeConstitution.version} ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-[#85827B] mt-1">
                    Deterministic spending boundaries, monotonic authority inheritance, and cryptographic flight recorder proofs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRunTests}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#141414] hover:bg-[#141414] border border-[#2D2D2D] text-[#F2F0EA] transition-colors flex items-center gap-1.5"
              >
                <span>🧪</span>
                <span>{isTesting ? 'Verifying...' : 'Run Constitution Tests'}</span>
              </button>
              {activeConstitution.version > 1 && (
                <button
                  onClick={() => handleRollback(activeConstitution.version - 1)}
                  disabled={isPending}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-[#151515] hover:bg-[#1C1C1C] border border-[#D85C5C]/30 text-[#D85C5C] transition-colors flex items-center gap-1.5"
                >
                  <span>↺</span>
                  <span>Rollback to v{activeConstitution.version - 1}</span>
                </button>
              )}
              <div className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2FB36F]/30 text-[#2FB36F] font-mono text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F] animate-pulse" />
                <span>STATE: ZERO KEY ACCESS</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-8">
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Active Version</div>
              <div className="text-sm font-mono font-bold text-white mt-1">v{activeConstitution.version}</div>
              <div className="text-[10px] font-mono text-[#2FB36F] mt-0.5">● IMMUTABLE</div>
            </div>
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Max Single Spend</div>
              <div className="text-sm font-mono font-bold text-[#D6A83A] mt-1">$2,500.00 USDC</div>
              <div className="text-[10px] font-mono text-[#85827B] mt-0.5">Per Transaction</div>
            </div>
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Daily Treasury Limit</div>
              <div className="text-sm font-mono font-bold text-[#F2F0EA] mt-1">$10,000.00 USDC</div>
              <div className="text-[10px] font-mono text-[#85827B] mt-0.5">Rolling 24 Hours</div>
            </div>
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Human Approval</div>
              <div className="text-sm font-mono font-bold text-[#D6A83A] mt-1">&gt; $1,000.00 USDC</div>
              <div className="text-[10px] font-mono text-[#85827B] mt-0.5">Multi-Sig Sign-off</div>
            </div>
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Max Delegation Depth</div>
              <div className="text-sm font-mono font-bold text-[#2FB36F] mt-1">2 Hops</div>
              <div className="text-[10px] font-mono text-[#85827B] mt-0.5">Subcontractor Ceiling</div>
            </div>
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-3">
              <div className="text-[10px] font-mono text-[#85827B] uppercase tracking-wider">Policy Hash</div>
              <div className="text-xs font-mono font-bold text-[#B0ADA5] mt-1 truncate" title={activeConstitution.policy_hash}>
                {activeConstitution.policy_hash?.slice(0, 10)}...
              </div>
              <div className="text-[10px] font-mono text-[#85827B] mt-0.5">SHA-256 Digest</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#222222] space-x-1 sm:space-x-4 mb-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'border-amber-400 text-[#D6A83A] font-bold'
                : 'border-transparent text-[#85827B] hover:text-[#F2F0EA]'
            }`}
          >
            Active Rules ({activeConstitution.rules.length})
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'hierarchy'
                ? 'border-amber-400 text-[#D6A83A] font-bold'
                : 'border-transparent text-[#85827B] hover:text-[#F2F0EA]'
            }`}
          >
            Monotonic Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-amber-400 text-[#D6A83A] font-bold'
                : 'border-transparent text-[#85827B] hover:text-[#F2F0EA]'
            }`}
          >
            Policy Diff &amp; Delta
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'changes'
                ? 'border-amber-400 text-[#D6A83A] font-bold'
                : 'border-transparent text-[#85827B] hover:text-[#F2F0EA]'
            }`}
          >
            Change Requests ({changeRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'playground'
                ? 'border-amber-400 text-[#D6A83A] font-bold'
                : 'border-transparent text-[#85827B] hover:text-[#F2F0EA]'
            }`}
          >
            Evaluation Playground
          </button>
        </div>

        {/* TAB 1: ACTIVE RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeConstitution.rules.map((rule) => {
                const isHard = rule.hard_deny;
                return (
                  <div
                    key={rule.rule_id}
                    className={`rounded-xl p-5 border backdrop-blur-sm transition-all ${
                      isHard
                        ? 'bg-[#101010] border-[#D85C5C]/40 hover:border-[#D85C5C]'
                        : 'bg-[#101010] border-[#222222] hover:border-[#2D2D2D]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-[#F2F0EA] truncate">
                        {rule.rule_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHard && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40">
                            HARD DENY
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141414] text-[#B0ADA5]">
                          P{rule.priority}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-[#D6A83A] mb-2 uppercase">
                      TYPE: {rule.type} &bull; SCOPE: {rule.scope}
                    </div>

                    <p className="text-xs text-[#B0ADA5] mb-4 line-clamp-3">
                      {rule.description}
                    </p>

                    {/* Rule specific metadata */}
                    <div className="border-t border-[#222222] pt-3 text-[11px] font-mono space-y-1 text-[#85827B]">
                      {rule.spending_limit && (
                        <>
                          {rule.spending_limit.max_single_payment && (
                            <div className="flex justify-between">
                              <span>Max Single:</span>
                              <span className="text-[#F2F0EA]">{formatUsdc(rule.spending_limit.max_single_payment)}</span>
                            </div>
                          )}
                          {rule.spending_limit.daily_budget_limit && (
                            <div className="flex justify-between">
                              <span>Daily Budget:</span>
                              <span className="text-[#F2F0EA]">{formatUsdc(rule.spending_limit.daily_budget_limit)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {rule.asset_rule && (
                        <div className="flex justify-between">
                          <span>Allowed Assets:</span>
                          <span className="text-[#2FB36F]">{rule.asset_rule.allowed_assets.join(', ')}</span>
                        </div>
                      )}
                      {rule.approval_rule && (
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="text-[#D6A83A]">{formatUsdc(rule.approval_rule.amount_threshold)}</span>
                        </div>
                      )}
                      {rule.delegation_rule && (
                        <div className="flex justify-between">
                          <span>Max Depth:</span>
                          <span className="text-[#F2F0EA]">{rule.delegation_rule.max_delegation_depth} Hops</span>
                        </div>
                      )}
                      {rule.risk_rule && (
                        <div className="flex justify-between">
                          <span>Risk Ceiling:</span>
                          <span className="text-[#D6A83A]">Score &le; {rule.risk_rule.max_risk_score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MONOTONIC HIERARCHY */}
        {activeTab === 'hierarchy' && (
          <PolicyHierarchyTree constitution={activeConstitution} />
        )}

        {/* TAB 3: POLICY DIFF */}
        {activeTab === 'diff' && currentDiff && (
          <PolicyDiffViewer diff={currentDiff} />
        )}

        {/* TAB 4: CHANGE REQUESTS */}
        {activeTab === 'changes' && (
          <div className="space-y-4">
            {changeRequests.map((cr) => (
              <div key={cr.request_id} className="bg-[#101010] border border-[#222222] rounded-xl p-6 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-white">{cr.request_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {cr.status}
                      </span>
                      <AuthorityDeltaBadge delta={cr.authority_delta} />
                    </div>
                    <p className="text-xs text-[#B0ADA5] mt-1 font-sans">
                      Proposes revision from <span className="font-mono text-[#D6A83A]">v{cr.current_version}</span> to <span className="font-mono text-[#2FB36F]">v{cr.proposed_version}</span> by <span className="font-mono text-[#B0ADA5]">{cr.proposer}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleActivateChange(cr.request_id)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#F2F0EA] hover:bg-[#FFFFFF] text-[#080808] transition-colors"
                    >
                      CAS Activate v{cr.proposed_version}
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-xs font-mono text-[#85827B] bg-[#080808] p-3 rounded-lg border border-[#222222]">
                  <div className="text-[#B0ADA5] font-semibold mb-1">Explanation:</div>
                  <div>{cr.authority_delta?.explanation}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: EVALUATION PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D6A83A]" />
                Zero-Side-Effect Policy Evaluator
              </h3>
              <p className="text-xs text-[#85827B] mb-6 font-sans">
                Simulate an autonomous financial transaction against the currently active constitution. No on-chain transactions or state mutations will occur.
              </p>

              <form onSubmit={handleEvaluate} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#B0ADA5] mb-1">Agent ID</label>
                  <input
                    type="text"
                    value={evalAgentId}
                    onChange={(e) => setEvalAgentId(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#222222] rounded-lg px-3 py-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                  />
                </div>

                <div>
                  <label className="block text-[#B0ADA5] mb-1">Amount (Base Units: 1 USDC = 1,000,000)</label>
                  <input
                    type="text"
                    value={evalAmount}
                    onChange={(e) => setEvalAmount(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#222222] rounded-lg px-3 py-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                  />
                  <span className="text-[10px] text-[#85827B] mt-1 block">Formatted: {formatUsdc(evalAmount)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#B0ADA5] mb-1">Currency</label>
                    <input
                      type="text"
                      value={evalCurrency}
                      onChange={(e) => setEvalCurrency(e.target.value)}
                      className="w-full bg-[#0F0F0F] border border-[#222222] rounded-lg px-3 py-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#B0ADA5] mb-1">Risk Score (0 - 100)</label>
                    <input
                      type="number"
                      value={evalRiskScore}
                      onChange={(e) => setEvalRiskScore(Number(e.target.value))}
                      className="w-full bg-[#0F0F0F] border border-[#222222] rounded-lg px-3 py-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#B0ADA5] mb-1">Recipient Agent / Service</label>
                  <input
                    type="text"
                    value={evalRecipient}
                    onChange={(e) => setEvalRecipient(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#222222] rounded-lg px-3 py-2 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isEvaluating}
                  className="w-full mt-4 py-2.5 rounded-lg text-xs font-mono font-bold bg-[#F2F0EA] hover:bg-[#E2DFD7] text-[#080808] transition-colors"
                >
                  {isEvaluating ? 'Evaluating against Constitution...' : 'Evaluate Against Constitution'}
                </button>
              </form>
            </div>

            {/* Decision Output */}
            <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
                Deterministic Constitutional Decision
              </h3>

              {evalDecision ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border font-mono ${
                    evalDecision.decision === 'ALLOW'
                      ? 'bg-[#141414] border-[#2FB36F]/40 text-[#2FB36F]'
                      : evalDecision.decision === 'APPROVAL_REQUIRED'
                      ? 'bg-[#141414] border border-[#D6A83A]/40 text-[#D6A83A]'
                      : 'bg-[#141414] border-[#D85C5C]/40 text-[#D85C5C]'
                  }`}>
                    <div className="flex items-center justify-between text-sm font-bold mb-1">
                      <span>DECISION: {evalDecision.decision}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#141414] border border-[#222222]">
                        {evalDecision.reason_code}
                      </span>
                    </div>
                    <p className="text-xs mt-2 text-[#F2F0EA]">{evalDecision.reason}</p>
                    <p className="text-[11px] mt-1 text-[#85827B]">{evalDecision.explanation}</p>
                  </div>

                  <div className="bg-[#0F0F0F]/70 border border-[#222222] rounded-lg p-4 font-mono text-xs space-y-2">
                    <div className="flex justify-between text-[#85827B]">
                      <span>Constitution ID:</span>
                      <span className="text-[#F2F0EA]">{evalDecision.constitution_id} (v{evalDecision.version})</span>
                    </div>
                    <div className="flex justify-between text-[#85827B]">
                      <span>Evaluation Hash:</span>
                      <span className="text-[#F2F0EA] truncate ml-4">{evalDecision.evaluation_hash}</span>
                    </div>
                    {evalDecision.matched_rules?.length > 0 && (
                      <div className="border-t border-[#222222] pt-2">
                        <span className="text-[#85827B] block mb-1">Matched Rules:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {evalDecision.matched_rules.map((r) => (
                            <span key={r} className="px-2 py-0.5 rounded bg-[#141414] text-[#B0ADA5] text-[10px]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#50504C] text-xs font-mono text-center p-6 border border-dashed border-[#222222] rounded-xl">
                  <span>No evaluation executed yet.</span>
                  <span className="mt-1 text-[#50504C]">Configure parameters on the left and click &quot;Evaluate Against Constitution&quot;.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
