"""
AgentPay Autonomous Economic Protocol — End-to-End Python Example
Demonstrates: Discovery -> Quote -> Contract -> Deliverable Submission -> Payment Request
"""

import os
from datetime import datetime, timezone, timedelta
from agentpay import AgentPay

def main():
    client = AgentPay(
        api_key=os.getenv("AGENTPAY_API_KEY", "ap_live_example_key"),
        base_url=os.getenv("AGENTPAY_BASE_URL", "http://localhost:8080")
    )

    print("=== Step 1: Discover External Agents ===")
    agents = client.protocol.discover_agents(capability="code_audit")
    print(f"Discovered {len(agents)} agent(s) offering code_audit")
    provider_id = agents[0].get("agent_id", "agent_security_02") if agents else "agent_security_02"

    print("\n=== Step 2: Request Service Quote ===")
    deadline = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    quote = client.protocol.request_quote({
        "request_id": f"req_py_{int(datetime.now().timestamp())}",
        "requester_id": "agent_research_01",
        "capability": "code_audit",
        "budget_cap": "100.00",
        "deadline": deadline,
        "constraints": {"security_level": "HIGH"}
    })
    print(f"Received quote: {quote.get('quote_id')} for {quote.get('amount')} {quote.get('currency')}")

    print("\n=== Step 3: Inspect Authoritative Contract ===")
    contract = client.protocol.get_contract("contract_live_01")
    print(f"Contract {contract.get('contract_id')} status: {contract.get('state')} ({contract.get('total_amount')} USDC)")

    print("\n=== Step 4: Submit Work Deliverable ===")
    result = client.protocol.submit_result({
        "contract_id": contract.get("contract_id", "contract_live_01"),
        "milestone_id": "m1_initial_scan",
        "worker_agent_id": provider_id,
        "deliverable_hash": "c81729b4892019ab76ce0f42337a898112bc55210fa1402390aebce0984f11e2",
        "deliverable_payload": {
            "scan_completed": True,
            "findings_count": 0,
            "confidence": 0.98
        }
    })
    print(f"Verification decision: {result.get('decision')} (Eligible for payout: {result.get('eligible_for_payment')})")

    print("\n=== Step 5: Request Milestone Payment ===")
    payment = client.protocol.request_payment({
        "contract_id": contract.get("contract_id", "contract_live_01"),
        "milestone_id": "m1_initial_scan",
        "recipient_service_id": provider_id,
        "amount": "35.00",
        "currency": "USDC",
        "quality_verification_hash": result.get("computed_hash", "c81729b4892019ab76ce0f42337a898112bc55210fa1402390aebce0984f11e2")
    })
    print(f"Payment decision: {payment.get('decision')}")
    print(f"Payment Intent: {payment.get('payment_intent_id')}")

    print("\n=== Done: Python protocol execution completed deterministically ===")

if __name__ == "__main__":
    main()
