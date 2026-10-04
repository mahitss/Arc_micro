'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MissionEvent,
  FlagshipMissionSummary,
  CANONICAL_22_EVENTS,
  INITIAL_DEMO_SUMMARY,
  fetchDemoMission,
  resetDemoMission,
} from '../../../../lib/api/demo';
import {
  AgentPayCard,
  AgentPayBadge,
  AgentPayMetric,
  AgentPayPanel,
  AgentPayProvenanceBadge,
} from '../../../../components/ui';

export default function MissionReplayPage() {
  const [summary, setSummary] = useState<FlagshipMissionSummary>(INITIAL_DEMO_SUMMARY);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'WHY' | 'ECONOMIC_TRACE' | 'AI_TRACE' | 'AUTHORITY_TRACE'>('WHY');
  const [showSecurityProvingGround, setShowSecurityProvingGround] = useState<boolean>(false);

  // Playback timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load backend state on mount
  useEffect(() => {
    let isMounted = true;
    fetchDemoMission().then((data) => {
      if (isMounted && data) {
        setSummary(data);
      }
    });
    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Play/Pause timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1800 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= CANONICAL_22_EVENTS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const currentEvent: MissionEvent = CANONICAL_22_EVENTS[currentIndex] || CANONICAL_22_EVENTS[0];

  const handleReset = async () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    const res = await resetDemoMission();
    setSummary(res);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentIndex < CANONICAL_22_EVENTS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setTimeout(() => setIsPlaying(true), 200);
  };

  const handleExportJSON = () => {
    const exportData = {
      export_type: 'AGENTPAY_FLAGSHIP_MISSION_TRACE',
      timestamp: new Date().toISOString(),
      seed: summary.seed,
      thesis: 'AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.',
      secondary_thesis: 'AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.',
      summary,
      current_event: currentEvent,
      all_events: CANONICAL_22_EVENTS,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentpay_mission_replay_${summary.mission_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // State coloring helper
  const getStepColorClass = (idx: number) => {
    if (idx === currentIndex) return 'ring-2 ring-[#D6A83A] bg-[#D6A83A]/20 text-[#F2F0EA] border-[#D6A83A]';
    if (idx === 11 || idx === 12) return 'border-[#D85C5C]/60 bg-[#D85C5C]/10 text-[#D85C5C]'; // Security Attack
    if (idx >= 13 && idx <= 15) return 'border-[#D6A83A]/60 bg-[#D6A83A]/10 text-[#D6A83A]'; // Replan & Recovery
    if (idx < currentIndex) return 'border-[#2FB36F]/50 bg-[#2FB36F]/10 text-[#2FB36F]';
    return 'border-[#222222] bg-[#141414] text-[#716F69]';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Truth Disclaimer Banner */}
      <div className="bg-[#141414] border border-[#222222] rounded-md px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#B0ADA5]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#D6A83A] animate-pulse" />
          <span className="font-semibold text-[#F2F0EA]">FLAGSHIP MISSION REPLAY:</span>
          <span className="font-mono text-[#D6A83A]">AUTONOMOUS MARKET INTELLIGENCE</span>
          <span className="text-[#716F69]">•</span>
          <AgentPayProvenanceBadge type="SIMULATED" />
          <span className="text-[#716F69] font-mono">[SIMULATION — NO FUNDS MOVED]</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#716F69]">
          <span>ARC CHAIN: <strong className="text-[#B0ADA5]">5042</strong></span>
          <span>AGENTVAULT: <strong className="text-[#B0ADA5]">UNDEPLOYED</strong></span>
          <span>BROADCAST: <strong className="text-[#B0ADA5]">NONE</strong></span>
          <span>SEED: <strong className="text-[#D6A83A]">{summary.seed}</strong></span>
        </div>
      </div>

      {/* 2. Flagship Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222222] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F2F0EA]">
              Autonomous Mission Replay Engine
            </h1>
            <AgentPayBadge variant="accent">DETERMINISTIC</AgentPayBadge>
            <AgentPayBadge variant={currentEvent.state === 'SECURITY_BLOCK' ? 'danger' : currentEvent.state === 'RECOVERY' ? 'warning' : 'neutral'}>
              {currentEvent.state}
            </AgentPayBadge>
          </div>
          <p className="text-sm text-[#B0ADA5] mt-1 max-w-3xl">
            Complete autonomous economic lifecycle demonstration. Observe AI decomposition, market discovery, quote selection,
            malicious provider defense (<strong className="text-[#D85C5C]">HARD DENY</strong>), lease timeout fencing, and zero-authority replanning.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Link
            href="/control"
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D6A83A]/50 text-xs font-medium text-[#F2F0EA] transition"
          >
            ← Control Tower
          </Link>
          <button
            onClick={() => setShowSecurityProvingGround(!showSecurityProvingGround)}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D85C5C]/50 text-xs font-medium text-[#D85C5C] transition"
          >
            {showSecurityProvingGround ? 'Hide Security Proving Ground' : 'Security Proving Ground (8 Vectors)'}
          </button>
        </div>
      </div>

      {/* 3. System Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <AgentPayMetric
          label="BUDGET ENVELOPE"
          value={`$${summary.budget_cap_usdc.toFixed(2)}`}
          subtext="STRICT CEILING"
          provenance="PROJECTED"
        />
        <AgentPayMetric
          label="AUTHORIZED SPEND"
          value={`$${summary.authorized_usdc.toFixed(2)}`}
          subtext="PROVIDERS A + C"
          provenance="SIMULATED"
        />
        <AgentPayMetric
          label="BLOCKED ADVERSARIAL"
          value={`$${summary.blocked_usdc.toFixed(2)}`}
          subtext="HARD DENY (0 FUNDS)"
          provenance="SIMULATED"
        />
        <AgentPayMetric
          label="REMAINING BUFFER"
          value={`$${summary.remaining_usdc.toFixed(2)}`}
          subtext="UNENCUMBERED RETURN"
          provenance="PROJECTED"
        />
        <AgentPayMetric
          label="SECURITY INCIDENTS"
          value={`${summary.security_violations_count} Blocked`}
          subtext="RECIPIENT SWAP"
          provenance="VERIFIED"
        />
        <AgentPayMetric
          label="AUTONOMOUS RECOVERIES"
          value={`${summary.recovered_failures_count} Resolved`}
          subtext="LEASE TIMEOUT REPLAN"
          provenance="VERIFIED"
        />
      </div>

      {/* Optional Security Proving Ground Drawer */}
      {showSecurityProvingGround && (
        <AgentPayCard variant="secondary" className="border-[#D85C5C]/40 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <span className="text-[#D85C5C] font-mono text-sm font-bold">● SECURITY PROVING GROUND</span>
              <span className="text-xs text-[#B0ADA5]">8 Deterministic Attack Vectors Checked & Blocked</span>
            </div>
            <AgentPayBadge variant="danger">ALL 8 BLOCKED</AgentPayBadge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-xs">
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">1. Recipient Substitution</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Swap destination to attacker-wallet.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-186)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">2. Budget Escalation</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Self-raise budget from $25 to $100.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-148)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">3. Policy Modification</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Relax constitutional max spend rule.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-109)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">4. Arbitrary Calldata</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Direct bytecode injection to AgentVault.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-108)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">5. Payment Outside Quote</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Invoice claiming $35 vs $4 agreed quote.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-164)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">6. Replay Attack</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Re-submit previous settled tx payload.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-6)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">7. Duplicate Settlement</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Trigger 2nd settlement for same obligation.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-77)</div>
            </div>
            <div className="bg-[#101010] p-2.5 rounded border border-[#222222]">
              <span className="font-semibold text-[#F2F0EA]">8. Forged Completion Checksum</span>
              <p className="text-[#716F69] mt-0.5">Attempt: Deliverable claim with invalid SHA-256 hash.</p>
              <div className="text-[#D85C5C] font-mono text-[11px] mt-1 font-bold">HARD DENY (INV-162)</div>
            </div>
          </div>
        </AgentPayCard>
      )}

      {/* 4. Transport Control Rail */}
      <AgentPayCard variant="primary" className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D6A83A] text-xs font-semibold text-[#F2F0EA] transition"
          >
            ⏮ Reset
          </button>
          <button
            onClick={handleStepBackward}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D6A83A] text-xs font-semibold text-[#F2F0EA] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ◀ Step Back
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-[#D85C5C] hover:bg-[#D85C5C]/90 text-white'
                : 'bg-[#D6A83A] hover:bg-[#D6A83A]/90 text-black'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play Replay'}
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentIndex >= CANONICAL_22_EVENTS.length - 1}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D6A83A] text-xs font-semibold text-[#F2F0EA] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Step Forward ▶
          </button>
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#D6A83A] text-xs font-semibold text-[#F2F0EA] transition"
          >
            ↻ Restart
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-[#141414] border border-[#2B2B2B] rounded p-0.5 text-xs">
            <span className="px-2 text-[#716F69] text-[11px] font-mono">SPEED:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition ${
                  playbackSpeed === s ? 'bg-[#D6A83A] text-black font-bold' : 'text-[#B0ADA5] hover:text-[#F2F0EA]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded bg-[#181818] border border-[#2B2B2B] hover:border-[#6B8FD6] text-xs font-medium text-[#6B8FD6] transition flex items-center gap-1"
          >
            ⬇ Export Trace (JSON)
          </button>
        </div>
      </AgentPayCard>

      {/* 5. 22-Step Timeline Scrubber */}
      <AgentPayCard variant="secondary" className="p-3">
        <div className="flex items-center justify-between text-xs text-[#716F69] mb-2 px-1">
          <span>TIMELINE PROGRESS: STEP {currentIndex + 1} OF 22</span>
          <span className="font-mono text-[#D6A83A]">
            {Math.round(((currentIndex + 1) / CANONICAL_22_EVENTS.length) * 100)}% COMPLETE
          </span>
        </div>
        <div className="grid grid-cols-11 sm:grid-cols-22 gap-1">
          {CANONICAL_22_EVENTS.map((evt, idx) => (
            <button
              key={evt.event_id}
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(idx);
              }}
              title={`Step ${idx + 1}: ${evt.name || evt.action} (${evt.state})`}
              className={`h-8 rounded border text-[10px] font-mono flex items-center justify-center transition ${getStepColorClass(
                idx
              )}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </AgentPayCard>

      {/* 6. Two-Column Workspace: Left Active Event Card, Right Inspector Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Event Showcase (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <AgentPayCard variant="primary" className="p-5 border-[#2B2B2B]">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#181818] text-[#D6A83A] font-mono text-xs font-bold border border-[#2B2B2B]">
                  EVENT #{currentIndex + 1}
                </span>
                <h2 className="text-base font-bold text-[#F2F0EA]">{currentEvent.name || currentEvent.action}</h2>
              </div>
              <AgentPayBadge
                variant={
                  currentEvent.status === 'BLOCKED'
                    ? 'danger'
                    : currentEvent.state === 'RECOVERY'
                    ? 'warning'
                    : currentEvent.status === 'ALLOW' || currentEvent.status === 'SUCCESS' || currentEvent.status === 'PASS'
                    ? 'success'
                    : 'neutral'
                }
              >
                {currentEvent.status}
              </AgentPayBadge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div className="bg-[#141414] p-2.5 rounded border border-[#222222]">
                <span className="text-[#716F69] block text-[11px]">ACTOR</span>
                <span className="font-semibold text-[#F2F0EA]">{currentEvent.actor}</span>
              </div>
              <div className="bg-[#141414] p-2.5 rounded border border-[#222222]">
                <span className="text-[#716F69] block text-[11px]">STATE</span>
                <span className="font-mono text-[#D6A83A]">{currentEvent.state}</span>
              </div>
              <div className="bg-[#141414] p-2.5 rounded border border-[#222222]">
                <span className="text-[#716F69] block text-[11px]">AMOUNT</span>
                <span className="font-mono text-[#F2F0EA]">
                  {currentEvent.amount > 0 ? `$${currentEvent.amount.toFixed(2)} USDC` : '$0.00 USDC'}
                </span>
              </div>
              <div className="bg-[#141414] p-2.5 rounded border border-[#222222]">
                <span className="text-[#716F69] block text-[11px]">SOURCE</span>
                <span className="font-mono text-[#6B8FD6] truncate block">{currentEvent.source}</span>
              </div>
            </div>

            <div className="bg-[#141414] p-3.5 rounded border border-[#222222] mb-4">
              <span className="text-[11px] font-mono text-[#716F69] block mb-1">ACTION DESCRIPTION</span>
              <p className="text-sm text-[#F2F0EA] font-medium leading-relaxed">{currentEvent.action}</p>
            </div>

            {/* Signature Moment Special Renderers */}
            {/* Signature Moment Special Renderers */}
            {/* STEP 12 & 13: MALICIOUS RECIPIENT SUBSTITUTION */}
            {(currentEvent.event_id === 'evt_12_sec_violation' || currentEvent.event_id === 'evt_13_pay_blocked') && (
              <div className="bg-[#D85C5C]/10 border-2 border-[#D85C5C]/50 rounded-lg p-4 space-y-3.5 shadow-lg shadow-red-950/20">
                <div className="flex items-center justify-between pb-2 border-b border-[#D85C5C]/30">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D85C5C] animate-pulse" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-[#D85C5C]">
                      SECURITY BARRIER INTERCEPT — ATTACK VECTOR #1
                    </span>
                  </div>
                  <AgentPayBadge variant="danger">HARD DENY</AgentPayBadge>
                </div>

                <div className="text-xs space-y-2 font-mono">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">REQUESTED RECIPIENT:</span>
                    <span className="text-[#D85C5C] font-semibold break-all">0xdead00000000000000000000000000000000beef (Attacker Wallet)</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">AUTHORIZED RECIPIENT:</span>
                    <span className="text-[#2FB36F] font-semibold">service_registry:provider-b</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 rounded bg-[#181111] border border-[#D85C5C]/40">
                    <span className="text-[#D85C5C] font-bold">MISMATCH STATUS:</span>
                    <span className="text-[#D85C5C] font-bold">RECIPIENT_MISMATCH (Unauthorized Destination Mutation)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">ENFORCED INVARIANT</span>
                      <span className="text-[#F2F0EA] font-semibold">INV-186 &amp; INV-146</span>
                    </div>
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">FUNDS MOVED</span>
                      <span className="text-[#2FB36F] font-bold">0.00 USDC (PROTECTED)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 14: PROVIDER B LEASE HEARTBEAT FAILURE */}
            {currentEvent.event_id === 'evt_14_prov_fail' && (
              <div className="bg-[#D6A83A]/10 border-2 border-[#D6A83A]/50 rounded-lg p-4 space-y-3.5 shadow-lg shadow-amber-950/20">
                <div className="flex items-center justify-between pb-2 border-b border-[#D6A83A]/30">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D6A83A] animate-pulse" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-[#D6A83A]">
                      DURABLE RUNTIME MONITOR — WORKER LEASE EXPIRY
                    </span>
                  </div>
                  <AgentPayBadge variant="warning">TIMEOUT DETECTED</AgentPayBadge>
                </div>

                <div className="text-xs space-y-2 font-mono">
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">HEARTBEAT TIMEOUT:</span>
                    <span className="text-[#D85C5C] font-semibold">Heartbeat missed &gt; 2000ms SLA lease expired</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">WORKER FENCED:</span>
                    <span className="text-[#D6A83A] font-semibold">INV-101 (Stale worker isolated &amp; lease revoked)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">RETRY POLICY:</span>
                    <span className="text-[#B0ADA5]">INV-103 (Blind retry to failing worker prohibited)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#2FB36F]/30">
                    <span className="text-[#716F69]">MISSION STATUS:</span>
                    <span className="text-[#2FB36F] font-bold">MISSION STILL ALIVE (Autonomous Recovery Initiated)</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEPS 15, 16, 17: AUTONOMOUS REPLAN & MULTI-STAGE REVALIDATION */}
            {(currentEvent.event_id === 'evt_15_replan_req' ||
              currentEvent.event_id === 'evt_16_alt_select' ||
              currentEvent.event_id === 'evt_17_pay_reauth') && (
              <div className="bg-[#6B8FD6]/10 border-2 border-[#6B8FD6]/50 rounded-lg p-4 space-y-3.5 shadow-lg shadow-blue-950/20">
                <div className="flex items-center justify-between pb-2 border-b border-[#6B8FD6]/30">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6B8FD6] animate-pulse" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-[#6B8FD6]">
                      AUTONOMOUS ADAPTIVE REPLAN &amp; FRESH AUTHORITY GATES
                    </span>
                  </div>
                  <AgentPayBadge variant="accent">AUTHORIZED</AgentPayBadge>
                </div>

                <div className="text-xs space-y-1.5 font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">ORIGINAL PLAN</span>
                      <span className="text-[#D85C5C]">Provider B ($3.60) — FAILED</span>
                    </div>
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">ALTERNATIVE PROVIDER</span>
                      <span className="text-[#2FB36F] font-bold">Provider C ($4.50) — SELECTED</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#2B2B2B]">
                    <span className="text-[#716F69]">MARGINAL COST:</span>
                    <span className="text-[#F2F0EA]">+$0.90 USDC (Total spend $8.50 &le; $25.00 Cap)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">POLICY CHECK</span>
                      <span className="text-[#2FB36F] font-bold">PASS (Rule #1 &amp; #2)</span>
                    </div>
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">RISK CHECK</span>
                      <span className="text-[#2FB36F] font-bold">PASS (Score 22 LOW)</span>
                    </div>
                    <div className="p-2 rounded bg-[#101010] border border-[#222222]">
                      <span className="text-[#716F69] text-[10px] block">LIQUIDITY CHECK</span>
                      <span className="text-[#2FB36F] font-bold">PASS ($8.50 Reserved)</span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-[#101010] border border-[#2FB36F]/30 flex justify-between items-center">
                    <span className="text-[#716F69]">AUTHORITY STATUS:</span>
                    <span className="text-[#2FB36F] font-bold">AUTHORIZED (Autonomy expanded. Authority bound.)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 11 Clearing & Settlement */}
            {(currentEvent.event_id === 'evt_20_clearing' || currentEvent.event_id === 'evt_21_settlement') && (
              <div className="bg-[#141414] border border-[#2B2B2B] rounded p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                  <span className="font-bold text-sm text-[#F2F0EA]">AUTONOMOUS CLEARING &amp; SETTLEMENT LEDGER</span>
                  <AgentPayProvenanceBadge type="SIMULATED" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#222222]">
                    <span>Provider A (Research &amp; Feed)</span>
                    <span className="font-mono text-[#2FB36F] font-bold">$4.00 USDC (AUTHORIZED)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#D85C5C]/30">
                    <span className="text-[#D85C5C]">Provider B (Adversarial / Fenced)</span>
                    <span className="font-mono text-[#D85C5C] font-bold">$3.60 USDC (BLOCKED / NOT SETTLED)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-[#101010] border border-[#222222]">
                    <span>Provider C (Deep Intel Replacement)</span>
                    <span className="font-mono text-[#2FB36F] font-bold">$4.50 USDC (AUTHORIZED)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Event Metadata JSON viewer */}
            <div className="mt-4 pt-4 border-t border-[#222222]">
              <span className="text-[11px] font-mono text-[#716F69] block mb-2">CANONICAL PROVENANCE METADATA</span>
              <pre className="bg-[#080808] border border-[#222222] rounded p-3 text-[11px] font-mono text-[#B0ADA5] overflow-x-auto max-h-48">
                {JSON.stringify(
                  {
                    event_id: currentEvent.event_id,
                    correlation_id: currentEvent.correlation_id,
                    causation_id: currentEvent.causation_id,
                    simulation_live: currentEvent.simulation_live,
                    metadata: currentEvent.metadata,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </AgentPayCard>

          {/* Canonical Providers Directory Cards */}
          <AgentPayPanel
            title="MARKETPLACE PROVIDERS"
            subtitle="Deterministic competition, SLAs, and security classification"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {summary.providers.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded border text-xs ${
                    p.status === 'BLOCKED'
                      ? 'border-[#D85C5C]/50 bg-[#D85C5C]/5'
                      : p.status === 'SETTLED'
                      ? 'border-[#2FB36F]/40 bg-[#2FB36F]/5'
                      : 'border-[#222222] bg-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#F2F0EA]">{p.name}</span>
                    <AgentPayBadge
                      variant={p.status === 'BLOCKED' ? 'danger' : p.status === 'SETTLED' ? 'success' : 'neutral'}
                    >
                      {p.status}
                    </AgentPayBadge>
                  </div>
                  <p className="text-[#716F69] text-[11px]">{p.capability}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#222222] font-mono text-[11px]">
                    <span className="text-[#B0ADA5]">Quote: ${p.quote_usdc.toFixed(2)}</span>
                    <span className="text-[#B0ADA5]">Latency: {p.latency_seconds}s</span>
                    <span className="text-[#D6A83A]">{p.reliability}</span>
                  </div>
                  {p.attempted_attack && (
                    <div className="mt-2 text-[10px] font-mono text-[#D85C5C] bg-[#D85C5C]/10 p-1.5 rounded">
                      Attack: {p.attempted_attack}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AgentPayPanel>
        </div>

        {/* Right Column: Contextual Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <AgentPayCard variant="primary" className="p-4 border-[#2B2B2B]">
            {/* Inspector Navigation Tabs */}
            <div className="flex border-b border-[#222222] gap-1 pb-2 mb-4 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveInspectorTab('WHY')}
                className={`px-3 py-1.5 rounded font-medium transition ${
                  activeInspectorTab === 'WHY'
                    ? 'bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40'
                    : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                Why / Why Not?
              </button>
              <button
                onClick={() => setActiveInspectorTab('ECONOMIC_TRACE')}
                className={`px-3 py-1.5 rounded font-medium transition ${
                  activeInspectorTab === 'ECONOMIC_TRACE'
                    ? 'bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40'
                    : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                Economic Trace
              </button>
              <button
                onClick={() => setActiveInspectorTab('AI_TRACE')}
                className={`px-3 py-1.5 rounded font-medium transition ${
                  activeInspectorTab === 'AI_TRACE'
                    ? 'bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40'
                    : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                AI Trace
              </button>
              <button
                onClick={() => setActiveInspectorTab('AUTHORITY_TRACE')}
                className={`px-3 py-1.5 rounded font-medium transition ${
                  activeInspectorTab === 'AUTHORITY_TRACE'
                    ? 'bg-[#181818] text-[#D6A83A] border border-[#D6A83A]/40'
                    : 'text-[#716F69] hover:text-[#F2F0EA]'
                }`}
              >
                Authority Trace
              </button>
            </div>

            {/* TAB 1: WHY / WHY NOT */}
            {activeInspectorTab === 'WHY' && (
              <div className="space-y-4 text-xs">
                {/* Why This Section */}
                <div className="bg-[#141414] border border-[#222222] p-3.5 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#F2F0EA]">{summary.why_explanation.title}</span>
                    <AgentPayBadge variant="success">AUTHORIZED</AgentPayBadge>
                  </div>
                  <p className="text-[#D6A83A] font-semibold mb-2">{summary.why_explanation.decision}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#101010] p-2 rounded border border-[#222222] mb-3">
                    <div>
                      <span className="text-[#716F69] block">AI RECOMMENDED</span>
                      <span className="text-[#B0ADA5]">{summary.why_explanation.ai_recommendation}</span>
                    </div>
                    <div>
                      <span className="text-[#716F69] block">AGENTPAY AUTHORIZED</span>
                      <span className="text-[#2FB36F] font-bold">{summary.why_explanation.agentpay_decision}</span>
                    </div>
                  </div>

                  <span className="text-[#716F69] block text-[11px] mb-1 font-semibold">DETERMINISTIC SYSTEM EVIDENCE:</span>
                  <ul className="space-y-1.5 text-[#B0ADA5] text-[11px]">
                    {summary.why_explanation.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#2FB36F]">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Why Not Section */}
                <div className="bg-[#D85C5C]/5 border border-[#D85C5C]/30 p-3.5 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#D85C5C]">{summary.why_not_explanation.title}</span>
                    <AgentPayBadge variant="danger">HARD DENY</AgentPayBadge>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono text-[#B0ADA5]">
                    <div className="flex justify-between border-b border-[#222222] pb-1">
                      <span className="text-[#716F69]">Attempted:</span>
                      <span className="text-[#F2F0EA]">{summary.why_not_explanation.attempted_action}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222222] pb-1">
                      <span className="text-[#716F69]">Requested:</span>
                      <span className="text-[#D85C5C]">{summary.why_not_explanation.requested}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222222] pb-1">
                      <span className="text-[#716F69]">Allowed:</span>
                      <span className="text-[#2FB36F]">{summary.why_not_explanation.allowed}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#222222] pb-1">
                      <span className="text-[#716F69]">Decision:</span>
                      <span className="text-[#D85C5C] font-bold">{summary.why_not_explanation.decision}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-[#716F69]">Funds Moved:</span>
                      <span className="text-[#2FB36F] font-bold">{summary.why_not_explanation.funds_moved}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-[#716F69]">
                    Rule: {summary.why_not_explanation.enforced_invariant}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ECONOMIC TRACE */}
            {activeInspectorTab === 'ECONOMIC_TRACE' && (
              <div className="space-y-2 text-xs max-h-96 overflow-y-auto pr-1">
                {summary.economic_trace.map((node, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#141414] border border-[#222222] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#D6A83A] text-[11px] font-bold">[{node.stage}] {node.label}</span>
                      <AgentPayBadge variant={node.authority === 'AUTHORITATIVE' ? 'accent' : 'neutral'}>
                        {node.authority}
                      </AgentPayBadge>
                    </div>
                    <p className="text-[#B0ADA5] text-[11px]">{node.description}</p>
                    <div className="flex justify-between text-[10px] font-mono text-[#716F69] pt-1">
                      <span>State: {node.state}</span>
                      <span>Impact: ${node.impact_usdc.toFixed(2)} USDC</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: AI TRACE */}
            {activeInspectorTab === 'AI_TRACE' && (
              <div className="space-y-2.5 text-xs max-h-96 overflow-y-auto pr-1">
                <div className="bg-[#141414] p-2 rounded border border-[#222222] text-[11px] text-[#716F69]">
                  Provider: <strong>OpenRouter Proxy Layer</strong> (Zero financial authority; models generate structured JSON proposals)
                </div>
                {summary.ai_trace.map((t, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#141414] border border-[#222222] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F0EA]">{t.task}</span>
                      <AgentPayBadge variant="info">{t.model.split('/')[1] || t.model}</AgentPayBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#716F69] pt-1 border-t border-[#222222]">
                      <span>Latency: {t.latency_ms}ms</span>
                      <span>Tokens: {t.tokens}</span>
                      <span>Cost: ${t.estimated_cost_usdc.toFixed(4)}</span>
                      <span>Status: {t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: AUTHORITY TRACE */}
            {activeInspectorTab === 'AUTHORITY_TRACE' && (
              <div className="space-y-2 text-xs max-h-96 overflow-y-auto pr-1">
                {summary.authority_trace.map((stg, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#141414] border border-[#222222] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#F2F0EA] text-[11px] font-bold">{stg.gate}</span>
                      <AgentPayBadge
                        variant={stg.decision === 'HARD_DENY' ? 'danger' : stg.decision === 'PASS' || stg.decision === 'RESERVED' ? 'success' : 'neutral'}
                      >
                        {stg.decision}
                      </AgentPayBadge>
                    </div>
                    <p className="text-[#B0ADA5] text-[11px]">{stg.input_state}</p>
                    <div className="text-[10px] font-mono text-[#716F69] pt-1 flex justify-between">
                      <span>Evaluator: {stg.evaluator}</span>
                      <span>Funds Moved: ${stg.funds_moved_usdc.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AgentPayCard>
        </div>
      </div>
    </div>
  );
}
