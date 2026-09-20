# Payment Path Forensics: Complete Money Flow Trace

This document provides a line-by-line, function-by-function forensic trace of an end-to-end payment intent execution through AgentPay to native USDC settlement on Arc.

---

## The Flow Sequence

```
1. Agent HTTP Request
   ↓
2. Authentication & Rate Limiting
   ↓
3. Organization Context Extraction
   ↓
4. Agent Status & Budget Check
   ↓
5. Service Registry Lookup & Cap Enforcement
   ↓
6. Payment Intent Generation & Persistence
   ↓
7. Off-chain Policy Evaluation (Rust Engine)
   ↓
8. Deterministic Risk Calculation
   ↓
9. Human Approval (If Threshold Exceeded)
   ↓
10. Treasury Liquidity Reservation
   ↓
11. Execution Gate (10-Point Pre-Flight)
   ↓
12. Blockchain Executor Calldata Signing
   ↓
13. AgentVault Smart Contract Invocation
   ↓
14. Native USDC Transfer on Arc
   ↓
15. Receipt Polling & Ambiguity Handling
   ↓
16. On-chain Event Verification
   ↓
17. Immutable Audit Event Recording
   ↓
18. Cryptographic Webhook Dispatch
   ↓
19. Agent Task Resumption & Output
```

---

## Forensic Trace Details

### Step 1: Agent Request
- **Caller:** Autonomous Agent (via TypeScript SDK / Python SDK / cURL)
- **Endpoint:** `POST /v1/payment-intents`
- **File:** [`services/gateway/internal/http/handlers/payment_intents.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/http/handlers/payment_intents.go)
- **Function:** `HandleCreate(w http.ResponseWriter, r *http.Request)`
- **Payload:**
  ```json
  {
    "agent_id": "research-agent",
    "service": "web-research",
    "amount": "180000",
    "asset": "USDC",
    "purpose": "Market data analysis"
  }
  ```
- **Database Table:** None yet.

---

### Step 2: Authentication
- **File:** [`services/gateway/internal/http/middleware/auth.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/http/middleware/auth.go) & [`services/gateway/internal/auth/apikey.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/auth/apikey.go)
- **Function:** `APIKeyAuthMiddleware` & `ValidateAPIKey(providedSecret, storedHash)`
- **Mechanism:** Hashes incoming `Authorization: Bearer <secret>` with SHA-256 and executes constant-time comparison `subtle.ConstantTimeCompare`.
- **Database Table:** `api_keys` (Query: `SELECT id, organization_id, status FROM api_keys WHERE key_hash = $1`)

---

### Step 3: Organization Tenant Isolation
- **File:** [`services/gateway/internal/http/middleware/request_id.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/http/middleware/request_id.go)
- **Function:** `GetOrgID(ctx)`
- **Mechanism:** Injects verified `organization_id` into `context.Context`. All downstream DB queries enforce `WHERE organization_id = $org_id`.
- **Database Table:** `organizations`

---

### Step 4: Agent Status Check
- **File:** [`services/gateway/internal/intent/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/intent/service.go)
- **Function:** `CreateIntent(...)` (lines 154–162)
- **Mechanism:** Queries repository for agent status via `GetAgentStatus`. If `status != "ACTIVE"`, immediately halts execution with error (`ErrAgentPaused`).
- **Database Table:** `agents`

---

### Step 5: Service Registry Lookup & Neutralization of Prompt Injection
- **File:** [`services/gateway/internal/registry/service_registry.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/registry/service_registry.go)
- **Function:** `ValidatePayment(serviceID, amount, asset)`
- **Mechanism:** Looks up `web-research` in authoritative catalog. Verifies:
  1. Service is `Enabled == true`.
  2. Asset matches (`USDC`).
  3. Amount (`180000`) $\le$ `MaxPrice` (`500000`).
  4. Resolves recipient strictly to `0x1111111111111111111111111111111111111111`. User-supplied recipient field is discarded.
- **Database / In-Memory:** `services` registry map.

