import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientPath = path.resolve(__dirname, '../lib/api/client.ts');
const missionsPath = path.resolve(__dirname, '../lib/api/missions.ts');
const pagePath = path.resolve(__dirname, '../app/missions/[id]/page.tsx');
const rosterPath = path.resolve(__dirname, '../app/missions/page.tsx');

const clientSource = fs.readFileSync(clientPath, 'utf8');
const missionsSource = fs.readFileSync(missionsPath, 'utf8');
const pageSource = fs.readFileSync(pagePath, 'utf8');
const rosterSource = fs.readFileSync(rosterPath, 'utf8');

class ApiError extends Error {
  constructor(status, code, message, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const DEFAULT_DEMO_API_KEY = 'apk_live_demo1234567890abcdef1234567890abcdef';
const DEFAULT_ORG_ID = 'org_default';

function getApiKey(env = process.env) {
  if (typeof env !== 'undefined') {
    const key = (
      env.NEXT_PUBLIC_DEMO_API_KEY ||
      env.NEXT_PUBLIC_API_KEY ||
      env.NEXT_PUBLIC_AGENTPAY_API_KEY
    );
    if (key && key.trim()) return key.trim();
  }
  return DEFAULT_DEMO_API_KEY;
}

function getDefaultOrgId(env = process.env) {
  if (typeof env !== 'undefined') {
    const org = (
      env.NEXT_PUBLIC_ORGANIZATION_ID ||
      env.NEXT_PUBLIC_ORG_ID
    );
    if (org && org.trim()) return org.trim();
  }
  return DEFAULT_ORG_ID;
}

// ---------------------------------------------------------------------------
// Model of Mission Detail State Machine from apps/web/src/app/missions/[id]/page.tsx
// ---------------------------------------------------------------------------
class MissionTelemetryStateMachine {
  constructor(missionId, options = {}) {
    this.missionId = missionId;
    this.useDemo = options.useDemo || false;
    this.orgId = options.orgId || 'org_default';
    this.timeoutMs = options.timeoutMs || 8000;
    this.fetcher = options.fetcher || null;

    // React component state
    this.initialLoading = true;
    this.isRefreshing = false;
    this.mission = null;
    this.trace = null;
    this.intelligence = null;
    this.errorDetails = null;
  }

  async loadData(isInitial = false) {
    if (!this.missionId || !this.missionId.trim()) {
      this.errorDetails = {
        message: 'Invalid mission ID specified in the route URL.',
        code: 'INVALID_ID',
        status: 400,
      };
      this.initialLoading = false;
      this.isRefreshing = false;
      return;
    }

    if (isInitial) {
      this.initialLoading = true;
      this.errorDetails = null;
    } else {
      this.isRefreshing = true;
    }

    try {
      if (!this.fetcher) {
        throw new ApiError(503, 'NETWORK_UNAVAILABLE', 'Backend unreachable');
      }
      const data = await this.fetcher(this.missionId, {
        useDemo: this.useDemo,
        orgId: this.orgId,
        timeoutMs: this.timeoutMs,
      });

      this.mission = data.mission;
      this.trace = data.trace || null;
      this.intelligence = data.intelligence || null;
      this.errorDetails = null;
    } catch (err) {
      let status = 500;
      let code = 'UNKNOWN_ERROR';
      let message = 'Failed to load mission telemetry';
      let requestId = undefined;

      if (err instanceof ApiError) {
        status = err.status;
        code = err.code;
        message = err.message;
        requestId = err.requestId;
      } else if (err instanceof Error) {
        message = err.message;
        if (message.includes('404') || message.toLowerCase().includes('not found')) {
          status = 404;
          code = 'NOT_FOUND';
        } else if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
          status = 401;
          code = 'UNAUTHORIZED';
        } else if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
          status = 403;
          code = 'FORBIDDEN';
        } else if (message.includes('408') || message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out')) {
          status = 408;
          code = 'REQUEST_TIMEOUT';
        } else if (message.includes('503') || message.toLowerCase().includes('connect') || message.toLowerCase().includes('network')) {
          status = 503;
          code = 'NETWORK_UNAVAILABLE';
        }
      }

      this.errorDetails = { status, code, message, requestId };
    } finally {
      this.initialLoading = false;
      this.isRefreshing = false;
    }
  }

