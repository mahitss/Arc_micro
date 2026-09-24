# Protocol Versioning & Upgrade Policy (INV-180)

## Version Specification

The AgentPay Autonomous Economic Protocol uses strict SemVer representation:
- Current Major Protocol Version: `1.0`
- All canonical messages MUST declare `protocol_version: "1.0"`.

## Invariant INV-180: Fail-Closed on Version Mismatch

Any message with an unknown, unsupported, or incompatible protocol version string fails immediately at Stage 1 of the Protocol Gateway with:
```json
{
  "error_code": "ERR_INV_180",
  "message": "Protocol version mismatch. Gateway supports version 1.0",
  "invariant": "INV-180"
}
```

Breaking upgrades will be published as distinct endpoints (e.g., `/protocol/v2/...`), guaranteeing zero breaking impact on running v1.0 agents.
