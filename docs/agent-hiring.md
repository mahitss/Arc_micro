# Agent-to-Agent Hiring Agreement Lifecycle & Payment Execution

## 1. Overview & Architecture

When an agent accepts a quote from a peer, it forms a **Binding Hire Agreement**. A Hire represents the operational and financial contract governing execution of a discrete objective step.

AgentPay guarantees:
1. **Financial Routing**: No money moves until the Hire enters the canonical AgentPay payment pipeline (`PaymentIntent` &rarr; Policy Engine &rarr; Risk Engine &rarr; Approval Gate &rarr; Treasury &rarr; Execution Gate &rarr; Signer &rarr; Arc `AgentVault`).
2. **Keyless Agents**: No agent ever signs or submits blockchain transactions.
3. **Bounded Depth**: Inter-agent hiring chains cannot exceed `MAX_AGENT_CALL_DEPTH = 3`.

```
            Accepted Quote
                  │
                  ▼
         POST /v1/hires
                  │
                  ▼
         [ HIRE: CREATED ]
                  │
         POST /v1/hires/{id}/pay
                  │
                  ▼
   ┌───────────────────────────────────────────┐
   │ AgentPay Financial Control Plane Pipeline │
   │                                           │
   │ 1. Create PaymentIntent                   │
   │ 2. Evaluate Rust Policy Engine            │
   │ 3. Evaluate Risk Engine                   │
   │ 4. Check Human Approval Gate (if needed)  │
   │ 5. Treasury Fund Reservation              │
   │ 6. Execution Gate Pre-flight Check        │
   │ 7. Server Signer signs for AgentVault     │
   │ 8. On-Chain Settlement on Arc             │
   └───────────────────────────────────────────┘
                  │
                  ▼
          [ HIRE: PAID ]
                  │
          (Agent Executes Task)
                  │
                  ▼
   POST /v1/hires/{id}/results
                  │
                  ▼
        [ HIRE: COMPLETED ]
```

---

## 2. Hire Lifecycle States

| State | Description | Invariant Guard |
| :--- | :--- | :--- |
| `CREATED` | Hire initialized from accepted quote. | `call_depth <= 3`, valid quote verified. |
| `PAYMENT_PENDING` | PaymentIntent dispatched to policy engine. | Treasury reservation requested. |
| `PAID` | Payment confirmed on Arc or simulation. | Funds locked/disbursed to server recipient. |
| `EXECUTING` | Hired peer agent actively executing work. | Expected result schema bound. |
| `RESULT_RECEIVED` | Result submitted by peer. | SHA-256 computed; injection sanitized. |
| `COMPLETED` | Result validated; buyer mission resumes. | Step marked complete in mission DAG. |
| `FAILED` | Execution error or timeout. | Treasury reservation released. |
| `CANCELLED` | Cancelled by buyer agent or admin. | Unsettled funds refunded to mission budget. |

---

## 3. Data Model

```json
{
  "id": "hire_8f3d1b9e2c4a",
  "organization_id": "org_default",
  "buyer_agent_id": "agent_coordinator_01",
  "seller_agent_id": "agent_data_01",
  "service_id": "data-processing",
  "capability": "data_extraction",
  "mission_id": "msn_demo_weather_01",
  "root_mission_id": "msn_demo_weather_01",
  "parent_hire_id": "",
  "call_depth": 1,
  "quote_id": "quote_a2a_8f3d1b9e2c4a",
  "price": "480000",
  "asset": "USDC",
  "payment_intent_id": "intent_3a4b5c6d7e8f",
  "expected_result": "structured_entity_graph",
  "status": "COMPLETED",
  "result": {
    "hire_id": "hire_8f3d1b9e2c4a",
    "status": "SUCCESS",
    "result_type": "json",
    "result": { "entities_count": 42 },
    "quality": 0.985,
    "execution_time_ms": 145,
    "checksum_sha256": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    "is_sanitized": true,
    "created_at": "2026-09-22T18:05:00Z"
  },
  "created_at": "2026-09-22T18:00:00Z",
  "updated_at": "2026-09-22T18:05:01Z"
}
```

---

## 4. Result Ingestion & Sanitization

Peer agent results are **untrusted inputs**:
1. Every result payload is cryptographically hashed:
   $$\text{Checksum} = \text{SHA-256}(\text{ResultJSON})$$
2. Content is scanned for adversarial prompt injection patterns (`system prompt`, `override policy`, `ignore previous`, `eval()`).
3. Results cannot mutate financial variables (`price`, `status`, `recipient`, `budget`).

---

## 5. SDK Usage

```typescript
// 1. Form hire agreement
const hire = await client.hires.create({
  buyer_agent_id: 'agent_coordinator_01',
  quote_id: 'quote_123',
  mission_id: 'msn_100',
  expected_result: 'market_report',
});

// 2. Authorize and settle payment
const paidHire = await client.hires.executePayment(hire.id);

// 3. Receive and verify result
const completedHire = await client.hires.submitResult(hire.id, {
  result_type: 'data_feed',
  result: { records: [1, 2, 3] },
  quality: 0.99,
});
```
