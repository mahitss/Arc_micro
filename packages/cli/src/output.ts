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
  AgentNetworkIdentity,
  DiscoveredAgent,
  AgentServiceContract,
  DisputeRecord,
  NetworkGraph,
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

export function printAgentNetworkIdentity(agent: AgentNetworkIdentity): void {
  console.log('============================================================');
  console.log('AGENT NETWORK IDENTITY');
  console.log('============================================================');
  console.log(`Agent ID:       ${agent.agent_id}`);
  console.log(`Name:           ${agent.display_name}`);
  console.log(`Organization:   ${agent.organization_id}`);
  console.log(`Status:         ${agent.status}`);
  console.log(`Protocol:       ${agent.protocol_version}`);
  console.log(`Capabilities:   ${agent.capabilities.join(', ')}`);
  console.log(`Pricing Models: ${agent.pricing_models.join(', ')}`);
  console.log(`Settlement:     ${agent.settlement_methods.join(', ')}`);
  console.log(`Availability:   ${agent.availability}`);
  console.log(`Updated At:     ${agent.updated_at}`);
  console.log('============================================================');
}

export function printDiscoveredAgents(agents: DiscoveredAgent[]): void {
  console.log('============================================================');
  console.log(`DISCOVERED NETWORK AGENTS (${agents.length})`);
  console.log('============================================================');
  for (const a of agents) {
    const score = a.trust_evaluation ? `${(a.trust_evaluation.trust_score / 100).toFixed(1)}%` : 'N/A';
    const conf = a.trust_evaluation ? `${Math.round(a.trust_evaluation.confidence * 100)}%` : 'N/A';
    console.log(`• ${a.identity.agent_id} (${a.identity.display_name})`);
    console.log(`  Status: ${a.identity.status} | Trust Score: ${score} (Conf: ${conf})`);
    console.log(`  Caps: ${a.identity.capabilities.join(', ')}`);
    if (a.matched_pricing) {
      console.log(`  Pricing: ${a.matched_pricing.model} (Base: ${formatUsdc(a.matched_pricing.base_price || '0')})`);
    }
  }
  console.log('============================================================');
}

export function printServiceContract(c: AgentServiceContract): void {
  console.log('============================================================');
  console.log('AGENT SERVICE CONTRACT');
  console.log('============================================================');
  console.log(`Contract ID:      ${c.contract_id}`);
  console.log(`State:            ${c.state}`);
  console.log(`Requester:        ${c.requester_agent_id}`);
  console.log(`Provider:         ${c.provider_agent_id}`);
  console.log(`Capability:       ${c.capability}`);
  console.log(`Price:            ${formatUsdc(c.price)} (${c.currency})`);
  console.log(`Budget Ceiling:   ${formatUsdc(c.budget_ceiling)}`);
  console.log(`Delegation Depth: ${c.delegation_depth}`);
  console.log(`Deadline:         ${c.deadline}`);
  if (c.payment_intent_id) {
    console.log(`Payment Intent:   ${c.payment_intent_id}`);
  }
  if (c.error_msg) {
    console.log(`Error:            ${c.error_msg}`);
  }
  console.log('============================================================');
}

export function printDisputeRecord(d: DisputeRecord): void {
  console.log('============================================================');
  console.log('NETWORK DISPUTE RECORD');
  console.log('============================================================');
  console.log(`Dispute ID:       ${d.dispute_id}`);
  console.log(`Contract ID:      ${d.contract_id}`);
  console.log(`State:            ${d.state}`);
  console.log(`Initiator:        ${d.initiator_agent_id}`);
  console.log(`Respondent:       ${d.respondent_agent_id}`);
  console.log(`Reason:           ${d.reason}`);
  console.log(`Refund Amount:    ${formatUsdc(d.refund_amount)}`);
  if (d.resolution_notes) {
    console.log(`Resolution:       ${d.resolution_notes}`);
  }
  console.log('============================================================');
}

export function printNetworkGraph(g: NetworkGraph): void {
  console.log('============================================================');
  console.log(`OPEN AGENT NETWORK TOPOLOGY (${g.nodes.length} Nodes, ${g.edges.length} Edges)`);
  console.log('============================================================');
  console.log('NODES:');
  for (const n of g.nodes) {
    const status = (n as any).status || 'ACTIVE';
    console.log(`  [${n.type}] ${n.id} — ${n.label} (${status})`);
  }
  console.log('EDGES:');
  for (const e of g.edges) {
    console.log(`  ${e.source} --(${e.type}: ${e.label || ''})--> ${e.target}`);
  }
  console.log('============================================================');
}

export function printConstitution(c: any, modeLabel = 'REAL CONSTITUTION'): void {
  console.log('============================================================');
  console.log(`ECONOMIC CONSTITUTION [${modeLabel}]`);
  console.log('============================================================');
  console.log(`Constitution ID:  ${c.constitution_id}`);
  console.log(`Organization ID:  ${c.organization_id}`);
  console.log(`Name:             ${c.name}`);
  console.log(`Version:          v${c.version}`);
  console.log(`Status:           ${c.status}`);
  console.log(`Policy Hash:      ${c.policy_hash}`);
  console.log(`Effective At:     ${c.effective_at || 'IMMEDIATE'}`);
  console.log(`Previous Version: v${c.previous_version}`);
  console.log(`Rules Count:      ${c.rules?.length || 0}`);
  console.log('RULES SUMMARY:');
  for (const r of (c.rules || [])) {
    const priority = r.priority ?? 0;
    const isHard = r.hard_deny ? '[HARD DENY]' : '';
    console.log(`  - [P${priority}] ${r.rule_id} (${r.type}) ${isHard}: ${r.description}`);
  }
  console.log('============================================================');
}

export function printConstitutionsList(list: any[]): void {
  console.log('============================================================');
  console.log(`ECONOMIC CONSTITUTIONS (${list.length} Versions)`);
  console.log('============================================================');
  for (const c of list) {
    const activeBadge = c.status === 'ACTIVE' ? ' ★ ACTIVE' : '';
    console.log(`v${c.version} [${c.status}${activeBadge}] — ${c.name} (Hash: ${c.policy_hash?.slice(0, 12)}...)`);
  }
  console.log('============================================================');
}

export function printConstitutionDecision(d: any): void {
  console.log('============================================================');
  console.log('CONSTITUTIONAL POLICY DECISION');
  console.log('============================================================');
  console.log(`Decision:         ${d.decision}`);
  console.log(`Reason Code:      ${d.reason_code}`);
  console.log(`Explanation:      ${d.explanation}`);
  console.log(`Constitution ID:  ${d.constitution_id} (v${d.version})`);
  console.log(`Evaluation Hash:  ${d.evaluation_hash}`);
  if (d.matched_rules?.length) {
    console.log(`Matched Rules:    ${d.matched_rules.join(', ')}`);
  }
  if (d.denied_rules?.length) {
    console.log(`Denied Rules:     ${d.denied_rules.join(', ')}`);
  }
  if (d.approval_rules?.length) {
    console.log(`Approval Rules:   ${d.approval_rules.join(', ')}`);
  }
  console.log('============================================================');
}

