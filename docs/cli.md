# AgentPay CLI Reference

The `@agentpay/cli` is the command-line interface for the AgentPay programmable financial control plane. It allows developers and operators to inspect services, create and observe payment intents, retrieve flight recorder traces, and verify webhook signatures.

---

## Installation

```bash
npm install -g @agentpay/cli
```

Or run via npx:
```bash
npx @agentpay/cli <command>
```

---

## Global Options

- `--json`: Format all command output as machine-readable JSON.
- `--help`: Display usage and argument instructions.

---

## Configuration Commands

Manage local CLI configuration (stored securely in `~/.agentpay/config.json`):

```bash
# View configuration (secrets are masked)
agentpay config get

# Configure active API key
agentpay config set api-key ap_live_your_key_here

# Configure gateway URL
agentpay config set base-url http://localhost:8080
```

---

## Service Marketplace Commands

### List Approved Services
```bash
agentpay services list
```

Filter by category or trust:
```bash
agentpay services list --category RESEARCH --trust TRUSTED
```

### Request a Price Quote
```bash
agentpay services quote web-research --amount 180000 --asset USDC
```

---

## Payment Commands

Both `agentpay payments` and `agentpay payment` are supported.

### Create Payment Intent
```bash
agentpay payments create \
  --agent agent_alpha \
  --service web-research \
  --quote quote_01j7b9k2x3 \
  --amount 180000 \
  --asset USDC \
  --purpose "Autonomous web research procurement" \
  --idempotency-key task_001_run_01
```

### Inspect Payment Status
```bash
agentpay payments get intent_0468113df765b413
```

### Retrieve Flight Recorder Trace
```bash
agentpay payments trace intent_0468113df765b413
```

Or retrieve in machine-readable JSON:
```bash
agentpay payments trace intent_0468113df765b413 --json
```

---

## Webhook Commands

Both `agentpay webhooks` and `agentpay webhook` are supported.

### List Webhook Endpoints
```bash
agentpay webhooks list
```

### Verify Webhook HMAC-SHA256 Signature
```bash
agentpay webhooks verify \
  --payload '{"id":"evt_123","type":"payment_intent.confirmed"}' \
  --signature "t=1726999999,v1=a1b2c3d4e5f6..." \
  --secret "whsec_..."
```

---

## Security Invariants

1. **No Secret Output**: Plaintext API secrets and webhook secrets are never echoed in logs or terminal output.
2. **No Private Key Access**: The CLI provides zero signing or raw blockchain transaction broadcast flags.
