"""
AgentPay — Python Quickstart: Basic Programmable Payment

EXECUTION MODES:
- SIMULATION: Uses mock/local gateway. Zero real USDC. No Arc settlement.
- LIVE ARC MAINNET: Connects to production gateway. Real Arc USDC settlement
  governed by AgentVault smart contract and enterprise policy engine.

Requirements:
- Set AGENTPAY_API_KEY in environment (e.g. ap_live_...)
- Optionally set AGENTPAY_BASE_URL (defaults to http://localhost:8080)
"""
import hashlib
import hmac
import os
import sys
import time
from decimal import Decimal

# Ensure local agentpay package is importable when running from repository
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../packages/sdk-python")))

from agentpay import (
    AgentPay,
    AgentPayError,
    ApprovalRequiredError,
    PolicyDeniedError,
    verify_webhook,
)

def main():
    api_key = os.environ.get("AGENTPAY_API_KEY")
    base_url = os.environ.get("AGENTPAY_BASE_URL", "http://localhost:8080")

    print("══════════════════════════════════════════════════════════════════")
    print(" AgentPay Developer Platform — Python Basic Payment Flow")
    print("══════════════════════════════════════════════════════════════════")
    print(f"Endpoint:   {base_url}")
    print(f"API Key:    {api_key[:8] + '...' if api_key else '(unset — using environment/default)'}")

    # 1. Initialize Client
    client = AgentPay(api_key=api_key, base_url=base_url)

    try:
        # 2. Discover Approved Services (Service Marketplace)
        print("\n[1/6] Discovering approved services...")
        services = client.services.list(enabled=True)
        if not services:
            print("No services registered on gateway. Exiting.")
            return

        service = services[0]
        service_id = service["id"]
        print(f"  Found service: {service.get('name')} (ID: {service_id})")
        print(f"  Resolved Recipient: {service.get('recipient')}")

        # 3. Request Price Quote
        print("\n[2/6] Requesting time-bound price quote...")
        # CRITICAL: Always use string or integer base units (micro-USDC: 6 decimals).
        # NEVER convert amounts through Python float values!
        fixed_price = service.get("fixed_price") or "180000"
        quote = client.services.quote(service_id=service_id, amount=fixed_price, asset="USDC")
        quote_id = quote.get("quote_id")
        amount = quote.get("amount")
        print(f"  Quote ID:  {quote_id}")
        print(f"  Amount:    {amount} micro-USDC ({Decimal(amount) / Decimal(1_000_000)} USDC)")
        print(f"  Expires:   {quote.get('expires_at')}")

        # 4. Request Programmable Payment
        # Idempotency key guarantees safety during network retries
        idempotency_key = f"idem_py_quickstart_{int(time.time() * 1000)}"
        print("\n[3/6] Requesting programmable payment...")
        payment = client.payments.create(
            service_id=service_id,
            quote_id=quote_id,
            amount=amount,
            asset="USDC",
            purpose="Automated market research procurement via AgentPay Python SDK",
            idempotency_key=idempotency_key,
        )

        payment_id = payment.get("id")
        status = payment.get("status")
        print(f"  Payment ID:     {payment_id}")
        print(f"  Initial Status: {status}")

        # 5. Check Status
        print("\n[4/6] Observing payment status...")
        detail = client.payments.get(payment_id)
        current_status = detail.get("intent", {}).get("status", status)
        print(f"  Current Status: {current_status}")
        tx_hash = detail.get("transaction_hash")
        if tx_hash:
            print(f"  Arc Tx Hash:    {tx_hash}")

        # 6. Inspect Flight Recorder Trace
        print("\n[5/6] Inspecting Financial Flight Recorder trace...")
        trace = client.payments.trace(payment_id)
        print(f"  Trace ID:       {trace.get('trace_id')}")
        print(f"  Execution Mode: {trace.get('execution_mode')}")
        steps = trace.get("steps", [])
        print(f"  Trail Steps:    {len(steps)} recorded steps")
        for step in steps:
            num = step.get("step_number")
            st_type = step.get("type", "").ljust(22)
            st_status = step.get("status")
            actor = step.get("actor")
            print(f"    [#{num}] {st_type} {st_status} ({actor})")

        # 7. Verify Webhook Helper
        print("\n[6/6] Verifying Webhook HMAC-SHA256 signature helper...")
        mock_secret = "whsec_demo_secret_key_1234567890abcdef"
        mock_payload = '{"id":"evt_sample","type":"payment_intent.authorized"}'
        now = int(time.time())
        to_sign = f"{now}.{mock_payload}".encode("utf-8")
        sig = hmac.new(mock_secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()
        sample_header = f"t={now},v1={sig}"

        is_valid = verify_webhook(mock_payload, sample_header, mock_secret)
        print(f"  Webhook Verified: {'VALID (HMAC-SHA256 authenticated)' if is_valid else 'INVALID'}")

        print("\n✔ Developer quickstart payment flow completed successfully!")

    except PolicyDeniedError as e:
        print(f"\n✖ Payment Policy Denied: {e.message} (Reason: {e.reason})")
    except ApprovalRequiredError as e:
        print(f"\n⏸ Approval Required: Payment requires manual human review: {e.message}")
    except AgentPayError as e:
        print(f"\n✖ AgentPay Error [{e.code}] (Status {e.status_code}): {e.message}")
    except Exception as e:
        print(f"\n✖ Unexpected error: {e}")

if __name__ == "__main__":
    main()
