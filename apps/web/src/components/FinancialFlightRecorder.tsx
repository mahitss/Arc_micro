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
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4 animate-pulse">
        <div className="h-6 w-64 bg-[#141414] rounded" />
        <div className="h-20 bg-[#141414] rounded-xl" />
        <div className="h-48 bg-[#141414] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222]">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <span>Flight Recorder</span>
        </h2>
        <div className="mt-3 p-4 rounded-xl bg-[#141414] border border-[#D6A83A]/30 text-xs text-[#D6A83A] font-mono">
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
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-white font-mono tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-pulse" />
              Financial Flight Recorder
            </span>
            {/* Live vs Simulation explicit badge */}
            {isSimulation ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#141414] text-[#D6A83A] border border-[#D6A83A]/40">
                ⚗ SIMULATION — NO BLOCKCHAIN SETTLEMENT
              </span>
            ) : isLive ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#141414] text-[#2FB36F] border border-[#2FB36F]/40">
                ● LIVE ARC SETTLEMENT
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-[#141414] text-[#F2F0EA] border border-[#222222]">
                {trace.execution_mode}
              </span>
            )}
          </div>
          <p className="text-xs text-[#716F69] mt-1 font-mono">
            Deterministic, append-only financial decision trail with non-repudiable evidence
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#85827B]">Trace ID:</span>
          <span className="text-[#F2F0EA] font-semibold">{trace.trace_id}</span>
          <CopyButton textToCopy={trace.trace_id} label="Trace ID" />
        </div>
      </div>

      {/* Canonical Flow Pipeline Diagram */}
      <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#222222] overflow-x-auto">
        <div className="text-[11px] font-mono text-[#85827B] uppercase tracking-wider mb-2">
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
                      ? 'bg-[#141414] text-[#D6A83A] border-[#D6A83A]/50'
                      : 'bg-[#080808] text-[#50504C] border-[#1A1A1A]'
                  }`}
                >
                  {node.label}
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-[#2D2D2D] font-bold select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Structured Evidence Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Policy Evidence */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
          <div className="text-[#85827B] uppercase tracking-wider text-[10px]">1. Policy Evidence</div>
          {trace.policy_evidence ? (
            <div className="space-y-1 text-[#F2F0EA]">
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Decision:</span>
                <span
                  className={`font-bold ${
                    trace.policy_evidence.decision === 'ALLOW'
                      ? 'text-[#2FB36F]'
                      : trace.policy_evidence.decision === 'APPROVAL_REQUIRED'
                      ? 'text-[#D6A83A]'
                      : 'text-[#D85C5C]'
                  }`}
                >
                  {trace.policy_evidence.decision}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Reason Code:</span>
                <span className="text-[#F2F0EA]">{trace.policy_evidence.reason_code || '—'}</span>
              </div>
              {trace.policy_evidence.risk_score !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#85827B]">Risk Score:</span>
                  <span className="text-[#F2F0EA]">{trace.policy_evidence.risk_score}/100</span>
                </div>
              )}
              {trace.policy_evidence.remaining_daily_limit !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#85827B]">Remaining Daily:</span>
                  <span className="text-[#F2F0EA]">
                    ${(Number(trace.policy_evidence.remaining_daily_limit) / 1e6).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#85827B] italic">No policy evidence recorded</div>
          )}
        </div>

        {/* Approval Evidence */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
          <div className="text-[#85827B] uppercase tracking-wider text-[10px]">2. Approval Evidence</div>
          {trace.approval_evidence ? (
            <div className="space-y-1 text-[#F2F0EA]">
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Status:</span>
                <span
                  className={`font-bold ${
                    trace.approval_evidence.status === 'APPROVED'
                      ? 'text-[#2FB36F]'
                      : trace.approval_evidence.status === 'REJECTED'
                      ? 'text-[#D85C5C]'
                      : 'text-[#D6A83A]'
                  }`}
                >
                  {trace.approval_evidence.status}
                </span>
              </div>
              {trace.approval_evidence.approved_by && (
                <div className="flex justify-between items-center">
                  <span className="text-[#85827B]">Approved By:</span>
                  <span className="text-[#F2F0EA]">{trace.approval_evidence.approved_by}</span>
                </div>
              )}
              {trace.approval_evidence.rejection_reason && (
                <div className="text-[#D85C5C] text-[11px] mt-1">
                  Reason: {trace.approval_evidence.rejection_reason}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#85827B] italic">Not required by policy</div>
          )}
        </div>

        {/* Treasury Evidence */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
          <div className="text-[#85827B] uppercase tracking-wider text-[10px]">3. Treasury Lock</div>
          {trace.treasury_evidence ? (
            <div className="space-y-1 text-[#F2F0EA]">
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Status:</span>
                <span
                  className={`font-bold ${
                    trace.treasury_evidence.status === 'SETTLED'
                      ? 'text-[#2FB36F]'
                      : trace.treasury_evidence.status === 'RESERVED'
                      ? 'text-[#F2F0EA]'
                      : 'text-[#B0ADA5]'
                  }`}
                >
                  {trace.treasury_evidence.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Amount:</span>
                <span className="text-white">
                  ${(Number(trace.treasury_evidence.amount) / 1e6).toFixed(2)}{' '}
                  <span className="text-[#F2F0EA]">{trace.treasury_evidence.asset}</span>
                </span>
              </div>
              {trace.treasury_evidence.reservation_id && (
                <div className="text-[10px] text-[#85827B] truncate">
                  Lock ID: {trace.treasury_evidence.reservation_id}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#85827B] italic">No treasury reservation</div>
          )}
        </div>

        {/* Blockchain Evidence */}
        <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
          <div className="text-[#85827B] uppercase tracking-wider text-[10px]">4. Blockchain Proof</div>
          {trace.blockchain_evidence ? (
            <div className="space-y-1 text-[#F2F0EA]">
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Network:</span>
                <span className="text-[#F2F0EA]">
                  {trace.blockchain_evidence.network} (ID {trace.blockchain_evidence.chain_id})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#85827B]">Status:</span>
                <span
                  className={`font-bold ${
                    trace.blockchain_evidence.status === 'CONFIRMED'
                      ? 'text-[#2FB36F]'
                      : trace.blockchain_evidence.status === 'AMBIGUOUS'
                      ? 'text-[#D6A83A]'
                      : trace.blockchain_evidence.status === 'FAILED'
                      ? 'text-[#D85C5C]'
                      : 'text-[#B0ADA5]'
                  }`}
                >
                  {trace.blockchain_evidence.status}
                </span>
              </div>
              {trace.blockchain_evidence.transaction_hash && (
                <div className="pt-1">
                  <div className="text-[#85827B] text-[10px]">Tx Hash:</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#F2F0EA] text-[10px] truncate max-w-[120px]">
                      {trace.blockchain_evidence.transaction_hash}
                    </span>
                    <CopyButton textToCopy={trace.blockchain_evidence.transaction_hash} label="Tx" />
                  </div>
                  {trace.blockchain_evidence.explorer_url && (
                    <a
                      href={trace.blockchain_evidence.explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[11px] text-[#F2F0EA] hover:underline"
                    >
                      Arcscan Explorer ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : isSimulation ? (
            <div className="text-[#D6A83A] text-[11px] italic">
              Simulation mode — No Arc transaction emitted.
            </div>
          ) : (
            <div className="text-[#85827B] italic">No blockchain execution recorded</div>
          )}
        </div>
      </div>

      {/* Detailed Chronological Step Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[#F2F0EA] uppercase tracking-wider">
            Chronological Audit Log ({trace.steps.length} Steps Recorded)
          </h3>
          <span className="text-[11px] font-mono text-[#85827B]">
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
                    ? 'bg-[#101010] border-[#D85C5C]/30'
                    : isAmbiguous
                    ? 'bg-[#101010] border-[#D6A83A]/30'
                    : 'bg-[#101010] border-[#222222] hover:border-[#2D2D2D]'
                }`}
              >
                {/* Step Row Header */}
                <div
                  onClick={() => toggleStep(step.step_number)}
                  className="p-3 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-[#141414] border border-[#222222] text-[#85827B] font-bold flex items-center justify-center text-[11px]">
                      {step.step_number}
                    </span>
                    <span className="font-semibold text-white tracking-wide">{step.type}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        step.status === 'COMPLETED'
                          ? 'bg-[#141414] text-[#2FB36F]'
                          : step.status === 'FAILED'
                          ? 'bg-[#141414] text-[#D85C5C]'
                          : step.status === 'AMBIGUOUS'
                          ? 'bg-[#141414] text-[#D6A83A] animate-pulse'
                          : 'bg-[#141414] text-[#B0ADA5]'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#B0ADA5]">
                    <span className="text-[#85827B] hidden sm:inline">{step.actor}</span>
                    <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[#50504C] text-[10px]">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t border-[#222222] text-[11px] space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#B0ADA5]">
                      <div>
                        <span className="text-[#85827B]">Timestamp: </span>
                        {new Date(step.timestamp).toISOString()}
                      </div>
                      <div>
                        <span className="text-[#85827B]">Correlation ID: </span>
                        <span className="text-[#F2F0EA] font-mono">{step.correlation_id || '—'}</span>
                      </div>
                    </div>

                    {step.reason_codes && step.reason_codes.length > 0 && (
                      <div className="p-2 rounded-lg bg-[#141414] border border-[#D85C5C]/30 text-[#D85C5C]">
                        <span className="font-bold">Reason Codes: </span>
                        {step.reason_codes.join(', ')}
                      </div>
                    )}

                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <div>
                        <span className="text-[#85827B] block mb-1">Safe Metadata:</span>
                        <pre className="p-2.5 rounded-lg bg-[#0B0B0B] border border-[#222222] text-[10px] text-[#B0ADA5] overflow-x-auto">
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
