"""
AgentPay Python SDK Unit Tests
"""
import hashlib
import hmac
import time
import unittest
from unittest.mock import MagicMock, patch

from agentpay import (
    AgentPay,
    AgentPayError,
    AuthenticationError,
    NotFoundError,
    PolicyDeniedError,
    RateLimitedError,
    ValidationError,
    verify_signature,
)

class TestAgentPayPythonSDK(unittest.TestCase):
    def test_initialization(self):
        client = AgentPay(api_key="ap_live_test123", base_url="https://api.agentpay.arc")
        self.assertEqual(client.api_key, "ap_live_test123")
        self.assertEqual(client.base_url, "https://api.agentpay.arc")
        self.assertIsNotNone(client.payment_intents)
        self.assertIsNotNone(client.agents)
        self.assertIsNotNone(client.services)
        self.assertIsNotNone(client.approvals)
        self.assertIsNotNone(client.webhooks)

    def test_webhook_signature_verification(self):
        secret = "whsec_test_secret_1234567890abcdef1234567890abcdef"
        payload = '{"id":"evt_123","type":"payment_intent.confirmed"}'
        now = int(time.time())

        # Valid signature
        to_sign = f"{now}.{payload}".encode("utf-8")
        valid_sig = hmac.new(secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()
        valid_header = f"t={now},v1={valid_sig}"

        self.assertTrue(verify_signature(payload, valid_header, secret, tolerance_seconds=300))

        # Invalid signature
        invalid_header = f"t={now},v1=invalidsig123456"
        self.assertFalse(verify_signature(payload, invalid_header, secret, tolerance_seconds=300))

        # Stale timestamp (>300s)
        stale_time = now - 600
        stale_to_sign = f"{stale_time}.{payload}".encode("utf-8")
        stale_sig = hmac.new(secret.encode("utf-8"), stale_to_sign, hashlib.sha256).hexdigest()
        stale_header = f"t={stale_time},v1={stale_sig}"

        self.assertFalse(verify_signature(payload, stale_header, secret, tolerance_seconds=300))

    @patch("requests.request")
    def test_idempotency_key_propagation(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {"id": "pi_123", "status": "AUTHORIZED"}
        mock_resp.headers = {"x-request-id": "req_idem"}
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        res = client.payment_intents.create(
            agent_id="agent_1",
            service="research-api",
            amount="2500000",
            purpose="Telemetry",
            idempotency_key="task-idem-key-777",
        )

        self.assertEqual(res["id"], "pi_123")
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["headers"]["Idempotency-Key"], "task-idem-key-777")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer ap_live_test")

    @patch("requests.request")
    def test_error_mapping(self, mock_req):
        client = AgentPay(api_key="ap_live_test")

        # 401
        mock_401 = MagicMock()
        mock_401.ok = False
        mock_401.status_code = 401
        mock_401.json.return_value = {"error": {"code": "UNAUTHORIZED", "message": "Bad key"}}
        mock_401.headers = {"x-request-id": "req_401"}
        mock_req.return_value = mock_401

        with self.assertRaises(AuthenticationError):
            client.payment_intents.list()

        # 404
        mock_404 = MagicMock()
        mock_404.ok = False
        mock_404.status_code = 404
        mock_404.json.return_value = {"error": {"code": "NOT_FOUND", "message": "Not found"}}
        mock_404.headers = {"x-request-id": "req_404"}
        mock_req.return_value = mock_404

        with self.assertRaises(NotFoundError):
            client.payment_intents.get("nonexistent")

        # 400 Policy Denied
        mock_deny = MagicMock()
        mock_deny.ok = False
        mock_deny.status_code = 400
        mock_deny.json.return_value = {"error": {"code": "POLICY_DENIED", "message": "Limit exceeded"}}
        mock_deny.headers = {"x-request-id": "req_deny"}
        mock_req.return_value = mock_deny

        with self.assertRaises(PolicyDeniedError):
            client.payment_intents.create(agent_id="a", service="s", amount="99999999", purpose="Over limit")

    @patch("requests.request")
    def test_services_and_quotes(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "quote_id": "quote_py_1",
            "service_id": "research-api",
            "amount": "2500000",
            "asset": "USDC",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        quote = client.services.get_quote("research-api", amount="2500000")
        self.assertEqual(quote["quote_id"], "quote_py_1")
        self.assertEqual(quote["amount"], "2500000")
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["json"]["amount"], "2500000")

    @patch("requests.request")
    def test_agent_budget(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "agent_id": "agent_researcher",
            "remaining_daily_limit": "75000000",
            "available_budget": "50000000",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        budget = client.agents.get_budget("agent_researcher")
        self.assertEqual(budget["agent_id"], "agent_researcher")
        self.assertEqual(budget["remaining_daily_limit"], "75000000")

    @patch("requests.request")
    def test_simulation(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "simulation_id": "sim_py_1",
            "predicted_outcome": "WOULD_EXECUTE",
            "policy_decision": "ALLOW",
            "risk_level": "LOW",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        sim = client.simulations.create(
            agent_id="agent_researcher",
            service_id="research-api",
            amount="2000000",
        )
        self.assertEqual(sim["simulation_id"], "sim_py_1")
        self.assertEqual(sim["predicted_outcome"], "WOULD_EXECUTE")

if __name__ == "__main__":
    unittest.main()
