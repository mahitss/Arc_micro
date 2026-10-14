#!/bin/sh
set -e

echo "[AgentPay Combined] Starting Rust Policy Engine on 127.0.0.1:8081..."
export POLICY_ENGINE_PORT=8081
./policy-engine &
POLICY_PID=$!

# Wait for policy engine to become ready
echo "[AgentPay Combined] Awaiting Policy Engine health check at http://127.0.0.1:8081/health..."
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -s -f http://127.0.0.1:8081/health > /dev/null 2>&1 || [ $ATTEMPT -ge $MAX_ATTEMPTS ]; do
  sleep 0.5
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  echo "[AgentPay Combined] WARNING: Policy engine health check timed out. Proceeding..."
else
  echo "[AgentPay Combined] Policy Engine is healthy."
fi

# Trap shutdown signals to terminate policy engine cleanly
cleanup() {
  echo "[AgentPay Combined] Caught termination signal, shutting down..."
  kill -TERM "$POLICY_PID" 2>/dev/null || true
  wait "$POLICY_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# Configure gateway to reach policy engine locally
export POLICY_ENGINE_URL="http://127.0.0.1:8081"
export GATEWAY_PORT="${PORT:-8080}"

echo "[AgentPay Combined] Starting Go Gateway on port ${GATEWAY_PORT}..."
./gateway &
GATEWAY_PID=$!

# Wait for either process to exit
wait -n "$POLICY_PID" "$GATEWAY_PID"
EXIT_CODE=$?
echo "[AgentPay Combined] A process exited with code $EXIT_CODE. Shutting down container..."
kill -TERM "$POLICY_PID" 2>/dev/null || true
kill -TERM "$GATEWAY_PID" 2>/dev/null || true
exit $EXIT_CODE
