# AgentPay API Authentication & Key Management

AgentPay provides a cryptographic, tenant-isolated API key architecture designed specifically for autonomous AI agents and developer platforms.

---

## Key Format & Security Principles

```
Secret Format:  ap_live_<64-char hex string (32 bytes crypto random)>
Key ID Format:  key_<16-char hex string>
Masked Format:  ap_live_...4a2f
```

### Security Invariants

1. **Zero Plaintext Secrets in Storage**: Only the cryptographically secure SHA-256 hash (`sha256(secret)`) is persisted in the database.
2. **One-Time Exposure**: The full plaintext secret is returned **ONLY ONCE** upon creation. It cannot be retrieved or reconstructed later.
3. **No Secrets in Logs**: All HTTP loggers, middleware, and audit logs filter and redact API keys. Only key IDs (`key_...`) and masked representations (`ap_live_...xxxx`) appear in traces.
4. **Constant-Time Verification**: Secret verification uses constant-time comparison (`subtle.ConstantTimeCompare`) to eliminate timing-attack vulnerabilities.
5. **No Private Keys**: API keys authenticate callers to the AgentPay Gateway; they **NEVER** expose blockchain private keys or transaction-signing capabilities.

---

## Authentication Headers

Requests to the AgentPay Gateway must include the API key in either of the following HTTP headers:

```http
Authorization: Bearer ap_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Or:

```http
X-API-Key: ap_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

---

## Scopes & Permissions

AgentPay enforces the **Principle of Least Privilege**. An autonomous agent should only receive the minimal scopes required to perform economic tasks.

| Scope | Description | Typical Grantee |
| :--- | :--- | :--- |
| `payments:read` | Inspect payment intents and transaction history | AI Agents, Dashboards |
| `payments:create` | Create new payment intents for registered services | AI Agents |
| `payments:approve` | Approve or reject high-value payments requiring human review | Human Operators / Admins |
| `agents:read` | Inspect agent profiles, spending policies, and daily limits | AI Agents, Dashboards |
| `services:read` | List approved external services and pricing bounds | AI Agents, Integrations |
| `treasury:read` | View vault balances and reserved liquidity | Financial Admins |

### Safety Invariant: Restricted Privileges

A key granted `payments:create` can **NEVER**:
- Change or mutate spending policies
- Withdraw treasury funds
- Add or override approved service recipients
- Execute arbitrary blockchain bytecode or calldata
- Self-approve payments requiring human review

---

## Organization Isolation

Every API key is strictly scoped to an `organization_id`.

```
API Key (Org A)  ──►  Only accesses Org A Agents, Intents, Approvals, & Treasury
API Key (Org B)  ──►  Only accesses Org B Agents, Intents, Approvals, & Treasury
```

Cross-tenant access attempts return **`404 Not Found`** with a generic message, preventing tenant enumeration and data leakage across organizations.

---

## Key Revocation

When an API key is revoked via `DELETE /v1/api-keys/{id}`:
- The key status is immediately marked `REVOKED`.
- All subsequent requests using that secret are rejected with `401 Unauthorized` (`UNAUTHORIZED`).
- An append-only audit event (`api_key.revoked`) is recorded.
