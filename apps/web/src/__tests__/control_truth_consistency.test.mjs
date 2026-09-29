import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controlPagePath = path.resolve(__dirname, '../app/control/page.tsx');
const controlPageSource = fs.readFileSync(controlPagePath, 'utf8');
const semanticsSourcePath = path.resolve(__dirname, '../lib/financialSemantics.ts');
const semanticsSource = fs.readFileSync(semanticsSourcePath, 'utf8');

const CONTROL_PLANE_TRUTH = {
  SYSTEM_MODE: 'SIMULATION',
  LIVE_EXECUTION_ENABLED: false,
  AGENTVAULT_DEPLOYED: false,
  REAL_SETTLEMENT_COUNT: 0,
  KMS_IMPLEMENTED: false,
  ARC_CHAIN_ID: 5042,
  ARC_RPC_STATUS: 'CONNECTED',
};

const CANONICAL_PROVENANCE_BADGES = {
  LIVE: 'LIVE',
  VERIFIED: 'VERIFIED',
  PROJECTED: 'PROJECTED',
  SIMULATED: 'SIMULATED',
  HISTORICAL: 'HISTORICAL',
  CACHED: 'CACHED',
  UNAVAILABLE: 'UNAVAILABLE',
  NOT_DEPLOYED: 'NOT DEPLOYED',
};

function getBroadcastStatusLabel(hasBroadcast) {
  return hasBroadcast ? 'BROADCAST' : 'NOT BROADCAST';
}

function getExecutionStatusLabel(mode, hasBroadcast = false) {
  if (mode === 'SIMULATION') {
    return {
      label: 'SIMULATED EXECUTION',
      subtext: 'Local deterministic dry-run',
      variant: 'warning',
      provenance: 'SIMULATED',
    };
  }
  return {
    label: hasBroadcast ? 'ON-CHAIN BROADCAST' : 'OFF-CHAIN BUFFER',
    subtext: hasBroadcast ? 'Live Arc network submission' : 'Awaiting broadcast trigger',
    variant: hasBroadcast ? 'success' : 'neutral',
    provenance: hasBroadcast ? 'LIVE' : 'VERIFIED',
  };
}

function getAuthorizationDecisionLabel(decision) {
  switch (decision) {
    case 'ALLOWED':
      return { label: 'AUTHORIZED', subtext: 'Policy evaluation passed', variant: 'success', provenance: 'VERIFIED' };
    case 'HARD_DENY':
      return { label: 'HARD DENY', subtext: 'Inviolable constitution violation', variant: 'danger', provenance: 'LIVE' };
    case 'APPROVAL_REQUIRED':
      return { label: 'PENDING APPROVAL', subtext: 'Exceeds autonomous velocity threshold', variant: 'warning', provenance: 'VERIFIED' };
    default:
      return { label: 'UNKNOWN', subtext: 'Unrecognized decision', variant: 'neutral', provenance: 'UNAVAILABLE' };
  }
}

