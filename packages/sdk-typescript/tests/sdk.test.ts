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



