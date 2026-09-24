# Protocol Error Codes & Invariant Mapping

All errors returned by the Protocol Gateway follow a structured format and explicitly map to system invariants:

```json
{
  "error_code": "ERR_INV_163",
  "message": "Recipient address injection prohibited. Recipients must resolve via registered service ID.",
  "invariant": "INV-163",
  "details": {
    "attempted_address": "0x123..."
  }
}
```

## Standard Error Codes

| Error Code | HTTP Status | Invariant | Description |
|---|---|---|---|
| `ERR_INV_161` | 403 Forbidden | INV-161 | External agent cannot possess financial authority |
| `ERR_INV_162` | 400 Bad Request | INV-162 | Invalid manifest or unverified identity |
| `ERR_INV_163` | 400 Bad Request | INV-163 | Recipient address injection prohibited |
| `ERR_INV_164` | 400 Bad Request | INV-164 | Arbitrary calldata or bytecode execution prohibited |
| `ERR_INV_165` | 422 Unprocessable | INV-165 | Quote exceeds existing financial policy limits |
| `ERR_INV_168` | 403 Forbidden | INV-168 | External agents cannot inspect private ledgers |
| `ERR_INV_170` | 401 Unauthorized | INV-170 | Replay attack detected. Nonce already consumed |
| `ERR_INV_171` | 409 Conflict | INV-171 | Invalid contract lifecycle state machine transition |
| `ERR_INV_172` | 403 Forbidden | INV-172 | Cross-tenant data isolation violation |
| `ERR_INV_173` | 422 Unprocessable | INV-173 | Deliverable quality gate verification failed |
| `ERR_INV_177` | 429 Too Many Requests | INV-177 | Rate limit exceeded |
| `ERR_INV_178` | 409 Conflict | INV-178 | Disputed contract funds are quarantined |
| `ERR_INV_180` | 400 Bad Request | INV-180 | Unsupported protocol version |