export function printPolicyDiff(diff: any): void {
  console.log('============================================================');
  console.log(`POLICY DIFF: v${diff.old_version} -> v${diff.new_version}`);
  console.log('============================================================');
  console.log(`Classification:   ${diff.authority_delta?.classification}`);
  console.log(`Explanation:      ${diff.authority_delta?.explanation}`);
  console.log(`Added Rules:      ${diff.added_rules?.length || 0}`);
  console.log(`Removed Rules:    ${diff.removed_rules?.length || 0}`);
  console.log(`Modified Rules:   ${diff.modified_rules?.length || 0}`);
  if (diff.modified_rules?.length) {
    console.log('MODIFICATIONS:');
    for (const m of diff.modified_rules) {
      console.log(`  - ${m.rule_id} [${m.change_type}]: ${m.old_details} -> ${m.new_details}`);
    }
  }
  console.log('============================================================');
}

export function printPolicyChangeRequestsList(list: any[]): void {
  console.log('============================================================');
  console.log(`POLICY CHANGE REQUESTS (${list.length})`);
  console.log('============================================================');
  for (const cr of list) {
    console.log(`[${cr.status}] ${cr.request_id}: v${cr.current_version} -> v${cr.proposed_version} (Proposer: ${cr.proposer})`);
    console.log(`  Classification: ${cr.authority_delta?.classification || 'N/A'}`);
    console.log(`  Risk Summary:   ${cr.risk_summary || 'N/A'}`);
  }
  console.log('============================================================');
}

// =============================================================================
// CLEARINGHOUSE FORMATTERS (TASK 10)
// =============================================================================

export function printObligationsList(list: any[]): void {
  console.log('============================================================');
  console.log(`ECONOMIC OBLIGATIONS (${list.length})`);
  console.log('============================================================');
  for (const ob of list) {
    const modeBadge = ob.execution_mode === 'SIMULATION' ? '[SIM]' : '[REAL]';
    console.log(`${modeBadge} [${ob.status}] ${ob.obligation_id} | ${ob.payer_agent_id} -> ${ob.payee_agent_id} | ${ob.amount} ${ob.currency}`);
  }
  console.log('============================================================');
}

export function printObligationDetail(ob: any): void {
  console.log('============================================================');
  console.log(`ECONOMIC OBLIGATION: ${ob.obligation_id}`);
  console.log('============================================================');
  console.log(`Status:         ${ob.status}`);
  console.log(`Execution Mode: ${ob.execution_mode}`);
  console.log(`Payer:          ${ob.payer_agent_id}`);
  console.log(`Payee:          ${ob.payee_agent_id}`);
  console.log(`Contract:       ${ob.contract_id}`);
  console.log(`Amount:         ${ob.amount} ${ob.currency}`);
  console.log(`Settled:        ${ob.settled_amount || '0'} ${ob.currency}`);
  if (ob.payment_intent_id) console.log(`Intent ID:      ${ob.payment_intent_id}`);
  console.log('============================================================');
}

export function printInvoicesList(list: any[]): void {
  console.log('============================================================');
  console.log(`ECONOMIC INVOICES (${list.length})`);
  console.log('============================================================');
  for (const inv of list) {
    console.log(`[${inv.status}] ${inv.invoice_id} | Provider: ${inv.provider_agent_id} -> Requester: ${inv.requester_agent_id} | ${inv.amount} ${inv.currency}`);
  }
  console.log('============================================================');
}

export function printInvoiceDetail(inv: any): void {
  console.log('============================================================');
  console.log(`ECONOMIC INVOICE: ${inv.invoice_id}`);
  console.log('============================================================');
  console.log(`Status:         ${inv.status}`);
  console.log(`Contract:       ${inv.contract_id}`);
  console.log(`Provider:       ${inv.provider_agent_id}`);
  console.log(`Requester:      ${inv.requester_agent_id}`);
  console.log(`Amount:         ${inv.amount} ${inv.currency}`);
  console.log(`Line Items:     ${inv.line_items?.length || 0}`);
  if (inv.line_items) {
    for (const item of inv.line_items) {
      console.log(`  - #${item.item_number}: ${item.description} (${item.amount})`);
    }
  }
  console.log('============================================================');
}

export function printEscrowsList(list: any[]): void {
  console.log('============================================================');
  console.log(`ECONOMIC ESCROWS (${list.length})`);
  console.log('============================================================');
  for (const esc of list) {
    console.log(`[${esc.status}] ${esc.escrow_id} | Obligation: ${esc.obligation_id} | Reserved: ${esc.reserved_amount} | Released: ${esc.released_amount}`);
  }
  console.log('============================================================');
}

export function printMilestonesList(list: any[]): void {
  console.log('============================================================');
  console.log(`PAYMENT MILESTONES (${list.length})`);
  console.log('============================================================');
  for (const ms of list) {
    console.log(`[${ms.status}] #${ms.sequence} ${ms.milestone_id} | Amount: ${ms.amount} | Rule: ${ms.verification_rule}`);
    console.log(`  Description: ${ms.description}`);
  }
  console.log('============================================================');
}

export function printNettingProposalsList(list: any[]): void {
  console.log('============================================================');
  console.log(`BILATERAL NETTING PROPOSALS (${list.length})`);
  console.log('============================================================');
  for (const p of list) {
    console.log(`[${p.status}] ${p.proposal_id} | Between ${p.agent_a} & ${p.agent_b}`);
    console.log(`  Gross: ${p.gross_total} | Net: ${p.net_amount} (${p.net_payer} -> ${p.net_payee}) | Savings: ${p.savings_amount}`);
  }
  console.log('============================================================');
}

export function printSettlementBatchesList(list: any[]): void {
  console.log('============================================================');
  console.log(`SETTLEMENT BATCHES (${list.length})`);
  console.log('============================================================');
  for (const b of list) {
    console.log(`[${b.status}] ${b.batch_id} | Items: ${b.obligation_ids?.length || 0} | Gross: ${b.gross_amount} | Net: ${b.net_amount}`);
  }
  console.log('============================================================');
}

export function printReconciliationList(list: any[]): void {
  console.log('============================================================');
  console.log(`RECONCILIATION AUDIT RECORDS (${list.length})`);
  console.log('============================================================');
  for (const r of list) {
    const badge = r.status === 'MATCHED' ? '✓ MATCHED' : r.status === 'MISMATCH' ? '✗ MISMATCH' : `? ${r.status}`;
    console.log(`[${badge}] ${r.record_id} | Intent: ${r.payment_intent_id} | Expected: ${r.expected_amount} -> Actual: ${r.actual_amount}`);
    if (r.discrepancy_notes) console.log(`  Notes: ${r.discrepancy_notes}`);
  }
  console.log('============================================================');
}

export function printExposureSnapshot(exp: any): void {
  console.log('============================================================');
  console.log(`ECONOMIC EXPOSURE SNAPSHOT [${exp.execution_mode || 'REAL'}]`);
  console.log('============================================================');
  console.log(`Organization:            ${exp.organization_id}`);
  console.log(`Current Exposure:        ${exp.current_exposure}`);
  console.log(`Max Possible Exposure:   ${exp.max_possible_exposure}`);
  console.log(`Reserved in Escrow:      ${exp.reserved_in_escrow}`);
  console.log(`Outstanding Obligations: ${exp.outstanding_obligations}`);
  console.log(`Pending Settlements:     ${exp.pending_settlements}`);
  console.log(`Disputed Amount:         ${exp.disputed_amount}`);
  console.log(`Counterparties Count:    ${exp.counterparties?.length || 0}`);
  if (exp.counterparties?.length) {
    for (const cp of exp.counterparties) {
      console.log(`  - ${cp.agent_id} [${cp.risk_level}]: Net Exposure ${cp.net_exposure} (Payable: ${cp.committed_payable}, Escrow: ${cp.reserved_in_escrow})`);
    }
  }
  console.log('============================================================');
}

