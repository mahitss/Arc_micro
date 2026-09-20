import type {
  Agent,
  AgentDetail,
  Approval,
  DomainEvent,
  PaymentIntent,
  PaymentIntentDetail,
  RegisteredService,
  TransactionRecord,
  WebhookEndpoint,
} from '@agentpay/sdk';

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function formatUsdc(amountBaseUnits: string): string {
  try {
    const num = Number(amountBaseUnits);
    if (isNaN(num)) return `${amountBaseUnits} USDC`;
    return `${(num / 1e6).toFixed(2)} USDC`;
  } catch {
    return `${amountBaseUnits} USDC`;
  }
}

export function printPaymentIntent(detail: PaymentIntentDetail | PaymentIntent): void {
  const pi = 'intent' in detail ? detail.intent : detail;
  console.log('Payment Intent');
  console.log('──────────────────────────────────────────────────');
  console.log(`ID:           ${pi.id}`);
  console.log(`Status:       ${pi.status}`);
  console.log(`Amount:       ${formatUsdc(pi.amount)} (${pi.amount} base units)`);
  console.log(`Asset:        ${pi.asset}`);
  console.log(`Agent:        ${pi.agent_id}`);
  console.log(`Service:      ${pi.service}`);
  console.log(`Recipient:    ${pi.recipient}`);
  if (pi.purpose) {
    console.log(`Purpose:      ${pi.purpose}`);
  }
  if (pi.decision) {
    console.log(`Decision:     ${pi.decision.result} (Risk: ${pi.decision.risk || 'N/A'})`);
    if (pi.decision.reason) {
      console.log(`Reason:       ${pi.decision.reason}`);
    }
  }
  if ('transaction_hash' in detail && detail.transaction_hash) {
    console.log(`Tx Hash:      ${detail.transaction_hash}`);
  }
  console.log(`Created At:   ${pi.created_at}`);
  console.log('──────────────────────────────────────────────────');
}

export function printPaymentIntentsList(intents: PaymentIntent[]): void {
  if (intents.length === 0) {
    console.log('No payment intents found.');
    return;
  }
  console.log('ID                        STATUS             AMOUNT        AGENT            SERVICE');
  console.log('────────────────────────────────────────────────────────────────────────────────────────');
  for (const pi of intents) {
    const id = pi.id.padEnd(25);
    const status = pi.status.padEnd(18);
    const amount = formatUsdc(pi.amount).padEnd(13);
    const agent = pi.agent_id.padEnd(16);
    const service = pi.service;
    console.log(`${id} ${status} ${amount} ${agent} ${service}`);
  }
}

export function printAgentsList(agents: Agent[]): void {
  if (agents.length === 0) {
    console.log('No agents found.');
    return;
  }
  console.log('ID                        NAME                       STATUS');
  console.log('──────────────────────────────────────────────────────────────────────');
  for (const a of agents) {
    const id = a.id.padEnd(25);
    const name = a.name.padEnd(26);
    const status = a.status;
    console.log(`${id} ${name} ${status}`);
  }
}

export function printAgentDetail(agent: AgentDetail): void {
  console.log('Agent Detail');
  console.log('──────────────────────────────────────────────────');
  console.log(`ID:           ${agent.id}`);
  console.log(`Name:         ${agent.name}`);
  console.log(`Status:       ${agent.status}`);
  console.log(`Vault:        ${agent.vault_address}`);
  console.log(`Network:      ${agent.network}`);
  console.log(`Balance:      ${agent.usdc_balance} USDC`);
  if (agent.policy) {
    console.log('Policy:');
    if (agent.policy.per_transaction_limit) {
      console.log(`  Per-Tx Limit:      ${formatUsdc(String(agent.policy.per_transaction_limit))}`);
    }
    if (agent.policy.daily_spending_limit) {
      console.log(`  Daily Limit:       ${formatUsdc(String(agent.policy.daily_spending_limit))}`);
    }
    if (agent.policy.remaining_daily_limit) {
      console.log(`  Remaining Daily:   ${formatUsdc(String(agent.policy.remaining_daily_limit))}`);
    }
  }
  console.log('──────────────────────────────────────────────────');
}

export function printServicesList(services: RegisteredService[]): void {
  if (services.length === 0) {
    console.log('No registered services found.');
    return;
  }
  console.log('ID                   NAME                      MAX PRICE     ASSET  ENABLED');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  for (const s of services) {
    const id = s.id.padEnd(20);
    const name = s.name.padEnd(25);
    const maxPrice = formatUsdc(s.max_price).padEnd(13);
    const asset = s.asset.padEnd(6);
    const enabled = s.enabled ? 'Yes' : 'No';
    console.log(`${id} ${name} ${maxPrice} ${asset} ${enabled}`);
  }
}

export function printApprovalsList(approvals: Approval[]): void {
  if (approvals.length === 0) {
    console.log('No pending approvals found.');
    return;
  }
  console.log('ID                        INTENT ID                 STATUS    AMOUNT        AGENT');
  console.log('────────────────────────────────────────────────────────────────────────────────────────');
  for (const a of approvals) {
    const id = a.id.padEnd(25);
    const intentId = a.intent_id.padEnd(25);
    const status = a.status.padEnd(9);
    const amount = formatUsdc(a.amount).padEnd(13);
    const agent = a.agent_id;
    console.log(`${id} ${intentId} ${status} ${amount} ${agent}`);
  }
}

export function printTransactionsList(transactions: TransactionRecord[]): void {
  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }
  console.log('INTENT ID                 STATUS             TX HASH');
  console.log('──────────────────────────────────────────────────────────────────────────────');
  for (const t of transactions) {
    const intentId = t.intent_id.padEnd(25);
    const status = t.status.padEnd(18);
    const hash = t.transaction_hash || '(pending)';
    console.log(`${intentId} ${status} ${hash}`);
  }
}

export function printEventsList(events: DomainEvent[]): void {
  if (events.length === 0) {
    console.log('No events found.');
    return;
  }
  console.log('ID                   TYPE                         ACTOR      OCCURRED AT');
  console.log('──────────────────────────────────────────────────────────────────────────────────');
  for (const e of events) {
    const id = e.id.padEnd(20);
    const type = e.type.padEnd(28);
    const actor = (e.actor_type || 'SYSTEM').padEnd(10);
    const time = e.occurred_at;
    console.log(`${id} ${type} ${actor} ${time}`);
  }
}

export function printWebhooksList(endpoints: WebhookEndpoint[]): void {
  if (endpoints.length === 0) {
    console.log('No webhook endpoints registered.');
    return;
  }
  console.log('ID                   STATUS   FAILURES  URL');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  for (const w of endpoints) {
    const id = w.id.padEnd(20);
    const status = (w.enabled ? 'ACTIVE' : 'DISABLED').padEnd(8);
    const failures = String(w.failure_count || 0).padEnd(9);
    const url = w.url;
    console.log(`${id} ${status} ${failures} ${url}`);
  }
}
