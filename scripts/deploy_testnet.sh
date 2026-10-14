#!/usr/bin/env bash
# ==============================================================================
# AgentPay: Secure Arc Testnet Deployment Script
# ==============================================================================
# Target Network: Arc Testnet (Chain ID 5042002 / 0x4cef52)
# Explorer: https://testnet.arcscan.app/
# ==============================================================================
# Safety Rules:
# - NEVER hardcode, print, or log private keys.
# - Requires explicit operator confirmation (CONFIRM_TESTNET_DEPLOY="DEPLOY-ARC-TESTNET"
#   or --confirm flag).
# - Validates Arc Testnet chain ID (5042002) against live RPC before broadcasting.
# - Fails closed if any required environment variable is missing.
# ==============================================================================

set -euo pipefail

ARC_RPC_URL="${ARC_RPC_URL:-https://rpc.testnet.arc.network}"
ARC_CHAIN_ID="${ARC_CHAIN_ID:-5042002}"
ARC_USDC_ADDRESS="${ARC_USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"
AGENT_ID="${AGENT_ID:-research-agent}"
INITIAL_OWNER="${COLD_MULTISIG_OWNER:-${INITIAL_OWNER:-}}"

echo "=================================================================="
echo "          AgentPay: Secure Arc Testnet Deployment                 "
echo "=================================================================="
echo "Destination Network: Arc Testnet"
echo "Target Chain ID:     ${ARC_CHAIN_ID}"
echo "Target RPC URL:      ${ARC_RPC_URL}"
echo "USDC Contract:       ${ARC_USDC_ADDRESS}"
echo "Agent ID:            ${AGENT_ID}"
echo "Initial Vault Owner: ${INITIAL_OWNER}"
echo "=================================================================="

# Check for explicit confirmation
CONFIRM="${CONFIRM_TESTNET_DEPLOY:-}"
if [ "${1:-}" = "--confirm" ]; then
  CONFIRM="DEPLOY-ARC-TESTNET"
fi

if [ "${CONFIRM}" != "DEPLOY-ARC-TESTNET" ]; then
  if [ -t 0 ]; then
    echo "WARNING: You are targeting Arc Testnet (Chain ID ${ARC_CHAIN_ID})."
    echo "To proceed, type 'DEPLOY-ARC-TESTNET' and press Enter:"
    read -r USER_INPUT
    if [ "${USER_INPUT}" != "DEPLOY-ARC-TESTNET" ]; then
      echo "ERROR: Confirmation mismatch. Deployment aborted." >&2
      exit 1
    fi
  else
    echo "ERROR: Explicit confirmation required for Testnet deployment." >&2
    echo "Pass --confirm or set CONFIRM_TESTNET_DEPLOY='DEPLOY-ARC-TESTNET'." >&2
    exit 1
  fi
fi

# Enforce INITIAL_OWNER requirement
if [ -z "${INITIAL_OWNER}" ]; then
  echo "ERROR: COLD_MULTISIG_OWNER or INITIAL_OWNER must be set in the environment." >&2
  echo "AgentVault requires a valid non-zero owner address." >&2
  echo "Deployment aborted to protect contract governance authority." >&2
  exit 1
fi

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

echo "Verified live RPC Chain ID matches expected Arc Testnet: ${ARC_CHAIN_ID} (${DETECTED_CHAIN_ID})"

# Run Foundry Deployment Script
cd "$(dirname "$0")/../contracts"
export ARC_REQUIRE_MAINNET="false"
export ARC_CHAIN_ID="${ARC_CHAIN_ID}"
export ARC_USDC_ADDRESS="${ARC_USDC_ADDRESS}"
export AGENT_ID="${AGENT_ID}"
export COLD_MULTISIG_OWNER="${INITIAL_OWNER}"

PRIV_KEY="${DEPLOYER_PRIVATE_KEY:-${PRIVATE_KEY:-}}"

if [ -n "${PRIV_KEY}" ]; then
  echo "Executing Foundry deployment script with private key..."
  forge script script/DeployAgentVault.s.sol:DeployAgentVault \
    --rpc-url "${ARC_RPC_URL}" \
    --sender "${INITIAL_OWNER}" \
    --private-key "${PRIV_KEY}" \
    --broadcast \
    --slow
else
  echo "Executing Foundry deployment script with interactive signer prompt..."
  echo "Target Sender Address: ${INITIAL_OWNER}"
  forge script script/DeployAgentVault.s.sol:DeployAgentVault \
    --rpc-url "${ARC_RPC_URL}" \
    --sender "${INITIAL_OWNER}" \
    --interactive \
    --broadcast \
    --slow
fi

echo "=== Testnet Deployment Broadcast Completed ==="
echo "Explorer: https://testnet.arcscan.app/"
echo "NOTE: Gateway live execution remains disabled by default (ENABLE_LIVE_EXECUTION=false)."
