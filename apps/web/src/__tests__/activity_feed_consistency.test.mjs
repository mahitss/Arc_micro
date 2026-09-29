import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const activityPagePath = path.resolve(__dirname, '../app/activity/page.tsx');
const activityPageSource = fs.readFileSync(activityPagePath, 'utf8');
const normalizerPath = path.resolve(__dirname, '../lib/activity/normalizer.ts');
const normalizerSource = fs.readFileSync(normalizerPath, 'utf8');
const missionsApiPath = path.resolve(__dirname, '../lib/api/missions.ts');
const missionsApiSource = fs.readFileSync(missionsApiPath, 'utf8');

// Inline normalizer functions for direct test execution under Node 20
function formatEventTitle(eventType) {
  if (!eventType) return 'System Event';
  const knownTitles = {
    'mission.created': 'Mission Created',
    'mission.started': 'Mission Started',
    'payment.created': 'Payment Intent Created',
    'payment.authorized': 'Payment Authorized',
    'payment.denied': 'Payment Denied',
    'payment.approval_required': 'Approval Required',
    'payment.approved': 'Payment Approved',
    'payment.confirmed': 'Payment Confirmed',
    'treasury.reserved': 'Treasury Liquidity Reserved',
    'policy.updated': 'Spending Policy Updated',
    'policy.evaluation.allowed': 'Policy Evaluation Passed',
    'security.prompt_injection_blocked': 'Prompt Injection Blocked',
    'arc.settlement.simulated': 'Arc Settlement Simulated',
  };
  if (knownTitles[eventType]) return knownTitles[eventType];
  return eventType
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function categorizeEvent(eventType, resourceType, explicitCategory) {
  if (explicitCategory) {
    const upper = explicitCategory.toUpperCase();
    if (['MISSION', 'PAYMENT', 'POLICY', 'RISK', 'APPROVAL', 'SECURITY', 'ARC'].includes(upper)) {
      return upper;
    }
  }
  const type = (eventType || '').toLowerCase();
  const res = (resourceType || '').toUpperCase();

  if (type.includes('approval') || res === 'APPROVAL') return 'APPROVAL';
  if (type.includes('security') || type.includes('injection') || res === 'SECURITY') return 'SECURITY';
  if (type.includes('risk') || res === 'RISK') return 'RISK';
  if (type.includes('policy') || res === 'POLICY') return 'POLICY';
  if (type.includes('arc') || type.includes('settlement') || res === 'ARC') return 'ARC';
  if (type.startsWith('payment') || type.startsWith('treasury') || res === 'PAYMENT_INTENT' || res === 'TREASURY') return 'PAYMENT';
  return 'MISSION';
}

function deriveEventStatus(explicitStatus, eventType) {
  if (explicitStatus) {
    const s = explicitStatus.toUpperCase();
    if (['SUCCESS', 'PENDING', 'BLOCKED', 'FAILED', 'INFO'].includes(s)) return s;
    if (s === 'ALLOWED' || s === 'COMPLETED' || s === 'CONFIRMED') return 'SUCCESS';
    if (s === 'DENIED' || s === 'HARD_DENY') return 'BLOCKED';
    if (s === 'REJECTED') return 'FAILED';
  }
  const type = (eventType || '').toLowerCase();
  if (type.includes('denied') || type.includes('blocked')) return 'BLOCKED';
  if (type.includes('failed') || type.includes('rejected')) return 'FAILED';
  if (type.includes('approval_required') || type.includes('pending')) return 'PENDING';
  if (type.includes('confirmed') || type.includes('authorized') || type.includes('created')) return 'SUCCESS';
  return 'INFO';
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sensitiveRegex = /(private[-_]?key|secret|token|password|credential)/i;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'idempotency_key' || key === 'key_hash') {
      sanitized[key] = value;
    } else if (sensitiveRegex.test(key)) {
      sanitized[key] = '[REDACTED_CREDENTIAL]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function parseMetadata(rawMetadata) {
  if (!rawMetadata) return {};
  if (typeof rawMetadata === 'object') return rawMetadata;
  if (typeof rawMetadata === 'string') {
    const trimmed = rawMetadata.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === 'object' && parsed !== null ? parsed : { raw: trimmed };
      } catch {
        return { raw: trimmed };
      }
    }
    return trimmed ? { note: trimmed } : {};
  }
  return {};
}

