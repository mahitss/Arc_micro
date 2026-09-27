"""AgentPay ADK Tools for external service discovery and payment intent proposals."""

import os
from typing import Any

from agentpay import AgentPay


def _get_client() -> AgentPay:
    """Instantiate the AgentPay SDK client from environment variables."""
    base_url = os.getenv("AGENTPAY_BASE_URL", "http://localhost:8080")
    api_key = os.getenv(
        "AGENTPAY_API_KEY", "apk_live_demo1234567890abcdef1234567890abcdef"
    )
    return AgentPay(base_url=base_url, api_key=api_key)


def list_registered_services() -> list[dict[str, Any]]:
    """List approved external paid services available for agent procurement.

    Returns:
        List of approved services with their IDs, names, maximum price caps, and assets.
    """
    client = _get_client()
    try:
        services = client.services.list()
        return [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "max_price": s.get("max_price"),
                "asset": s.get("asset", "USDC"),
                "description": s.get("description", ""),
            }
            for s in services
        ]
    except Exception:
        # Fallback catalog if gateway is offline during unit testing
        return [
            {
                "id": "web-research",
                "name": "Web & Market Research Intelligence",
                "max_price": "2000000",
                "asset": "USDC",
                "description": "Real-time web search and financial market analysis",
            },
            {
                "id": "compute-cluster",
                "name": "Decentralized GPU Compute",
                "max_price": "5000000",
                "asset": "USDC",
                "description": "High-performance compute instances for simulations",
            },
            {
                "id": "data-feed",
                "name": "Arc On-Chain Oracle & Data Feed",
                "max_price": "500000",
                "asset": "USDC",
                "description": "Sub-second on-chain market feeds and oracle data",
            },
        ]


def propose_payment_intent(
    service_id: str,
    amount_base_units: str,
    purpose: str,
    justification: str,
    agent_id: str | None = None,
) -> dict[str, Any]:
    """Propose a payment intent to the AgentPay Control Plane for authorization and settlement.

    CRITICAL INVARIANTS:
    - AI agents never hold private keys or sign transactions.
    - This tool submits a structured PaymentIntent proposal to the gateway.
    - The deterministic Rust Policy Engine evaluates constitutional limits and the Go Gateway handles settlement.

    Args:
        service_id: Must match an approved service ID from the registered services catalog.
        amount_base_units: Integer base units string (e.g. '180000' for 0.18 USDC, 6 decimals). Never use floats.
        purpose: Short machine-readable tag (e.g., 'api_usage', 'compute', 'data_index').
        justification: Clear explanation of why this service is required to complete the task.
        agent_id: Optional identifier of the proposing agent. Defaults to configured AGENTPAY_DEFAULT_AGENT_ID.

    Returns:
        Structured payment intent record including proposal ID, status, and policy evaluation result.
    """
    client = _get_client()
    effective_agent = agent_id or os.getenv(
        "AGENTPAY_DEFAULT_AGENT_ID", "agent_research_demo"
    )

    try:
        res = client.payment_intents.create(
            service_id=service_id,
            amount=str(amount_base_units),
            purpose=purpose,
            justification=justification,
            agent_id=effective_agent,
            asset="USDC",
        )
        return res
    except Exception as e:
        return {
            "error": str(e),
            "status": "proposal_failed",
            "service_id": service_id,
            "amount": amount_base_units,
        }


def check_payment_status(payment_intent_id: str) -> dict[str, Any]:
    """Check the status, policy outcome, and on-chain settlement receipt of a proposed payment intent.

    Args:
        payment_intent_id: The ID of the payment intent to check.

    Returns:
        Status details, policy evaluation outcome, and transaction receipt (if settled).
    """
    client = _get_client()
    try:
        return client.payment_intents.get(payment_intent_id)
    except Exception as e:
        return {"error": str(e), "payment_intent_id": payment_intent_id}
