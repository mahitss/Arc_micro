// End-to-End API Probe Script for AgentPay Gateway (port 8080)
import http from 'http';

const AUTH_HEADER = 'Bearer apk_live_demo1234567890abcdef1234567890abcdef';

const endpoints = [
  // Health & Readiness
  { method: 'GET', path: '/health', auth: false },
  { method: 'GET', path: '/ready', auth: false },
  { method: 'GET', path: '/metrics', auth: false },

  // Control Tower
  { method: 'GET', path: '/v1/control/overview', auth: true },
  { method: 'GET', path: '/v1/control/state', auth: true },
  { method: 'GET', path: '/v1/control/activity', auth: true },

  // AI Layer
  { method: 'GET', path: '/control/ai/health', auth: true },
  { method: 'GET', path: '/control/ai/telemetry', auth: true },
  { method: 'GET', path: '/control/ai/models', auth: true },

  // Missions & Replay
  { method: 'GET', path: '/v1/missions', auth: true },
  { method: 'GET', path: '/api/demo/mission', auth: true },
  { method: 'GET', path: '/api/demo/mission/events', auth: true },
  { method: 'GET', path: '/api/demo/mission/trace', auth: true },

  // Treasury
  { method: 'GET', path: '/v1/treasury/summary', auth: true },
  { method: 'GET', path: '/v1/treasury/balance', auth: true },
  { method: 'GET', path: '/v1/treasury/reservations', auth: true },
  { method: 'GET', path: '/v1/treasury/health', auth: true },

  // Clearinghouse
  { method: 'GET', path: '/v1/economy/obligations', auth: true },
  { method: 'GET', path: '/v1/economy/invoices', auth: true },
  { method: 'GET', path: '/v1/economy/escrows', auth: true },
  { method: 'GET', path: '/v1/economy/health', auth: true },

  // Marketplace & Protocol
  { method: 'GET', path: '/api/marketplace/listings', auth: true },
  { method: 'GET', path: '/api/marketplace/health', auth: true },
  { method: 'GET', path: '/protocol/v1/agents', auth: true },
  { method: 'GET', path: '/protocol/v1/capabilities', auth: true },
  { method: 'GET', path: '/protocol/v1/traffic', auth: true },
  { method: 'GET', path: '/protocol/v1/snapshot', auth: true },

  // Runtime & Operations
  { method: 'GET', path: '/v1/runtime/workers', auth: true },
  { method: 'GET', path: '/v1/runtime/queues', auth: true },
  { method: 'GET', path: '/v1/operations', auth: true },
  { method: 'GET', path: '/v1/operations/health', auth: true },

  // Security & Emergency
  { method: 'GET', path: '/v1/system/status', auth: true },
  { method: 'GET', path: '/v1/security-lab/report', auth: true }
];

async function probeEndpoint(ep) {
  return new Promise((resolve) => {
    const start = Date.now();
    const headers = { 'Content-Type': 'application/json' };
    if (ep.auth) {
      headers['Authorization'] = AUTH_HEADER;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 8080,
        path: ep.path,
        method: ep.method,
        headers,
        timeout: 4000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            endpoint: `${ep.method} ${ep.path}`,
            statusCode: res.statusCode,
            latencyMs: Date.now() - start,
            bodyBytes: body.length,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        endpoint: `${ep.method} ${ep.path}`,
        statusCode: 0,
        latencyMs: Date.now() - start,
        error: err.message,
        success: false
      });
    });

    req.end();
  });
}

async function run() {
  console.log('--- Probing AgentPay Gateway API Endpoints (port 8080) ---');
  let successCount = 0;
  let failCount = 0;

  for (const ep of endpoints) {
    const res = await probeEndpoint(ep);
    const statusStr = res.success ? `PASS [${res.statusCode}]` : `FAIL [${res.statusCode || 'ERR'}]`;
    console.log(`${statusStr.padEnd(12)} ${res.endpoint.padEnd(35)} (${res.latencyMs}ms, ${res.bodyBytes || 0} bytes)`);
    if (res.success) successCount++;
    else failCount++;
  }

  console.log(`\nResults: ${successCount} PASSED, ${failCount} FAILED out of ${endpoints.length} endpoints`);
}

run();
