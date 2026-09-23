import type {
  Agent,
  AgentBudget,
  AgentDetail,
  AgentQuote,
  AgentService,
  Approval,
  ContextualPerformance,
  DomainEvent,
  EconomicGraph,
  Hire,
  MissionIntelligence,
  PaymentIntent,
  PaymentIntentDetail,
  PaymentTrace,
  RegisteredService,
  ReplanProposal,
  ServiceAnomaliesResponse,
  ServicePerformance,
  ServiceQuote,
  SimulateSwarmResponse,
  SimulationResponse,
  SimulationRun,
  CounterfactualComparison,
  MonteCarloSummary,
  LiveExecutionPayload,
  Swarm,
  SwarmGraph,
  SwarmRiskScore,
  SwarmTrace,
  TaskNode,
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
  console.log('ID                   NAME                      CATEGORY    PRICE         TRUST      STATUS');
  console.log('─────────────────────────────────────────────────────────────────────────────────────────────');
  for (const s of services) {
    const id = s.id.padEnd(20);
    const name = s.name.padEnd(25);
    const category = (s.category || 'GENERAL').padEnd(11);
    const price = formatUsdc(s.fixed_price || s.max_price).padEnd(13);
    const trust = (s.trust_status || 'VERIFIED').padEnd(10);
    const enabled = s.enabled ? 'ACTIVE' : 'DISABLED';
    console.log(`${id} ${name} ${category} ${price} ${trust} ${enabled}`);
  }
}

export function printQuote(quote: ServiceQuote): void {
  console.log('Service Quote');
  console.log('──────────────────────────────────────────────────');
  console.log(`Quote ID:     ${quote.quote_id}`);
  console.log(`Service:      ${quote.service_id}`);
  console.log(`Amount:       ${formatUsdc(quote.amount)} (${quote.amount} base units)`);
  console.log(`Asset:        ${quote.asset}`);
  console.log(`Expires At:   ${quote.expires_at}`);
  console.log('──────────────────────────────────────────────────');
}

export function printAgentBudget(budget: AgentBudget): void {
  console.log('Agent Budget & Spending Limits');
  console.log('──────────────────────────────────────────────────');
  console.log(`Agent ID:           ${budget.agent_id}`);
  console.log(`Available Budget:   ${formatUsdc(budget.available_budget)} (${budget.available_budget} base units)`);
  console.log(`Remaining Daily:    ${formatUsdc(budget.remaining_daily_limit)} (${budget.remaining_daily_limit} base units)`);
  console.log(`Daily Limit:        ${formatUsdc(budget.daily_limit)} (${budget.daily_limit} base units)`);
  console.log(`Daily Spent:        ${formatUsdc(budget.daily_spent)} (${budget.daily_spent} base units)`);
  console.log(`Per-Payment Limit:  ${formatUsdc(budget.payment_limit)} (${budget.payment_limit} base units)`);
  console.log('──────────────────────────────────────────────────');
}

