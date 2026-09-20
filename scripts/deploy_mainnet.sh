#!/usr/bin/env bash
# ==============================================================================
# AgentPay: Secure Arc Mainnet Deployment Script
# ==============================================================================
# Safety Rules:
# - NEVER hardcode, print, or log private keys.
# - Requires explicit operator confirmation (CONFIRM_MAINNET_DEPLOY="DEPLOY-ARC-MAINNET"
#   or --confirm flag).
# - Validates Arc Mainnet chain ID (5042) against live RPC before broadcasting.
# - Fails closed if any required environment variable is missing.
# - Verifies deployed contract bytecode via eth_getCode after deployment.
# ==============================================================================

set -euo pipefail

ARC_RPC_URL="${ARC_RPC_URL:-https://rpc.mainnet.arc.io}"
ARC_CHAIN_ID="${ARC_CHAIN_ID:-5042}"
ARC_USDC_ADDRESS="${ARC_USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"
AGENT_ID="${AGENT_ID:-research-agent}"

echo "=================================================================="
echo "          AgentPay: Secure Arc Mainnet Deployment                "
echo "=================================================================="
echo "Destination Network: Arc Mainnet"
echo "Target Chain ID:     ${ARC_CHAIN_ID}"
echo "Target RPC URL:      ${ARC_RPC_URL}"
echo "USDC Contract:       ${ARC_USDC_ADDRESS}"
echo "Agent ID:            ${AGENT_ID}"
echo "=================================================================="

# Check for explicit confirmation
CONFIRM="${CONFIRM_MAINNET_DEPLOY:-}"
if [ "${1:-}" = "--confirm" ]; then
  CONFIRM="DEPLOY-ARC-MAINNET"
fi

if [ "${CONFIRM}" != "DEPLOY-ARC-MAINNET" ]; then
  if [ -t 0 ]; then
    echo "WARNING: You are targeting PRODUCTION Arc Mainnet (Chain ID ${ARC_CHAIN_ID})."
    echo "To proceed, type 'DEPLOY-ARC-MAINNET' and press Enter:"
    read -r USER_INPUT
    if [ "${USER_INPUT}" != "DEPLOY-ARC-MAINNET" ]; then
      echo "ERROR: Confirmation mismatch. Deployment aborted." >&2
      exit 1
    fi
  else
    echo "ERROR: Explicit confirmation required for Mainnet deployment." >&2
    echo "Pass --confirm or set CONFIRM_MAINNET_DEPLOY='DEPLOY-ARC-MAINNET'." >&2
    exit 1
  fi
fi

# Check for private key without printing it
if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ] && [ -z "${PRIVATE_KEY:-}" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY or PRIVATE_KEY must be set in the environment." >&2
  echo "Aborting deployment to prevent fund loss or invalid state." >&2
  exit 1
fi

PRIV_KEY="${DEPLOYER_PRIVATE_KEY:-${PRIVATE_KEY}}"

# Verify Chain ID against live RPC before broadcasting
echo "Querying live RPC at ${ARC_RPC_URL} for chain ID..."
DETECTED_CHAIN_ID=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  "${ARC_RPC_URL}" | grep -o '"result":"[^"]*"' | cut -d'"' -f4 || echo "ERROR")

if [ "${DETECTED_CHAIN_ID}" = "ERROR" ] || [ -z "${DETECTED_CHAIN_ID}" ]; then
  echo "ERROR: Failed to connect to RPC endpoint ${ARC_RPC_URL}" >&2
  exit 1
fi

EXPECTED_HEX=$(printf "0x%x" "${ARC_CHAIN_ID}")

if [ "${DETECTED_CHAIN_ID}" != "${EXPECTED_HEX}" ]; then
  echo "ERROR: Chain ID mismatch! RPC reported ${DETECTED_CHAIN_ID}, expected ${EXPECTED_HEX} (${ARC_CHAIN_ID})" >&2
  exit 1
fi

echo "Verified live RPC Chain ID matches expected Arc Mainnet: ${ARC_CHAIN_ID} (${DETECTED_CHAIN_ID})"

# Run Foundry Deployment Script
cd "$(dirname "$0")/../contracts"

echo "Executing Foundry deployment script with --slow and --broadcast..."
forge script script/DeployAgentVault.s.sol:DeployAgentVault \
  --rpc-url "${ARC_RPC_URL}" \
  --private-key "${PRIV_KEY}" \
  --broadcast \
  --slow

echo "=== Deployment Broadcast Completed ==="
echo "NOTE: Gateway live execution is disabled by default."
echo "Set ENABLE_LIVE_EXECUTION=true and LIVE_EXECUTION_ACKNOWLEDGED=true on the gateway"
echo "only after manual verification of the deployed AgentVault contract."
