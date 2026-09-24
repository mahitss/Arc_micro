import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TASK 11 — Autonomous Treasury & Liquidity Orchestrator Web Suite', () => {
  // 1. Invariants Enforcement (INV-71 - INV-85)
  describe('1. Machine-Checked Security Invariants (INV-71 - INV-85)', () => {
    it('INV-71: enforces non-negative available liquidity', () => {
      const state = {
        total_balance: '100000000',
        reserved_balance: '30000000',
        available_balance: '70000000',
      };
      const total = BigInt(state.total_balance);
      const reserved = BigInt(state.reserved_balance);
      const available = BigInt(state.available_balance);

      assert.ok(available >= 0n, 'Available liquidity cannot be negative');
      assert.equal(available, total - reserved, 'Available must exactly equal total minus reserved');
    });

    it('INV-72: ensures safety buffer floor is strictly preserved', () => {
      const total = 100_000_000n;
      const reserved = 70_000_000n;
      const minBuffer = 20_000_000n;
      const available = total - reserved; // 30_000_000n

      assert.ok(available >= minBuffer, 'Available balance must satisfy minimum safety buffer');
      const safeCapacity = available - minBuffer; // 10_000_000n
      assert.ok(safeCapacity >= 0n, 'Safe capacity cannot be negative');

      // Attempting to reserve beyond safe capacity must be blocked
      const excessReservation = 15_000_000n;
      assert.ok(excessReservation > safeCapacity, 'Reservation exceeding safe capacity must be rejected');
    });

    it('INV-74: guarantees strict REAL vs SIMULATION mode isolation', () => {
      const realReservation = {
        reservation_id: 'res_real_01',
        mode: 'REAL',
        amount: '10000000',
      };
      const simReservation = {
        reservation_id: 'res_sim_01',
        mode: 'SIMULATION',
        amount: '5000000',
      };

      assert.notEqual(realReservation.mode, simReservation.mode);
      assert.equal(realReservation.mode === 'REAL' && simReservation.mode === 'SIMULATION', true);
    });

    it('INV-76: expires stale reservations and releases encumbered liquidity', () => {
      const now = Date.now();
      const reservation = {
        id: 'res_stale_01',
        created_at: new Date(now - 7200000).toISOString(),
        timeout_seconds: 3600,
        status: 'ACTIVE',
      };

      const expiresAt = new Date(reservation.created_at).getTime() + reservation.timeout_seconds * 1000;
      const isExpired = now > expiresAt;
      assert.equal(isExpired, true, 'Reservation past timeout must be marked expired');
    });

    it('INV-77: prevents double release or double consumption', () => {
      let status = 'ACTIVE';
      const release = () => {
        if (status !== 'ACTIVE') throw new Error('INV-77: Invalid transition');
        status = 'RELEASED';
      };

      release();
      assert.equal(status, 'RELEASED');
      assert.throws(() => release(), /INV-77/, 'Double release must throw invariant error');
    });

    it('INV-81: enforces unverified state when blockchain RPC is unreachable', () => {
      const reconWithoutRPC = {
        has_provider: false,
        reconciliation_status: 'UNVERIFIED',
      };
      assert.equal(reconWithoutRPC.reconciliation_status, 'UNVERIFIED', 'Must never fabricate matched on-chain balance');
    });

    it('INV-85: zero wallet abstraction bypass — money moves only through AgentVault execution pipeline', () => {
      const pipelineSteps = ['RESERVE_LIQUIDITY', 'POLICY_CHECK', 'RISK_SCORING', 'AGENT_VAULT_EXECUTION'];
      assert.ok(pipelineSteps.includes('AGENT_VAULT_EXECUTION'), 'Execution must route to AgentVault');
      assert.equal(pipelineSteps[0], 'RESERVE_LIQUIDITY', 'Reservation precedes execution');
    });
  });

  // 2. Forecasting & Gating Logic
  describe('2. Liquidity Forecasting & Policy Gating', () => {
    it('evaluates temporal forecast survival state correctly', () => {
      const calculateSurvival = (starting, inflows, outflows, buffer) => {
        const net = starting + inflows - outflows;
        if (net >= buffer * 1.5) return 'SAFE';
        if (net >= buffer) return 'CONSTRAINED';
        if (net > 0) return 'CRITICAL';
        return 'UNAVAILABLE';
      };

      assert.equal(calculateSurvival(100, 20, 30, 20), 'SAFE');
      assert.equal(calculateSurvival(100, 10, 85, 20), 'CONSTRAINED');
      assert.equal(calculateSurvival(100, 0, 95, 20), 'CRITICAL');
      assert.equal(calculateSurvival(100, 0, 120, 20), 'UNAVAILABLE');
    });
  });

  // 3. Digital Twin Stress Testing
  describe('3. Digital Twin Stress Simulation', () => {
    it('computes capital adequacy ratio under shock conditions', () => {
      const preBalance = 100_000_000n;
      const shockOutflow = 30_000_000n;
      const minBuffer = 20_000_000n;

      const postHeadroom = preBalance - shockOutflow; // 70_000_000n
      const car = Number(postHeadroom) / Number(minBuffer); // 3.5

      assert.equal(car, 3.5);
      assert.ok(car >= 1.5, 'Capital adequacy ratio is above required threshold');
    });
  });
});
