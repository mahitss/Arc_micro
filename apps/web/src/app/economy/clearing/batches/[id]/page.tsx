'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SettlementBatchDetailPage() {
  const params = useParams();
  const batchId = (params?.id as string) || 'batch_sched_01';

  const [executing, setExecuting] = useState(false);
  const [status, setStatus] = useState('READY');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleExecute = async () => {
    setExecuting(true);
    setTimeout(() => {
      setStatus('SETTLED');
      setSuccessMsg(`Settlement Batch ${batchId} executed successfully across all obligations.`);
      setExecuting(false);
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <Link href="/economy/clearing" className="hover:text-cyan-400">Clearinghouse</Link>
            <span>/</span>
            <span className="text-white">Batch Inspection</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Settlement Batch: {batchId}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated multi-obligation settlement executed through the canonical AgentPay policy and treasury control plane (INV-62).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
            status === 'SETTLED'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          }`}>
            {status}
          </span>
          {status !== 'SETTLED' && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-colors"
            >
              {executing ? 'Executing Batch...' : 'Execute Batch Settlement →'}
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
          ✓ {successMsg}
        </div>
      )}

      {/* Batch Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase">Gross Value</div>
          <div className="text-2xl font-bold text-white mt-1">$40.00 USDC</div>
          <div className="text-[11px] text-slate-500 mt-1">40,000,000 base units</div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase">Net Residual</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">$40.00 USDC</div>
          <div className="text-[11px] text-slate-500 mt-1">Direct payout required</div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-slate-400 text-xs uppercase">Execution Mode</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">REAL (ARC)</div>
          <div className="text-[11px] text-slate-500 mt-1">Target Vault: 0x1111...</div>
        </div>
      </div>

      {/* Items list */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono">
        <h2 className="text-lg font-semibold text-white font-sans">Batch Obligations (2 Items)</h2>
        <div className="divide-y divide-slate-800">
          <div className="py-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-white font-bold">ob_live_01</span>
              <span className="text-slate-400 ml-2">(Security Intelligence Deliverable)</span>
            </div>
            <div className="text-emerald-400 font-bold">$30.00 USDC</div>
          </div>
          <div className="py-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-white font-bold">ob_sim_02</span>
              <span className="text-slate-400 ml-2">(Synthetic Dataset Generation)</span>
            </div>
            <div className="text-emerald-400 font-bold">$10.00 USDC</div>
          </div>
        </div>
      </div>
    </div>
  );
}
