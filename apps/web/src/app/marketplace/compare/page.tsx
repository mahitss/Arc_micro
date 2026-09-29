'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { compareProviders } from '@/lib/api/marketplace';

export default function MarketplaceComparePage() {
  const [capability, setCapability] = useState('code_audit');
  const [providers] = useState(['agent_security_02', 'agent_research_01', 'agent_verifier_03']);
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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="text-xs text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors">
              ← Marketplace
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="font-mono text-xs text-[#D6A83A]">compare</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161616] text-[#D6A83A] border border-[#252525]">
              SIMULATED COMPARISON
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EA] mt-1.5">
            Side-by-Side Provider Comparison (Section 46)
          </h1>
          <p className="text-xs text-[#716F69] mt-1">
            Empirical multi-factor comparison with deterministic tie-breakers.
            <span className="text-[#B0ADA5] ml-1 font-mono">Read-only simulation fixture (INV-193).</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#716F69]">Target Capability:</span>
          <select
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            className="bg-[#101010] border border-[#222222] text-xs rounded px-3 py-1.5 text-[#F2F0EA] focus:outline-none focus:border-[#D6A83A]"
          >
            <option value="code_audit">code_audit (Security Audit)</option>
            <option value="market_research">market_research (Data Intel)</option>
            <option value="result_verification">result_verification (Quality Gate)</option>
          </select>
        </div>
      </div>

      {/* WHY THIS PROVIDER? Explainer Panel (Section 47) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F2F0EA] flex items-center gap-2">
            <span>💡 Why This Provider? — Deterministic Selection Reasoning</span>
          </h2>
          <span className="text-[10px] font-mono bg-[#141414] text-[#D6A83A] px-2 py-0.5 rounded border border-[#222222]">
            Section 47 Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#0B0B0B] rounded-lg border border-[#D6A83A]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F2F0EA] text-sm">agent_security_02</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#141414] text-[#2FB36F] border border-[#222222] rounded">
                RANK #1 WINNER
              </span>
            </div>
            <div className="space-y-1 text-[#B0ADA5] text-[11px]">
              <div>• <strong>Capability:</strong> MATCH (Formal verification & fuzzing)</div>
              <div>• <strong>Latency:</strong> 300ms (Estimated)</div>
              <div>• <strong>Policy:</strong> ALLOWED (Constitutional pass)</div>
              <div>• <strong>Risk:</strong> 15/100 (Within low risk limit)</div>
              <div>• <strong>Historical Success:</strong> 98.0% (N=48 observed contracts)</div>
              <div>• <strong>Price Quote:</strong> 75.00 USDC (Cap: 100.00 USDC)</div>
              <div className="text-[#D6A83A] pt-1 font-mono text-[10px]">
                Tie-break: Lowest qualified price within risk cap
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0B0B0B] rounded-lg border border-[#222222] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F2F0EA] text-sm">agent_research_01</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#141414] text-[#716F69] border border-[#222222] rounded">
                ALTERNATIVE
              </span>
            </div>
            <div className="space-y-1 text-[#716F69] text-[11px]">
              <div>• <strong>Capability:</strong> Offers market_research</div>
              <div>• <strong>Latency:</strong> 120ms</div>
              <div>• <strong>Policy:</strong> ALLOWED</div>
              <div>• <strong>Risk:</strong> 10/100</div>
              <div>• <strong>Historical Success:</strong> 95.0% (N=32 jobs)</div>
              <div>• <strong>Base Price:</strong> 45.00 USDC</div>
              <div className="text-[#D85C5C] pt-1 text-[10px]">
                Rejected reason: Capability mismatch for code_audit jobs
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0B0B0B] rounded-lg border border-[#222222] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F2F0EA] text-sm">agent_verifier_03</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#141414] text-[#716F69] border border-[#222222] rounded">
                ALTERNATIVE
              </span>
            </div>
            <div className="space-y-1 text-[#716F69] text-[11px]">
              <div>• <strong>Capability:</strong> Offers result_verification</div>
              <div>• <strong>Latency:</strong> 30ms</div>
              <div>• <strong>Policy:</strong> ALLOWED</div>
              <div>• <strong>Risk:</strong> 5/100</div>
              <div>• <strong>Historical Success:</strong> 99.0% (N=150 jobs)</div>
              <div>• <strong>Base Price:</strong> 10.00 USDC</div>
              <div className="text-[#D85C5C] pt-1 text-[10px]">
                Rejected reason: Specialized for milestone oracle validation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Table (Section 46) */}
      <div className="bg-[#101010] border border-[#222222] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#222222] flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F2F0EA]">
            Attribute Dimension Matrix (Simulated Telemetry)
          </h2>
          <span className="text-xs text-[#716F69] font-mono">Comparing {comparison.length} candidate providers</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#716F69] animate-pulse">
            Loading provider dimensions...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222222] bg-[#0B0B0B] text-[#716F69]">
                  <th className="p-3.5 font-medium">Evaluation Dimension</th>
                  {comparison.map((item, idx) => (
                    <th key={idx} className="p-3.5 font-semibold text-[#F2F0EA]">
                      <span className="font-mono text-[#D6A83A]">{item.provider_id}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] text-[#B0ADA5]">
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Capability Compatibility</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 font-bold">
                      {item.capability_match ? (
                        <span className="text-[#2FB36F]">✓ MATCH</span>
                      ) : (
                        <span className="text-[#716F69]">✗ DIFFERENT CAPABILITY</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Base Price (USDC)</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 font-bold text-[#F2F0EA]">
                      ${item.base_price_usdc} USDC <span className="text-[10px] text-[#716F69] font-normal">(SIMULATED)</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Availability Status</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 text-[#2FB36F]">
                      ● {item.availability} (SIMULATED)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Historical Completion Rate</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 font-bold text-[#2FB36F]">
                      {item.historical_success}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Sample Size (Observed Contracts)</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 text-[#B0ADA5]">
                      N={item.sample_size} (HISTORICAL BASELINE)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Risk Score / 100</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 text-[#F2F0EA] font-mono">
                      {item.risk_score} (LOW)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 text-[#716F69] font-medium">Constitution Policy Clearance</td>
                  {comparison.map((item, idx) => (
                    <td key={idx} className="p-3.5 text-[#2FB36F] font-semibold">
                      {item.policy_compatible ? 'PASS (ALLOWED)' : 'DENIED'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
