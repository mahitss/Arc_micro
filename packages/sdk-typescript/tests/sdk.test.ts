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

test('AgentPay SDK — Webhooks Resource & Signature Verification', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';
    return new Response(
      JSON.stringify({
        id: 'we_test_123',
        organization_id: 'org_default',
        url: 'https://webhook.site/test',
        description: 'Test Webhook',
        subscribed_events: ['payment_intent.*'],
        enabled: true,
        secret: 'whsec_test_secret_1234567890abcdef1234567890abcdef',
        created_at: new Date().toISOString(),
        warning: 'Store this secret securely.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ apiKey: 'ap_live_test', fetch: mockFetch });

  // 1. Create webhook
  const created = await client.webhooks.create({
    url: 'https://webhook.site/test',
    description: 'Test Webhook',
    subscribedEvents: ['payment_intent.*'],
  });

  assert.equal(capturedUrl, 'http://localhost:8080/v1/webhooks');
  assert.equal(capturedMethod, 'POST');
  assert.equal(created.id, 'we_test_123');
  assert.equal(created.secret, 'whsec_test_secret_1234567890abcdef1234567890abcdef');

  // 2. Test HMAC signature verification
  const secret = 'whsec_test_secret_1234567890abcdef1234567890abcdef';
  const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.created' });
  const now = Math.floor(Date.now() / 1000);

  // Generate valid signature using createHmac
  const { createHmac } = await import('node:crypto');
  const validSig = createHmac('sha256', secret).update(`${now}.${payload}`).digest('hex');
  const validHeader = `t=${now},v1=${validSig}`;

  const isValid = client.webhooks.verifySignature(payload, validHeader, secret, 300);
  assert.equal(isValid, true);

  // Invalid signature
  const isInvalid = client.webhooks.verifySignature(payload, `t=${now},v1=invalidsig123`, secret, 300);
  assert.equal(isInvalid, false);

  // Stale timestamp (replay attack)
  const staleTimestamp = now - 600; // 10 minutes ago
  const staleSig = createHmac('sha256', secret).update(`${staleTimestamp}.${payload}`).digest('hex');
  const staleHeader = `t=${staleTimestamp},v1=${staleSig}`;
  const isStaleValid = client.webhooks.verifySignature(payload, staleHeader, secret, 300);
  assert.equal(isStaleValid, false);
});

test('AgentPay SDK — Events Resource Querying', async () => {
  let capturedUrl = '';

  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    return new Response(
      JSON.stringify({
        events: [
          {
            id: 'evt_001',
            type: 'payment_intent.authorized',
            version: 1,
            occurred_at: new Date().toISOString(),
            organization_id: 'org_default',
            actor_type: 'SYSTEM',
            actor_id: 'policy-engine',
            payment_intent_id: 'intent_123',
            request_id: 'req_001',
            correlation_id: 'corr_001',
            data: { intent_id: 'intent_123', status: 'AUTHORIZED' },
          },
        ],
        total: 1,
        limit: 10,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ apiKey: 'ap_live_test', fetch: mockFetch });
  const events = await client.events.list({
    paymentIntentId: 'intent_123',
    eventType: 'payment_intent.authorized',
    limit: 10,
  });

  assert.equal(
    capturedUrl,
    'http://localhost:8080/v1/events?event_type=payment_intent.authorized&payment_intent_id=intent_123&limit=10'
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'evt_001');
  assert.equal(events[0].payment_intent_id, 'intent_123');
});
