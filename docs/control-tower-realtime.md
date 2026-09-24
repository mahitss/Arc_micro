# AgentPay Control Tower Realtime Architecture

## 1. Zero Competing Event Buses

The Control Tower does NOT implement a secondary event bus or redundant WebSocket broker.
It taps directly into the canonical **AgentPay Domain Event Dispatcher** and **Append-Only Audit Log**.

```
+-----------------------------------------------------------------------------------+
|                        CANONICAL DOMAIN EVENT PIPELINE                            |
|                                                                                   |
|  [Missions]  [Clearinghouse]  [Treasury]  [Policy Engine]  [Arc Settlement]       |
|      |             |              |             |                 |               |
|      +-------------+--------------+-------------+-----------------+               |
|                                   |                                               |
|                                   v                                               |
|                 DomainEventDispatcher (Outbox Pattern)                           |
+-----------------------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
         [Append-Only Audit Log]           [Webhooks & SSE Stream]
                    |                               |
                    +---------------+---------------+
                                    |
                                    v
            +-----------------------------------------------+
            |          CONTROL TOWER ACTIVITY STREAM        |
            |                                               |
            |  - Event Categorization (9 Dimensions)        |
            |  - Deduplication & Out-of-Order Reordering    |
            |  - Stale Event Detection                      |
            +-----------------------------------------------+
```

---

## 2. Event Classification (9 Core Dimensions)

Every realtime event is tagged and classified into one of 9 discrete categories:
1. `MISSION`: Lifecycle transitions (`MissionStarted`, `MissionCompleted`, `MissionFailed`)
2. `AGENT`: Discovery, registration, and health signals (`AgentDiscovered`, `AgentSelected`)
3. `ECONOMY`: Quotes, contracts, and obligations (`QuoteReceived`, `ContractCreated`, `ObligationCreated`)
4. `SECURITY`: Kill switches, quarantines, incidents (`EmergencyHalted`, `AgentPaused`)
5. `POLICY`: Rust evaluation results (`PolicyEvaluated: ALLOW`, `PolicyEvaluated: REQUIRE_APPROVAL`)
6. `TREASURY`: Headroom reservations, inflows, buffer checks (`FundsReserved`, `BufferVerified`)
7. `EXECUTION`: Payment intent transitions (`PaymentSubmitted`, `PaymentConfirmed`)
8. `ARC`: Blockchain consensus verification (`BlockConfirmed`, `SettlementReconciled`)
9. `INTELLIGENCE`: Anomaly detection, adaptive replanning (`ReplanTriggered`, `FallbackSelected`)

---

## 3. Resilience & Event Ordering

- **Idempotency & Deduplication:** Events carry unique `event_id` and monotonic `version` fields.
- **Out-of-Order Handling:** The frontend maintains a sliding sequence buffer; arrival order is never assumed to be causal order.
- **Auto-Reconnect:** SSE/WebSocket streams automatically reconnect with exponential backoff, requesting missed events via `since_timestamp`.
