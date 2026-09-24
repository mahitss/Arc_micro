# Multi-Party Graph Netting Engine (Task 18, Sections 11–14)

## 1. Principles of Value Conservation

Netting in AgentPay is strictly a proposal mechanism that analyzes obligation graphs to identify circular and bilateral debt cancellations.

> **CONSERVATION INVARIANT (INV-202 & INV-220)**:
> Netting can never create money or destroy uncancelled obligations:
> $$\sum \text{Gross Obligation Value} = \sum \text{Net Transfer Value} + \sum \text{Gross Savings Value}$$
> Every cent eliminated must correspond to exact, mutual debt offset.

## 2. Bounded Graph Cycle Netting

Consider three counterparties with a circular debt dependency:
- **Agent A owes Agent B**: 10.00 USDC
- **Agent B owes Agent C**: 6.00 USDC
- **Agent C owes Agent A**: 4.00 USDC

### Cycle Analysis
1. Loop bottleneck minimum value: $\min(10, 6, 4) = 4.00\text{ USDC}$.
2. Subtract 4.00 USDC from each edge in the cycle:
   - A owes B: $10 - 4 = 6.00\text{ USDC}$
   - B owes C: $6 - 4 = 2.00\text{ USDC}$
   - C owes A: $4 - 4 = 0.00\text{ USDC}$ (fully settled via zero-transfer cycle cancellation)
3. Total Gross Coordinated: $10 + 6 + 4 = 20.00\text{ USDC}$.
4. Total Net Remaining: $6 + 2 = 8.00\text{ USDC}$.
5. Total Savings: $12.00\text{ USDC}$ ($3 \times 4.00\text{ USDC}$).
6. Invariant check: $8.00 + 12.00 = 20.00\text{ USDC}$ (Exact equality holds).

## 3. Netting Safety & Approval Gates (INV-203 — INV-206)

A netting proposal:
1. **Never automatically settles**: Previewing or proposing netting does not execute transactions.
2. **Requires Constitutional Policy Verification**: All participating agents must meet policy constraints.
3. **Requires Risk Evaluation**: Concentration and counterparty risk must pass.
4. **Requires Treasury Liquidity Check**: Net payment transfers must have sufficient Treasury reservations available before batch execution.
