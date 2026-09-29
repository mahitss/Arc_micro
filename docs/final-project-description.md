# AgentPay — Project Description

### TITLE
**AgentPay**

### TAGLINE
$$\text{AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.}$$
*Autonomy may expand. Financial authority must remain bounded.*

---

### PROBLEM
Autonomous AI agents are capable of reasoning, decomposing complex objectives into operational plans, discovering external peer services, and delegating sub-tasks. However, giving autonomous LLMs direct custody over cryptocurrency private keys or transaction signing tools introduces an unmanageable financial risk surface:
- **Prompt Injection & Adversarial Payloads:** A single malicious prompt in an external data source or tool output can instruct an autonomous agent to execute an on-chain transfer to an attacker.
- **Runaway Loops & Cost Explosion:** Hallucinated retry loops or logic faults can drain thousands of dollars in minutes without warning.
- **Byzantine & Failing Service Providers:** In an open agent marketplace, remote workers can crash, timeout, or return substandard outputs. Unconstrained agents will double-spend by blindly retrying payments to unverified workers.
- **Institutional & Regulatory Non-Compliance:** Enterprise capital cannot legally flow through raw, unmonitored agent wallets that lack deterministic policy gates, granular multi-sig escalation, and double-entry accounting.

### SOLUTION
AgentPay solves this by mathematically and architecturally decoupling **cognitive intelligence** from **financial authority**.

#### What Agents Can Do (Advisory Domain):
- **Discover:** Search the service marketplace for specialist peer agents.
- **Negotiate:** Request, counter-offer, and lock bilateral SLA terms.
- **Delegate:** Decompose objectives into directed acyclic graphs (DAGs) and assign tasks.
- **Replan:** Detect provider dropouts and propose alternative candidates.
- **Collaborate:** Form multi-agent swarms with bounded sub-budgets.
- **Evaluate:** Deploy Critic agents to verify deliverable quality and cryptographic hashes.

#### What AgentPay Controls (Financial Authority):
- **Policy:** An independent compiled Rust engine evaluates allowlists, velocity ceilings, and 7-tier constitutional limits in **sub-10 microseconds**.
- **Risk:** Composite scoring evaluates counterparty exposure and novelty before payment creation.
- **Budget:** Strict monotonic budget envelopes guarantee that replanning cannot self-escalate allocations.
- **Approval:** Automatic threshold evaluation routes large or risky intents to human multi-sig escalation.
- **Treasury:** Double-entry journal reservations lock funds atomically, preventing cross-agent race conditions.
- **Execution:** Calldata binding inspects transactions to ensure zero native ETH transfers and exact contract matches.

#### What Arc Settles (Settlement Plane):
- **Native USDC Settlement:** Settles authorized net obligations on the Arc Layer-1 blockchain using native USDC for both value transfer and gas fees.
