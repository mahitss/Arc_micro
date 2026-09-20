import { AgentPay } from '@agentpay/sdk';
import { AgentPaymentTool } from './agent-tool.js';

declare const process: any;

async function runPaymentAgent() {
  console.log('================================================================');
  console.log('🤖 AGENTPAY EXAMPLE PAYMENT AGENT (Day 7 Integration Demo)');
  console.log('================================================================\n');

  const apiKey = process.env?.AGENTPAY_API_KEY || 'ap_live_demo1234567890abcdef1234567890abcdef';
  const baseUrl = process.env?.AGENTPAY_BASE_URL || 'http://localhost:8080';

  console.log(`[Config] Gateway: ${baseUrl}`);
  console.log(`[Config] API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}\n`);

  const client = new AgentPay({ apiKey, baseUrl });
  const agentId = 'agent_research_01';
  const tool = new AgentPaymentTool(client, agentId);

  // 1. User provides a goal
  const userPrompt = 'Analyze real-time Arc network liquidity depth and gas volatility.';
  console.log(`[User Goal] "${userPrompt}"`);
  console.log('[Agent Thought] To fulfill this goal, external paid telemetry is required.');

  // 2. Discover available approved services
  console.log('\n[Step 1] Querying AgentPay Service Registry for approved providers...');
  const services = await client.services.list();
  console.log(`[Step 1] Found ${services.length} approved service(s):`);
  for (const s of services) {
    console.log(`  - ${s.id} (${s.name}): Max Price ${Number(s.max_price) / 1e6} ${s.asset}`);
  }

  const selectedService = services.find((s) => s.id === 'research-api') || services[0];
  if (!selectedService) {
    throw new Error('No registered services available in AgentPay.');
  }
  console.log(`\n[Agent Selection] Selected service: '${selectedService.id}' (${selectedService.name})`);

  // 3. Request payment via formalized tool contract
  const amountBaseUnits = '1500000'; // 1.50 USDC
  const idempotencyKey = `agent_task_${Date.now()}`;

  console.log('\n[Step 2] Invoking formalized Agent Payment Tool contract...');
  console.log(`[Tool Input] service_id: '${selectedService.id}', amount: '${amountBaseUnits}' (1.50 USDC)`);
  console.log(`[Tool Input] idempotency_key: '${idempotencyKey}'`);

  const result = await tool.requestPayment({
    service_id: selectedService.id,
    amount: amountBaseUnits,
    asset: selectedService.asset,
    purpose: userPrompt,
    justification: 'Automated procurement of orderbook telemetry for agent analysis.',
    idempotency_key: idempotencyKey,
  });

  console.log('\n[Step 3] Tool Contract Result Received:');
  console.log(`  • Payment Intent ID: ${result.payment_intent_id || '(none)'}`);
  console.log(`  • Status:            ${result.status}`);
  console.log(`  • Decision:          ${result.decision}`);
  console.log(`  • Risk:              ${result.risk || 'LOW'}`);
  console.log(`  • Next Action:       ${result.next_action}`);

  // 4. Agent acts on next_action
  switch (result.next_action) {
    case 'WAIT_FOR_APPROVAL':
      console.log('\n⚠️ [Agent Action] Payment exceeds auto-execution limit.');
      console.log('   Human financial controller must approve this request.');
      console.log(`   Review in Web Control Center: http://localhost:3000/approvals`);
      break;

    case 'HANDLE_DENIAL':
      console.log('\n❌ [Agent Action] Payment was DENIED by policy engine.');
      console.log(`   Reason: ${result.reason}`);
      console.log('   Agent will formulate an alternative free strategy.');
      break;

    case 'HANDLE_FAILURE':
      console.log('\n❌ [Agent Action] Payment request encountered a technical failure.');
      console.log(`   Reason: ${result.reason}`);
      break;

    case 'WAIT_FOR_EXECUTION':
    case 'CONTINUE':
      console.log('\n✅ [Agent Action] Policy satisfied! Proceeding to Arc settlement...');
      try {
        const confirmResult = await client.paymentIntents.confirm(result.payment_intent_id);
        console.log('   Settlement confirmed on Arc Network!');
        console.log(`   Transaction Hash: ${(confirmResult.execution as any)?.transaction_hash || 'tx_arc_simulated'}`);

        console.log('\n----------------------------------------------------------------');
        console.log('📊 SIMULATED TELEMETRY PAYLOAD PROCURED:');
        console.log('   • Arc Network TPS: 4,850');
        console.log('   • Average Finality: 115ms');
        console.log('   • Settlement Gas: 0.0001 USDC');
        console.log('----------------------------------------------------------------');
        console.log('\n[Agent Completion] Task fulfilled successfully without holding private keys!');
      } catch (err: any) {
        console.error('   Settlement error:', err.message);
      }
      break;
  }
}

runPaymentAgent().catch((err) => {
  console.error('\nFatal Agent Error:', err);
  process.exit(1);
});
