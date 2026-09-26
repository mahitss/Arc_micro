import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, '..');

describe('TASK 35 — AgentPay Simulator Command Rail & Workspace Suite', () => {
  // 1. Sidebar Structure & Institutional Style
  describe('1. Command Rail Sidebar Structure & Style', () => {
    it('verifies SimulatorCommandRail component exists and adheres to matte-black palette', () => {
      const railPath = path.join(webSrcDir, 'components', 'SimulatorCommandRail.tsx');
      assert.ok(fs.existsSync(railPath), 'SimulatorCommandRail.tsx must exist');
      const content = fs.readFileSync(railPath, 'utf-8');

      // Terminal branding
      assert.ok(content.includes('AgentPay'), 'Sidebar must display AgentPay');
      assert.ok(content.includes('Financial Control Plane'), 'Sidebar must display Financial Control Plane');
      assert.ok(content.includes('bg-[#0A0A0A]'), 'Sidebar background must be matte black #0A0A0A');
      assert.ok(content.includes('border-[#222222]'), 'Sidebar border must be subtle #222222');

      // Primary navigation items
      assert.ok(content.includes('CONTROL'), 'Must include CONTROL workspace');
      assert.ok(content.includes('MISSIONS'), 'Must include MISSIONS workspace');
      assert.ok(content.includes('MARKETPLACE'), 'Must include MARKETPLACE workspace');
      assert.ok(content.includes('ECONOMY'), 'Must include ECONOMY workspace');
      assert.ok(content.includes('NETWORK'), 'Must include NETWORK workspace');
      assert.ok(content.includes('SECURITY'), 'Must include SECURITY workspace');
      assert.ok(content.includes('ARC'), 'Must include ARC workspace');

      // Secondary subsystems
      assert.ok(content.includes('OPERATIONS'), 'Must include OPERATIONS subsystem');
      assert.ok(content.includes('RUNTIME'), 'Must include RUNTIME subsystem');
      assert.ok(content.includes('TREASURY'), 'Must include TREASURY subsystem');
      assert.ok(content.includes('CLEARINGHOUSE'), 'Must include CLEARINGHOUSE subsystem');
    });

    it('verifies SIMULATOR active state treatment in command rail', () => {
      const railContent = fs.readFileSync(path.join(webSrcDir, 'components', 'SimulatorCommandRail.tsx'), 'utf-8');
      assert.ok(railContent.includes('SIMULATOR'), 'Must include SIMULATOR link');
      assert.ok(railContent.includes('ACTIVE'), 'Must indicate ACTIVE status');
      assert.ok(railContent.includes('bg-[#151515]'), 'Active item must have #151515 background');
      assert.ok(railContent.includes('border-[#D6A83A]'), 'Active item must have amber #D6A83A indicator');
      assert.ok(railContent.includes('text-[#F2F0EA]'), 'Active text must be off-white #F2F0EA');
    });

    it('verifies compact System Status panel in command rail with semantic indicators', () => {
      const railContent = fs.readFileSync(path.join(webSrcDir, 'components', 'SimulatorCommandRail.tsx'), 'utf-8');
      assert.ok(railContent.includes('SYSTEM STATUS'), 'Must include SYSTEM STATUS section');
      assert.ok(railContent.includes('GATEWAY') && railContent.includes('ONLINE'), 'Must include GATEWAY ONLINE');
      assert.ok(railContent.includes('#2FB36F'), 'ONLINE status must use green #2FB36F');
      assert.ok(railContent.includes('ARC') && railContent.includes('SIMULATION'), 'Must include ARC SIMULATION');
      assert.ok(railContent.includes('#D6A83A'), 'SIMULATION status must use amber #D6A83A');
      assert.ok(railContent.includes('LIVE EXECUTION') && railContent.includes('DISABLED'), 'Must include LIVE EXECUTION DISABLED');
      assert.ok(railContent.includes('AGENTVAULT') && railContent.includes('NOT DEPLOYED'), 'Must include AGENTVAULT NOT DEPLOYED');
      assert.ok(railContent.includes('#D85C5C'), 'DISABLED / NOT DEPLOYED status must use red #D85C5C');
    });

    it('verifies responsive rail collapsing and mobile drawer implementation', () => {
      const railContent = fs.readFileSync(path.join(webSrcDir, 'components', 'SimulatorCommandRail.tsx'), 'utf-8');
      assert.ok(railContent.includes('min-[1200px]:w-[230px]'), 'Must support full 230px width on >= 1200px viewports');
      assert.ok(railContent.includes('w-[72px]'), 'Must collapse to ~72px icon rail on medium viewports');
      assert.ok(railContent.includes('min-[900px]:hidden'), 'Must provide mobile drawer/bar on < 900px');
    });
  });

  // 2. Main Workspace Layout & 3-Column Proportions
  describe('2. Main Workspace Composition & 3-Column Grid', () => {
    it('verifies simulator page embeds SimulatorCommandRail and removes duplicate header', () => {
      const pageContent = fs.readFileSync(path.join(webSrcDir, 'app', 'simulator', 'page.tsx'), 'utf-8');
      assert.ok(pageContent.includes('<SimulatorCommandRail'), 'Simulator page must render SimulatorCommandRail');
      assert.ok(pageContent.includes('DIGITAL TWIN & ECONOMIC SIMULATOR'), 'Must render DIGITAL TWIN title in workspace');
      assert.ok(pageContent.includes('SIMULATION MODE — ZERO REAL TRANSACTIONS'), 'Must render amber simulation mode badge');
      assert.ok(pageContent.includes('Run Simulation'), 'Must render Run Simulation button');
    });

    it('verifies 3-column proportions (28% / 42% / 30%) with 20px gap and top alignment', () => {
      const pageContent = fs.readFileSync(path.join(webSrcDir, 'app', 'simulator', 'page.tsx'), 'utf-8');
      assert.ok(pageContent.includes('xl:grid-cols-[28fr_42fr_30fr]'), 'Must use 28fr 42fr 30fr grid proportions');
      assert.ok(pageContent.includes('gap-5'), 'Must use 20px (gap-5) spacing between columns');
      assert.ok(pageContent.includes('items-start'), 'Columns must align at the top');
      assert.ok(pageContent.includes('Scenario Configuration (28%)'), 'Column 1 must be Scenario Configuration');
      assert.ok(pageContent.includes('Projected Mission / Swarm Execution Graph (42%)'), 'Column 2 must be Execution Graph');
      assert.ok(pageContent.includes('Projected Economics & Exposure (30%)'), 'Column 3 must be Projected Outcomes');
    });

    it('verifies Execution Graph visual hierarchy and restrained semantic step indicators', () => {
      const pageContent = fs.readFileSync(path.join(webSrcDir, 'app', 'simulator', 'page.tsx'), 'utf-8');
      assert.ok(pageContent.includes('border-[#252525]'), 'Execution graph container must have subtle elevated border #252525');
      assert.ok(pageContent.includes('border-l-[#D85C5C]'), 'DENY step indicator must be red');
      assert.ok(pageContent.includes('border-l-[#2FB36F]'), 'ALLOW step indicator must be green');
      assert.ok(pageContent.includes('border-l-[#D6A83A]'), 'APPROVAL step indicator must be amber');
      assert.ok(pageContent.includes('bg-[#0E0E0E]'), 'Step cards must remain neutral graphite background');
    });

    it('verifies Projected Outcomes Execute button styling and guarded revalidation', () => {
      const pageContent = fs.readFileSync(path.join(webSrcDir, 'app', 'simulator', 'page.tsx'), 'utf-8');
      assert.ok(pageContent.includes('PROJECTED'), 'Must retain amber PROJECTED badge');
      assert.ok(pageContent.includes('EXECUTE THIS PLAN'), 'Must retain EXECUTE THIS PLAN action');
      assert.ok(pageContent.includes('bg-[#F2F0EA]'), 'Execute button must have off-white background');
      assert.ok(pageContent.includes('text-[#080808]'), 'Execute button must have black text');
      assert.ok(pageContent.includes('Guarded Revalidation'), 'Must preserve guarded revalidation notice');
    });

    it('verifies MainLayoutContent unconstrains simulator width to eliminate excessive margins', () => {
      const contentLayout = fs.readFileSync(path.join(webSrcDir, 'components', 'MainLayoutContent.tsx'), 'utf-8');
      assert.ok(contentLayout.includes('/simulator'), 'Must recognize simulator route');
      assert.ok(contentLayout.includes('w-full'), 'Simulator layout must be full width without outer 1440px restriction');
      assert.ok(contentLayout.includes('max-w-[1440px]'), 'Non-simulator routes must retain max-w-[1440px]');
    });
  });
});