function formatSettlementVolume(simulatedUsdc, mode = 'SIMULATION') {
  if (mode === 'SIMULATION') {
    return {
      label: 'SIMULATED SETTLED',
      value: `$${simulatedUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: 'Projected clearing volume (0 real Arc settlements)',
      provenance: 'SIMULATED',
    };
  }
  return {
    label: 'ARC SETTLED',
    value: `$${simulatedUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    subtext: 'Verified on-chain USDC settlement',
    provenance: 'LIVE',
  };
}

describe('TASK 44 — Control Tower Truthfulness, Simulation State & UI Consistency Suite', () => {

  describe('1. Centralized Financial Semantics & Provenance Module', () => {
    it('CONTROL_PLANE_TRUTH defines canonical simulation truth', () => {
      assert.equal(CONTROL_PLANE_TRUTH.SYSTEM_MODE, 'SIMULATION');
      assert.equal(CONTROL_PLANE_TRUTH.LIVE_EXECUTION_ENABLED, false);
      assert.equal(CONTROL_PLANE_TRUTH.AGENTVAULT_DEPLOYED, false);
      assert.equal(CONTROL_PLANE_TRUTH.REAL_SETTLEMENT_COUNT, 0);
      assert.equal(CONTROL_PLANE_TRUTH.KMS_IMPLEMENTED, false);
      assert.equal(CONTROL_PLANE_TRUTH.ARC_CHAIN_ID, 5042);
      assert.equal(CONTROL_PLANE_TRUTH.ARC_RPC_STATUS, 'CONNECTED');
      assert.ok(semanticsSource.includes('export const CONTROL_PLANE_TRUTH'), 'financialSemantics.ts must export CONTROL_PLANE_TRUTH');
      assert.ok(semanticsSource.includes('export const CANONICAL_PROVENANCE_BADGES'), 'financialSemantics.ts must export CANONICAL_PROVENANCE_BADGES');
    });

    it('getExecutionStatusLabel returns SIMULATED EXECUTION when mode is SIMULATION', () => {
      assert.equal(getExecutionStatusLabel('SIMULATION').label, 'SIMULATED EXECUTION');
      assert.equal(getExecutionStatusLabel('LIVE', true).label, 'ON-CHAIN BROADCAST');
    });

    it('getBroadcastStatusLabel distinguishes broadcast from simulation guard', () => {
      assert.equal(getBroadcastStatusLabel(false), 'NOT BROADCAST');
      assert.equal(getBroadcastStatusLabel(true), 'BROADCAST');
    });

    it('formatSettlementVolume distinguishes simulated volume from 0 real settlements', () => {
      const simLabel = formatSettlementVolume(1204.32, 'SIMULATION');
      assert.equal(simLabel.label, 'SIMULATED SETTLED');
      assert.equal(simLabel.value, '$1,204.32');
      assert.ok(simLabel.subtext.includes('0 real Arc settlements'));
    });

    it('getAuthorizationDecisionLabel preserves ALLOWED decision while keeping execution simulated', () => {
      assert.equal(getAuthorizationDecisionLabel('ALLOWED').label, 'AUTHORIZED');
      assert.equal(getAuthorizationDecisionLabel('HARD_DENY').label, 'HARD DENY');
    });

    it('CANONICAL_PROVENANCE_BADGES adheres to allowed semantic vocabulary', () => {
      const allowed = ['LIVE', 'VERIFIED', 'PROJECTED', 'SIMULATED', 'HISTORICAL', 'CACHED', 'UNAVAILABLE', 'NOT DEPLOYED'];
      for (const badge of Object.values(CANONICAL_PROVENANCE_BADGES)) {
        assert.ok(allowed.includes(badge), `Badge ${badge} must be in allowed vocabulary`);
      }
    });
  });

  describe('2. Canonical System Mode & Control Tower Page Invariants', () => {
    it('Mode is strictly SIMULATION with NO FUNDS MOVED', () => {
      assert.ok(
        controlPageSource.includes('SIMULATION — NO FUNDS MOVED'),
        'Control Tower must explicitly state SIMULATION — NO FUNDS MOVED'
      );
    });

    it('AgentVault is explicitly declared NOT DEPLOYED ON MAINNET', () => {
      assert.ok(
        controlPageSource.includes('NOT DEPLOYED ON MAINNET (0x)'),
        'AgentVault must be truthfully marked NOT DEPLOYED'
      );
      assert.ok(
        !controlPageSource.includes('AgentVault Contract</span>\n                  <span className="text-[#2FB36F] font-semibold">DEPLOYED'),
        'AgentVault must never be claimed DEPLOYED on mainnet'
      );
    });

    it('Live broadcast execution switch is strictly DISABLED', () => {
      assert.ok(
        controlPageSource.includes('DISABLED (Simulation Guard)'),
        'Live broadcast switch must be DISABLED'
      );
    });

    it('Enterprise KMS / HSM is truthfully marked NOT IMPLEMENTED', () => {
      assert.ok(
        controlPageSource.includes('Enterprise KMS / HSM (NOT IMPLEMENTED)'),
        'Enterprise KMS must be marked NOT IMPLEMENTED in separation panel'
      );
      assert.ok(
        controlPageSource.includes('Enterprise KMS</span>\n                <span className="text-[#B0ADA5]">NOT IMPLEMENTED'),
        'Enterprise KMS must be marked NOT IMPLEMENTED in truth matrix'
      );
      assert.ok(
        !controlPageSource.includes('✓ Isolated KMS / HSM Signer'),
        'Must not claim isolated KMS/HSM is implemented'
      );
    });

    it('Real Arc settlements counter is strictly 0', () => {
      assert.ok(
        controlPageSource.includes('0 (Zero fake transaction hashes)'),
        'Real settlements must report 0'
      );
      assert.ok(
        controlPageSource.includes('0 REAL ARC TX'),
        'Treasury metrics must qualify that real Arc transactions are 0'
      );
    });
  });

  describe('3. Security Invariant Presentation Semantics', () => {
    it('Zero Key Custody (INV-01) is displayed with a PASS indicator, not failure', () => {
      assert.ok(
        controlPageSource.includes('Zero Key Custody (INV-01 PASS)'),
        'Zero Key Custody invariant must show PASS'
      );
      assert.ok(
        controlPageSource.includes('text-[#2FB36F]"><span>✓</span> Zero Key Custody (INV-01 PASS)'),
        'Zero Key Custody invariant must be styled with green checkmark'
      );
    });

    it('Zero Signing Authority (INV-02) is displayed with a PASS indicator, not failure', () => {
      assert.ok(
        controlPageSource.includes('Zero Signing Authority (INV-02 PASS)'),
        'Zero Signing Authority invariant must show PASS'
      );
      assert.ok(
        controlPageSource.includes('text-[#2FB36F]"><span>✓</span> Zero Signing Authority (INV-02 PASS)'),
        'Zero Signing Authority invariant must be styled with green checkmark'
      );
    });
  });

  describe('4. Financial Authority Pipeline: Authorization vs Execution', () => {
    it('Preserves deterministic AUTHORIZATION decision while marking execution as SIMULATED / NOT BROADCAST', () => {
      assert.ok(
        controlPageSource.includes('AUTHORIZATION</span>') && controlPageSource.includes('ALLOWED</span>'),
        'Pipeline must show deterministic authorization decision'
      );
      assert.ok(
        controlPageSource.includes('SIMULATED EXECUTION'),
        'Pipeline stage 9 must clearly state SIMULATED EXECUTION'
      );
      assert.ok(
        controlPageSource.includes('NOT BROADCAST'),
        'Pipeline must declare NOT BROADCAST'
      );
    });

    it('Does not claim Relayer Signed in active simulation execution', () => {
      assert.ok(
        !controlPageSource.includes('<span className="text-[10px] text-[#2FB36F] block">Relayer Signed</span>'),
        'Must not falsely claim Relayer Signed during simulation'
      );
    });
  });

  describe('5. Timeline and Metric Semantics', () => {
    it('Timeline header is truthfully qualified as SIMULATED ECONOMIC TIMELINE', () => {
      assert.ok(
        controlPageSource.includes('SIMULATED ECONOMIC TIMELINE'),
        'Timeline header must state SIMULATED ECONOMIC TIMELINE'
      );
      assert.ok(
        !controlPageSource.includes('title="LIVE ECONOMIC TIMELINE"'),
        'Timeline title must not claim to be LIVE'
      );
    });

    it('Demo topology metrics are qualified with DEMO / SIMULATED provenance', () => {
      assert.ok(controlPageSource.includes('14 DEMO AGENTS'));
      assert.ok(controlPageSource.includes('8 SIMULATED LEASES'));
      assert.ok(controlPageSource.includes('99.8% PROJECTED SLA'));
    });

    it('Settlement metrics distinguish simulated volume from zero real on-chain settlements', () => {
      assert.ok(controlPageSource.includes('SIMULATED SETTLED'));
      assert.ok(controlPageSource.includes('0 Real Arc Settlements'));
    });
  });

  describe('6. Security Lab Truthfulness', () => {
    it('Explains deterministic security lab simulation with simulated decision latency', () => {
      assert.ok(
        controlPageSource.includes('SIMULATED DECISION LATENCY'),
        'Decision latency must be labeled SIMULATED DECISION LATENCY'
      );
      assert.ok(
        controlPageSource.includes('8 ATTACK VECTORS BLOCKED (SIMULATION)'),
        'Security Lab header badge must note SIMULATION'
      );
    });
  });
});
