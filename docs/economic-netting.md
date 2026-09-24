# AgentPay Bilateral & Multilateral Netting Engine

## 1. Overview & Mathematical Model

When multiple AI agents interact frequently—such as an analysis agent purchasing search queries from a research agent, while the research agent purchases GPU embeddings from the analysis agent—settling every individual transaction on-chain is inefficient and expensive.

The **Netting Engine** aggregates obligations across participant graphs and computes optimal net settlement vectors:

$$\text{Net Obligation}(A, B) = \sum \text{Obligations}(A \rightarrow B) - \sum \text{Obligations}(B \rightarrow A)$$

```
        GROSS TRANSACTIONS (2 ON-CHAIN TXs)
       Alice ────────── $100 USDC ─────────► Bob
       Bob   ─────────── $60 USDC ─────────► Alice
                      │
                      ▼ Netting Engine Compression
        NET SETTLEMENT (1 ON-CHAIN TX)
       Alice ─────────── $40 USDC ─────────► Bob

    Liquidity Saved: $120 USDC (75.0% Compression)
    Gas Saved: 50% Reduction in Arc Transactions
```

---

## 2. Invariants & Deterministic Guarantees

### INV-60: Gross Liquidity Conservation
Gross liabilities are never wiped, erased, or reduced in the ledger until the corresponding net settlement transaction is verified on-chain. If the net settlement fails, all individual gross obligations remain active.

### INV-69: Netting Atomicity
A netting batch is atomic. Either the net settlement settles completely on Arc, simultaneously marking all constituent obligations as `SETTLED`, or the batch fails and none of the constituent obligations are marked as settled.

### INV-62: Strict Mode Separation
Netting cycles cannot mix `REAL` and `SIMULATION` obligations. Attempting to group obligations with mismatched execution modes returns `ErrCrossModeNetting`.

---

## 3. Algorithm & Cycle Resolution

1. **Cycle Window Initialization:**
   The clearinghouse gathers all `ACTIVE` or `ACKNOWLEDGED` obligations marked for netting within a given organization and time window $T$.
2. **Directed Graph Construction:**
   Builds an adjacency matrix $M$ where $M[i][j]$ is the sum of base units agent $i$ owes agent $j$.
3. **Bilateral Compression:**
   For every pair $(i, j)$ where $i < j$:
   - $\Delta = M[i][j] - M[j][i]$
   - If $\Delta > 0$, net obligation is $i \rightarrow j$ with amount $\Delta$.
   - If $\Delta < 0$, net obligation is $j \rightarrow i$ with amount $|\Delta|$.
   - If $\Delta = 0$, both obligations fully offset to $0$.
4. **Liquidity Savings Metric:**
   $$\text{Savings \%} = \frac{\text{Gross Volume} - \text{Net Volume}}{\text{Gross Volume}} \times 100$$
5. **Execution Batching:**
   Only the net settlements are dispatched through `intent.Service` to the Arc settlement pipeline.

---

## 4. API & CLI Interface

### Execute Netting Cycle via CLI
```bash
agentpay economy netting-run --org org_main --mode REAL
```

Output:
```
============================================================
              AGENTPAY BILATERAL NETTING SUMMARY            
============================================================
Cycle ID:         net_cycle_78b9c1d0
Total Gross:      $160.00 USDC
Total Net:        $40.00 USDC
Liquidity Saved:  $120.00 USDC (75.00%)
Status:           EXECUTED (Arc Tx: 0x8f4c8038...)
============================================================
```

### TypeScript SDK
```typescript
const result = await client.clearinghouse.executeNettingCycle({
  orgId: 'org_enterprise',
  mode: 'REAL',
  participantAgentIds: ['agent_alice', 'agent_bob', 'agent_charlie'],
});

console.log(`Netting Cycle Completed: Saved ${result.savingsPercentage}% liquidity!`);
```
