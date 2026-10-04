'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AgentPayCard,
  AgentPayCardHeader,
  AgentPayCardContent,
  AgentPayBadge,
  AgentPayMetric,
  AgentPayPanel,
} from '@/components/ui';

interface IncidentRecord {
  id: string;
  title: string;
  status: 'ACTIVE' | 'RECOVERING' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedMission: string;
  missionId: string;
  detectedAt: string;
  resolvedAt?: string;
  failureReason: string;
  autonomousAction: string;
  policyStatus: string;
  recoveryStrategy: string;
  financialImpact: string;
  auditEvidence: string;
}

const CANONICAL_INCIDENTS: IncidentRecord[] = [
  {
    id: 'INC-2026-0928-01',
    title: 'Provider Timeout & Lease Expiration',
    status: 'RECOVERING',
    severity: 'MEDIUM',
    affectedMission: 'Autonomous Market Intelligence',
    missionId: 'mis_market_intel_01',
    detectedAt: '12:04:19 UTC',
    failureReason: 'Primary inference node agent_fast_infer exceeded 2000ms latency ceiling. Heartbeat missed.',
    autonomousAction: 'Worker isolated via lease fencing (INV-101). Replacement provider agent_budget_ai proposed.',
    policyStatus: 'PASSED (Evaluated in 6.36µs; failover within 25.00 USDC cap)',
    recoveryStrategy: 'Automated Provider Substitution (TRY_ALTERNATIVE_SERVICE)',
    financialImpact: '0.00 USDC lost (Budget envelope 100% preserved; blind retries blocked by INV-103)',
    auditEvidence: 'Lease token revoked at block #22572772; checkpoint proof 0x48f1...99bc',
  },
  {
    id: 'INC-2026-0927-04',
    title: 'Malicious Recipient Substitution Attempt',
    status: 'RESOLVED',
    severity: 'CRITICAL',
    affectedMission: 'Crypto Data Scraping & Synthesis',
    missionId: 'mis_crypto_synth_04',
    detectedAt: '11:42:08 UTC',
    resolvedAt: '11:42:08 UTC (Instant Block)',
    failureReason: 'Compromised sub-agent attempted to divert milestone release to unallowlisted address 0xdead...beef.',
    autonomousAction: 'Deterministic policy engine emitted HARD_DENY. Recipient address locked to verified contract.',
    policyStatus: 'REJECTED (POL-003 / INV-146 Recipient Allowlist Violation)',
    recoveryStrategy: 'Immediate Failsafe Quarantine & Alarm Notification',
    financialImpact: '0.00 USDC moved. Unallowlisted transfer completely blocked.',
    auditEvidence: 'Policy decision trace pol_deny_9921; nonced audit proof recorded.',
  },
  {
    id: 'INC-2026-0927-02',
    title: 'Budget Escalation Rejection',
    status: 'RESOLVED',
    severity: 'HIGH',
    affectedMission: 'Deep Graph Search Swarm',
    missionId: 'mis_graph_swarm_02',
    detectedAt: '09:15:33 UTC',
    resolvedAt: '09:15:33 UTC (Instant Block)',
    failureReason: 'Sub-agent requested payment exceeding mission budget envelope ($85.00 requested vs $25.00 cap).',
    autonomousAction: 'Execution Gate rejected intent automatically. Agent budget ceiling remained locked at 25.00 USDC.',
    policyStatus: 'REJECTED (POL-001 Economic Envelope Budget Cap Exceeded)',
    recoveryStrategy: 'Autonomous Scope Pruning & Secondary Replanning',
    financialImpact: '0.00 USDC overspent. Treasury exposure strictly bounded.',
    auditEvidence: 'Budget envelope invariant INV-148 verified; intent pi_esc_882 rejected.',
  },
  {
    id: 'INC-2026-0926-09',
    title: 'Idempotency Nonce Collision Dropped',
    status: 'RESOLVED',
    severity: 'LOW',
    affectedMission: 'Automated Treasury Rebalance',
    missionId: 'mis_treasury_reb_09',
    detectedAt: '18:22:04 UTC',
    resolvedAt: '18:22:04 UTC (Deduplicated)',
    failureReason: 'Network retry caused identical payment intent to arrive twice within 250ms.',
    autonomousAction: 'Idempotency engine matched existing settlement record and safely dropped the duplicate payload.',
    policyStatus: 'DEDUPLICATED (IDEMP-001 Single-Settlement Invariant)',
    recoveryStrategy: 'Idempotent CAS Cache Match (INV-13)',
    financialImpact: '0.00 USDC duplicated. Single debit recorded.',
    auditEvidence: 'Idempotency hash collision match rec_settle_4412.',
  },
];

