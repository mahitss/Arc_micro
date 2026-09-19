#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AgentPay Monorepo Build Script
# ==============================================================================

echo "===================================================="
echo "          AgentPay Monorepo Build                   "
echo "===================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED=0

# 1. Build Shared Types
echo ""
echo "--> Building Shared TypeScript Package (packages/shared)..."
if [ -d "packages/shared" ]; then
  if (cd packages/shared && npm run build); then
    echo "  [OK] packages/shared built successfully."
  else
    echo "  [FAIL] packages/shared build failed."
    FAILED=1
  fi
fi

# 2. Build Go Gateway
echo ""
echo "--> Building Go Gateway (services/gateway)..."
if [ -d "services/gateway" ]; then
  mkdir -p services/gateway/bin
  if (cd services/gateway && go build -o bin/gateway ./cmd/server); then
    echo "  [OK] Go Gateway built successfully -> services/gateway/bin/gateway"
  else
    echo "  [FAIL] Go Gateway build failed."
    FAILED=1
  fi
fi

# 3. Build Rust Policy Engine
echo ""
echo "--> Building Rust Policy Engine (services/policy-engine)..."
if [ -d "services/policy-engine" ]; then
  if (cd services/policy-engine && cargo build --release); then
    echo "  [OK] Rust Policy Engine built successfully -> target/release/policy-engine"
  else
    echo "  [FAIL] Rust Policy Engine build failed."
    FAILED=1
  fi
fi

# 4. Build Web Application
echo ""
echo "--> Building Web Application (apps/web)..."
if [ -d "apps/web" ]; then
  if (cd apps/web && npm run build); then
    echo "  [OK] Web Application built successfully."
  else
    echo "  [FAIL] Web Application build failed."
    FAILED=1
  fi
fi

# 5. Build Foundry Contracts
echo ""
echo "--> Building Foundry Contracts (contracts)..."
if [ -d "contracts" ]; then
  if command -v forge >/dev/null 2>&1; then
    if (cd contracts && forge build); then
      echo "  [OK] Contracts compiled successfully."
    else
      echo "  [FAIL] Contracts compilation failed."
      FAILED=1
    fi
  else
    echo "  [SKIPPED] forge is not installed on this system."
  fi
fi

echo ""
echo "===================================================="
if [ "$FAILED" -ne 0 ]; then
  echo "BUILD FAILED: One or more components failed to build."
  exit 1
fi

echo "ALL ACTIVE COMPONENTS BUILT SUCCESSFULLY!"
echo "===================================================="
