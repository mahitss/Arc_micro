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
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-20">
      {/* Top Banner Notice */}
      {actionNotice && (
        <div className={`py-2 px-4 text-center text-xs font-mono font-medium flex items-center justify-center gap-2 ${
          actionNotice.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800' : 'bg-rose-950/80 text-rose-300 border-b border-rose-800'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="ml-3 text-slate-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Hero Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 text-lg">
                  ⚖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                      Autonomous Economic Constitution
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      v{activeConstitution.version} ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Deterministic spending boundaries, monotonic authority inheritance, and cryptographic flight recorder proofs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRunTests}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span>🧪</span>
                <span>{isTesting ? 'Verifying...' : 'Run Constitution Tests'}</span>
              </button>
              {activeConstitution.version > 1 && (
                <button
                  onClick={() => handleRollback(activeConstitution.version - 1)}
                  disabled={isPending}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors flex items-center gap-1.5"
                >
                  <span>↺</span>
                  <span>Rollback to v{activeConstitution.version - 1}</span>
                </button>
              )}
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>STATE: ZERO KEY ACCESS</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-8">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Version</div>
              <div className="text-sm font-mono font-bold text-white mt-1">v{activeConstitution.version}</div>
              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">● IMMUTABLE</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Max Single Spend</div>
              <div className="text-sm font-mono font-bold text-amber-400 mt-1">$2,500.00 USDC</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Per Transaction</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Daily Treasury Limit</div>
              <div className="text-sm font-mono font-bold text-cyan-400 mt-1">$10,000.00 USDC</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Rolling 24 Hours</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Human Approval</div>
              <div className="text-sm font-mono font-bold text-purple-400 mt-1">&gt; $1,000.00 USDC</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Multi-Sig Sign-off</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Max Delegation Depth</div>
              <div className="text-sm font-mono font-bold text-emerald-400 mt-1">2 Hops</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Subcontractor Ceiling</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Policy Hash</div>
              <div className="text-xs font-mono font-bold text-slate-300 mt-1 truncate" title={activeConstitution.policy_hash}>
                {activeConstitution.policy_hash?.slice(0, 10)}...
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">SHA-256 Digest</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 mb-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Rules ({activeConstitution.rules.length})
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'hierarchy'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Monotonic Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Policy Diff &amp; Delta
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'changes'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Change Requests ({changeRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'playground'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
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
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-slate-200 truncate">
                        {rule.rule_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isHard && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            HARD DENY
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          P{rule.priority}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-amber-400 mb-2 uppercase">
                      TYPE: {rule.type} &bull; SCOPE: {rule.scope}
                    </div>

                    <p className="text-xs text-slate-300 mb-4 line-clamp-3">
                      {rule.description}
                    </p>

                    {/* Rule specific metadata */}
                    <div className="border-t border-slate-800/80 pt-3 text-[11px] font-mono space-y-1 text-slate-400">
                      {rule.spending_limit && (
                        <>
                          {rule.spending_limit.max_single_payment && (
                            <div className="flex justify-between">
                              <span>Max Single:</span>
                              <span className="text-slate-200">{formatUsdc(rule.spending_limit.max_single_payment)}</span>
                            </div>
                          )}
                          {rule.spending_limit.daily_budget_limit && (
                            <div className="flex justify-between">
                              <span>Daily Budget:</span>
                              <span className="text-slate-200">{formatUsdc(rule.spending_limit.daily_budget_limit)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {rule.asset_rule && (
                        <div className="flex justify-between">
                          <span>Allowed Assets:</span>
                          <span className="text-emerald-400">{rule.asset_rule.allowed_assets.join(', ')}</span>
                        </div>
                      )}
                      {rule.approval_rule && (
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="text-purple-300">{formatUsdc(rule.approval_rule.amount_threshold)}</span>
                        </div>
                      )}
                      {rule.delegation_rule && (
                        <div className="flex justify-between">
                          <span>Max Depth:</span>
                          <span className="text-cyan-300">{rule.delegation_rule.max_delegation_depth} Hops</span>
                        </div>
                      )}
                      {rule.risk_rule && (
                        <div className="flex justify-between">
                          <span>Risk Ceiling:</span>
                          <span className="text-amber-300">Score &le; {rule.risk_rule.max_risk_score}</span>
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
              <div key={cr.request_id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-white">{cr.request_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {cr.status}
                      </span>
                      <AuthorityDeltaBadge delta={cr.authority_delta} />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-sans">
                      Proposes revision from <span className="font-mono text-amber-400">v{cr.current_version}</span> to <span className="font-mono text-emerald-400">v{cr.proposed_version}</span> by <span className="font-mono text-slate-300">{cr.proposer}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleActivateChange(cr.request_id)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20"
                    >
                      CAS Activate v{cr.proposed_version}
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-xs font-mono text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-300 font-semibold mb-1">Explanation:</div>
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
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Zero-Side-Effect Policy Evaluator
              </h3>
              <p className="text-xs text-slate-400 mb-6 font-sans">
                Simulate an autonomous financial transaction against the currently active constitution. No on-chain transactions or state mutations will occur.
              </p>

              <form onSubmit={handleEvaluate} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-300 mb-1">Agent ID</label>
                  <input
                    type="text"
                    value={evalAgentId}
                    onChange={(e) => setEvalAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Amount (Base Units: 1 USDC = 1,000,000)</label>
                  <input
                    type="text"
                    value={evalAmount}
                    onChange={(e) => setEvalAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Formatted: {formatUsdc(evalAmount)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Currency</label>
                    <input
                      type="text"
                      value={evalCurrency}
                      onChange={(e) => setEvalCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Risk Score (0 - 100)</label>
                    <input
                      type="number"
                      value={evalRiskScore}
                      onChange={(e) => setEvalRiskScore(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Recipient Agent / Service</label>
                  <input
                    type="text"
                    value={evalRecipient}
                    onChange={(e) => setEvalRecipient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isEvaluating}
                  className="w-full mt-4 py-2.5 rounded-lg text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
                >
                  {isEvaluating ? 'Evaluating against Constitution...' : 'Evaluate Against Constitution'}
                </button>
              </form>
            </div>

            {/* Decision Output */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Deterministic Constitutional Decision
              </h3>

              {evalDecision ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border font-mono ${
                    evalDecision.decision === 'ALLOW'
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : evalDecision.decision === 'APPROVAL_REQUIRED'
                      ? 'bg-purple-950/20 border-purple-500/40 text-purple-300'
                      : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                  }`}>
                    <div className="flex items-center justify-between text-sm font-bold mb-1">
                      <span>DECISION: {evalDecision.decision}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {evalDecision.reason_code}
                      </span>
                    </div>
                    <p className="text-xs mt-2 text-slate-200">{evalDecision.reason}</p>
                    <p className="text-[11px] mt-1 text-slate-400">{evalDecision.explanation}</p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Constitution ID:</span>
                      <span className="text-slate-200">{evalDecision.constitution_id} (v{evalDecision.version})</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Evaluation Hash:</span>
                      <span className="text-slate-200 truncate ml-4">{evalDecision.evaluation_hash}</span>
                    </div>
                    {evalDecision.matched_rules?.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-2">
                        <span className="text-slate-400 block mb-1">Matched Rules:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {evalDecision.matched_rules.map((r) => (
                            <span key={r} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs font-mono text-center p-6 border border-dashed border-slate-800 rounded-xl">
                  <span>No evaluation executed yet.</span>
                  <span className="mt-1 text-slate-600">Configure parameters on the left and click &quot;Evaluate Against Constitution&quot;.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
