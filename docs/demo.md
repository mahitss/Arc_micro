# AgentPay: 2–3 Minute Demonstration Script

This walkthrough guides an operator or evaluator through a live, end-to-end demonstration of the **AgentPay** autonomous spending protocol on Arc Mainnet.

---

## Prerequisites
- Web Console running: `http://localhost:3000`
- Go Gateway running: `http://localhost:8080`
- Rust Policy Engine running: `http://localhost:8081`
- Network status: Connected to Arc Mainnet (`Chain 5042`) or Demo Simulation Mode.

---

## Part 1: System Inspection (0:00 – 0:45)

1. **Open AgentPay Web Control Center**
   - Navigate to `http://localhost:3000/dashboard`.
   - Highlight the **Network Badge** in the top right: confirms `Arc Mainnet (Chain 5042)`.
   - Point out the **System Health** indicators: Gateway, Policy Engine, and Arc RPC are all online.

2. **Inspect Research Agent**
   - Click **Agents** in the top navigation and select `research-agent`.
   - Show the **Agent Details**:
     - Status: `ACTIVE`
     - Vault Address: Verified `AgentVault` contract on Arc.
     - USDC Balance: Retrieved directly on-chain.
   - Show the **Spending Policy**:
     - Per-Transaction Limit: `50.00 USDC` (`50_000_000` base units).
     - Daily Spending Cap: `100.00 USDC` (`100_000_000` base units).
     - Whitelisted Services: `web-research`, `compute-cluster`, `data-feed`.

---

## Part 2: End-to-End Happy Path Payment (0:45 – 1:45)

3. **Autonomous Task Submission**
   - Submit an agent task requiring external data:
     ```json
     {
       "agent_id": "research-agent",
       "task": "Analyze Arc Layer 1 fee structure and historical throughput."
     }
     ```
   - Show that the AI Agent **does not possess private keys** and **cannot sign transactions**.
   - Instead, the AI agent produces a structured **Payment Intent**:
     - Service: `web-research`
     - Recipient: `0x1111111111111111111111111111111111111111` (resolved server-side by Service Registry).
     - Amount: `0.18 USDC` (`180_000` base units).
     - Asset: `USDC`.

4. **Deterministic Policy Evaluation**
   - The Go Gateway submits the intent to the authoritative **Rust Policy Engine**.
   - Show the decision output:
     - Decision: **`ALLOW`**
     - Reason Code: `APPROVED`
     - Explanation: `Payment satisfies the configured policy.`

5. **Operator Confirmation & On-Chain Execution**
   - Because `AGENT_AUTO_EXECUTION=false`, the intent enters `AUTHORIZED` status and awaits confirmation.
   - Open the intent detail page (`/payment-intents/[intentId]`).
   - Click **Confirm & Execute Payment**.
   - Show the confirmation dialog: verifies recipient, exact USDC amount, and intent ID.
   - Click **Execute Payment**.

6. **Settlement & Explorer Verification**
   - The Go Gateway builds the exact `AgentVault.executePayment(...)` call, signs with the secured executor key, and broadcasts to Arc Mainnet.
   - Transition states: `EXECUTING` → `CONFIRMED`.
   - Show the transaction details:
     - Transaction Hash: `0x...`
     - Block Number: `...`
   - Click **View on Arc Explorer**: demonstrates the transaction confirmed on the Arc network with `PaymentExecuted` event.
   - Return to `research-agent`: show that daily spending has incremented by `0.18 USDC`.

---

## Part 3: Deterministic Security Enforcement: DENY Case (1:45 – 2:30)

7. **Attempt to Exceed Spending Limits**
   - Submit a second task requesting a massive data extraction:
     ```json
     {
       "agent_id": "research-agent",
       "task": "Perform bulk historical dataset extraction exceeding daily budget."
     }
     ```
   - The AI agent attempts to request `150.00 USDC` (`150_000_000` base units).

8. **Immediate Policy Denial**
   - The Go Gateway forwards the request to the Rust Policy Engine.
   - Rust immediately evaluates the rules against remaining daily capacity:
     - Decision: **`DENY`**
     - Reason Code: `DAILY_LIMIT_EXCEEDED`
     - Explanation: `Payment would exceed the agent daily spending limit.`

9. **Verification: Zero On-Chain Impact**
   - View the Intent status: **`DENIED`**.
   - Show that **no transaction was broadcast** to Arc.
   - Show that `AgentVault` balance is completely untouched.
   - Conclude: **The AI is cryptographically constrained by deterministic off-chain rules and enforced by smart contract boundaries.**
