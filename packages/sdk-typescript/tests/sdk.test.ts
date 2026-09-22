import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentPay } from '../src/client.js';
import {
  AgentPayError,
  ApprovalRequiredError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  ExecutionError,
  InsufficientTreasuryError,
  NotFoundError,
  PolicyDeniedError,
  RateLimitedError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
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

test('AgentPay SDK — Typed Error Handling', async () => {
  // 1. 401 Unauthorized / AuthenticationError
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
      assert.ok(err instanceof AuthenticationError);
      assert.ok(err instanceof UnauthorizedError);
      assert.equal(err.code, 'AUTHENTICATION_ERROR');
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
      assert.ok(err instanceof RateLimitedError);
      assert.ok(err instanceof RateLimitError);
      assert.equal(err.statusCode, 429);
      assert.equal(err.requestId, 'req_err_429');
      return true;
    }
  );

  // 4. 400 Validation Error
  const mock400: typeof fetch = async () => {
    return new Response(
      JSON.stringify({ error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive integer string' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_err_400' } }
    );
  };
  const client400 = new AgentPay({ fetch: mock400 });
  await assert.rejects(
    async () => client400.paymentIntents.create({ agentId: 'a', service: 's', amount: '-1', purpose: 'p' }),
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.statusCode, 400);
      return true;
    }
  );

  // 5. Insufficient Treasury Error
  const mockTreasury: typeof fetch = async () => {
    return new Response(
      JSON.stringify({ error: { code: 'INSUFFICIENT_FUNDS', message: 'Treasury vault balance is insufficient' } }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_err_treasury' } }
    );
  };
  const clientTreasury = new AgentPay({ fetch: mockTreasury });
  await assert.rejects(
    async () => clientTreasury.paymentIntents.create({ agentId: 'a', service: 's', amount: '1000000000', purpose: 'p' }),
    (err: any) => {
      assert.ok(err instanceof InsufficientTreasuryError);
      assert.equal(err.code, 'INSUFFICIENT_TREASURY');
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

  // Positional arguments
  const isValid = client.webhooks.verifySignature(payload, validHeader, secret, 300);
  assert.equal(isValid, true);

  // Object arguments
  const isObjValid = client.webhooks.verifySignature({
    payload,
    signature: validHeader,
    secret,
    toleranceSeconds: 300,
  });
  assert.equal(isObjValid, true);

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

test('AgentPay SDK — Polling Helper (waitForCompletion)', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    const status = callCount < 3 ? 'EXECUTING' : 'CONFIRMED';
    return new Response(
      JSON.stringify({
        intent: {
          id: 'pi_poll_test',
          status,
          amount: '5000000',
          asset: 'USDC',
          service: 'test-service',
          recipient: '0x1111111111111111111111111111111111111111',
          agent_id: 'agent_test',
          organization_id: 'org_default',
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
        },
        authorization_status: 'AUTHORIZED',
        execution_status: status,
        transaction_hash: status === 'CONFIRMED' ? '0xabcdef123456' : undefined,
        timestamps: {
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const result = await client.paymentIntents.waitForCompletion('pi_poll_test', {
    timeoutMs: 5000,
    intervalMs: 50,
  });

  assert.equal(result.intent.status, 'CONFIRMED');
  assert.equal(result.transaction_hash, '0xabcdef123456');
  assert.ok(callCount >= 3);
});

test('AgentPay SDK — Services Filter and Quote (Day 8)', async () => {
  let capturedListUrl = '';
  let capturedQuoteUrl = '';
  let capturedQuoteBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    const url = input.toString();
    if (url.includes('/quote')) {
      capturedQuoteUrl = url;
      capturedQuoteBody = (init?.body as string) || '';
      return new Response(
        JSON.stringify({
          quote_id: 'quote_123',
          service_id: 'research-api',
          amount: '2500000',
          asset: 'USDC',
          expires_at: new Date(Date.now() + 900000).toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    capturedListUrl = url;
    return new Response(
      JSON.stringify({
        services: [
          {
            id: 'research-api',
            name: 'Deep Research Service',
            category: 'RESEARCH',
            trust_status: 'TRUSTED',
            pricing_model: 'FIXED',
            fixed_price: '2500000',
            recipient: '0x3333333333333333333333333333333333333333',
            asset: 'USDC',
            enabled: true,
            max_price: '5000000',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });

  // 1. Filtered list
  const services = await client.services.list({
    category: 'RESEARCH',
    trustStatus: 'TRUSTED',
    enabled: true,
  });
  assert.equal(
    capturedListUrl,
    'http://localhost:8080/v1/services?category=RESEARCH&trust_status=TRUSTED&enabled=true'
  );
  assert.equal(services.length, 1);
  assert.equal(services[0].id, 'research-api');
  assert.equal(services[0].category, 'RESEARCH');

  // 2. Get Quote
  const quote = await client.services.getQuote('research-api', { amount: '2500000' });
  assert.equal(capturedQuoteUrl, 'http://localhost:8080/v1/services/research-api/quote');
  assert.equal(JSON.parse(capturedQuoteBody).amount, '2500000');
  assert.equal(quote.quote_id, 'quote_123');
  assert.equal(quote.amount, '2500000');
});

test('AgentPay SDK — Agent Budget Retrieval (Day 8)', async () => {
  let capturedUrl = '';
  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    return new Response(
      JSON.stringify({
        agent_id: 'agent_researcher',
        daily_limit: '100000000',
        daily_spent: '25000000',
        remaining_daily_limit: '75000000',
        payment_limit: '50000000',
        available_budget: '50000000',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const budget = await client.agents.getBudget('agent_researcher');

  assert.equal(capturedUrl, 'http://localhost:8080/v1/agent-budgets/agent_researcher');
  assert.equal(budget.agent_id, 'agent_researcher');
  assert.equal(budget.remaining_daily_limit, '75000000');
  assert.equal(budget.available_budget, '50000000');
});

test('AgentPay SDK — Financial Simulation (Day 8)', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedBody = (init?.body as string) || '';
    return new Response(
      JSON.stringify({
        simulation_id: 'sim_test_001',
        predicted_outcome: 'WOULD_EXECUTE',
        policy_decision: 'ALLOW',
        risk_level: 'LOW',
        approval_required: false,
        treasury_sufficient: true,
        evaluated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const sim = await client.simulations.create({
    agent_id: 'agent_007',
    service_id: 'research-api',
    amount: '2000000',
    asset: 'USDC',
    purpose: 'Market report dry-run',
  });

  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations');
  assert.equal(JSON.parse(capturedBody).agent_id, 'agent_007');
  assert.equal(sim.simulation_id, 'sim_test_001');
  assert.equal(sim.predicted_outcome, 'WOULD_EXECUTE');
  assert.equal(sim.approval_required, false);
});

test('AgentPay SDK — payments Alias, quoteId, and Idempotency Key', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  let capturedHeaders: Record<string, string> = {};

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedBody = (init?.body as string) || '';
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => {
          capturedHeaders[key.toLowerCase()] = val;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      } else {
        for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
          capturedHeaders[k.toLowerCase()] = v;
        }
      }
    }

    return new Response(
      JSON.stringify({
        id: 'pi_test_day8',
        agent_id: 'agent_alpha',
        service: 'web-research',
        amount: '180000',
        asset: 'USDC',
        purpose: 'Day 8 developer platform test',
        status: 'AUTHORIZED',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString(),
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  // Verify payments alias is identical to paymentIntents
  assert.equal(client.payments, client.paymentIntents);

  const payment = await client.payments.create(
    {
      agentId: 'agent_alpha',
      serviceId: 'web-research',
      quoteId: 'quote_day8_123',
      amount: '180000',
      asset: 'USDC',
      purpose: 'Day 8 developer platform test',
    },
    { idempotencyKey: 'idem_day8_test_key' }
  );

  assert.equal(capturedUrl, 'http://localhost:8080/v1/payment-intents');
  const body = JSON.parse(capturedBody);
  assert.equal(body.agent_id, 'agent_alpha');
  assert.equal(body.service, 'web-research');
  assert.equal(body.quote_id, 'quote_day8_123');
  assert.equal(body.amount, '180000');
  assert.equal(capturedHeaders['idempotency-key'], 'idem_day8_test_key');
  assert.equal(payment.id, 'pi_test_day8');
  assert.equal(payment.status, 'AUTHORIZED');
});

test('AgentPay SDK — Financial Flight Recorder Trace Retrieval', async () => {
  let capturedUrl = '';

  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    return new Response(
      JSON.stringify({
        trace_id: 'trc_pi_100',
        organization_id: 'org_dev',
        agent_id: 'agent_alpha',
        payment_intent_id: 'pi_100',
        status: 'CONFIRMED',
        execution_mode: 'SIMULATION',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        steps: [
          {
            step_number: 1,
            step_id: 'step_1',
            trace_id: 'trc_pi_100',
            type: 'PAYMENT_REQUESTED',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            actor: 'AGENT:agent_alpha',
          },
          {
            step_number: 2,
            step_id: 'step_2',
            trace_id: 'trc_pi_100',
            type: 'POLICY_EVALUATED',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            actor: 'SYSTEM',
          },
        ],
        payment_summary: {
          intent_id: 'pi_100',
          organization_id: 'org_dev',
          agent_id: 'agent_alpha',
          service_id: 'web-research',
          recipient: '0x1234567890123456789012345678901234567890',
          amount: '180000',
          asset: 'USDC',
          purpose: 'flight recorder verification',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const trace = await client.payments.trace('pi_100');

  assert.equal(capturedUrl, 'http://localhost:8080/v1/payment-intents/pi_100/trace');
  assert.equal(trace.trace_id, 'trc_pi_100');
  assert.equal(trace.status, 'CONFIRMED');
  assert.equal(trace.execution_mode, 'SIMULATION');
  assert.equal(trace.steps.length, 2);
  assert.equal(trace.steps[0].type, 'PAYMENT_REQUESTED');
});