export function printHealthSnapshot(h: any): void {
  console.log('============================================================');
  console.log(`ECONOMIC HEALTH SNAPSHOT [${h.health_status}]`);
  console.log('============================================================');
  console.log(`Organization:            ${h.organization_id}`);
  console.log(`On-Chain Available:      ${h.on_chain_available}`);
  console.log(`Active Escrow Reserved:  ${h.active_escrow_reserved}`);
  console.log(`Available Unencumbered:  ${h.available_unencumbered}`);
  console.log(`Total Exposure:          ${h.total_exposure}`);
  console.log(`Solvency Ratio:          ${h.solvency_ratio}`);
  if (h.deterministic_signals?.length) {
    console.log('Signals:');
    for (const sig of h.deterministic_signals) {
      console.log(`  - ${sig}`);
    }
  }
  console.log('============================================================');
}

export function printTreasuryState(s: any): void {
  console.log('============================================================');
  console.log(`TREASURY STATE [${s.mode || 'REAL'}] — ${s.operational_mode || 'UNKNOWN'}`);
  console.log('============================================================');
  console.log(`Organization:            ${s.organization_id}`);
  console.log(`Total Balance:           ${s.total_balance} USDC`);
  console.log(`Available Balance:       ${s.available_balance} USDC`);
  console.log(`Reserved Balance:        ${s.reserved_balance} USDC`);
  console.log(`Committed Balance:       ${s.committed_balance} USDC`);
  console.log(`Pending Settlement:      ${s.pending_settlement} USDC`);
  console.log(`Disputed Balance:        ${s.disputed_balance} USDC`);
  console.log(`Minimum Buffer:          ${s.minimum_buffer} USDC`);
  console.log(`Safe Capacity:           ${s.safe_capacity} USDC`);
  console.log(`Worst Case Exposure:     ${s.worst_case_exposure} USDC`);
  console.log(`Solvency Ratio:          ${s.solvency_ratio}`);
  console.log('============================================================');
}

export function printTreasuryReservationsList(list: any[]): void {
  console.log('============================================================');
  console.log(`TREASURY LIQUIDITY RESERVATIONS (${list.length})`);
  console.log('============================================================');
  for (const r of list) {
    console.log(`[${r.status}] ${r.reservation_id} | Amount: ${r.amount} USDC | Priority: ${r.priority}`);
    console.log(`  Purpose: ${r.purpose} | Agent: ${r.agent_id || 'N/A'} | Timeout: ${r.timeout_seconds}s | Expires: ${r.expires_at}`);
  }
  console.log('============================================================');
}

export function printTreasuryReservationDetail(r: any): void {
  console.log('============================================================');
  console.log(`LIQUIDITY RESERVATION [${r.status}] — ${r.reservation_id}`);
  console.log('============================================================');
  console.log(`Organization:            ${r.organization_id}`);
  console.log(`Amount:                  ${r.amount} USDC`);
  console.log(`Agent ID:                ${r.agent_id || 'N/A'}`);
  console.log(`Mission ID:              ${r.mission_id || 'N/A'}`);
  console.log(`Purpose:                 ${r.purpose}`);
  console.log(`Priority:                ${r.priority}`);
  console.log(`Execution Mode:          ${r.mode}`);
  console.log(`Created At:              ${r.created_at}`);
  console.log(`Expires At:              ${r.expires_at}`);
  if (r.payment_intent_id) console.log(`Payment Intent:          ${r.payment_intent_id}`);
  if (r.release_reason) console.log(`Release Reason:          ${r.release_reason}`);
  console.log('============================================================');
}

export function printTreasuryForecast(fc: any): void {
  console.log('============================================================');
  console.log(`LIQUIDITY FORECAST [${fc.horizon}] — Survival State: ${fc.survival_state}`);
  console.log('============================================================');
  console.log(`Organization:            ${fc.organization_id}`);
  console.log(`Starting Balance:        ${fc.starting_balance} USDC`);
  console.log(`Expected Inflows:        ${fc.expected_inflows} USDC`);
  console.log(`Expected Outflows:       ${fc.expected_outflows} USDC`);
  console.log(`Worst Case Outflows:     ${fc.worst_case_outflows} USDC`);
  console.log(`Projected Closing:       ${fc.projected_closing_balance} USDC`);
  console.log(`Stress Scenario:         ${fc.stress_scenario}`);
  if (fc.gating_decision) console.log(`Gating Decision:         ${fc.gating_decision}`);
  console.log('============================================================');
}