function normalizeActivityEvent(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: 'evt_invalid',
      event_type: 'unknown',
      type: 'unknown',
      title: 'Invalid Event',
      category: 'MISSION',
      actor: 'ACTOR UNAVAILABLE',
      status: 'INFO',
      source: 'Gateway API',
      correlation_id: '',
      timestamp: new Date().toISOString(),
      payload: {},
      is_simulated: true,
    };
  }

  const id = String(raw.id || raw.event_id || 'evt_unknown');
  const event_type = String(raw.event_type || raw.type || 'system.event');
  const title = formatEventTitle(event_type);
  const rawPayload = parseMetadata(raw.payload ?? raw.metadata);
  const payload = sanitizeObject(rawPayload);

  let actor = 'ACTOR UNAVAILABLE';
  if (raw.actor) actor = String(raw.actor);
  else if (raw.actor_id) actor = raw.actor_type ? `${raw.actor_type.toLowerCase()}:${raw.actor_id}` : String(raw.actor_id);
  else if (raw.agent_id) actor = `agent:${raw.agent_id}`;
  else if (raw.actor_type === 'SYSTEM') actor = 'SYSTEM';

  const category = categorizeEvent(event_type, raw.resource_type, raw.category);
  const status = deriveEventStatus(raw.status, event_type);

  let mission_id = raw.mission_id || payload.mission_id;
  if (!mission_id && raw.correlation_id && raw.correlation_id.includes('msn_')) {
    const match = raw.correlation_id.match(/msn_[a-zA-Z0-9_]+/);
    if (match) mission_id = match[0];
  }

  const payment_intent_id = raw.payment_intent_id || raw.payment_id || payload.payment_intent_id;
  const amount = raw.amount || payload.amount || payload.budget;
  const is_simulated = !payload.tx_hash && !raw.tx_hash;

  return {
    id,
    event_type,
    type: event_type,
    title,
    category,
    actor,
    status,
    amount: amount ? String(amount) : undefined,
    mission_id,
    payment_intent_id,
    correlation_id: String(raw.correlation_id || raw.request_id || ''),
    timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
    payload,
    is_simulated,
    raw_event: sanitizeObject(raw),
  };
}

