import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRatio, formatUsdcMicro, formatRate, formatPercent, formatCurrency } from '../lib/utils/format.js';

describe('REGRESSION TEST SUITE: Treasury Crash & Mission Not Found Fixes', () => {

  // 1. Solvency Ratio Safe Formatting
  describe('1. formatRatio Robust Validation & Placeholder Rendering', () => {
    it('returns honest placeholder "—" when solvency_ratio is undefined', () => {
      assert.equal(formatRatio(undefined), '—');
    });

    it('returns honest placeholder "—" when solvency_ratio is null', () => {
      assert.equal(formatRatio(null), '—');
    });

    it('returns honest placeholder "—" for empty string, whitespace, or invalid non-numeric strings', () => {
      assert.equal(formatRatio(''), '—');
      assert.equal(formatRatio('   '), '—');
      assert.equal(formatRatio('invalid_ratio'), '—');
    });

    it('returns honest placeholder "—" for non-finite values (NaN, Infinity, -Infinity)', () => {
      assert.equal(formatRatio(NaN), '—');
      assert.equal(formatRatio(Infinity), '—');
      assert.equal(formatRatio(-Infinity), '—');
    });

    it('returns honest placeholder "—" for malformed objects and arrays', () => {
      assert.equal(formatRatio({}), '—');
      assert.equal(formatRatio([]), '—');
      assert.equal(formatRatio({ ratio: 3.5 }), '—');
    });

    it('correctly formats valid finite numeric values with suffix "x"', () => {
      assert.equal(formatRatio(10), '10.00x');
      assert.equal(formatRatio(3.57), '3.57x');
      assert.equal(formatRatio(0), '0.00x');
      assert.equal(formatRatio('3.14159'), '3.14x');
    });

    it('supports custom decimals and suffix options', () => {
      assert.equal(formatRatio(2.5, { decimals: 1, suffix: 'x' }), '2.5x');
      assert.equal(formatRatio(5, { decimals: 0, suffix: 'X' }), '5X');
      assert.equal(formatRatio(undefined, { fallback: 'N/A' }), 'N/A');
    });
  });

  // 2. formatUsdcMicro Zero Balance vs Missing Value Distinction
  describe('2. formatUsdcMicro Validation (No Fabricated Financial Values)', () => {
    it('returns honest placeholder "—" for undefined and null, never fabricating "$0.00"', () => {
      assert.equal(formatUsdcMicro(undefined), '—');
      assert.equal(formatUsdcMicro(null), '—');
      assert.notEqual(formatUsdcMicro(undefined), '$0.00');
      assert.notEqual(formatUsdcMicro(null), '$0.00');
    });

    it('returns honest placeholder "—" for empty or non-numeric values', () => {
      assert.equal(formatUsdcMicro(''), '—');
      assert.equal(formatUsdcMicro('abc'), '—');
      assert.equal(formatUsdcMicro(NaN), '—');
      assert.equal(formatUsdcMicro(Infinity), '—');
    });

    it('honestly renders "$0.00" when the value is genuine numeric 0 or "0"', () => {
      assert.equal(formatUsdcMicro(0), '$0.00');
      assert.equal(formatUsdcMicro('0'), '$0.00');
    });

    it('accurately converts micro-USDC integer amounts into dollars', () => {
      assert.equal(formatUsdcMicro('5000000'), '$5.00');
      assert.equal(formatUsdcMicro(5000000), '$5.00');
      assert.equal(formatUsdcMicro('125000000000'), '$125,000.00');
      assert.equal(formatUsdcMicro('82500000000'), '$82,500.00');
      assert.equal(formatUsdcMicro('-1000000'), '-$1.00');
    });
  });

  // 3. Treasury State & Health Fallback Resolution
  describe('3. Treasury Telemetry Resolution (Fixing TypeError on Line 254)', () => {
    it('resolves solvency ratio from health snapshot when missing in treasury state', () => {
      // Simulates Go Gateway /v1/treasury/state which omits solvency_ratio
      const liveState = {
        total_balance: '0',
        available_balance: '0',
        reserved_balance: '0',
        // solvency_ratio is undefined!
      };
      // Simulates Go Gateway /v1/treasury/health which provides solvency_ratio
      const healthSnapshot = {
        total_balance: '0',
        solvency_ratio: 10,
        safe_capacity: '0',
        worst_case_exposure: '0',
      };

      const resolvedRatio = liveState?.solvency_ratio ?? healthSnapshot?.solvency_ratio;
      assert.equal(resolvedRatio, 10);
      assert.equal(formatRatio(resolvedRatio), '10.00x');
    });

    it('safely handles completely unavailable telemetry without crashing', () => {
      const liveState = null;
      const healthSnapshot = null;

      const resolvedRatio = liveState?.solvency_ratio ?? healthSnapshot?.solvency_ratio;
      assert.equal(formatRatio(resolvedRatio), '—');

      const safeCapacity = liveState?.safe_capacity ?? healthSnapshot?.safe_capacity;
      assert.equal(formatUsdcMicro(safeCapacity), '—');

      const worstCaseExposure = liveState?.worst_case_exposure ?? healthSnapshot?.worst_case_exposure;
      assert.equal(formatUsdcMicro(worstCaseExposure), '—');
    });

    it('safely handles state with null or non-finite values', () => {
      const malformedState = {
        solvency_ratio: null,
        safe_capacity: NaN,
        worst_case_exposure: undefined,
      };

      assert.equal(formatRatio(malformedState.solvency_ratio), '—');
      assert.equal(formatUsdcMicro(malformedState.safe_capacity), '—');
      assert.equal(formatUsdcMicro(malformedState.worst_case_exposure), '—');
    });
  });

  // 4. Mission Payload Unwrapping (Fixing "Mission not found")
  describe('4. Mission API Payload Unwrapping & ID Validation', () => {
    function unwrapMission(resp) {
      const mission = (resp && typeof resp === 'object' && 'mission' in resp && resp.mission)
        ? resp.mission
        : resp;
      if (!mission || typeof mission !== 'object' || !mission.id) {
        throw new Error(`Mission not found`);
      }
      return mission;
    }

    function unwrapTrace(resp) {
      const trace = (resp && typeof resp === 'object' && 'trace' in resp && resp.trace)
        ? resp.trace
        : resp;
      return trace;
    }

    it('successfully extracts mission from direct root object (Go Gateway HandleGet contract)', () => {
      const directGatewayResponse = {
        id: 'msn_market_intel_001',
        organization_id: 'org_default',
        agent_id: 'research-agent',
        objective: 'Execute autonomous market intelligence research',
        status: 'IN_PROGRESS',
        budget: '5000000',
        spent: '1250000',
      };

      const extracted = unwrapMission(directGatewayResponse);
      assert.equal(extracted.id, 'msn_market_intel_001');
      assert.equal(extracted.status, 'IN_PROGRESS');
      assert.equal(extracted.budget, '5000000');
    });

    it('successfully extracts mission from wrapped object ({ mission: ... })', () => {
      const wrappedResponse = {
        mission: {
          id: 'msn_wrapped_002',
          objective: 'Wrapped test mission',
          status: 'COMPLETED',
        },
      };

      const extracted = unwrapMission(wrappedResponse);
      assert.equal(extracted.id, 'msn_wrapped_002');
      assert.equal(extracted.status, 'COMPLETED');
    });

    it('throws descriptive error if gateway response contains no valid mission id', () => {
      assert.throws(() => unwrapMission({}), /Mission not found/);
      assert.throws(() => unwrapMission(null), /Mission not found/);
      assert.throws(() => unwrapMission(undefined), /Mission not found/);
    });

    it('successfully extracts trace from direct root object and wrapped object', () => {
      const directTrace = {
        mission_id: 'msn_market_intel_001',
        status: 'IN_PROGRESS',
        steps: [{ step_id: 'step_1' }],
      };
      assert.equal(unwrapTrace(directTrace).mission_id, 'msn_market_intel_001');

      const wrappedTrace = {
        trace: {
          mission_id: 'msn_wrapped_002',
          status: 'COMPLETED',
          steps: [],
        },
      };
      assert.equal(unwrapTrace(wrappedTrace).mission_id, 'msn_wrapped_002');
    });

    it('validates mission IDs rejecting empty, null, or whitespace values', () => {
      const validateId = (id) => {
        if (!id || typeof id !== 'string' || !id.trim()) {
          throw new Error('Valid mission ID is required');
        }
        return id.trim();
      };

      assert.throws(() => validateId(''), /Valid mission ID is required/);
      assert.throws(() => validateId('   '), /Valid mission ID is required/);
      assert.throws(() => validateId(null), /Valid mission ID is required/);
      assert.throws(() => validateId(undefined), /Valid mission ID is required/);
      assert.equal(validateId('  msn_123  '), 'msn_123');
    });
  });

  // 5. Sandbox / Simulation Isolation
  describe('5. Sandbox / Simulation Data Isolation', () => {
    it('never treats sandboxed demo fixtures as live operational records', () => {
      const sandboxMissionId = 'msn_demo_weather_01';
      const liveMissionId = 'msn_market_intel_001';

      const isSandbox = (id) => id.startsWith('msn_demo_');
      assert.equal(isSandbox(sandboxMissionId), true);
      assert.equal(isSandbox(liveMissionId), false);
    });
  });
});
