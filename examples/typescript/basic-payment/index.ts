/**
 * AgentPay — TypeScript Quickstart: Basic Programmable Payment
 *
 * EXECUTION MODES:
 * - SIMULATION: Uses mock/local gateway. Zero real USDC. No Arc settlement.
 * - LIVE ARC MAINNET: Connects to production gateway. Real Arc USDC settlement
 *   governed by AgentVault smart contract and enterprise policy engine.
 *
 * Requirements:
 * - Set AGENTPAY_API_KEY in environment (e.g. ap_live_...)
 * - Optionally set AGENTPAY_BASE_URL (defaults to http://localhost:8080)
 */

import {
  AgentPay,
  AgentPayError,
  ApprovalRequiredError,
  PolicyDeniedError,
  verifyWebhookSignature,
} from '@agentpay/sdk';

async function run(): Promise<void> {
  const apiKey = process.env.AGENTPAY_API_KEY;
  const baseUrl = process.env.AGENTPAY_BASE_URL || 'http://localhost:8080';

  console.log('══════════════════════════════════════════════════════════════════');
  console.log(' AgentPay Developer Platform — TypeScript Basic Payment Flow');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`Endpoint:   ${baseUrl}`);
  console.log(`API Key:    ${apiKey ? apiKey.slice(0, 8) + '...' : '(unset — using environment/default)'}`);

  // 1. Initialize AgentPay Client
  const client = new AgentPay({ apiKey, baseUrl });

  try {
    // 2. Discover Approved Services (Service Marketplace)
    console.log('\n[1/6] Discovering approved services...');
    const services = await client.services.list({ enabled: true });
    if (services.length === 0) {
      console.log('No services registered on gateway. Exiting.');
      return;
    }

    const selectedService = services[0];
    console.log(`  Found service: ${selectedService.name} (ID: ${selectedService.id})`);
    console.log(`  Resolved Recipient: ${selectedService.recipient}`);

    // 3. Request Price Quote
    console.log('\n[2/6] Requesting time-bound price quote...');
    const quote = await client.services.getQuote(selectedService.id, {
      amount: selectedService.fixed_price || '180000',
      asset: 'USDC',
    });
    console.log(`  Quote ID:  ${quote.quote_id}`);
    console.log(`  Amount:    ${quote.amount} micro-USDC (${(Number(quote.amount) / 1e6).toFixed(2)} USDC)`);
    console.log(`  Expires:   ${quote.expires_at}`);

    // 4. Create Programmable Payment Intent
    // Note: NEVER pass private keys, raw signing credentials, or arbitrary recipient addresses.
    // AgentPay securely resolves recipients from registered catalog and evaluates policies.
    console.log('\n[3/6] Requesting programmable payment...');
    const idempotencyKey = `idem_ts_quickstart_${Date.now()}`;
    const payment = await client.payments.create(
      {
        agentId: 'agent_default',
        serviceId: selectedService.id,
        quoteId: quote.quote_id,
        amount: quote.amount,
        asset: 'USDC',
        purpose: 'Automated research procurement via AgentPay TS SDK',
      },
      { idempotencyKey }
    );

    console.log(`  Payment ID:     ${payment.id}`);
    console.log(`  Initial Status: ${payment.status}`);

    // 5. Check Status or Poll for Completion
    console.log('\n[4/6] Observing payment status...');
    const detail = await client.payments.get(payment.id);
    console.log(`  Current Status: ${detail.intent.status}`);
    if (detail.transaction_hash) {
      console.log(`  Arc Tx Hash:    ${detail.transaction_hash}`);
    }

    // 6. Inspect Flight Recorder Trace
    console.log('\n[5/6] Inspecting Financial Flight Recorder trace...');
    const trace = await client.payments.trace(payment.id);
    console.log(`  Trace ID:       ${trace.trace_id}`);
    console.log(`  Execution Mode: ${trace.execution_mode}`);
    console.log(`  Trail Steps:    ${trace.steps?.length || 0} recorded steps`);
    for (const step of trace.steps || []) {
      console.log(`    [#${step.step_number}] ${step.type.padEnd(22)} ${step.status} (${step.actor})`);
    }

    // 7. Verify Webhook Signature (Simulation of incoming delivery)
    console.log('\n[6/6] Verifying Webhook HMAC-SHA256 signature helper...');
    const mockSecret = 'whsec_demo_secret_key_1234567890abcdef';
    const mockPayload = JSON.stringify({ id: 'evt_sample', type: 'payment_intent.authorized' });
    const now = Math.floor(Date.now() / 1000);

    // Compute sample header for demonstration
    const { createHmac } = await import('node:crypto');
    const sig = createHmac('sha256', mockSecret).update(`${now}.${mockPayload}`).digest('hex');
    const sampleHeader = `t=${now},v1=${sig}`;

    const isValid = verifyWebhookSignature(mockPayload, sampleHeader, mockSecret);
    console.log(`  Webhook Verified: ${isValid ? 'VALID (HMAC-SHA256 authenticated)' : 'INVALID'}`);

    console.log('\n✔ Developer quickstart payment flow completed successfully!');
  } catch (err: unknown) {
    if (err instanceof PolicyDeniedError) {
      console.error(`\n✖ Payment Policy Denied: ${err.message} (Reason: ${err.reason})`);
    } else if (err instanceof ApprovalRequiredError) {
      console.log(`\n⏸ Approval Required: Payment requires manual human review: ${err.message}`);
    } else if (err instanceof AgentPayError) {
      console.error(`\n✖ AgentPay Error [${err.code}] (Status ${err.statusCode}): ${err.message}`);
    } else {
      console.error('\n✖ Unexpected error:', err);
    }
  }
}

run();
