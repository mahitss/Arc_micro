import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('TASK 36 — AgentPay Global Command Shell Suite', () => {
  // 1. Global Shell Component & Root Layout Integration
  describe('1. Global Shell Component & Root Layout Integration', () => {
    it('verifies AgentPayShell component exists and wraps application workspace', () => {
      const shellPath = path.join(webSrcDir, 'components', 'AgentPayShell.tsx');
      assert.ok(fs.existsSync(shellPath), 'AgentPayShell.tsx must exist');
      const content = fs.readFileSync(shellPath, 'utf-8');

      assert.ok(content.includes('<AgentPaySidebar'), 'AgentPayShell must embed AgentPaySidebar');
      assert.ok(content.includes('min-w-0'), 'Main content must have min-w-0 to prevent overflow');
      assert.ok(content.includes('flex-1'), 'Main content must expand to fill workspace');
      assert.ok(content.includes('w-full'), 'Main content must use available width');
    });

    it('verifies layout.tsx mounts AgentPayShell globally for all application routes', () => {
      const layoutContent = fs.readFileSync(path.join(webSrcDir, 'app', 'layout.tsx'), 'utf-8');
      assert.ok(layoutContent.includes('<AgentPayShell>'), 'layout.tsx must wrap children with <AgentPayShell>');
      assert.ok(layoutContent.includes('<HeaderNav />'), 'layout.tsx must render <HeaderNav />');
      assert.ok(layoutContent.includes('<SystemStatusBanner />'), 'layout.tsx must render <SystemStatusBanner />');
      assert.ok(layoutContent.includes('w-full'), 'Header must span full width for unified terminal feel');
    });
  });

  // 2. Global Sidebar Navigation Groups & Active Highlighting
  describe('2. Global Sidebar Navigation Groups & Routing', () => {
    it('verifies AgentPaySidebar defines all required navigation groups', () => {
      const sidebarContent = fs.readFileSync(path.join(webSrcDir, 'components', 'AgentPaySidebar.tsx'), 'utf-8');

      // Groups
      assert.ok(sidebarContent.includes('PRIMARY'), 'Must define PRIMARY group');
      assert.ok(sidebarContent.includes('OPERATIONS'), 'Must define OPERATIONS group');
      assert.ok(sidebarContent.includes('FINANCIAL'), 'Must define FINANCIAL group');
      assert.ok(sidebarContent.includes('TOOLS'), 'Must define TOOLS group');

      // Primary routes
      assert.ok(sidebarContent.includes('CONTROL') && sidebarContent.includes('/control'));
      assert.ok(sidebarContent.includes('MISSIONS') && sidebarContent.includes('/missions'));
      assert.ok(sidebarContent.includes('MARKETPLACE') && sidebarContent.includes('/marketplace'));
      assert.ok(sidebarContent.includes('ECONOMY') && sidebarContent.includes('/economy'));
      assert.ok(sidebarContent.includes('NETWORK') && sidebarContent.includes('/network'));
      assert.ok(sidebarContent.includes('SECURITY') && sidebarContent.includes('/security'));
      assert.ok(sidebarContent.includes('ARC') && sidebarContent.includes('/arc'));

      // Operations routes
      assert.ok(sidebarContent.includes('OBJECTIVES') && sidebarContent.includes('/control/objectives'));
      assert.ok(sidebarContent.includes('PROTOCOL') && sidebarContent.includes('/control/protocol'));
      assert.ok(sidebarContent.includes('RUNTIME') && sidebarContent.includes('/control/runtime'));
      assert.ok(sidebarContent.includes('OPERATIONS') && sidebarContent.includes('/control/operations'));

      // Financial routes
      assert.ok(sidebarContent.includes('CLEARINGHOUSE') && sidebarContent.includes('/economy/clearing'));
      assert.ok(sidebarContent.includes('TREASURY') && sidebarContent.includes('/treasury'));

      // Tools routes
      assert.ok(sidebarContent.includes('SIMULATOR') && sidebarContent.includes('/simulator'));
      assert.ok(sidebarContent.includes('REPLAY'));
      assert.ok(sidebarContent.includes('DEMO') && sidebarContent.includes('/demo'));
    });

    it('verifies dynamic active route styling and institutional terminal colors', () => {
      const sidebarContent = fs.readFileSync(path.join(webSrcDir, 'components', 'AgentPaySidebar.tsx'), 'utf-8');

      // Active styling
      assert.ok(sidebarContent.includes('bg-[#151515]'), 'Active item must have #151515 background');
      assert.ok(sidebarContent.includes('border-[#D6A83A]'), 'Active item must have amber #D6A83A left indicator');
      assert.ok(sidebarContent.includes('text-[#F2F0EA]'), 'Active item must have #F2F0EA text');
      assert.ok(sidebarContent.includes('border-l-2'), 'Active item must have 2px left border');

      // Inactive styling
      assert.ok(sidebarContent.includes('text-[#8A8882]'), 'Inactive text must be #8A8882');
      assert.ok(sidebarContent.includes('hover:bg-[#151515]'), 'Hover background must be #151515');

      // Sidebar shell dimensions
      assert.ok(sidebarContent.includes('min-[1200px]:w-[232px]'), 'Must support 232px width on >= 1200px');
      assert.ok(sidebarContent.includes('w-[72px]'), 'Must collapse to 72px on tablet');
      assert.ok(sidebarContent.includes('sticky top-16'), 'Sidebar must be sticky top-16');
      assert.ok(sidebarContent.includes('min-[900px]:hidden'), 'Must provide mobile drawer on < 900px');
    });

    it('verifies compact System Status footer adherence', () => {
      const sidebarContent = fs.readFileSync(path.join(webSrcDir, 'components', 'AgentPaySidebar.tsx'), 'utf-8');

      assert.ok(sidebarContent.includes('SYSTEM STATUS'));
      assert.ok(sidebarContent.includes('GATEWAY') && sidebarContent.includes('ONLINE') && sidebarContent.includes('#2FB36F'));
      assert.ok(sidebarContent.includes('ARC') && sidebarContent.includes('SIMULATION') && sidebarContent.includes('#D6A83A'));
      assert.ok(sidebarContent.includes('EXECUTION') && sidebarContent.includes('DISABLED') && sidebarContent.includes('#D85C5C'));
      assert.ok(sidebarContent.includes('VAULT') && sidebarContent.includes('NOT DEPLOYED') && sidebarContent.includes('#D85C5C'));
    });
  });

  // 3. Elimination of Duplicate Sidebars & Top Navigation Refactoring
  describe('3. Zero Duplicate Sidebars & Refactored Top Header', () => {
    it('verifies simulator page does NOT contain a page-specific duplicate sidebar', () => {
      const pageContent = fs.readFileSync(path.join(webSrcDir, 'app', 'simulator', 'page.tsx'), 'utf-8');
      assert.equal(pageContent.includes('<SimulatorCommandRail'), false, 'Simulator page must not have duplicate sidebar');
      assert.equal(pageContent.includes('<AgentPaySidebar'), false, 'Simulator page must not have page-level sidebar instance');
    });

    it('verifies top header does not duplicate primary route links on desktop', () => {
      const headerNavContent = fs.readFileSync(path.join(webSrcDir, 'components', 'HeaderNav.tsx'), 'utf-8');
      assert.ok(headerNavContent.includes('hidden'), 'HeaderNav must hide duplicate desktop route links');
    });

    it('verifies next.config.mjs rewrites alias routes to their canonical paths', () => {
      const configContent = fs.readFileSync(path.join(webSrcDir, '..', 'next.config.mjs'), 'utf-8');
      assert.ok(configContent.includes('/clearinghouse'), 'Rewrites must support /clearinghouse');
      assert.ok(configContent.includes('/runtime'), 'Rewrites must support /runtime');
      assert.ok(configContent.includes('/operations'), 'Rewrites must support /operations');
      assert.ok(configContent.includes('/objectives'), 'Rewrites must support /objectives');
      assert.ok(configContent.includes('/protocol'), 'Rewrites must support /protocol');
      assert.ok(configContent.includes('/swarm'), 'Rewrites must support /swarm');
      assert.ok(configContent.includes('/replay'), 'Rewrites must support /replay');
    });
  });
});
