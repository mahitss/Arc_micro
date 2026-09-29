/**
 * @file normalizer.ts
 * @description Canonical Activity Event Normalization & Sanitization Engine.
 * Transforms raw Go Gateway AuditEvents into safe, fully-populated, truthful UI events.
 */

import type { GlobalActivityEvent } from '../api/types';

// Sensitive key pattern to redact from raw payloads and metadata
const SENSITIVE_KEY_REGEX = /(private[-_]?key|secret|token|password|credential|auth[-_]?header|bearer|apiKey|deployer[-_]?key)/i;

/**
 * Maps raw backend AuditEventType strings to clean, human-readable titles.
 */
export function formatEventTitle(eventType: string): string {
  if (!eventType) return 'System Event';

  const knownTitles: Record<string, string> = {
    // Mission events
    'mission.created': 'Mission Created',
    'mission.started': 'Mission Started',
    'mission.executing': 'Mission Executing',
    'mission.step_started': 'Mission Step Started',
    'mission.step_completed': 'Mission Step Completed',
    'mission.completed': 'Mission Completed',
    'mission.failed': 'Mission Execution Failed',
    'mission.aborted': 'Mission Aborted',

    // Payment intent events
    'payment.created': 'Payment Intent Created',
    'payment.authorized': 'Payment Authorized',
    'payment.denied': 'Payment Denied',
    'payment.approval_required': 'Approval Required',
    'payment.approved': 'Payment Approved',
    'payment.rejected': 'Payment Rejected',
    'payment.approval_expired': 'Approval Window Expired',
    'payment.submitted': 'Payment Submitted to Settlement Buffer',
    'payment.confirmed': 'Payment Confirmed',
    'payment.failed': 'Payment Settlement Failed',

    // Treasury events
    'treasury.reserved': 'Treasury Liquidity Reserved',
    'treasury.released': 'Treasury Liquidity Released',
    'treasury.settled': 'Treasury Settlement Recorded',

    // Policy & Security events
    'policy.updated': 'Spending Policy Updated',
    'policy.evaluation.allowed': 'Policy Evaluation Passed',
    'policy.evaluation.denied': 'Policy Evaluation Denied',
    'security.prompt_injection_blocked': 'Prompt Injection Blocked',
    'security.violation': 'Security Boundary Violation',
    'security.ssrf_blocked': 'SSRF Attempt Blocked',

    // Agent Marketplace events
    'agent.created': 'Agent Identity Registered',
    'agent.updated': 'Agent Configuration Updated',
    'agent.paused': 'Agent Circuit Breaker Tripped',
    'agent.resumed': 'Agent Resumed',
    'agent.task.started': 'Autonomous Task Started',
    'agent.task.completed': 'Autonomous Task Completed',
    'agent.service.discovered': 'Service Discovered in Marketplace',
    'agent.quote.requested': 'Service Quote Requested',
    'agent.quote.received': 'Service Quote Received',
    'agent.service.selected': 'Service Counterparty Selected',
    'agent.budget.checked': 'Agent Budget Verified',
    'agent.payment.requested': 'Agent Payment Requested',
    'agent.payment.authorized': 'Agent Payment Authorized',
    'agent.payment.denied': 'Agent Payment Policy Denied',
    'agent.payment.approval_required': 'Agent Payment Approval Required',
    'agent.payment.confirmed': 'Agent Payment Confirmed',

    // Arc on-chain settlement events
    'arc.settlement.simulated': 'Arc Settlement Simulated',
    'arc.settlement.verified': 'Arc On-Chain Settlement Verified',
    'arc.rpc.connected': 'Arc RPC Connection Established',
  };

  if (knownTitles[eventType]) {
    return knownTitles[eventType];
  }

  // Fallback: convert dot/underscore separated tokens into Title Case
  return eventType
    .split(/[._]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Categorizes an event into one of the canonical 7 filter categories.
 */
export function categorizeEvent(
  eventType: string,
  resourceType?: string,
  explicitCategory?: string
): 'MISSION' | 'PAYMENT' | 'POLICY' | 'RISK' | 'APPROVAL' | 'SECURITY' | 'ARC' | 'MISSION' {
  if (explicitCategory) {
    const upper = explicitCategory.toUpperCase();
    if (['MISSION', 'PAYMENT', 'POLICY', 'RISK', 'APPROVAL', 'SECURITY', 'ARC'].includes(upper)) {
      return upper as any;
    }
  }

  const type = (eventType || '').toLowerCase();
  const res = (resourceType || '').toUpperCase();

  // 1. Approval
  if (type.includes('approval') || res === 'APPROVAL') {
    return 'APPROVAL';
  }

  // 2. Security
  if (
    type.includes('security') ||
    type.includes('injection') ||
    type.includes('violation') ||
    type.includes('ssrf') ||
    type.includes('untrusted') ||
    res === 'SECURITY'
  ) {
    return 'SECURITY';
  }

  // 3. Risk
  if (type.includes('risk') || type.includes('anomaly') || type.includes('velocity') || res === 'RISK') {
    return 'RISK';
  }

  // 4. Policy
  if (type.includes('policy') || res === 'POLICY') {
    return 'POLICY';
  }

  // 5. Arc Settlement
  if (type.includes('arc') || type.includes('settlement') || res === 'ARC') {
    return 'ARC';
  }

  // 6. Payment & Treasury
  if (
    type.startsWith('payment') ||
    type.includes('.payment.') ||
    type.startsWith('treasury') ||
    res === 'PAYMENT_INTENT' ||
    res === 'TREASURY'
  ) {
    return 'PAYMENT';
  }

  // 7. Mission & Task
  if (type.startsWith('mission') || type.startsWith('agent.task') || res === 'MISSION' || res === 'DOMAIN_EVENT') {
    return 'MISSION';
  }

  return 'MISSION';
}

/**
 * Derives a truthful semantic execution status.
 */
export function deriveEventStatus(
  explicitStatus?: string,
  eventType?: string
): 'SUCCESS' | 'PENDING' | 'BLOCKED' | 'FAILED' | 'INFO' {
  if (explicitStatus) {
    const s = explicitStatus.toUpperCase();
    if (['SUCCESS', 'PENDING', 'BLOCKED', 'FAILED', 'INFO'].includes(s)) {
      return s as any;
    }
    if (s === 'ALLOWED' || s === 'COMPLETED' || s === 'CONFIRMED' || s === 'EXECUTED') return 'SUCCESS';
    if (s === 'DENIED' || s === 'HARD_DENY') return 'BLOCKED';
    if (s === 'REJECTED' || s === 'ERROR') return 'FAILED';
  }

  const type = (eventType || '').toLowerCase();
  if (type.includes('denied') || type.includes('blocked') || type.includes('violation')) {
    return 'BLOCKED';
  }
  if (type.includes('failed') || type.includes('rejected') || type.includes('expired')) {
    return 'FAILED';
  }
  if (type.includes('approval_required') || type.includes('pending') || type.includes('requested')) {
    return 'PENDING';
  }
  if (
    type.includes('confirmed') ||
    type.includes('authorized') ||
    type.includes('created') ||
    type.includes('completed') ||
    type.includes('allowed') ||
    type.includes('reserved') ||
    type.includes('settled')
  ) {
    return 'SUCCESS';
  }

  return 'INFO';
}

/**
 * Derives originating subsystem source for telemetry and causality tracking.
 */
export function deriveEventSource(eventType: string, actorType?: string): string {
  const type = (eventType || '').toLowerCase();
  if (type.includes('policy')) return 'Policy Engine';
  if (type.includes('treasury')) return 'Treasury Orchestrator';
  if (type.includes('arc') || type.includes('settlement')) return 'Arc Settlement';
  if (type.includes('security') || type.includes('ssrf')) return 'Security Boundary';
  if (type.includes('clearing') || type.includes('netting')) return 'Clearinghouse';
  if (type.includes('marketplace') || type.includes('quote')) return 'Service Marketplace';
  if (type.startsWith('mission')) return 'Mission Runtime';

  if (actorType === 'AGENT') return 'Autonomous Agent';
  if (actorType === 'USER') return 'Operator Command';
  return 'Gateway API';
}

/**
 * Recursively redacts sensitive security keys from raw payloads and metadata.
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Preserve standard safe IDs even if they contain words like "key" (e.g. idempotency_key, request_id)
    if (key === 'idempotency_key' || key === 'key_hash' || key === 'masked_key') {
      sanitized[key] = value;
    } else if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED_CREDENTIAL]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Parses raw metadata string or object safely without throwing.
 */
export function parseMetadata(rawMetadata: any): Record<string, any> {
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

/**
 * Normalizes any raw backend or fixture event into the canonical GlobalActivityEvent.
 */
export function normalizeActivityEvent(raw: any): GlobalActivityEvent {
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
      financial_mode: 'SIMULATION',
    };
  }

  // 1. Identifiers
  const id = String(raw.id || raw.event_id || `evt_${Math.random().toString(36).substring(2, 9)}`);
  const event_type = String(raw.event_type || raw.type || 'system.event');
  const type = event_type;
  const title = formatEventTitle(event_type);

  // 2. Metadata / Payload
  const rawPayload = parseMetadata(raw.payload ?? raw.metadata);
  const payload = sanitizeObject(rawPayload);

  // 3. Actor Extraction
  let actor = 'ACTOR UNAVAILABLE';
  if (raw.actor) {
    actor = String(raw.actor);
  } else if (raw.actor_id) {
    actor = raw.actor_type ? `${raw.actor_type.toLowerCase()}:${raw.actor_id}` : String(raw.actor_id);
  } else if (raw.agent_id) {
    actor = `agent:${raw.agent_id}`;
  } else if (raw.actor_type === 'SYSTEM' || raw.resource_type === 'SYSTEM') {
    actor = 'SYSTEM';
  } else if (payload.actor) {
    actor = String(payload.actor);
  }

  // 4. Category & Status
  const category = categorizeEvent(event_type, raw.resource_type, raw.category);
  const status = deriveEventStatus(raw.status, event_type);
  const source = deriveEventSource(event_type, raw.actor_type);

  // 5. Context Identifiers
  let mission_id: string | undefined = raw.mission_id || payload.mission_id;
  if (!mission_id && raw.correlation_id && typeof raw.correlation_id === 'string' && raw.correlation_id.includes('msn_')) {
    const match = raw.correlation_id.match(/msn_[a-zA-Z0-9_]+/);
    if (match) mission_id = match[0];
  }
  if (!mission_id && raw.resource_id && typeof raw.resource_id === 'string' && raw.resource_id.startsWith('msn_')) {
    mission_id = raw.resource_id;
  }

  const payment_intent_id = raw.payment_intent_id || raw.payment_id || payload.payment_intent_id || payload.payment_id;
  const payment_id = payment_intent_id;
  const correlation_id = String(raw.correlation_id || raw.request_id || '');
  const causation_id = raw.causation_id ? String(raw.causation_id) : undefined;
  const approval_id = raw.approval_id || payload.approval_id;
  const execution_id = raw.execution_id || payload.execution_id;

  // 6. Financial Amount Extraction
  let amount: string | undefined = raw.amount || payload.amount || payload.budget || payload.spent || payload.base_units;
  let formatted_amount: string | undefined;
  if (amount) {
    const num = parseInt(String(amount), 10);
    if (!isNaN(num)) {
      formatted_amount = `$${(num / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
    }
  }

  // 7. Contextual Description
  let description = '';
  if (payload.objective) {
    description = String(payload.objective);
  } else if (payload.reason) {
    description = String(payload.reason);
  } else if (payload.service) {
    description = `Service: ${payload.service}`;
  } else if (payload.decision) {
    description = `Decision: ${payload.decision}`;
  } else if (payload.summary) {
    description = String(payload.summary);
  } else if (mission_id) {
    description = `Mission context: ${mission_id}`;
  }

  // 8. Timestamp
  let timestamp = new Date().toISOString();
  let display_time = '';
  if (raw.timestamp) {
    const parsedDate = new Date(raw.timestamp);
    if (!isNaN(parsedDate.getTime())) {
      timestamp = parsedDate.toISOString();
      display_time = parsedDate.toLocaleTimeString();
    }
  }

  // 9. Financial Provenance (Truthfulness Invariant: SIMULATION unless verified on-chain)
  const is_simulated = !payload.tx_hash && !raw.tx_hash;
  const financial_mode: 'SIMULATION' | 'VERIFIED' | 'PROJECTED' = is_simulated ? 'SIMULATION' : 'VERIFIED';

  // 10. Sanitized Raw Event for Inspector
  const raw_event = sanitizeObject(raw);

  return {
    id,
    event_type,
    type,
    title,
    description,
    category,
    source,
    actor,
    actor_id: raw.actor_id,
    actor_type: raw.actor_type,
    agent_id: raw.agent_id,
    status,
    financial_mode,
    is_simulated,
    amount: amount ? String(amount) : undefined,
    formatted_amount,
    currency: raw.currency || payload.currency || 'USDC',
    mission_id,
    payment_intent_id,
    payment_id,
    execution_id,
    approval_id,
    correlation_id,
    causation_id,
    request_id: raw.request_id,
    resource_type: raw.resource_type,
    resource_id: raw.resource_id,
    version: raw.version,
    timestamp,
    display_time,
    payload,
    raw_metadata: typeof raw.metadata === 'string' ? raw.metadata : undefined,
    raw_event,
  };
}
