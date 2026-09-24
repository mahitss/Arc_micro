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

test('AgentPay SDK — Agent-to-Agent Discovery and Services', async () => {
  let capturedUrl = '';
  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    const item = {
      agent_id: 'agent_data_01',
      service_id: 'data-processing',
      organization_id: 'org_default',
      name: 'Data Extraction Agent',
      description: 'Extracts structured data from web and documents',
      capabilities: ['data_extraction', 'sentiment_analysis'],
      pricing_model: 'FIXED',
      base_price: '500000',
      max_price: '1500000',
      supported_assets: ['USDC'],
      availability: 'ONLINE',
      reputation: 9800,
      success_rate_bps: 9950,
      average_latency_ms: 120,
      risk_profile: 'LOW',
      enabled: true,
      verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const payload = capturedUrl.includes('/services/') ? { services: [item] } : { agents: [item] };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new AgentPay({ fetch: mockFetch });
  const discovered = await client.agents.discover({ capability: 'data_extraction', minReputation: 9000 });

  assert.ok(capturedUrl.includes('/v1/agents/discover?capability=data_extraction&min_reputation=9000'));
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].agent_id, 'agent_data_01');
  assert.equal(discovered[0].pricing_model, 'FIXED');

  const services = await client.agents.getServices('agent_data_01');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/agents/services/agent_data_01');
  assert.equal(services.length, 1);
});

