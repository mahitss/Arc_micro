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
    <div className="min-h-screen bg-[#080808] text-[#F2F0EA] font-sans pb-24">
      {/* HEADER */}
      <section className="bg-[#080808] border-b border-[#222222] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/control"
              className="text-xs font-mono text-[#B0ADA5] hover:text-[#F2F0EA] transition-colors"
            >
              &larr; CONTROL TOWER
            </Link>
            <span className="text-[#50504C]">/</span>
            <span className="text-xs font-mono text-[#D6A83A] font-bold">INCIDENT CENTER</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-[#141414] text-[#D6A83A] border border-[#2D2D2D] text-xs font-mono font-bold">
            AUTOMATED MITIGATION RUNTIME
          </span>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#F2F0EA] font-mono">
              INCIDENT RESPONSE & RECOVERY CENTER
            </h1>
            <p className="text-sm text-[#B0ADA5] mt-1">
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
                    ? 'bg-[#141414] text-[#F2F0EA] border border-[#2D2D2D]'
                    : 'bg-[#101010] text-[#716F69] hover:text-[#F2F0EA] border border-[#222222]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="py-16 text-center text-[#716F69] font-mono text-sm bg-[#101010] border border-[#222222] rounded-xl">
              No incidents recorded matching status {filterStatus}
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.incident_id}
                className="bg-[#101010] border border-[#222222] rounded-xl p-5 space-y-4 font-mono text-xs shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#222222] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#F2F0EA] font-bold text-sm">{inc.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/30 text-[10px]">
                        {inc.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#2FB36F]/10 text-[#2FB36F] border border-[#2FB36F]/30 text-[10px] font-bold">
                        {inc.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#716F69] mt-1 block">
                      Incident ID: {inc.incident_id} | Detected: {new Date(inc.detected_at).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-[#B0ADA5] text-xs font-bold">
                    SEVERITY: <strong className={inc.severity === 'HIGH' || inc.severity === 'CRITICAL' ? 'text-[#D85C5C]' : 'text-[#D6A83A]'}>{inc.severity}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-1">
                    <span className="text-[#716F69] uppercase text-[10px] block">Trigger Event:</span>
                    <p className="text-[#F2F0EA]">{inc.trigger_event}</p>
                    <span className="text-[#716F69] uppercase text-[10px] block pt-2">Root Cause:</span>
                    <p className="text-[#B0ADA5]">{inc.root_cause}</p>
                  </div>

                  <div className="p-3 bg-[#0B0B0B] border border-[#222222] rounded-lg space-y-1">
                    <span className="text-[#716F69] uppercase text-[10px] block">Automated Resolution Outcome:</span>
                    <p className="text-[#2FB36F]">{inc.resolution_notes}</p>
                    {inc.resolved_at && (
                      <span className="text-[#50504C] text-[10px] block pt-2">
                        MTTR / Resolved At: {new Date(inc.resolved_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {inc.timeline && inc.timeline.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] uppercase font-bold text-[#716F69]">
                      Causal Recovery Timeline ({inc.timeline.length} Steps):
                    </span>
                    <div className="space-y-1.5">
                      {inc.timeline.map((step) => (
                        <div
                          key={step.step_number}
                          className="p-2.5 bg-[#0B0B0B] border border-[#222222] rounded-lg flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#141414] text-[#D6A83A] border border-[#222222] flex items-center justify-center font-bold text-[10px]">
                              {step.step_number}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#B0ADA5] text-[10px] border border-[#222222]">
                              {step.subsystem}
                            </span>
                            <span className="text-[#F2F0EA] text-xs">{step.description}</span>
                          </div>
                          <span className="text-[10px] text-[#50504C]">
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
