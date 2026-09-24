'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchRuntimeQueues, QueueMetrics } from '../../../../lib/api/runtime';

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueues();
    const timer = setInterval(loadQueues, 5000);
    return () => clearInterval(timer);
  }, []);

  async function loadQueues() {
    try {
      const res = await fetchRuntimeQueues();
      setQueues(res);
    } catch (err) {
      console.error('Failed to load queues', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/control/runtime" className="text-xs font-mono text-indigo-400 hover:underline">
              ← Runtime Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Runtime Queue & Throughput</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Durable database-backed scheduling queues and worker utilization telemetry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl font-mono">
          <div className="text-xs text-slate-400 uppercase">Queue Depth</div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {queues?.queue_depth ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending claims</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl font-mono">
          <div className="text-xs text-slate-400 uppercase">Active Workflows</div>
          <div className="text-3xl font-extrabold text-indigo-400 mt-2">
            {queues?.active_workflows ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Executing steps</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl font-mono">
          <div className="text-xs text-slate-400 uppercase">Reconciliation Queue</div>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">
            {queues?.reconciliation_queue_size ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Ambiguous operations</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl font-mono">
          <div className="text-xs text-slate-400 uppercase">Worker Utilization</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">
            {queues ? `${((queues.worker_utilization_pct || 0) * 100).toFixed(1)}%` : (loading ? '...' : '0%')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Capacity consumed</div>
        </div>
      </div>
    </div>
  );
}
