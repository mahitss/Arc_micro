# AgentPay Transaction Signer Architecture & Security Boundary

## 1. Architectural Purpose

In autonomous agent financial systems, the **signing boundary is the point of no return**. Once a transaction is signed with a valid private key and broadcast to the Arc network, on-chain execution is irreversible and deterministic.

Prior to Day 3 hardening, the `ExecutionService` within the Go Gateway directly loaded `EXECUTOR_PRIVATE_KEY` into memory, constructed transactions, and directly executed `types.SignTx`. This presented several critical vulnerabilities:
1. **Tight Coupling**: Direct in-memory reliance on raw private keys with no boundary abstraction.
2. **Missing Defense-in-Depth**: No transaction-binding verification between authorization and signing.
3. **Audit Blind Spots**: Signing attempts were not independently audited before RPC broadcast.
4. **Key Migration Friction**: Upgrading to Hardware Security Modules (HSM) or cloud KMS (e.g. AWS KMS, GCP Cloud KMS) would require refactoring the core execution engine.

The Day 3 architecture introduces the `TransactionSigner` abstraction:
```
Policy Evaluation (Rust Engine)
  │
  ▼
Payment Authorization & Human Approval Gate (Gateway)
  │
  ▼
Treasury Reservation (Vault Balance Check)
  │
  ▼
Execution Gate (Pre-flight Validation)
  │
  ▼
Transaction Construction (DynamicFeeTx / EIP-1559)
  │
  ▼
Transaction Binding Verification (Defense-in-Depth)
  │
  ▼
Authoritative Signing Boundary (TransactionSigner)
  ├── LocalSigner [IMPLEMENTED] (Development / Test / Relayer)
  └── KMSSigner   [NOT IMPLEMENTED] (AWS KMS / GCP Cloud KMS / HSM)
  │
  ▼
Audit Event Recording (AuditRecorder)
  │
  ▼
RPC Broadcast (SendTransaction to Arc)
  │
  ▼
Receipt Reconciliation (Confirmed / Reverted / Ambiguous)
```

---

## 2. Core Signer Abstraction

The signing boundary is defined by the `TransactionSigner` interface in `services/gateway/internal/signer/signer.go`:

```go
type TransactionSigner interface {
    // Address returns the public Ethereum address of the signing identity.
    Address() common.Address

    // ChainID returns the authoritative chain ID for which this signer is configured.
    ChainID() *big.Int

    // Backend returns the signer identifier (e.g. "local", "kms").
    Backend() string

    // SignTransaction signs the transaction after verifying its transaction binding.
    SignTransaction(ctx context.Context, tx *types.Transaction, binding *TransactionBinding) (*types.Transaction, error)
}
```

### Key Invariants:
- The execution engine depends **strictly** on `TransactionSigner`.
- Signing occurs in **exactly one location** in the entire codebase.
- The signer backend is completely agnostic to whether signing occurs via local memory or an external hardware enclave.

---

## 3. Implementation Status of Signing Backends

| Backend | Configuration Value | Status | Description |
| :--- | :--- | :--- | :--- |
| **Local Signer** | `SIGNER_BACKEND=local` | **`IMPLEMENTED`** | In-memory ECDSA private key signing for dev, staging, and local integration tests. |
| **AWS / GCP KMS** | `SIGNER_BACKEND=kms` | **`NOT IMPLEMENTED`** | Architecture adapter boundary established. Explicitly fails closed without fabricating responses. |
| **HashiCorp Vault Transit**| `SIGNER_BACKEND=vault` | **`NOT IMPLEMENTED`** | Planned enterprise HSM option. |

---

## 4. LocalSigner (`local.go`) [IMPLEMENTED]

`LocalSigner` provides cryptographic signing using an in-memory `ecdsa.PrivateKey`.

### Security Hardening:
- **Private Key Isolation**: Key material is parsed into an unexported field `privateKey *ecdsa.PrivateKey`.
- **Zero Key Leakage**:
  - `LocalSigner.String()` implements `fmt.Stringer`, returning masked identity:
    `LocalSigner{address: 0x..., chain_id: 5042, backend: local}`.
  - Error messages and panic strings never contain key material or hex strings.
  - Private keys are never logged, serialized into audit events, or returned via HTTP APIs.
- **Address Derivation Verification**:
  Immediately upon initialization and following each signature, `types.Sender` verifies that the recovered address matches the configured `address`.

---

## 5. Cloud KMS / HSM Architecture (`kms.go`) [NOT IMPLEMENTED]

`KMSSigner` provides the architectural specification and contract for hardware-backed signing. In accordance with Day 3 engineering standards, **KMS responses are NOT fabricated**, and the backend **strictly fails closed**:

