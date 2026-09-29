import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootLayoutPath = path.resolve(__dirname, '../app/layout.tsx');
const globalsCssPath = path.resolve(__dirname, '../app/globals.css');
const tailwindConfigPath = path.resolve(__dirname, '../../tailwind.config.ts');
const postcssConfigPath = path.resolve(__dirname, '../../postcss.config.mjs');
const agentPayShellPath = path.resolve(__dirname, '../components/AgentPayShell.tsx');
const globalTopBarPath = path.resolve(__dirname, '../components/GlobalTopBar.tsx');
const marketplacePagePath = path.resolve(__dirname, '../app/marketplace/page.tsx');

const rootLayoutSource = fs.readFileSync(rootLayoutPath, 'utf8');
const globalsCssSource = fs.readFileSync(globalsCssPath, 'utf8');
const tailwindConfigSource = fs.readFileSync(tailwindConfigPath, 'utf8');
const postcssConfigSource = fs.readFileSync(postcssConfigPath, 'utf8');
const agentPayShellSource = fs.readFileSync(agentPayShellPath, 'utf8');
const globalTopBarSource = fs.readFileSync(globalTopBarPath, 'utf8');
const marketplacePageSource = fs.readFileSync(marketplacePagePath, 'utf8');

describe('TASK 48 — Emergency Global CSS & Layout Pipeline Suite', () => {
  describe('1. Global Stylesheet Canonical Loading', () => {
    it('verifies RootLayout imports ./globals.css exactly once', () => {
      assert.match(rootLayoutSource, /import\s+['"]\.\/globals\.css['"]/);
      const matches = rootLayoutSource.match(/globals\.css/g);
      assert.equal(matches.length, 1, 'Only one canonical stylesheet import in root layout');
    });

    it('verifies no other page or component imports an overriding external stylesheet', () => {
      assert.doesNotMatch(marketplacePageSource, /\.css/);
      assert.doesNotMatch(agentPayShellSource, /\.css/);
    });

    it('verifies globals.css defines the canonical AgentPay matte-black design tokens', () => {
      assert.match(globalsCssSource, /--ap-bg:\s*#080808/);
      assert.match(globalsCssSource, /--ap-surface:\s*#101010/);
      assert.match(globalsCssSource, /--ap-border:\s*#222222/);
      assert.match(globalsCssSource, /--ap-accent:\s*#D6A83A/);
      assert.match(globalsCssSource, /--ap-success:\s*#2FB36F/);
      assert.match(globalsCssSource, /--ap-danger:\s*#D85C5C/);
    });

    it('verifies globals.css includes standard Tailwind directives', () => {
      assert.match(globalsCssSource, /@tailwind base;/);
      assert.match(globalsCssSource, /@tailwind components;/);
      assert.match(globalsCssSource, /@tailwind utilities;/);
    });
  });

  describe('2. Tailwind and PostCSS Compilation Globs', () => {
    it('verifies tailwind.config.ts content globs cover app and components', () => {
      assert.match(tailwindConfigSource, /\.\/src\/app\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/);
      assert.match(tailwindConfigSource, /\.\/src\/components\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/);
    });

    it('verifies postcss.config.mjs loads tailwindcss and autoprefixer', () => {
      assert.match(postcssConfigSource, /tailwindcss/);
      assert.match(postcssConfigSource, /autoprefixer/);
    });
  });

  describe('3. AgentPay Shell Hierarchy and Consistency', () => {
    it('verifies RootLayout mounts GlobalTopBar and AgentPayShell wrapping children', () => {
      assert.match(rootLayoutSource, /<GlobalTopBar\s*\/>/);
      assert.match(rootLayoutSource, /<AgentPayShell>\{children\}<\/AgentPayShell>/);
    });

    it('verifies GlobalTopBar contains the canonical AgentPay header, search, and status indicators', () => {
      assert.match(globalTopBarSource, /AgentPay/);
      assert.match(globalTopBarSource, /ECONOMIC CONTROL PLANE/);
      assert.match(globalTopBarSource, /Search systems, missions, agents, transactions\.\.\./);
    });

    it('verifies AgentPayShell contains the persistent AgentPaySidebar command rail', () => {
      assert.match(agentPayShellSource, /<AgentPaySidebar\s*\/>/);
      assert.match(agentPayShellSource, /<main className="[^"]*min-w-0 flex-1/);
    });

    it('verifies Marketplace does not define an alternate shell or reset', () => {
      assert.doesNotMatch(marketplacePageSource, /MarketplaceShell/);
      assert.doesNotMatch(marketplacePageSource, /all:\s*unset/);
      assert.doesNotMatch(marketplacePageSource, /font-family:\s*['"]?Times New Roman['"]?/i);
    });
  });

  describe('4. Dev Server Route & Stylesheet Verification', () => {
    it('verifies /security, /marketplace, /control, /missions, /network, and /activity return 200 with layout.css', async () => {
      const routes = ['/security', '/marketplace', '/control', '/missions', '/network', '/activity'];
      for (const route of routes) {
        try {
          const res = await fetch(`http://localhost:3001${route}`);
          assert.equal(res.status, 200, `${route} must return 200`);
          const html = await res.text();
          assert.ok(html.includes('AgentPay'), `${route} must contain AgentPay`);
          assert.ok(html.includes('layout.css'), `${route} must link layout.css`);
        } catch (e) {
          // If dev server is not running or testing in offline CI, skip live network assertion
          const isOfflineOrRefused = 
            e?.code === 'ECONNREFUSED' || 
            e?.cause?.code === 'ECONNREFUSED' || 
            (e?.message && e.message.includes('fetch failed'));
          if (isOfflineOrRefused) {
            console.log(`Skipping live dev server test for ${route} (dev server not active on port 3001 in CI environment)`);
          } else {
            throw e;
          }
        }
      }
    });
  });
});
