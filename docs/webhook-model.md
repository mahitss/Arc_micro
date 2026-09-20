# AgentPay Webhook & Event Dispatch Model

## 1. Overview & Architecture

Autonomous agents and enterprise backends require asynchronous notifications when payment intents transition across lifecycle stages (e.g., when a payment enters `APPROVAL_REQUIRED` or reaches `CONFIRMED` on Arc).

AgentPay implements an enterprise webhook dispatch engine based on Stripe-standard HMAC-SHA256 signatures, exponential backoff retries, and delivery idempotency.

```
       EVENT PRODUCED (e.g. payment.confirmed)
                         |
                         v
              AUDIT EVENT PERSISTED (DB)
                         |
                         v
             WEBHOOK DISPATCH QUEUE (Redis / In-Memory Worker)
                         |
           +-------------+-------------+
           |                           |
           v                           v
   ENDPOINT 1 (Agent Runtime)   ENDPOINT 2 (Finance Slack Bot)
   - Signs: HMAC-SHA256        - Signs: HMAC-SHA256
   - Delivers: HTTP POST        - Delivers: HTTP POST
```

---

## 2. Webhook Schema & Configuration

```sql
CREATE TABLE webhook_endpoints (
    id VARCHAR(64) PRIMARY KEY,              -- "we_..."
    organization_id VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,                       -- HTTPS target endpoint
    secret VARCHAR(128) NOT NULL,            -- "whsec_..." signing secret
    description VARCHAR(255),
    subscribed_events JSONB NOT NULL,        -- e.g. ["payment.*", "agent.paused"]
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- "ACTIVE", "DISABLED"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id VARCHAR(64) PRIMARY KEY,              -- "del_..."
    endpoint_id VARCHAR(64) NOT NULL REFERENCES webhook_endpoints(id),
    event_id VARCHAR(64) NOT NULL REFERENCES audit_events(id),
    status VARCHAR(32) NOT NULL,             -- "PENDING", "SUCCESS", "FAILED"
    http_status INT,
    response_body TEXT,
    attempt_count INT NOT NULL DEFAULT 1,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Cryptographic Signature & Verification

Every webhook delivery includes an `X-AgentPay-Signature` header to prevent tampering, spoofing, and replay attacks:

```http
POST /agentpay-webhook HTTP/1.1
Host: api.customer.com
Content-Type: application/json
X-AgentPay-Event-Id: evt_01h8x9p4v...
X-AgentPay-Timestamp: 1726794800
X-AgentPay-Signature: t=1726794800,v1=9a8b7c6d5e4f3a2b1c0d...
```

### Signature Computation
```python
# Verification pseudocode
signed_payload = f"{timestamp}.{request_body}"
expected_signature = hmac_sha256(secret, signed_payload).hexdigest()
# Constant-time comparison to prevent timing attacks
assert hmac.compare_digest(v1_signature, expected_signature)
# Replay defense: verify timestamp is within 5 minutes of current time
assert abs(current_time - timestamp) < 300
```

---

## 4. Delivery Guarantees & Retry Strategy

1. **At-Least-Once Delivery**: Events are guaranteed to be delivered at least once. Customers should use `event_id` to enforce idempotency on their receiver.
2. **Exponential Backoff Schedule**:
   - Attempt 1: Immediate
   - Attempt 2: +15 seconds
   - Attempt 3: +1 minute
   - Attempt 4: +10 minutes
   - Attempt 5: +1 hour
   - Attempt 6 (Final): +6 hours
3. **Automatic Disabling**: If an endpoint fails 100 consecutive deliveries over a 24-hour window, it is automatically marked `DISABLED` and an alert is dispatched to the organization admin.

---

## 5. MVP Priority Recommendation

- **Status**: **P1 (High Priority MVP Component)**.
- **Rationale**: Autonomous agents are asynchronous event-driven systems. Without webhooks, agent runtimes must poll the `/v1/payment-intents/{id}` endpoint in an inefficient loop to discover when an approval was granted or when Arc confirmed the settlement. Webhooks provide the event-driven bridge required for real agent frameworks (LangChain, AutoGen, CrewAI).
