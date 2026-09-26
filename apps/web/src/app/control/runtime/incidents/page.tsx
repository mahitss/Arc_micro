'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchRuntimeIncidents,
  reconcileIncident,
  RuntimeIncident,
} from '../../../../lib/api/runtime';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<RuntimeIncident[]>([]);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadIncidents();
  }, [selectedState]);

  async function loadIncidents() {
    setLoading(true);
    try {
      const res = await fetchRuntimeIncidents(selectedState === 'ALL' ? undefined : selectedState);
      setIncidents(res.incidents);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcile(incidentId: string) {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await reconcileIncident(incidentId);
      setMessage({ text: `Incident ${incidentId}: ${res.message}`, type: 'success' });
      await loadIncidents();
    } catch (err: any) {
      setMessage({ text: `Reconciliation failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/control/runtime" className="text-xs font-mono text-[#D6A83A] hover:underline">
              ← Runtime Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Operational Incidents</h1>
          <p className="text-xs text-[#85827B] mt-0.5">
            Actionable runtime incidents requiring automated or operator-guided reconciliation.
          </p>
        </div>

        <div className="flex gap-2 p-1 rounded-xl bg-[#101010] border border-[#222222] font-mono text-xs">
          {['ALL', 'OPEN', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedState(s)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedState === s
                  ? 'bg-[#141414] text-[#F2F0EA] font-semibold border border-[#222222]'
                  : 'text-[#85827B] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#141414] border border-[#2FB36F]/30 text-[#2FB36F]'
              : 'bg-[#141414] border border-[#D85C5C]/30 text-[#D85C5C]'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-[#85827B] hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="p-12 text-center text-[#50504C] font-mono text-xs rounded-2xl bg-[#101010] border border-[#222222]">
            {loading ? 'Loading incidents...' : 'No incidents matching criteria.'}
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.incident_id}
              className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inc.state === 'OPEN'
                        ? 'bg-[#141414] text-[#D85C5C] border border-[#222222]'
                        : 'bg-[#141414] text-[#2FB36F] border border-[#222222]'
                    }`}
                  >
                    {inc.state}
                  </span>
                  <span className="font-bold text-white text-sm">{inc.incident_id}</span>
                  <span className="text-[#85827B]">({inc.category})</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inc.severity === 'CRITICAL'
                      ? 'bg-[#141414] text-[#D85C5C] border border-[#222222]'
                      : inc.severity === 'HIGH'
                      ? 'bg-[#141414] text-[#D6A83A] border border-[#222222]'
                      : 'bg-[#141414] text-[#6B8FD6] border border-[#222222]'
                  }`}
                >
                  {inc.severity}
                </span>
              </div>

              <div className="text-[#B0ADA5] space-y-1">
                <div>
                  <span className="text-[#85827B]">Root Cause:</span> {inc.root_cause}
                </div>
                {inc.remediation && (
                  <div>
                    <span className="text-[#2FB36F]">Remediation:</span> {inc.remediation}
                  </div>
                )}
                <div className="text-[11px] text-[#50504C] pt-1">
                  Workflow: {inc.workflow_id} | Detected: {new Date(inc.detected_at).toLocaleString()}
                </div>
              </div>

              {inc.state === 'OPEN' && (
                <div className="pt-2 border-t border-[#222222] flex justify-end">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleReconcile(inc.incident_id)}
                    className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#1C1C1C] text-[#E5E2DA] border border-[#2A2A2A] font-semibold transition-colors"
                  >
                    Reconcile Incident
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
