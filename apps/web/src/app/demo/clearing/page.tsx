'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AutonomousClearingDemoPage() {
  const [activeScenario, setActiveScenario] = useState<'NETTING' | 'AMBIGUOUS' | 'RECURRING' | 'SAFETY'>('NETTING');

  // Netting Demo State
  const [nettingStep, setNettingStep] = useState<number>(1);

  // Ambiguous Settlement Demo State
  const [ambiguousStage, setAmbiguousStage] = useState<'IDLE' | 'SUBMITTING' | 'AMBIGUOUS' | 'RECONCILING' | 'CONFIRMED'>('IDLE');

  // Recurring Payment Demo State
  const [recurringMonth, setRecurringMonth] = useState<number>(1);
  const [policyChanged, setPolicyChanged] = useState<boolean>(false);
  const [recurringStatus, setRecurringStatus] = useState<string>('MONTH 1: AUTHORIZED AND SETTLED (10.00 USDC)');

  // Financial Safety Demo State
  const [safetyLog, setSafetyLog] = useState<Array<{ test: string; result: string; invariant: string; status: 'BLOCKED' | 'SECURITY_INCIDENT' }>>([]);

  const runSafetyTest = (type: string) => {
    if (type === 'policy_exceeded') {
      setSafetyLog(prev => [
        {
          test: 'Netting proposal exceeding policy exposure limit ($50.00 cap)',
          result: 'BLOCKED: Netting engine rejected proposal exceeding policy ceiling (INV-203)',
          invariant: 'INV-203',
          status: 'BLOCKED',
        },
        ...prev,
      ]);
    } else if (type === 'expired_approval') {
      setSafetyLog(prev => [
        {
          test: 'Settlement execution with expired governance approval ticket',
          result: 'BLOCKED: SettlementRouter refused submission; approval TTL expired (INV-205)',
          invariant: 'INV-205',
          status: 'BLOCKED',
        },
        ...prev,
      ]);
    } else if (type === 'disputed_settlement') {
      setSafetyLog(prev => [
        {
          test: 'Attempt to settle active disputed obligation ob_disp_99',
          result: 'BLOCKED & ESCALATED: Disputed obligations cannot silently settle (INV-210)',
          invariant: 'INV-210',
          status: 'BLOCKED',
        },
        ...prev,
      ]);
    } else if (type === 'wrong_recipient') {
      setSafetyLog(prev => [
        {
          test: 'Blockchain receipt evidence with mismatched recipient address',
          result: 'SECURITY INCIDENT: Reported recipient mismatch against expected payee (INV-219)',
          invariant: 'INV-219',
          status: 'SECURITY_INCIDENT',
        },
        ...prev,
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                Task 18 — Autonomous Economic Clearing Lab
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Interactive Financial Safety & Clearing Network Lab
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic verification of multi-party cycle netting, ambiguous transaction reconciliation, recurring revalidation, and adversarial safeguards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              Control Tower →
            </Link>
          </div>
        </div>
      </div>

      {/* Scenario Selector Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveScenario('NETTING')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'NETTING'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="text-[10px] uppercase text-emerald-400 font-bold">Scenario 1 (Section 69)</div>
          <div className="text-sm font-bold text-white mt-1">Multi-Party Netting</div>
          <div className="text-[11px] text-slate-400 mt-1">Cycle collapse (10, 7, 5, 2)</div>
        </button>

        <button
          onClick={() => setActiveScenario('AMBIGUOUS')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'AMBIGUOUS'
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="text-[10px] uppercase text-amber-400 font-bold">Scenario 2 (Section 70)</div>
          <div className="text-sm font-bold text-white mt-1">Ambiguous Settlement</div>
          <div className="text-[11px] text-slate-400 mt-1">Zero blind rebroadcast</div>
        </button>

        <button
          onClick={() => setActiveScenario('RECURRING')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'RECURRING'
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="text-[10px] uppercase text-purple-400 font-bold">Scenario 3 (Section 71)</div>
          <div className="text-sm font-bold text-white mt-1">Recurring Revalidation</div>
          <div className="text-[11px] text-slate-400 mt-1">Policy change re-check</div>
        </button>

        <button
          onClick={() => setActiveScenario('SAFETY')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'SAFETY'
              ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="text-[10px] uppercase text-red-400 font-bold">Scenario 4 (Section 72)</div>
          <div className="text-sm font-bold text-white mt-1">Adversarial Safety</div>
          <div className="text-[11px] text-slate-400 mt-1">INV-201..220 enforcement</div>
        </button>
      </div>

      {/* Scenario 1: Multi-Party Netting (Section 69) */}
      {activeScenario === 'NETTING' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Section 69: Multi-Party Netting Coordination Flow</h2>
              <p className="text-xs text-slate-400">Canonical cycle: A owes B (10), B owes A (7), C owes A (5), A owes C (2).</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((st) => (
                <button
                  key={st}
                  onClick={() => setNettingStep(st)}
                  className={`px-3 py-1 text-xs rounded font-mono ${
                    nettingStep === st ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Step {st}
                </button>
              ))}
            </div>
          </div>

          {nettingStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white font-mono">1. GROSS OBLIGATIONS BEFORE NETTING:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
                  <span className="text-slate-400">Agent A → Agent B</span>
                  <span className="text-white font-bold block text-sm mt-1">10.00 USDC</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
                  <span className="text-slate-400">Agent B → Agent A</span>
                  <span className="text-white font-bold block text-sm mt-1">7.00 USDC</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
                  <span className="text-slate-400">Agent C → Agent A</span>
                  <span className="text-white font-bold block text-sm mt-1">5.00 USDC</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded border border-slate-800">
                  <span className="text-slate-400">Agent A → Agent C</span>
                  <span className="text-white font-bold block text-sm mt-1">2.00 USDC</span>
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-xs font-mono text-slate-300 flex justify-between">
                <span>Total Gross Coordinated Value: <strong>24.00 USDC</strong> (4 distinct transactions)</span>
                <button onClick={() => setNettingStep(2)} className="text-emerald-400 font-bold hover:underline">Next: Generate Netting Proposal →</button>
              </div>
            </div>
          )}

          {nettingStep === 2 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white font-mono">2. ALGORITHMIC NETTING PROPOSAL (PROPOSAL STAGE):</div>
              <div className="p-4 bg-slate-950/70 rounded border border-emerald-500/40 text-xs font-mono space-y-2">
                <div className="text-emerald-400 font-bold">Proposal: net_mp_cycle_demo</div>
                <div className="text-slate-300">Bilateral Netting A ↔ B: 10 - 7 = 3.00 USDC (A owes B)</div>
                <div className="text-slate-300">Bilateral Netting A ↔ C: 5 - 2 = 3.00 USDC (C owes A)</div>
                <div className="text-slate-300">Graph Cycle Collapse (C owes A 3, A owes B 3): Net transfer: C → B = 3.00 USDC!</div>
                <div className="text-emerald-400 font-bold pt-2">Gross: 24.00 USDC → Net: 3.00 USDC | Savings: 21.00 USDC (87.5% reduction)</div>
              </div>
              <button onClick={() => setNettingStep(3)} className="text-emerald-400 font-mono text-xs font-bold hover:underline">Next: Review Net Obligations →</button>
            </div>
          )}

          {nettingStep === 3 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white font-mono">3. PROPOSED NET OBLIGATIONS:</div>
              <div className="p-4 bg-slate-950/70 rounded border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-cyan-400">
                  <span>Agent C owes Agent B</span>
                  <span>3.00 USDC</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Agent A balance is perfectly balanced (receives 3 from C, owes 3 to B; net zero liquidity required).
                </div>
              </div>
              <button onClick={() => setNettingStep(4)} className="text-emerald-400 font-mono text-xs font-bold hover:underline">Next: Policy / Risk / Treasury Checks →</button>
            </div>
          )}

          {nettingStep === 4 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white font-mono">4. POLICY / RISK / TREASURY EVALUATION:</div>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950/70 rounded border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Policy Gate</span>
                  <span className="text-emerald-400 font-bold">INV-203 PASS</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Risk Gate</span>
                  <span className="text-emerald-400 font-bold">INV-204 ALLOW</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Treasury Liquidity</span>
                  <span className="text-cyan-400 font-bold">INV-206 RESERVED (3.00 USDC)</span>
                </div>
              </div>
              <button onClick={() => setNettingStep(5)} className="text-emerald-400 font-mono text-xs font-bold hover:underline">Next: Settlement & Reconciliation →</button>
            </div>
          )}

          {nettingStep === 5 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white font-mono">5. SETTLEMENT BATCH & BLOCKCHAIN VERIFICATION:</div>
              <div className="p-4 bg-slate-950/70 rounded border border-emerald-500/40 text-xs font-mono space-y-2">
                <div className="text-emerald-400 font-bold">Batch #batch_demo_01: SETTLED</div>
                <div className="text-slate-300">PaymentIntent: pi_demo_net_01 executed for 3.00 USDC</div>
                <div className="text-slate-400">Arc Tx Hash: 0x8a91cbf443... (Block #184295)</div>
                <div className="text-emerald-400">Reconciliation: MATCHED & CONFIRMED. Total transactions executed: 1 instead of 4.</div>
              </div>
              <button onClick={() => setNettingStep(1)} className="text-slate-400 font-mono text-xs hover:underline">↺ Restart Netting Demo</button>
            </div>
          )}
        </div>
      )}

      {/* Scenario 2: Ambiguous Settlement Demo (Section 70) */}
      {activeScenario === 'AMBIGUOUS' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white">Section 70: Ambiguous Settlement Simulation</h2>
            <p className="text-xs text-slate-400">Simulate payment submission where network response disappears. Zero blind rebroadcast.</p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded border border-slate-800 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Transaction State:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                ambiguousStage === 'IDLE' ? 'bg-slate-800 text-slate-300' :
                ambiguousStage === 'SUBMITTING' ? 'bg-cyan-500/20 text-cyan-400' :
                ambiguousStage === 'AMBIGUOUS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                ambiguousStage === 'RECONCILING' ? 'bg-purple-500/20 text-purple-400' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {ambiguousStage}
              </span>
            </div>

            {ambiguousStage === 'IDLE' && (
              <button
                onClick={() => setAmbiguousStage('AMBIGUOUS')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-sans font-medium text-xs"
              >
                Submit Payment & Inject Network Drop →
              </button>
            )}

            {ambiguousStage === 'AMBIGUOUS' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded text-amber-300 space-y-1">
                  <div className="font-bold">⚠️ AMBIGUOUS SETTLEMENT DETECTED (INV-209 ENFORCED)</div>
                  <div>Outcome unknown. Transaction was NOT marked as FAILED.</div>
                  <div className="text-white font-bold">AUTOMATIC REBROADCAST STRICTLY PROHIBITED TO PREVENT DOUBLE-SPEND.</div>
                </div>
                <button
                  onClick={() => setAmbiguousStage('CONFIRMED')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-medium text-xs"
                >
                  Run Authoritative Arc Node Reconciliation →
                </button>
              </div>
            )}

            {ambiguousStage === 'CONFIRMED' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded text-emerald-300 space-y-1">
                  <div className="font-bold">✓ RECONCILIATION COMPLETE: TX FOUND ON-CHAIN</div>
                  <div>Mined in Arc block #184299. State transitioned directly to CONFIRMED.</div>
                  <div className="text-slate-300">Prevented duplicate payment of 10.00 USDC.</div>
                </div>
                <button
                  onClick={() => setAmbiguousStage('IDLE')}
                  className="text-slate-400 hover:underline"
                >
                  ↺ Reset Ambiguous Demo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenario 3: Recurring Payment Demo (Section 71) */}
      {activeScenario === 'RECURRING' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white">Section 71: Recurring Obligation Revalidation</h2>
            <p className="text-xs text-slate-400">Previous authorization does not remain valid forever (INV-212).</p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded border border-slate-800 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span>Service Contract: #ctr_recurring_monthly</span>
              <span className="text-purple-400 font-bold">Month {recurringMonth} of 12</span>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-800 text-slate-200">
              Current Status: <strong className="text-cyan-400">{recurringStatus}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPolicyChanged(true);
                  setRecurringMonth(2);
                  setRecurringStatus('MONTH 2: REVALIDATION FAILED — POLICY LIMIT DECREASED TO 5 USDC. PAYMENT BLOCKED (INV-212)!');
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-sans font-medium text-xs"
              >
                Trigger Month 2 with Changed Policy Limit ($5 cap) →
              </button>
              <button
                onClick={() => {
                  setPolicyChanged(false);
                  setRecurringMonth(1);
                  setRecurringStatus('MONTH 1: AUTHORIZED AND SETTLED (10.00 USDC)');
                }}
                className="px-3 py-2 bg-slate-800 text-slate-400 rounded hover:text-white font-sans text-xs"
              >
                Reset
              </button>
            </div>

            {policyChanged && (
              <div className="p-3 bg-red-950/30 border border-red-500/40 rounded text-red-300 space-y-1">
                <div className="font-bold">🛡️ INVARIANT INV-212 DEMONSTRATED</div>
                <div>System revalidated contract, policy, risk, and treasury before recurrence.</div>
                <div>Previous Month 1 authorization rejected for Month 2 due to changed governance policy.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenario 4: Financial Safety Demo (Section 72) */}
      {activeScenario === 'SAFETY' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white">Section 72: Adversarial Safety Invariants Lab</h2>
            <p className="text-xs text-slate-400">Trigger machine-checked security invariants and verify immediate policy blocks.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => runSafetyTest('policy_exceeded')}
              className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-left font-mono text-xs"
            >
              <span className="text-amber-400 block font-bold">Test 1</span>
              <span className="text-white">Netting Exceeding Policy</span>
            </button>
            <button
              onClick={() => runSafetyTest('expired_approval')}
              className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-left font-mono text-xs"
            >
              <span className="text-amber-400 block font-bold">Test 2</span>
              <span className="text-white">Expired Approval Ticket</span>
            </button>
            <button
              onClick={() => runSafetyTest('disputed_settlement')}
              className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-left font-mono text-xs"
            >
              <span className="text-amber-400 block font-bold">Test 3</span>
              <span className="text-white">Disputed Obligation</span>
            </button>
            <button
              onClick={() => runSafetyTest('wrong_recipient')}
              className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-left font-mono text-xs"
            >
              <span className="text-red-400 block font-bold">Test 4</span>
              <span className="text-white">Wrong Recipient Evidence</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-slate-400 uppercase text-[10px]">Safety Lab Audit Log:</div>
            {safetyLog.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Click any safety test button above to run scenario.</div>
            ) : (
              safetyLog.map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{log.test}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SECURITY_INCIDENT' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-slate-300">{log.result}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
