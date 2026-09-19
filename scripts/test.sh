#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AgentPay Automated Test Suite Runner
# ==============================================================================

echo "===================================================="
echo "          AgentPay Automated Test Suite             "
echo "===================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED=0

# 1. Go Gateway Tests
echo ""
echo "--> Running Go Gateway tests..."
if [ -d "services/gateway" ]; then
  if (cd services/gateway && go test -v ./...); then
    echo "  [PASS] Go Gateway tests passed."
  else
    echo "  [FAIL] Go Gateway tests failed."
    FAILED=1
  fi
fi

# 2. Rust Policy Engine Tests
echo ""
echo "--> Running Rust Policy Engine tests..."
if [ -d "services/policy-engine" ]; then
  if (cd services/policy-engine && cargo test); then
    echo "  [PASS] Rust Policy Engine tests passed."
  else
    echo "  [FAIL] Rust Policy Engine tests failed."
    FAILED=1
  fi
fi

# 3. Web Application Tests & Lint
echo ""
echo "--> Running Web Application lint & typecheck..."
if [ -d "apps/web" ]; then
  if (cd apps/web && npm run lint); then
    echo "  [PASS] Web Application lint passed."
  else
    echo "  [FAIL] Web Application lint failed."
    FAILED=1
  fi
fi

# 4. Foundry Contracts Tests
echo ""
echo "--> Running Foundry Contract tests..."
if [ -d "contracts" ]; then
  if command -v forge >/dev/null 2>&1; then
    if (cd contracts && forge test -vvv); then
      echo "  [PASS] Foundry Contract tests passed."
    else
      echo "  [FAIL] Foundry Contract tests failed."
      FAILED=1
    fi
  else
    echo "  [SKIPPED] forge is not installed on this system."
    echo "            Install Foundry via: curl -L https://foundry.paradigm.xyz | bash && foundryup"
  fi
fi

echo ""
echo "===================================================="
if [ "$FAILED" -ne 0 ]; then
  echo "TEST SUITE FAILED: One or more component test suites failed."
  exit 1
fi

echo "ALL ACTIVE TEST SUITES PASSED SUCCESSFULLY!"
echo "===================================================="
