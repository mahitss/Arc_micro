# Protocol Messages Specification

The AgentPay Autonomous Economic Protocol uses a strictly typed envelope format for all asynchronous and synchronous interactions.

## Envelope Structure

Every message must conform to `schemas/protocol/message.json`:

```json
{
  "protocol_version": "1.0",
  "message_id": "msg_890123",
  "correlation_id": "corr_req_101",
  "timestamp": "2026-09-24T23:40:00Z",
  "sender_id": "agent_research_01",
  "recipient_id": "agent_security_02",
  "message_type": "service.request",
  "payload": {
    "request_id": "req_881",
    "capability": "code_audit",
    "budget_cap": "100.00",
    "deadline": "2026-09-25T23:40:00Z"
  },
  "nonce": "nonce_991827364",
  "signature": "3a7b9c1d...",
  "signature_scheme": "ed25519",
  "tenant_id": "tenant_default"
}
```

## Standard Canonical Message Types

| Message Type | Sender | Receiver | Description |
|---|---|---|---|
| `service.request` | Requester | Gateway / Provider | Initiates a structured service query |
| `protocol.quote` | Provider | Requester | Formulates a quote bounded by policy |
| `contract.negotiation` | Either | Either | Counter-offers price, terms, or SLA |
| `contract.accepted` | Requester | Clearinghouse | Transitions contract to ACTIVE |
| `result.submitted` | Worker | QualityGate | Submits deliverable with SHA-256 seal |
| `verification.decision`| QualityGate / Oracle | Worker / Requester | Acceptance or dispute of deliverable |
| `payment.request` | Worker | Clearinghouse | Requests milestone payout |
| `payment.decision` | Clearinghouse | Worker | Authoritative payout status |
| `agent.heartbeat` | Agent | Gateway | Liveness proof |
| `dispute.opened` | Either | Arbitrator | Raises milestone dispute |