---

### Step 6: Payment Intent Generation & Persistence
- **File:** [`services/gateway/internal/intent/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/intent/service.go)
- **Function:** `CreateIntent(ctx, params)`
- **Mechanism:** Generates secure ID `intent_<hex>` with TTL (300s). Status initialized to `CREATED`.
- **Database Table:** `payment_intents` (Columns: `id`, `organization_id`, `agent_id`, `recipient`, `amount`, `asset`, `service_id`, `status`, `created_at`, `expires_at`).

---

### Step 7: Off-Chain Policy Evaluation (Rust Engine)
- **File:** [`services/gateway/internal/policy/client.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/policy/client.go) (caller) & [`services/policy-engine/src/engine/evaluator.rs`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/policy-engine/src/engine/evaluator.rs) (executor)
- **Function:** `HTTPPolicyClient.Authorize(...)` $\rightarrow$ `evaluate_payment(&Policy, &PaymentRequest)`
- **Mechanism:** Rust evaluates in $<1\text{ms}$ using pure `u64` integer arithmetic:
  - `amount <= policy.per_transaction_limit`
  - `daily_spent + amount <= policy.daily_spending_limit`
  - `daily_tx_count + 1 <= policy.max_transactions_per_day`
  - `recipient` is in allowlist and not in blocklist.
- **Decision:** Returns `ALLOW`, `APPROVAL_REQUIRED`, or `DENY`. Status updated in `payment_intents` to `AUTHORIZED`.

---

### Step 8: Deterministic Risk Calculation
- **File:** [`services/policy-engine/src/engine/risk.rs`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/policy-engine/src/engine/risk.rs)
- **Function:** `calculate_risk(&Policy, &PaymentRequest)`
- **Mechanism:** Computes bounded score 0–100 based on percentage of daily budget consumed, velocity spikes, and recipient status. Evaluates to `LOW` for standard API queries.

---

### Step 9: Human-in-the-Loop Approval (If Required)
- **File:** [`services/gateway/internal/service/domain_service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/service/domain_service.go)
- **Function:** `RecordApproval(ctx, orgID, intentID, approverID, approve, reason)`
- **Checks:**
  1. If `approverID == pi.AgentID` $\rightarrow$ REVERT (`ErrAgentSelfApprovalProhibited`).
  2. If `pi.PolicyDecision == "DENY"` $\rightarrow$ REVERT (`ErrCannotApproveDenied`).
  3. If unexpired and valid $\rightarrow$ Updates intent status to `APPROVED`.
- **Database Table:** `approvals` (Columns: `id`, `organization_id`, `payment_intent_id`, `status`, `approver_id`, `decided_at`).

---

### Step 10: Treasury Liquidity Reservation
- **File:** [`services/gateway/internal/treasury/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/treasury/service.go)
- **Function:** `ReserveFunds(ctx, orgID, vaultAddress, intentID, amount)`
- **Mechanism:** Acquires `s.mu.Lock()`. Checks:
  $$\text{available} = \text{onChainBalance} - \sum(\text{activeReservations})$$
  If $\text{amount} \le \text{available}$, records reservation with status `RESERVED`.
- **Database Table:** `treasury_reservations`

---

### Step 11: Execution Gate Pre-Flight Validation
- **File:** [`services/gateway/internal/execution/gate.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/execution/gate.go)
- **Function:** `DefaultGate.CheckEligibility(ctx, intentID)`
- **Safety Matrix Evaluated:**
  1. Intent exists? Yes.
  2. Status not terminal? Yes (`AUTHORIZED` / `APPROVED`).
  3. Policy not DENY? Yes.
  4. Intent unexpired? Yes.
  5. Global kill switch active? No.
  6. Organization paused? No.
  7. Agent paused? No.
  8. Service enabled? Yes.
  9. Approval present if required? Yes.
  10. Treasury reserved? Yes.

---

### Step 12: Blockchain Executor & Transaction Signing
- **File:** [`services/gateway/internal/execution/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/execution/service.go)
- **Function:** `ExecutionService.ExecutePayment(ctx, req)`
- **Mechanism:**
  1. ABI-encodes calldata: `executePayment(recipient, amount, purpose)`.
  2. Fetches account nonce via `PendingNonceAt`.
  3. Estimates gas (`SuggestGasPrice`).
  4. Signs EIP-155 transaction using `c.ExecutorPrivateKey`.
  5. Broadcasts raw transaction to Arc JSON-RPC (`SendTransaction`).
