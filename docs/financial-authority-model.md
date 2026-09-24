# AgentPay Autonomous Economic Fabric v1.0 — Financial Authority Model
**Document ID:** `docs/financial-authority-model.md`  
**Classification:** Canonical Governance & Authority Specification  
**Authority:** Principal Engineer & CTO, AgentPay  
**Version:** v1.0  
**Verification Date:** 2026-09-25  

---

## 1. The Principle of Bounded Financial Authority

In autonomous multi-agent economies, software agents create demand, offer supply, negotiate terms, and execute collaborative workflows. However:
```
AUTONOMY MAY EXPAND.
FINANCIAL AUTHORITY MUST REMAIN BOUNDED.
```
Under no circumstances may an autonomous agent grant itself financial authority, expand its spending budget, bypass spending caps, or circumvent compliance allowlists.

---

## 2. Canonical Authorization Hierarchy

AgentPay enforces a strict 7-tier hierarchical authority cascade:
```
GLOBAL (Network Safety & Protocol Invariants)
  ↓
ORG (Enterprise Compliance & Corporate Limits)
  ↓
AGENT (Agent Role & Max Budget Allocation)
  ↓
MISSION (Mission Blueprint & Objective Budget)
  ↓
SWARM (Swarm Topology & Task Allocation)
  ↓
TASK (Specific Work Unit Price Cap)
  ↓
PAYMENT (Individual Transaction Execution)
```

### The Monotonic Tightening Invariant
- **Rules may only become stricter at lower scopes.**
- **Rules may NEVER silently become more permissive.**
- If `GLOBAL` sets a per-transaction limit of 100 USDC and `ORG` sets 50 USDC, the effective limit is **50 USDC**. If `AGENT` attempts to set 75 USDC, the evaluation strictly enforces **50 USDC**.
- If any tier issues a `HARD_DENY`, the entire evaluation terminates immediately with `DENIED`.

### Absolute Precedence of HARD_DENY
- `HARD_DENY` is inviolable (`INV-46`).
- Human approvals, multi-sig escalation tickets, or operator emergency overrides can NEVER override a `HARD_DENY`.
- Blocked recipients or sanctions matches can never be paid under any circumstance.

---

## 3. Clearing vs. Treasury: Separation of Powers

To prevent alternate, unregulated payment channels, AgentPay strictly bifurcates **Clearing** from **Treasury**:

| Responsibility | CLEARINGHOUSE (`internal/clearinghouse`) | TREASURY (`internal/treasury`) |
|---|---|---|
| **Primary Question** | *What obligations exist between parties?* | *What liquidity exists to fund operations?* |
| **Authority** | Computes gross debts, multilateral netting cycles, and settlement batches. | Tracks pool balances, enforces reserve buffers, encumbers liquidity. |
| **Financial Execution** | **CANNOT TRANSFER FUNDS DIRECTLY.** Must submit a `PaymentIntent` to the Execution Gate. | **CANNOT BROADCAST TRANSACTIONS DIRECTLY.** Only locks/releases reservations. |
| **Dispute Handling** | Freezes disputed obligations pending resolution. | Withholds reservation encumbrances for disputed items. |

---

## 4. Canonical Financial Authority Interfaces

All policy, risk, and governance evaluations across the codebase conform to canonical unified interfaces:

```go
// EvaluateFinancialAuthority evaluates the full constitutional hierarchy from Global to Task.
func EvaluateFinancialAuthority(
    ctx context.Context,
    hierarchy *ConstitutionHierarchy,
    intent *PaymentIntent,
) (*AuthorityDecision, error)

// EvaluatePolicy evaluates deterministic numerical spending limits and allowlists.
func EvaluatePolicy(
    ctx context.Context,
    policy *SpendingPolicy,
    intent *PaymentIntent,
) (*PolicyDecision, error)

// EvaluateRisk computes composite risk score based on novelty, velocity, and exposure.
func EvaluateRisk(
    ctx context.Context,
    context *RiskContext,
    intent *PaymentIntent,
) (*RiskDecision, error)

// EvaluateApproval verifies whether an approval ticket has valid multi-sig signatures and unexpired TTL.
func EvaluateApproval(
    ctx context.Context,
    ticket *ApprovalTicket,
    intent *PaymentIntent,
) (*ApprovalDecision, error)
```

---

## 5. Machine-Checked Invariant Matrix

| Invariant ID | Formulation | Enforcement Point |
|---|---|---|
| `INV-3` | AI cannot bypass policy checks | Gateway Router & Intent Pipeline |
| `INV-4` | AI cannot self-approve escalated tickets | Approval Service |
| `INV-46` | HARD_DENY cannot be overridden by approval | Policy Engine & Rust Evaluator |
| `INV-71` | Available liquidity must remain non-negative | Treasury Reservation Engine |
| `INV-72` | Safety buffer floor is inviolable | Treasury Allocation Core |
| `INV-85` | Zero wallet abstraction bypass | Signer Boundary & Execution Gate |
