import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentPay } from '../src/client.js';
import {
  AgentPayError,
  ApprovalRequiredError,
  NotFoundError,
  PolicyDeniedError,
  RateLimitError,
  UnauthorizedError,
} from '../src/errors.js';

test('AgentPay SDK — Initialization & Defaults', () => {
  const client = new AgentPay({ apiKey: 'ap_live_test123' });
  assert.equal(client.baseUrl, 'http://localhost:8080');
  assert.equal(client.apiKey, 'ap_live_test123');
  assert.ok(client.paymentIntents);
  assert.ok(client.agents);
  assert.ok(client.services);
  assert.ok(client.approvals);
  assert.ok(client.transactions);
});

test('AgentPay SDK — Authentication & Request Headers', async () => {
  let capturedHeaders: Record<string, string> = {};
  let capturedUrl = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    const h = init?.headers as Record<string, string>;
    capturedHeaders = { ...h };
    return new Response(JSON.stringify({ payment_intents: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_sdk_auth_test' },
    });
  };

  const client = new AgentPay({
    apiKey: 'ap_live_authkey_secret',
    baseUrl: 'https://api.agentpay.arc',
    fetch: mockFetch,
  });

  await client.paymentIntents.list();

  assert.equal(capturedUrl, 'https://api.agentpay.arc/v1/payment-intents');
  assert.equal(capturedHeaders['Authorization'], 'Bearer ap_live_authkey_secret');
  assert.equal(capturedHeaders['Content-Type'], 'application/json');
});

test('AgentPay SDK — Idempotency Key Header Propagation', async () => {
  let capturedHeaders: Record<string, string> = {};

  const mockFetch: typeof fetch = async (_input, init) => {
    capturedHeaders = (init?.headers || {}) as Record<string, string>;
    return new Response(
      JSON.stringify({
        id: 'intent_idem_test',
        status: 'AUTHORIZED',
        amount: '12000000',
        asset: 'USDC',
        service: 'research-api',
        recipient: '0x5555555555555555555555555555555555555555',
        agent_id: 'agent_research',
        organization_id: 'org_default',
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });

  const res = await client.paymentIntents.create(
    {
      agentId: 'agent_research',
      service: 'research-api',
      amount: '12000000',
      asset: 'USDC',
      purpose: 'Research report',
    },
    { idempotencyKey: 'req_idem_key_999' }
  );

  assert.equal(capturedHeaders['Idempotency-Key'], 'req_idem_key_999');
  assert.equal(res.id, 'intent_idem_test');
  assert.equal(res.status, 'AUTHORIZED');
});

test('AgentPay SDK — Typed Error Handling (Unauthorized, Not Found, Rate Limited)', async () => {
  // 1. 401 Unauthorized
  const mock401: typeof fetch = async () => {
    return new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_err_401' },
      }
    );
  };
  const client401 = new AgentPay({ fetch: mock401 });
  await assert.rejects(
    async () => client401.paymentIntents.list(),
    (err: any) => {
      assert.ok(err instanceof UnauthorizedError);
      assert.equal(err.code, 'UNAUTHORIZED');
      assert.equal(err.statusCode, 401);
      assert.equal(err.requestId, 'req_err_401');
      return true;
    }
  );

  // 2. 404 Not Found
  const mock404: typeof fetch = async () => {
    return new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Payment intent not found' } }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_err_404' },
      }
    );
  };
  const client404 = new AgentPay({ fetch: mock404 });
  await assert.rejects(
    async () => client404.paymentIntents.get('non_existent'),
    (err: any) => {
      assert.ok(err instanceof NotFoundError);
      assert.equal(err.statusCode, 404);
      assert.equal(err.requestId, 'req_err_404');
      return true;
    }
  );

  // 3. 429 Rate Limited
  const mock429: typeof fetch = async () => {
    return new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_err_429' },
      }
    );
  };
  const client429 = new AgentPay({ fetch: mock429 });
  await assert.rejects(
    async () => client429.paymentIntents.list(),
    (err: any) => {
      assert.ok(err instanceof RateLimitError);
      assert.equal(err.statusCode, 429);
      assert.equal(err.requestId, 'req_err_429');
      return true;
    }
  );
});

test('AgentPay SDK — Policy Denied & Approval Required Error Mapping', async () => {
  // Policy Denied
  const mockPolicyDenied: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 'PAYMENT_POLICY_DENIED',
          message: 'Payment exceeds the configured transaction limit.',
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_policy_deny' },
      }
    );
  };
  const clientDeny = new AgentPay({ fetch: mockPolicyDenied });
  await assert.rejects(
    async () =>
      clientDeny.paymentIntents.create({
        agentId: 'agent_1',
        service: 'compute',
        amount: '999999999',
        purpose: 'Excessive spend',
      }),
    (err: any) => {
      assert.ok(err instanceof PolicyDeniedError);
      assert.equal(err.code, 'POLICY_DENIED');
      assert.equal(err.requestId, 'req_policy_deny');
      return true;
    }
  );
});

test('AgentPay SDK — Zero Private Key Invariant', () => {
  const client = new AgentPay();
  // Ensure no private key signing or wallet methods exist on the client
  assert.equal((client as any).privateKey, undefined);
  assert.equal((client as any).signer, undefined);
  assert.equal((client as any).wallet, undefined);
  assert.equal((client as any).signTransaction, undefined);
});
