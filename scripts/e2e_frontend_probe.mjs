// Frontend Route Probe for Next.js Web App (port 3000)
import http from 'http';

const routes = [
  '/control',
  '/missions',
  '/missions/demo/replay',
  '/activity',
  '/marketplace',
  '/network',
  '/economy',
  '/treasury',
  '/simulator',
  '/security',
  '/arc',
  '/control/objectives',
  '/protocol',
  '/runtime',
  '/operations',
  '/incidents',
  '/intelligence',
  '/control/protocol',
  '/control/security'
];

async function probeRoute(route) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: route,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 10000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const hasHtml = body.includes('<!DOCTYPE html>') || body.includes('<html');
          const hasError500 = body.includes('Internal Server Error') || res.statusCode === 500;
          resolve({
            route,
            statusCode: res.statusCode,
            latencyMs: Date.now() - start,
            bytes: body.length,
            hasHtml,
            hasError500,
            success: res.statusCode === 200 && !hasError500
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        route,
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
  console.log('--- Probing AgentPay Frontend UI Routes (http://localhost:3000) ---');
  let successCount = 0;
  let failCount = 0;

  for (const r of routes) {
    const res = await probeRoute(r);
    const statusStr = res.success ? `PASS [${res.statusCode}]` : `FAIL [${res.statusCode || 'ERR'}]`;
    console.log(`${statusStr.padEnd(12)} ${r.padEnd(30)} (${res.latencyMs}ms, ${res.bytes || 0} bytes)`);
    if (res.success) successCount++;
    else failCount++;
  }

  console.log(`\nResults: ${successCount} PASSED, ${failCount} FAILED out of ${routes.length} routes`);
}

run();
