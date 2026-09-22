import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { getConfig, maskApiKey, setConfigKey } from '../src/config.js';
import { formatUsdc, printPaymentTrace } from '../src/output.js';

test('AgentPay CLI Config — Set and Get API Key', () => {
  const originalConfig = getConfig();

  // Test set key
  setConfigKey('api-key', 'ap_live_test_cli_key_123456');
  const updated = getConfig();
  assert.equal(updated.apiKey, 'ap_live_test_cli_key_123456');

  // Test set base url
  setConfigKey('base-url', 'http://127.0.0.1:9090');
  const withUrl = getConfig();
  assert.equal(withUrl.baseUrl, 'http://127.0.0.1:9090');

  // Test mask
  assert.equal(maskApiKey('ap_live_test_cli_key_123456'), 'ap_liv...3456');
  assert.equal(maskApiKey(undefined), '(not set)');
  assert.equal(maskApiKey('123'), '****');

  // Restore
  if (originalConfig.apiKey) {
    setConfigKey('api-key', originalConfig.apiKey);
  }
  if (originalConfig.baseUrl) {
    setConfigKey('base-url', originalConfig.baseUrl);
  }
});

test('AgentPay CLI Output — USDC Amount Formatting', () => {
  assert.equal(formatUsdc('2500000'), '2.50 USDC');
  assert.equal(formatUsdc('1000000'), '1.00 USDC');
  assert.equal(formatUsdc('500000'), '0.50 USDC');
  assert.equal(formatUsdc('0'), '0.00 USDC');
});

test('AgentPay CLI Output — Payment Trace Formatter', () => {
  const mockTrace = {
    trace_id: 'trc_pi_test_01',
    organization_id: 'org_test',
    agent_id: 'agent_test',
    payment_intent_id: 'pi_test_01',
    status: 'CONFIRMED',
    execution_mode: 'SIMULATION',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payment_summary: {
      intent_id: 'pi_test_01',
      organization_id: 'org_test',
      agent_id: 'agent_test',
      service_id: 'web-research',
      recipient: '0x1234567890123456789012345678901234567890',
      amount: '180000',
      asset: 'USDC',
      purpose: 'CLI unit test',
      request_id: 'req_idem_cli_01',
    },
    policy_evidence: {
      decision: 'ALLOW',
      reason_code: 'POLICY_PERMITTED',
      risk_level: 'LOW',
      evaluated_at: new Date().toISOString(),
    },
    steps: [
      {
        step_number: 1,
        step_id: 'st_1',
        trace_id: 'trc_pi_test_01',
        type: 'PAYMENT_REQUESTED',
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        actor: 'AGENT:agent_test',
      },
    ],
  };

  // Ensure calling printPaymentTrace does not throw
  assert.doesNotThrow(() => {
    printPaymentTrace(mockTrace);
  });
});

