import { AgentPay } from '@agentpay/sdk';

declare const process: any;

async function main() {
  console.log('====================================================');
  console.log('🤖 AGENTPAY REFERENCE AGENT: Autonomous Research Agent');
  console.log('====================================================\n');

  const apiKey = process.env?.AGENTPAY_API_KEY || 'apk_live_demo1234567890abcdef1234567890abcdef';
  const baseUrl = process.env?.AGENTPAY_BASE_URL || 'http://localhost:8080';

  console.log(`[Config] Gateway: ${baseUrl}`);
  console.log(`[Config] API Key: ${apiKey.slice(0, 12)}...${apiKey.slice(-4)}\n`);

  const agentpay = new AgentPay({
    apiKey,
    baseUrl,
  });

  const agentId = 'agent_research_demo';
  const userPrompt = 'Analyze market liquidity & transaction settlement performance on Arc Network.';

  console.log(`[User Prompt] "${userPrompt}"`);
  console.log('[Agent Logic] Analyzing task requirements...');
  console.log('[Agent Logic] Paid external research intelligence service required.\n');

  // Step 1: Discover registered services
  console.log('[Step 1] Discovering approved external services...');
  const services = await agentpay.services.list();
  console.log(`[Services] Found ${services.length} registered service(s):`);
  services.forEach((s: any) => {
    console.log(`  - ${s.id} (${s.name}): Max Price ${Number(s.max_price) / 1e6} ${s.asset}`);
  });

  const selectedService = services.find((s: any) => s.id === 'research-api' || s.id === 'web-research') || services[0];
  if (!selectedService) {
    throw new Error('No registered services available for agent procurement');
  }
  console.log(`\n[Agent Logic] Selected service: '${selectedService.id}' (${selectedService.name})`);

  // Step 2: Create Payment Intent with Idempotency Key
  const amountBaseUnits = '1200000'; // 1.20 USDC
  const idempotencyKey = `req_research_${Date.now()}`;
  console.log(`\n[Step 2] Creating payment intent for ${Number(amountBaseUnits) / 1e6} ${selectedService.asset}...`);
  console.log(`[Idempotency] Key: ${idempotencyKey}`);

  const payment = await agentpay.paymentIntents.create(
    {
      agentId,
      service: selectedService.id,
      amount: amountBaseUnits,
      asset: selectedService.asset,
      purpose: `Autonomous research: ${userPrompt}`,
      justification: 'Automated procurement of real-time Arc network telemetry and analytics.',
    },
    { idempotencyKey }
  );

  console.log(`[Payment Intent] Created ID: ${payment.id}`);
  console.log(`[Payment Intent] Status: ${payment.status}`);
  console.log(`[Payment Intent] Server-Resolved Recipient: ${payment.recipient}`);

  if (payment.decision) {
    console.log(`[Policy Decision] Result: ${payment.decision.result}`);
    console.log(`[Policy Decision] Risk Level: ${payment.decision.risk || 'N/A'}`);
    console.log(`[Policy Decision] Reason: ${payment.decision.reason || 'N/A'}`);
  }

  // Step 3: Handle policy outcome
  if (payment.status === 'AUTHORIZED') {
    console.log('\n[Step 3] Payment satisfied deterministic policy! Confirming settlement on Arc...');
    const confirmResult = await agentpay.paymentIntents.confirm(payment.id);
    console.log(`[Settlement] Payment confirmed!`);
    console.log(`[Arc Blockchain] Transaction Hash: ${(confirmResult.execution as any)?.transaction_hash || 'tx_arc_simulated'}`);
    console.log('\n[Data Retrieval] Procuring research data payload...');
    console.log('----------------------------------------------------');
    console.log('📊 RESEARCH REPORT: Arc Network Telemetry (Summary)');
    console.log('  • Average Settlement Latency: 120ms');
    console.log('  • Native Gas Token: USDC');
    console.log('  • Status: Active, Healthy, Zero Divergence');
    console.log('----------------------------------------------------');
  } else if (payment.status === 'APPROVAL_REQUIRED') {
    console.log('\n[Step 3] Payment requires human financial approval before settlement.');
    console.log(`[Action Required] Check AgentPay Web Control Center at http://localhost:3000/approvals`);
  } else if (payment.status === 'DENIED') {
    console.log('\n[Step 3] Payment was DENIED by policy engine.');
    console.log(`[Violation] ${payment.decision?.reason}`);
  }

  console.log('\n✅ Reference agent workflow completed.');
}

main().catch((err) => {
  console.error('\n❌ Reference agent encountered an error:', err);
  process.exit(1);
});