test('AgentPay SDK — Agent Quotes and Negotiation', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';
    capturedBody = (init?.body as string) || '';

    return new Response(
      JSON.stringify({
        quote_id: 'quote_a2a_001',
        buyer_agent_id: 'agent_buyer',
        seller_agent_id: 'agent_seller',
        service_id: 'data-processing',
        price: '480000',
        asset: 'USDC',
        estimated_latency_ms: 250,
        quality: 9500,
        valid_until: new Date(Date.now() + 600000).toISOString(),
        status: 'OFFERED',
        created_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const quote = await client.quotes.request('data-processing', {
    buyer_agent_id: 'agent_buyer',
    proposed_price: '450000',
  });

  assert.equal(capturedUrl, 'http://localhost:8080/v1/agent-services/data-processing/quotes');
  assert.equal(capturedMethod, 'POST');
  assert.equal(quote.quote_id, 'quote_a2a_001');
  assert.equal(quote.price, '480000');

  const countered = await client.quotes.counter('quote_a2a_001', {
    agent_id: 'agent_buyer',
    proposed_price: '460000',
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/quotes/quote_a2a_001/counter');

  const accepted = await client.quotes.accept('quote_a2a_001');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/quotes/quote_a2a_001/accept');
  assert.equal(accepted.quote_id, 'quote_a2a_001');
});

test('AgentPay SDK — Inter-Agent Hires, Payments, and Results', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';
    return new Response(
      JSON.stringify({
        id: 'hire_test_01',
        organization_id: 'org_default',
        buyer_agent_id: 'agent_buyer',
        seller_agent_id: 'agent_seller',
        service_id: 'data-processing',
        capability: 'data_extraction',
        mission_id: 'mission_root_100',
        root_mission_id: 'mission_root_100',
        call_depth: 1,
        quote_id: 'quote_a2a_001',
        price: '480000',
        asset: 'USDC',
        expected_result: 'structured_json',
        status: 'PAID',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const hire = await client.hires.create({
    buyer_agent_id: 'agent_buyer',
    quote_id: 'quote_a2a_001',
    mission_id: 'mission_root_100',
    expected_result: 'structured_json',
  });

  assert.equal(capturedUrl, 'http://localhost:8080/v1/hires');
  assert.equal(hire.id, 'hire_test_01');
  assert.equal(hire.call_depth, 1);

  const paidHire = await client.hires.executePayment('hire_test_01');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/hires/hire_test_01/pay');
  assert.equal(paidHire.status, 'PAID');

  const resHire = await client.hires.submitResult('hire_test_01', {
    result_type: 'data',
    result: { items: [1, 2, 3] },
    quality: 0.99,
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/hires/hire_test_01/results');

  const cancelled = await client.hires.cancel('hire_test_01', 'Test complete');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/hires/hire_test_01/cancel');
});

test('AgentPay SDK — Economic Graph Retrieval', async () => {
  let capturedUrl = '';
  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    return new Response(
      JSON.stringify({
        mission_id: 'mission_123',
        nodes: [
          { id: 'mission_123', type: 'MISSION', label: 'Market Research Mission' },
          { id: 'agent_buyer', type: 'AGENT', label: 'Primary Coordinator' },
          { id: 'hire_test_01', type: 'HIRE', label: 'Hire: Data Extraction' },
        ],
        edges: [
          { source: 'agent_buyer', target: 'hire_test_01', type: 'HIRED' },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });
  const graph = await client.missions.economicGraph('mission_123');

  assert.equal(capturedUrl, 'http://localhost:8080/v1/missions/mission_123/economic-graph');
  assert.equal(graph.mission_id, 'mission_123');
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].type, 'HIRED');
});

test('AgentPay SDK — Services Intelligence: Performance, Reputation, Anomalies', async () => {
  let capturedUrl = '';
  const mockFetch: typeof fetch = async (input) => {
    capturedUrl = input.toString();
    if (capturedUrl.includes('/performance')) {
      return new Response(
        JSON.stringify({
          service_id: 'data-agent',
          organization_id: 'org_test',
          window: 'last_10_jobs',
          success_rate_bps: 9800,
          failure_rate_bps: 200,
          average_price: '300000',
          average_latency_ms: 350,
          confidence: 'HIGH',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.includes('/anomalies')) {
      return new Response(
        JSON.stringify({
          service_id: 'data-agent',
          circuit_breaker_status: 'HEALTHY',
          anomalies: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.includes('/reputation')) {
      return new Response(
        JSON.stringify({
          service_id: 'data-agent',
          reputation_score: 9800,
          historical_reliability: '99.8%',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  const client = new AgentPay({ fetch: mockFetch });

  const perf = await client.services.performance('data-agent', { window: 'last_10_jobs' });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/services/data-agent/performance?window=last_10_jobs');
  assert.equal(perf.success_rate_bps, 9800);
  assert.equal(perf.confidence, 'HIGH');

  const anom = await client.services.anomalies('data-agent');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/services/data-agent/anomalies');
  assert.equal(anom.circuit_breaker_status, 'HEALTHY');

  const rep = await client.services.reputation('data-agent');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/services/data-agent/reputation');
  assert.equal(rep.reputation_score, 9800);
});

test('AgentPay SDK — Mission Intelligence: Telemetry, Recommendations, Replan, Recovery', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';

    if (capturedUrl.includes('/intelligence')) {
      return new Response(
        JSON.stringify({
          mission_id: 'msn_456',
          recovery_attempts: 1,
          max_recovery_attempts: 3,
          learning_trace: [
            { timestamp: new Date().toISOString(), event: 'SERVICE_FAILED', details: 'Timeout' },
            { timestamp: new Date().toISOString(), event: 'ALTERNATIVE_SELECTED', details: 'Selected DataAgent B' },
          ],
          confidence: 'HIGH',
          status: 'COMPLETED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.includes('/replan')) {
      return new Response(
        JSON.stringify({
          mission_id: 'msn_456',
          reason: 'SERVICE_FAILURE',
          strategy: 'TRY_ALTERNATIVE_SERVICE',
          proposed_steps: [
            {
              step_id: 'step_1_alt',
              recommended_service_id: 'data-agent-b',
              estimated_cost: '350000',
              estimated_latency_ms: 300,
            },
          ],
          estimated_cost: '350000',
          confidence: 'HIGH',
          requires_human: false,
          explanation: 'Optimal alternative selected',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.includes('/recovery')) {
      return new Response(
        JSON.stringify({
          mission_id: 'msn_456',
          recovery_attempts: 1,
          max_recovery_attempts: 3,
          status: 'COMPLETED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.includes('/observations')) {
      return new Response(
        JSON.stringify({
          mission_id: 'msn_456',
          observations: [
            { id: 'obs_1', event_type: 'SERVICE_FAILURE', success: false },
            { id: 'obs_2', event_type: 'SERVICE_SUCCESS', success: true },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  const client = new AgentPay({ fetch: mockFetch });

  const intel = await client.missions.intelligence('msn_456');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/missions/msn_456/intelligence');
  assert.equal(intel.recovery_attempts, 1);
  assert.equal(intel.learning_trace.length, 2);

  const proposal = await client.missions.replan('msn_456');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/missions/msn_456/replan');
  assert.equal(capturedMethod, 'POST');
  assert.equal(proposal.strategy, 'TRY_ALTERNATIVE_SERVICE');
  assert.equal(proposal.proposed_steps[0].recommended_service_id, 'data-agent-b');

  const rec = await client.missions.recovery('msn_456');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/missions/msn_456/recovery');
  assert.equal(rec.recovery_attempts, 1);

  const obs = await client.missions.observations('msn_456');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/missions/msn_456/observations');
  assert.equal(obs.observations.length, 2);
});

test('AgentPay SDK — Multi-Agent Swarm Orchestration: Lifecycle, Tasks, Graph, Risk, Simulation', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';
    capturedBody = (init?.body as string) || '';

    if (capturedUrl.endsWith('/v1/swarms') && capturedMethod === 'POST') {
      return new Response(
        JSON.stringify({
          swarm: {
            id: 'swm_789',
            name: 'Market Intelligence Swarm',
            objective: 'Analyze AI infrastructure',
            status: 'CREATED',
            max_budget: '5000000',
            total_spent: '0',
            total_reserved: '0',
            task_count: 5,
            completed_tasks: 0,
            failed_tasks: 0,
            orchestrator_agent_id: 'orch_1',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789') && capturedMethod === 'GET') {
      return new Response(
        JSON.stringify({
          swarm: {
            id: 'swm_789',
            name: 'Market Intelligence Swarm',
            status: 'RUNNING',
            max_budget: '5000000',
            task_count: 5,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/start')) {
      return new Response(
        JSON.stringify({
          swarm: { id: 'swm_789', status: 'RUNNING' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/cancel')) {
      return new Response(
        JSON.stringify({
          swarm: { id: 'swm_789', status: 'CANCELLED' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/simulate')) {
      return new Response(
        JSON.stringify({
          estimated_cost: '2500000',
          estimated_latency_ms: 1200,
          task_count: 5,
          max_depth: 3,
          is_valid_dag: true,
          risk_score: {
            overall_score: 15,
            risk_level: 'LOW',
            budget_exhaustion_risk: 10,
            dependency_bottleneck_risk: 15,
            agent_reliability_risk: 12,
            data_tampering_risk: 5,
            recommendations: ['DAG is acyclic and within bounds'],
            evaluated_at: new Date().toISOString(),
          },
          tasks: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/tasks')) {
      return new Response(
        JSON.stringify({
          tasks: [
            { id: 'task_1', title: 'Research task', status: 'COMPLETED', depth: 0 },
            { id: 'task_2', title: 'Data aggregation', status: 'IN_PROGRESS', depth: 1 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/graph')) {
      return new Response(
        JSON.stringify({
          graph: {
            nodes: [{ id: 'task_1', type: 'TASK', label: 'Research' }],
            edges: [],
            depth: 2,
            is_dag: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/trace')) {
      return new Response(
        JSON.stringify({
          trace: {
            swarm_id: 'swm_789',
            events: [{ event_type: 'swarm.created', timestamp: new Date().toISOString() }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/risk')) {
      return new Response(
        JSON.stringify({
          risk_score: {
            overall_score: 20,
            risk_level: 'LOW',
            recommendations: ['All policy checks passed'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (capturedUrl.endsWith('/v1/swarms/swm_789/replan')) {
      return new Response(
        JSON.stringify({
          proposal: {
            mission_id: 'swm_789',
            strategy: 'TRY_ALTERNATIVE_SERVICE',
            confidence: 'HIGH',
            requires_human: false,
            estimated_cost: '350000',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not Found', { status: 404 });
  };

  const client = new AgentPay({ fetch: mockFetch });

  // 1. Create Swarm
  const swarm = await client.swarms.create({
    name: 'Market Intelligence Swarm',
    objective: 'Analyze AI infrastructure',
    max_budget: '5000000',
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/swarms');
  assert.equal(capturedMethod, 'POST');
  assert.equal(swarm.id, 'swm_789');

  // 2. Get Swarm
  const fetched = await client.swarms.get('swm_789');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/swarms/swm_789');
  assert.equal(fetched.id, 'swm_789');

  // 3. Start Swarm
  const started = await client.swarms.start('swm_789');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/swarms/swm_789/start');
  assert.equal(started.status, 'RUNNING');

  // 4. Simulate
  const sim = await client.swarms.simulate({
    name: 'Simulated Swarm',
    objective: 'Simulate workflow',
    max_budget: '3000000',
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/swarms/simulate');
  assert.equal(sim.is_valid_dag, true);

  // 5. Tasks
  const tasks = await client.swarms.tasks('swm_789');
  assert.equal(tasks.length, 2);

  // 6. Graph
  const g = await client.swarms.graph('swm_789');
  assert.equal(g.is_dag, true);

  // 7. Trace
  const t = await client.swarms.trace('swm_789');
  assert.equal(t.swarm_id, 'swm_789');

  // 8. Risk
  const r = await client.swarms.risk('swm_789');
  assert.equal(r.risk_level, 'LOW');

  // 9. Replan
  const rep = await client.swarms.replan('swm_789');
  assert.equal(rep.strategy, 'TRY_ALTERNATIVE_SERVICE');

  // 10. Cancel
  const cancelled = await client.swarms.cancel('swm_789');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/swarms/swm_789/cancel');
  assert.equal(cancelled.status, 'CANCELLED');
});

test('AgentPay SDK — Economic Simulator & Digital Twin Suite (Phases 0-33)', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = typeof input === 'string' ? input : (input as Request).url;
    capturedMethod = init?.method ?? 'GET';
    capturedBody = typeof init?.body === 'string' ? init.body : '';

    if (capturedUrl.includes('/v1/simulations/sim_abc/execute-plan')) {
      return new Response(
        JSON.stringify({
          status: 'PLAN_VERIFIED_AND_PREPARED',
          mode: 'LIVE',
          revalidated: true,
          payload: {
            plan_id: 'live-plan-sim_abc',
            original_run_id: 'sim_abc',
            organization_id: 'org_test',
            objective: 'Test execution',
            fresh_budget: '5000000',
            revalidated_steps: [],
            total_live_cost: '1200000',
            max_live_exposure: '5000000',
            policy_decision: 'ALLOW',
            projected_risk: 15,
            requires_approval: false,
            mode: 'LIVE',
            prepared_at: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/simulations/sim_abc/counterfactual')) {
      return new Response(
        JSON.stringify({
          comparison: {
            baseline_run_id: 'sim_abc',
            counterfactual_run_id: 'sim_cf_1',
            perturbation_description: '2x Price Surge',
            baseline_spend: '1200000',
            counterfactual_spend: '2400000',
            delta_spend: '+1.20',
            baseline_approvals: 0,
            counterfactual_approvals: 1,
            delta_approvals: 1,
            baseline_duration_ms: 500,
            counterfactual_duration_ms: 520,
            baseline_completion: 'COMPLETED',
            counterfactual_completion: 'COMPLETED',
            risk_change: 'INCREASED (+10 pts)',
            explanation: 'Doubling service costs increased spend by $1.20',
          },
          counterfactual_run: { id: 'sim_cf_1', status: 'COMPLETED' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/simulations/monte-carlo')) {
      return new Response(
        JSON.stringify({
          run_count: 50,
          completion_rate: 0.98,
          average_spend: '1.25',
          minimum_spend: '1.10',
          maximum_spend: '1.50',
          p50_spend: '1.22',
          p90_spend: '1.40',
          p95_spend: '1.48',
          avg_duration_ms: 450,
          currency: 'USDC',
          model_notice: 'MODELLED ESTIMATE',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        id: 'sim_abc',
        organization_id: 'org_test',
        created_by: 'research-agent',
        source_type: 'MISSION',
        scenario_id: 'scen_1',
        status: 'COMPLETED',
        seed: 1337,
        execution_mode: 'SIMULATION',
        created_at: new Date().toISOString(),
        duration_ms: 450,
        summary: 'Simulation completed successfully',
        configuration_version: 'v1.0.0',
        scenario: { name: 'AI Mission', budget: '5000000' },
        economics: {
          projected_spend: '1200000',
          minimum_spend: '1000000',
          maximum_spend: '1500000',
          expected_spend: '1200000',
          remaining_budget: '3800000',
          number_of_payments: 3,
          number_of_agents: 3,
          number_of_services: 3,
          approval_count: 0,
          risk_score: 15,
          currency: 'USDC',
          is_projected: true,
        },
        exposure: {
          maximum_exposure: '5000000',
          budget_ceiling: '5000000',
          per_transaction_limit: '2000000',
          total_steps_planned: 3,
          exposure_formula: 'sum(step_ceilings)',
          explanation: 'Conservative exposure bounds',
        },
        plan: { total_steps: 3, estimated_cost: '1200000', estimated_duration_ms: 450, max_depth: 2, steps: [] },
        trace: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const client = new AgentPay({ fetch: mockFetch });

  // 1. Create Scenario Simulation
  const created = await client.simulations.create({
    name: 'Autonomous Research Mission',
    budget: '5000000',
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations');
  assert.equal((created as any).execution_mode, 'SIMULATION');

  // 2. Run
  const run = await client.simulations.run('sim_abc');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations/sim_abc/run');
  assert.equal(run.status, 'COMPLETED');

  // 3. Counterfactual
  const cf = await client.simulations.counterfactual('sim_abc', { price_multiplier: 2.0 }, '2x Price Surge');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations/sim_abc/counterfactual');
  assert.equal(cf.comparison.delta_spend, '+1.20');

  // 4. Monte Carlo
  const mc = await client.simulations.monteCarlo({
    scenario: { name: 'Monte Carlo Test', budget: '5000000' },
    iterations: 50,
  });
  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations/monte-carlo');
  assert.equal(mc.run_count, 50);

  // 5. Execute Plan
  const exec = await client.simulations.executePlan('sim_abc');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/simulations/sim_abc/execute-plan');
  assert.equal(exec.mode, 'LIVE');
  assert.equal(exec.revalidated, true);
});

test('AgentPay SDK — Open Agent Network (Discovery, Contracts & Settlement)', async () => {
  let capturedUrl = '';
  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();

    if (capturedUrl.includes('/v1/agent-network/agents/register')) {
      return new Response(JSON.stringify({
        agent_id: 'agent_auditor_01',
        display_name: 'Sentinel Auditor',
        protocol_version: 'agentpay.network.v1',
        status: 'ACTIVE',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    if (capturedUrl.includes('/v1/agent-network/agents')) {
      return new Response(JSON.stringify({
        agents: [{
          identity: { agent_id: 'agent_auditor_01', display_name: 'Sentinel Auditor', status: 'ACTIVE' },
          trust_evaluation: { trust_score: 9500, confidence: 0.98 },
        }],
        count: 1,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (capturedUrl.includes('/v1/agent-network/contracts/c_123/fund')) {
      return new Response(JSON.stringify({
        contract_id: 'c_123',
        status: 'FUNDED',
        payment_intent_id: 'intent_funded_99',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (capturedUrl.includes('/v1/agent-network/graph')) {
      return new Response(JSON.stringify({
        nodes: [{ id: 'agent_auditor_01', type: 'AGENT', label: 'Sentinel Auditor' }],
        edges: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const client = new AgentPay({ fetch: mockFetch });

  // 1. Register
  const registered = await client.agentNetwork.register({
    protocol_version: 'agentpay.network.v1',
    agent_id: 'agent_auditor_01',
    organization_id: 'org_default',
    name: 'Sentinel Auditor',
    description: 'Security auditing',
    version: '1.0.0',
    capabilities: ['security.audit@1.0'],
    pricing: [{ capability: 'security.audit@1.0', model: 'FIXED', base_price: '500000', currency: 'USDC' }],
    settlement: ['ARC_USDC'],
    endpoints: { task_url: 'https://auditor.example.com/task' },
  });
  assert.equal(registered.agent_id, 'agent_auditor_01');
  assert.equal(registered.status, 'ACTIVE');

  // 2. Discover
  const list = await client.agentNetwork.list({ capability: 'security.audit@1.0' });
  assert.equal(list.count, 1);
  assert.equal(list.agents[0].identity.agent_id, 'agent_auditor_01');
  assert.equal(list.agents[0].trust_evaluation.trust_score, 9500);

  // 3. Fund Contract
  const funded = await client.agentNetwork.fundContract('c_123');
  assert.equal(funded.contract_id, 'c_123');
  assert.equal(funded.status, 'FUNDED');
  assert.equal(funded.payment_intent_id, 'intent_funded_99');

  // 4. Graph
  const graph = await client.agentNetwork.getGraph();
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0].id, 'agent_auditor_01');
});

test('AgentPay SDK — Economic Constitution Resource', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';

    if (capturedUrl.includes('/v1/constitutions/active')) {
      return new Response(
        JSON.stringify({
          constitution: {
            constitution_id: 'const_org_01',
            organization_id: 'org_01',
            version: 1,
            status: 'ACTIVE',
            policy_hash: 'hash_abc',
            rules: [],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/constitutions/evaluate')) {
      return new Response(
        JSON.stringify({
          decision: {
            constitution_id: 'const_org_01',
            version: 1,
            decision: 'ALLOW',
            reason_code: 'APPROVED',
            explanation: 'Conforms to constitutional limits',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const client = new AgentPay({ apiKey: 'ap_test_123', fetch: mockFetch });

  // 1. Get Active
  const active = await client.constitutions.getActive();
  assert.equal(active.constitution.constitution_id, 'const_org_01');
  assert.equal(active.constitution.version, 1);
  assert.equal(capturedUrl, 'http://localhost:8080/v1/constitutions/active');

  // 2. Evaluate
  const evaluated = await client.constitutions.evaluate({
    amount: '1000000',
    currency: 'USDC',
  });
  assert.equal(evaluated.decision.decision, 'ALLOW');
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/constitutions/evaluate');
});

test('AgentPay SDK — Autonomous Economic Clearinghouse Resource (Task 10)', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';

    if (capturedUrl.includes('/v1/economy/obligations')) {
      if (capturedMethod === 'POST') {
        return new Response(
          JSON.stringify({
            obligation_id: 'ob_sdk_01',
            payer_agent_id: 'agent_a',
            payee_agent_id: 'agent_b',
            amount: '30000000',
            currency: 'USDC',
            status: 'AUTHORIZED',
            execution_mode: 'REAL',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify([{ obligation_id: 'ob_sdk_01' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (capturedUrl.includes('/v1/economy/milestones') && capturedUrl.includes('/verify')) {
      return new Response(
        JSON.stringify({
          outcome: 'VERIFIED',
          reason: 'Cryptographic deliverable checksum verified.',
          verified_hash: '0xhash123',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/economy/exposure')) {
      return new Response(
        JSON.stringify({
          organization_id: 'org_test',
          current_exposure: '30000000',
          max_possible_exposure: '50000000',
          counterparties: [],
          execution_mode: 'REAL',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/economy/health')) {
      return new Response(
        JSON.stringify({
          organization_id: 'org_test',
          on_chain_available: '100000000',
          health_status: 'HEALTHY',
          solvency_ratio: 3.33,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new AgentPay({ apiKey: 'ap_test_clearing', fetch: mockFetch });

  // 1. Client properties
  assert.ok(client.clearinghouse);
  assert.ok(client.economy);
  assert.equal(client.clearinghouse, client.economy);

  // 2. Create obligation
  const ob = await client.economy.createObligation({
    payer_agent_id: 'agent_a',
    payee_agent_id: 'agent_b',
    amount: '30000000',
    currency: 'USDC',
  });
  assert.equal(ob.obligation_id, 'ob_sdk_01');
  assert.equal(ob.status, 'AUTHORIZED');
  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://localhost:8080/v1/economy/obligations');

  // 3. Verify milestone
  const vRes = await client.economy.verifyMilestone('ms_100');
  assert.equal(vRes.outcome, 'VERIFIED');
  assert.ok(capturedUrl.includes('/v1/economy/milestones/ms_100/verify'));

  // 4. Get Exposure
  const exp = await client.economy.getExposure('org_test', 'REAL');
  assert.equal(exp.current_exposure, '30000000');
  assert.ok(capturedUrl.includes('/v1/economy/exposure?org_id=org_test&mode=REAL'));

  // 5. Get Health
  const health = await client.economy.getHealth('org_test', 'REAL', '100000000');
  assert.equal(health.health_status, 'HEALTHY');
  assert.ok(capturedUrl.includes('/v1/economy/health?org_id=org_test&mode=REAL&balance=100000000'));
});

test('AgentPay SDK — Autonomous Treasury & Liquidity Orchestrator Resource (Task 11)', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';

    // Route mocks
    if (capturedUrl.includes('/v1/treasury/state')) {
      return new Response(
        JSON.stringify({
          treasury_id: 'tr_test_01',
          organization_id: 'org_test',
          vault_address: '0x3600000000000000000000000000000000000001',
          currency: 'USDC',
          mode: 'REAL',
          total_balance: '1000000000',
          available_balance: '800000000',
          reserved_balance: '100000000',
          committed_balance: '50000000',
          pending_settlement: '0',
          disputed_balance: '0',
          minimum_buffer: '50000000',
          maximum_exposure: '500000000',
          operational_mode: 'NORMAL',
          source_version: 1,
          updated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/balance')) {
      return new Response(
        JSON.stringify({
          organization_id: 'org_test',
          vault_address: '0x3600000000000000000000000000000000000001',
          on_chain_balance: '1000000000',
          reserved_amount: '100000000',
          available_amount: '900000000',
          asset: 'USDC',
          decimals: 6,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/release')) {
      return new Response(
        JSON.stringify({ status: 'RELEASED', reservation_id: 'res_test_01' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/reservations') && capturedMethod === 'POST') {
      return new Response(
        JSON.stringify({
          reservation_id: 'res_test_01',
          organization_id: 'org_test',
          source: 'MISSION',
          amount: '10000000',
          currency: 'USDC',
          mode: 'REAL',
          status: 'RESERVED',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/exposure')) {
      return new Response(
        JSON.stringify({
          scope: 'ORGANIZATION',
          scope_id: 'org_test',
          currency: 'USDC',
          total_funds: '1000000000',
          current_available: '800000000',
          reserved_funds: '100000000',
          committed_funds: '50000000',
          potential_exposure: '150000000',
          minimum_buffer: '50000000',
          current_capacity: '800000000',
          safe_commitment_capacity: '700000000',
          calculated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/forecast')) {
      return new Response(
        JSON.stringify({
          forecast_id: 'fc_test_01',
          organization_id: 'org_test',
          horizon: '24h',
          scenario: 'BASELINE',
          current_balance: '800000000',
          points: [
            {
              timestamp: new Date().toISOString(),
              available_liquidity: '800000000',
              committed_liquidity: '50000000',
              expected_outflow: '5000000',
              expected_inflow: '0',
              buffer: '50000000',
              safe_capacity: '700000000',
            },
          ],
          confidence: 0.95,
          assumptions: ['Deterministic limits enforced'],
          sample_size: 1420,
          generated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/stress')) {
      return new Response(
        JSON.stringify({
          scenario_name: 'SETTLEMENT_CLUSTER',
          starting_liquidity: '800000000',
          total_projected_outflow: '150000000',
          minimum_resulting_liquidity: '650000000',
          buffer_breached: false,
          emergency_buffer_breached: false,
          worst_case_exposure: '950000000',
          survival_state: 'SAFE',
          recommended_actions: ['Adequate capital available'],
          simulated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/reconciliation')) {
      return new Response(
        JSON.stringify({
          report_id: 'rec_test_01',
          organization_id: 'org_test',
          status: 'MATCHED',
          internal_ledger_balance: '1000000000',
          repository_balance: '100000000',
          vault_balance: '1000000000',
          blockchain_balance: '1000000000',
          discrepancy_amount: '0',
          chain_id: '5042011',
          vault_address: '0x3600000000000000000000000000000000000001',
          token_address: '0x3600000000000000000000000000000000000002',
          vault_paused: false,
          vault_owner: '0x0000000000000000000000000000000000000000',
          verified_at: new Date().toISOString(),
          evidence: 'Verified against Arc',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/treasury/health')) {
      return new Response(
        JSON.stringify({
          organization_id: 'org_test',
          mode: 'REAL',
          total_balance: '1000000000',
          available_balance: '800000000',
          reserved_balance: '100000000',
          committed_balance: '50000000',
          pending_settlement: '0',
          disputed_balance: '0',
          minimum_buffer: '50000000',
          safe_capacity: '700000000',
          worst_case_exposure: '150000000',
          solvency_ratio: 6.67,
          operational_mode: 'NORMAL',
          reconciliation_status: 'MATCHED',
          last_verified_on_chain_balance: '1000000000',
          verification_timestamp: new Date().toISOString(),
          active_reservations_count: 1,
          active_anomalies_count: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };

  const client = new AgentPay({ apiKey: 'ap_test_treasury', fetch: mockFetch });

  // 1. Verify client.treasury exists
  assert.ok(client.treasury);
  assert.ok(client.treasury.reservations);

  // 2. Fetch State
  const state = await client.treasury.state({ orgId: 'org_test', mode: 'REAL' });
  assert.equal(state.treasury_id, 'tr_test_01');
  assert.equal(state.operational_mode, 'NORMAL');
  assert.ok(capturedUrl.includes('/v1/treasury/state?organization_id=org_test&mode=REAL'));

  // 3. Fetch Balance
  const bal = await client.treasury.balance({ orgId: 'org_test' });
  assert.equal(bal.on_chain_balance, '1000000000');
  assert.equal(bal.available_amount, '900000000');

  // 4. Create and Release Reservation
  const res = await client.treasury.reservations.create({
    organization_id: 'org_test',
    source: 'MISSION',
    amount_base: '10000000',
    currency: 'USDC',
  });
  assert.equal(res.reservation_id, 'res_test_01');
  assert.equal(res.status, 'RESERVED');
  assert.equal(capturedMethod, 'POST');

  const rel = await client.treasury.reservations.release('res_test_01');
  assert.equal(rel.status, 'RELEASED');

  // 5. Exposure
  const exp = await client.treasury.exposure({ orgId: 'org_test' });
  assert.equal(exp.safe_commitment_capacity, '700000000');

  // 6. Forecast
  const fc = await client.treasury.forecast({ orgId: 'org_test', horizon: '24h', scenario: 'BASELINE' });
  assert.equal(fc.forecast_id, 'fc_test_01');
  assert.equal(fc.confidence, 0.95);

  // 7. Stress Testing
  const st = await client.treasury.stress({ scenario_name: 'SETTLEMENT_CLUSTER' });
  assert.equal(st.survival_state, 'SAFE');
  assert.equal(st.buffer_breached, false);

  // 8. Reconciliation
  const recon = await client.treasury.reconciliation({ orgId: 'org_test' });
  assert.equal(recon.status, 'MATCHED');

  // 9. Health
  const health = await client.treasury.health({ orgId: 'org_test' });
  assert.equal(health.operational_mode, 'NORMAL');
  assert.equal(health.solvency_ratio, 6.67);
});

test('AgentPay SDK — Task 12: Autonomous Economic Control Tower Surface', async () => {
  let capturedUrl = '';
  let capturedMethod = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';

    if (capturedUrl.includes('/v1/control/state')) {
      return new Response(
        JSON.stringify({
          treasury_status: 'HEALTHY',
          policy_version: 'v8 ACTIVE',
          risk_level: 'NORMAL',
          execution_mode: 'LIVE',
          arc_status: 'VERIFIED',
          last_updated: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/overview')) {
      return new Response(
        JSON.stringify({
          organization_id: 'org_test',
          execution_mode: 'REAL',
          active_missions_count: 3,
          active_agents_count: 12,
          active_contracts_count: 5,
          available_liquidity: '82500000000',
          reserved_liquidity: '25000000000',
          outstanding_obligations: '15000000000',
          pending_settlements: '5000000000',
          active_approvals_count: 1,
          current_policy_version: 'v8 ACTIVE',
          current_treasury_mode: 'NORMAL',
          security_status: 'NORMAL',
          arc_verified_balance: '125000000000',
          data_freshness: 'LIVE',
          state_strip: {
            treasury_status: 'HEALTHY',
            policy_version: 'v8 ACTIVE',
            risk_level: 'NORMAL',
            execution_mode: 'LIVE',
            arc_status: 'VERIFIED',
            last_updated: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/activity')) {
      return new Response(
        JSON.stringify({
          events: [
            {
              event_id: 'evt_01',
              type: 'treasury.reconciled',
              category: 'TREASURY',
              organization_id: 'org_test',
              aggregate_id: 'treasury_default',
              severity: 'SUCCESS',
              title: 'Reconciliation Verified',
              summary: 'Zero discrepancies',
              timestamp: new Date().toISOString(),
            },
          ],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/financial-trace/')) {
      return new Response(
        JSON.stringify({
          trace_id: 'trc_pi_live_01',
          organization_id: 'org_test',
          payment_intent_id: 'pi_live_01',
          policy_version: 'v8',
          policy_hash: '0x4f8a...',
          policy_decision: 'ALLOW',
          risk_score: 12,
          risk_level: 'LOW',
          payment_status: 'CONFIRMED',
          steps: [
            { step_number: 1, stage: 'MISSION', status: 'COMPLETED', reference_id: 'msn_01', description: 'Mission init', timestamp: new Date().toISOString() },
            { step_number: 13, stage: 'LEARNING', status: 'RECORDED', reference_id: 'obs_01', description: 'Learning complete', timestamp: new Date().toISOString() },
          ],
          created_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/missions/')) {
      return new Response(
        JSON.stringify({
          mission_id: 'msn_01',
          title: 'Macro Research',
          objective: 'Analyze orderbooks',
          status: 'EXECUTING',
          budget_total: '50000000',
          budget_reserved: '15000000',
          budget_settled: '10000000',
          budget_remaining: '25000000',
          potential_exposure: '15000000',
          current_action: {
            action: 'Waiting for verification',
            why: 'Task completed',
            evidence: 'Hash matched',
            next_possible_action: 'Settlement',
          },
          next_expected_action: 'RUNNING_VERIFICATION',
          policy_summary: {
            constitution_version: 'v8',
            policy_hash: '0x4f8a...',
            effective_rules: {},
            explainability_notes: 'Authority narrows downward',
          },
          selected_agents: [
            {
              agent_id: 'agent_analyst',
              display_name: 'Lead Analyst',
              capability: 'modeling',
              quoted_price: '10000000',
              selection_reason: 'Lowest latency',
              verification_rate: 0.994,
              risk_level: 'LOW',
              rejected_alternatives: [
                {
                  agent_id: 'agent_alt_1',
                  quoted_price: '15000000',
                  rejection_reason: 'Higher cost',
                  score_difference: '-14%',
                },
              ],
            },
          ],
          task_graph: { max_depth: 2, nodes: [], edges: [] },
          obligations: [],
          timeline: [],
          updated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/arc')) {
      return new Response(
        JSON.stringify({
          chain_id: '5042',
          rpc_url: 'https://rpc.arc.network',
          rpc_reachable: true,
          latest_block_number: 1492041,
          agent_vault_address: '0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852',
          agent_vault_deployed: true,
          agent_vault_paused: false,
          usdc_address: '0x0000...',
          verified_treasury_balance: '125000000000',
          live_execution_enabled: true,
          last_checked_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/control/search')) {
      return new Response(
        JSON.stringify({
          query: 'macro',
          results: [
            {
              type: 'MISSION',
              id: 'msn_01',
              title: 'Macro Research',
              subtitle: 'Executing',
              status: 'EXECUTING',
              deep_link_url: '/control/missions/msn_01',
            },
          ],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const client = new AgentPay({ fetch: mockFetch });

  // 1. State Strip
  const strip = await client.control.getStateStrip({ orgId: 'org_test', mode: 'REAL' });
  assert.equal(strip.treasury_status, 'HEALTHY');
  assert.equal(strip.policy_version, 'v8 ACTIVE');
  assert.equal(strip.arc_status, 'VERIFIED');
  assert.equal(capturedMethod, 'GET');

  // 2. Executive Overview
  const ov = await client.control.getOverview({ orgId: 'org_test' });
  assert.equal(ov.active_missions_count, 3);
  assert.equal(ov.data_freshness, 'LIVE');

  // 3. Activity Timeline
  const act = await client.control.getActivityTimeline({ orgId: 'org_test', category: 'TREASURY' });
  assert.equal(act.count, 1);
  assert.equal(act.events[0].category, 'TREASURY');

  // 4. Financial Trace
  const trace = await client.control.getFinancialTrace('pi_live_01', { orgId: 'org_test' });
  assert.equal(trace.payment_intent_id, 'pi_live_01');
  assert.equal(trace.steps.length, 2);

  // 5. Mission Command Center
  const mcc = await client.control.getMissionCommandCenter('msn_01', { orgId: 'org_test' });
  assert.equal(mcc.mission_id, 'msn_01');
  assert.equal(mcc.selected_agents[0].agent_id, 'agent_analyst');
  assert.equal(mcc.selected_agents[0].rejected_alternatives?.[0].agent_id, 'agent_alt_1');

  // 6. Arc Status
  const arc = await client.control.getArcStatus();
  assert.equal(arc.chain_id, '5042');
  assert.equal(arc.rpc_reachable, true);

  // 7. Search
  const srch = await client.control.search('macro', { orgId: 'org_test' });
  assert.equal(srch.count, 1);
  assert.equal(srch.results[0].type, 'MISSION');
});

test('AgentPay SDK — Autonomous Operations & Durable Runtime (Task 13)', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || 'GET';
    capturedBody = (init?.body as string) || '';

    if (capturedUrl.includes('/v1/runtime/workflows/wf_task13_001/pause')) {
      return new Response(
        JSON.stringify({
          workflow_id: 'wf_task13_001',
          state: 'PAUSED',
          version: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/runtime/workflows/wf_task13_001/resume')) {
      return new Response(
        JSON.stringify({
          workflow_id: 'wf_task13_001',
          state: 'RUNNING',
          version: 3,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.endsWith('/v1/runtime/workflows') && capturedMethod === 'POST') {
      return new Response(
        JSON.stringify({
          workflow_id: 'wf_task13_001',
          tenant_id: 'tenant_default',
          workflow_type: 'MISSION_EXECUTION',
          aggregate_type: 'MISSION',
          aggregate_id: 'msn_001',
          state: 'CREATED',
          version: 1,
          priority: 10,
          idempotency_key: 'idem_wf_001',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/runtime/workers')) {
      return new Response(
        JSON.stringify({
          workers: [
            {
              worker_id: 'worker_01',
              worker_type: 'STANDARD',
              hostname: 'worker-node-1',
              status: 'HEALTHY',
              version: '1.0.0',
              heartbeat_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/runtime/recovery')) {
      return new Response(
        JSON.stringify({
          recovery_steps: [
            {
              step_id: 'step_rec_01',
              workflow_id: 'wf_task13_001',
              state: 'RETRYABLE_FAILURE',
              attempt: 1,
            },
          ],
          count: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (capturedUrl.includes('/v1/runtime/metrics')) {
      return new Response(
        JSON.stringify({
          active_workflows: 5,
          waiting_workflows: 2,
          retry_rate_bps: 120,
          failure_rate_bps: 40,
          recovery_rate_bps: 9800,
          average_step_duration_ms: 350,
          lease_expirations_count: 1,
          stale_worker_count: 0,
          queue_depth: 3,
          deadline_violations_count: 0,
          reconciliation_queue_size: 0,
          ambiguous_operations: 0,
          worker_utilization_pct: 0.42,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new AgentPay({ apiKey: 'ap_live_test', fetch: mockFetch });

  // 1. Create Workflow
  const wf = await client.runtime.createWorkflow({
    workflow_type: 'MISSION_EXECUTION',
    aggregate_type: 'MISSION',
    aggregate_id: 'msn_001',
    idempotency_key: 'idem_wf_001',
    priority: 10,
  });
  assert.equal(wf.workflow_id, 'wf_task13_001');
  assert.equal(wf.state, 'CREATED');

  // 2. Pause Workflow
  const paused = await client.runtime.pauseWorkflow('wf_task13_001', 'Operator inspection');
  assert.equal(paused.state, 'PAUSED');

  // 3. Resume Workflow
  const resumed = await client.runtime.resumeWorkflow('wf_task13_001');
  assert.equal(resumed.state, 'RUNNING');

  // 4. List Workers
  const workers = await client.runtime.listWorkers();
  assert.equal(workers.count, 1);
  assert.equal(workers.workers[0].worker_id, 'worker_01');

  // 5. Recovery Queue
  const rec = await client.runtime.getRecoveryQueue();
  assert.equal(rec.count, 1);
  assert.equal(rec.recovery_steps[0].step_id, 'step_rec_01');

  // 6. Metrics
  const metrics = await client.runtime.getMetrics();
  assert.equal(metrics.active_workflows, 5);
  assert.equal(metrics.recovery_rate_bps, 9800);
});

test('AgentPay SDK — Task 14 Autonomous Operations OS API', async () => {
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();

    if (url.includes('/v1/operations/snapshot')) {
      return new Response(
        JSON.stringify({
          snapshot_id: 'snap_001',
          tenant_id: 'tenant_test',
          snapshot_version: 1,
          freshness: 'FRESH',
          active_workflows: 8,
          queued_workflows: 12,
          blocked_workflows: 0,
          failed_workflows: 0,
          recovering_workflows: 1,
          active_agents: 5,
          available_workers: 10,
          treasury_state: 'HEALTHY',
          liquidity_state: 'AVAILABLE',
          clearing_state: 'ACTIVE',
          security_state: 'HEALTHY',
          policy_state: 'ENFORCING',
          arc_state: 'NOT VERIFIED / NOT DEPLOYED',
          incident_count: 1,
          generated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/health')) {
      return new Response(
        JSON.stringify({
          overall_state: 'HEALTHY',
          components: {
            Database: { name: 'Database', state: 'HEALTHY', message: 'Responsive', last_probe_at: new Date().toISOString() },
            PolicyEngine: { name: 'PolicyEngine', state: 'HEALTHY', message: 'Responding', last_probe_at: new Date().toISOString() },
          },
          arc: {
            rpc_connected: true,
            vault_deployed: false,
            live_execution_enabled: false,
            recent_settlement_verified: false,
            status_text: 'NOT VERIFIED / NOT DEPLOYED',
            last_checked_at: new Date().toISOString(),
          },
          generated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/workers')) {
      return new Response(
        JSON.stringify({
          workers: [{ worker_id: 'worker_ops_1', worker_type: 'STANDARD', status: 'HEALTHY', last_seen: new Date().toISOString(), capabilities: ['MISSION'] }],
          total: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/queues')) {
      return new Response(
        JSON.stringify({
          queue_depths: { mission: 2, task: 5, recovery: 1 },
          dead_letters: [],
          total_dead: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/incidents') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          incident_id: 'inc_test_1',
          action: 'RESTART_WORKER',
          status: 'MITIGATING',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/incidents')) {
      return new Response(
        JSON.stringify({
          incidents: [
            {
              incident_id: 'inc_test_1',
              tenant_id: 'tenant_test',
              severity: 'MEDIUM',
              category: 'WORKER_TIMEOUT',
              state: 'DETECTED',
              detected_at: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/replay/')) {
      return new Response(
        JSON.stringify({
          workflow_id: 'wf_test_1',
          tenant_id: 'tenant_test',
          total_steps: 2,
          final_state: 'COMPLETED',
          entries: [
            { sequence: 1, step_id: 's1', step_type: 'RESEARCH', state: 'SUCCEEDED', timestamp: new Date().toISOString(), financial_barrier_ok: true },
          ],
          replayed_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/graph')) {
      return new Response(
        JSON.stringify({
          nodes: [{ id: 'wf_1', type: 'WORKFLOW', label: 'Workflow 1', state: 'RUNNING', age_seconds: 120 }],
          edges: [],
          generated_at: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/why/')) {
      return new Response(
        JSON.stringify({
          current_state: 'BLOCKED',
          trigger: 'approval_expired',
          evidence: 'Approval timed out after 300s',
          decision: 'ESCALATE',
          next_action: 'Request fresh human approval',
          financial_authority: 'UNCHANGED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/v1/operations/next/')) {
      return new Response(
        JSON.stringify({
          action: 'RUN',
          reason: 'Dependencies ready',
          estimated_delay_seconds: 2,
          requires_human: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new AgentPay({ apiKey: 'ap_ops_test', fetch: mockFetch });

  // 1. Snapshot
  const snap = await client.operations.getOperationsSnapshot();
  assert.equal(snap.snapshot_id, 'snap_001');
  assert.equal(snap.freshness, 'FRESH');
  assert.equal(snap.active_workflows, 8);

  // 2. Health & Arc truth
  const health = await client.operations.getOperationsHealth();
  assert.equal(health.overall_state, 'HEALTHY');
  assert.equal(health.arc.status_text, 'NOT VERIFIED / NOT DEPLOYED');

  // 3. Workers
  const workers = await client.operations.getWorkers();
  assert.equal(workers.total, 1);
  assert.equal(workers.workers[0].worker_id, 'worker_ops_1');

  // 4. Queues
  const qData = await client.operations.getQueues();
  assert.equal(qData.queue_depths.task, 5);

  // 5. Incidents & Mitigation
  const incs = await client.operations.getIncidents();
  assert.equal(incs.total, 1);
  const mit = await client.operations.mitigateIncident('inc_test_1', 'RESTART_WORKER');
  assert.equal(mit.status, 'MITIGATING');

  // 6. Replay
  const replay = await client.operations.getWorkflowReplay('wf_test_1');
  assert.equal(replay.workflow_id, 'wf_test_1');
  assert.equal(replay.total_steps, 2);

  // 7. Graph
  const graph = await client.operations.getOperationalGraph();
  assert.equal(graph.nodes.length, 1);

  // 8. Why Inspector
  const why = await client.operations.explainEvent('evt_123');
  assert.equal(why.decision, 'ESCALATE');
  assert.equal(why.financial_authority, 'UNCHANGED');

  // 9. Next Action
  const next = await client.operations.getNextAction('wf_test_1');
  assert.equal(next.action, 'RUN');
});