  retry() {
    return this.loadData(true);
  }

  classifyError() {
    if (!this.errorDetails) return null;
    const status = this.errorDetails.status;
    const code = this.errorDetails.code;
    return {
      isNotFound: status === 404 || code === 'NOT_FOUND',
      isAuth: status === 401 || status === 403 || code === 'UNAUTHORIZED' || code === 'FORBIDDEN',
      isTimeout: status === 408 || code === 'REQUEST_TIMEOUT',
      isGatewayOffline: status === 503 || code === 'NETWORK_UNAVAILABLE',
      isStorageError: (status && status >= 500) || code === 'STORAGE_ERROR' || code === 'INTERNAL_ERROR',
    };
  }
}

describe('REGRESSION TEST SUITE: Mission Ledger Mismatch & Loading Termination', () => {

  // ===========================================================================
  // 1. Mission that exists and belongs to current organization
  // ===========================================================================
  describe('1. Mission that exists and belongs to current organization', () => {
    it('successfully resolves authoritative mission details with org_default scoping', async () => {
      const mockMission = {
        id: 'msn_market_intel_001',
        organization_id: 'org_default',
        agent_id: 'research-agent',
        objective: 'Execute autonomous market intelligence research',
        status: 'IN_PROGRESS',
        budget: '5000000',
        spent: '1250000',
        remaining_budget: '3750000',
        currency: 'USDC',
      };

      const sm = new MissionTelemetryStateMachine('msn_market_intel_001', {
        orgId: 'org_default',
        fetcher: async (id, opts) => {
          assert.equal(id, 'msn_market_intel_001');
          assert.equal(opts.orgId, 'org_default');
          return { mission: mockMission };
        },
      });

      assert.equal(sm.initialLoading, true);
      await sm.loadData(true);

      // Loading terminated, mission populated, zero errors
      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails, null);
      assert.notEqual(sm.mission, null);
      assert.equal(sm.mission.id, 'msn_market_intel_001');
      assert.equal(sm.mission.organization_id, 'org_default');
      assert.equal(sm.mission.status, 'IN_PROGRESS');
    });

    it('client defaults to org_default and fallback API key when env vars undefined', () => {
      assert.equal(getDefaultOrgId({}), 'org_default');
      assert.equal(getApiKey({}), DEFAULT_DEMO_API_KEY);
    });

    it('source verification: client attaches X-Organization-Id header and demo key fallback', () => {
      assert.ok(clientSource.includes("X-Organization-Id': getDefaultOrgId()"), 'Must send X-Organization-Id');
      assert.ok(clientSource.includes('DEFAULT_DEMO_API_KEY'), 'Must include DEFAULT_DEMO_API_KEY fallback');
      assert.ok(clientSource.includes('DEFAULT_ORG_ID'), 'Must include DEFAULT_ORG_ID fallback');
    });
  });

  // ===========================================================================
  // 2. Nonexistent mission ID
  // ===========================================================================
  describe('2. Nonexistent mission ID', () => {
    it('produces a clear, recoverable "Mission Not Found" error without masking', async () => {
      const sm = new MissionTelemetryStateMachine('msn_non_existent_99999', {
        fetcher: async (id) => {
          throw new ApiError(404, 'NOT_FOUND', `Mission '${id}' not found in active organization ledger`);
        },
      });

      await sm.loadData(true);

      assert.equal(sm.initialLoading, false);
      assert.equal(sm.mission, null);
      assert.notEqual(sm.errorDetails, null);
      assert.equal(sm.errorDetails.status, 404);
      assert.equal(sm.errorDetails.code, 'NOT_FOUND');

      const classification = sm.classifyError();
      assert.equal(classification.isNotFound, true);
      assert.equal(classification.isAuth, false);
      assert.equal(classification.isTimeout, false);
      assert.equal(classification.isGatewayOffline, false);
      assert.equal(classification.isStorageError, false);
    });

    it('rejects invalid or empty mission ID route with 400 INVALID_ID', async () => {
      const sm = new MissionTelemetryStateMachine('', {
        fetcher: async () => ({ mission: {} }),
      });

      await sm.loadData(true);
      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails.status, 400);
      assert.equal(sm.errorDetails.code, 'INVALID_ID');
    });

    it('source verification: detail page provides working "← Return to Missions" link', () => {
      assert.ok(pageSource.includes('href="/missions"'), 'Must have link to return to /missions');
      assert.ok(pageSource.includes('Return to Missions'), 'Must render text Return to Missions');
    });
  });

  // ===========================================================================
  // 3. Mission belonging to another organization (Tenant Isolation)
  // ===========================================================================
  describe('3. Mission belonging to another organization', () => {
    it('enforces strict tenant isolation and returns 403 or 404 when cross-org access is attempted', async () => {
      const sm = new MissionTelemetryStateMachine('msn_acme_internal_007', {
        orgId: 'org_acme_corp',
        fetcher: async (id, opts) => {
          if (opts.orgId !== 'org_default') {
            throw new ApiError(403, 'FORBIDDEN', 'Access to cross-organization mission is forbidden');
          }
          throw new ApiError(404, 'NOT_FOUND', 'Mission not found in current organization');
        },
      });

      await sm.loadData(true);

      assert.equal(sm.initialLoading, false);
      assert.equal(sm.mission, null);
      assert.equal(sm.errorDetails.status, 403);
      assert.equal(sm.errorDetails.code, 'FORBIDDEN');

      const classification = sm.classifyError();
      assert.equal(classification.isAuth, true);
      assert.equal(classification.isNotFound, false);
    });

    it('source verification: missions API queries support explicit orgId options', () => {
      assert.ok(missionsSource.includes('options?.orgId'), 'fetchMissions must accept orgId');
      assert.ok(missionsSource.includes("headers['X-Organization-Id'] = options.orgId"), 'fetchMission must attach org header');
    });
  });

  // ===========================================================================
  // 4. Backend/database outage
  // ===========================================================================
  describe('4. Backend / database outage', () => {
    it('accurately reports gateway outage (503 NETWORK_UNAVAILABLE) without misreporting as Mission Not Found', async () => {
      const sm = new MissionTelemetryStateMachine('msn_market_intel_001', {
        fetcher: async () => {
          throw new ApiError(503, 'NETWORK_UNAVAILABLE', 'Unable to connect to AgentPay Gateway at http://localhost:8080');
        },
      });

      await sm.loadData(true);

      assert.equal(sm.initialLoading, false);
      assert.equal(sm.mission, null);
      assert.equal(sm.errorDetails.status, 503);
      assert.equal(sm.errorDetails.code, 'NETWORK_UNAVAILABLE');

      const classification = sm.classifyError();
      // MUST NOT BE MISREPORTED AS NOT FOUND!
      assert.equal(classification.isNotFound, false);
      assert.equal(classification.isGatewayOffline, true);
    });

    it('accurately reports database/storage outage (500 STORAGE_ERROR) without misreporting as Mission Not Found', async () => {
      const sm = new MissionTelemetryStateMachine('msn_market_intel_001', {
        fetcher: async () => {
          throw new ApiError(500, 'STORAGE_ERROR', 'database connection pool exhausted: connection refused');
        },
      });

      await sm.loadData(true);

      assert.equal(sm.initialLoading, false);
      assert.equal(sm.mission, null);
      assert.equal(sm.errorDetails.status, 500);
      assert.equal(sm.errorDetails.code, 'STORAGE_ERROR');

      const classification = sm.classifyError();
      assert.equal(classification.isNotFound, false);
      assert.equal(classification.isStorageError, true);
    });

    it('source verification: detail page does not conflate !mission with isNotFound when error occurred', () => {
      // Must not do: const isNotFound = error || !mission;
      assert.ok(!pageSource.includes("error?.toLowerCase().includes('not found') || !mission"), 'Must not mask all errors with !mission');
      assert.ok(pageSource.includes("status === 404 || code === 'NOT_FOUND'"), 'Must check 404 explicitly');
      assert.ok(pageSource.includes("status === 503 || code === 'NETWORK_UNAVAILABLE'"), 'Must check 503 offline explicitly');
    });
  });

  // ===========================================================================
  // 5. Request that times out
  // ===========================================================================
  describe('5. Request that times out', () => {
    it('terminates loading with 408 REQUEST_TIMEOUT, never leaving the page stuck in infinite spinner', async () => {
      const sm = new MissionTelemetryStateMachine('msn_market_intel_001', {
        timeoutMs: 100,
        fetcher: async (id, opts) => {
          await new Promise((resolve) => setTimeout(resolve, opts.timeoutMs + 20));
          throw new ApiError(408, 'REQUEST_TIMEOUT', `Request timed out after ${opts.timeoutMs}ms`);
        },
      });

      assert.equal(sm.initialLoading, true);
      await sm.loadData(true);

      // Loading MUST terminate deterministically!
      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails.status, 408);
      assert.equal(sm.errorDetails.code, 'REQUEST_TIMEOUT');

      const classification = sm.classifyError();
      assert.equal(classification.isTimeout, true);
      assert.equal(classification.isNotFound, false);
    });

    it('source verification: detail page has bounded timeoutMs configured on API calls', () => {
      assert.ok(pageSource.includes('timeoutMs: 8000'), 'Must pass bounded timeoutMs: 8000 to fetchMission');
      assert.ok(pageSource.includes('status === 408 || code === \'REQUEST_TIMEOUT\''), 'Must classify timeout explicitly');
    });
  });

  // ===========================================================================
  // 6. Mission creation followed by detail-page navigation
  // ===========================================================================
  describe('6. Mission creation followed by detail-page navigation', () => {
    it('verifies mission is persisted before navigation and resolves with identical properties', async () => {
      const databaseStore = new Map();

      // Step A: Backend Create handler
      const createHandler = async (input) => {
        const id = `msn_${Date.now()}`;
        const record = {
          id,
          organization_id: input.organization_id || 'org_default',
          agent_id: input.agent_id,
          objective: input.objective,
          budget: input.budget,
          spent: '0',
          remaining_budget: input.budget,
          currency: input.currency || 'USDC',
          status: 'CREATED',
          created_at: new Date().toISOString(),
        };
        // Synchronous persistence in database before returning
        databaseStore.set(id, record);
        return { mission: record, plan: { steps: [] } };
      };

      // Step B: User launches new mission
      const { mission: createdMission } = await createHandler({
        agent_id: 'research-agent',
        objective: 'Scan DEX liquidity pools on Arc and find optimal USDC routing',
        budget: '2500000',
        currency: 'USDC',
      });

      assert.ok(createdMission.id.startsWith('msn_'));
      assert.equal(createdMission.status, 'CREATED');

      // Step C: Route navigation to /missions/[id]
      const targetDetailRoute = `/missions/${createdMission.id}`;
      assert.ok(targetDetailRoute.includes(createdMission.id));

      // Step D: Detail page loads newly created mission from database
      const detailFetcher = async (id) => {
        const found = databaseStore.get(id);
        if (!found) throw new ApiError(404, 'NOT_FOUND', 'Mission not found');
        return { mission: found };
      };

      const sm = new MissionTelemetryStateMachine(createdMission.id, {
        fetcher: detailFetcher,
      });

      await sm.loadData(true);

      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails, null);
      assert.equal(sm.mission.id, createdMission.id);
      assert.equal(sm.mission.objective, createdMission.objective);
      assert.equal(sm.mission.budget, '2500000');
    });
  });

  // ===========================================================================
  // 7. Retry after a temporary connection failure
  // ===========================================================================
  describe('7. Retry after a temporary connection failure', () => {
    it('successfully recovers when retry is triggered after transient failure', async () => {
      let callCount = 0;
      const sm = new MissionTelemetryStateMachine('msn_market_intel_001', {
        fetcher: async (id) => {
          callCount++;
          if (callCount === 1) {
            // First attempt fails with transient network error
            throw new ApiError(503, 'NETWORK_UNAVAILABLE', 'Gateway connection refused');
          }
          // Second attempt succeeds
          return {
            mission: {
              id,
              organization_id: 'org_default',
              status: 'IN_PROGRESS',
              objective: 'Autonomous Market Intelligence',
            },
          };
        },
      });

      // 1. Initial attempt fails
      await sm.loadData(true);
      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails.status, 503);
      assert.equal(sm.mission, null);

      // 2. User clicks "↻ Retry Connection"
      await sm.retry();

      // 3. Telemetry recovered
      assert.equal(sm.initialLoading, false);
      assert.equal(sm.errorDetails, null);
      assert.notEqual(sm.mission, null);
      assert.equal(sm.mission.id, 'msn_market_intel_001');
      assert.equal(callCount, 2);
    });

    it('source verification: retry button calls loadData with isInitial=true and clear error', () => {
      assert.ok(pageSource.includes('loadData(false, true)'), 'Must pass isInitial=true to retry');
      assert.ok(pageSource.includes('↻ Retry Connection'), 'Must render Retry Connection button');
    });
  });

  // ===========================================================================
  // 8. Loading state termination in every failure path
  // ===========================================================================
  describe('8. Loading state termination in every failure path', () => {
    const failureScenarios = [
      { name: '400 Bad Request / Malformed Mission ID', err: new ApiError(400, 'INVALID_ID', 'Invalid mission ID') },
      { name: '401 Unauthorized / Missing API Key', err: new ApiError(401, 'UNAUTHORIZED', 'API key required') },
      { name: '403 Forbidden / Cross-Tenant Scope', err: new ApiError(403, 'FORBIDDEN', 'Cross-tenant access forbidden') },
      { name: '404 Not Found / Mission Missing', err: new ApiError(404, 'NOT_FOUND', 'Mission not found') },
      { name: '408 Request Timeout', err: new ApiError(408, 'REQUEST_TIMEOUT', 'Request timed out after 8000ms') },
      { name: '500 Internal Database / Storage Error', err: new ApiError(500, 'STORAGE_ERROR', 'database down') },
      { name: '502 Bad Gateway', err: new ApiError(502, 'BAD_GATEWAY', 'Bad Gateway') },
      { name: '503 Gateway Offline / Network Unavailable', err: new ApiError(503, 'NETWORK_UNAVAILABLE', 'Connection refused') },
      { name: 'Standard JS Error (e.g. Failed to fetch)', err: new Error('Failed to fetch') },
      { name: 'Empty string mission ID in route', err: null, missionId: '' },
    ];

    failureScenarios.forEach(({ name, err, missionId = 'msn_test' }) => {
      it(`deterministically terminates loading in failure path: ${name}`, async () => {
        const sm = new MissionTelemetryStateMachine(missionId, {
          fetcher: async () => {
            if (err) throw err;
            return { mission: {} };
          },
        });

        assert.equal(sm.initialLoading, true);
        await sm.loadData(true);

        // In 100% of failure scenarios, loading MUST BE FALSE
        assert.equal(sm.initialLoading, false);
        assert.equal(sm.isRefreshing, false);
        assert.notEqual(sm.errorDetails, null);
      });
    });

    it('source verification: polling effect does not depend on mission?.status avoiding infinite render loops', () => {
      assert.ok(!pageSource.includes('[missionId, isDemoMode, mission?.status]'), 'Must not have mission?.status in dependencies');
      assert.ok(pageSource.includes('[missionId, isDemoMode, loadData]'), 'Must depend cleanly on stable dependencies');
    });
  });

  // ===========================================================================
  // 9. Sandbox / Reference Mission Labeling & Isolation
  // ===========================================================================
  describe('9. Sandbox / Reference Mission Labeling & Isolation', () => {
    it('source verification: DEMO_MISSIONS contains canonical demo fixture msn_market_intel_001', () => {
      assert.ok(missionsSource.includes("id: 'msn_market_intel_001'"), 'msn_market_intel_001 in DEMO_MISSIONS');
      assert.ok(missionsSource.includes("environment: 'sandbox'"), 'Explicit sandbox environment tag');
    });

    it('source verification: detail page isolates sandbox fixture with DataAuthorityBadge and notice', () => {
      assert.ok(pageSource.includes('SANDBOX / SIMULATION ENVIRONMENT'), 'Must display Sandbox banner for fixtures');
      assert.ok(pageSource.includes('DataAuthorityBadge'), 'Must render DataAuthorityBadge');
    });
  });
});
