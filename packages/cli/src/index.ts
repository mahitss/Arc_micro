#!/usr/bin/env node
import { AgentPay } from '@agentpay/sdk';
import { getConfig, maskApiKey, setConfigKey } from './config.js';
import {
  printAgentBudget,
  printAgentDetail,
  printAgentQuote,
  printAgentsList,
  printAgentServicesList,
  printApprovalsList,
  printEconomicGraph,
  printEventsList,
  printHire,
  printJson,
  printMissionIntelligence,
  printPaymentIntent,
  printPaymentIntentsList,
  printPaymentTrace,
  printQuote,
  printReplanProposal,
  printServiceAnomalies,
  printServicePerformance,
  printServicesList,
  printSimulateSwarm,
  printSimulationResult,
  printSwarm,
  printSwarmGraph,
  printSwarmRisk,
  printSwarmTasks,
  printSwarmTrace,
  printTransactionsList,
  printWebhooksList,
  printAgentNetworkIdentity,
  printDiscoveredAgents,
  printServiceContract,
  printDisputeRecord,
  printNetworkGraph,
  printConstitution,
  printConstitutionsList,
  printConstitutionDecision,
  printPolicyDiff,
  printPolicyChangeRequestsList,
  printObligationsList,
  printObligationDetail,
  printInvoicesList,
  printInvoiceDetail,
  printEscrowsList,
  printMilestonesList,
  printNettingProposalsList,
  printSettlementBatchesList,
  printReconciliationList,
  printExposureSnapshot,
  printHealthSnapshot,
  printTreasuryState,
  printTreasuryReservationsList,
  printTreasuryReservationDetail,
  printTreasuryForecast,
  printTreasuryStressResult,
  printTreasuryReconciliationReport,
  printTreasuryHealth,
  printTreasuryAnomaliesList,
  printControlStateStrip,
  printControlOverview,
  printControlActivity,
  printFinancialTrace,
  printMissionCommandCenter,
  printArcStatus,
  printControlIncidents,
  printControlSearch,
  printRuntimeStatus,
  printRuntimeWorkflows,
  printRuntimeWorkflowDetail,
  printRuntimeWorkers,
  printRuntimeRecoveryQueue,
  printRuntimeDangerousAction,
  printOpsStatus,
  printOpsHealth,
  printOpsWorkers,
  printOpsQueues,
  printOpsIncidents,
  printOpsTopology,
  printOpsReplay,
  printOpsWhy,
  printOpsNext,
  printOpsStateAt,
  printObjective,
  printObjectivesList,
  printBlueprint,
  printObjectiveSimulation,
  printObjectiveTrace,
  printObjectiveExplain,
  printObjectiveWhyNot,
  printObjectiveState,
  printAutonomyMetrics,
} from './output.js';
import { verifyWebhookSignature } from '@agentpay/sdk';

