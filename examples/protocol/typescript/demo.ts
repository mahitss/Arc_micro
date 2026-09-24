/**
 * AgentPay Autonomous Economic Protocol — End-to-End TypeScript Example
 * Demonstrates: Discovery -> Service Request -> Quote -> Contract Acceptance ->
 * Deliverable Submission -> Quality Gate Verification -> Payment Disbursement
 */

import { AgentPay } from '@agentpay/sdk';

async function main() {
  const client = new AgentPay({
    apiKey: process.env.AGENTPAY_API_KEY || 'ap_live_example_key',
    baseUrl: process.env.AGENTPAY_BASE_URL || 'http://localhost:8080',
  });

  console.log('=== Step 1: Discover External Agents ===');
  const agents = await client.protocol.discoverAgents('code_audit');
  console.log(`Discovered ${agents.length} agent(s) offering code_audit`);
  const provider = agents[0] || { agent_id: 'agent_security_02' };

  console.log('\n=== Step 2: Request Service Quote ===');
  const quote = await client.protocol.requestQuote({
    request_id: 'req_demo_' + Date.now(),
    requester_id: 'agent_research_01',
    capability: 'code_audit',
    budget_cap: '100.00',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    constraints: { security_level: 'HIGH' },
  });
  console.log(`Received quote: ${quote.quote_id} for ${quote.amount} ${quote.currency}`);

  console.log('\n=== Step 3: Accept Contract Agreement ===');
  // In a real flow, contract ID is established via quote acceptance
  const contractId = 'contract_live_01';
  const contract = await client.protocol.getContract(contractId);
  console.log(`Contract ${contract.contract_id} status: ${contract.state} (${contract.total_amount} USDC)`);

  console.log('\n=== Step 4: Submit Work Deliverable ===');
  const result = await client.protocol.submitResult({
    contract_id: contract.contract_id,
    milestone_id: 'm1_initial_scan',
    worker_agent_id: provider.agent_id,
    deliverable_hash: 'c81729b4892019ab76ce0f42337a898112bc55210fa1402390aebce0984f11e2',
    deliverable_payload: {
      scan_completed: true,
      findings_count: 0,
      confidence: 0.98,
    },
  });
  console.log(`Verification decision: ${result.decision} (Eligible for payout: ${result.eligible_for_payment})`);

  console.log('\n=== Step 5: Request Milestone Payment ===');
  const payment = await client.protocol.requestPayment({
    contract_id: contract.contract_id,
    milestone_id: 'm1_initial_scan',
    recipient_service_id: provider.agent_id,
    amount: '35.00',
    currency: 'USDC',
    quality_verification_hash: result.computed_hash,
  });
  console.log(`Payment decision: ${payment.decision}`);
  console.log(`Payment Intent: ${payment.payment_intent_id}`);
  console.log(`Authoritative Rule Verified: ${payment.policy_reference}`);

  console.log('\n=== Done: Protocol execution completed deterministically ===');
}

main().catch(console.error);
