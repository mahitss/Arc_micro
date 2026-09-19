/**
 * @file demo_fixtures.ts
 * @description Isolated mock fixtures for DEMO MODE only.
 * 
 * CRITICAL INVARIANT:
 * These fixtures are strictly used when the user explicitly enables DEMO MODE
 * or for local UI component testing when backend services are offline.
 * Every entity is explicitly tagged with [DEMO] to prevent mistaking for real data.
 */

import { Agent, AgentDetail, PaymentIntent, RegisteredService, TransactionRecord } from './types';

export const DEMO_AGENTS: Agent[] = [
  {
    id: 'research-agent',
    name: '[DEMO] Research Agent',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    usdc_balance: '12.48',
    vault_address: '0x1111111111111111111111111111111111111111',
    daily_limit: '5.00',
    daily_spent: '2.41',
    pending_intents: 1,
    last_activity: '2 mins ago',
  },
  {
    id: 'compute-agent',
    name: '[DEMO] Compute Optimizer Agent',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    usdc_balance: '45.00',
    vault_address: '0x2222222222222222222222222222222222222222',
    daily_limit: '20.00',
    daily_spent: '8.50',
    pending_intents: 0,
    last_activity: '15 mins ago',
  },
];

export const DEMO_AGENT_DETAIL: AgentDetail = {
  ...DEMO_AGENTS[0],
  network: 'Arc Network (Chain ID 5042)',
  policy: {
    enabled: true,
    per_transaction_limit: '500000', // $0.50 USDC
    daily_spending_limit: '5000000', // $5.00 USDC
    daily_spent: '2410000', // $2.41 USDC
    remaining_daily_limit: '2590000', // $2.59 USDC
    max_transactions_per_day: 20,
    transactions_today: 7,
    allowed_recipients: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ],
    blocked_recipients: [
      '0x000000000000000000000000000000000000dEaD',
    ],
  },
};

export const DEMO_SERVICES: RegisteredService[] = [
  {
    id: 'web-research',
    name: 'Web Research & Intelligence API',
    recipient: '0x1111111111111111111111111111111111111111',
    asset: 'USDC',
    enabled: true,
    max_price: '500000', // 0.50 USDC
  },
  {
    id: 'compute-cluster',
    name: 'GPU Inference Compute Cluster',
    recipient: '0x2222222222222222222222222222222222222222',
    asset: 'USDC',
    enabled: true,
    max_price: '2000000', // 2.00 USDC
  },
  {
    id: 'data-feed',
    name: 'Decentralized Oracle Data Feed',
    recipient: '0x3333333333333333333333333333333333333333',
    asset: 'USDC',
    enabled: true,
    max_price: '100000', // 0.10 USDC
  },
];

export const DEMO_INTENTS: PaymentIntent[] = [
  {
    intent_id: 'intent_demo_auth123',
    agent_id: 'research-agent',
    vault_address: '0x1111111111111111111111111111111111111111',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '180000', // 0.18 USDC
    asset: 'USDC',
    purpose: 'api_usage',
    service: 'web-research',
    justification: '[DEMO] External data is required to complete the research task.',
    status: 'AUTHORIZED',
    created_at: new Date(Date.now() - 60000).toISOString(),
    expires_at: new Date(Date.now() + 240000).toISOString(),
    updated_at: new Date(Date.now() - 40000).toISOString(),
  },
  {
    intent_id: 'intent_demo_conf456',
    agent_id: 'research-agent',
    vault_address: '0x1111111111111111111111111111111111111111',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '180000',
    asset: 'USDC',
    purpose: 'api_usage',
    service: 'web-research',
    justification: '[DEMO] Web search indexing for Arc microgrants.',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() - 3300000).toISOString(),
    updated_at: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    intent_id: 'intent_demo_deny789',
    agent_id: 'research-agent',
    vault_address: '0x1111111111111111111111111111111111111111',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '6000000', // 6.00 USDC (Exceeds daily limit)
    asset: 'USDC',
    purpose: 'api_usage',
    service: 'web-research',
    justification: '[DEMO] Bulk query exceeding daily allowance.',
    status: 'DENIED',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    expires_at: new Date(Date.now() - 6900000).toISOString(),
    updated_at: new Date(Date.now() - 7190000).toISOString(),
  },
  {
    intent_id: 'intent_demo_exp000',
    agent_id: 'research-agent',
    vault_address: '0x1111111111111111111111111111111111111111',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '180000',
    asset: 'USDC',
    purpose: 'api_usage',
    service: 'web-research',
    justification: '[DEMO] Query timed out before user confirmed.',
    status: 'EXPIRED',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    expires_at: new Date(Date.now() - 14100000).toISOString(),
    updated_at: new Date(Date.now() - 14100000).toISOString(),
  },
];

export const DEMO_TRANSACTIONS: TransactionRecord[] = [
  {
    intent_id: 'intent_demo_conf456',
    transaction_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    status: 'CONFIRMED',
    submitted_at: new Date(Date.now() - 3550000).toISOString(),
    confirmed_at: new Date(Date.now() - 3500000).toISOString(),
    agent_id: 'research-agent',
    vault_address: '0x1111111111111111111111111111111111111111',
    recipient: '0x1111111111111111111111111111111111111111',
    amount: '180000',
  },
];
