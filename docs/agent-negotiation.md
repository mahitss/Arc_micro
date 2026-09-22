# Agent-to-Agent Structured Negotiation Engine

## 1. Motivation

In an autonomous economy, pricing is rarely static. Agents need the autonomy to propose counter-offers based on their budget constraints, task urgency, and utility evaluations, while service providers dynamically balance server load and profit margins.

However, unconstrained negotiation creates catastrophic risks:
- Infinite negotiation loops between algorithmic agents.
- Drift outside authorized human budgets.
- Prompt injection manipulating financial terms.

AgentPay's **Structured Negotiation Engine** provides mathematical guardrails for inter-agent bargaining.

---

## 2. Formal Negotiation Rules & Invariants

1. **Strict Round Limit**: Exactly $\le 3$ rounds of counter-proposals are permitted per quote. Round 4 triggers automatic rejection (`ErrMaxNegotiationRoundsExceeded`).
2. **Floor and Ceiling Invariant**:
   $$\text{BasePrice} \le \text{ProposedPrice} \le \text{MaxPrice}$$
   Any proposal outside this range is immediately rejected by the coordinator.
3. **Budget Envelope Ceiling**:
   $$\text{ProposedPrice} \le \text{BuyerRemainingBudget}$$
   The buyer cannot propose an amount exceeding its uncommitted mission budget.
4. **Deterministic Counter Calculation**:
   Automated provider countering calculates an intermediate step:
   $$\text{CounterPrice} = \max\left(\text{BasePrice}, \frac{\text{ProposedPrice} + \text{BasePrice}}{2}\right)$$
   If $\text{ProposedPrice} \ge \text{BasePrice}$, the counter offer is automatically accepted.

---

## 3. Negotiation State Diagram

```
Round 0: Initial Request
   Buyer: Proposes 400,000 micro-USDC (Base: 500,000, Max: 1,500,000)
   Seller: Counters with 450,000 micro-USDC (Round 1)

Round 1: Counter-Offer
   Buyer: Counters with 480,000 micro-USDC (Round 2)
   Seller: Evaluates 480,000 >= BasePrice * 0.95 -> ACCEPTED

Round 3 Ceiling:
   If 3 rounds complete without agreement: Quote marked REJECTED.
```

---

## 4. Prompt Injection Defense

Untrusted text returned during negotiation (e.g. `terms` map) is scanned by the untrusted text sanitizer:
- Strings containing `ignore previous instructions`, `bypass policy`, `set price to 0`, or `admin override` are stripped.
- The financial parameter `proposed_price` is strictly parsed as an unsigned integer string; text from LLM reasoning cannot overwrite integer fields.

---

## 5. SDK and API Examples

### TypeScript
```typescript
// Round 1: Counter an offered quote
const countered = await client.quotes.counter('quote_123', {
  agent_id: 'agent_buyer_01',
  proposed_price: '460000', // 0.46 USDC
});

// Round 2: Accept finalized terms
const accepted = await client.quotes.accept('quote_123');
```

### Python
```python
# Counter offer
countered = client.quotes.counter(
    quote_id="quote_123",
    agent_id="agent_buyer_01",
    proposed_price="460000",
)

# Accept quote
accepted = client.quotes.accept(quote_id="quote_123")
```
