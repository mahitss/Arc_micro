#!/usr/bin/env bash
# ==============================================================================
# AgentPay: Secure Arc Mainnet Deployment Script
# ==============================================================================
# Safety Rules:
# - NEVER hardcode or print private keys.
# - Validates Arc Mainnet chain ID (5042) before broadcast.
# - Fails closed if any required environment variable is missing.
# ==============================================================================

set -euo pipefail

ARC_RPC_URL="${ARC_RPC_URL:-https://rpc.mainnet.arc.io}"
ARC_CHAIN_ID="${ARC_CHAIN_ID:-5042}"
ARC_USDC_ADDRESS="${ARC_USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"
AGENT_ID="${AGENT_ID:-research-agent}"

echo "=== AgentPay: Deploying AgentVault to Arc ==="
echo "RPC URL:       ${ARC_RPC_URL}"
echo "Chain ID:      ${ARC_CHAIN_ID}"
echo "USDC Address:  ${ARC_USDC_ADDRESS}"
echo "Agent ID:      ${AGENT_ID}"

# Check for private key without printing it
if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ] && [ -z "${PRIVATE_KEY:-}" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY or PRIVATE_KEY must be set in the environment." >&2
  echo "Aborting deployment to prevent fund loss or invalid state." >&2
  exit 1
fi

PRIV_KEY="${DEPLOYER_PRIVATE_KEY:-${PRIVATE_KEY}}"

# Verify Chain ID against live RPC before broadcasting
DETECTED_CHAIN_ID=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  "${ARC_RPC_URL}" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

EXPECTED_HEX=$(printf "0x%x" "${ARC_CHAIN_ID}")

if [ "${DETECTED_CHAIN_ID}" != "${EXPECTED_HEX}" ]; then
  echo "ERROR: Chain ID mismatch! RPC reported ${DETECTED_CHAIN_ID}, expected ${EXPECTED_HEX} (${ARC_CHAIN_ID})" >&2
  exit 1
fi

echo "Verified live RPC Chain ID matches: ${ARC_CHAIN_ID} (${DETECTED_CHAIN_ID})"

# Run Foundry Deployment Script
cd "$(dirname "$0")/../contracts"

forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url "${ARC_RPC_URL}" \
  --private-key "${PRIV_KEY}" \
  --broadcast \
  --slow

echo "=== Deployment Completed Successfully ==="
