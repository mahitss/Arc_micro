import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import { getConfig, maskApiKey, setConfigKey } from '../src/config.js';
import { formatUsdc } from '../src/output.js';

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
