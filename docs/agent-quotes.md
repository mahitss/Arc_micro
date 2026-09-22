# Agent-to-Agent Quotes: Time-Bound Cryptographic Pricing Commitments

## 1. Concept & Problem Definition

In traditional multi-agent systems, agents call external tools with floating pricing expectations. This leads to cost overruns, slippage, and front-running.

In AgentPay, all inter-agent services require **binding, time-bound cryptographic quotes** before any hiring agreement or payment intent can be initiated.

- Quotes freeze the price in integer base units (e.g. `480000` micro-USDC = 0.48 USDC).
- Quotes carry an expiration timestamp (typically 5–15 minutes).
- Once accepted, quotes become immutable inputs to the payment authorization pipeline.

---

## 2. Quote Lifecycle Finite State Machine

```
   [ REQUESTED ]
         │
         ▼
    [ OFFERED ] ──(Counter-Offer, max 3 rounds)──► [ COUNTERED ]
         │                                              │
         ├──(Accept)────────────────────────────────────┤
         │                                              │
         ▼                                              ▼
    [ ACCEPTED ]                                   [ REJECTED ]
         │
         ▼
     [ HIRED ]
         │
         ▼
   (Payment Pipeline)
```

### Valid State Transitions
1. `REQUESTED` &rarr; `OFFERED`: Seller generates initial pricing commitment.
2. `OFFERED` &rarr; `COUNTERED`: Buyer proposes counter terms within [BasePrice, MaxPrice].
3. `COUNTERED` &rarr; `OFFERED` or `ACCEPTED` or `REJECTED`.
4. `OFFERED` / `COUNTERED` &rarr; `ACCEPTED`: Price is permanently bound.
5. Any state &rarr; `EXPIRED` if current time exceeds `valid_until`.

---

## 3. Data Model

```json
{
  "quote_id": "quote_a2a_8f3d1b9e2c4a",
  "buyer_agent_id": "agent_coordinator_01",
  "seller_agent_id": "agent_data_01",
  "service_id": "data-processing",
  "mission_id": "mission_root_100",
  "price": "480000",
  "asset": "USDC",
  "estimated_latency_ms": 180,
  "quality": 9850,
  "valid_until": "2026-09-22T18:15:00Z",
  "status": "ACCEPTED",
  "negotiation_rounds": [
    {
      "round": 1,
      "proposer_agent_id": "agent_coordinator_01",
      "proposed_price": "450000",
      "status": "COUNTERED",
      "created_at": "2026-09-22T18:00:00Z"
    },
    {
      "round": 2,
      "proposer_agent_id": "agent_data_01",
      "proposed_price": "480000",
      "status": "ACCEPTED",
      "created_at": "2026-09-22T18:00:05Z"
    }
  ],
  "created_at": "2026-09-22T18:00:00Z"
}
```

---

## 4. API Endpoints

### 4.1 Request a Quote
`POST /v1/agent-services/{id}/quotes`
```json
{
  "buyer_agent_id": "agent_coordinator_01",
  "mission_id": "mission_100",
  "proposed_price": "450000"
}
```

### 4.2 Counter-Offer Quote
`POST /v1/quotes/{id}/counter`
```json
{
  "agent_id": "agent_coordinator_01",
  "proposed_price": "460000"
}
```

### 4.3 Accept Quote
`POST /v1/quotes/{id}/accept`

Returns the accepted quote with status `ACCEPTED`.

---

## 5. Security & Invariant Rules
- **Non-Malleable Price**: Once accepted, neither agent can modify `price` or `asset`.
- **Server-Derived Recipient**: The recipient wallet address is retrieved authoritatively from the service registry, preventing seller spoofing.
- **Expiry Bound**: Expired quotes (`valid_until < now`) cannot be accepted or funded.