export function printSimulationResult(sim: SimulationResponse): void {
  console.log('Financial Dry-Run Simulation Result');
  console.log('──────────────────────────────────────────────────');
  console.log(`Simulation ID:      ${sim.simulation_id}`);
  console.log(`Predicted Outcome:  ${sim.predicted_outcome}`);
  console.log(`Policy Decision:    ${sim.policy_decision}`);
  console.log(`Risk Level:         ${sim.risk_level}`);
  console.log(`Approval Required:  ${sim.approval_required ? 'YES' : 'NO'}`);
  console.log(`Treasury Feasible:  ${sim.treasury_sufficient ? 'YES' : 'NO'}`);
  if (sim.reason) {
    console.log(`Reason / Details:   ${sim.reason}`);
  }
  console.log(`Evaluated At:       ${sim.evaluated_at}`);
  console.log('──────────────────────────────────────────────────');
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

export function printPaymentTrace(trace: PaymentTrace): void {
  console.log('Payment Flight Recorder Trace');
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log(`Trace ID:       ${trace.trace_id}`);
  console.log(`Intent ID:      ${trace.payment_intent_id}`);
  console.log(`Status:         ${trace.status}`);
  console.log(`Execution Mode: ${trace.execution_mode} ${trace.execution_mode === 'SIMULATION' ? '(Simulation - Zero Real USDC)' : '(Live Arc Settlement)'}`);
  console.log(`Agent ID:       ${trace.agent_id}`);
  console.log(`Organization:   ${trace.organization_id}`);
  console.log('──────────────────────────────────────────────────────────────────────────────');
  console.log('Summary:');
  console.log(`  Amount:       ${formatUsdc(trace.payment_summary?.amount || '0')} (${trace.payment_summary?.amount || '0'} base units)`);
  console.log(`  Asset:        ${trace.payment_summary?.asset || 'USDC'}`);
  console.log(`  Service:      ${trace.payment_summary?.service_id || 'N/A'}`);
  console.log(`  Recipient:    ${trace.payment_summary?.recipient || 'N/A'}`);
  console.log(`  Purpose:      ${trace.payment_summary?.purpose || 'N/A'}`);
  if (trace.payment_summary?.request_id) {
    console.log(`  Request ID:   ${trace.payment_summary.request_id} (Idempotency Key)`);
  }

  if (trace.policy_evidence) {
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log('Policy & Risk Evidence:');
    console.log(`  Decision:     ${trace.policy_evidence.decision}`);
    console.log(`  Reason Code:  ${trace.policy_evidence.reason_code}`);
    if (trace.policy_evidence.risk_level) {
      console.log(`  Risk Level:   ${trace.policy_evidence.risk_level} (Score: ${trace.policy_evidence.risk_score ?? 'N/A'})`);
    }
  }

  if (trace.blockchain_evidence && trace.blockchain_evidence.transaction_hash) {
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log('Blockchain Evidence:');
    console.log(`  Tx Hash:      ${trace.blockchain_evidence.transaction_hash}`);
    console.log(`  Chain ID:     ${trace.blockchain_evidence.chain_id || '5042'}`);
    console.log(`  Explorer:     ${trace.blockchain_evidence.explorer_url || 'N/A'}`);
  }

  console.log('──────────────────────────────────────────────────────────────────────────────');
  console.log('Lifecycle Trail:');
  for (const step of trace.steps || []) {
    const num = String(step.step_number).padStart(2);
    const type = step.type.padEnd(24);
    const status = step.status.padEnd(10);
    const actor = (step.actor || 'SYSTEM').padEnd(16);
    console.log(`  [${num}] ${type} ${status} ${actor} ${step.timestamp}`);
  }
}

export function printAgentServicesList(services: AgentService[]): void {
  if (services.length === 0) {
    console.log('No peer agents or services discovered.');
    return;
  }
  console.log(`Discovered Agent Services (${services.length})`);
  console.log('──────────────────────────────────────────────────────────────────────────────');
  console.log(
    'AGENT ID'.padEnd(20) +
    'SERVICE ID'.padEnd(22) +
    'BASE PRICE'.padEnd(14) +
    'AVAILABILITY'.padEnd(14) +
    'REPUTATION'
  );
  console.log('──────────────────────────────────────────────────────────────────────────────');
  for (const s of services) {
    const aid = (s.agent_id || '').padEnd(20);
    const sid = (s.service_id || '').padEnd(22);
    const price = formatUsdc(s.base_price || '0').padEnd(14);
    const avail = (s.availability || 'ONLINE').padEnd(14);
    const rep = `${((s.reputation || 0) / 100).toFixed(1)}%`;
    console.log(`${aid}${sid}${price}${avail}${rep}`);
  }
}

export function printAgentQuote(quote: AgentQuote): void {
  console.log('Agent-to-Agent Quote');
  console.log('──────────────────────────────────────────────────');
  console.log(`Quote ID:     ${quote.quote_id}`);
  console.log(`Service:      ${quote.service_id}`);
  console.log(`Buyer Agent:  ${quote.buyer_agent_id}`);
  console.log(`Seller Agent: ${quote.seller_agent_id}`);
  console.log(`Status:       ${quote.status}`);
  console.log(`Price:        ${formatUsdc(quote.price)} (${quote.price} base units)`);
  console.log(`Asset:        ${quote.asset}`);
  console.log(`Quality:      ${(quote.quality / 100).toFixed(1)}%`);
  console.log(`Latency:      ${quote.estimated_latency_ms} ms`);
  console.log(`Valid Until:  ${quote.valid_until}`);
  if (quote.negotiation_rounds && quote.negotiation_rounds.length > 0) {
    console.log('──────────────────────────────────────────────────');
    console.log('Negotiation Rounds:');
    for (const r of quote.negotiation_rounds) {
      console.log(`  Round ${r.round} [${r.proposer_agent_id}]: ${formatUsdc(r.proposed_price)} (${r.status})`);
    }
  }
}

export function printHire(hire: Hire): void {
  console.log('Agent Hire Agreement');
  console.log('──────────────────────────────────────────────────');
  console.log(`Hire ID:       ${hire.id}`);
  console.log(`Status:        ${hire.status}`);
  console.log(`Buyer Agent:   ${hire.buyer_agent_id}`);
  console.log(`Seller Agent:  ${hire.seller_agent_id}`);
  console.log(`Service:       ${hire.service_id}`);
  console.log(`Price:         ${formatUsdc(hire.price)} (${hire.price} base units)`);
  console.log(`Call Depth:    ${hire.call_depth} (Max allowed: 3)`);
  console.log(`Mission ID:    ${hire.mission_id}`);
  if (hire.payment_intent_id) {
    console.log(`Payment Intent:${hire.payment_intent_id}`);
  }
  if (hire.expected_result) {
    console.log(`Expected:      ${hire.expected_result}`);
  }
  if (hire.result) {
    console.log('──────────────────────────────────────────────────');
    console.log('Result Received:');
    console.log(`  Status:      ${hire.result.status}`);
    console.log(`  Type:        ${hire.result.result_type}`);
    console.log(`  SHA-256:     ${hire.result.checksum_sha256}`);
    console.log(`  Execution:   ${hire.result.execution_time_ms} ms`);
  }
}

export function printEconomicGraph(graph: EconomicGraph): void {
  console.log(`Economic Network Graph — Mission ${graph.mission_id}`);
  console.log('──────────────────────────────────────────────────────────────────────────────');
  console.log(`Nodes: ${graph.nodes.length} | Edges: ${graph.edges.length}`);
  console.log('Vertices:');
  for (const n of graph.nodes) {
    console.log(`  [${n.type.padEnd(8)}] ${n.id.padEnd(24)} ${n.label}`);
  }
  console.log('Relationships:');
  for (const e of graph.edges) {
    console.log(`  ${e.source} ──(${e.type})──> ${e.target}`);
  }
}

export function printServicePerformance(perf: ServicePerformance): void {
  console.log('Service Performance');
  console.log('──────────────────────────────────────────────────');
  console.log(`Service ID:        ${perf.service_id}`);
  console.log(`Window:            ${perf.window}`);
  console.log(`Success Rate:      ${(perf.success_rate_bps / 100).toFixed(1)}% (${perf.success_rate_bps} bps)`);
  console.log(`Total Jobs:        ${perf.total_jobs}`);
  console.log(`Average Latency:   ${perf.average_latency_ms}ms`);
  console.log(`Confidence:        ${perf.confidence}`);
  if (perf.contextual_breakdown) {
    console.log('Capabilities:');
    for (const [cap, ctxPerf] of Object.entries(perf.contextual_breakdown)) {
      const c = ctxPerf as ContextualPerformance;
      console.log(`  - ${cap}: ${(c.success_rate_bps / 100).toFixed(1)}% success (${c.total_jobs} jobs, ${c.average_latency_ms}ms)`);
    }
  }
}

export function printServiceAnomalies(res: ServiceAnomaliesResponse): void {
  console.log('Service Health & Anomalies');
  console.log('──────────────────────────────────────────────────');
  console.log(`Service ID:        ${res.service_id}`);
  console.log(`Circuit Breaker:   ${res.circuit_breaker_status}`);
  console.log(`Anomalies Count:   ${res.anomalies.length}`);
  for (const anom of res.anomalies) {
    console.log(`  [${anom.severity}] ${anom.anomaly_type}: ${anom.details} (observed: ${anom.observed_value})`);
  }
}

export function printMissionIntelligence(intel: MissionIntelligence): void {
  console.log('Mission Intelligence Telemetry');
  console.log('──────────────────────────────────────────────────');
  console.log(`Mission ID:        ${intel.mission_id}`);
  console.log(`Status:            ${intel.status}`);
  console.log(`Recovery Attempts: ${intel.recovery_attempts} / ${intel.max_recovery_attempts}`);
  console.log(`Confidence:        ${intel.confidence}`);
  console.log(`Learning Events:   ${intel.learning_trace.length}`);
  for (const trace of intel.learning_trace) {
    console.log(`  [${trace.timestamp}] ${trace.event}: ${trace.details}`);
  }
}

export function printReplanProposal(prop: ReplanProposal): void {
  console.log('Replan Recovery Proposal');
  console.log('──────────────────────────────────────────────────');
  console.log(`Mission ID:        ${prop.mission_id}`);
  console.log(`Strategy:          ${prop.strategy}`);
  console.log(`Reason:            ${prop.reason}`);
  console.log(`Estimated Cost:    ${formatUsdc(prop.estimated_cost)}`);
  console.log(`Confidence:        ${prop.confidence}`);
  console.log(`Requires Human:    ${prop.requires_human ? 'YES' : 'NO'}`);
  console.log(`Explanation:       ${prop.explanation}`);
}

export function printSwarm(sw: Swarm): void {
  console.log('Swarm Details');
  console.log('──────────────────────────────────────────────────');
  console.log(`ID:                ${sw.id}`);
  console.log(`Name:              ${sw.name}`);
  console.log(`Objective:         ${sw.objective}`);
  console.log(`Status:            ${sw.status}`);
  console.log(`Max Budget:        ${formatUsdc(sw.max_budget)} (${sw.max_budget} base units)`);
  console.log(`Total Spent:       ${formatUsdc(sw.total_spent)}`);
  console.log(`Total Reserved:    ${formatUsdc(sw.total_reserved)}`);
  console.log(`Asset:             ${sw.asset}`);
  console.log(`Orchestrator:      ${sw.orchestrator_agent_id}`);
  console.log(`Tasks:             ${sw.completed_tasks} / ${sw.task_count} completed (${sw.failed_tasks} failed)`);
  if (sw.deadline) {
    console.log(`Deadline:          ${sw.deadline}`);
  }
  if (sw.cost_intelligence) {
    console.log('Cost Intelligence:');
    console.log(`  - Allocated:     ${formatUsdc(sw.cost_intelligence.allocated_budget)}`);
    console.log(`  - Committed:     ${formatUsdc(sw.cost_intelligence.committed_spend)}`);
    console.log(`  - Utilization:   ${sw.cost_intelligence.budget_utilization_pct.toFixed(1)}%`);
    console.log(`  - Projected:     ${formatUsdc(sw.cost_intelligence.projected_final_cost)}`);
  }
}

export function printSwarmTasks(tasks: TaskNode[]): void {
  console.log(`Swarm Tasks (${tasks.length})`);
  console.log('──────────────────────────────────────────────────');
  for (const t of tasks) {
    console.log(`[${t.status}] ${t.id} (Depth ${t.depth})`);
    console.log(`  Title:       ${t.title}`);
    console.log(`  Role:        ${t.role}`);
    console.log(`  Capability:  ${t.required_capability}`);
    console.log(`  Budget:      ${formatUsdc(t.budget)} (Spent: ${formatUsdc(t.actual_cost)})`);
    if (t.dependencies && t.dependencies.length > 0) {
      console.log(`  Depends on:  ${t.dependencies.join(', ')}`);
    }
    if (t.assigned_agent_id) {
      console.log(`  Assigned:    ${t.assigned_agent_id}`);
    }
    if (t.critic_feedback) {
      console.log(`  Critic:      Score ${t.critic_feedback.score}/100 (${t.critic_feedback.passed ? 'PASSED' : 'FAILED'})`);
    }
  }
}

export function printSwarmGraph(g: SwarmGraph): void {
  console.log('Swarm Directed Economic Network DAG');
  console.log('──────────────────────────────────────────────────');
  console.log(`DAG Valid:     ${g.is_dag ? 'YES' : 'NO'}`);
  console.log(`Max Depth:     ${g.depth}`);
  console.log(`Nodes Count:   ${g.nodes.length}`);
  console.log(`Edges Count:   ${g.edges.length}`);
  console.log('Nodes:');
  for (const n of g.nodes) {
    console.log(`  - [${n.type}] ${n.id} : ${n.label} (${n.status || 'N/A'})`);
  }
  if (g.edges.length > 0) {
    console.log('Edges:');
    for (const e of g.edges) {
      console.log(`  - ${e.from} ──[${e.type}]──> ${e.to}`);
    }
  }
}

export function printSwarmTrace(trace: SwarmTrace): void {
  console.log(`Swarm Trace (${trace.events.length} events)`);
  console.log('──────────────────────────────────────────────────');
  for (const ev of trace.events) {
    console.log(`[${ev.timestamp}] ${ev.event_type}${ev.task_id ? ` (Task: ${ev.task_id})` : ''}${ev.agent_id ? ` (Agent: ${ev.agent_id})` : ''}`);
  }
}

export function printSwarmRisk(risk: SwarmRiskScore): void {
  console.log('Swarm Risk Assessment');
  console.log('──────────────────────────────────────────────────');
  console.log(`Overall Score:   ${risk.overall_score}/100`);
  console.log(`Risk Level:      ${risk.risk_level}`);
  console.log(`Budget Exhaustion Risk:       ${risk.budget_exhaustion_risk}/100`);
  console.log(`Dependency Bottleneck Risk:   ${risk.dependency_bottleneck_risk}/100`);
  console.log(`Agent Reliability Risk:       ${risk.agent_reliability_risk}/100`);
  console.log(`Data Tampering Risk:          ${risk.data_tampering_risk}/100`);
  if (risk.recommendations && risk.recommendations.length > 0) {
    console.log('Recommendations:');
    for (const rec of risk.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

export function printSimulateSwarm(sim: SimulateSwarmResponse): void {
  console.log('Swarm Simulation Result (Zero Broadcast)');
  console.log('──────────────────────────────────────────────────');
  console.log(`Valid DAG:         ${sim.is_valid_dag ? 'YES' : 'NO'}`);
  console.log(`Tasks:             ${sim.task_count}`);
  console.log(`Max Depth:         ${sim.max_depth}`);
  console.log(`Estimated Cost:    ${formatUsdc(sim.estimated_cost)} (${sim.estimated_cost} base units)`);
  console.log(`Estimated Latency: ${sim.estimated_latency_ms}ms`);
  console.log(`Risk Level:        ${sim.risk_score.risk_level} (Score: ${sim.risk_score.overall_score}/100)`);
}

export function printSimulationRun(run: SimulationRun): void {
  console.log('============================================================');
  console.log('AGENTPAY ECONOMIC SIMULATION (PREVIEW ONLY — ZERO REAL USDC)');
  console.log('============================================================');
  console.log(`Simulation ID:      ${run.id}`);
  console.log(`Status:             ${run.status}`);
  console.log(`Mode:               ${run.execution_mode} (Strictly Isolated Digital Twin)`);
  console.log(`Deterministic Seed: ${run.seed}`);
  console.log(`Duration:           ${run.duration_ms}ms`);
  console.log(`Summary:            ${run.summary}`);
  console.log('');
  console.log('PROJECTED ECONOMICS:');
  console.log(`  Projected Spend:    ${formatUsdc(run.economics.projected_spend)}`);
  console.log(`  Remaining Budget:   ${formatUsdc(run.economics.remaining_budget)}`);
  console.log(`  Payments Planned:   ${run.economics.number_of_payments}`);
  console.log(`  Approvals Required: ${run.economics.approval_count}`);
  console.log(`  Projected Risk:     ${run.economics.risk_score}/100`);
  console.log('');
  console.log('WORST-CASE EXPOSURE:');
  console.log(`  Maximum Exposure:   ${formatUsdc(run.exposure.maximum_exposure)}`);
  console.log(`  Exposure Formula:   ${run.exposure.exposure_formula}`);
  console.log(`  Explanation:        ${run.exposure.explanation}`);
  console.log('');
  console.log(`EXECUTION PLAN STEPS (${run.plan.steps.length}):`);
  for (const step of run.plan.steps) {
    console.log(`  [Step ${step.step_number}] ${step.step_id}: ${step.service_name} (${step.capability})`);
    console.log(`    Estimated Cost:   ${formatUsdc(step.estimated_cost)}`);
    console.log(`    Policy Decision:  ${step.policy_decision} (${step.policy_reason_code})`);
    console.log(`    Risk Assessment:  ${step.risk_level}`);
    if (step.approval_required) {
      console.log('    >> APPROVAL REQUIRED BEFORE REAL EXECUTION <<');
    }
  }
  console.log('============================================================');
}

export function printCounterfactualComparison(comp: CounterfactualComparison): void {
  console.log('============================================================');
  console.log('AGENTPAY COUNTERFACTUAL WHAT-IF COMPARISON');
  console.log('============================================================');
  console.log(`Perturbation:       ${comp.perturbation_description}`);
  console.log(`Baseline Run:       ${comp.baseline_run_id}`);
  console.log(`Counterfactual Run: ${comp.counterfactual_run_id}`);
  console.log('');
  console.log('COMPARATIVE TELEMETRY:');
  console.log(`  Baseline Spend:     ${formatUsdc(comp.baseline_spend)}`);
  console.log(`  Counterfact Spend:  ${formatUsdc(comp.counterfactual_spend)}`);
  console.log(`  Spend Delta:        ${comp.delta_spend} USDC`);
  console.log(`  Approvals Delta:    ${comp.delta_approvals > 0 ? '+' : ''}${comp.delta_approvals}`);
  console.log(`  Risk Change:        ${comp.risk_change}`);
  console.log(`  Duration Delta:     ${comp.counterfactual_duration_ms - comp.baseline_duration_ms}ms`);
  console.log(`  Explanation:        ${comp.explanation}`);
  console.log('============================================================');
}

export function printMonteCarloSummary(summary: MonteCarloSummary): void {
  console.log('============================================================');
  console.log('AGENTPAY ECONOMIC MONTE CARLO DISTRIBUTION');
  console.log('============================================================');
  console.log(`Notice:             ${summary.model_notice}`);
  console.log(`Iterations:         ${summary.run_count} seeded runs`);
  console.log(`Completion Rate:    ${(summary.completion_rate * 100).toFixed(1)}%`);
  console.log('');
  console.log('STATISTICAL SPEND DISTRIBUTION (USD):');
  console.log(`  Average Spend:      $${summary.average_spend}`);
  console.log(`  Min Spend:          $${summary.minimum_spend}`);
  console.log(`  Max Spend:          $${summary.maximum_spend}`);
  console.log(`  P50 Median:         $${summary.p50_spend}`);
  console.log(`  P90 Percentile:     $${summary.p90_spend}`);
  console.log(`  P95 Percentile:     $${summary.p95_spend}`);
  console.log(`  Avg Duration:       ${summary.avg_duration_ms}ms`);
  console.log('============================================================');
}

export function printExecutePlanPayload(res: LiveExecutionPayload): void {
  console.log('============================================================');
  console.log('LIVE PLAN PREPARATION & REVALIDATION RESULT');
  console.log('============================================================');
  console.log(`Status:             ${res.status}`);
  console.log(`Mode:               ${res.mode}`);
  console.log(`Plan ID:            ${res.payload.plan_id}`);
  console.log(`Original Run ID:    ${res.payload.original_run_id}`);
  console.log(`Fresh Live Budget:  ${formatUsdc(res.payload.fresh_budget)}`);
  console.log(`Total Live Cost:    ${formatUsdc(res.payload.total_live_cost)}`);
  console.log(`Max Live Exposure:  ${formatUsdc(res.payload.max_live_exposure)}`);
  console.log(`Live Policy Check:  ${res.payload.policy_decision}`);
  console.log(`Requires Approval:  ${res.payload.requires_approval}`);
  console.log(`Prepared At:        ${res.payload.prepared_at}`);
  console.log('============================================================');
}



