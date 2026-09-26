'use client';

import React from 'react';
import { MissionStatus } from '../lib/api/types';

interface VisualMissionTimelineProps {
  currentStatus: MissionStatus | string;
  failureReason?: string;
}

interface TimelineNode {
  key: string;
  label: string;
  description: string;
  matchStatuses: string[];
}

const NODES: TimelineNode[] = [
  { key: 'objective', label: 'OBJECTIVE', description: 'Mission Created', matchStatuses: ['CREATED', 'PLANNING'] },
  { key: 'plan', label: 'PLAN', description: 'Decomposed Steps', matchStatuses: ['PLANNING', 'DISCOVERING'] },
  { key: 'discover', label: 'DISCOVER', description: 'Query Registry', matchStatuses: ['DISCOVERING', 'EVALUATING'] },
  { key: 'compare', label: 'COMPARE', description: 'Quotes Evaluated', matchStatuses: ['EVALUATING', 'SELECTING'] },
  { key: 'select', label: 'SELECT', description: 'Economic Decision', matchStatuses: ['SELECTING', 'AWAITING_APPROVAL', 'EXECUTING'] },
  { key: 'policy', label: 'POLICY', description: 'Rust Deterministic Check', matchStatuses: ['EXECUTING', 'WAITING_FOR_RESULT'] },
  { key: 'risk', label: 'RISK', description: 'Counterparty Scoring', matchStatuses: ['EXECUTING', 'WAITING_FOR_RESULT'] },
  { key: 'payment', label: 'PAYMENT', description: 'PaymentIntent Pipeline', matchStatuses: ['EXECUTING', 'WAITING_FOR_RESULT'] },
  { key: 'arc', label: 'ARC', description: 'USDC Settlement', matchStatuses: ['WAITING_FOR_RESULT', 'EVALUATING_RESULT'] },
  { key: 'result', label: 'RESULT', description: 'Sanitized Output', matchStatuses: ['EVALUATING_RESULT', 'CONTINUING', 'COMPLETED'] },
  { key: 'complete', label: 'COMPLETE', description: 'Objective Finalized', matchStatuses: ['COMPLETED'] },
];

const ORDERED_STATES = [
  'CREATED',
  'PLANNING',
  'DISCOVERING',
  'EVALUATING',
  'SELECTING',
  'AWAITING_APPROVAL',
  'EXECUTING',
  'WAITING_FOR_RESULT',
  'EVALUATING_RESULT',
  'CONTINUING',
  'COMPLETED',
];

export function VisualMissionTimeline({
  currentStatus,
  failureReason,
}: VisualMissionTimelineProps) {
  const isFailed = currentStatus === 'FAILED' || currentStatus === 'BUDGET_EXHAUSTED';
  const isCancelled = currentStatus === 'CANCELLED';
  const isCompleted = currentStatus === 'COMPLETED';

  // Find index of current status in progression
  const currentIndex = ORDERED_STATES.indexOf(currentStatus);

  const getNodeState = (nodeIndex: number) => {
    if (isCompleted) return 'COMPLETED';
    if (isFailed && nodeIndex === Math.max(0, Math.min(currentIndex, NODES.length - 1))) return 'FAILED';
    if (isCancelled && nodeIndex === Math.max(0, Math.min(currentIndex, NODES.length - 1))) return 'CANCELLED';

    // Approximate mapping: 11 nodes mapped to progression
    const mappedNodeIndex = Math.min(currentIndex, NODES.length - 1);

    if (nodeIndex < mappedNodeIndex) return 'COMPLETED';
    if (nodeIndex === mappedNodeIndex) return 'ACTIVE';
    return 'PENDING';
  };

  return (
    <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222222] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A]" />
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Visual Mission Flow Pipeline
          </h2>
        </div>
        <span className="text-xs font-mono text-[#85827B]">
          Current State: <span className="text-[#D6A83A] font-bold">{currentStatus}</span>
        </span>
      </div>

      {/* Horizontal Interactive Pipeline */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex items-center min-w-[900px] justify-between relative px-2">
          {/* Connector Bar */}
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-[#222222] -z-0" />

          {NODES.map((node, i) => {
            const state = getNodeState(i);

            let circleClass = 'bg-[#080808] border-[#222222] text-[#50504C]';
            let labelClass = 'text-[#716F69]';

            if (state === 'COMPLETED') {
              circleClass = 'bg-[#141414] border-[#2FB36F] text-[#2FB36F]';
              labelClass = 'text-[#F2F0EA] font-semibold';
            } else if (state === 'ACTIVE') {
              circleClass = 'bg-[#141414] border-[#D6A83A] text-[#D6A83A] font-bold';
              labelClass = 'text-[#D6A83A] font-bold';
            } else if (state === 'FAILED') {
              circleClass = 'bg-[#141414] border-[#D85C5C] text-[#D85C5C]';
              labelClass = 'text-[#D85C5C] font-bold';
            } else if (state === 'CANCELLED') {
              circleClass = 'bg-[#141414] border-[#222222] text-[#716F69]';
              labelClass = 'text-[#716F69]';
            }

            return (
              <div key={node.key} className="flex flex-col items-center text-center relative z-10 w-20">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono text-xs transition-all ${circleClass}`}
                >
                  {state === 'COMPLETED' ? (
                    <span>✓</span>
                  ) : state === 'FAILED' ? (
                    <span>✕</span>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className={`text-[10px] font-mono tracking-tight uppercase ${labelClass}`}>
                    {node.label}
                  </div>
                  <div className="text-[9px] text-[#716F69] hidden sm:block truncate max-w-[75px]">
                    {node.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure reason callout if applicable */}
      {isFailed && failureReason && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#D85C5C]/30 text-xs font-mono text-[#D85C5C] flex items-center gap-2">
          <span className="font-bold">EXECUTION HALTED:</span>
          <span>{failureReason}</span>
        </div>
      )}
    </div>
  );
}
