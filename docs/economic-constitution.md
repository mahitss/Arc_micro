# Autonomous Sovereign Economic Constitution

## Overview

The **Autonomous Sovereign Economic Constitution** provides the ultimate, non-bypassable governance and policy framework for the AgentPay autonomous economy. It governs how autonomous agents, multi-agent swarms, and human operators transact, delegate authority, manage risk, and allocate treasury capital.

While individual agents may formulate plans or execute micro-decisions, the **Economic Constitution** sits above all runtime execution as an immutable, deterministic, mathematically verifiable boundary.

---

## Core Constitutional Principles

1. **Deterministic Evaluation:**  
   Given the exact same transaction context and constitution version, the policy engine will always produce bitwise identical decisions, reason codes, and rule match traces.
2. **Monotonic Authority Inheritance:**  
   Authority flows strictly downwards:
   $$\text{Sovereign Root} \supseteq \text{Organization} \supseteq \text{Swarm/Mission} \supseteq \text{Agent Leaf}$$
   Subordinate levels can only add restrictions; they can never expand or relax permissions granted by parent layers.
3. **Zero Private Key Access:**  
   Autonomous agents operate strictly keyless. They submit intended financial actions to the constitutional execution gate. Private keys remain locked in production HSM enclaves with zero exposure.
4. **Compare-And-Swap (CAS) Atomic Versioning:**  
   A constitution version cannot be mutated once activated. Revisions must be proposed as candidates, undergo simulated what-if testing, obtain cryptographic human approval, and activate via atomic Compare-And-Swap.
5. **Cryptographic Flight Recorder Trail:**  
   Every policy evaluation generates an evaluation hash linking the agent ID, action parameters, rule match list, and the SHA-256 fingerprint of the active constitution.

---

## Rule Taxonomy

The constitution supports 10 distinct rule types evaluated in strict priority order (Priority 100 to 0):

| Rule Type | Scope | Description | Behavior on Violation |
| :--- | :--- | :--- | :--- |
| `HARD_DENY` | Global | Root non-negotiable invariant (e.g. no negative amounts, no raw key requests). | Immediate `DENY`. Cannot be overridden. |
| `ASSET_RULE` | Global / Org | Permitted settlement assets (e.g. Native Arc USDC only). | Immediate `DENY`. |
| `SPENDING_LIMIT` | Org / Agent | Single payment ceiling, daily budget, hourly velocity, mission/swarm cap. | Immediate `DENY`. |
| `RISK_RULE` | Org / Agent | Anomaly score ceiling (e.g. &le; 80), max risk score (e.g. &le; 75), minimum trust score. | Immediate `DENY`. |
| `DELEGATION_RULE`| Swarm / Agent | Maximum delegation depth (e.g. 2 hops), max inherited budget % (e.g. 50%). | Immediate `DENY`. |
| `RECIPIENT_RULE` | Org / Mission | Service whitelist, blocked provider blacklist, allowed capability categories. | Immediate `DENY`. |
| `APPROVAL_RULE` | Org / Agent | Human-in-the-loop multi-sig trigger (e.g. transactions &gt; $1,000.00 USDC). | `APPROVAL_REQUIRED` pause. |

---

## Authority Delta Classification

When comparing two constitution versions ($V_1 \rightarrow V_2$), the system evaluates the **Authority Delta** across 5 dimensions:
1. Spending Ceiling
2. Recipient Whitelist
3. Delegation Bounds
4. Risk Tolerance
5. Approval Thresholds

The resulting difference is classified into one of three governance states:
- `MORE_RESTRICTIVE`: Permissions are tightened, spending ceilings lowered, or new approvals required. Safe for accelerated administrative activation.
- `UNCHANGED`: Equivalent authority footprint (cosmetic or metadata edits).
- `MORE_PERMISSIVE`: Authority granted to agents is expanded. Requires mandatory dual-operator multi-sig review before activation.

---

## REST Endpoints & Client SDKs

### Endpoints
- `GET /v1/constitutions/active`: Retrieve currently active real constitution.
- `GET /v1/constitutions`: List all historical and draft constitution versions.
- `GET /v1/constitutions/{version}`: Inspect specific version.
- `POST /v1/constitutions`: Propose a new constitution revision candidate.
- `POST /v1/constitutions/evaluate`: Deterministic evaluation with zero side effects.
- `POST /v1/constitutions/diff`: Compute side-by-side diff and authority delta.
- `POST /v1/constitutions/test`: Run automated test suites against a candidate version.
- `POST /v1/constitutions/activate`: CAS atomic activation of an approved change request.
- `POST /v1/constitutions/rollback`: Safe reversion to a previous valid version.
- `GET /v1/constitutions/changes`: List pending policy change requests.

### CLI Usage
```bash
# View active constitution
agentpay policy active

# Evaluate hypothetical transaction
agentpay policy evaluate '{"agent_id":"agent_01","amount":"1250000000","currency":"USDC"}'

# Diff two versions
agentpay policy diff 1 2

# Inspect change requests
agentpay policy changes
```
