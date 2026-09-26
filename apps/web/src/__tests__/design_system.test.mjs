import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('TASK 31 — AgentPay Global Design System Suite', () => {
  // 1. Design Tokens & Palette Verification
  describe('1. Global Color System & Design Tokens', () => {
    it('verifies globals.css defines the canonical matte-black institutional palette', () => {
      const globalsCss = fs.readFileSync(path.join(webSrcDir, 'app', 'globals.css'), 'utf-8');
      assert.ok(globalsCss.includes('--background: #070707;'), 'Background token must be #070707');
      assert.ok(globalsCss.includes('--panel: #101010;'), 'Surface token must be #101010');
      assert.ok(globalsCss.includes('--border: #202020;') || globalsCss.includes('#222222'), 'Border token must be dark graphite');
      assert.ok(globalsCss.includes('--text-primary: #f5f5f5;'), 'Text primary token must be #f5f5f5');
      assert.ok(globalsCss.includes('--semantic-success: #22c55e;'), 'Semantic success must be #22c55e');
      assert.ok(globalsCss.includes('--semantic-warning: #f59e0b;'), 'Semantic warning must be #f59e0b');
      assert.ok(globalsCss.includes('--semantic-danger: #ef4444;'), 'Semantic danger must be #ef4444');
      assert.ok(globalsCss.includes('--semantic-info: #60a5fa;'), 'Semantic info must be #60a5fa');
    });

    it('verifies neon glow pulse keyframes are eliminated from globals.css', () => {
      const globalsCss = fs.readFileSync(path.join(webSrcDir, 'app', 'globals.css'), 'utf-8');
      assert.equal(globalsCss.includes('@keyframes pulse-glow'), false, 'Pulse glow animation must be removed');
      assert.equal(globalsCss.includes('0 0 25px rgba(20, 184, 166'), false, 'Cyan glowing shadow must be removed');
    });
  });

  // 2. Global Navigation & Status Banner
  describe('2. Global Navigation & Status Bar', () => {
    it('verifies HeaderNav contains all 6 primary sections and MORE dropdown', () => {
      const headerNavContent = fs.readFileSync(path.join(webSrcDir, 'components', 'HeaderNav.tsx'), 'utf-8');
      assert.ok(headerNavContent.includes('CONTROL'), 'Navigation must contain CONTROL');
      assert.ok(headerNavContent.includes('MISSIONS'), 'Navigation must contain MISSIONS');
      assert.ok(headerNavContent.includes('MARKETPLACE'), 'Navigation must contain MARKETPLACE');
      assert.ok(headerNavContent.includes('ECONOMY'), 'Navigation must contain ECONOMY');
      assert.ok(headerNavContent.includes('SECURITY'), 'Navigation must contain SECURITY');
      assert.ok(headerNavContent.includes('ARC'), 'Navigation must contain ARC');
      assert.ok(headerNavContent.includes('MORE'), 'Navigation must contain MORE');
      assert.ok(headerNavContent.includes('usePathname'), 'Must dynamically determine active route using usePathname()');
      assert.ok(headerNavContent.includes('#1a1a1a') || headerNavContent.includes('#151515'), 'Active item must use graphite background');
    });

    it('verifies layout.tsx uses unified HeaderNav and SystemStatusBanner', () => {
      const layoutContent = fs.readFileSync(path.join(webSrcDir, 'app', 'layout.tsx'), 'utf-8');
      assert.ok(layoutContent.includes('<HeaderNav />'), 'layout.tsx must render <HeaderNav />');
      assert.ok(layoutContent.includes('<SystemStatusBanner />'), 'layout.tsx must render <SystemStatusBanner />');
    });

    it('verifies SystemStatusBanner adheres to compact status language', () => {
      const bannerContent = fs.readFileSync(path.join(webSrcDir, 'components', 'SystemStatusBanner.tsx'), 'utf-8');
      assert.ok(bannerContent.includes('ENV DEV-SANDBOX'), 'Banner must display ENV DEV-SANDBOX');
      assert.ok(bannerContent.includes('ORG DEFAULT'), 'Banner must display ORG DEFAULT');
      assert.ok(bannerContent.includes('GATEWAY ONLINE'), 'Banner must display GATEWAY ONLINE');
      assert.ok(bannerContent.includes('ARC SIMULATION · 5042'), 'Banner must display ARC SIMULATION · 5042');
    });
  });

  // 3. /missions Page Redesign
  describe('3. /missions Page Styling & Invariants', () => {
    it('verifies missions page contains required panels, actions, and metrics', () => {
      const missionsContent = fs.readFileSync(path.join(webSrcDir, 'app', 'missions', 'page.tsx'), 'utf-8');
      assert.ok(missionsContent.includes('Autonomous Missions'), 'Page title must be present');
      assert.ok(missionsContent.includes('LAUNCH OR SIMULATE AUTONOMOUS MISSION'), 'Creation panel header must match');
      assert.ok(missionsContent.includes('CREATE MISSION'), 'Primary action button must be CREATE MISSION');
      assert.ok(missionsContent.includes('SIMULATE DRY-RUN'), 'Secondary action button must be SIMULATE DRY-RUN');
      assert.ok(missionsContent.includes('TOTAL MISSIONS'), 'Metric TOTAL MISSIONS must be present');
      assert.ok(missionsContent.includes('ACTIVE MISSIONS'), 'Metric ACTIVE MISSIONS must be present');
      assert.ok(missionsContent.includes('TOTAL SPENT'), 'Metric TOTAL SPENT must be present');
      assert.ok(missionsContent.includes('SAFETY SHIELD'), 'Metric SAFETY SHIELD must be present');
      assert.equal(missionsContent.includes('from-teal-500 to-cyan-500'), false, 'Neon gradient button must be removed');
    });
  });

  // 4. /marketplace Page Redesign & Truthfulness
  describe('4. /marketplace Page Styling & Truthfulness', () => {
    it('verifies marketplace headers, buttons, and removal of internal task branding', () => {
      const marketplaceContent = fs.readFileSync(path.join(webSrcDir, 'app', 'marketplace', 'page.tsx'), 'utf-8');
      assert.ok(marketplaceContent.includes('MACHINE-NATIVE SERVICES MARKETPLACE'), 'Marketplace title must match');
      assert.ok(marketplaceContent.includes('Autonomous agents discover capabilities, quote work and compete within deterministic financial controls.'), 'Subtitle must match');
      assert.ok(marketplaceContent.includes('LAUNCH DEMO'), 'Primary action must be LAUNCH DEMO');
      assert.ok(marketplaceContent.includes('COMPARE'), 'Secondary action must be COMPARE');
      assert.ok(marketplaceContent.includes('SECURITY ANOMALY CENTER'), 'Security button must be SECURITY ANOMALY CENTER');
      assert.equal(marketplaceContent.includes('Task 17 — Autonomous Economic Marketplace'), false, 'Internal Task 17 branding must be removed');
      assert.equal(marketplaceContent.includes('from-cyan-600 to-blue-600'), false, 'Cyan-blue gradient buttons must be removed');
    });

    it('verifies marketplace cards display required financial attributes', () => {
      const marketplaceContent = fs.readFileSync(path.join(webSrcDir, 'app', 'marketplace', 'page.tsx'), 'utf-8');
      assert.ok(marketplaceContent.includes('base_price_usdc'), 'Price attribute must be present');
      assert.ok(marketplaceContent.includes('availability'), 'Availability attribute must be present');
      assert.ok(marketplaceContent.includes('estimated_latency_ms'), 'Latency attribute must be present');
      assert.ok(marketplaceContent.includes('verification_method'), 'Verification/reputation attribute must be present');
    });
  });

  // 5. /economy Page Redesign & Truthfulness
  describe('5. /economy Page Styling & Financial Columns', () => {
    it('verifies economy header, sections, and removal of internal task branding', () => {
      const economyContent = fs.readFileSync(path.join(webSrcDir, 'app', 'economy', 'page.tsx'), 'utf-8');
      assert.ok(economyContent.includes('AUTONOMOUS ECONOMIC CLEARINGHOUSE'), 'Title must be AUTONOMOUS ECONOMIC CLEARINGHOUSE');
      assert.ok(economyContent.includes('OBLIGATIONS'), 'Section OBLIGATIONS must be present');
      assert.ok(economyContent.includes('NETTING'), 'Section NETTING must be present');
      assert.ok(economyContent.includes('RECONCILIATION'), 'Section RECONCILIATION must be present');
      assert.equal(economyContent.includes('TASK 10 ACTIVE'), false, 'Internal TASK 10 branding must be removed');
    });

    it('verifies economy table contains exact financial columns', () => {
      const economyContent = fs.readFileSync(path.join(webSrcDir, 'app', 'economy', 'page.tsx'), 'utf-8');
      assert.ok(economyContent.includes('COUNTERPARTY'), 'Column COUNTERPARTY must be present');
      assert.ok(economyContent.includes('OBLIGATION'), 'Column OBLIGATION must be present');
      assert.ok(economyContent.includes('STATUS'), 'Column STATUS must be present');
      assert.ok(economyContent.includes('RESERVED'), 'Column RESERVED must be present');
      assert.ok(economyContent.includes('SETTLEMENT'), 'Column SETTLEMENT must be present');
      assert.ok(economyContent.includes('EXPOSURE'), 'Column EXPOSURE must be present');
    });
  });

  // 6. /arc Page Redesign & Critical Truthfulness Fix
  describe('6. /arc Page Institutional Infrastructure & Truthfulness', () => {
    it('verifies arc page title and 7 exact system cards', () => {
      const arcContent = fs.readFileSync(path.join(webSrcDir, 'app', 'arc', 'page.tsx'), 'utf-8');
      assert.ok(arcContent.includes('ARC SETTLEMENT & CONSENSUS'), 'Title must be ARC SETTLEMENT & CONSENSUS');
      assert.ok(arcContent.includes('5042'), 'CHAIN 5042 must be present');
      assert.ok(arcContent.includes('CONNECTED'), 'RPC CONNECTED must be present');
      assert.ok(arcContent.includes('NATIVE USDC'), 'NATIVE USDC card must be present');
      assert.ok(arcContent.includes('AGENTVAULT'), 'AGENTVAULT card must be present');
      assert.ok(arcContent.includes('NOT DEPLOYED'), 'AGENTVAULT NOT DEPLOYED must be present');
      assert.ok(arcContent.includes('LIVE EXECUTION'), 'LIVE EXECUTION card must be present');
      assert.ok(arcContent.includes('DISABLED'), 'LIVE EXECUTION DISABLED must be present');
      assert.ok(arcContent.includes('REAL SETTLEMENTS'), 'REAL SETTLEMENTS card must be present');
      assert.ok(arcContent.includes('0 VERIFIED'), '0 VERIFIED must be present');
      assert.ok(arcContent.includes('BROADCASTS'), 'BROADCASTS card must be present');
    });

    it('verifies critical truthfulness fix: NO misleading "4-WAY EXACT MATCH"', () => {
      const arcContent = fs.readFileSync(path.join(webSrcDir, 'app', 'arc', 'page.tsx'), 'utf-8');
      assert.equal(arcContent.includes('4-WAY EXACT MATCH'), false, 'Misleading "4-WAY EXACT MATCH" must be eliminated');
      assert.ok(arcContent.includes('SIMULATION CONSISTENT'), 'Must truthfully label simulation reconciliation as SIMULATION CONSISTENT');
      assert.ok(arcContent.includes('NOT AVAILABLE'), 'Must truthfully disclose real on-chain reconciliation as NOT AVAILABLE');
    });

    it('verifies live execution mode toggle is visibly disabled with OPERATOR ONLY', () => {
      const arcContent = fs.readFileSync(path.join(webSrcDir, 'app', 'arc', 'page.tsx'), 'utf-8');
      assert.ok(arcContent.includes('OPERATOR ONLY'), 'Live toggle must display OPERATOR ONLY');
      assert.ok(arcContent.includes('disabled'), 'Live toggle button must be disabled');
    });
  });

  // 7. Complete Scrubbing of Internal Task Numbers
  describe('7. Internal Task Branding Scrubbing Across Entire Web Codebase', () => {
    it('verifies no internal task branding in app pages', () => {
      const pagesToCheck = [
        'marketplace/page.tsx',
        'economy/page.tsx',
        'treasury/page.tsx',
        'economy/settlements/page.tsx',
        'economy/network/page.tsx',
        'economy/netting/page.tsx',
        'economy/reconciliation/page.tsx',
        'economy/counterparties/page.tsx',
        'control/runtime/page.tsx',
        'control/operations/page.tsx',
        'demo/clearing/page.tsx',
      ];

      for (const relPage of pagesToCheck) {
        const fullPath = path.join(webSrcDir, 'app', relPage);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.equal(content.includes('TASK 17 —'), false, `Page ${relPage} must not contain TASK 17`);
          assert.equal(content.includes('TASK 10 ACTIVE'), false, `Page ${relPage} must not contain TASK 10 ACTIVE`);
          assert.equal(content.includes('Task 18 —'), false, `Page ${relPage} must not contain Task 18 —`);
        }
      }
    });
  });
});
