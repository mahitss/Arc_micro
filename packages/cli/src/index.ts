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
  printPaymentIntent,
  printPaymentIntentsList,
  printPaymentTrace,
  printQuote,
  printServicesList,
  printSimulationResult,
  printTransactionsList,
  printWebhooksList,
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

Options:
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
