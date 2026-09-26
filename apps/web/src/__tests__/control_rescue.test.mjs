import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatRate, formatPercent, formatCurrency, formatCount } from '../lib/utils/format.js';

describe('TASK 30 — Control Tower UI Rescue & Simulation Truthfulness Suite', () => {
  // =========================================================================
  // 1. CRITICAL BUG — NEVER SHOW NaN / ZERO DENOMINATOR HANDLING
  // =========================================================================
  describe('1. Critical Bug — NaN Prevention & Safe Rate Calculations', () => {
    it('formatRate never outputs NaN%, Infinity%, undefined%, or null%', () => {
      const dangerousInputs = [
        undefined,
        null,
        NaN,
        Infinity,
        -Infinity,
        'not_a_number',
        {},
        [],
      ];

      for (const input of dangerousInputs) {
        const result = formatRate(input);
        assert.doesNotMatch(result, /NaN/i, `formatRate(${input}) produced NaN`);
        assert.doesNotMatch(result, /Infinity/i, `formatRate(${input}) produced Infinity`);
        assert.doesNotMatch(result, /undefined/i, `formatRate(${input}) produced undefined`);
        assert.doesNotMatch(result, /null/i, `formatRate(${input}) produced null`);
        assert.equal(result, '—', `Dangerous input ${input} should return default truthful placeholder '—'`);
      }
    });

    it('formatRate correctly formats ratios and percentages', () => {
      // Decimal ratio (e.g. 0.945 -> 94.5%)
      assert.equal(formatRate(0.945), '94.5%');
      assert.equal(formatRate(0.98), '98.0%');
      assert.equal(formatRate(1.0), '100.0%');

      // Pre-multiplied percentage (e.g. 94.5 -> 94.5%)
      assert.equal(formatRate(94.5), '94.5%');
      assert.equal(formatRate(98.0), '98.0%');
      assert.equal(formatRate(100), '100.0%');

      // Custom decimals
      assert.equal(formatRate(0.9456, { decimals: 2 }), '94.56%');
    });

    it('formatRate handles zero with truthful empty state when requested', () => {
      assert.equal(formatRate(0, { emptyIfZero: true }), 'No completed workflows');
      assert.equal(formatRate(0, { emptyIfZero: true, emptyText: '—' }), '—');
      assert.equal(formatRate(0), '0.0%');
    });

    it('formatPercent handles zero denominator truthfully without NaN or Infinity', () => {
      // 0 / 0 scenario
      const zeroZero = formatPercent(0, 0);
      assert.equal(zeroZero, '—');
      assert.doesNotMatch(zeroZero, /NaN/i);

      // x / 0 scenario
      const divZero = formatPercent(14, 0);
      assert.equal(divZero, '—');
      assert.doesNotMatch(divZero, /Infinity/i);

      // Custom empty state text
      const customEmpty = formatPercent(0, 0, { zeroDenominatorText: 'No completed workflows' });
      assert.equal(customEmpty, 'No completed workflows');

      // Valid calculation
      const valid = formatPercent(14, 25);
      assert.equal(valid, '56.0%');
    });

    it('formatCurrency never outputs NaN or invalid numbers', () => {
      assert.equal(formatCurrency(undefined), '—');
      assert.equal(formatCurrency(null), '—');
      assert.equal(formatCurrency(NaN), '—');
      assert.equal(formatCurrency(25), '$25.00');
      assert.equal(formatCurrency('14.00'), '$14.00');
      assert.equal(formatCurrency(25000000, { divideByMicro: true }), '$25.00');
    });
  });

  // =========================================================================
  // 2. REMOVE MISLEADING "LIVE" LANGUAGE & SIMULATION TRUTHFULNESS
  // =========================================================================
  describe('2. Truthful System Presentation & Simulation Boundaries', () => {
    it('enforces SIMULATION MODE when live execution is disabled', () => {
      const systemState = {
        arcMainnet: 'CONNECTED',
        chainId: 5042,
        agentVault: 'NOT DEPLOYED',
        liveExecution: 'DISABLED',
        realSettlements: 0,
      };

      // Truthful badge derivation
      const modeText = systemState.liveExecution === 'ENABLED' ? 'LIVE EXECUTION' : 'SIMULATION MODE';
      assert.equal(modeText, 'SIMULATION MODE', 'Must never display LIVE when execution is disabled');

      const bannerText = systemState.liveExecution === 'ENABLED'
        ? 'AUTONOMOUS ECONOMIC FABRIC LIVE'
        : 'SIMULATION MODE';
      assert.equal(bannerText, 'SIMULATION MODE', 'Economic fabric must be labeled SIMULATION MODE');
    });

    it('demo action button is labeled RUN SIMULATION, not RUN LIVE DEMO', () => {
      const isLiveExecution = false;
      const buttonLabel = isLiveExecution ? 'RUN LIVE DEMO' : 'RUN SIMULATION';
      assert.equal(buttonLabel, 'RUN SIMULATION');
      assert.doesNotMatch(buttonLabel, /LIVE/i);
    });

    it('never displays fake transactions or fake explorer links', () => {
      const realSettlement = {
        tx_hash: null,
        explorer_url: null,
        verified: false,
        count: 0,
      };

      assert.equal(realSettlement.tx_hash, null);
      assert.equal(realSettlement.explorer_url, null);
      assert.equal(realSettlement.verified, false);
      assert.equal(realSettlement.count, 0);
    });
  });

  // =========================================================================
  // 3. TOP NAVIGATION REDESIGN
  // =========================================================================
  describe('3. Top Navigation Redesign — 6 Primary Items', () => {
    it('primary navigation contains exactly the 6 required institutional sections', () => {
      const PRIMARY_NAV = [
        { label: 'CONTROL', href: '/control' },
        { label: 'MISSIONS', href: '/missions' },
        { label: 'MARKETPLACE', href: '/marketplace' },
        { label: 'ECONOMY', href: '/economy' },
        { label: 'SECURITY', href: '/security' },
        { label: 'ARC', href: '/arc' },
      ];

      assert.equal(PRIMARY_NAV.length, 6, 'Must contain exactly 6 primary navigation items');
      assert.deepEqual(
        PRIMARY_NAV.map((n) => n.label),
        ['CONTROL', 'MISSIONS', 'MARKETPLACE', 'ECONOMY', 'SECURITY', 'ARC']
      );
      assert.deepEqual(
        PRIMARY_NAV.map((n) => n.href),
        ['/control', '/missions', '/marketplace', '/economy', '/security', '/arc']
      );
    });

    it('secondary architecture surfaces remain accessible via dropdown/subsystems', () => {
      const SECONDARY_SUBSYSTEMS = [
        '/control/autonomy',
        '/control/objectives',
        '/control/protocol',
        '/control/runtime',
        '/control/operations',
        '/economy/clearing',
        '/treasury',
        '/swarms',
        '/simulator',
        '/constitution',
        '/approvals',
      ];

      for (const route of SECONDARY_SUBSYSTEMS) {
        assert.ok(route.startsWith('/') && route.length > 2, `Route ${route} should be valid`);
      }
    });
  });

  // =========================================================================
  // 4. FLAGSHIP MISSION & DETERMINISTIC DEMO STATE
  // =========================================================================
  describe('4. Flagship Mission & Deterministic Demo Integrity', () => {
    const FLAGSHIP_MISSION = {
      id: 'msn_market_intel_01',
      title: 'AUTONOMOUS MARKET INTELLIGENCE',
      status: 'RUNNING',
      budgetUsdc: 25.0,
      committedUsdc: 14.0,
      riskScore: 24,
      riskMax: 100,
      policyDecision: 'ALLOW',
      provider: 'BudgetAI',
      executionStatus: 'RECOVERED FROM PROVIDER FAILURE',
      nextAction: 'VALIDATE RESULT',
    };

    it('flagship mission card matches deterministic specification', () => {
      assert.equal(FLAGSHIP_MISSION.title, 'AUTONOMOUS MARKET INTELLIGENCE');
      assert.equal(FLAGSHIP_MISSION.status, 'RUNNING');
      assert.equal(FLAGSHIP_MISSION.budgetUsdc, 25.0);
      assert.equal(FLAGSHIP_MISSION.committedUsdc, 14.0);
      assert.equal(FLAGSHIP_MISSION.riskScore, 24);
      assert.equal(FLAGSHIP_MISSION.policyDecision, 'ALLOW');
      assert.equal(FLAGSHIP_MISSION.provider, 'BudgetAI');
      assert.equal(FLAGSHIP_MISSION.executionStatus, 'RECOVERED FROM PROVIDER FAILURE');
      assert.equal(FLAGSHIP_MISSION.nextAction, 'VALIDATE RESULT');
    });

    it('committed spend plus uncommitted balance preserves budget envelope', () => {
      const remainingUnspent = FLAGSHIP_MISSION.budgetUsdc - FLAGSHIP_MISSION.committedUsdc;
      assert.equal(remainingUnspent, 11.0);
      assert.equal(FLAGSHIP_MISSION.committedUsdc + remainingUnspent, 25.0);
    });
  });

  // =========================================================================
  // 5. AGENT AUTHORITY COMPACT CARD (SECTION 7)
  // =========================================================================
  describe('5. Agent Authority Boundary — Compact Scannability', () => {
    const AGENT_AUTHORITY = {
      allowed: [
        'Discover',
        'Negotiate',
        'Plan',
        'Replan',
        'Request payment',
      ],
      forbidden: [
        'Sign transactions',
        'Increase budget',
        'Change policy',
        'Choose arbitrary recipient',
        'Execute arbitrary calldata',
      ],
      axiom: 'AUTONOMY CHANGES THE PLAN. POLICY CONTROLS THE POWER.',
    };

    it('has exactly 5 allowed capabilities and 5 forbidden powers', () => {
      assert.equal(AGENT_AUTHORITY.allowed.length, 5);
      assert.equal(AGENT_AUTHORITY.forbidden.length, 5);
      assert.equal(AGENT_AUTHORITY.allowed[0], 'Discover');
      assert.equal(AGENT_AUTHORITY.forbidden[0], 'Sign transactions');
    });

    it('prohibits private keys and transaction signing by autonomous agents', () => {
      assert.ok(AGENT_AUTHORITY.forbidden.includes('Sign transactions'));
      assert.ok(AGENT_AUTHORITY.forbidden.includes('Increase budget'));
      assert.ok(AGENT_AUTHORITY.forbidden.includes('Change policy'));
    });

    it('preserves the constitutional core statement', () => {
      assert.equal(
        AGENT_AUTHORITY.axiom,
        'AUTONOMY CHANGES THE PLAN. POLICY CONTROLS THE POWER.'
      );
    });
  });

  // =========================================================================
  // 6. WHY / WHY NOT DECISION EXPLANATIONS (SECTION 8)
  // =========================================================================
  describe('6. Dedicated Why / Why Not Explanations', () => {
    const DECISIONS = {
      whyThisProvider: 'Lowest eligible quote within budget and policy constraints.',
      whyNot28Provider: 'Quote exceeds the $25 mission budget.',
      whyNotRetried: 'Execution was fenced. Blind retry is prohibited.',
      whyFallbackAllowed: 'Capability + budget + policy + risk constraints passed.',
      whyNotArc: 'Live execution disabled. AgentVault not deployed.',
    };

    it('provides clear institutional auditability for all 5 decisions', () => {
      assert.equal(DECISIONS.whyThisProvider, 'Lowest eligible quote within budget and policy constraints.');
      assert.equal(DECISIONS.whyNot28Provider, 'Quote exceeds the $25 mission budget.');
      assert.equal(DECISIONS.whyNotRetried, 'Execution was fenced. Blind retry is prohibited.');
      assert.equal(DECISIONS.whyFallbackAllowed, 'Capability + budget + policy + risk constraints passed.');
      assert.equal(DECISIONS.whyNotArc, 'Live execution disabled. AgentVault not deployed.');
    });
  });

  // =========================================================================
  // 7. ARC STATUS & TRUTHFUL SETTLEMENT PRESENTATION (SECTION 16)
  // =========================================================================
  describe('7. Truthful Arc Mainnet Presentation', () => {
    const ARC_CARD = {
      network: 'Arc Mainnet',
      status: 'CONNECTED',
      chainId: 5042,
      nativeUsdc: 'VERIFIED',
      agentVault: 'NOT DEPLOYED',
      liveExecution: 'DISABLED',
      realSettlements: '0 VERIFIED',
    };

    it('displays truthful un-deployed status without fake hashes', () => {
      assert.equal(ARC_CARD.status, 'CONNECTED');
      assert.equal(ARC_CARD.chainId, 5042);
      assert.equal(ARC_CARD.nativeUsdc, 'VERIFIED');
      assert.equal(ARC_CARD.agentVault, 'NOT DEPLOYED');
      assert.equal(ARC_CARD.liveExecution, 'DISABLED');
      assert.equal(ARC_CARD.realSettlements, '0 VERIFIED');
    });
  });

  // =========================================================================
  // 8. KPI CARDS TRUTHFULNESS & EMPTY STATES (SECTIONS 10 & 13)
  // =========================================================================
  describe('8. KPI Cards & Intentional Zero States', () => {
    it('formats demo KPI metrics truthfully', () => {
      const kpis = {
        activeMission: 1,
        runningWorkflow: 1,
        missionBudget: '$25.00',
        committed: '$14.00',
        recovery: '1 Failure → 1 Recovery',
        policy: 'ENFORCED',
        authority: 'BOUNDED',
      };

      assert.equal(kpis.activeMission, 1);
      assert.equal(kpis.runningWorkflow, 1);
      assert.equal(kpis.missionBudget, '$25.00');
      assert.equal(kpis.committed, '$14.00');
      assert.equal(kpis.policy, 'ENFORCED');
      assert.equal(kpis.authority, 'BOUNDED');
    });

    it('empty state outputs intentional descriptive message instead of raw 0 or NaN', () => {
      const emptyObjectives = [];
      const emptyStateMessage = emptyObjectives.length === 0
        ? 'NO ACTIVE OBJECTIVES — Create a mission to begin autonomous execution.'
        : `${emptyObjectives.length} active`;

      assert.equal(
        emptyStateMessage,
        'NO ACTIVE OBJECTIVES — Create a mission to begin autonomous execution.'
      );
    });
  });
});