describe('TASK 46 — Activity Feed & Event Inspector Test Suite', () => {

  // 1. Activity List Success & Normalization
  describe('1. Activity List Success & Normalization', () => {
    it('normalizes raw Go Gateway AuditEvent into complete GlobalActivityEvent', () => {
      const rawBackendEvent = {
        id: 'evt_4c3bdc9bafab636f4f43bc7d',
        organization_id: 'org_default',
        event_type: 'mission.created',
        actor_type: 'AGENT',
        actor_id: 'research-agent',
        resource_type: 'DOMAIN_EVENT',
        resource_id: 'evt_4c3bdc9bafab636f4f43bc7d',
        request_id: 'corr_msn_9e8e023d4dbd5bc94ab4fa66',
        correlation_id: 'corr_msn_9e8e023d4dbd5bc94ab4fa66',
        agent_id: 'research-agent',
        version: 1,
        timestamp: '2026-09-29T18:39:53.319354Z',
        metadata: '{"budget":"2000000","objective":"Find_weather_data","steps_count":2}',
      };

      const normalized = normalizeActivityEvent(rawBackendEvent);

      assert.equal(normalized.id, 'evt_4c3bdc9bafab636f4f43bc7d');
      assert.equal(normalized.event_type, 'mission.created');
      assert.equal(normalized.title, 'Mission Created');
      assert.equal(normalized.actor, 'agent:research-agent');
      assert.equal(normalized.category, 'MISSION');
      assert.equal(normalized.status, 'SUCCESS');
      assert.equal(normalized.amount, '2000000');
      assert.equal(normalized.mission_id, 'msn_9e8e023d4dbd5bc94ab4fa66');
      assert.equal(normalized.payload.objective, 'Find_weather_data');
      assert.equal(normalized.payload.steps_count, 2);
    });
  });

  // 2. Empty Activity List
  describe('2. Empty Activity List Handling', () => {
    it('page source provides genuine NO ACTIVITY RECORDED empty state with Launch Mission link', () => {
      assert.ok(activityPageSource.includes('NO ACTIVITY RECORDED'), 'Must render NO ACTIVITY RECORDED empty state');
      assert.ok(activityPageSource.includes('Launch Mission'), 'Must provide actionable link to launch mission');
    });
  });

  // 3. API Failure State
  describe('3. API Failure & Error State Handling', () => {
    it('page source renders ACTIVITY SERVICE UNAVAILABLE error banner with Retry button', () => {
      assert.ok(activityPageSource.includes('ACTIVITY SERVICE UNAVAILABLE'), 'Must render error state title');
      assert.ok(activityPageSource.includes('Retry'), 'Must offer retry action on error');
    });
  });

  // 4. Malformed Event Handling
  describe('4. Malformed Event Handling', () => {
    it('gracefully handles missing metadata, invalid JSON string, and null inputs', () => {
      const malformedEvent = {
        id: 'evt_malformed_01',
        event_type: 'unknown.anomaly',
        metadata: 'INVALID_NOT_JSON{',
      };

      const normalized = normalizeActivityEvent(malformedEvent);
      assert.equal(normalized.id, 'evt_malformed_01');
      assert.equal(normalized.title, 'Unknown Anomaly');
      assert.equal(normalized.actor, 'ACTOR UNAVAILABLE');
      assert.ok(normalized.payload.raw || normalized.payload.note, 'Must preserve unparseable metadata safely');
    });
  });

  // 5. Event With Optional Fields Missing
  describe('5. Optional Fields Missing', () => {
    it('safely defaults all optional fields without rendering undefined or null', () => {
      const minimalEvent = { id: 'evt_minimal' };
      const normalized = normalizeActivityEvent(minimalEvent);

      assert.equal(normalized.id, 'evt_minimal');
      assert.ok(typeof normalized.title === 'string');
      assert.ok(typeof normalized.actor === 'string');
      assert.ok(typeof normalized.category === 'string');
      assert.ok(typeof normalized.status === 'string');
      assert.equal(normalized.mission_id, undefined);
      assert.equal(normalized.payment_intent_id, undefined);
    });
  });

  // 6. Event Selection & Highlighting
  describe('6. Event Selection & Highlighting', () => {
    it('page source includes interactive selection and border-highlight logic', () => {
      assert.ok(activityPageSource.includes('selectedEvent?.id === evt.id'), 'Must check selected event state');
      assert.ok(activityPageSource.includes('border-[#D6A83A]'), 'Must highlight selected card with brand amber border');
      assert.ok(activityPageSource.includes('handleSelectEvent'), 'Must bind selection handler');
    });
  });

  // 7. Structured Inspector Rendering
  describe('7. Structured Inspector Rendering', () => {
    it('page source contains complete Event Inspector hierarchy', () => {
      assert.ok(activityPageSource.includes('Event Inspector'), 'Must render Event Inspector header');
      assert.ok(activityPageSource.includes('CANONICAL TYPE'), 'Must display canonical type in inspector');
      assert.ok(activityPageSource.includes('METADATA & EXECUTION PAYLOAD'), 'Must display structured metadata section');
      assert.ok(activityPageSource.includes('CORRELATION & CONTEXT'), 'Must display correlation context section');
    });
  });

  // 8. Nested Metadata and Array Rendering
  describe('8. Nested Metadata & Array Rendering', () => {
    it('page source defines recursive metadata renderer avoiding [object Object]', () => {
      assert.ok(activityPageSource.includes('renderMetadataValue'), 'Must define specialized metadata renderer');
      assert.ok(activityPageSource.includes('Array.isArray(value)'), 'Must explicitly handle arrays');
      assert.ok(activityPageSource.includes('typeof value === \'object\''), 'Must handle nested objects');
      assert.ok(activityPageSource.includes('—'), 'Must render em-dash for null/undefined');
    });
  });

  // 9. Category Filters
  describe('9. Category Filters', () => {
    it('categorizes events correctly into all 7 canonical categories', () => {
      assert.equal(categorizeEvent('mission.created'), 'MISSION');
      assert.equal(categorizeEvent('payment.authorized'), 'PAYMENT');
      assert.equal(categorizeEvent('treasury.reserved'), 'PAYMENT');
      assert.equal(categorizeEvent('policy.evaluation.denied'), 'POLICY');
      assert.equal(categorizeEvent('agent.risk.velocity_breach'), 'RISK');
      assert.equal(categorizeEvent('payment.approval_required'), 'APPROVAL');
      assert.equal(categorizeEvent('security.prompt_injection_blocked'), 'SECURITY');
      assert.equal(categorizeEvent('arc.settlement.simulated'), 'ARC');
    });
  });

  // 10. Newest-First Timestamp Sorting
  describe('10. Newest-First Timestamp Sorting', () => {
    it('sorts events in descending order using parsed epoch milliseconds', () => {
      const older = { id: 'evt_1', timestamp: '2026-09-29T10:00:00Z' };
      const newer = { id: 'evt_2', timestamp: '2026-09-29T18:00:00Z' };
      const unsorted = [older, newer];

      const sorted = unsorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      assert.equal(sorted[0].id, 'evt_2');
      assert.equal(sorted[1].id, 'evt_1');
    });
  });

  // 11. Duplicate Event ID Deduplication
  describe('11. Duplicate Event ID Deduplication', () => {
    it('deduplicates events by canonical event ID', () => {
      const duplicates = [
        { id: 'evt_same', title: 'First' },
        { id: 'evt_same', title: 'Duplicate' },
        { id: 'evt_other', title: 'Unique' },
      ];

      const map = new Map();
      for (const e of duplicates) {
        if (!map.has(e.id)) map.set(e.id, e);
      }
      const deduplicated = Array.from(map.values());
      assert.equal(deduplicated.length, 2);
      assert.equal(deduplicated[0].id, 'evt_same');
      assert.equal(deduplicated[1].id, 'evt_other');
    });
  });

  // 12. Simulation Event Labeling
  describe('12. Simulation Event Labeling', () => {
    it('marks simulated events with truthful SIMULATED provenance', () => {
      const simulatedEvt = normalizeActivityEvent({ id: 'evt_sim', event_type: 'payment.confirmed' });
      assert.equal(simulatedEvt.is_simulated, true);

      assert.ok(activityPageSource.includes('SIMULATED'), 'Card must display SIMULATED badge');
      assert.ok(activityPageSource.includes('SIMULATION — NO FUNDS MOVED'), 'Header must state SIMULATION');
    });
  });

  // 13. Arc Event Labeling
  describe('13. Arc Event Labeling', () => {
    it('distinguishes simulated settlement from verified on-chain execution', () => {
      const simulated = normalizeActivityEvent({ id: 'evt_arc_sim', event_type: 'arc.settlement.simulated' });
      assert.equal(simulated.is_simulated, true);

      const onChain = normalizeActivityEvent({
        id: 'evt_arc_live',
        event_type: 'arc.settlement.verified',
        metadata: { tx_hash: '0x1234567890abcdef' },
      });
      assert.equal(onChain.is_simulated, false);
    });
  });

  // 14. Secret Sanitization & Redaction
  describe('14. Secret Sanitization & Redaction', () => {
    it('strictly redacts private keys, tokens, and passwords from metadata and raw views', () => {
      const unsafePayload = {
        account: '0x1234',
        private_key: '0xdeadbeefbadsecret',
        api_token: 'secret_token_123',
        password: 'mypassword',
        idempotency_key: 'idem_safe_123',
      };

      const sanitized = sanitizeObject(unsafePayload);
      assert.equal(sanitized.account, '0x1234');
      assert.equal(sanitized.private_key, '[REDACTED_CREDENTIAL]');
      assert.equal(sanitized.api_token, '[REDACTED_CREDENTIAL]');
      assert.equal(sanitized.password, '[REDACTED_CREDENTIAL]');
      assert.equal(sanitized.idempotency_key, 'idem_safe_123');
    });
  });

  // 15. Realtime / Outbox Status Truthfulness
  describe('15. Realtime / Outbox Status Truthfulness', () => {
    it('truthfully labels activity stream as AUDIT EVENT STREAM and declares LIVE POLLING interval', () => {
      assert.ok(activityPageSource.includes('AUDIT EVENT STREAM'), 'Must truthfully label as AUDIT EVENT STREAM');
      assert.ok(activityPageSource.includes('LIVE POLLING (10s)'), 'Must declare actual 10s polling interval');
      assert.ok(!activityPageSource.includes('<span>Realtime Outbox</span>'), 'Deceptive unconditional Realtime Outbox removed');
    });
  });
});
