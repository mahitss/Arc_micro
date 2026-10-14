import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(webRoot, '../..');

describe('TASK 46 — Deployment Configuration & Security Validation', () => {

  it('verifies getBaseApiUrl resolves NEXT_PUBLIC_GATEWAY_URL in both client and server contexts', () => {
    const clientPath = path.join(webRoot, 'src/lib/api/client.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf8');

    // Must not restrict URL resolution to typeof window !== 'undefined'
    assert.ok(
      !clientContent.includes("if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GATEWAY_URL)"),
      'client.ts should not restrict NEXT_PUBLIC_GATEWAY_URL resolution to browser window context'
    );

    // Must check process.env for NEXT_PUBLIC_GATEWAY_URL or GATEWAY_URL
    assert.ok(
      clientContent.includes('process.env.NEXT_PUBLIC_GATEWAY_URL'),
      'client.ts must check process.env.NEXT_PUBLIC_GATEWAY_URL'
    );
    assert.ok(
      clientContent.includes('http://localhost:8080'),
      'client.ts must maintain local development fallback to http://localhost:8080'
    );
  });

  it('verifies next.config.mjs uses dynamic gateway URL for proxy rewrites', () => {
    const nextConfigPath = path.join(webRoot, 'next.config.mjs');
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

    // Must not hardcode http://localhost:8080 in destination
    assert.ok(
      !nextConfigContent.includes("destination: 'http://localhost:8080/v1/:path*'"),
      'next.config.mjs must not hardcode localhost in rewrites'
    );

    // Must dynamically rewrite /v1, /protocol/v1, and /api/proxy
    assert.ok(nextConfigContent.includes('/v1/:path*'), 'Must rewrite /v1/:path*');
    assert.ok(nextConfigContent.includes('/protocol/v1/:path*'), 'Must rewrite /protocol/v1/:path*');
    assert.ok(nextConfigContent.includes('/api/proxy/:path*'), 'Must rewrite /api/proxy/:path*');
  });

  it('verifies CORS middleware allows tenant and auth headers in preflight', () => {
    const corsPath = path.join(repoRoot, 'services/gateway/internal/http/middleware/cors.go');
    const corsContent = fs.readFileSync(corsPath, 'utf8');

    assert.ok(corsContent.includes('X-Organization-Id'), 'CORS must allow X-Organization-Id');
    assert.ok(corsContent.includes('X-API-Key'), 'CORS must allow X-API-Key');
    assert.ok(corsContent.includes('Authorization'), 'CORS must allow Authorization');
  });

  it('verifies render.yaml enforces live execution disabled and valid health checks', () => {
    const renderPath = path.join(repoRoot, 'render.yaml');
    assert.ok(fs.existsSync(renderPath), 'render.yaml must exist');
    const renderContent = fs.readFileSync(renderPath, 'utf8');

    assert.ok(renderContent.includes('name: agentpay-gateway'), 'render.yaml must define agentpay-gateway');
    assert.ok(renderContent.includes('name: agentpay-policy-engine'), 'render.yaml must define agentpay-policy-engine');
    assert.ok(renderContent.includes('healthCheckPath: /health'), 'render.yaml must specify healthCheckPath: /health');
    assert.ok(renderContent.includes('ENABLE_LIVE_EXECUTION'), 'render.yaml must specify ENABLE_LIVE_EXECUTION');
    assert.ok(renderContent.includes('value: "false"'), 'render.yaml must set ENABLE_LIVE_EXECUTION to false');
  });

  it('verifies combined Render Dockerfile and entrypoint script exist for single-service deployment', () => {
    const combinedDockerPath = path.join(repoRoot, 'services/Dockerfile.combined');
    const entrypointPath = path.join(repoRoot, 'services/entrypoint.sh');

    assert.ok(fs.existsSync(combinedDockerPath), 'Dockerfile.combined must exist');
    assert.ok(fs.existsSync(entrypointPath), 'entrypoint.sh must exist');

    const entrypointContent = fs.readFileSync(entrypointPath, 'utf8');
    assert.ok(entrypointContent.includes('POLICY_ENGINE_PORT=8081'), 'entrypoint must configure policy engine port');
    assert.ok(entrypointContent.includes('POLICY_ENGINE_URL="http://127.0.0.1:8081"'), 'entrypoint must wire loopback url');
  });

  it('verifies apps/web/vercel.json is properly structured', () => {
    const vercelPath = path.join(webRoot, 'vercel.json');
    assert.ok(fs.existsSync(vercelPath), 'apps/web/vercel.json must exist');

    const parsed = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    assert.strictEqual(parsed.framework, 'nextjs', 'framework must be nextjs');
    assert.ok(parsed.headers && parsed.headers.length > 0, 'security headers must be configured');
  });

  it('verifies .gitignore strictly excludes secrets, .env files, and private keys', () => {
    const gitignorePath = path.join(repoRoot, '.gitignore');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

    assert.ok(gitignoreContent.includes('.env'), 'Must ignore .env');
    assert.ok(gitignoreContent.includes('*.key'), 'Must ignore *.key');
    assert.ok(gitignoreContent.includes('private_key*'), 'Must ignore private_key*');
  });

  it('verifies Go gateway defaults ENABLE_LIVE_EXECUTION to false', () => {
    const configPath = path.join(repoRoot, 'services/gateway/internal/config/config.go');
    const configContent = fs.readFileSync(configPath, 'utf8');

    assert.ok(configContent.includes('enableLiveExecution := false'), 'Gateway must default enableLiveExecution to false');
  });
});
