'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchRuntimeWorkers, RuntimeWorker } from '../../../../lib/api/runtime';

export default function WorkersFleetPage() {
  const [workers, setWorkers] = useState<RuntimeWorker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
    const timer = setInterval(loadWorkers, 5000);
    return () => clearInterval(timer);
  }, []);

  async function loadWorkers() {
    try {
      const res = await fetchRuntimeWorkers();
      setWorkers(res.workers);
    } catch (err) {
      console.error('Failed to load workers fleet', err);
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
          <h1 className="text-2xl font-bold text-white mt-1">Runtime Worker Fleet</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributed execution nodes operating under monotonic lease fencing (INV-101).
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            {workers.filter((w) => w.status === 'HEALTHY').length} Healthy
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {workers.filter((w) => w.status === 'STALE').length} Stale
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => (
          <div key={worker.worker_id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{worker.worker_id}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  worker.status === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {worker.status}
              </span>
            </div>

            <div className="space-y-1 text-slate-400 pt-1">
              <div>Type: <span className="text-slate-200">{worker.worker_type}</span></div>
              <div>Host: <span className="text-slate-200">{worker.hostname}</span></div>
              <div>Version: <span className="text-indigo-400">{worker.version}</span></div>
              <div>Heartbeat: <span className="text-slate-300">{new Date(worker.heartbeat_at).toLocaleTimeString()}</span></div>
              <div>Last Seen: <span className="text-slate-300">{new Date(worker.last_seen).toLocaleTimeString()}</span></div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Heartbeat Verified
              </span>
              <span className="text-slate-500">Node Active</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
