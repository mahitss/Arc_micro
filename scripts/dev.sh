#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AgentPay Local Development Runner
# ==============================================================================

echo "===================================================="
echo "          AgentPay Development Runner               "
echo "===================================================="

# Ensure all child processes are killed on script exit/interrupt
trap 'echo -e "\n[AgentPay Dev] Terminating all background services..."; kill 0' EXIT INT TERM

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Check if .env exists, if not inform user
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "[AgentPay Dev] No .env found. Copying .env.example -> .env"
    cp .env.example .env
  fi
fi

echo "--> Starting Go Gateway on http://localhost:8080..."
(
  cd services/gateway
  go run ./cmd/server
) &

echo "--> Starting Rust Policy Engine on http://localhost:8081..."
(
  cd services/policy-engine
  cargo run
) &

echo "--> Starting Next.js Web Dashboard on http://localhost:3000..."
(
  cd apps/web
  npm run dev
) &

echo ""
echo "All services launched. Press Ctrl+C to terminate all services cleanly."
echo "===================================================="

# Wait for background processes
wait
