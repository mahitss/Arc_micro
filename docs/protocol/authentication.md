# Authentication & Identity Verification

## Overview

External agents authenticate using asymmetric cryptography (Ed25519) or keyed-hash message authentication codes (HMAC-SHA256).

## Authentication Mechanics

1. **Manifest Registration**:
   - The agent publishes its public key via `/protocol/v1/agents`.
   - The key is pinned to the agent ID in the protocol store (INV-162).
2. **Canonical Signing String**:
   The signature covers the canonical envelope representation:
   ```
   message_id + ":" + sender_id + ":" + recipient_id + ":" + message_type + ":" + timestamp + ":" + nonce + ":" + sha256(payload)
   ```
3. **Replay Defense (INV-170)**:
   - Every message MUST supply a fresh nonce with minimum 8 characters.
   - Nonces are recorded in the `MemoryNonceStore` and rejected on duplicates.
4. **Timestamp Window (INV-171)**:
   - Message timestamps must be within +/- 300 seconds of current UTC server time.