```go
func NewKMSSigner(keyID, region string, chainID *big.Int, recorder AuditRecorder) (*KMSSigner, error) {
    return nil, fmt.Errorf("%w (key_id: %q, region: %q)", ErrKMSSignerUnavailable, keyID, region)
}
```

### AWS KMS Compatibility & Production Prerequisites:
1. **Key Spec**: Must be provisioned as `ECC_SECG_P256K1` with `KeyUsage = SIGN_VERIFY`.
2. **Pre-hashing**: AWS KMS does not support Ethereum's Keccak-256 hash algorithm natively. The Gateway must compute `keccak256(rlp_encode(tx))` off-KMS and call AWS KMS `Sign` API with `MessageType = DIGEST` and `SigningAlgorithm = ECDSA_SHA_256` (over the raw 32-byte digest).
3. **ASN.1 DER to RSV Conversion**:
   AWS KMS outputs an ASN.1 DER-encoded signature `(r, s)`. Ethereum EIP-1559 requires a 65-byte sequence `[R(32) || S(32) || V(1)]`.
   - **Low-S Normalization**: If $S > N/2$ (secp256k1 curve order), $S$ must be flipped to $N - S$ to prevent transaction malleability.
4. **Recovery ID ($V$) Derivation**:
   AWS KMS does not return the recovery ID ($v \in \{0, 1\}$). The signer adapter must recover the public key for both $v = 0$ and $v = 1$ candidates and compare them against the KMS public key to select the correct recovery byte.

### Fail-Closed Guarantee (No Silent Fallback):
If `SIGNER_BACKEND=kms` is set:
```
Gateway Startup / Execution
  └── Evaluates SIGNER_BACKEND == "kms"
        └── Returns ErrKMSSignerUnavailable
              └── Execution halted immediately. NO FALLBACK to local keys.
```
Automatic fallback from `kms` to `local` would constitute an enterprise security flaw and is explicitly prohibited.

---

## 6. Transaction Binding (`TransactionBinding`) [IMPLEMENTED]

To prevent compromised middleware or rogue execution components from modifying payments post-authorization, the signer enforces **Transaction Binding**:

```go
type TransactionBinding struct {
    RequestID        string
    ChainID          *big.Int
    TargetVault      common.Address
    ExpectedCalldata []byte
    ExpectedAmount   string
}
```

Before signing, the signer validates:
1. **Chain ID**: `tx.ChainId() == binding.ChainID`
2. **Destination Vault**: `*tx.To() == binding.TargetVault`
3. **Zero Native Value**: `tx.Value() == 0` (All payments use ERC-20 USDC; non-zero native gas transfers are rejected)
4. **Calldata Integrity**: `bytes.Equal(tx.Data(), binding.ExpectedCalldata)` (Guarantees recipient, token amount, and purpose cannot be tampered with)

If any property does not match, signing is aborted with `ErrTransactionBindingMismatch` and an audit event is logged.

---

## 7. Chain-ID Protection [IMPLEMENTED]

- Arc Mainnet requires `Chain ID = 5042`.
- Both `LocalSigner` and `ExecutionService` validate the chain ID at three checkpoints:
  1. Config validation (`ValidateLiveExecutionRequirements` ensures `ARC_CHAIN_ID == "5042"`).
  2. RPC verification (`blockchainClient.ChainID(ctx)` matches `txSigner.ChainID()`).
  3. Pre-sign verification (`tx.ChainId()` matches `s.chainID`).
- Signing for an unexpected chain is structurally impossible.

---

## 8. Audit Trail & Key Zeroization

### Safe Audit Trail (`SigningAuditEvent`):
Every signing attempt emits a structured audit event containing:
- `id`: Unique audit record identifier.
- `request_id`: Payment execution correlation ID.
- `signer_backend`: Backend identifier (`"local"` or `"kms"`).
- `signer_address`: Public Ethereum address.
- `chain_id`: EIP-1559 Chain ID.
- `destination_vault`: Destination contract address.
- `calldata_sha256_hash`: Deterministic SHA-256 digest of calldata (never raw sensitive payloads).
- `amount`: Token base units.
- `success`: Boolean status.
- `timestamp`: Event creation timestamp.

Audit events are persisted to PostgreSQL (or memory during integration testing) via `AuditRecorder`.

### Memory & Key Zeroization Realities in Go:
- Go is a garbage-collected language with a copying runtime. Pointers to memory allocated by `crypto/ecdsa` or `crypto.HexToECDSA` may be copied or moved during runtime GC sweeps.
- We do **NOT** make false security claims that zeroing a byte slice guarantees complete hardware-level memory eradication.
- Instead, defense-in-depth is maintained by:
  - Confining key references strictly to unexported struct fields in `LocalSigner`.
  - Prohibiting all serialization, reflection, or logging of the key.
  - Mandating HSM/KMS for production environments where raw private keys never reside in application memory.
