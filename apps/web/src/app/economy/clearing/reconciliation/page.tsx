'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ReconciliationRecord,
  fetchReconciliation,
  runReconciliation,
} from '../../../../lib/api/clearinghouse';

export default function ReconciliationCenterPage() {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'MATCHED' | 'MISMATCH' | 'PENDING' | 'AMBIGUOUS'>('ALL');
  const [loading, setLoading] = useState(true);
  const [obligationInput, setObligationInput] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchReconciliation();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleRunRecon = async () => {
    if (!obligationInput.trim()) return;
    setReconciling(true);
    setMessage(null);
    try {
      const rec = await runReconciliation(obligationInput.trim());
      setMessage(`Reconciliation completed for ${obligationInput}: ${rec.status}`);
      setObligationInput('');
      loadRecords();
    } catch (err: any) {
      setMessage(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const filtered = records.filter(r => filter === 'ALL' || r.status === filter);

  const formatUsdc = (baseUnits?: string) => {
    if (!baseUnits) return '—';
    const val = parseInt(baseUnits, 10);
    return `$${(val / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#716F69] mb-1">
            <Link href="/economy/clearing" className="hover:text-[#D6A83A]">Clearinghouse</Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-[#F2F0EA]">Reconciliation Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F2F0EA]">Machine-Checked Reconciliation Center</h1>
          <p className="text-sm text-[#716F69] mt-1 max-w-2xl">
            Continuous cryptographic audit verifying internal obligations and payment intents against mined Arc on-chain receipts and AgentVault events.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#716F69] bg-[#101010] px-3 py-2 rounded-lg border border-[#222222]">
          <span className="w-2 h-2 rounded-full bg-[#2FB36F]" />
          <span>INV-68: Never Silently Repair Mismatches</span>
        </div>
      </div>

      {/* Manual Trigger Bar */}
      <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Enter Obligation ID (e.g. ob_live_01)..."
            value={obligationInput}
            onChange={(e) => setObligationInput(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[#F2F0EA] font-mono text-xs w-full sm:w-80 focus:outline-none focus:border-[#D6A83A]"
          />
          <button
            onClick={handleRunRecon}
            disabled={reconciling || !obligationInput.trim()}
            className="px-4 py-2 rounded-lg bg-[#F2F0EA] hover:bg-white disabled:opacity-50 text-[#080808] font-mono text-xs font-semibold whitespace-nowrap transition-colors"
          >
            {reconciling ? 'Auditing Receipt...' : 'Run Audit Check'}
          </button>
        </div>

        {message && (
          <div className="text-xs font-mono text-[#D6A83A]">
            {message}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-mono">
        {(['ALL', 'MATCHED', 'AMBIGUOUS', 'PENDING', 'MISMATCH'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${
              filter === st
                ? 'bg-[#D6A83A] border-[#D6A83A] text-[#080808] font-bold'
                : 'bg-[#101010] border-[#222222] text-[#716F69] hover:text-[#F2F0EA]'
            }`}
          >
            {st} ({st === 'ALL' ? records.length : records.filter(r => r.status === st).length})
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
        {loading ? (
          <div className="p-16 text-center font-mono text-sm text-[#716F69]">
            Scanning blockchain receipt proofs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center font-mono text-sm text-[#716F69]">
            No reconciliation records found matching &apos;{filter}&apos;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#716F69] text-[11px]">
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">RECORD ID</th>
                  <th className="pb-3">INTENT / OBLIGATION</th>
                  <th className="pb-3">EXPECTED AMOUNT</th>
                  <th className="pb-3">ACTUAL SETTLED</th>
                  <th className="pb-3">TRANSACTION HASH</th>
                  <th className="pb-3">AUDIT NOTES & ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filtered.map((rec) => (
                  <tr key={rec.record_id} className="hover:bg-[#141414]">
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        rec.status === 'MATCHED'
                          ? 'bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/30'
                          : rec.status === 'MISMATCH'
                          ? 'bg-[#141414] text-[#D85C5C] border border-[#D85C5C]/30'
                          : rec.status === 'AMBIGUOUS'
                          ? 'bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30'
                          : 'bg-[#141414] text-[#716F69] border border-[#222222]'
                      }`}>
                        {rec.status === 'MATCHED' ? '✓ MATCHED' : rec.status === 'MISMATCH' ? '✗ MISMATCH' : rec.status}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-[#F2F0EA]">{rec.record_id}</td>
                    <td className="py-4 text-[#D6A83A]">
                      <div>{rec.payment_intent_id}</div>
                      <div className="text-[10px] text-[#716F69]">{rec.obligation_id}</div>
                    </td>
                    <td className="py-4 text-[#F2F0EA] font-bold">{formatUsdc(rec.expected_amount)}</td>
                    <td className="py-4 text-[#2FB36F] font-bold">{formatUsdc(rec.actual_amount)}</td>
                    <td className="py-4 text-[#716F69] font-mono max-w-[130px] truncate">
                      {rec.transaction_hash || 'Pending Mined Block'}
                    </td>
                    <td className="py-4 text-[#B0ADA5] max-w-sm">
                      <div className="text-[#B0ADA5]">{rec.discrepancy_notes}</div>
                      {rec.recommended_action && (
                        <div className="text-[#D6A83A] text-[11px] mt-0.5 font-bold">
                          Action: {rec.recommended_action}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
