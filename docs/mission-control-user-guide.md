# AgentPay Autonomous Mission Control Center — User Guide

Welcome to the **AgentPay Autonomous Mission Control Center**, the primary operations platform for autonomous AI agent economies. 

AgentPay transforms traditional programmatic crypto payments into an **Autonomous Economic Operating System**:
> **"Agents can discover, hire, and pay services while AgentPay deterministically controls every movement of money."**

---

## 1. Global Shell & Navigation

The Mission Control Center interface provides dense, mission-critical information architecture designed for financial infrastructure operators and AI engineers:

### Navigation Matrix
- **Overview (`/overview`):** Executive KPI dashboard, active mission counter, volume, policy blocks, and quick launcher.
- **Missions (`/missions`):** Complete roster of autonomous missions with real-time status badges, budget consumption meters, and step traces.
- **New Mission (`/missions/new`):** Mission inception form allowing operators to define high-level agent objectives, budget ceilings, allowed categories, and execution mode.
- **Marketplace (`/marketplace`):** Curated directory of external services and peer agents with live pricing, SLA reputation scores, and binding quote requests.
- **Agents (`/agents`):** Fleet overview of authorized keyless autonomous agents, daily spending limits, current balances, and security events.
- **Economy (`/economy`):** Multi-tenant economic intelligence layer, aggregate spend volume, average payment sizes, and service success rates.
- **Approvals (`/approvals`):** Human-in-the-loop approval center for transactions requiring sign-off (strictly subordinated to hard policy denials).
- **Activity (`/activity`):** Unified financial audit stream across payments, policies, approvals, and Arc confirmations with correlation IDs.
- **Security (`/security`):** Operational status of core safety engines (Rust Policy, Risk, Approvals, Treasury, Signer, Vault, Arc) and formal invariant verification.

### Authoritative Network Status Indicator
Located in the upper right header, the network pill provides an immutable verification guarantee:
- **`SIMULATION` (Purple Pill):** Explicitly indicates that zero transactions are being broadcast to any blockchain. All policy checks and state machines execute in memory.
- **`ARC MAINNET - NOT CONNECTED / NOT VERIFIED` (Amber Pill):** Rendered whenever live Arc Mainnet RPC or contract verification is offline. The frontend **never fabricates mainnet connectivity**.
- **`ARC MAINNET - VERIFIED` (Emerald Pill):** Rendered only when active JSON-RPC telemetry verifies connection to Chain ID `5042` with verified AgentVault bytecode.

---

## 2. Launching an Autonomous Mission (`/missions/new`)

To entrust an agent with an autonomous economic goal:

1. **Objective Statement:** Describe the high-level task in natural language.
   *Example:* `"Find the best verified AI transcription service and process this audio."`
2. **Budget Allocation:** Specify the maximum USDC ceiling for this mission (e.g., `$5.00`).
3. **Execution Deadline:** Set a hard timeout after which unspent budget is released (e.g., `10 minutes`).
4. **Agent Selection:** Select the authorized autonomous agent (e.g., `Research & Intelligence Agent`).
5. **Allowed Service Categories:** Constrain which marketplace categories the agent may procure (e.g., `Research`, `Data`, `Compute`).
6. **Execution Mode:**
   - **`SIMULATION`:** Dry-run the entire planning, discovery, quote comparison, and policy check sequence without moving funds or broadcasting transactions.
   - **`LIVE EXECUTION`:** Enables production settlement on Arc. Live mode strictly verifies AgentVault liquidity and policy rules.

Click **`[SIMULATE MISSION]`** for zero-risk pre-flight inspection, or **`[START MISSION]`** to engage the autonomous engine.

---

## 3. Mission Command Center (`/missions/[id]`)

The hero screen of AgentPay provides a live operational telemetry window into the autonomous agent's economic lifecycle:

```
[OBJECTIVE] → [PLAN] → [DISCOVER] → [COMPARE] → [SELECT] → [POLICY] → [RISK] → [PAYMENT] → [ARC] → [RESULT] → [COMPLETE]
```

### Key Sections:

1. **Mission Economics:**
   - **Budget Limit:** Maximum authorized capital.
   - **Spent / Committed:** Funds disbursed or locked in pending settlement.
   - **Remaining Budget:** Unspent capital automatically returned to the agent's vault upon completion.
   - **Risk Level:** Real-time multi-factor risk assessment (`LOW`, `MEDIUM`, `HIGH`).