export default function IncidentsCenterPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RECOVERING' | 'RESOLVED'>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(CANONICAL_INCIDENTS[0]);

  const filteredIncidents = CANONICAL_INCIDENTS.filter((inc) => {
    if (filter === 'ALL') return true;
    return inc.status === filter;
  });

  const getStatusBadge = (status: IncidentRecord['status']) => {
    switch (status) {
      case 'ACTIVE':
        return <AgentPayBadge variant="danger" dot pulse>ACTIVE</AgentPayBadge>;
      case 'RECOVERING':
        return <AgentPayBadge variant="warning" dot pulse>RECOVERING</AgentPayBadge>;
      case 'RESOLVED':
        return <AgentPayBadge variant="success" dot>RESOLVED</AgentPayBadge>;
    }
  };

  const getSeverityBadge = (severity: IncidentRecord['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AgentPayBadge variant="danger">CRITICAL</AgentPayBadge>;
      case 'HIGH':
        return <AgentPayBadge variant="warning">HIGH</AgentPayBadge>;
      case 'MEDIUM':
        return <AgentPayBadge variant="info">MEDIUM</AgentPayBadge>;
      case 'LOW':
        return <AgentPayBadge variant="neutral">LOW</AgentPayBadge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#F2F0EA]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F2F0EA]">
              AUTONOMOUS INCIDENT CENTER
            </h1>
            <AgentPayBadge variant="accent">FIRST-CLASS RECOVERY</AgentPayBadge>
          </div>
          <p className="text-xs sm:text-sm text-[#B0ADA5] mt-1.5 max-w-2xl leading-relaxed">
            Real-time observability of autonomous fault detection, lease fencing, and deterministic recovery.
            Failures in AgentPay never result in financial leakage or unbounded retries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/control"
            className="h-8 px-3.5 bg-[#141414] hover:bg-[#1a1a1a] text-[#F2F0EA] border border-[#222222] rounded-lg text-xs font-medium flex items-center transition-colors"
          >
            ← Control Tower
          </Link>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AgentPayMetric
          label="Active Incidents"
          value={CANONICAL_INCIDENTS.filter((i) => i.status === 'ACTIVE').length}
          subtext="Uncontained faults"
          provenance="SIMULATED"
        />
        <AgentPayMetric
          label="Recovering"
          value={CANONICAL_INCIDENTS.filter((i) => i.status === 'RECOVERING').length}
          subtext="Autonomous replanning active"
          provenance="SIMULATED"
          highlight
        />
        <AgentPayMetric
          label="Resolved Today"
          value={CANONICAL_INCIDENTS.filter((i) => i.status === 'RESOLVED').length}
          subtext="Deterministic mitigation"
          provenance="SIMULATED"
        />
        <AgentPayMetric
          label="Financial Leakage"
          value="$0.00"
          subtext="100% budget preservation"
          provenance="VERIFIED"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#222222] pb-3">
        {(['ALL', 'RECOVERING', 'ACTIVE', 'RESOLVED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors ${
              filter === tab
                ? 'bg-[#181818] text-[#F2F0EA] border border-[#2B2B2B]'
                : 'text-[#716F69] hover:text-[#B0ADA5] hover:bg-[#141414]'
            }`}
          >
            {tab} ({tab === 'ALL' ? CANONICAL_INCIDENTS.length : CANONICAL_INCIDENTS.filter((i) => i.status === tab).length})
          </button>
        ))}
      </div>

      {/* Incident List & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredIncidents.map((incident) => {
            const isSelected = selectedIncident?.id === incident.id;
            return (
              <div
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#D6A83A]/60 bg-[#141414]'
                    : 'border-[#222222] bg-[#101010] hover:border-[#2B2B2B] hover:bg-[#121212]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] text-[#716F69]">
                    {incident.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getSeverityBadge(incident.severity)}
                    {getStatusBadge(incident.status)}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#F2F0EA] mb-1">
                  {incident.title}
                </h3>
                <p className="text-xs text-[#B0ADA5] line-clamp-2 mb-3">
                  {incident.failureReason}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-[#716F69] pt-2 border-t border-[#222222]">
                  <span>{incident.affectedMission}</span>
                  <span>{incident.detectedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Inspector View (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <AgentPayPanel
              title={selectedIncident.title}
              subtitle={`Incident ID: ${selectedIncident.id} · Mission: ${selectedIncident.affectedMission}`}
              badge={getStatusBadge(selectedIncident.status)}
            >
              <div className="space-y-5">
                {/* 1. Failure Analysis */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#716F69] block">
                    Failure Detection & Cause
                  </span>
                  <p className="text-xs text-[#F2F0EA] leading-relaxed">
                    {selectedIncident.failureReason}
                  </p>
                  <div className="text-[11px] font-mono text-[#B0ADA5] flex items-center gap-2 pt-1 border-t border-[#222222]">
                    <span>Detected: {selectedIncident.detectedAt}</span>
                    {selectedIncident.resolvedAt && (
                      <>
                        <span>·</span>
                        <span>Resolved: {selectedIncident.resolvedAt}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Autonomous Action & Recovery Strategy */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#D6A83A] block">
                    Autonomous Recovery Action
                  </span>
                  <p className="text-xs text-[#F2F0EA] leading-relaxed">
                    {selectedIncident.autonomousAction}
                  </p>
                  <div className="text-xs text-[#B0ADA5]">
                    <strong>Strategy:</strong> {selectedIncident.recoveryStrategy}
                  </div>
                  <div className="text-xs font-mono text-[#2FB36F]">
                    {selectedIncident.policyStatus}
                  </div>
                </div>

                {/* 3. Financial Invariant Proof */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] space-y-2">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#716F69] block">
                    Financial Invariant & Containment
                  </span>
                  <div className="text-xs text-[#F2F0EA] font-semibold">
                    {selectedIncident.financialImpact}
                  </div>
                  <div className="text-[11px] font-mono text-[#716F69] break-all pt-1 border-t border-[#222222]">
                    Evidence: {selectedIncident.auditEvidence}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    href={`/missions/${selectedIncident.missionId}`}
                    className="h-8 px-4 bg-[#F2F0EA] hover:bg-white text-[#080808] rounded-lg text-xs font-semibold flex items-center transition-colors"
                  >
                    View Mission Execution →
                  </Link>
                  <span className="text-[11px] font-mono text-[#716F69]">
                    DETERMINISTIC FAULT TOLERANCE VERIFIED
                  </span>
                </div>
              </div>
            </AgentPayPanel>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-[#716F69] border border-dashed border-[#222222] rounded-xl">
              Select an incident to view full diagnostic and recovery evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
