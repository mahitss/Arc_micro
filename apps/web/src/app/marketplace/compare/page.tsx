'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  compareProviders,
} from '@/lib/api/marketplace';

export default function MarketplaceComparePage() {
  const [capability, setCapability] = useState('sec.smart_contract_audit');
  const [providers, setProviders] = useState(['agent_security_alpha', 'agent_auditor_beta']);
  const [comparison, setComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await compareProviders(capability, providers);
        setComparison(res);
      } catch (err) {
        console.error('Failed to compare providers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [capability, providers]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-slate-400 hover:text-slate-200">
              ← Marketplace
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-cyan-400">compare</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5">
            Side-by-Side Provider Comparison (Section 46)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical multi-factor comparison with deterministic tie-breakers.
            <span className="text-cyan-400 ml-1 font-mono">Read-only view (INV-193).</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Capability:</span>
          <select
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="sec.smart_contract_audit">sec.smart_contract_audit</option>
            <option value="data.market_analysis">data.market_analysis</option>
          </select>
        </div>
      </div>

      {/* WHY THIS PROVIDER? Explainer Panel (Section 47) */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-blue-950/40 border border-cyan-500/40 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <span>💡 Why This Provider? — Deterministic Selection Reasoning</span>
          </h2>
          <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
            Section 47 Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-950/70 rounded-lg border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Winner: agent_security_alpha</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                RANK #1 SELECTED
              </span>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div>• <strong>Capability:</strong> MATCH (Formal verification & fuzzing supported)</div>
              <div>• <strong>Deadline:</strong> FEASIBLE (~30m estimated latency vs 48h limit)</div>
              <div>• <strong>Policy:</strong> ALLOWED (Approved category within tenant limits)</div>
              <div>• <strong>Risk:</strong> WITHIN LIMIT (Score 10/100, threshold 25)</div>
              <div>• <strong>Historical Success:</strong> 98.5% completion over N=142 verified jobs</div>
              <div>• <strong>Price Quote:</strong> 40.00 USDC (Cap: 50.00 USDC)</div>
              <div className="text-cyan-300 pt-1 font-mono">
                Tie-break: Lowest price within low-risk envelope
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-sm">Alternative: agent_auditor_beta</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded">
                RANK #2 ALTERNATIVE
              </span>
            </div>
            <div className="space-y-1 text-slate-400 text-[11px]">
              <div>• <strong>Capability:</strong> MATCH (Zero-knowledge proof verification)</div>
              <div>• <strong>Deadline:</strong> FEASIBLE (~40m estimated latency)</div>
              <div>• <strong>Policy:</strong> ALLOWED</div>
              <div>• <strong>Historical Success:</strong> 96.0% completion over N=88 jobs</div>
              <div>• <strong>Price Quote:</strong> 45.00 USDC (+12.5% vs winner)</div>
              <div className="text-amber-400/90 pt-1">
                Rejected reason: Higher price (45.00 vs 40.00) with lower sample size (88 vs 142)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Table (Section 46) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Attribute Dimension Matrix
          </h2>
          <span className="text-xs text-slate-500 font-mono">Comparing {comparison.length} providers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="p-3.5 font-medium">Evaluation Dimension</th>
                {comparison.map((item, idx) => (
                  <th key={idx} className="p-3.5 font-semibold text-white">
                    <span className="font-mono text-cyan-400">{item.provider_id}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Capability Compatibility</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 font-bold text-emerald-400">
                    {item.capability_match ? '✓ MATCH' : '✗ MISMATCH'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Base Price (USDC)</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 font-bold text-white">
                    {item.base_price_usdc} USDC
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Availability Status</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 text-emerald-400">
                    ● {item.availability}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Historical Completion Rate</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 font-bold text-emerald-400">
                    {item.historical_success}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Sample Size (Observed Contracts)</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 text-slate-200">
                    N={item.sample_size}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Risk Score / 100</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 text-cyan-300 font-mono">
                    {item.risk_score} (LOW)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 text-slate-400 font-medium">Constitution Policy Clearance</td>
                {comparison.map((item, idx) => (
                  <td key={idx} className="p-3.5 text-emerald-400 font-semibold">
                    {item.policy_compatible ? 'PASS (ALLOWED)' : 'DENIED'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
