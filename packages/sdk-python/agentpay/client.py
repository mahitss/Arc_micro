"""
AgentPay Python Client
"""
import os
import time
from typing import Any, Dict, List, Optional
import requests

from .errors import (
    AgentPayError,
    ApprovalRequiredError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    ExecutionError,
    InsufficientTreasuryError,
    NetworkError,
    NotFoundError,
    PolicyDeniedError,
    RateLimitedError,
    ValidationError,
)
from .webhook import verify_signature

DEFAULT_BASE_URL = "http://localhost:8080"
DEFAULT_TIMEOUT = 10

class PaymentIntentsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def create(
        self,
        amount: Any,
        purpose: str,
        agent_id: Optional[str] = None,
        service: Optional[str] = None,
        service_id: Optional[str] = None,
        quote_id: Optional[str] = None,
        asset: str = "USDC",
        justification: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        vault_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        if isinstance(amount, float):
            raise ValueError(
                "Floating-point amounts are prohibited for safe financial representation. "
                "Use integer base units (e.g. '180000' for 0.18 USDC), Decimal, or string."
            )

        svc = service or service_id
        if not svc:
            raise ValueError("Either service or service_id is required.")

        agent = agent_id or getattr(self._client, "default_agent_id", "agent_default")

        payload = {
            "agent_id": agent,
            "service": svc,
            "amount": str(amount),
            "asset": asset,
            "purpose": purpose,
        }
        if quote_id:
            payload["quote_id"] = quote_id
        if justification:
            payload["justification"] = justification
        if vault_address:
            payload["vault_address"] = vault_address

        headers = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        return self._client._request("POST", "/v1/payment-intents", json=payload, headers=headers)

    def get(self, intent_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/payment-intents/{intent_id}")

    def trace(self, intent_id: str) -> Dict[str, Any]:
        """
        Retrieve the deterministic Financial Flight Recorder trace for a payment intent.
        """
        return self._client._request("GET", f"/v1/payment-intents/{intent_id}/trace")

    def list(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"status": status} if status else None
        res = self._client._request("GET", "/v1/payment-intents", params=params)
        return res.get("payment_intents", [])

    def confirm(self, intent_id: str) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/payment-intents/{intent_id}/confirm")

    def wait_for_completion(
        self,
        intent_id: str,
        timeout_seconds: int = 30,
        interval_seconds: float = 1.0,
    ) -> Dict[str, Any]:
        terminal_statuses = {"CONFIRMED", "DENIED", "FAILED", "CANCELLED", "EXPIRED"}
        start_time = time.time()

        while time.time() - start_time < timeout_seconds:
            detail = self.get(intent_id)
            intent = detail.get("intent", {})
            status = intent.get("status", "").upper()

            if status in terminal_statuses:
                return detail

            time.sleep(interval_seconds)

        raise AgentPayError(f"Payment intent {intent_id} did not complete within {timeout_seconds}s.", "POLLING_TIMEOUT", 408)

class AgentsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def list(self) -> List[Dict[str, Any]]:
        res = self._client._request("GET", "/v1/agents")
        return res.get("agents", [])

    def get(self, agent_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/agents/{agent_id}")

    def get_budget(self, agent_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/agent-budgets/{agent_id}")

    def discover(
        self,
        capability: Optional[str] = None,
        max_price: Optional[str] = None,
        min_reputation: Optional[int] = None,
        risk: Optional[str] = None,
        availability: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params = {}
        if capability:
            params["capability"] = capability
        if max_price:
            params["max_price"] = max_price
        if min_reputation is not None:
            params["min_reputation"] = min_reputation
        if risk:
            params["risk"] = risk
        if availability:
            params["availability"] = availability
        res = self._client._request("GET", "/v1/agents/discover", params=params or None)
        return res.get("agents", [])

    def get_services(self, agent_id: str) -> List[Dict[str, Any]]:
        res = self._client._request("GET", f"/v1/agents/services/{agent_id}")
        return res.get("services", [])


class ServicesResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def list(
        self,
        category: Optional[str] = None,
        asset: Optional[str] = None,
        trust_status: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        params = {}
        if category is not None:
            params["category"] = category
        if asset is not None:
            params["asset"] = asset
        if trust_status is not None:
            params["trust_status"] = trust_status
        if enabled is not None:
            params["enabled"] = str(enabled).lower()
        res = self._client._request("GET", "/v1/services", params=params or None)
        return res.get("services", [])

    def get_quote(
        self,
        service_id: str,
        amount: Optional[str] = None,
        asset: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {}
        if amount is not None:
            if isinstance(amount, float):
                raise ValueError("Floating-point amounts prohibited. Use string or Decimal.")
            payload["amount"] = str(amount)
        if asset is not None:
            payload["asset"] = asset
        return self._client._request("POST", f"/v1/services/{service_id}/quote", json=payload)

    def quote(
        self,
        service_id: str,
        amount: Optional[str] = None,
        asset: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Request a price quote from an approved service provider (convenience alias).
        """
        return self.get_quote(service_id=service_id, amount=amount, asset=asset)

    def performance(self, service_id: str, window: Optional[str] = None, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if window:
            params["window"] = window
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/services/{service_id}/performance", params=params)

    def reputation(self, service_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/services/{service_id}/reputation", params=params)

    def anomalies(self, service_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/services/{service_id}/anomalies", params=params)

class SimulationsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def create(
        self,
        agent_id: str,
        service_id: str,
        amount: str,
        asset: str = "USDC",
        purpose: Optional[str] = None,
        quote_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {
            "agent_id": agent_id,
            "service_id": service_id,
            "amount": str(amount),
            "asset": asset,
            "purpose": purpose,
            "quote_id": quote_id,
        }
        return self._client._request("POST", "/v1/simulations", json=payload)

class ApprovalsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def list(self) -> List[Dict[str, Any]]:
        res = self._client._request("GET", "/v1/approvals")
        return res.get("approvals", [])

    def get(self, approval_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/approvals/{approval_id}")

    def approve(self, approval_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/approvals/{approval_id}/approve", json={"notes": notes})

    def reject(self, approval_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/approvals/{approval_id}/reject", json={"reason": reason})

class TransactionsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def list(self) -> List[Dict[str, Any]]:
        res = self._client._request("GET", "/v1/transactions")
        return res.get("transactions", [])

class EventsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def list(
        self,
        event_type: Optional[str] = None,
        payment_intent_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        params = {"limit": limit}
        if event_type:
            params["event_type"] = event_type
        if payment_intent_id:
            params["payment_intent_id"] = payment_intent_id
        if agent_id:
            params["agent_id"] = agent_id

        res = self._client._request("GET", "/v1/events", params=params)
        return res.get("events", [])

    def get(self, event_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/events/{event_id}")

class WebhooksResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def create(self, url: str, description: Optional[str] = None, subscribed_events: Optional[List[str]] = None) -> Dict[str, Any]:
        payload = {
            "url": url,
            "description": description or "",
            "subscribed_events": subscribed_events or ["*"],
        }
        return self._client._request("POST", "/v1/webhooks", json=payload)

    def list(self) -> List[Dict[str, Any]]:
        res = self._client._request("GET", "/v1/webhooks")
        return res.get("endpoints", [])

    def get(self, endpoint_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/webhooks/{endpoint_id}")

    def update(self, endpoint_id: str, url: Optional[str] = None, description: Optional[str] = None, enabled: Optional[bool] = None) -> Dict[str, Any]:
        payload = {}
        if url is not None:
            payload["url"] = url
        if description is not None:
            payload["description"] = description
        if enabled is not None:
            payload["enabled"] = enabled
        return self._client._request("PATCH", f"/v1/webhooks/{endpoint_id}", json=payload)

    def delete(self, endpoint_id: str) -> Dict[str, Any]:
        return self._client._request("DELETE", f"/v1/webhooks/{endpoint_id}")

    def deliveries(self, endpoint_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        res = self._client._request("GET", f"/v1/webhooks/{endpoint_id}/deliveries", params={"limit": limit})
        return res.get("deliveries", [])

    def test(self, endpoint_id: str) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/webhooks/{endpoint_id}/test")

    def verify_signature(self, raw_body: Any, signature_header: str, secret: str, tolerance_seconds: int = 300) -> bool:
        return verify_signature(raw_body, signature_header, secret, tolerance_seconds)

class QuotesResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def request(
        self,
        service_id: str,
        buyer_agent_id: str,
        proposed_price: Optional[str] = None,
        terms: Optional[Dict[str, str]] = None,
        mission_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {"buyer_agent_id": buyer_agent_id}
        if proposed_price:
            payload["proposed_price"] = proposed_price
        if terms:
            payload["terms"] = terms
        if mission_id:
            payload["mission_id"] = mission_id
        return self._client._request("POST", f"/v1/agent-services/{service_id}/quotes", json=payload)

    def get(self, quote_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/quotes/{quote_id}")

    def counter(
        self,
        quote_id: str,
        agent_id: str,
        proposed_price: str,
        terms: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        payload = {
            "agent_id": agent_id,
            "proposed_price": proposed_price,
        }
        if terms:
            payload["terms"] = terms
        return self._client._request("POST", f"/v1/quotes/{quote_id}/counter", json=payload)

    def accept(self, quote_id: str) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/quotes/{quote_id}/accept")

class HiresResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def create(
        self,
        buyer_agent_id: str,
        quote_id: str,
        mission_id: str,
        expected_result: str,
        root_mission_id: Optional[str] = None,
        parent_hire_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload = {
            "buyer_agent_id": buyer_agent_id,
            "quote_id": quote_id,
            "mission_id": mission_id,
            "expected_result": expected_result,
        }
        if root_mission_id:
            payload["root_mission_id"] = root_mission_id
        if parent_hire_id:
            payload["parent_hire_id"] = parent_hire_id
        return self._client._request("POST", "/v1/hires", json=payload)

    def get(self, hire_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/hires/{hire_id}")

    def execute_payment(self, hire_id: str) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/hires/{hire_id}/pay")

    def submit_result(
        self,
        hire_id: str,
        result_type: str,
        result: Dict[str, Any],
        quality: Optional[float] = None,
        execution_time_ms: Optional[int] = None,
        provider_metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        payload = {
            "result_type": result_type,
            "result": result,
        }
        if quality is not None:
            payload["quality"] = quality
        if execution_time_ms is not None:
            payload["execution_time_ms"] = execution_time_ms
        if provider_metadata:
            payload["provider_metadata"] = provider_metadata
        return self._client._request("POST", f"/v1/hires/{hire_id}/results", json=payload)

    def cancel(self, hire_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        return self._client._request("POST", f"/v1/hires/{hire_id}/cancel", json={"reason": reason or "Cancelled"})

class MissionsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def economic_graph(self, mission_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/v1/missions/{mission_id}/economic-graph")

    def intelligence(self, mission_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/missions/{mission_id}/intelligence", params=params)

    def recommendations(self, mission_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/missions/{mission_id}/recommendations", params=params)

    def replan(self, mission_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("POST", f"/v1/missions/{mission_id}/replan", params=params)

    def recovery(self, mission_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/missions/{mission_id}/recovery", params=params)

    def observations(self, mission_id: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if organization_id:
            params["organization_id"] = organization_id
        return self._client._request("GET", f"/v1/missions/{mission_id}/observations", params=params)

class SwarmsResource:
    def __init__(self, client: "AgentPay"):
        self._client = client

    def create(
        self,
        name: str,
        objective: str,
        max_budget: str,
        asset: Optional[str] = None,
        deadline: Optional[str] = None,
        tasks: Optional[List[Dict[str, Any]]] = None,
        organization_id: Optional[str] = None,
        orchestrator_agent_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "name": name,
            "objective": objective,
            "max_budget": max_budget,
        }
        if asset:
            payload["asset"] = asset
        if deadline:
            payload["deadline"] = deadline
        if tasks:
            payload["tasks"] = tasks
        if organization_id:
            payload["organization_id"] = organization_id
        if orchestrator_agent_id:
            payload["orchestrator_agent_id"] = orchestrator_agent_id
        res = self._client._request("POST", "/v1/swarms", json=payload)
        return res.get("swarm", res)

    def get(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("GET", f"/v1/swarms/{swarm_id}")
        return res.get("swarm", res)

    def start(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("POST", f"/v1/swarms/{swarm_id}/start")
        return res.get("swarm", res)

    def cancel(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("POST", f"/v1/swarms/{swarm_id}/cancel")
        return res.get("swarm", res)

    def simulate(
        self,
        name: str,
        objective: str,
        max_budget: str,
        tasks: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "name": name,
            "objective": objective,
            "max_budget": max_budget,
        }
        if tasks:
            payload["tasks"] = tasks
        return self._client._request("POST", "/v1/swarms/simulate", json=payload)

    def tasks(self, swarm_id: str) -> List[Dict[str, Any]]:
        res = self._client._request("GET", f"/v1/swarms/{swarm_id}/tasks")
        return res.get("tasks", [])

    def graph(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("GET", f"/v1/swarms/{swarm_id}/graph")
        return res.get("graph", res)

    def trace(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("GET", f"/v1/swarms/{swarm_id}/trace")
        return res.get("trace", res)

    def risk(self, swarm_id: str) -> Dict[str, Any]:
        res = self._client._request("GET", f"/v1/swarms/{swarm_id}/risk")
        return res.get("risk_score", res)

    def replan(self, swarm_id: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        res = self._client._request("POST", f"/v1/swarms/{swarm_id}/replan", json=payload or {})
        return res.get("proposal", res)

class AgentPay:
    """
    AgentPay SDK Client
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.api_key = api_key or os.environ.get("AGENTPAY_API_KEY")
        self.base_url = (base_url or os.environ.get("AGENTPAY_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout

        self.payment_intents = PaymentIntentsResource(self)
        self.payments = self.payment_intents
        self.agents = AgentsResource(self)
        self.services = ServicesResource(self)
        self.quotes = QuotesResource(self)
        self.hires = HiresResource(self)
        self.missions = MissionsResource(self)
        self.approvals = ApprovalsResource(self)
        self.transactions = TransactionsResource(self)
        self.events = EventsResource(self)
        self.webhooks = WebhooksResource(self)
        self.simulations = SimulationsResource(self)
        self.swarms = SwarmsResource(self)

    def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        url = f"{self.base_url}{path if path.startswith('/') else '/' + path}"
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            req_headers["Authorization"] = f"Bearer {self.api_key}"
        if headers:
            req_headers.update(headers)

        try:
            resp = requests.request(
                method=method,
                url=url,
                json=json,
                params=params,
                headers=req_headers,
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            raise NetworkError(f"Network error communicating with AgentPay: {e}")

        request_id = resp.headers.get("x-request-id")

        if not resp.ok:
            code = "UNKNOWN_ERROR"
            message = f"Request failed with status {resp.status_code}"
            details = None

            try:
                body = resp.json()
                if "error" in body:
                    err_obj = body["error"]
                    code = err_obj.get("code", code)
                    message = err_obj.get("message", message)
                    details = err_obj.get("details")
                elif "message" in body:
                    message = body["message"]
            except Exception:
                pass

            if resp.status_code == 400:
                if code in ("POLICY_DENIED", "PAYMENT_POLICY_DENIED"):
                    raise PolicyDeniedError(message, reason=details, request_id=request_id)
                if code in ("INSUFFICIENT_FUNDS", "INSUFFICIENT_TREASURY"):
                    raise InsufficientTreasuryError(message, request_id=request_id)
                raise ValidationError(message, details=details, request_id=request_id)
            elif resp.status_code == 401:
                raise AuthenticationError(message, request_id=request_id)
            elif resp.status_code == 403:
                raise AuthorizationError(message, request_id=request_id)
            elif resp.status_code == 404:
                raise NotFoundError(message, request_id=request_id)
            elif resp.status_code == 409:
                raise ConflictError(message, request_id=request_id)
            elif resp.status_code == 429:
                raise RateLimitedError(message, request_id=request_id)
            else:
                if code in ("POLICY_DENIED", "PAYMENT_POLICY_DENIED"):
                    raise PolicyDeniedError(message, reason=details, request_id=request_id)
                if code == "APPROVAL_REQUIRED":
                    raise ApprovalRequiredError(message, request_id=request_id)
                if code in ("EXECUTION_FAILED", "EXECUTION_ERROR"):
                    raise ExecutionError(message, request_id=request_id)
                raise AgentPayError(message, code=code, status_code=resp.status_code, request_id=request_id, details=details)

        try:
            return resp.json()
        except Exception:
            return {}