- **Database Table:** `payment_executions` (Status: `SUBMITTED`, records `transaction_hash`).

---

### Step 13: On-Chain Smart Contract Execution
- **Contract:** `AgentVault.sol` on Arc Mainnet (`Chain ID 5042`)
- **Function:** `executePayment(address recipient, uint256 amount, string calldata purpose)`
- **Solidity Execution:**
  ```solidity
  require(msg.sender == owner, "AgentVault: caller is not the owner");
  require(!paused(), "Pausable: paused");
  _checkAndUpdateLimits(amount);
  require(!blockedRecipients[recipient], "AgentVault: recipient blocked");
  usdcToken.safeTransfer(recipient, amount);
  emit PaymentExecuted(recipient, amount, purpose, block.timestamp);
  ```

---

### Step 14: Native USDC Settlement
- **Asset:** Native Arc USDC (`0x3600000000000000000000000000000000000000`)
- **Mechanism:** EVM updates internal balance mapping:
  $$\text{balances}[\text{vault}] \leftarrow \text{balances}[\text{vault}] - 180000$$
  $$\text{balances}[\text{recipient}] \leftarrow \text{balances}[\text{recipient}] + 180000$$

---

### Step 15: Receipt Verification & Ambiguity Handling
- **File:** [`services/gateway/internal/execution/service.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/execution/service.go)
- **Function:** `waitForReceipt(ctx, txHash)`
- **Mechanism:** Polls Arc JSON-RPC `eth_getTransactionReceipt`.
  - If mined with `receipt.Status == 1` $\rightarrow$ State transitions to `CONFIRMED`.
  - If RPC connection times out $\rightarrow$ State transitions to `AMBIGUOUS` (preserves tx hash, blocks re-spend). Reconciles later via `ReconcileTransaction`.

---

### Step 16: On-Chain Event
- **Emitted Event:** `PaymentExecuted(address recipient, uint256 amount, string purpose, uint256 timestamp)`
- **Visibility:** Indexed in transaction logs on Arc Explorer (`https://explorer.arc.io/tx/{txHash}`).

---

### Step 17: Audit Event Logging
- **File:** [`services/gateway/internal/storage/repository.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/storage/repository.go)
- **Function:** `SaveAuditEvent(ctx, event)`
- **Payload:** Captures `actor_type=SYSTEM`, `event_type=payment.confirmed`, `resource_id=intent_...`, `correlation_id=req_...`, `timestamp=UTC`.
- **Database Table:** `audit_events` (Immutable append-only).

---

### Step 18: Cryptographic Webhook Dispatch
- **File:** [`services/gateway/internal/webhook/dispatcher.go`](file:///c:/Users/pc/OneDrive/Desktop/Arc%20micro/services/gateway/internal/webhook/dispatcher.go)
- **Function:** `deliverWebhook(ctx, endpoint, payload)`
- **Mechanism:** Computes HMAC-SHA256 signature using per-endpoint shared secret:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{payload}, \text{secret})$$
  Dispatches HTTP POST with `X-AgentPay-Signature` and `X-AgentPay-Timestamp` headers.
- **Database Table:** `webhook_deliveries`

---

### Step 19: Agent Task Resumption
- **Receiver:** Agent runtime / Developer application.
- **Payload Received:** Intent confirmation with `status: "CONFIRMED"` and `transaction_hash: "0x..."`.
- **Outcome:** Agent unblocks, consumes the paid web research data feed, and completes its autonomous workflow.
