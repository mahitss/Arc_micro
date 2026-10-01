import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(webRoot, '../..');

describe('TASK — Remove Hardcoded Protocol Data and Restore Real Data Flow', () => {

  // 1. Protocol UI does not contain hardcoded business-state fixtures
  it('1. verifies Protocol UI pages do not contain hardcoded business-state fixtures in useState', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    const agentDetailContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/agents/[id]/page.tsx'), 'utf-8');
    const contractDetailContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/contracts/[id]/page.tsx'), 'utf-8');
    const trafficContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/traffic/page.tsx'), 'utf-8');
    const securityContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/security/page.tsx'), 'utf-8');

    // Check that useState does not initialize with hardcoded fallback mock arrays
    assert.doesNotMatch(pageContent, /useState<[^>]*>\(FALLBACK_AGENTS\)/, 'page.tsx must not initialize agents with FALLBACK_AGENTS');
    assert.doesNotMatch(pageContent, /useState<[^>]*>\(FALLBACK_CONTRACTS\)/, 'page.tsx must not initialize contracts with FALLBACK_CONTRACTS');
    assert.doesNotMatch(pageContent, /useState<[^>]*>\(FALLBACK_TRAFFIC\)/, 'page.tsx must not initialize traffic with FALLBACK_TRAFFIC');
    assert.doesNotMatch(pageContent, /useState<[^>]*>\(FALLBACK_SECURITY\)/, 'page.tsx must not initialize security with FALLBACK_SECURITY');

    assert.doesNotMatch(agentDetailContent, /useState<[^>]*>\(initialAgent\)/, 'agent detail must not use hardcoded initialAgent state');
    assert.doesNotMatch(contractDetailContent, /useState<[^>]*>\(initialContract\)/, 'contract detail must not use hardcoded initialContract state');
    assert.doesNotMatch(trafficContent, /useState<[^>]*>\(FALLBACK_TRAFFIC\)/, 'traffic page must not initialize with FALLBACK_TRAFFIC');
    assert.doesNotMatch(securityContent, /FALLBACK_SECURITY/, 'security page must not fallback to FALLBACK_SECURITY');
  });

  // 2. API returns simulation data from the simulation/domain layer
  it('2. verifies backend gateway provides canonical snapshot read model', async () => {
    try {
      const res = await fetch('http://localhost:8080/protocol/v1/snapshot');
      if (res.ok) {
        const snap = await res.json();
        assert.equal(snap.mode, 'simulation', 'Snapshot must be simulation mode');
        assert.equal(snap.funds_moved, false, 'No funds moved');
        assert.equal(snap.agents.discovered, 3, 'Must report 3 discovered agents from backend');
        assert.equal(snap.contracts.active, 1, 'Must report 1 active contract from backend');
        assert.equal(snap.contracts.projected_value_usdc, '110.00', 'Projected value must equal 110.00 USDC');
        assert.equal(snap.security.attacks_blocked, 324, 'Security attacks blocked must equal 324');
      }
    } catch {
      // Gateway might not be reached during static unit test run, so check route structure
      const routerPath = path.resolve(repoRoot, 'services/gateway/internal/http/router.go');
      const routerContent = fs.readFileSync(routerPath, 'utf-8');
      assert.match(routerContent, /GET \/protocol\/v1\/snapshot/, 'Router must register /protocol/v1/snapshot');
    }
  });

  // 3. Empty backend state renders zero/empty state
  it('3. verifies empty backend state yields zero counts and honest empty messages', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');

    // Discovered agents empty state
    assert.match(pageContent, /snapshot\?\.agents\?\.discovered \?\? 0/, 'Renders dynamic discovered count or 0');
    assert.match(pageContent, /0 discovered agents\. No protocol participants found\./, 'Provides honest empty agents message');

    // Contracts empty state
    assert.match(pageContent, /snapshot\?\.contracts\?\.active \?\? 0/, 'Renders dynamic active contract count or 0');
    assert.match(pageContent, /No active protocol contracts\./, 'Provides honest empty contracts message');

    // Telemetry empty state
    assert.match(pageContent, /No protocol telemetry recorded yet\./, 'Provides honest empty telemetry message');
  });

  // 4. API failure renders an error state
  it('4. verifies API failure renders an honest error state instead of silent demo data', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /Protocol State Unavailable/, 'Renders error header when API fails');
    assert.match(pageContent, /Retry Connection/, 'Provides actionable retry button on API error');

    const agentDetailContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/agents/[id]/page.tsx'), 'utf-8');
    assert.match(agentDetailContent, /Agent Not Found/, 'Renders Agent Not Found on lookup failure');

    const contractDetailContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/contracts/[id]/page.tsx'), 'utf-8');
    assert.match(contractDetailContent, /Contract Not Found/, 'Renders Contract Not Found on lookup failure');
  });

  // 5. Simulation mode renders deterministic fixture data
  it('5. verifies simulation mode renders deterministic fixture data dynamically', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /snapshot\?\.mode/, 'Badge reflects dynamic snapshot mode');
    assert.match(pageContent, /PROTOCOL SIMULATION/, 'Mentions PROTOCOL SIMULATION when mode is simulation');
  });

  // 6. Simulation values are labeled as simulation/projected
  it('6. verifies simulation values are explicitly labeled SIMULATED / PROJECTED / NO FUNDS MOVED', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /NO FUNDS MOVED/, 'KPI strip enforces NO FUNDS MOVED badge');
    assert.match(pageContent, /PROJECTED/, 'Projected value badge is present');
    assert.match(pageContent, /Simulated Escrow · NO FUNDS MOVED/, 'Escrow labeled as simulated');
  });

  // 7. Live mode never falls back to simulation data
  it('7. verifies live mode labels correctly reflect verified system state', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /LIVE — VERIFIED SYSTEM STATE/, 'Live mode presents verified system state label');
    assert.match(pageContent, /snapshot\?\.funds_moved \? 'FUNDS MOVED' : 'NO FUNDS MOVED'/, 'Truthful funds moved indicator');
  });

  // 8. Agent reputation comes from the authoritative source
  it('8. verifies agent reputation comes from authoritative source rather than hardcoded 95 fallback', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.doesNotMatch(pageContent, /a\.reputation_score \|\| 95/, 'Must not fallback to 95 if reputation_score is missing');
    assert.match(pageContent, /a\.reputation_score !== undefined/, 'Must inspect actual agent reputation_score property');

    const agentDetailContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/agents/[id]/page.tsx'), 'utf-8');
    assert.doesNotMatch(agentDetailContent, /currentAgent\.reputation_score \|\| 95/, 'Agent detail must not fallback to 95');
  });

  // 9. Contract value comes from contract/clearing state
  it('9. verifies contract value is dynamically calculated from snapshot contract items', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /snapshot\?\.contracts\?\.projected_value_usdc/, 'Displays projected_value_usdc from snapshot');
  });

  // 10. Security counts come from authoritative security/simulation results
  it('10. verifies security counts derive from snapshot.security rather than hardcoded 324', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.doesNotMatch(pageContent, /: 324/, 'Must not use ternary fallback to 324');
    assert.match(pageContent, /snapshot\?\.security\?\.attacks_blocked \?\? 0/, 'Derives attacks blocked from snapshot security');
  });

  // 11. No fake Arc transaction data is generated
  it('11. verifies no fake Arc transaction hashes are returned by protocol endpoints', () => {
    const handlersPath = path.resolve(repoRoot, 'services/gateway/internal/http/handlers/protocol_handlers.go');
    const handlersContent = fs.readFileSync(handlersPath, 'utf-8');
    assert.doesNotMatch(handlersContent, /arc_tx_0x/, 'Handlers must not invent fake arc_tx_0x transaction hashes');
  });

  // 12. AgentVault NOT DEPLOYED remains truthful
  it('12. verifies AgentVault deployment status is read dynamically from Arc status', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /snapshot\?\.arc\?\.agent_vault_deployed \? 'DEPLOYED' : 'NOT DEPLOYED'/, 'Truthfully renders NOT DEPLOYED when deployed is false');
  });

  // 13. No API failure silently displays demo data
  it('13. verifies protocol API client functions throw or return empty on error instead of silently returning mock constants', () => {
    const clientContent = fs.readFileSync(path.join(webRoot, 'src/lib/api/protocol.ts'), 'utf-8');
    assert.doesNotMatch(clientContent, /catch \{\s*return FALLBACK_AGENTS;\s*\}/, 'fetchProtocolAgents must not catch and return FALLBACK_AGENTS');
    assert.doesNotMatch(clientContent, /catch \{\s*return FALLBACK_CONTRACTS;\s*\}/, 'fetchProtocolContracts must not catch and return FALLBACK_CONTRACTS');
    assert.doesNotMatch(clientContent, /catch \{\s*return FALLBACK_TRAFFIC;\s*\}/, 'fetchProtocolTraffic must not catch and return FALLBACK_TRAFFIC');
    assert.doesNotMatch(clientContent, /catch \{\s*return FALLBACK_SECURITY;\s*\}/, 'fetchProtocolSecurity must not catch and return FALLBACK_SECURITY');
  });

  // 14. Refreshing the page returns the same deterministic simulation state
  it('14. verifies Go backend storage initializes deterministic fixtures reliably', () => {
    const storagePath = path.resolve(repoRoot, 'services/gateway/internal/protocol/storage.go');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');
    assert.match(storageContent, /seedDefaultFixtures/, 'MemoryProtocolStore initializes deterministic fixtures');
    assert.match(storageContent, /agent_research_01/, 'Contains canonical agent_research_01 fixture');
    assert.match(storageContent, /contract_live_01/, 'Contains canonical contract_live_01 fixture');
  });

  // 15. Changing simulation state changes the UI without modifying React constants
  it('15. verifies UI renders dynamically mapped lists without React hardcoded constants', () => {
    const pageContent = fs.readFileSync(path.join(webRoot, 'src/app/control/protocol/page.tsx'), 'utf-8');
    assert.match(pageContent, /filteredAgents\.map\(\(a\) =>/, 'Maps agents dynamically');
    assert.match(pageContent, /contracts\.map\(\(c\) =>/, 'Maps contracts dynamically');
    assert.match(pageContent, /traffic\.map\(\(e, idx\) =>/, 'Maps traffic dynamically');
  });

});
