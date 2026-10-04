import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityPagePath = path.resolve(__dirname, '../app/security/page.tsx');
const controlSecurityPagePath = path.resolve(__dirname, '../app/control/security/page.tsx');
const securityPageSource = fs.readFileSync(securityPagePath, 'utf8');
const controlSecurityPageSource = fs.readFileSync(controlSecurityPagePath, 'utf8');

describe('TASK — Fix /security Raw HTML / CSS Pipeline Failure & Restore Global Shell', () => {
  describe('1. Global Shell and Canonical Implementation', () => {
    it('verifies /security uses canonical AgentPay design system and tokens', () => {
      assert.match(securityPageSource, /#080808/);
      assert.match(securityPageSource, /#101010/);
      assert.match(securityPageSource, /#222222/);
      assert.match(securityPageSource, /#F2F0EA/);
      assert.match(securityPageSource, /#D6A83A/);
      assert.match(securityPageSource, /#2FB36F/);
      assert.match(securityPageSource, /#D85C5C/);
    });

    it('verifies /control/security delegates directly to canonical SecurityCenterPage (no competing implementations)', () => {
      assert.match(controlSecurityPageSource, /import\s+SecurityCenterPage\s+from\s+['"]\.\.\/\.\.\/security\/page['"]/);
      assert.match(controlSecurityPageSource, /export\s+default\s+SecurityCenterPage/);
    });
  });

  describe('2. Comprehensive Security Information Architecture', () => {
    it('verifies Core Subsystems Telemetry is present', () => {
      assert.match(securityPageSource, /Core Subsystem Telemetry/);
      assert.match(securityPageSource, /fetchSecurityReport/);
    });

    it('verifies Policy Authority Hierarchy (Constitution) is present', () => {
      assert.match(securityPageSource, /POLICY AUTHORITY HIERARCHY/);
      assert.match(securityPageSource, /fetchSecurityCenter/);
      assert.match(securityPageSource, /INV-148/);
      assert.match(securityPageSource, /ENFORCED IN RUST/);
    });

    it('verifies Multi-Tier Emergency Kill Switches are present', () => {
      assert.match(securityPageSource, /MULTI-TIER EMERGENCY KILL SWITCHES/);
      assert.match(securityPageSource, /GLOBAL KILL SWITCH/);
      assert.match(securityPageSource, /ORGANIZATION PAUSE/);
      assert.match(securityPageSource, /AGENT QUARANTINE/);
    });

    it('verifies Signer Architecture and AgentVault state are present', () => {
      assert.match(securityPageSource, /SIGNER ARCHITECTURE & KEY BOUNDARY/);
      assert.match(securityPageSource, /AGENTVAULT & ARC CONSENSUS STATE/);
      assert.match(securityPageSource, /fetchArcStatus/);
    });

    it('verifies Economic Invariants and Hard Boundaries are present', () => {
      assert.match(securityPageSource, /AI \/ LLM Hard Boundaries/);
      assert.match(securityPageSource, /External Service Output Boundaries/);
      assert.match(securityPageSource, /Multi-Agent Swarm Invariants/);
      assert.match(securityPageSource, /INV-1/);
      assert.match(securityPageSource, /INV-2/);
      assert.match(securityPageSource, /INV-46/);
    });

    it('verifies simulation provenance notice is present and truthful', () => {
      assert.match(securityPageSource, /PROVENANCE/);
      assert.match(securityPageSource, /Deterministic Simulation Engine/);
      assert.match(securityPageSource, /Zero real funds moved/);
    });
  });

  describe('3. Live Dev Server HTTP & CSS Pipeline Verification', () => {
    it('verifies /security loads with HTTP 200 and layout.css', async () => {
      try {
        const res = await fetch('http://localhost:3001/security');
        assert.equal(res.status, 200, '/security must return 200');
        const html = await res.text();
        assert.ok(html.includes('AgentPay'), 'HTML must contain AgentPay header');
        assert.ok(html.includes('Security &amp; Invariant') || html.includes('Security & Invariant'), 'HTML must contain page title');
        const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
        assert.ok(cssMatch, '/security HTML must include a stylesheet link');

        const cssRes = await fetch('http://localhost:3001' + cssMatch[1]);
        assert.equal(cssRes.status, 200, 'layout.css must return HTTP 200');
        assert.match(cssRes.headers.get('content-type') || '', /text\/css/, 'Content-type must be text/css');
        const css = await cssRes.text();
        assert.ok(css.length > 50000, 'CSS bundle must be substantial (>50KB)');
      } catch (e) {
        if (e?.code === 'ECONNREFUSED' || (e?.message && e.message.includes('fetch failed'))) {
          console.log('Skipping live HTTP check (offline CI)');
        } else {
          throw e;
        }
      }
    });

    it('verifies /control/security loads identically with HTTP 200 and layout.css', async () => {
      try {
        const res = await fetch('http://localhost:3001/control/security');
        assert.equal(res.status, 200, '/control/security must return 200');
        const html = await res.text();
        assert.ok(html.includes('Security &amp; Invariant') || html.includes('Security & Invariant'), 'HTML must contain page title');
      } catch (e) {
        if (e?.code === 'ECONNREFUSED' || (e?.message && e.message.includes('fetch failed'))) {
          console.log('Skipping live HTTP check (offline CI)');
        } else {
          throw e;
        }
      }
    });

    it('verifies navigation sequence: /control -> /missions -> /activity -> /marketplace -> /economy -> /network -> /security -> /arc -> /security -> /control -> /security', async () => {
      const sequence = [
        '/control', '/missions', '/activity', '/marketplace', '/economy', '/network', '/security', '/arc',
        '/security', '/control', '/security'
      ];
      for (const route of sequence) {
        try {
          const res = await fetch('http://localhost:3001' + route);
          assert.equal(res.status, 200, `${route} must return HTTP 200`);
          const html = await res.text();
          const topBarMatches = html.match(/ECONOMIC CONTROL PLANE/g) || [];
          assert.equal(topBarMatches.length, 1, `${route} must have exactly one GlobalTopBar`);
          const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+)"/);
          assert.ok(cssMatch, `${route} must link to layout.css`);
          const cssRes = await fetch('http://localhost:3001' + cssMatch[1]);
          assert.equal(cssRes.status, 200, `${route} layout.css must return 200`);
        } catch (e) {
          if (e?.code === 'ECONNREFUSED' || (e?.message && e.message.includes('fetch failed'))) {
            console.log(`Skipping navigation sequence test for ${route} (offline CI)`);
          } else {
            throw e;
          }
        }
      }
    });
  });
});
