# AgentPay Webhook Security & Verification Guide

## 1. Overview

Because webhooks deliver financial notifications across the public Internet to user-supplied endpoints, security is paramount. AgentPay implements rigorous defenses across three critical layers:

1. **Authentication & Cryptographic Integrity**: Prevents spoofing, payload tampering, and replay attacks via HMAC-SHA256 signatures.
2. **Server-Side Request Forgery (SSRF) Defense**: Protects internal infrastructure, cloud metadata endpoints, and private networks from malicious destination URLs.
3. **Secret Hygiene & Isolation**: Webhook secrets are generated securely, stored hashed, displayed only once, and isolated per organization.

---

## 2. Webhook Signature Scheme

Every webhook request sent by AgentPay includes the `AgentPay-Signature` HTTP header.

### Header Format

```http
AgentPay-Signature: t=1726850000,v1=5d41402abc4b2a76b9719d911017c5922374e2d35c24e5be4e5ef9e5f5f4b4f5
```

- `t`: Unix timestamp (in seconds) when the signature was generated.
- `v1`: HMAC-SHA256 hex digest of the signing input.

### Canonical Signing Input

The signing input concatenates the timestamp and raw payload separated by a period:

```
<timestamp>.<raw_request_body>
```

For example, if `t=1726850000` and the raw body is `{"id":"evt_123","type":"test.ping"}`:

```
1726850000.{"id":"evt_123","type":"test.ping"}
```

The signature is computed as:
$$\text{Signature} = \text{HMAC-SHA256}(\text{key} = \text{endpoint\_secret}, \text{data} = \text{signing\_input})$$

---

## 3. Signature Verification & Replay Protection

### Verification Checklist for Consumers

1. **Extract Header**: Parse `t` and `v1` from `AgentPay-Signature`.
2. **Check Replay Window**: Compare `t` to the current Unix timestamp. Reject any request where $|t_{\text{current}} - t| > 300\text{ seconds}$ (5 minutes). This prevents replay attacks where an attacker intercepts an old payload.
3. **Recompute HMAC**: Compute HMAC-SHA256 over `t + "." + raw_body` using the endpoint secret (`whsec_...`).
4. **Constant-Time Comparison**: Use a constant-time comparison algorithm (e.g. `crypto.timingSafeEqual` in Node.js, `hmac.compare_digest` in Python) to prevent timing attacks.

---

## 4. Verification Code Examples

### TypeScript / Node.js

```typescript
import crypto from 'crypto';

export function verifyWebhookSignature(
  rawBody: string | Buffer,
  header: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  if (!header || !secret) return false;

  // 1. Parse header
  let timestamp = 0;
  let signature = '';
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = parseInt(v, 10);
    if (k === 'v1') signature = v;
  }

  if (!timestamp || !signature) return false;

  // 2. Check replay tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false; // Request too old or from the future
  }

  // 3. Compute expected signature
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const payloadToSign = `${timestamp}.${bodyBuffer.toString('utf8')}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadToSign)
    .digest('hex');

  // 4. Constant-time comparison
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

### Python 3

```python
import hmac
import hashlib
import time

def verify_webhook_signature(
    raw_body: bytes,
    header: str,
    secret: str,
    tolerance_seconds: int = 300
) -> bool:
    if not header or not secret:
        return False

    parts = dict(part.split('=', 1) for part in header.split(',') if '=' in part)
    timestamp_str = parts.get('t')
    signature = parts.get('v1')

    if not timestamp_str or not signature:
        return False

    try:
        timestamp = int(timestamp_str)
    except ValueError:
        return False

    now = int(time.time())
    if abs(now - timestamp) > tolerance_seconds:
        return False  # Replay attack prevention

    to_sign = f"{timestamp}.".encode('utf-8') + raw_body
    expected = hmac.new(
        secret.encode('utf-8'),
        to_sign,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
```

### Go

```go
package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

func VerifySignature(rawBody []byte, header, secret string, tolerance time.Duration) bool {
	var timestamp int64
	var signature string

	for _, part := range strings.Split(header, ",") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		if kv[0] == "t" {
			timestamp, _ = strconv.ParseInt(kv[1], 10, 64)
		} else if kv[0] == "v1" {
			signature = kv[1]
		}
	}

	if timestamp == 0 || signature == "" {
		return false
	}

	now := time.Now().Unix()
	if math.Abs(float64(now-timestamp)) > tolerance.Seconds() {
		return false
	}

	payloadToSign := fmt.Sprintf("%d.%s", timestamp, string(rawBody))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payloadToSign))
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expected))
}
```

---

## 5. Server-Side Request Forgery (SSRF) Defense

Because webhook destination URLs are supplied by users, an attacker might register internal endpoints (e.g. `http://169.254.169.254/latest/meta-data/` or `http://localhost:5432`) to probe internal networks or exfiltrate cloud credentials.

AgentPay implements a defense-in-depth SSRF protection mechanism:

### 1. Registration-Time URL Validation
When an endpoint is registered (`POST /v1/webhooks`):
- **Scheme Enforced**: In production, only `https://` is permitted.
- **Port Restrictions**: Only standard web ports (443 for HTTPS, 80 for HTTP where explicitly enabled) are permitted.
- **Hostname Resolution Check**: Hostnames are resolved to IP addresses and verified against blocked CIDR blocks.

### 2. Blocked Network Ranges
The following IP spaces are strictly rejected:
- **Loopback**: `127.0.0.0/8`, `::1`
- **RFC 1918 Private Networks**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-Local & Cloud Metadata**: `169.254.0.0/16`, `fe80::/10`
- **Carrier-Grade NAT**: `100.64.0.0/10`
- **IPv6 Unique Local Addresses (ULA)**: `fc00::/7`
- **Multicast / Broadcast**: `224.0.0.0/4`, `240.0.0.0/4`, `ff00::/8`

### 3. Connection-Time DNS Rebinding Protection (`SafeDialContext`)
Validation at registration time is insufficient to prevent **DNS Rebinding** (where a malicious domain initially resolves to a public IP, but during delivery resolves to `127.0.0.1` or `169.254.169.254`).

AgentPay's HTTP delivery client uses a custom `SafeDialContext`:
1. DNS resolution occurs inside the socket dialer immediately prior to TCP handshake.
2. Every resolved IP address is verified against the blocked CIDR list before dialing.
3. If any resolved IP is in a blocked range, connection is aborted immediately.
4. HTTP redirects are restricted to prevent redirection from an external URL to an internal IP.

---

## 6. Secret Lifecycle & Storage

1. **Generation**: Generated using cryptographically secure random bytes (`crypto/rand`), prefixed with `whsec_` followed by 32 hex-encoded bytes (64 characters).
2. **One-Time Display**: Returned in the API response **only once** upon endpoint creation.
3. **Database Storage**: Stored as a salted SHA-256 hash. Even with full read access to the PostgreSQL database, an attacker cannot recover the raw signing secret.
4. **Zero Secret Logging**: The gateway logger explicitly filters out `secret`, `whsec_`, `Authorization`, and `agentpay_sk_` patterns.
