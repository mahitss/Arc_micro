# Arc Deployment Independent Verification Guide

> **Target Audience**: Technical Reviewers, Auditors, Evaluators  
> **Network**: Arc Mainnet (Chain ID `5042`)  
> **RPC Endpoint**: `https://rpc.mainnet.arc.io`  
> **Explorer**: `https://explorer.arc.io`

This guide provides exact terminal commands for reviewers to independently verify the Arc blockchain configuration, smart contracts, parameters, and settlement integrity without relying on AgentPay's internal state.

---

## 1. Verify Network Configuration

Verify that the Arc Mainnet RPC is live, responsive, and returns the expected EVM Chain ID (`5042` / `0x13b2`):

```bash
# Query eth_chainId via cURL
curl -s -X POST https://rpc.mainnet.arc.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Expected Result**:
```json
{"jsonrpc":"2.0","id":1,"result":"0x13b2"}
```
*(Hex `0x13b2` = Decimal `5042`)*

---

## 2. Verify Canonical USDC ERC-20 Contract

Verify that the canonical Arc USDC token contract exists at `0x3600000000000000000000000000000000000000` and inspect its deployed bytecode:

```bash
# Check contract bytecode using Foundry cast
cast code 0x3600000000000000000000000000000000000000 --rpc-url https://rpc.mainnet.arc.io
```

**Expected Result**:
Returns 3,598 bytes of deployed EVM bytecode starting with `0x3660...`.

---

## 3. Verify AgentVault Contract Deployment

> **Status**: **COMPILED & TESTED / READY FOR BROADCAST**  
> **Deployment Script**: `contracts/script/DeployAgentVault.s.sol`  
> **Target Deployed Address**: `NOT VERIFIED (PENDING LIVE BROADCAST)`

When deployed with `scripts/deploy_mainnet.sh`, verify the contract bytecode:

```bash
# Replace <AGENTVAULT_ADDRESS> with the deployed contract address
cast code <AGENTVAULT_ADDRESS> --rpc-url https://rpc.mainnet.arc.io
```

---

## 4. Verify Contract Ownership & Controller

Verify that the deployer address is correctly recorded as the contract owner:

```bash
cast call <AGENTVAULT_ADDRESS> "owner()(address)" --rpc-url https://rpc.mainnet.arc.io
```

---

## 5. Verify Configured USDC Address in AgentVault

Verify that `AgentVault` points strictly to the canonical Arc USDC contract:

```bash
cast call <AGENTVAULT_ADDRESS> "usdc()(address)" --rpc-url https://rpc.mainnet.arc.io
```

**Expected Result**:
```
0x3600000000000000000000000000000000000000
```

---

## 6. Verify On-Chain Spending Policy Configuration

Inspect the active policy rules stored directly in contract storage slots:

```bash
# Returns: (enabled, perTxLimit, dailyLimit, dailySpent, txCountToday, maxTxPerDay, currentDay)
cast call <AGENTVAULT_ADDRESS> \
  "getPolicy()(bool,uint256,uint256,uint256,uint256,uint256,uint256)" \
  --rpc-url https://rpc.mainnet.arc.io
```

---

## 7. Verify Recipient Allowlist & Blocklist

Verify whether a service recipient address (e.g. `0x1111...1111`) is permitted or blocked:

```bash
# Check if recipient is explicitly blocked
cast call <AGENTVAULT_ADDRESS> \
  "blockedRecipients(address)(bool)" 0x1111111111111111111111111111111111111111 \
  --rpc-url https://rpc.mainnet.arc.io

# Check if recipient is allowlisted
cast call <AGENTVAULT_ADDRESS> \
  "allowedRecipients(address)(bool)" 0x1111111111111111111111111111111111111111 \
  --rpc-url https://rpc.mainnet.arc.io
```

---

## 8. Verify Real Payment Transaction

> **Status**: **NOT VERIFIED (MAINNET TRANSACTION NOT YET EXECUTED)**

When a real transaction is broadcast post-deployment, query the receipt directly from Arc:

```bash
# Replace <TX_HASH> with the confirmed transaction hash
cast receipt <TX_HASH> --rpc-url https://rpc.mainnet.arc.io
```

**Expected Receipt Validation**:
- `status`: `1` (Success)
- `to`: `<AGENTVAULT_ADDRESS>`
- `gasUsed`: Paid in native USDC

---

## 9. Verify `PaymentExecuted` Event

Inspect the emitted event logs for the transaction receipt:

```bash
# Event Signature: PaymentExecuted(bytes32 indexed intentId, address indexed recipient, uint256 amount, uint256 fee)
cast receipt <TX_HASH> --rpc-url https://rpc.mainnet.arc.io | grep -A 10 "logs"
```

The event topic `0x...` must match `keccak256("PaymentExecuted(bytes32,address,uint256,uint256)")`.
