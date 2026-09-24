# Disputes, Fallbacks & Failure Modes

## Overview

Autonomous markets must expect and gracefully handle provider failure, timeout, and malicious outcome submissions.

---

## Marketplace Fallback Hierarchy (Section 38)

When a contracted provider fails to deliver within SLA or fails result verification:

1. **Same Provider Retry**: If the error was transient and deadline permits.
2. **Alternative Listing**: Secondary listing from verified providers.
3. **Alternative Provider**: Deterministic promotion of Candidate Rank #2.
4. **Alternative Capability Implementation**: Querying related or composite capabilities.
5. **Replan Objective**: Economic Fabric adapting execution blueprints.
6. **Human Escalation**: Alerting governance operator in Control Tower.

*All fallback transitions strictly revalidate policy, risk, and budget constraints (INV-196).*

---

## Dispute Handling

1. **Evidence Collection**: Deliverable payload hash, verification report, protocol message trace.
2. **Clearinghouse Escrow Freeze**: Funds remain in reserved status; no payout occurs during dispute.
3. **Arbitration**: Contract arbitrator or governance operator resolves dispute with signed outcome.
4. **Reputation Impact**: Dispute logged in Economic Memory against provider's contextual dispute rate.
