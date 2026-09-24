'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchControlIncidents, ControlIncident } from '../../../lib/api/control';

export default function ControlIncidentsPage() {
  const [incidents, setIncidents] = useState<ControlIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadIncidents();
  }, [filterStatus]);

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await fetchControlIncidents('org_default', filterStatus);
      setIncidents(res.incidents || []);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-24">
      {/* HEADER */}
      <section className="bg-[#0b1220] border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-amber-400 font-bold">INCIDENT CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-mono font-bold">
            AUTOMATED MITIGATION RUNTIME
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-mono">
              INCIDENT RESPONSE & RECOVERY CENTER
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              End-to-end incident tracking: provider timeouts, policy conflicts, and automated replanning recovery.
            </p>
          </div>

          <div className="flex gap-1.5 font-mono text-xs">
            {['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded font-bold transition-colors ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-sm bg-[#0e1626] border border-slate-800 rounded-xl">
              No incidents recorded matching status {filterStatus}
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.incident_id}
                className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{inc.title}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/20 text-[10px]">
                        {inc.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        {inc.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Incident ID: {inc.incident_id} | Detected: {new Date(inc.detected_at).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-slate-400 text-xs font-bold">
                    SEVERITY: <strong className={inc.severity === 'HIGH' || inc.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}>{inc.severity}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Trigger Event:</span>
                    <p className="text-slate-200">{inc.trigger_event}</p>
                    <span className="text-slate-500 uppercase text-[10px] block pt-2">Root Cause:</span>
                    <p className="text-slate-300">{inc.root_cause}</p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-500 uppercase text-[10px] block">Automated Resolution Outcome:</span>
                    <p className="text-emerald-400">{inc.resolution_notes}</p>
                    {inc.resolved_at && (
                      <span className="text-slate-500 text-[10px] block pt-2">
                        MTTR / Resolved At: {new Date(inc.resolved_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {inc.timeline && inc.timeline.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] uppercase font-bold text-slate-400">
                      Causal Recovery Timeline ({inc.timeline.length} Steps):
                    </span>
                    <div className="space-y-1.5">
                      {inc.timeline.map((step) => (
                        <div
                          key={step.step_number}
                          className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                              {step.step_number}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-700">
                              {step.subsystem}
                            </span>
                            <span className="text-slate-200 text-xs">{step.description}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
