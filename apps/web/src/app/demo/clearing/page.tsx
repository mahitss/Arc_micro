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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header Banner */}
      <div className="border border-[#222222] bg-[#101010] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2FB36F] animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-[#716F69] uppercase font-mono">
                Autonomous Economic Clearing Lab
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#F2F0EA]">
              Interactive Financial Safety & Clearing Network Lab
            </h1>
            <p className="text-sm text-[#716F69] mt-1">
              Deterministic verification of multi-party cycle netting, ambiguous transaction reconciliation, recurring revalidation, and adversarial safeguards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/control/economy"
              className="px-4 py-2 bg-[#141414] hover:bg-[#181818] text-[#F2F0EA] text-xs font-medium rounded-lg border border-[#222222] transition-colors"
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
              ? 'bg-[#141414] border-[#D6A83A]'
              : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D] text-[#716F69]'
          }`}
        >
          <div className="text-[10px] uppercase text-[#D6A83A] font-bold">Scenario 1 (Section 69)</div>
          <div className="text-sm font-bold text-[#F2F0EA] mt-1">Multi-Party Netting</div>
          <div className="text-[11px] text-[#716F69] mt-1">Cycle collapse (10, 7, 5, 2)</div>
        </button>

        <button
          onClick={() => setActiveScenario('AMBIGUOUS')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'AMBIGUOUS'
              ? 'bg-[#141414] border-[#D6A83A]'
              : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D] text-[#716F69]'
          }`}
        >
          <div className="text-[10px] uppercase text-[#D6A83A] font-bold">Scenario 2 (Section 70)</div>
          <div className="text-sm font-bold text-[#F2F0EA] mt-1">Ambiguous Settlement</div>
          <div className="text-[11px] text-[#716F69] mt-1">Zero blind rebroadcast</div>
        </button>

        <button
          onClick={() => setActiveScenario('RECURRING')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'RECURRING'
              ? 'bg-[#141414] border-[#D6A83A]'
              : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D] text-[#716F69]'
          }`}
        >
          <div className="text-[10px] uppercase text-[#D6A83A] font-bold">Scenario 3 (Section 71)</div>
          <div className="text-sm font-bold text-[#F2F0EA] mt-1">Recurring Revalidation</div>
          <div className="text-[11px] text-[#716F69] mt-1">Policy change re-check</div>
        </button>

        <button
          onClick={() => setActiveScenario('SAFETY')}
          className={`p-4 rounded-xl border text-left font-mono transition-all ${
            activeScenario === 'SAFETY'
              ? 'bg-[#141414] border-[#D6A83A]'
              : 'bg-[#0B0B0B] border-[#222222] hover:border-[#2D2D2D] text-[#716F69]'
          }`}
        >
          <div className="text-[10px] uppercase text-[#D6A83A] font-bold">Scenario 4 (Section 72)</div>
          <div className="text-sm font-bold text-[#F2F0EA] mt-1">Adversarial Safety</div>
          <div className="text-[11px] text-[#716F69] mt-1">INV-201..220 enforcement</div>
        </button>
      </div>

      {/* Scenario 1: Multi-Party Netting (Section 69) */}
      {activeScenario === 'NETTING' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#222222] pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F2F0EA]">Section 69: Multi-Party Netting Coordination Flow</h2>
              <p className="text-xs text-[#716F69]">Canonical cycle: A owes B (10), B owes A (7), C owes A (5), A owes C (2).</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((st) => (
                <button
                  key={st}
                  onClick={() => setNettingStep(st)}
                  className={`px-3 py-1 text-xs rounded font-mono ${
                    nettingStep === st ? 'bg-[#F2F0EA] text-[#080808] font-bold' : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                  }`}
                >
                  Step {st}
                </button>
              ))}
            </div>
          </div>

          {nettingStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#F2F0EA] font-mono">1. GROSS OBLIGATIONS BEFORE NETTING:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69]">Agent A → Agent B</span>
                  <span className="text-[#F2F0EA] font-bold block text-sm mt-1">10.00 USDC</span>
                </div>
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69]">Agent B → Agent A</span>
                  <span className="text-[#F2F0EA] font-bold block text-sm mt-1">7.00 USDC</span>
                </div>
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69]">Agent C → Agent A</span>
                  <span className="text-[#F2F0EA] font-bold block text-sm mt-1">5.00 USDC</span>
                </div>
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69]">Agent A → Agent C</span>
                  <span className="text-[#F2F0EA] font-bold block text-sm mt-1">2.00 USDC</span>
                </div>
              </div>
              <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222] text-xs font-mono text-[#B0ADA5] flex justify-between">
                <span>Total Gross Coordinated Value: <strong>24.00 USDC</strong> (4 distinct transactions)</span>
                <button onClick={() => setNettingStep(2)} className="text-[#D6A83A] font-bold hover:underline">Next: Generate Netting Proposal →</button>
              </div>
            </div>
          )}

          {nettingStep === 2 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#F2F0EA] font-mono">2. ALGORITHMIC NETTING PROPOSAL (PROPOSAL STAGE):</div>
              <div className="p-4 bg-[#0B0B0B] rounded border border-[#222222] text-xs font-mono space-y-2">
                <div className="text-[#D6A83A] font-bold">Proposal: net_mp_cycle_demo</div>
                <div className="text-[#B0ADA5]">Bilateral Netting A ↔ B: 10 - 7 = 3.00 USDC (A owes B)</div>
                <div className="text-[#B0ADA5]">Bilateral Netting A ↔ C: 5 - 2 = 3.00 USDC (C owes A)</div>
                <div className="text-[#B0ADA5]">Graph Cycle Collapse (C owes A 3, A owes B 3): Net transfer: C → B = 3.00 USDC!</div>
                <div className="text-[#2FB36F] font-bold pt-2">Gross: 24.00 USDC → Net: 3.00 USDC | Savings: 21.00 USDC (87.5% reduction)</div>
              </div>
              <button onClick={() => setNettingStep(3)} className="text-[#D6A83A] font-mono text-xs font-bold hover:underline">Next: Review Net Obligations →</button>
            </div>
          )}

          {nettingStep === 3 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#F2F0EA] font-mono">3. PROPOSED NET OBLIGATIONS:</div>
              <div className="p-4 bg-[#0B0B0B] rounded border border-[#222222] text-xs font-mono space-y-2">
                <div className="flex justify-between items-center text-sm font-bold text-[#F2F0EA]">
                  <span>Agent C owes Agent B</span>
                  <span>3.00 USDC</span>
                </div>
                <div className="text-[#716F69] text-[11px]">
                  Agent A balance is perfectly balanced (receives 3 from C, owes 3 to B; net zero liquidity required).
                </div>
              </div>
              <button onClick={() => setNettingStep(4)} className="text-[#D6A83A] font-mono text-xs font-bold hover:underline">Next: Policy / Risk / Treasury Checks →</button>
            </div>
          )}

          {nettingStep === 4 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#F2F0EA] font-mono">4. POLICY / RISK / TREASURY EVALUATION:</div>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69] block text-[10px]">Policy Gate</span>
                  <span className="text-[#2FB36F] font-bold">INV-203 PASS</span>
                </div>
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69] block text-[10px]">Risk Gate</span>
                  <span className="text-[#2FB36F] font-bold">INV-204 ALLOW</span>
                </div>
                <div className="p-3 bg-[#0B0B0B] rounded border border-[#222222]">
                  <span className="text-[#716F69] block text-[10px]">Treasury Liquidity</span>
                  <span className="text-[#D6A83A] font-bold">INV-206 RESERVED (3.00 USDC)</span>
                </div>
              </div>
              <button onClick={() => setNettingStep(5)} className="text-[#D6A83A] font-mono text-xs font-bold hover:underline">Next: Settlement & Reconciliation →</button>
            </div>
          )}

          {nettingStep === 5 && (
            <div className="space-y-4">
              <div className="text-sm font-bold text-[#F2F0EA] font-mono">5. SETTLEMENT BATCH & BLOCKCHAIN VERIFICATION:</div>
              <div className="p-4 bg-[#0B0B0B] rounded border border-[#222222] text-xs font-mono space-y-2">
                <div className="text-[#2FB36F] font-bold">Batch #batch_demo_01: SETTLED</div>
                <div className="text-[#B0ADA5]">PaymentIntent: pi_demo_net_01 executed for 3.00 USDC</div>
                <div className="text-[#716F69]">Arc Tx Hash: 0x8a91cbf443... (Block #184295)</div>
                <div className="text-[#2FB36F]">Reconciliation: MATCHED & CONFIRMED. Total transactions executed: 1 instead of 4.</div>
              </div>
              <button onClick={() => setNettingStep(1)} className="text-[#716F69] font-mono text-xs hover:underline">↺ Restart Netting Demo</button>
            </div>
          )}
        </div>
      )}

      {/* Scenario 2: Ambiguous Settlement Demo (Section 70) */}
      {activeScenario === 'AMBIGUOUS' && (
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#222222] pb-4">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Section 70: Ambiguous Settlement Simulation</h2>
            <p className="text-xs text-[#716F69]">Simulate payment submission where network response disappears. Zero blind rebroadcast.</p>
          </div>

          <div className="p-4 bg-[#0B0B0B] rounded border border-[#222222] font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span>Current Transaction State:</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                ambiguousStage === 'IDLE' ? 'bg-[#141414] text-[#716F69] border border-[#222222]' :
                ambiguousStage === 'SUBMITTING' ? 'bg-[#141414] text-[#F2F0EA] border border-[#222222]' :
                ambiguousStage === 'AMBIGUOUS' ? 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40' :
                ambiguousStage === 'RECONCILING' ? 'bg-[#141414] text-[#D6A83A] border border-[#222222]' :
                'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40'
              }`}>
                {ambiguousStage}
              </span>
            </div>

            {ambiguousStage === 'IDLE' && (
              <button
                onClick={() => setAmbiguousStage('AMBIGUOUS')}
                className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] rounded font-sans font-medium text-xs transition-colors"
              >
                Submit Payment & Inject Network Drop →
              </button>
            )}

            {ambiguousStage === 'AMBIGUOUS' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#141414] border border-[#D6A83A]/30 rounded text-[#D6A83A] space-y-1">
                  <div className="font-bold">⚠️ AMBIGUOUS SETTLEMENT DETECTED (INV-209 ENFORCED)</div>
                  <div>Outcome unknown. Transaction was NOT marked as FAILED.</div>
                  <div className="text-[#F2F0EA] font-bold">AUTOMATIC REBROADCAST STRICTLY PROHIBITED TO PREVENT DOUBLE-SPEND.</div>
                </div>
                <button
                  onClick={() => setAmbiguousStage('CONFIRMED')}
                  className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] rounded font-sans font-medium text-xs transition-colors"
                >
                  Run Authoritative Arc Node Reconciliation →
                </button>
              </div>
            )}

            {ambiguousStage === 'CONFIRMED' && (
              <div className="space-y-3">
                <div className="p-3 bg-[#141414] border border-[#2FB36F]/30 rounded text-[#2FB36F] space-y-1">
                  <div className="font-bold">✓ RECONCILIATION COMPLETE: TX FOUND ON-CHAIN</div>
                  <div>Mined in Arc block #184299. State transitioned directly to CONFIRMED.</div>
                  <div className="text-[#B0ADA5]">Prevented duplicate payment of 10.00 USDC.</div>
                </div>
                <button
                  onClick={() => setAmbiguousStage('IDLE')}
                  className="text-[#716F69] hover:underline"
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
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#222222] pb-4">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Section 71: Recurring Obligation Revalidation</h2>
            <p className="text-xs text-[#716F69]">Previous authorization does not remain valid forever (INV-212).</p>
          </div>

          <div className="p-4 bg-[#0B0B0B] rounded border border-[#222222] font-mono text-xs space-y-4">
            <div className="flex items-center justify-between">
              <span>Service Contract: #ctr_recurring_monthly</span>
              <span className="text-[#D6A83A] font-bold">Month {recurringMonth} of 12</span>
            </div>

            <div className="p-3 bg-[#141414] rounded border border-[#222222] text-[#F2F0EA]">
              Current Status: <strong className="text-[#D6A83A]">{recurringStatus}</strong>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPolicyChanged(true);
                  setRecurringMonth(2);
                  setRecurringStatus('MONTH 2: REVALIDATION FAILED — POLICY LIMIT DECREASED TO 5 USDC. PAYMENT BLOCKED (INV-212)!');
                }}
                className="px-4 py-2 bg-[#F2F0EA] hover:bg-white text-[#080808] rounded font-sans font-medium text-xs transition-colors"
              >
                Trigger Month 2 with Changed Policy Limit ($5 cap) →
              </button>
              <button
                onClick={() => {
                  setPolicyChanged(false);
                  setRecurringMonth(1);
                  setRecurringStatus('MONTH 1: AUTHORIZED AND SETTLED (10.00 USDC)');
                }}
                className="px-3 py-2 bg-[#141414] hover:bg-[#181818] text-[#716F69] border border-[#222222] rounded hover:text-[#F2F0EA] font-sans text-xs transition-colors"
              >
                Reset
              </button>
            </div>

            {policyChanged && (
              <div className="p-3 bg-[#141414] border border-[#D85C5C]/30 rounded text-[#D85C5C] space-y-1">
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
        <div className="bg-[#101010] border border-[#222222] rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#222222] pb-4">
            <h2 className="text-lg font-bold text-[#F2F0EA]">Section 72: Adversarial Safety Invariants Lab</h2>
            <p className="text-xs text-[#716F69]">Trigger machine-checked security invariants and verify immediate policy blocks.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => runSafetyTest('policy_exceeded')}
              className="p-3 bg-[#0B0B0B] hover:bg-[#141414] border border-[#222222] rounded-lg text-left font-mono text-xs transition-colors"
            >
              <span className="text-[#D6A83A] block font-bold">Test 1</span>
              <span className="text-[#F2F0EA]">Netting Exceeding Policy</span>
            </button>
            <button
              onClick={() => runSafetyTest('expired_approval')}
              className="p-3 bg-[#0B0B0B] hover:bg-[#141414] border border-[#222222] rounded-lg text-left font-mono text-xs transition-colors"
            >
              <span className="text-[#D6A83A] block font-bold">Test 2</span>
              <span className="text-[#F2F0EA]">Expired Approval Ticket</span>
            </button>
            <button
              onClick={() => runSafetyTest('disputed_settlement')}
              className="p-3 bg-[#0B0B0B] hover:bg-[#141414] border border-[#222222] rounded-lg text-left font-mono text-xs transition-colors"
            >
              <span className="text-[#D6A83A] block font-bold">Test 3</span>
              <span className="text-[#F2F0EA]">Disputed Obligation</span>
            </button>
            <button
              onClick={() => runSafetyTest('wrong_recipient')}
              className="p-3 bg-[#0B0B0B] hover:bg-[#141414] border border-[#222222] rounded-lg text-left font-mono text-xs transition-colors"
            >
              <span className="text-[#D85C5C] block font-bold">Test 4</span>
              <span className="text-[#F2F0EA]">Wrong Recipient Evidence</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="text-[#716F69] uppercase text-[10px]">Safety Lab Audit Log:</div>
            {safetyLog.length === 0 ? (
              <div className="py-8 text-center text-[#716F69]">Click any safety test button above to run scenario.</div>
            ) : (
              safetyLog.map((log, idx) => (
                <div key={idx} className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F2F0EA]">{log.test}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SECURITY_INCIDENT' ? 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/40' : 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-[#B0ADA5]">{log.result}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