2. **Autonomous Activity Feed:**
   - Live chronological event stream recording every sub-step with high-precision timestamps (e.g., `Objective accepted`, `Discovered 7 services`, `3 passed trust requirements`, `Policy -> ALLOW`, `Payment authorized`).

3. **Service Decision Panel:**
   - Visual matrix of candidate services evaluated by the agent.
   - Compares capabilities, prices, latencies, and trust scores.
   - **Transparent Rejection Reasons:** Explicitly displays why non-selected services were rejected (e.g., `Over budget`, `High risk`, `Expired quote`, `Policy denied`).

4. **Canonical Payment Panel:**
   - Displays exact financial terms: Amount, Asset (USDC), Service, Policy Result, Risk Score, and Settlement Status.
   - **Settlement Distinction:** Unmistakably labeled `SIMULATION` or `REAL ARC SETTLEMENT`.
   - **Arc Transaction Hash:** Displays verified on-chain transaction hash linked to Arc Explorer only when confirmed by the backend.

5. **Sanitized Result Panel & Untrusted Content Protection:**
   - Displays data returned by the procured service.
   - Strictly tagged as **`TRUSTED SYSTEM DATA`** or **`UNTRUSTED SERVICE OUTPUT`**.
   - If prompt injection or malicious text is detected, an explicit **`SECURITY EVENT`** warning is rendered, and no code is ever executed in the browser.

---

## 4. Service Marketplace (`/marketplace` & `/marketplace/[id]`)

The Marketplace acts as an open economic directory for AI agents:
- **Provider Profiles:** Inspect provider identity, category, registered capabilities, pricing models, and SLA reputation.
- **Server-Side Recipient Binding:** Provider settlement addresses are immutably resolved on the server from the registry. Agents procure services by Service ID, never by providing raw cryptocurrency addresses.
- **Requesting Live Quotes:** Operators and agents can solicit real-time binding quotes directly from providers with strict 15-minute time-to-live expirations.

---

## 5. Security & Invariant Enforcement (`/security`)

AgentPay guarantees that autonomous reasoning never compromises financial safety:

### Core Security Invariants

| Category | Forbidden Action | System Guarantee |
| :--- | :--- | :--- |
| **AI Agent** | Choose arbitrary recipient | Addresses resolved strictly server-side from registry. |
| **AI Agent** | Sign transactions | Agents hold zero keys; signing is isolated in Gateway HSM/Signer. |
| **AI Agent** | Bypass policy | All payments must pass sub-millisecond Rust policy engine. |
| **AI Agent** | Self-approve payments | Transactions over approval threshold require independent human sign-off. |
| **AI Agent** | Modify budget | Budget ceilings are immutable once mission is started. |
| **AI Agent** | Directly access AgentVault | Vault transactions can only be called by the authorized Executor address. |
| **Service Provider** | Modify policy | Policy configurations are restricted to organization admins. |
| **Service Provider** | Increase payment amount | Payments are locked to binding quote terms. |
| **Service Provider** | Change recipient address | Payout destination is hardcoded in registry registration. |
| **Service Provider** | Authorize itself | Authorization requires independent deterministic evaluation. |

---

## 6. Approvals Center (`/approvals`)

The Approvals Center displays all payments flagged as `APPROVAL_REQUIRED`:
- Shows Mission ID, Requesting Agent, Selected Service, Amount, Justification, and Risk Score.
- **Hard Denial Inviolability:** If a payment violates a hard policy limit (e.g., daily budget exceeded or blacklisted category), the Rust engine issues a `DENY`. The frontend **prohibits approval** and marks the action disabled.
- Approving a transaction sends an authenticated command to the backend to resume the execution pipeline.

---

## 7. Global Financial Activity & Replay (`/activity` & `/trace`)

- **Activity Stream (`/activity`):** Real-time, multi-filter audit trail linking every event to an immutable Correlation ID.
- **Mission Replay (`/trace`):** High-impact demonstration feature allowing operators to visually step through past missions from inception to completion.
- **Replay Safety:** Labeled **`REPLAY / READ ONLY`**. Replay mode is strictly visualization and executes zero network requests or financial transactions.
