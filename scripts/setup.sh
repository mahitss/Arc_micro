#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AgentPay Local Environment Setup Script
# ==============================================================================

echo "===================================================="
echo "          AgentPay Environment Setup                "
echo "===================================================="

MISSING_TOOLS=0
WARNINGS=0

check_tool() {
  local tool_name="$1"
  local install_instructions="$2"
  if command -v "$tool_name" >/dev/null 2>&1; then
    local ver=""
    if [ "$tool_name" = "go" ]; then
      ver="$(go version 2>&1)"
    else
      ver="$("$tool_name" --version 2>&1 | head -n 1)"
    fi
    echo "  [OK] $tool_name is installed: $ver"
  else
    echo "  [MISSING] $tool_name is NOT found in PATH."
    echo "            Install via: $install_instructions"
    MISSING_TOOLS=$((MISSING_TOOLS + 1))
  fi
}

check_optional_tool() {
  local tool_name="$1"
  local install_instructions="$2"
  if command -v "$tool_name" >/dev/null 2>&1; then
    echo "  [OK] $tool_name is installed: $("$tool_name" --version 2>&1 | head -n 1)"
  else
    echo "  [OPTIONAL MISSING] $tool_name is NOT found in PATH."
    echo "                     Required for: smart contract testing and compilation on Arc."
    echo "                     Install via: $install_instructions"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo ""
echo "--> Checking required prerequisites..."
check_tool "node" "https://nodejs.org/ (v18+ required)"
check_tool "npm" "https://nodejs.org/ (bundled with Node.js)"
check_tool "go" "https://go.dev/dl/ (Go 1.22+ required)"
check_tool "cargo" "https://rustup.rs/ (Rust 2021 edition required)"
check_optional_tool "forge" "curl -L https://foundry.paradigm.xyz | bash && foundryup"

if [ "$MISSING_TOOLS" -gt 0 ]; then
  echo ""
  echo "ERROR: $MISSING_TOOLS required tool(s) are missing. Please install them and re-run setup.sh."
  exit 1
fi

echo ""
echo "--> Setting up Shared TypeScript Package (packages/shared)..."
if [ -d "packages/shared" ]; then
  (cd packages/shared && npm install)
fi

echo ""
echo "--> Setting up Web Application (apps/web)..."
if [ -d "apps/web" ]; then
  (cd apps/web && npm install)
fi

echo ""
echo "--> Setting up Go Gateway (services/gateway)..."
if [ -d "services/gateway" ]; then
  (cd services/gateway && go mod download)
fi

echo ""
echo "--> Setting up Rust Policy Engine (services/policy-engine)..."
if [ -d "services/policy-engine" ]; then
  echo "    Rust policy engine directory ready."
fi

echo ""
echo "--> Setting up Foundry Contracts (contracts)..."
if [ -d "contracts" ]; then
  if command -v forge >/dev/null 2>&1; then
    (cd contracts && forge build)
  else
    echo "    [NOTE] Skipping contract build: forge is not installed."
  fi
fi

echo ""
echo "===================================================="
if [ "$WARNINGS" -gt 0 ]; then
  echo "Setup completed with $WARNINGS warning(s) (optional tools missing)."
else
  echo "All tools and dependencies verified successfully!"
fi
echo "Run 'make dev' or 'bash scripts/dev.sh' to start services."
echo "===================================================="