function parseFlags(args: string[]): { flags: Record<string, string | boolean>; positional: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

function printHelp(): void {
  console.log(`
AgentPay CLI — Programmable Financial Control Plane for AI Agents

Usage:
  agentpay <command> [subcommand] [options]

Commands:
  config get                       View current CLI configuration
  config set <key> <value>         Set config key (api-key, base-url)

  agents list                      List registered agents
  agents get <id>                  Get details of an agent
  agents budget <id>               Get read-only financial budget and limits
  agents discover                  Discover peer agents (--capability, --max-price, etc.)
  agents services <id>             List economic services provided by an agent

  quotes request <service_id>      Request inter-agent quote (--buyer <id> [--price <units>])
  quotes counter <id>              Counter-offer quote (--agent <id> --price <units>)
  quotes accept <id>               Accept an offered or countered quote
  quotes get <id>                  Get quote details

  hires create                     Create hire agreement (--buyer, --quote, --mission)
  hires get <id>                   Get hire status
  hires pay <id>                   Execute hire payment through AgentPay financial engine
  hires cancel <id>                Cancel hire agreement

  missions graph <id>              Display directed economic network DAG for a mission

  swarms create                    Create a new multi-agent swarm (--name, --objective, --budget)
  swarms get <id>                  Get swarm details and status
  swarms start <id>                Start autonomous swarm execution
  swarms cancel <id>               Cancel swarm execution and release budget
  swarms simulate                  Simulate a swarm DAG plan (--name, --objective, --budget)
  swarms tasks <id>                List all tasks in a swarm
  swarms graph <id>                Display directed economic network DAG for a swarm
  swarms trace <id>                Display audit trace events for a swarm
  swarms risk <id>                 Display risk scoring and intelligence for a swarm
  swarms replan <id>               Trigger adaptive replanning for a swarm

  services list                    List approved service providers
    --category <cat>               Filter by category (RESEARCH, DATA, COMPUTE, etc.)
    --trust <status>               Filter by trust status (TRUSTED, VERIFIED, etc.)
    --enabled <true|false>         Filter by enabled state
  services quote <id>              Request a time-bound price quote from a service
    --amount <units>               Requested amount in base units (optional)
    --asset <asset>                Asset (default: USDC)

  simulate                         Execute a financial dry-run simulation
    --agent <id>                   Agent requesting payment (required)
    --service <id>                 Approved service identifier (required)
    --amount <units>               Amount in base units, e.g. 2500000 (required)
    --asset <asset>                Currency asset (default: USDC)
    --purpose <purpose>            Payment purpose (optional)
    --quote <quote_id>             Service quote ID (optional)

  payments create                  Create a new payment intent
    --agent <id>                   Agent requesting payment (required)
    --service <id>                 Approved service identifier (required)
    --amount <units>               Amount in base units, e.g. 2500000 (required)
    --asset <asset>                Currency asset (default: USDC)
    --purpose <purpose>            Payment purpose (required)
    --quote <quote_id>             Bound quote ID (optional)
    --idempotency-key <key>        Idempotency key for safe retries

  payments get <id>                Get payment intent by ID
  payments trace <id>              Get payment flight recorder trace by ID
  payments list                    List payment intents
    --status <status>              Filter by status (e.g. AUTHORIZED, CONFIRMED)

  approvals list                   List pending approval requests
  transactions list                List blockchain execution transactions
  events list                      List domain audit events
    --limit <number>               Maximum events to return (default: 20)

  webhooks list                    List registered webhook endpoints
  webhooks verify                  Verify HMAC-SHA256 signature of incoming webhook
    --payload <json>               Raw webhook payload
    --signature <sig>              AgentPay-Signature header (t=...,v1=...)
    --secret <secret>              Webhook signing secret (whsec_...)

  treasury state                   View real-time treasury balances, buffer, and mode (--org, --mode)
  treasury balance                 View on-chain balance breakdown (--org, --vault)
  treasury reservations list       List liquidity reservations (--org, --mode, --status)
  treasury reservations get <id>   Get reservation details
  treasury reservations create     Reserve liquidity (--amount, --purpose, --agent, --timeout, --mode)
  treasury reservations release <id> Release reservation (--reason)
  treasury reservations consume <id> Consume reservation (--intent <payment_intent_id>)
  treasury commitments            List active soft and hard commitments (--org)
  treasury exposure               View counterparty exposure & pending settlements (--org, --mode)
  treasury forecast [horizon]      Forecast liquidity over horizon (1h, 6h, 24h, 7d, 30d) (--scenario)
  treasury stress                  Simulate liquidity stress scenario (--scenario, --cluster, --settlements)
  treasury reconcile               Run cross-layer treasury reconciliation audit (--org, --mode)
  treasury anomalies               List active treasury liquidity anomalies (--org)
  treasury health                  View complete treasury health & solvency snapshot (--org, --mode)
  treasury inflows                 List expected future liquidity inflows (--org, --mode)

  runtime status                   View aggregate runtime metrics and queue status
  runtime workflows                List durable workflows (--state, --limit)
  runtime inspect <workflow_id>    Inspect detailed workflow state, steps, and checkpoints
  runtime workers                  List registered runtime worker processes
  runtime recovery                 View steps currently queued for automated recovery
  runtime pause <workflow_id>      Pause an active workflow (--reason)
  runtime resume <workflow_id>     Resume a paused workflow
  runtime cancel <workflow_id>     Cancel a workflow safely (--reason)
  runtime reconcile <incident_id>  Reconcile an operational runtime incident

  objective create                 Create economic objective (--desc, --budget, --tenant, --deadline)
  objective plan <id>              Compile execution blueprint (--dry-run)
  objective simulate <id>          Run deterministic pre-execution simulation (--dry-run)
  objective start <id>             Start objective execution into durable workflows (--dry-run)
  objective status [id]            View objective details or list all objectives (--status, --tenant)
  objective trace <id>             Reconstruct 18-stage end-to-end causal trace
  objective explain <id>           Explain provider and policy decisions (Why This?)
  objective why-not <id>           Inspect blocked actions and guardrails (Why Not?)
  objective state <id>             Synchronized fabric vs financial source-of-truth state
  objective replan <id>            Safely adapt plan with bounded replanning (--reason, --dry-run)
  objective pause <id>             Pause objective execution (--reason, --dry-run)
  objective resume <id>            Resume paused objective (--dry-run)
  objective cancel <id>            Cancel objective safely (--reason, --dry-run)
  objective metrics                View descriptive autonomy metrics

Options:
  --dry-run                        Simulate action without mutating persistent state
  --json                           Output response in machine-readable JSON format
  --help                           Display this help message
`);
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const { flags, positional } = parseFlags(rawArgs);

  if (flags['help'] || positional.length === 0) {
    printHelp();
    return;
  }

  const isJson = Boolean(flags['json']);
  const [resource, action, targetId] = positional;

  // 1. Config commands
  if (resource === 'config') {
    if (action === 'get') {
      const cfg = getConfig();
      if (isJson) {
        printJson({
          apiKey: maskApiKey(cfg.apiKey),
          baseUrl: cfg.baseUrl || 'http://localhost:8080',
        });
      } else {
        console.log('AgentPay Configuration');
        console.log('──────────────────────────────────────────────────');
        console.log(`API Key:   ${maskApiKey(cfg.apiKey)}`);
        console.log(`Base URL:  ${cfg.baseUrl || 'http://localhost:8080'}`);
        console.log('──────────────────────────────────────────────────');
      }
      return;
    }

    if (action === 'set') {
      const key = targetId;
      const value = positional[3];
      if (!key || !value) {
        console.error('Error: "config set" requires <key> and <value>.');
        console.error('Example: agentpay config set api-key ap_live_...');
        process.exit(1);
      }
      setConfigKey(key, value);
      if (isJson) {
        printJson({ success: true, key, message: `Configuration key '${key}' updated.` });
      } else {
        console.log(`Configuration '${key}' updated successfully.`);
      }
      return;
    }
  }

  // Initialize SDK client
  const config = getConfig();
  const apiKey = (flags['api-key'] as string) || config.apiKey || process.env.AGENTPAY_API_KEY;
  const baseUrl = (flags['base-url'] as string) || config.baseUrl || process.env.AGENTPAY_BASE_URL || 'http://localhost:8080';

  const client = new AgentPay({ apiKey, baseUrl });

  try {
    // 2. Agents
    if (resource === 'agents') {
      if (action === 'list') {
        const agents = await client.agents.list();
        if (isJson) printJson(agents);
        else printAgentsList(agents);
        return;
      }
      if (action === 'get') {
        if (!targetId) {
          console.error('Error: "agents get" requires an agent <id>');
          process.exit(1);
        }
        const agent = await client.agents.get(targetId);
        if (isJson) printJson(agent);
        else printAgentDetail(agent);
        return;
      }
      if (action === 'budget') {
        if (!targetId) {
          console.error('Error: "agents budget" requires an agent <id>');
          process.exit(1);
        }
        const budget = await client.agents.getBudget(targetId);
        if (isJson) printJson(budget);
        else printAgentBudget(budget);
        return;
      }
      if (action === 'discover') {
        const capability = flags['capability'] as string | undefined;
        const maxPrice = flags['max-price'] as string | undefined;
        const minReputation = flags['min-reputation'] !== undefined ? Number(flags['min-reputation']) : undefined;
        const risk = flags['risk'] as string | undefined;
        const availability = flags['availability'] as string | undefined;
        const services = await client.agents.discover({ capability, maxPrice, minReputation, risk, availability });
        if (isJson) printJson(services);
        else printAgentServicesList(services);
        return;
      }
      if (action === 'services') {
        if (!targetId) {
          console.error('Error: "agents services" requires an agent <id>');
          process.exit(1);
        }
        const services = await client.agents.getServices(targetId);
        if (isJson) printJson(services);
        else printAgentServicesList(services);
        return;
      }
    }

    // 3. Services
    if (resource === 'services' || resource === 'service') {
      if (action === 'list') {
        const category = flags['category'] as string | undefined;
        const trustStatus = flags['trust'] as string | undefined;
        const enabled = flags['enabled'] !== undefined ? flags['enabled'] === 'true' || flags['enabled'] === true : undefined;

        const services = await client.services.list({
          category,
          trustStatus,
          enabled,
        });
        if (isJson) printJson(services);
        else printServicesList(services);
        return;
      }

      if (action === 'quote') {
        if (!targetId) {
          console.error('Error: "services quote" requires a service <id>');
          process.exit(1);
        }
        const amount = flags['amount'] as string | undefined;
        const asset = flags['asset'] as string | undefined;
        const quote = await client.services.getQuote(targetId, { amount, asset });
        if (isJson) printJson(quote);
        else printQuote(quote);
        return;
      }

      if (action === 'performance') {
        if (!targetId) {
          console.error('Error: "services performance" requires a service <id>');
          process.exit(1);
        }
        const window = flags['window'] as any;
        const perf = await client.services.performance(targetId, { window });
        if (isJson) printJson(perf);
        else printServicePerformance(perf);
        return;
      }

      if (action === 'anomalies') {
        if (!targetId) {
          console.error('Error: "services anomalies" requires a service <id>');
          process.exit(1);
        }
        const res = await client.services.anomalies(targetId);
        if (isJson) printJson(res);
        else printServiceAnomalies(res);
        return;
      }
    }

    // 3.5 Simulate
    if (resource === 'simulate') {
      const agentId = flags['agent'] as string;
      const service = flags['service'] as string;
      const amount = flags['amount'] as string;
      const asset = (flags['asset'] as string) || 'USDC';
      const purpose = flags['purpose'] as string | undefined;
      const quoteId = flags['quote'] as string | undefined;

      if (!agentId || !service || !amount) {
        console.error('Error: "simulate" requires --agent, --service, and --amount.');
        console.error('Example: agentpay simulate --agent agent_1 --service research-api --amount 2500000');
        process.exit(1);
      }

      const res = await client.simulations.create({
        agent_id: agentId,
        service_id: service,
        amount: String(amount),
        asset,
        purpose,
        quote_id: quoteId,
      });

      if (isJson) printJson(res);
      else printSimulationResult(res);
      return;
    }

    // 4. Payments
    if (resource === 'payments' || resource === 'payment') {
      if (action === 'create') {
        const agentId = flags['agent'] as string;
        const service = flags['service'] as string;
        const amount = flags['amount'] as string;
        const asset = (flags['asset'] as string) || 'USDC';
        const purpose = (flags['purpose'] as string) || 'CLI payment intent';
        const quoteId = flags['quote'] as string | undefined;
        const idempotencyKey = flags['idempotency-key'] as string;

        if (!agentId || !service || !amount) {
          console.error('Error: "payments create" requires --agent, --service, and --amount.');
          console.error('Example: agentpay payments create --agent agent_1 --service research-api --amount 2500000 --purpose "Analysis"');
          process.exit(1);
        }

        const res = await client.paymentIntents.create(
          {
            agentId,
            service,
            quoteId,
            amount: String(amount),
            asset,
            purpose,
          },
          { idempotencyKey }
        );

        if (isJson) printJson(res);
        else printPaymentIntent(res);
        return;
      }

      if (action === 'trace') {
        if (!targetId) {
          console.error('Error: "payments trace" requires a payment intent <id>');
          process.exit(1);
        }
        const trace = await client.paymentIntents.trace(targetId);
        if (isJson) printJson(trace);
        else printPaymentTrace(trace);
        return;
      }

      if (action === 'get') {
        if (!targetId) {
          console.error('Error: "payments get" requires a payment intent <id>');
          process.exit(1);
        }
        const detail = await client.paymentIntents.get(targetId);
        if (isJson) printJson(detail);
        else printPaymentIntent(detail);
        return;
      }

      if (action === 'list') {
        const status = flags['status'] as string;
        const list = await client.paymentIntents.list(status ? { status } : undefined);
        if (isJson) printJson(list);
        else printPaymentIntentsList(list);
        return;
      }
    }

    // 5. Approvals
    if (resource === 'approvals') {
      if (action === 'list') {
        const list = await client.approvals.list();
        if (isJson) printJson(list);
        else printApprovalsList(list);
        return;
      }
    }

    // 6. Transactions
    if (resource === 'transactions') {
      if (action === 'list') {
        const list = await client.transactions.list();
        if (isJson) printJson(list);
        else printTransactionsList(list);
        return;
      }
    }

    // 7. Events
    if (resource === 'events') {
      if (action === 'list') {
        const limit = flags['limit'] ? Number(flags['limit']) : 20;
        const list = await client.events.list({ limit });
        if (isJson) printJson(list);
        else printEventsList(list);
        return;
      }
    }

    // 8. Webhooks
    if (resource === 'webhooks' || resource === 'webhook') {
      if (action === 'list') {
        const list = await client.webhooks.list();
        if (isJson) printJson(list);
        else printWebhooksList(list);
        return;
      }

      if (action === 'verify') {
        const payload = flags['payload'] as string;
        const signature = flags['signature'] as string;
        const secret = flags['secret'] as string;

        if (!payload || !signature || !secret) {
          console.error('Error: "webhook verify" requires --payload, --signature, and --secret');
          process.exit(1);
        }

        const valid = verifyWebhookSignature(payload, signature, secret);
        if (isJson) {
          printJson({ valid });
        } else {
          console.log(valid ? 'Signature VALID.' : 'Signature INVALID.');
        }
        if (!valid) process.exit(1);
        return;
      }
    }

    // 8. Quotes & Negotiation
    if (resource === 'quotes' || resource === 'quote') {
      if (action === 'request') {
        const serviceId = targetId || (flags['service'] as string);
        const buyer = flags['buyer'] as string;
        const price = flags['price'] as string | undefined;
        if (!serviceId || !buyer) {
          console.error('Error: "quotes request" requires service <id> and --buyer <agent_id>');
          process.exit(1);
        }
        const quote = await client.quotes.request(serviceId, { buyer_agent_id: buyer, proposed_price: price });
        if (isJson) printJson(quote);
        else printAgentQuote(quote);
        return;
      }
      if (action === 'get') {
        if (!targetId) {
          console.error('Error: "quotes get" requires a quote <id>');
          process.exit(1);
        }
        const quote = await client.quotes.get(targetId);
        if (isJson) printJson(quote);
        else printAgentQuote(quote);
        return;
      }
      if (action === 'counter') {
        const agent = flags['agent'] as string;
        const price = flags['price'] as string;
        if (!targetId || !agent || !price) {
          console.error('Error: "quotes counter" requires quote <id>, --agent <agent_id>, and --price <units>');
          process.exit(1);
        }
        const quote = await client.quotes.counter(targetId, { agent_id: agent, proposed_price: price });
        if (isJson) printJson(quote);
        else printAgentQuote(quote);
        return;
      }
      if (action === 'accept') {
        if (!targetId) {
          console.error('Error: "quotes accept" requires quote <id>');
          process.exit(1);
        }
        const quote = await client.quotes.accept(targetId);
        if (isJson) printJson(quote);
        else printAgentQuote(quote);
        return;
      }
    }

    // 9. Hires & Execution
    if (resource === 'hires' || resource === 'hire') {
      if (action === 'create') {
        const buyer = flags['buyer'] as string;
        const quoteId = flags['quote'] as string;
        const missionId = flags['mission'] as string;
        const expected = (flags['expected'] as string) || 'execution_result';
        if (!buyer || !quoteId || !missionId) {
          console.error('Error: "hires create" requires --buyer <id>, --quote <id>, and --mission <id>');
          process.exit(1);
        }
        const hire = await client.hires.create({
          buyer_agent_id: buyer,
          quote_id: quoteId,
          mission_id: missionId,
          expected_result: expected,
        });
        if (isJson) printJson(hire);
        else printHire(hire);
        return;
      }
      if (action === 'get') {
        if (!targetId) {
          console.error('Error: "hires get" requires a hire <id>');
          process.exit(1);
        }
        const hire = await client.hires.get(targetId);
        if (isJson) printJson(hire);
        else printHire(hire);
        return;
      }
      if (action === 'pay') {
        if (!targetId) {
          console.error('Error: "hires pay" requires a hire <id>');
          process.exit(1);
        }
        const hire = await client.hires.executePayment(targetId);
        if (isJson) printJson(hire);
        else printHire(hire);
        return;
      }
      if (action === 'cancel') {
        if (!targetId) {
          console.error('Error: "hires cancel" requires a hire <id>');
          process.exit(1);
        }
        const reason = flags['reason'] as string | undefined;
        const hire = await client.hires.cancel(targetId, reason);
        if (isJson) printJson(hire);
        else printHire(hire);
        return;
      }
    }

    // 10. Missions & Network Graph
    if (resource === 'missions' || resource === 'mission') {
      if (action === 'graph') {
        if (!targetId) {
          console.error('Error: "missions graph" requires a mission <id>');
          process.exit(1);
        }
        const graph = await client.missions.economicGraph(targetId);
        if (isJson) printJson(graph);
        else printEconomicGraph(graph);
        return;
      }

      if (action === 'intelligence') {
        if (!targetId) {
          console.error('Error: "missions intelligence" requires a mission <id>');
          process.exit(1);
        }
        const intel = await client.missions.intelligence(targetId);
        if (isJson) printJson(intel);
        else printMissionIntelligence(intel);
        return;
      }

      if (action === 'replan') {
        if (!targetId) {
          console.error('Error: "missions replan" requires a mission <id>');
          process.exit(1);
        }
        const proposal = await client.missions.replan(targetId);
        if (isJson) printJson(proposal);
        else printReplanProposal(proposal);
        return;
      }

      if (action === 'recovery') {
        if (!targetId) {
          console.error('Error: "missions recovery" requires a mission <id>');
          process.exit(1);
        }
        const rec = await client.missions.recovery(targetId);
        if (isJson) printJson(rec);
        else console.log(JSON.stringify(rec, null, 2));
        return;
      }

      if (action === 'observations') {
        if (!targetId) {
          console.error('Error: "missions observations" requires a mission <id>');
          process.exit(1);
        }
        const obs = await client.missions.observations(targetId);
        if (isJson) printJson(obs);
        else console.log(JSON.stringify(obs, null, 2));
        return;
      }
    }

    // 14. Swarms commands
    if (resource === 'swarms') {
      if (action === 'create') {
        const name = flags['name'] as string;
        const objective = flags['objective'] as string;
        const maxBudget = (flags['budget'] || flags['max-budget']) as string;
        const asset = (flags['asset'] as string) || 'USDC';

        if (!name || !objective || !maxBudget) {
          console.error('Error: "swarms create" requires --name, --objective, and --budget');
          process.exit(1);
        }

        const sw = await client.swarms.create({
          name,
          objective,
          max_budget: maxBudget,
          asset,
        });

        if (isJson) printJson(sw);
        else printSwarm(sw);
        return;
      }

      if (action === 'get') {
        if (!targetId) {
          console.error('Error: "swarms get" requires a swarm <id>');
          process.exit(1);
        }
        const sw = await client.swarms.get(targetId);
        if (isJson) printJson(sw);
        else printSwarm(sw);
        return;
      }

      if (action === 'start') {
        if (!targetId) {
          console.error('Error: "swarms start" requires a swarm <id>');
          process.exit(1);
        }
        const sw = await client.swarms.start(targetId);
        if (isJson) printJson(sw);
        else printSwarm(sw);
        return;
      }

      if (action === 'cancel') {
        if (!targetId) {
          console.error('Error: "swarms cancel" requires a swarm <id>');
          process.exit(1);
        }
        const sw = await client.swarms.cancel(targetId);
        if (isJson) printJson(sw);
        else printSwarm(sw);
        return;
      }

      if (action === 'simulate') {
        const name = (flags['name'] as string) || 'Simulated Swarm';
        const objective = (flags['objective'] as string) || 'Simulated Objective';
        const maxBudget = ((flags['budget'] || flags['max-budget']) as string) || '10000000';

        const sim = await client.swarms.simulate({
          name,
          objective,
          max_budget: maxBudget,
        });

        if (isJson) printJson(sim);
        else printSimulateSwarm(sim);
        return;
      }

      if (action === 'tasks') {
        if (!targetId) {
          console.error('Error: "swarms tasks" requires a swarm <id>');
          process.exit(1);
        }
        const tasks = await client.swarms.tasks(targetId);
        if (isJson) printJson(tasks);
        else printSwarmTasks(tasks);
        return;
      }

      if (action === 'graph') {
        if (!targetId) {
          console.error('Error: "swarms graph" requires a swarm <id>');
          process.exit(1);
        }
        const g = await client.swarms.graph(targetId);
        if (isJson) printJson(g);
        else printSwarmGraph(g);
        return;
      }

      if (action === 'trace') {
        if (!targetId) {
          console.error('Error: "swarms trace" requires a swarm <id>');
          process.exit(1);
        }
        const tr = await client.swarms.trace(targetId);
        if (isJson) printJson(tr);
        else printSwarmTrace(tr);
        return;
      }

      if (action === 'risk') {
        if (!targetId) {
          console.error('Error: "swarms risk" requires a swarm <id>');
          process.exit(1);
        }
        const rk = await client.swarms.risk(targetId);
        if (isJson) printJson(rk);
        else printSwarmRisk(rk);
        return;
      }

      if (action === 'replan') {
        if (!targetId) {
          console.error('Error: "swarms replan" requires a swarm <id>');
          process.exit(1);
        }
        const rep = await client.swarms.replan(targetId);
        if (isJson) printJson(rep);
        else printReplanProposal(rep);
        return;
      }
    }

    // 15. Open Agent Network commands
    if (resource === 'network') {
      const sub = action; // agents, contracts, disputes, graph
      const op = targetId; // list, get, fund, etc.
      const param = positional[3];

      if (sub === 'agents') {
        if (!op || op === 'list') {
          const cap = flags['capability'] as string;
          const minTrust = flags['min-trust'] ? Number(flags['min-trust']) : undefined;
          const res = await client.agentNetwork.list({ capability: cap, min_trust_score: minTrust });
          if (isJson) printJson(res);
          else printDiscoveredAgents(res.agents);
          return;
        }
        if (op === 'get') {
          if (!param) {
            console.error('Error: "network agents get" requires an <agent_id>');
            process.exit(1);
          }
          const res = await client.agentNetwork.get(param);
          if (isJson) printJson(res);
          else printAgentNetworkIdentity(res.identity);
          return;
        }
      }

      if (sub === 'contracts') {
        if (!op || op === 'list') {
          const res = await client.agentNetwork.listContracts();
          if (isJson) printJson(res);
          else {
            console.log(`Contracts (${res.count}):`);
            for (const c of res.contracts) printServiceContract(c);
          }
          return;
        }
        if (op === 'get') {
          if (!param) {
            console.error('Error: "network contracts get" requires a <contract_id>');
            process.exit(1);
          }
          const res = await client.agentNetwork.getContract(param);
          if (isJson) printJson(res);
          else printServiceContract(res);
          return;
        }
        if (op === 'fund') {
          if (!param) {
            console.error('Error: "network contracts fund" requires a <contract_id>');
            process.exit(1);
          }
          const res = await client.agentNetwork.fundContract(param);
          if (isJson) printJson(res);
          else console.log(`Contract ${res.contract_id} FUNDED! PaymentIntent: ${res.payment_intent_id}`);
          return;
        }
      }

      if (sub === 'disputes') {
        if (!op || op === 'list') {
          const res = await client.agentNetwork.listDisputes();
          if (isJson) printJson(res);
          else {
            console.log(`Disputes (${res.count}):`);
            for (const d of res.disputes) printDisputeRecord(d);
          }
          return;
        }
        if (op === 'get') {
          if (!param) {
            console.error('Error: "network disputes get" requires a <dispute_id>');
            process.exit(1);
          }
          const res = await client.agentNetwork.getDispute(param);
          if (isJson) printJson(res);
          else printDisputeRecord(res);
          return;
        }
      }

      if (sub === 'graph') {
        const res = await client.agentNetwork.getGraph();
        if (isJson) printJson(res);
        else printNetworkGraph(res);
        return;
      }
    }

    // 14. Economic Constitution Subsystem Commands
    if (resource === 'policy' || resource === 'constitution') {
      const sub = positional[1];
      const param = positional[2];
      const param2 = positional[3];

      if (!sub || sub === 'active') {
        const res = await client.constitutions.getActive();
        if (isJson) printJson(res);
        else printConstitution(res.constitution, 'ACTIVE REAL CONSTITUTION');
        return;
      }

      if (sub === 'list') {
        const res = await client.constitutions.list();
        if (isJson) printJson(res);
        else printConstitutionsList(res.constitutions);
        return;
      }

      if (sub === 'get' || sub === 'inspect') {
        if (!param) {
          console.error('Usage: agentpay policy get <version>');
          process.exit(1);
        }
        const res = await client.constitutions.get(parseInt(param, 10));
        if (isJson) printJson(res);
        else printConstitution(res.constitution, `v${param} CONSTITUTION`);
        return;
      }

      if (sub === 'evaluate') {
        if (!param) {
          console.error('Usage: agentpay policy evaluate \'<jsonContext>\'');
          process.exit(1);
        }
        let parsed = {};
        try {
          parsed = JSON.parse(param);
        } catch {
          console.error('Invalid JSON context');
          process.exit(1);
        }
        const res = await client.constitutions.evaluate(parsed);
        if (isJson) printJson(res);
        else printConstitutionDecision(res.decision);
        return;
      }

      if (sub === 'diff') {
        if (!param || !param2) {
          console.error('Usage: agentpay policy diff <oldVersion> <newVersion>');
          process.exit(1);
        }
        const res = await client.constitutions.diff(parseInt(param, 10), parseInt(param2, 10));
        if (isJson) printJson(res);
        else printPolicyDiff(res.diff);
        return;
      }

      if (sub === 'activate') {
        if (!param) {
          console.error('Usage: agentpay policy activate <changeRequestId>');
          process.exit(1);
        }
        const res = await client.constitutions.activate(param);
        if (isJson) printJson(res);
        else printConstitution(res.constitution, 'ACTIVATED CONSTITUTION');
        return;
      }

      if (sub === 'rollback') {
        if (!param) {
          console.error('Usage: agentpay policy rollback <targetVersion>');
          process.exit(1);
        }
        const res = await client.constitutions.rollback(parseInt(param, 10));
        if (isJson) printJson(res);
        else printConstitution(res.constitution, 'ROLLED BACK CONSTITUTION');
        return;
      }

      if (sub === 'changes') {
        const res = await client.constitutions.listChanges();
        if (isJson) printJson(res);
        else printPolicyChangeRequestsList(res.change_requests);
        return;
      }
    }

    if (resource === 'economy' || resource === 'clearing') {
      const sub = positional[1] || 'obligations';
      const action = positional[2];
      const param = positional[3];

      if (sub === 'obligations') {
        if (action === 'get' && param) {
          const res = await client.economy.getObligation(param);
          if (isJson) printJson(res);
          else printObligationDetail(res);
          return;
        }
        if (action === 'cancel' && param) {
          const res = await client.economy.cancelObligation(param, (flags['reason'] as string) || undefined);
          if (isJson) printJson(res);
          else console.log(`Obligation ${param} cancelled: ${res.status}`);
          return;
        }
        if (action === 'create') {
          const res = await client.economy.createObligation({
            payer_agent_id: (flags['payer'] as string) || 'agent_payer',
            payee_agent_id: (flags['payee'] as string) || 'agent_payee',
            amount: (flags['amount'] as string) || '1000000',
            currency: (flags['currency'] as string) || 'USDC',
            contract_id: (flags['contract'] as string) || 'contract_cli',
          });
          if (isJson) printJson(res);
          else printObligationDetail(res);
          return;
        }
        const list = await client.economy.listObligations((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printObligationsList(list);
        return;
      }

      if (sub === 'invoices') {
        if (action === 'get' && param) {
          const res = await client.economy.getInvoice(param);
          if (isJson) printJson(res);
          else printInvoiceDetail(res);
          return;
        }
        if (action === 'accept' && param) {
          const res = await client.economy.acceptInvoice(param);
          if (isJson) printJson(res);
          else console.log(`Invoice ${param} accepted.`);
          return;
        }
        if (action === 'dispute' && param) {
          const res = await client.economy.disputeInvoice(param, (flags['reason'] as string) || 'Disputed via CLI');
          if (isJson) printJson(res);
          else console.log(`Invoice ${param} disputed.`);
          return;
        }
        const list = await client.economy.listInvoices((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printInvoicesList(list);
        return;
      }

      if (sub === 'escrows') {
        if (action === 'get' && param) {
          const res = await client.economy.getEscrow(param);
          if (isJson) printJson(res);
          else console.log(JSON.stringify(res, null, 2));
          return;
        }
        if (action === 'release' && param) {
          const amt = (flags['amount'] as string) || '1000000';
          const res = await client.economy.releaseEscrow(param, amt);
          if (isJson) printJson(res);
          else console.log(`Escrow ${param} released ${amt}: ${res.status}`);
          return;
        }
        const list = await client.economy.listEscrows((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printEscrowsList(list);
        return;
      }

      if (sub === 'milestones') {
        if (action === 'verify' && param) {
          const res = await client.economy.verifyMilestone(param);
          if (isJson) printJson(res);
          else console.log(`Milestone ${param} verification: [${res.outcome}] ${res.reason}`);
          return;
        }
        if (action === 'settle' && param) {
          const res = await client.economy.settleMilestone(param);
          if (isJson) printJson(res);
          else console.log(`Milestone ${param} settled: intent=${res.intent_id || res.id} status=${res.status}`);
          return;
        }
        const list = await client.economy.listMilestones(action || undefined);
        if (isJson) printJson(list);
        else printMilestonesList(list);
        return;
      }

      if (sub === 'netting') {
        if (action === 'approve' && param) {
          const agentId = (flags['agent'] as string) || 'agent_payer';
          const res = await client.economy.approveNetting(param, agentId);
          if (isJson) printJson(res);
          else console.log(`Netting proposal ${param} approved by ${agentId}.`);
          return;
        }
        if (action === 'execute' && param) {
          const res = await client.economy.executeNetting(param);
          if (isJson) printJson(res);
          else console.log(`Netting proposal ${param} executed.`);
          return;
        }
        const list = await client.economy.listNetting((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printNettingProposalsList(list);
        return;
      }

      if (sub === 'batches') {
        if (action === 'execute' && param) {
          const res = await client.economy.executeBatch(param);
          if (isJson) printJson(res);
          else console.log(`Batch ${param} executed: status=${res.status}`);
          return;
        }
        const list = await client.economy.listBatches((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printSettlementBatchesList(list);
        return;
      }

      if (sub === 'refunds') {
        const list = await client.economy.listRefunds((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (sub === 'reconciliation') {
        if (action === 'run' && param) {
          const res = await client.economy.reconcileObligation(param);
          if (isJson) printJson(res);
          else console.log(`Reconciled ${param}: status=${res.status} actual=${res.actual_amount}`);
          return;
        }
        const list = await client.economy.listReconciliation((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else printReconciliationList(list);
        return;
      }

      if (sub === 'exposure') {
        const mode = ((flags['mode'] as string) || 'REAL').toUpperCase() as any;
        const res = await client.economy.getExposure((flags['org'] as string) || undefined, mode);
        if (isJson) printJson(res);
        else printExposureSnapshot(res);
        return;
      }

      if (sub === 'health') {
        const mode = ((flags['mode'] as string) || 'REAL').toUpperCase() as any;
        const res = await client.economy.getHealth((flags['org'] as string) || undefined, mode, (flags['balance'] as string) || undefined);
        if (isJson) printJson(res);
        else printHealthSnapshot(res);
        return;
      }

      if (sub === 'ledger') {
        const list = await client.economy.getLedger((flags['org'] as string) || undefined);
        if (isJson) printJson(list);
        else console.log(JSON.stringify(list, null, 2));
        return;
      }
    }

    if (resource === 'treasury') {
      const sub = positional[1] || 'state';
      const action = positional[2];
      const param = positional[3];

      if (sub === 'state') {
        const mode = (flags['mode'] as any) || undefined;
        const orgId = (flags['org'] as string) || undefined;
        const res = await client.treasury.state({ orgId, mode });
        if (isJson) printJson(res);
        else printTreasuryState(res);
        return;
      }

      if (sub === 'balance') {
        const orgId = (flags['org'] as string) || undefined;
        const vault = (flags['vault'] as string) || undefined;
        const res = await client.treasury.balance({ orgId, vault });
        if (isJson) printJson(res);
        else console.log(JSON.stringify(res, null, 2));
        return;
      }

      if (sub === 'reservations') {
        if (action === 'get' && param) {
          const res = await client.treasury.reservations.get(param);
          if (isJson) printJson(res);
          else printTreasuryReservationDetail(res);
          return;
        }
        if (action === 'release' && param) {
          const reason = (flags['reason'] as string) || 'Released via CLI';
          const res = await client.treasury.reservations.release(param, reason);
          if (isJson) printJson(res);
          else console.log(`Reservation ${param} released: status=${res.status}`);
          return;
        }
        if (action === 'consume' && param) {
          const intentId = (flags['intent'] as string) || 'pi_cli_consume';
          const res = await client.treasury.reservations.consume(param, intentId);
          if (isJson) printJson(res);
          else console.log(`Reservation ${param} consumed by intent ${intentId}: status=${res.status}`);
          return;
        }
        if (action === 'create') {
          const amount = (flags['amount'] as string) || '1000000';
          const purpose = (flags['purpose'] as string) || 'CLI_TEST';
          const agentId = (flags['agent'] as string) || undefined;
          const missionId = (flags['mission'] as string) || undefined;
          const timeout = flags['timeout'] ? parseInt(flags['timeout'] as string, 10) : undefined;
          const mode = (flags['mode'] as any) || undefined;
          const orgId = (flags['org'] as string) || 'org_default';

          const res = await client.treasury.reservations.create({
            organization_id: orgId,
            source: purpose,
            amount_base: amount,
            agent_id: agentId,
            mission_id: missionId,
            timeout_seconds: timeout,
            mode,
          });
          if (isJson) printJson(res);
          else printTreasuryReservationDetail(res);
          return;
        }

        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const status = (flags['status'] as any) || undefined;
        const list = await client.treasury.reservations.list({ orgId, mode, status });
        if (isJson) printJson(list);
        else printTreasuryReservationsList(list);
        return;
      }

      if (sub === 'commitments') {
        const orgId = (flags['org'] as string) || undefined;
        const list = await client.treasury.commitments({ orgId });
        if (isJson) printJson(list);
        else console.log(JSON.stringify(list, null, 2));
        return;
      }

      if (sub === 'exposure') {
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const res = await client.treasury.exposure({ orgId, mode });
        if (isJson) printJson(res);
        else console.log(JSON.stringify(res, null, 2));
        return;
      }

      if (sub === 'forecast') {
        const horizon = (action as any) || (flags['horizon'] as any) || '24h';
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const scenario = (flags['scenario'] as any) || undefined;
        const res = await client.treasury.forecast({ orgId, horizon, mode, scenario });
        if (isJson) printJson(res);
        else printTreasuryForecast(res);
        return;
      }

      if (sub === 'stress') {
        const scenarioName = (flags['scenario'] as any) || (action as any) || 'OUTFLOW_SPIKE';
        const simultaneousSettlements = flags['settlements'] ? parseInt(flags['settlements'] as string, 10) : undefined;
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;

        const res = await client.treasury.stress(
          {
            scenario_name: scenarioName,
            simultaneous_settlements: simultaneousSettlements,
          },
          { orgId, mode }
        );
        if (isJson) printJson(res);
        else printTreasuryStressResult(res);
        return;
      }

      if (sub === 'reconcile') {
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const res = await client.treasury.reconcile({ orgId, mode });
        if (isJson) printJson(res);
        else printTreasuryReconciliationReport(res);
        return;
      }

      if (sub === 'anomalies') {
        const orgId = (flags['org'] as string) || undefined;
        const list = await client.treasury.anomalies({ orgId });
        if (isJson) printJson(list);
        else printTreasuryAnomaliesList(list);
        return;
      }

      if (sub === 'health') {
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const res = await client.treasury.health({ orgId, mode });
        if (isJson) printJson(res);
        else printTreasuryHealth(res);
        return;
      }

      if (sub === 'inflows') {
        const orgId = (flags['org'] as string) || undefined;
        const mode = (flags['mode'] as any) || undefined;
        const list = await client.treasury.inflows({ orgId, mode });
        if (isJson) printJson(list);
        else console.log(JSON.stringify(list, null, 2));
        return;
      }
    }

    if (resource === 'control') {
      const sub = positional[1] || 'overview';
      const param = positional[2];
      const orgId = (flags['org'] as string) || undefined;
      const mode = ((flags['mode'] as string) || 'REAL').toUpperCase() as any;

      if (sub === 'overview') {
        const ov = await client.control.getOverview({ orgId, mode });
        if (isJson) printJson(ov);
        else printControlOverview(ov);
        return;
      }

      if (sub === 'state') {
        const st = await client.control.getStateStrip({ orgId, mode });
        if (isJson) printJson(st);
        else printControlStateStrip(st);
        return;
      }

      if (sub === 'activity' || sub === 'timeline') {
        const category = (flags['category'] as string) || undefined;
        const limit = flags['limit'] ? parseInt(flags['limit'] as string, 10) : undefined;
        const res = await client.control.getActivityTimeline({ orgId, mode, category, limit });
        if (isJson) printJson(res);
        else printControlActivity(res.events || []);
        return;
      }

      if (sub === 'trace') {
        const targetId = param || (flags['id'] as string) || 'pi_live_9941';
        const res = await client.control.getFinancialTrace(targetId, { orgId });
        if (isJson) printJson(res);
        else printFinancialTrace(res);
        return;
      }

      if (sub === 'mission') {
        const missionId = param || (flags['id'] as string) || 'msn_global_macro';
        const res = await client.control.getMissionCommandCenter(missionId, { orgId });
        if (isJson) printJson(res);
        else printMissionCommandCenter(res);
        return;
      }

      if (sub === 'arc') {
        const res = await client.control.getArcStatus();
        if (isJson) printJson(res);
        else printArcStatus(res);
        return;
      }

      if (sub === 'incidents') {
        const status = (flags['status'] as string) || undefined;
        const res = await client.control.getIncidents({ orgId, status });
        if (isJson) printJson(res);
        else printControlIncidents(res.incidents || []);
        return;
      }

      if (sub === 'search') {
        const query = param || (flags['q'] as string) || '';
        const res = await client.control.search(query, { orgId });
        if (isJson) printJson(res);
        else printControlSearch(res.results || [], query);
        return;
      }

      if (sub === 'security') {
        const res = await client.control.getSecurityCenter({ orgId });
        if (isJson) printJson(res);
        else console.log(JSON.stringify(res, null, 2));
        return;
      }

      if (sub === 'treasury') {
        const res = await client.control.getTreasuryView({ orgId, mode });
        if (isJson) printJson(res);
        else console.log(JSON.stringify(res, null, 2));
        return;
      }

      if (sub === 'intelligence') {
        const res = await client.control.getIntelligenceView({ orgId });
        if (isJson) printJson(res);
        else console.log(JSON.stringify(res, null, 2));
        return;
      }
    }

    // 16. Autonomous Operations & Durable Runtime (Task 13)
    if (resource === 'runtime') {
      const sub = action || 'status';
      const id = targetId || (flags['id'] as string);

      if (sub === 'status') {
        const metrics = await client.runtime.getMetrics();
        const queues = await client.runtime.getQueues();
        if (isJson) printJson({ metrics, queues });
        else printRuntimeStatus(metrics, queues);
        return;
      }

      if (sub === 'workflows') {
        const state = (flags['state'] as string) || undefined;
        const limit = flags['limit'] ? Number(flags['limit']) : undefined;
        const res = await client.runtime.listWorkflows({ state, limit });
        if (isJson) printJson(res);
        else printRuntimeWorkflows(res.workflows || []);
        return;
      }

      if (sub === 'inspect') {
        if (!id) {
          console.error('Error: "runtime inspect" requires a <workflow_id>');
          process.exit(1);
        }
        const wf = await client.runtime.getWorkflow(id);
        const stepsRes = await client.runtime.listSteps(id);
        const checkpointsRes = await client.runtime.listCheckpoints(id);
        if (isJson) {
          printJson({ workflow: wf, steps: stepsRes.steps, checkpoints: checkpointsRes.checkpoints });
        } else {
          printRuntimeWorkflowDetail(wf, stepsRes.steps || [], checkpointsRes.checkpoints || []);
        }
        return;
      }

      if (sub === 'workers') {
        const res = await client.runtime.listWorkers();
        if (isJson) printJson(res);
        else printRuntimeWorkers(res.workers || []);
        return;
      }

      if (sub === 'recovery') {
        const res = await client.runtime.getRecoveryQueue();
        if (isJson) printJson(res);
        else printRuntimeRecoveryQueue(res.recovery_steps || []);
        return;
      }

      if (sub === 'pause') {
        if (!id) {
          console.error('Error: "runtime pause" requires a <workflow_id>');
          process.exit(1);
        }
        const reason = (flags['reason'] as string) || 'Operator paused workflow via CLI';
        const wf = await client.runtime.getWorkflow(id);
        const res = await client.runtime.pauseWorkflow(id, reason);
        if (isJson) printJson(res);
        else {
          printRuntimeDangerousAction('PAUSE_WORKFLOW', {
            tenant: wf.tenant_id,
            workflow: id,
            currentState: wf.state,
            idempotencyKey: wf.idempotency_key,
            result: res,
          });
        }
        return;
      }

      if (sub === 'resume') {
        if (!id) {
          console.error('Error: "runtime resume" requires a <workflow_id>');
          process.exit(1);
        }
        const wf = await client.runtime.getWorkflow(id);
        const res = await client.runtime.resumeWorkflow(id);
        if (isJson) printJson(res);
        else {
          printRuntimeDangerousAction('RESUME_WORKFLOW', {
            tenant: wf.tenant_id,
            workflow: id,
            currentState: wf.state,
            idempotencyKey: wf.idempotency_key,
            result: res,
          });
        }
        return;
      }

      if (sub === 'cancel') {
        if (!id) {
          console.error('Error: "runtime cancel" requires a <workflow_id>');
          process.exit(1);
        }
        const reason = (flags['reason'] as string) || 'Operator cancelled workflow via CLI';
        const wf = await client.runtime.getWorkflow(id);
        const res = await client.runtime.cancelWorkflow(id, reason);
        if (isJson) printJson(res);
        else {
          printRuntimeDangerousAction('CANCEL_WORKFLOW', {
            tenant: wf.tenant_id,
            workflow: id,
            currentState: wf.state,
            idempotencyKey: wf.idempotency_key,
            result: res,
          });
        }
        return;
      }

      if (sub === 'reconcile') {
        if (!id) {
          console.error('Error: "runtime reconcile" requires an <incident_id>');
          process.exit(1);
        }
        const res = await client.runtime.reconcileIncident(id);
        if (isJson) printJson(res);
        else {
          printRuntimeDangerousAction('RECONCILE_INCIDENT', {
            tenant: 'tenant_default',
            workflow: id,
            currentState: 'RECONCILING',
            idempotencyKey: `idem_reconcile_${id}`,
            result: res,
          });
        }
        return;
      }
    }

    if (resource === 'ops' || resource === 'operations') {
      const sub = positional[1] || 'status';
      const arg = positional[2];

      if (sub === 'status') {
        const snap = await client.operations.getOperationsSnapshot();
        if (isJson) printJson(snap);
        else printOpsStatus(snap);
        return;
      }

      if (sub === 'health') {
        const health = await client.operations.getOperationsHealth();
        if (isJson) printJson(health);
        else printOpsHealth(health);
        return;
      }

      if (sub === 'workers') {
        const res = await client.operations.getWorkers();
        if (isJson) printJson(res);
        else printOpsWorkers(res.workers);
        return;
      }

      if (sub === 'queues') {
        const queues = await client.operations.getQueues();
        if (isJson) printJson(queues);
        else printOpsQueues(queues);
        return;
      }

      if (sub === 'incidents') {
        const res = await client.operations.getIncidents();
        if (isJson) printJson(res);
        else printOpsIncidents(res.incidents);
        return;
      }

      if (sub === 'topology') {
        const topo = await client.operations.getTopology();
        if (isJson) printJson(topo);
        else printOpsTopology(topo);
        return;
      }

      if (sub === 'workflow') {
        if (!arg) {
          console.error('Error: "ops workflow" requires a <workflow_id>');
          process.exit(1);
        }
        const wf = await client.runtime.getWorkflow(arg);
        if (isJson) printJson(wf);
        else printRuntimeWorkflowDetail(wf);
        return;
      }

      if (sub === 'replay') {
        if (!arg) {
          console.error('Error: "ops replay" requires a <workflow_id>');
          process.exit(1);
        }
        const replay = await client.operations.getWorkflowReplay(arg);
        if (isJson) printJson(replay);
        else printOpsReplay(replay);
        return;
      }

      if (sub === 'why') {
        if (!arg) {
          console.error('Error: "ops why" requires an <event_id>');
          process.exit(1);
        }
        const why = await client.operations.explainEvent(arg);
        if (isJson) printJson(why);
        else printOpsWhy(why);
        return;
      }

      if (sub === 'next') {
        if (!arg) {
          console.error('Error: "ops next" requires a <workflow_id>');
          process.exit(1);
        }
        const next = await client.operations.getNextAction(arg);
        if (isJson) printJson(next);
        else printOpsNext(next);
        return;
      }

      if (sub === 'state-at') {
        if (!arg) {
          console.error('Error: "ops state-at" requires a <timestamp>');
          process.exit(1);
        }
        const state = await client.operations.getStateAt(arg);
        if (isJson) printJson(state);
        else printOpsStateAt(state);
        return;
      }
    }

    // Task 15 Autonomous Economic Fabric Commands
    if (resource === 'objective' || resource === 'fabric') {
      const sub = action;
      const arg = targetId || (flags['id'] as string) || (positional[2] as string);
      const isDryRun = Boolean(flags['dry-run'] || flags['dryRun']);

      if (sub === 'create') {
        const desc = (flags['desc'] as string) || (flags['description'] as string) || positional.slice(2).join(' ') || 'Produce verified security report';
        const tenant = (flags['tenant'] as string) || (flags['tenant_id'] as string) || 'tenant_default';
        const budget = (flags['budget'] as string) || '100.00';
        const operationalBudget = (flags['operational-budget'] as string) || '100.00';
        const deadline = flags['deadline'] as string | undefined;
        const owner = (flags['owner'] as string) || 'operator';
        const risk = (flags['risk'] as string) || 'MEDIUM';

        const res = await client.fabric.createObjective({
          tenant_id: tenant,
          description: desc,
          economic_budget: budget,
          operational_budget: operationalBudget,
          risk_tolerance: risk,
          owner,
          deadline,
          constraints: {
            max_budget: budget,
            max_parallel_tasks: 5,
            deadline: deadline || '',
          },
        });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'status' || sub === 'get' || sub === 'list') {
        if (arg && sub !== 'list') {
          const res = await client.fabric.getObjective(arg);
          if (isJson) printJson(res);
          else printObjective(res);
        } else {
          const status = flags['status'] as string | undefined;
          const tenant = flags['tenant'] as string | undefined;
          const res = await client.fabric.listObjectives({ status, tenant_id: tenant });
          if (isJson) printJson(res);
          else printObjectivesList(res);
        }
        return;
      }

      if (sub === 'plan') {
        if (!arg) {
          console.error('Error: "objective plan" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.planObjective(arg, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else if (res.blueprint) printBlueprint(res.blueprint);
        else printObjective(res);
        return;
      }

      if (sub === 'simulate') {
        if (!arg) {
          console.error('Error: "objective simulate" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.simulateObjective(arg, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjectiveSimulation(res);
        return;
      }

      if (sub === 'start') {
        if (!arg) {
          console.error('Error: "objective start" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.startObjective(arg, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'pause') {
        if (!arg) {
          console.error('Error: "objective pause" requires an <objective_id>');
          process.exit(1);
        }
        const reason = (flags['reason'] as string) || 'Operator requested pause';
        const res = await client.fabric.pauseObjective(arg, reason, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'resume') {
        if (!arg) {
          console.error('Error: "objective resume" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.resumeObjective(arg, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'replan') {
        if (!arg) {
          console.error('Error: "objective replan" requires an <objective_id>');
          process.exit(1);
        }
        const reason = (flags['reason'] as string) || 'Operator requested replan';
        const res = await client.fabric.replanObjective(arg, reason, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'cancel') {
        if (!arg) {
          console.error('Error: "objective cancel" requires an <objective_id>');
          process.exit(1);
        }
        const reason = (flags['reason'] as string) || 'Operator cancelled objective';
        const res = await client.fabric.cancelObjective(arg, reason, { dry_run: isDryRun });
        if (isJson) printJson(res);
        else printObjective(res);
        return;
      }

      if (sub === 'trace') {
        if (!arg) {
          console.error('Error: "objective trace" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.getObjectiveTrace(arg);
        if (isJson) printJson(res);
        else printObjectiveTrace(res);
        return;
      }

      if (sub === 'explain') {
        if (!arg) {
          console.error('Error: "objective explain" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.explainObjective(arg);
        if (isJson) printJson(res);
        else printObjectiveExplain(res);
        return;
      }

      if (sub === 'why-not') {
        if (!arg) {
          console.error('Error: "objective why-not" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.getWhyNot(arg);
        if (isJson) printJson(res);
        else printObjectiveWhyNot(res);
        return;
      }

      if (sub === 'state') {
        if (!arg) {
          console.error('Error: "objective state" requires an <objective_id>');
          process.exit(1);
        }
        const res = await client.fabric.getObjectiveState(arg);
        if (isJson) printJson(res);
        else printObjectiveState(res);
        return;
      }

      if (sub === 'metrics') {
        const res = await client.fabric.getAutonomyMetrics();
        if (isJson) printJson(res);
        else printAutonomyMetrics(res);
        return;
      }
    }

    console.error(`Unknown command: ${rawArgs.join(' ')}`);
    printHelp();
    process.exit(1);
  } catch (err: any) {
    if (isJson) {
      printJson({
        error: {
          name: err.name || 'Error',
          code: err.code || 'UNKNOWN_ERROR',
          message: err.message,
          statusCode: err.statusCode,
          requestId: err.requestId,
        },
      });
    } else {
      console.error(`\nError: ${err.message}`);
      if (err.code) console.error(`Code: ${err.code}`);
      if (err.requestId) console.error(`Request ID: ${err.requestId}`);
    }
    process.exit(1);
  }
}

main();
