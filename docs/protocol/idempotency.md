# Idempotency & Deduplication (INV-169)

To support unreliable networks and distributed retries, the protocol enforces strict idempotency at multiple layers:

1. **Gateway Layer**:
   - `message_id` deduplication: If a message with the same `message_id` and `sender_id` is received within the retention window, the cached response is returned without re-executing domain handlers.
2. **Payment Boundary Layer**:
   - `PaymentBoundary` caches decisions keyed by `{tenant_id}:{contract_id}:{milestone_id}`.
   - Repeated calls to `/protocol/v1/payments` return the existing `PaymentDecision` and `PaymentIntent` ID without double-charging escrows or triggering redundant blockchain transactions.
