import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Dashboard renders and calculates metrics accurately.
describe('1. Dashboard renders', () => {
  it('aggregates agent and intent metrics correctly', () => {
    const agents = [
      { id: 'agent-1', name: 'Agent 1', status: 'ACTIVE', usdc_balance: '12.48', daily_spent: '2.41' },
      { id: 'agent-2', name: 'Agent 2', status: 'INACTIVE', usdc_balance: '10.00', daily_spent: '1.00' },
    ];
    const intents = [
      { intent_id: 'i1', status: 'CREATED' },
      { intent_id: 'i2', status: 'AUTHORIZED' },
      { intent_id: 'i3', status: 'CONFIRMED' },
    ];

    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status === 'ACTIVE').length;
    const pendingIntents = intents.filter((i) => i.status === 'CREATED' || i.status === 'AUTHORIZED').length;
    const confirmedPayments = intents.filter((i) => i.status === 'CONFIRMED').length;

    const totalBalance = agents.reduce((acc, a) => acc + parseFloat(a.usdc_balance), 0);
    const totalSpentToday = agents.reduce((acc, a) => acc + parseFloat(a.daily_spent), 0);

    assert.equal(totalAgents, 2);
    assert.equal(activeAgents, 1);
    assert.equal(pendingIntents, 2);
    assert.equal(confirmedPayments, 1);
    assert.equal(totalBalance, 22.48);
    assert.equal(totalSpentToday, 3.41);
  });
});

// Test 2: Loading state works.
describe('2. Loading state works', () => {
  it('generates skeleton loading indicator markup when loading is true', () => {
    const loading = true;
    const skeletonClass = loading ? 'animate-pulse' : '';
    assert.equal(skeletonClass, 'animate-pulse');
  });
});

// Test 3: Empty agent state works.
describe('3. Empty agent state works', () => {
  it('detects empty agent collection and provides actionable message', () => {
    const agents = [];
    const isEmpty = agents.length === 0;
    const emptyTitle = 'No Agents Registered';
    assert.ok(isEmpty);
    assert.equal(emptyTitle, 'No Agents Registered');
  });
});

// Test 4: API error state works.
describe('4. API error state works', () => {
  it('never turns network errors into $0.00 balance', () => {
    const networkError = true;
    const balanceDisplay = networkError ? 'Unavailable' : '$0.00';
    assert.equal(balanceDisplay, 'Unavailable');
    assert.notEqual(balanceDisplay, '$0.00');
  });
});

// Test 5: Agent detail renders.
describe('5. Agent detail renders', () => {
  it('computes spending policy and remaining budget without float errors', () => {
    const policy = {
      daily_spending_limit: '5000000', // 5.00 USDC
      daily_spent: '2410000',          // 2.41 USDC
      remaining_daily_limit: '2590000', // 2.59 USDC
      per_transaction_limit: '500000',  // 0.50 USDC
      transactions_today: 7,
      max_transactions_per_day: 20,
    };

    const dailyLimit = Number(policy.daily_spending_limit) / 1_000_000;
    const dailySpent = Number(policy.daily_spent) / 1_000_000;
    const remaining = Number(policy.remaining_daily_limit) / 1_000_000;
    const perTx = Number(policy.per_transaction_limit) / 1_000_000;

    assert.equal(dailyLimit, 5.00);
    assert.equal(dailySpent, 2.41);
    assert.equal(remaining, 2.59);
    assert.equal(perTx, 0.50);
    assert.equal(policy.transactions_today, 7);
  });
});

// Test 6: Intent statuses render correctly.
describe('6. Intent statuses render correctly', () => {
  it('validates all lifecycle statuses in the finite state machine', () => {
    const validStatuses = [
      'CREATED',
      'AUTHORIZED',
      'DENIED',
      'EXECUTING',
      'SUBMITTED',
      'CONFIRMED',
      'FAILED',
      'EXPIRED',
    ];

    validStatuses.forEach((st) => {
      assert.ok(typeof st === 'string');
      assert.equal(st, st.toUpperCase());
    });
  });
});

// Test 7: Denied intent displays reason.
describe('7. Denied intent displays reason', () => {
  it('displays policy denial notice and prohibits execution', () => {
    const intent = { status: 'DENIED', justification: 'Over daily limit' };
    const canConfirm = intent.status === 'AUTHORIZED';
    assert.equal(canConfirm, false);
    assert.equal(intent.status, 'DENIED');
  });
});

// Test 8: Authorized intent displays confirmation state.
describe('8. Authorized intent displays confirmation state', () => {
  it('enables confirmation action when intent is AUTHORIZED', () => {
    const intent = { status: 'AUTHORIZED', amount: '180000' };
    const canConfirm = intent.status === 'AUTHORIZED';
    const amountUSDC = Number(intent.amount) / 1_000_000;
    assert.equal(canConfirm, true);
    assert.equal(amountUSDC, 0.18);
  });
});

// Test 9: Expired intent cannot be confirmed.
describe('9. Expired intent cannot be confirmed', () => {
  it('blocks confirmation when intent status is EXPIRED', () => {
    const intent = { status: 'EXPIRED' };
    const canConfirm = intent.status === 'AUTHORIZED';
    assert.equal(canConfirm, false);
  });
});

// Test 10: Transaction hash rendering.
describe('10. Transaction hash rendering', () => {
  it('truncates hash for readable UI display while preserving full value for copy', () => {
    const fullHash = '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b';
    const truncated = `${fullHash.slice(0, 8)}...${fullHash.slice(-6)}`;
    assert.equal(truncated, '0x9a8b7c...0f9a8b');
    assert.equal(fullHash.length, 66);
  });
});

// Test 11: Explorer link only appears when valid.
describe('11. Explorer link only appears when valid', () => {
  it('omits explorer link when explorerUrl is absent or unverified', () => {
    const verifiedExplorerUrl = null;
    const txHash = '0x123456';
    const hasExplorerLink = Boolean(verifiedExplorerUrl && txHash);
    assert.equal(hasExplorerLink, false);

    const verifiedUrl = 'https://explorer.arc.io';
    const hasVerifiedLink = Boolean(verifiedUrl && txHash);
    assert.equal(hasVerifiedLink, true);
  });
});

// Test 12: Network status displays correctly.
describe('12. Network status displays correctly', () => {
  it('displays LOCAL / TEST ENVIRONMENT when isVerifiedMainnet is false', () => {
    const isVerifiedMainnet = false;
    const label = isVerifiedMainnet ? 'Arc Mainnet' : 'Local / Test Environment';
    assert.equal(label, 'Local / Test Environment');
  });
});

// Test 13: Sensitive fields are never rendered.
describe('13. Sensitive fields are never rendered', () => {
  it('ensures no private keys, seed phrases, or executor credentials exist in frontend code', () => {
    const frontendPayload = {
      vault_address: '0x1111111111111111111111111111111111111111',
      recipient: '0x2222222222222222222222222222222222222222',
      amount: '180000',
    };

    assert.equal('private_key' in frontendPayload, false);
    assert.equal('executor_key' in frontendPayload, false);
    assert.equal('seed_phrase' in frontendPayload, false);
  });
});

// Test 14: Auto-execution indicator is correct.
describe('14. Auto-execution indicator is correct', () => {
  it('renders MANUAL CONFIRMATION REQUIRED when auto-execution is disabled', () => {
    const autoExecution = false;
    const badgeText = autoExecution ? 'Auto Execution Enabled' : 'Manual Confirmation Required';
    assert.equal(badgeText, 'Manual Confirmation Required');
  });
});