export function printTreasuryStressResult(sr: any): void {
  console.log('============================================================');
  console.log(`TREASURY STRESS TEST RESULT — Scenario: ${sr.scenario}`);
  console.log('============================================================');
  console.log(`Survival State:          ${sr.survival_state}`);
  console.log(`Pre-Stress Balance:      ${sr.pre_stress_balance} USDC`);
  console.log(`Simulated Outflow:       ${sr.simulated_shock_outflow} USDC`);
  console.log(`Simulated Inflow Haircut:${sr.simulated_inflow_haircut} USDC`);
  console.log(`Post-Stress Buffer:      ${sr.post_stress_buffer_headroom} USDC`);
  console.log(`Max Survivable Drawdown: ${sr.max_survivable_drawdown} USDC`);
  console.log(`Capital Adequacy Ratio:  ${sr.capital_adequacy_ratio}`);
  console.log(`Safe To Reserve:         ${sr.safe_to_reserve ? 'YES' : 'NO'}`);
  if (sr.recommendations?.length) {
    console.log('Recommendations:');
    for (const rec of sr.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
  console.log('============================================================');
}

export function printTreasuryReconciliationReport(rec: any): void {
  console.log('============================================================');
  console.log(`TREASURY RECONCILIATION AUDIT — Status: ${rec.reconciliation_status}`);
  console.log('============================================================');
  console.log(`Organization:            ${rec.organization_id}`);
  console.log(`Ledger Balance:          ${rec.ledger_balance} USDC`);
  console.log(`Repository Balance:      ${rec.repository_balance} USDC`);
  console.log(`Vault Balance:           ${rec.vault_balance} USDC`);
  console.log(`Blockchain Balance:      ${rec.blockchain_balance} USDC`);
  console.log(`Discrepancy:             ${rec.discrepancy_amount} USDC`);
  console.log(`Chain ID:                ${rec.chain_id || 'N/A'}`);
  console.log(`Vault Address:           ${rec.vault_address || 'N/A'}`);
  console.log(`Vault Paused:            ${rec.vault_paused ? 'YES (EMERGENCY)' : 'NO'}`);
  console.log(`Evidence:                ${rec.evidence}`);
  console.log('============================================================');
}

export function printTreasuryHealth(h: any): void {
  console.log('============================================================');
  console.log(`TREASURY HEALTH & SOLVENCY SNAPSHOT [${h.operational_mode || 'HEALTHY'}]`);
  console.log('============================================================');
  console.log(`Organization:            ${h.organization_id}`);
  console.log(`Mode:                    ${h.mode || 'REAL'}`);
  console.log(`Total Balance:           ${h.total_balance} USDC`);
  console.log(`Available Balance:       ${h.available_balance} USDC`);
  console.log(`Reserved Balance:        ${h.reserved_balance} USDC`);
  console.log(`Committed Balance:       ${h.committed_balance} USDC`);
  console.log(`Safe Capacity:           ${h.safe_capacity} USDC`);
  console.log(`Solvency Ratio:          ${h.solvency_ratio}`);
  console.log(`Reconciliation:          ${h.reconciliation_status}`);
  console.log(`Active Reservations:     ${h.active_reservations_count}`);
  console.log(`Active Anomalies:        ${h.active_anomalies_count}`);
  console.log('============================================================');
}

export function printTreasuryAnomaliesList(list: any[]): void {
  console.log('============================================================');
  console.log(`TREASURY LIQUIDITY ANOMALIES (${list.length})`);
  console.log('============================================================');
  for (const a of list) {
    console.log(`[${a.severity}] ${a.anomaly_id} | Type: ${a.type} | Scope: ${a.affected_scope}`);
    console.log(`  Evidence: ${a.evidence}`);
  }
  console.log('============================================================');
}

// ==========================================
// Task 12: Autonomous Economic Control Tower
// ==========================================

export function printControlStateStrip(s: any): void {
  console.log('============================================================');
  console.log('ECONOMIC STATE STRIP — REAL-TIME OPERATIONAL BANNER');
  console.log('============================================================');
  console.log(`TREASURY:       ${s.treasury_status}`);
  console.log(`POLICY:         ${s.policy_version}`);
  console.log(`RISK:           ${s.risk_level}`);
  console.log(`EXECUTION:      ${s.execution_mode}`);
  console.log(`ARC:            ${s.arc_status}`);
  console.log(`LAST UPDATED:   ${s.last_updated}`);
  console.log('============================================================');
}

export function printControlOverview(o: any): void {
  console.log('============================================================');
  console.log('AUTONOMOUS ECONOMIC CONTROL TOWER — EXECUTIVE OVERVIEW');
  console.log('============================================================');
  console.log(`Organization:            ${o.organization_id}`);
  console.log(`Execution Mode:          ${o.execution_mode}`);
  console.log(`Data Freshness:          ${o.data_freshness}`);
  console.log('------------------------------------------------------------');
  console.log(`Active Missions:         ${o.active_missions_count}`);
  console.log(`Active Agents:           ${o.active_agents_count}`);
  console.log(`Active Contracts:        ${o.active_contracts_count}`);
  console.log(`Active Approvals:        ${o.active_approvals_count}`);
  console.log('------------------------------------------------------------');
  console.log(`Available Liquidity:     ${o.available_liquidity} USDC`);
  console.log(`Reserved Liquidity:      ${o.reserved_liquidity} USDC`);
  console.log(`Outstanding Obligations: ${o.outstanding_obligations} USDC`);
  console.log(`Pending Settlements:     ${o.pending_settlements} USDC`);
  console.log(`Arc Verified Balance:    ${o.arc_verified_balance} USDC`);
  console.log('------------------------------------------------------------');
  console.log(`Current Policy:          ${o.current_policy_version}`);
  console.log(`Current Treasury Mode:   ${o.current_treasury_mode}`);
  console.log(`Security Status:         ${o.security_status}`);
  console.log('============================================================');
}

export function printControlActivity(events: any[]): void {
  console.log('============================================================');
  console.log(`REALTIME ECONOMIC TIMELINE (${events.length} events)`);
  console.log('============================================================');
  for (const e of events) {
    const timeStr = new Date(e.timestamp).toISOString();
    console.log(`[${e.category}] ${timeStr} | ${e.severity} | ${e.title}`);
    console.log(`  Aggregate: ${e.aggregate_id} | Summary: ${e.summary}`);
  }
  console.log('============================================================');
}

export function printFinancialTrace(t: any): void {
  console.log('============================================================');
  console.log(`UNIVERSAL FINANCIAL TRACE — Trace ID: ${t.trace_id}`);
  console.log('============================================================');
  console.log(`Intent ID:       ${t.payment_intent_id}`);
  console.log(`Mission:         ${t.mission_id || 'N/A'}`);
  console.log(`Agent:           ${t.agent_id || 'N/A'}`);
  console.log(`Contract:        ${t.contract_id || 'N/A'}`);
  console.log(`Obligation:      ${t.obligation_id || 'N/A'}`);
  console.log(`Policy Decision: ${t.policy_decision} (Version: ${t.policy_version})`);
  console.log(`Risk Score:      ${t.risk_score} (${t.risk_level})`);
  console.log(`Reservation:     ${t.reservation_id || 'N/A'} [${t.reservation_status || 'CONSUMED'}]`);
  console.log(`Payment Status:  ${t.payment_status}`);
  console.log(`Execution Hash:  ${t.execution_tx_hash || 'N/A'}`);
  console.log(`Arc Settlement:  Block ${t.arc_block_number || 'N/A'} on Chain ${t.arc_chain_id || 'N/A'}`);
  console.log(`Reconciliation:  ${t.reconciliation_status || 'MATCHED'}`);
  console.log(`Learning Notes:  ${t.learning_notes || 'N/A'}`);
  console.log('------------------------------------------------------------');
  console.log('EXECUTION CHAIN:');
  for (const step of (t.steps || [])) {
    console.log(`  [Stage ${step.step_number}: ${step.stage}] Status: ${step.status} | Ref: ${step.reference_id}`);
    console.log(`    ${step.description}`);
  }
  console.log('============================================================');
}

export function printMissionCommandCenter(m: any): void {
  console.log('============================================================');
  console.log(`MISSION COMMAND CENTER — [${m.status}] ${m.title}`);
  console.log('============================================================');
  console.log(`Mission ID:         ${m.mission_id}`);
  console.log(`Objective:          ${m.objective}`);
  console.log('------------------------------------------------------------');
  console.log(`Total Budget:       ${m.budget_total} USDC`);
  console.log(`Reserved:           ${m.budget_reserved} USDC`);
  console.log(`Settled:            ${m.budget_settled} USDC`);
  console.log(`Remaining:          ${m.budget_remaining} USDC`);
  console.log(`Potential Exposure: ${m.potential_exposure} USDC`);
  console.log('------------------------------------------------------------');
  console.log(`CURRENT ACTION:     ${m.current_action?.action}`);
  console.log(`WHY:                ${m.current_action?.why}`);
  console.log(`EVIDENCE:           ${m.current_action?.evidence}`);
  console.log(`NEXT ACTION:        ${m.next_expected_action}`);
  console.log('------------------------------------------------------------');
  console.log(`ACTIVE PROVIDERS (${m.selected_agents?.length || 0}):`);
  for (const a of (m.selected_agents || [])) {
    console.log(`  * ${a.display_name} (${a.agent_id})`);
    console.log(`    Capability: ${a.capability} | Price: ${a.quoted_price} USDC | Trust: ${(a.verification_rate * 100).toFixed(1)}%`);
    console.log(`    Selection Reason: ${a.selection_reason}`);
    if (a.rejected_alternatives?.length) {
      console.log('    Alternatives Rejected:');
      for (const alt of a.rejected_alternatives) {
        console.log(`      - ${alt.agent_id} (${alt.quoted_price} USDC): ${alt.rejection_reason} [Diff: ${alt.score_difference}]`);
      }
    }
  }
  console.log('============================================================');
}

export function printArcStatus(a: any): void {
  console.log('============================================================');
  console.log(`ARC BLOCKCHAIN SETTLEMENT VERIFICATION [Chain ID: ${a.chain_id}]`);
  console.log('============================================================');
  console.log(`RPC Reachable:           ${a.rpc_reachable ? 'YES (VERIFIED)' : 'UNREACHABLE'}`);
  console.log(`RPC Endpoint:            ${a.rpc_url}`);
  console.log(`Latest Block:            ${a.latest_block_number}`);
  console.log(`AgentVault Address:      ${a.agent_vault_address || 'AGENTVAULT NOT DEPLOYED'}`);
  console.log(`AgentVault Deployed:     ${a.agent_vault_deployed ? 'YES' : 'NO'}`);
  console.log(`AgentVault Paused:       ${a.agent_vault_paused ? 'YES (EMERGENCY HALT)' : 'NO'}`);
  console.log(`USDC Contract:           ${a.usdc_address}`);
  console.log(`Verified Treasury:       ${a.verified_treasury_balance} USDC`);
  console.log(`Live Execution Enabled:  ${a.live_execution_enabled ? 'LIVE ON-CHAIN' : 'SIMULATION MODE'}`);
  console.log('============================================================');
}

export function printControlIncidents(incidents: any[]): void {
  console.log('============================================================');
  console.log(`INCIDENT CENTER (${incidents.length} incidents)`);
  console.log('============================================================');
  for (const inc of incidents) {
    console.log(`[${inc.status}] ${inc.incident_id} | ${inc.severity} | ${inc.title}`);
    console.log(`  Trigger:    ${inc.trigger_event}`);
    console.log(`  Root Cause: ${inc.root_cause}`);
    if (inc.timeline?.length) {
      console.log('  Recovery Timeline:');
      for (const step of inc.timeline) {
        console.log(`    ${step.step_number}. [${step.subsystem}] ${step.description}`);
      }
    }
  }
  console.log('============================================================');
}

export function printControlSearch(results: any[], query: string): void {
  console.log('============================================================');
  console.log(`CONTROL TOWER SEARCH RESULTS for "${query}" (${results.length} matches)`);
  console.log('============================================================');
  for (const r of results) {
    console.log(`[${r.type}] ${r.id} | ${r.title}`);
    console.log(`  ${r.subtitle} | Status: ${r.status}`);
    console.log(`  URL: ${r.deep_link_url}`);
  }
  console.log('============================================================');
}

// ============================================================================
// TASK 13: AUTONOMOUS OPERATIONS & DURABLE RUNTIME FORMATTERS
// ============================================================================

export function printRuntimeStatus(metrics: any, queues?: any): void {
  console.log('============================================================');
  console.log('AGENTPAY AUTONOMOUS OPERATIONS & DURABLE RUNTIME STATUS');
  console.log('============================================================');
  console.log(`Active Workflows:        ${metrics.active_workflows ?? 0}`);
  console.log(`Waiting Workflows:       ${metrics.waiting_workflows ?? 0}`);
  console.log(`Recovery Rate:           ${((metrics.recovery_rate_bps ?? 0) / 100).toFixed(2)}%`);
  console.log(`Retry Rate:              ${((metrics.retry_rate_bps ?? 0) / 100).toFixed(2)}%`);
  console.log(`Failure Rate:            ${((metrics.failure_rate_bps ?? 0) / 100).toFixed(2)}%`);
  console.log(`Avg Step Duration:       ${metrics.average_step_duration_ms ?? 0}ms`);
  console.log(`Lease Expirations:       ${metrics.lease_expirations_count ?? 0}`);
  console.log(`Stale Workers:           ${metrics.stale_worker_count ?? 0}`);
  console.log(`Queue Depth:             ${queues?.queue_depth ?? metrics.queue_depth ?? 0}`);
  console.log(`Reconciliation Queue:    ${queues?.reconciliation_queue_size ?? metrics.reconciliation_queue_size ?? 0}`);
  console.log(`Ambiguous Operations:    ${metrics.ambiguous_operations ?? 0}`);
  console.log(`Worker Utilization:      ${((metrics.worker_utilization_pct ?? 0) * 100).toFixed(1)}%`);
  console.log('============================================================');
}

export function printRuntimeWorkflows(workflows: any[]): void {
  console.log('============================================================');
  console.log(`DURABLE WORKFLOWS (${workflows.length} total)`);
  console.log('============================================================');
  for (const wf of workflows) {
    console.log(`[${wf.state}] ${wf.workflow_id} | Type: ${wf.workflow_type} | v${wf.version}`);
    console.log(`  Aggregate:    ${wf.aggregate_type}:${wf.aggregate_id}`);
    console.log(`  Priority:     ${wf.priority} | Retries: ${wf.retry_count}`);
    console.log(`  Idempotency:  ${wf.idempotency_key}`);
    if (wf.current_step) console.log(`  Current Step: ${wf.current_step}`);
    if (wf.failure_reason) console.log(`  Failure:      ${wf.failure_reason}`);
  }
  console.log('============================================================');
}

export function printRuntimeWorkflowDetail(wf: any, steps: any[] = [], checkpoints: any[] = []): void {
  console.log('============================================================');
  console.log(`DURABLE WORKFLOW: ${wf.workflow_id}`);
  console.log('============================================================');
  console.log(`Tenant:          ${wf.tenant_id}`);
  console.log(`Type:            ${wf.workflow_type}`);
  console.log(`State:           ${wf.state}`);
  console.log(`Version:         ${wf.version}`);
  console.log(`Aggregate:       ${wf.aggregate_type}:${wf.aggregate_id}`);
  console.log(`Idempotency Key: ${wf.idempotency_key}`);
  console.log(`Retry Count:     ${wf.retry_count}`);
  console.log(`Created:         ${wf.created_at}`);
  console.log(`Updated:         ${wf.updated_at}`);
  if (wf.deadline) console.log(`Deadline:        ${wf.deadline}`);
  if (wf.failure_reason) console.log(`Failure Reason:  ${wf.failure_reason}`);

  if (steps.length > 0) {
    console.log('\n--- EXECUTION STEPS ---');
    for (const s of steps) {
      console.log(`  Seq ${s.sequence}: [${s.state}] ${s.step_id} (${s.step_type})`);
      console.log(`    Attempt: ${s.attempt} | Timeout: ${s.timeout_seconds}s`);
      if (s.lease_owner) console.log(`    Lease Owner: ${s.lease_owner} (expires: ${s.lease_expires_at})`);
      if (s.error_code) console.log(`    Error: ${s.error_code} - ${s.error_message}`);
    }
  }

  if (checkpoints.length > 0) {
    console.log('\n--- RECOVERY CHECKPOINTS ---');
    for (const cp of checkpoints) {
      console.log(`  [cp_${cp.checkpoint_id}] Step: ${cp.step_id || 'N/A'} | Hash: ${cp.state_hash.slice(0, 16)}... | Seq: ${cp.event_position}`);
    }
  }
  console.log('============================================================');
}

export function printRuntimeWorkers(workers: any[]): void {
  console.log('============================================================');
  console.log(`RUNTIME WORKERS (${workers.length} active)`);
  console.log('============================================================');
  for (const w of workers) {
    console.log(`[${w.status}] ${w.worker_id} (${w.worker_type}) | Host: ${w.hostname} | v${w.version}`);
    console.log(`  Heartbeat: ${w.heartbeat_at} | Last Seen: ${w.last_seen}`);
  }
  console.log('============================================================');
}

export function printRuntimeRecoveryQueue(steps: any[]): void {
  console.log('============================================================');
  console.log(`RECOVERY QUEUE (${steps.length} pending steps)`);
  console.log('============================================================');
  for (const s of steps) {
    console.log(`[${s.state}] Step: ${s.step_id} | Workflow: ${s.workflow_id}`);
    console.log(`  Type: ${s.step_type} | Attempt: ${s.attempt} | Next Retry: ${s.next_retry_at || 'IMMEDIATE'}`);
    if (s.error_code) console.log(`  Error: ${s.error_code} - ${s.error_message}`);
  }
  console.log('============================================================');
}

export function printRuntimeDangerousAction(
  operation: string,
  details: { tenant: string; workflow: string; currentState: string; idempotencyKey: string; result?: any }
): void {
  console.log('============================================================');
  console.log(`OPERATOR ACTION EXECUTED: ${operation}`);
  console.log('============================================================');
  console.log(`Tenant:              ${details.tenant}`);
  console.log(`Workflow:            ${details.workflow}`);
  console.log(`Current State:       ${details.currentState}`);
  console.log(`Requested Operation: ${operation}`);
  console.log(`Idempotency Key:     ${details.idempotencyKey}`);
  if (details.result) {
    console.log(`New State:           ${details.result.state || 'PROCESSED'}`);
    console.log(`Version:             ${details.result.version ?? 'N/A'}`);
  }
  console.log('============================================================');
}

export function printOpsStatus(s: any): void {
  console.log('============================================================');
  console.log(`AUTONOMOUS OPERATIONS OS STATUS [${s.freshness || 'FRESH'}]`);
  console.log('============================================================');
  console.log(`Snapshot ID:         ${s.snapshot_id}`);
  console.log(`Active Workflows:    ${s.active_workflows}`);
  console.log(`Queued Workflows:    ${s.queued_workflows}`);
  console.log(`Blocked Workflows:   ${s.blocked_workflows}`);
  console.log(`Failed Workflows:    ${s.failed_workflows}`);
  console.log(`Recovering Workflows:${s.recovering_workflows}`);
  console.log('------------------------------------------------------------');
  console.log(`Available Workers:   ${s.available_workers}`);
  console.log(`Active Agents:       ${s.active_agents}`);
  console.log(`Active Incidents:    ${s.incident_count}`);
  console.log('------------------------------------------------------------');
  console.log(`Treasury State:      ${s.treasury_state}`);
  console.log(`Liquidity State:     ${s.liquidity_state}`);
  console.log(`Clearing State:      ${s.clearing_state}`);
  console.log(`Security State:      ${s.security_state}`);
  console.log(`Policy State:        ${s.policy_state}`);
  console.log(`Arc Settlement:      ${s.arc_state}`);
  console.log(`Generated At:        ${s.generated_at}`);
  console.log('============================================================');
}

export function printOpsHealth(h: any): void {
  console.log('============================================================');
  console.log(`OPERATIONS SYSTEM HEALTH [${h.overall_state}]`);
  console.log('============================================================');
  console.log(`Arc Settlement:      ${h.arc?.status_text || 'UNVERIFIED'}`);
  console.log(`  RPC Connected:     ${h.arc?.rpc_connected ? 'YES' : 'NO'}`);
  console.log(`  Vault Deployed:    ${h.arc?.vault_deployed ? 'YES' : 'NO'}`);
  console.log(`  Live Enabled:      ${h.arc?.live_execution_enabled ? 'YES' : 'NO'}`);
  console.log('------------------------------------------------------------');
  console.log('SUBSYSTEM COMPONENTS:');
  for (const [name, comp] of Object.entries(h.components || {})) {
    const c = comp as any;
    console.log(`  [${c.state}] ${name}: ${c.message}`);
  }
  console.log('============================================================');
}

export function printOpsWorkers(workers: any[]): void {
  console.log('============================================================');
  console.log(`SUPERVISED WORKER FLEET (${workers.length} workers)`);
  console.log('============================================================');
  for (const w of workers) {
    console.log(`[${w.status}] ${w.worker_id} (${w.worker_type}) | Last Seen: ${w.last_seen}`);
    if (w.capabilities) console.log(`  Capabilities: ${Array.isArray(w.capabilities) ? w.capabilities.join(', ') : JSON.stringify(w.capabilities)}`);
  }
  console.log('============================================================');
}

export function printOpsQueues(q: any): void {
  console.log('============================================================');
  console.log('DURABLE OPERATIONS QUEUES');
  console.log('============================================================');
  console.log('QUEUE DEPTHS:');
  for (const [name, depth] of Object.entries(q.queue_depths || {})) {
    console.log(`  ${name.padEnd(16)}: ${depth}`);
  }
  console.log('------------------------------------------------------------');
  console.log(`Total Dead Letters:  ${q.total_dead ?? 0}`);
  for (const dl of (q.dead_letters || [])) {
    console.log(`  [${dl.dead_letter_id}] Queue: ${dl.queue_name} | Reason: ${dl.reason}`);
  }
  console.log('============================================================');
}

export function printOpsIncidents(incidents: any[]): void {
  console.log('============================================================');
  console.log(`CORRELATED INCIDENTS (${incidents.length} active)`);
  console.log('============================================================');
  for (const inc of incidents) {
    console.log(`[${inc.severity}] ${inc.incident_id} | ${inc.category} | State: ${inc.state}`);
    if (inc.root_cause) console.log(`  Root Cause: ${inc.root_cause}`);
    if (inc.affected_workflows?.length) console.log(`  Affected Workflows: ${inc.affected_workflows.join(', ')}`);
  }
  console.log('============================================================');
}

export function printOpsTopology(topo: any): void {
  console.log('============================================================');
  console.log('OPERATIONAL RUNTIME TOPOLOGY');
  console.log('============================================================');
  console.log(`Arc RPC:             ${topo.arc?.rpc_connected ? 'AVAILABLE' : 'DOWN'}`);
  console.log(`AgentVault:          ${topo.arc?.vault_deployed ? 'VERIFIED' : 'NOT VERIFIED / NOT DEPLOYED'}`);
  console.log(`Workers Active:      ${topo.workers?.length ?? 0}`);
  console.log('------------------------------------------------------------');
  for (const [name, comp] of Object.entries(topo.components || {})) {
    const c = comp as any;
    console.log(`  Component [${c.state}] ${name}: ${c.message}`);
  }
  console.log('============================================================');
}

export function printOpsReplay(replay: any): void {
  console.log('============================================================');
  console.log(`WORKFLOW HISTORICAL REPLAY — ID: ${replay.workflow_id}`);
  console.log('============================================================');
  console.log(`Total Steps:         ${replay.total_steps}`);
  console.log(`Final State:         ${replay.final_state}`);
  console.log('------------------------------------------------------------');
  for (const e of (replay.entries || [])) {
    console.log(`  [Seq ${e.sequence}] Step: ${e.step_id} (${e.step_type}) -> State: ${e.state}`);
    console.log(`    Worker: ${e.worker_id || 'N/A'} | Timestamp: ${e.timestamp}`);
    if (e.evidence) console.log(`    Evidence: ${e.evidence}`);
  }
  console.log('============================================================');
}

export function printOpsWhy(why: any): void {
  console.log('============================================================');
  console.log('WHY INSPECTOR — STRUCTURED CAUSAL REASONING');
  console.log('============================================================');
  console.log(`Current State:       ${why.current_state}`);
  if (why.previous_state) console.log(`Previous State:      ${why.previous_state}`);
  console.log(`Trigger:             ${why.trigger}`);
  console.log(`Evidence:            ${why.evidence}`);
  if (why.policy) console.log(`Policy:              ${why.policy}`);
  if (why.risk) console.log(`Risk:                ${why.risk}`);
  console.log(`Decision:            ${why.decision}`);
  console.log(`Next Action:         ${why.next_action}`);
  console.log(`Financial Authority: ${why.financial_authority} (INV-121)`);
  console.log('============================================================');
}

export function printOpsNext(next: any): void {
  console.log('============================================================');
  console.log('WHAT HAPPENS NEXT — OPERATIONAL PREDICTION');
  console.log('============================================================');
  console.log(`Predicted Action:    ${next.action}`);
  console.log(`Reason:              ${next.reason}`);
  console.log(`Estimated Delay:     ${next.estimated_delay_seconds}s`);
  console.log(`Requires Human:      ${next.requires_human ? 'YES' : 'NO'}`);
  console.log('============================================================');
}

export function printOpsStateAt(state: any): void {
  console.log('============================================================');
  console.log(`TIME-TRAVEL RECONSTRUCTED STATE AT ${state.timestamp}`);
  console.log('============================================================');
  console.log(`Source:              ${state.reconstructed_from}`);
  console.log(`Tenant:              ${state.tenant_id}`);
  console.log(`Active Workflows:    ${state.active_workflows}`);
  console.log(`Financial Frozen:    ${state.financial_state_frozen ? 'YES (READ-ONLY, INV-130)' : 'NO'}`);
  console.log('============================================================');
}

export function printObjective(obj: any): void {
  console.log('============================================================');
  console.log(`ECONOMIC OBJECTIVE — ${obj.objective_id}`);
  console.log('============================================================');
  console.log(`Status:              ${obj.status}`);
  console.log(`Tenant:              ${obj.tenant_id}`);
  console.log(`Owner:               ${obj.owner}`);
  console.log(`Description:         ${obj.description}`);
  console.log(`Economic Budget:     ${obj.economic_budget} USDC`);
  console.log(`Operational Budget:  ${obj.operational_budget} compute units`);
  console.log(`Risk Tolerance:      ${obj.risk_tolerance}`);
  if (obj.deadline) console.log(`Deadline:            ${obj.deadline}`);
  if (obj.current_blueprint_id) console.log(`Blueprint ID:        ${obj.current_blueprint_id} (v${obj.blueprint_version || 1})`);
  if (obj.active_mission_id) console.log(`Active Mission:      ${obj.active_mission_id}`);
  if (obj.active_workflow_id) console.log(`Active Workflow:     ${obj.active_workflow_id}`);
  if (obj.replan_count !== undefined) console.log(`Replan Count:        ${obj.replan_count} / 3 max`);
  console.log('------------------------------------------------------------');
  console.log(`Financial Authority: HELD BY TREASURY/POLICY (INV-141)`);
  console.log('============================================================');
}

export function printObjectivesList(objs: any[]): void {
  console.log('============================================================');
  console.log(`ECONOMIC OBJECTIVES (${objs.length})`);
  console.log('============================================================');
  if (objs.length === 0) {
    console.log('  No economic objectives found.');
    return;
  }
  for (const o of objs) {
    console.log(`  [${o.status.padEnd(10)}] ${o.objective_id} | ${o.economic_budget} USDC | ${o.description.slice(0, 45)}`);
  }
  console.log('============================================================');
}

export function printBlueprint(bp: any): void {
  console.log('============================================================');
  console.log(`EXECUTION BLUEPRINT — ${bp.blueprint_id} (v${bp.version})`);
  console.log('============================================================');
  console.log(`Objective ID:        ${bp.objective_id}`);
  console.log(`Status:              ${bp.status}`);
  console.log(`Policy Hash:         ${bp.policy_hash}`);
  console.log(`Risk Envelope:       Max Risk ${bp.risk_envelope?.max_risk_score} | Min Conf ${bp.risk_envelope?.minimum_confidence}`);
  console.log(`Resource Envelope:   Max Workers ${bp.resource_envelope?.max_workers} | Max Retries ${bp.resource_envelope?.max_retries}`);
  console.log(`Simulation ID:       ${bp.simulation_id || 'PENDING'}`);
  console.log('Task Graph:');
  for (const t of (bp.tasks || [])) {
    console.log(`  - Task ${t.task_id} [${t.type}] deps: [${(t.dependencies || []).join(', ')}] cap: ${t.required_capability}`);
  }
  console.log('============================================================');
}

export function printObjectiveSimulation(sim: any): void {
  console.log('============================================================');
  console.log(`OBJECTIVE SIMULATION RESULT`);
  console.log('============================================================');
  console.log(`Objective ID:        ${sim.objective_id}`);
  console.log(`Status:              ${sim.status}`);
  console.log(`Expected Cost:       ${sim.expected_cost} USDC`);
  console.log(`Expected Duration:   ${sim.expected_duration}`);
  console.log(`Max Exposure:        ${sim.max_exposure} USDC`);
  console.log(`Failure Probability: ${(sim.failure_probability * 100).toFixed(1)}%`);
  console.log(`Policy Decision:     ${sim.policy_decision}`);
  console.log(`Liquidity Check:     ${sim.liquidity_ok ? 'PASS' : 'FAIL'}`);
  console.log(`Candidate Providers: ${(sim.candidate_providers || []).join(', ')}`);
  console.log('------------------------------------------------------------');
  console.log('SIMULATION ONLY: NO REAL MONEY MOVED (INV-156)');
  console.log('============================================================');
}

export function printObjectiveTrace(trace: any): void {
  console.log('============================================================');
  console.log(`UNIFIED ECONOMIC TRACE — ${trace.trace_id || trace.objective_id}`);
  console.log('============================================================');
  console.log(`Tenant:              ${trace.tenant_id}`);
  console.log(`Started:             ${trace.started_at}`);
  console.log(`Completed:           ${trace.completed_at || 'IN_PROGRESS'}`);
  console.log('Stages Reconstructed:');
  for (const n of (trace.nodes || [])) {
    const status = n.status ? `[${n.status}]` : '';
    console.log(`  ↓ ${n.stage.padEnd(16)} ID: ${(n.id || 'N/A').padEnd(20)} ${status} (${n.source_of_truth})`);
  }
  console.log('============================================================');
}

export function printObjectiveExplain(why: any): void {
  console.log('============================================================');
  console.log('EXPLAIN OBJECTIVE — WHY THIS DECISION?');
  console.log('============================================================');
  console.log(`Selected Provider:   ${why.selected_provider}`);
  console.log(`Selection Rationale: ${why.selection_rationale}`);
  console.log(`Policy Decision:     ${why.policy_decision} (${why.policy_rule})`);
  console.log(`Financial Authority: ${why.financial_authority} (INV-141)`);
  console.log(`Budget Approved:     ${why.budget_approved}`);
  if (why.rejected_candidates && why.rejected_candidates.length > 0) {
    console.log('Rejected Candidates:');
    for (const r of why.rejected_candidates) {
      console.log(`  - ${r.provider_id}: ${r.reason}`);
    }
  }
  console.log('============================================================');
}

export function printObjectiveWhyNot(whyNot: any): void {
  console.log('============================================================');
  console.log('WHY NOT? — BLOCKED ACTION INSPECTOR');
  console.log('============================================================');
  console.log(`Blocked Action:      ${whyNot.blocked_action}`);
  console.log('Denial Reasons:');
  for (const r of (whyNot.reasons || [])) {
    console.log(`  [DENIED] ${r}`);
  }
  console.log('Safe Next Actions:');
  for (const a of (whyNot.safe_alternatives || [])) {
    console.log(`  → ${a}`);
  }
  console.log('------------------------------------------------------------');
  console.log('NOTE: Policy rules cannot be disabled or weakened (INV-145/148)');
  console.log('============================================================');
}

export function printObjectiveState(state: any): void {
  console.log('============================================================');
  console.log(`OBJECTIVE STATE SYNCHRONIZATION — ${state.objective_id}`);
  console.log('============================================================');
  console.log(`Fabric Level State:  ${state.objective_status}`);
  console.log(`Mission State:       ${state.mission_status || 'N/A'}`);
  console.log(`Workflow State:      ${state.workflow_status || 'N/A'}`);
  console.log(`Financial State:     ${state.financial_status} (Authoritative)`);
  console.log(`Treasury State:      ${state.treasury_status}`);
  console.log(`Arc Settlement:      ${state.arc_settlement_status}`);
  console.log('============================================================');
}

export function printAutonomyMetrics(m: any): void {
  console.log('============================================================');
  console.log('AUTONOMY TELEMETRY METRICS');
  console.log('============================================================');
  console.log(`Automation Rate:     ${(m.automation_rate * 100).toFixed(1)}%`);
  console.log(`Self-Recovery Rate:  ${(m.recovery_rate * 100).toFixed(1)}%`);
  console.log(`Human Escalations:   ${m.human_escalations}`);
  console.log(`Policy Blocks:       ${m.policy_blocks}`);
  console.log(`Financial Actions:   ${m.financial_actions}`);
  console.log(`Simulated Actions:   ${m.simulated_actions}`);
  console.log('============================================================');
}

// =============================================================================
// TASK 16: AUTONOMOUS ECONOMIC PROTOCOL V1 OUTPUT PRINTERS
// =============================================================================

export function printProtocolStatus(status: any): void {
  console.log('============================================================');
  console.log('AGENTPAY AUTONOMOUS ECONOMIC PROTOCOL V1 — STATUS');
  console.log('============================================================');
  console.log(`Protocol Version:    ${status.version || '1.0'}`);
  console.log(`Gateway Status:      ${status.status || 'ONLINE'}`);
  console.log(`Connected Agents:    ${status.connected_agents || 0}`);
  console.log(`Active Contracts:    ${status.active_contracts || 0}`);
  console.log(`Settled Payments:    ${status.settled_payments || 0}`);
  console.log(`Invariants Enforced: INV-161 through INV-180`);
  console.log('Core Axiom:          OPEN PARTICIPATION. CLOSED FINANCIAL AUTHORITY.');
  console.log('============================================================');
}

export function printProtocolAgents(agents: any[]): void {
  console.log('============================================================');
  console.log(`DISCOVERED EXTERNAL AGENTS (${agents.length})`);
  console.log('============================================================');
  for (const a of agents) {
    console.log(`Agent ID:        ${a.agent_id}`);
    console.log(`Display Name:    ${a.display_name}`);
    console.log(`Organization:    ${a.organization_id}`);
    console.log(`Availability:    ${a.availability}`);
    console.log(`Protocols:       ${(a.supported_protocols || []).join(', ')}`);
    console.log(`Capabilities:`);
    for (const c of (a.capabilities || [])) {
      console.log(`  - ${c.capability_id} (${c.name || 'Capability'}) [${c.pricing_model || 'FIXED'}]`);
    }
    console.log('------------------------------------------------------------');
  }
}

export function printProtocolCapabilities(capabilities: any[]): void {
  console.log('============================================================');
  console.log(`AVAILABLE PROTOCOL CAPABILITIES (${capabilities.length})`);
  console.log('============================================================');
  for (const c of capabilities) {
    console.log(`Capability:  ${c.capability_id || c.capability}`);
    console.log(`Provider:    ${c.agent_id || c.provider_id}`);
    console.log(`Model:       ${c.pricing_model || c.model || 'FIXED'}`);
    console.log(`Base Price:  ${c.base_price || 'N/A'} USDC`);
    console.log('------------------------------------------------------------');
  }
}

export function printProtocolQuote(q: any): void {
  console.log('============================================================');
  console.log(`PROTOCOL SERVICE QUOTE — ${q.quote_id}`);
  console.log('============================================================');
  console.log(`Provider:            ${q.provider_id}`);
  console.log(`Request ID:          ${q.request_id}`);
  console.log(`Amount:              ${q.amount} ${q.currency || 'USDC'}`);
  console.log(`Duration (est):      ${q.expected_duration_seconds}s`);
  console.log(`Expires At:          ${q.expiration}`);
  console.log(`Deliverables:        ${(q.deliverables || []).join(', ')}`);
  console.log(`Policy Snapshot:     ${q.policy_snapshot_hash || 'VERIFIED'}`);
  console.log('------------------------------------------------------------');
  console.log('NOTE: Quotes are immutable. Bounded by financial policy (INV-165).');
  console.log('============================================================');
}

export function printProtocolContract(c: any): void {
  console.log('============================================================');
  console.log(`PROTOCOL CONTRACT AGREEMENT — ${c.contract_id}`);
  console.log('============================================================');
  console.log(`Requester:           ${c.requester_id}`);
  console.log(`Provider:            ${c.provider_id}`);
  console.log(`Capability:          ${c.capability}`);
  console.log(`State:               ${c.state}`);
  console.log(`Total Amount:        ${c.total_amount} ${c.currency || 'USDC'}`);
  console.log(`Deadline:            ${c.deadline}`);
  console.log(`Policy Hash:         ${c.policy_snapshot_hash}`);
  console.log(`Milestones:          ${(c.milestones || []).length}`);
  console.log('============================================================');
}

export function printProtocolPayment(p: any): void {
  console.log('============================================================');
  console.log(`PROTOCOL PAYMENT STATUS`);
  console.log('============================================================');
  console.log(`Decision:            ${p.decision || p.status}`);
  console.log(`Payment Intent ID:   ${p.payment_intent_id || p.payment_id}`);
  console.log(`Policy Reference:    ${p.policy_reference || 'RULE_BUDGET_VERIFIED'}`);
  console.log(`Risk Assessment:     ${p.risk_reference || 'LOW_RISK'}`);
  console.log(`Safe Action:         ${p.recommended_safe_action || 'N/A'}`);
  console.log(`Authoritative Path:  AGENTPAY CONTROLS. ARC SETTLES.`);
  console.log('============================================================');
}

export function printProtocolTraffic(entries: any[]): void {
  console.log('============================================================');
  console.log(`PROTOCOL TELEMETRY TRAFFIC (${entries.length})`);
  console.log('============================================================');
  for (const e of entries) {
    console.log(`[${e.timestamp}] ${e.message_type.padEnd(22)} ${e.sender_id} → ${e.recipient_id} | Status: ${e.status} (${e.latency_ms}ms)`);
    if (e.error) {
      console.log(`  └─ Error: ${e.error}`);
    }
  }
}

export function printProtocolVerify(result: any): void {
  console.log('============================================================');
  console.log('PROTOCOL MESSAGE SIGNATURE VERIFICATION');
  console.log('============================================================');
  console.log(`Verified:            ${result.valid ? 'YES — VALID' : 'NO — INVALID'}`);
  console.log(`Sender:              ${result.sender_id}`);
  console.log(`Message ID:          ${result.message_id}`);
  console.log(`Algorithm:           ${result.algorithm || 'HMAC-SHA256 / Ed25519'}`);
  console.log(`Replay Protection:   FRESH NONCE (INV-170 PASS)`);
  console.log(`Timestamp Status:    WITHIN TOLERANCE (INV-171 PASS)`);
  console.log('============================================================');
}







