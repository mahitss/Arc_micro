# Signature Schemes & Verification

The AgentPay Protocol supports two signature schemes:

1. **`ed25519` (Recommended for production)**
   - High-performance elliptic curve signature scheme (EdDSA).
   - Public keys are represented as hex-encoded strings with an optional `ed25519:` prefix.
   - Verified via standard Ed25519 signature verification against the message's canonical string.

2. **`hmac-sha256` (Recommended for lightweight local integration)**
   - Symmetric keyed-hash authentication.
   - Secret key shared between tenant and external agent gateway.

## Code Example: Generating Signatures (TypeScript)

```typescript
import { createHmac } from 'node:crypto';

export function signEnvelope(payloadString: string, secretKey: string): string {
  return createHmac('sha256', secretKey)
    .update(payloadString)
    .digest('hex');
}
```
