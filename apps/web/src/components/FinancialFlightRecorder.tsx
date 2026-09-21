'use client';

import React, { useState } from 'react';
import { PaymentTrace, TraceStep } from '../lib/api/types';
import { CopyButton } from './CopyButton';
import { AddressDisplay } from './AddressDisplay';

interface FinancialFlightRecorderProps {
  trace: PaymentTrace | null;
  loading?: boolean;
  error?: string | null;
}

export function FinancialFlightRecorder({ trace, loading, error }: FinancialFlightRecorderProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4 animate-pulse">
        <div className="h-6 w-64 bg-slate-800 rounded" />
        <div className="h-20 bg-slate-800/50 rounded-xl" />
        <div className="h-48 bg-slate-800/30 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <span>Flight Recorder</span>
        </h2>
        <div className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono">
          Unable to reconstruct trace: {error}
        </div>
      </div>
    );
  }

  if (!trace) {
    return null;
  }

  const isSimulation = trace.execution_mode === 'SIMULATION';
  const isLive = trace.execution_mode === 'LIVE';

  return (
    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-6 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-white font-mono tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              Financial Flight Recorder
            </span>
            {/* Live vs Simulation explicit badge */}
            {isSimulation ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ⚗ SIMULATION — NO BLOCKCHAIN SETTLEMENT
              </span>
            ) : isLive ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ● LIVE ARC SETTLEMENT
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {trace.execution_mode}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Deterministic, append-only financial decision trail with non-repudiable evidence
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Trace ID:</span>
          <span className="text-slate-300 font-semibold">{trace.trace_id}</span>
          <CopyButton textToCopy={trace.trace_id} label="Trace ID" />
        </div>
      </div>

      {/* Canonical Flow Pipeline Diagram */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-x-auto">
        <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          Canonical Lifecycle Trail
        </div>
        <div className="flex items-center gap-1.5 min-w-[760px] text-[11px] font-mono">
          {[
            { key: 'REQUEST', label: 'REQUEST' },
            { key: 'IDENTITY', label: 'IDENTITY' },
            { key: 'SERVICE', label: 'SERVICE' },
            { key: 'QUOTE', label: 'QUOTE' },
            { key: 'POLICY', label: 'POLICY' },
            { key: 'RISK', label: 'RISK' },
            { key: 'APPROVAL', label: 'APPROVAL' },
            { key: 'RESERVE', label: 'RESERVE' },
            { key: 'EXECUTE', label: 'EXECUTE' },
            { key: 'ARC_TX', label: 'ARC TX' },
            { key: 'COMPLETE', label: 'COMPLETE' },
          ].map((node, idx, arr) => {
            const stepMatches = trace.steps.some(
              (s) => s.type.includes(node.key) || (node.key === 'RESERVE' && s.type.includes('TREASURY'))
            );
            return (
              <React.Fragment key={node.key}>
                <div
                  className={`px-2.5 py-1 rounded-md border text-center font-semibold ${
                    stepMatches
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800'
                  }`}
                >
                  {node.label}
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-slate-600 font-bold select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Structured Evidence Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Policy Evidence */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">1. Policy Evidence</div>
          {trace.policy_evidence ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Decision:</span>
                <span
                  className={`font-bold ${
                    trace.policy_evidence.decision === 'ALLOW'
                      ? 'text-emerald-400'
                      : trace.policy_evidence.decision === 'APPROVAL_REQUIRED'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {trace.policy_evidence.decision}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Reason Code:</span>
                <span className="text-slate-200">{trace.policy_evidence.reason_code || '—'}</span>
              </div>
              {trace.policy_evidence.risk_score !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Risk Score:</span>
                  <span className="text-slate-200">{trace.policy_evidence.risk_score}/100</span>
                </div>
              )}
              {trace.policy_evidence.remaining_daily_limit !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Remaining Daily:</span>
                  <span className="text-teal-400">
                    ${(Number(trace.policy_evidence.remaining_daily_limit) / 1e6).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic">No policy evidence recorded</div>
          )}
        </div>

        {/* Approval Evidence */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">2. Approval Evidence</div>
          {trace.approval_evidence ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold ${
                    trace.approval_evidence.status === 'APPROVED'
                      ? 'text-emerald-400'
                      : trace.approval_evidence.status === 'REJECTED'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {trace.approval_evidence.status}
                </span>
              </div>
              {trace.approval_evidence.approved_by && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Approved By:</span>
                  <span className="text-slate-200">{trace.approval_evidence.approved_by}</span>
                </div>
              )}
              {trace.approval_evidence.rejection_reason && (
                <div className="text-rose-400 text-[11px] mt-1">
                  Reason: {trace.approval_evidence.rejection_reason}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic">Not required by policy</div>
          )}
        </div>

        {/* Treasury Evidence */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">3. Treasury Lock</div>
          {trace.treasury_evidence ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold ${
                    trace.treasury_evidence.status === 'SETTLED'
                      ? 'text-emerald-400'
                      : trace.treasury_evidence.status === 'RESERVED'
                      ? 'text-teal-400'
                      : 'text-slate-400'
                  }`}
                >
                  {trace.treasury_evidence.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Amount:</span>
                <span className="text-white">
                  ${(Number(trace.treasury_evidence.amount) / 1e6).toFixed(2)}{' '}
                  <span className="text-teal-400">{trace.treasury_evidence.asset}</span>
                </span>
              </div>
              {trace.treasury_evidence.reservation_id && (
                <div className="text-[10px] text-slate-500 truncate">
                  Lock ID: {trace.treasury_evidence.reservation_id}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic">No treasury reservation</div>
          )}
        </div>

        {/* Blockchain Evidence */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
          <div className="text-slate-500 uppercase tracking-wider text-[10px]">4. Blockchain Proof</div>
          {trace.blockchain_evidence ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Network:</span>
                <span className="text-slate-200">
                  {trace.blockchain_evidence.network} (ID {trace.blockchain_evidence.chain_id})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`font-bold ${
                    trace.blockchain_evidence.status === 'CONFIRMED'
                      ? 'text-emerald-400'
                      : trace.blockchain_evidence.status === 'AMBIGUOUS'
                      ? 'text-amber-400'
                      : trace.blockchain_evidence.status === 'FAILED'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {trace.blockchain_evidence.status}
                </span>
              </div>
              {trace.blockchain_evidence.transaction_hash && (
                <div className="pt-1">
                  <div className="text-slate-500 text-[10px]">Tx Hash:</div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-300 text-[10px] truncate max-w-[120px]">
                      {trace.blockchain_evidence.transaction_hash}
                    </span>
                    <CopyButton textToCopy={trace.blockchain_evidence.transaction_hash} label="Tx" />
                  </div>
                  {trace.blockchain_evidence.explorer_url && (
                    <a
                      href={trace.blockchain_evidence.explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[11px] text-teal-400 hover:underline"
                    >
                      Arcscan Explorer ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : isSimulation ? (
            <div className="text-purple-400/80 text-[11px] italic">
              Simulation mode — No Arc transaction emitted.
            </div>
          ) : (
            <div className="text-slate-500 italic">No blockchain execution recorded</div>
          )}
        </div>
      </div>

      {/* Detailed Chronological Step Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Chronological Audit Log ({trace.steps.length} Steps Recorded)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Append-Only Monotonic Sequence
          </span>
        </div>

        <div className="space-y-2">
          {trace.steps.map((step) => {
            const isExpanded = !!expandedSteps[step.step_number];
            const isFailed = step.status === 'FAILED' || step.type.includes('DENIED') || step.type.includes('REJECTED');
            const isAmbiguous = step.type.includes('AMBIGUOUS') || step.status === 'AMBIGUOUS';

            return (
              <div
                key={`${step.step_number}-${step.step_id}`}
                className={`rounded-xl border text-xs font-mono transition-all ${
                  isFailed
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : isAmbiguous
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Step Row Header */}
                <div
                  onClick={() => toggleStep(step.step_number)}
                  className="p-3 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-bold flex items-center justify-center text-[11px]">
                      {step.step_number}
                    </span>
                    <span className="font-semibold text-white tracking-wide">{step.type}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        step.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : step.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400'
                          : step.status === 'AMBIGUOUS'
                          ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="text-slate-500 hidden sm:inline">{step.actor}</span>
                    <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <span className="text-slate-600 text-[10px]">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-slate-800/60 text-[11px] space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                      <div>
                        <span className="text-slate-500">Timestamp: </span>
                        {new Date(step.timestamp).toISOString()}
                      </div>
                      <div>
                        <span className="text-slate-500">Correlation ID: </span>
                        <span className="text-slate-300 font-mono">{step.correlation_id || '—'}</span>
                      </div>
                    </div>

                    {step.reason_codes && step.reason_codes.length > 0 && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-bold">Reason Codes: </span>
                        {step.reason_codes.join(', ')}
                      </div>
                    )}

                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <div>
                        <span className="text-slate-500 block mb-1">Safe Metadata:</span>
                        <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-teal-300 overflow-x-auto">
                          {JSON.stringify(step.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
