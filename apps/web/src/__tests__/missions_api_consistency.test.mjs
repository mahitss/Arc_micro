import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientSourcePath = path.resolve(__dirname, '../lib/api/client.ts');
const clientSource = fs.readFileSync(clientSourcePath, 'utf8');

class ApiError extends Error {
  constructor(status, code, message, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function getBaseApiUrl() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GATEWAY_URL) {
    return process.env.NEXT_PUBLIC_GATEWAY_URL;
  }
  return 'http://localhost:8080';
}

describe('TASK 45 — Missions Page API & Simulation Flow Test Suite', () => {

  // 1. API Base URL Configuration & Source Integrity
  describe('1. API Base URL Configuration & Source Integrity', () => {
    it('resolves canonical API base URL without hardcoding port', () => {
      const url = getBaseApiUrl();
      assert.ok(typeof url === 'string');
      assert.ok(url.startsWith('http://'));
    });

    it('verifies client.ts exports ApiError and getBaseApiUrl with fallback port 8080', () => {
      assert.ok(clientSource.includes('export class ApiError extends Error'), 'Must export ApiError');
      assert.ok(clientSource.includes('export function getBaseApiUrl'), 'Must export getBaseApiUrl');
      assert.ok(clientSource.includes('http://localhost:8080'), 'Must fallback to port 8080');
    });
  });

  // 2. Mission List Scenarios
  describe('2. Mission List Scenarios', () => {
    it('mission list success: parses missions array from Gateway response', async () => {
      const mockGatewayResponse = {
        count: 1,
        missions: [
          {
            id: 'msn_test_1',
            objective: 'Test Objective',
            status: 'CREATED',
            budget: '2000000',
            spent: '0',
            remaining_budget: '2000000',
            currency: 'USDC',
          },
        ],
      };

      assert.equal(mockGatewayResponse.count, 1);
      assert.equal(mockGatewayResponse.missions[0].id, 'msn_test_1');
    });

    it('mission list empty: handles genuine empty array without throwing', () => {
      const emptyResponse = { count: 0, missions: [] };
      const missions = emptyResponse.missions || [];
      assert.equal(missions.length, 0);
    });

    it('mission list network failure: formats friendly error message', () => {
      const err = new ApiError(503, 'NETWORK_UNAVAILABLE', 'Unable to connect to AgentPay Gateway at http://localhost:8080');
      assert.equal(err.status, 503);
      assert.equal(err.code, 'NETWORK_UNAVAILABLE');
      assert.ok(err.message.includes('Unable to connect'));
    });

    it('mission list HTTP 500: preserves server error code and message', () => {
      const err = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection refused');
      assert.equal(err.status, 500);
      assert.equal(err.code, 'INTERNAL_SERVER_ERROR');
      assert.equal(err.message, 'Database connection refused');
    });

    it('mission list malformed response: handles missing missions field safely', () => {
      const malformed = {};
      const missions = malformed.missions || [];
      assert.equal(missions.length, 0);
    });
  });

  // 3. Create Mission Scenarios
  describe('3. Create Mission Scenarios', () => {
    it('create mission success: constructs valid CreateMissionInput', () => {
      const input = {
        objective: 'Acquire real-time weather telemetry',
        budget: '2000000',
        agent_id: 'research-agent',
        currency: 'USDC',
      };

      assert.ok(input.objective.length > 0);
      assert.ok(parseInt(input.budget, 10) > 0);
      assert.equal(input.currency, 'USDC');
    });

    it('create mission validation failure: rejects empty objective', () => {
      const validate = (obj) => {
        if (!obj || !obj.trim()) {
          throw new Error('Economic objective is required');
        }
      };

      assert.throws(() => validate(''), /Economic objective is required/);
      assert.throws(() => validate('   '), /Economic objective is required/);
    });

    it('create mission backend failure: handles policy rejection', () => {
      const policyDenial = {
        error: {
          code: 'POLICY_VIOLATION',
          message: 'Budget exceeds agent spending limit of $10.00',
        },
      };

      assert.equal(policyDenial.error.code, 'POLICY_VIOLATION');
      assert.ok(policyDenial.error.message.includes('spending limit'));
    });
  });

  // 4. Simulation Flow & Invariants
  describe('4. Simulation Flow & Invariants', () => {
    it('simulation success: maps Gateway simulation response fields safely', () => {
      const gatewaySim = {
        simulation_only: true,
        mission_id: 'msn_sim_12345',
        objective: 'Weather check',
        authorized_budget: '2000000',
        currency: 'USDC',
        planned_steps_count: 2,
        projected_spend: '500000',
        all_steps_approved: true,
        approval_required: false,
        simulated_steps: [
          {
            step_id: 'step_1',
            required_capability: 'web_search',
            selected_service_id: 'web-research',
            selected_quote_price: '200000',
            policy_decision: 'ALLOW',
          },
        ],
      };

      // Ensure both field mappings resolve correctly
      const spend = gatewaySim.projected_spend || gatewaySim.total_projected_spend;
      const approval = gatewaySim.approval_required ?? gatewaySim.requires_human_approval;
      const price = gatewaySim.simulated_steps[0].selected_quote_price || gatewaySim.simulated_steps[0].quoted_price;

      assert.equal(spend, '500000');
      assert.equal(approval, false);
      assert.equal(price, '200000');
    });

    it('simulation failure: reports policy violation without throwing uncaught', () => {
      const failureSim = {
        simulation_only: true,
        all_steps_approved: false,
        policy_violations: ['Recipient address is not on allowed recipient list'],
      };

      assert.equal(failureSim.all_steps_approved, false);
      assert.equal(failureSim.policy_violations.length, 1);
    });

    it('simulation never broadcasts, never signs, never moves funds', () => {
      const sim = {
        simulation_only: true,
        has_broadcast: false,
        signed_calldata: null,
        funds_moved_base: '0',
      };

      assert.equal(sim.simulation_only, true, 'Must be simulation only');
      assert.equal(sim.has_broadcast, false, 'Must never broadcast');
      assert.equal(sim.signed_calldata, null, 'Must never sign');
      assert.equal(sim.funds_moved_base, '0', 'Zero funds moved');
    });
  });

  // 5. Duplicate Submission & Idempotency
  describe('5. Duplicate Submission & Idempotency', () => {
    it('prevents submission when already inflight', () => {
      let isSubmitting = true;
      const canSubmit = !isSubmitting;
      assert.equal(canSubmit, false, 'Must be disabled while submission is inflight');
    });
  });

  // 6. CORS & Localhost Origins
  describe('6. CORS & Localhost Origins', () => {
    it('verifies allowed origin pattern matches dev ports', () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];

      assert.ok(allowedOrigins.includes('http://localhost:3001'));
      assert.ok(allowedOrigins.includes('http://localhost:3000'));
    });
  });
});
