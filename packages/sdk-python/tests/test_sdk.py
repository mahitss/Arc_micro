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

    @patch("requests.request")
    def test_day8_developer_flow_and_float_safety(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "id": "pi_py_day8",
            "agent_id": "agent_alpha",
            "service": "web-research",
            "quote_id": "quote_py_999",
            "amount": "180000",
            "asset": "USDC",
            "purpose": "Day 8 python dev test",
            "status": "AUTHORIZED",
        }
        mock_resp.headers = {"x-request-id": "req_py_day8"}
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        # 1. client.payments is alias of client.payment_intents
        self.assertIs(client.payments, client.payment_intents)

        # 2. Float rejection
        with self.assertRaises(ValueError):
            client.payments.create(
                service_id="web-research",
                amount=0.18, # Prohibited float
                purpose="test",
            )

        # 3. Valid payment creation with string amount and quote_id
        payment = client.payments.create(
            service_id="web-research",
            quote_id="quote_py_999",
            amount="180000",
            asset="USDC",
            purpose="Day 8 python dev test",
            idempotency_key="idem_py_123",
        )

        self.assertEqual(payment["id"], "pi_py_day8")
        self.assertEqual(payment["status"], "AUTHORIZED")
        _, kwargs = mock_req.call_args
        self.assertEqual(kwargs["json"]["quote_id"], "quote_py_999")
        self.assertEqual(kwargs["json"]["service"], "web-research")
        self.assertEqual(kwargs["headers"]["Idempotency-Key"], "idem_py_123")

    @patch("requests.request")
    def test_day8_trace_and_webhook_alias(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "trace_id": "trc_py_01",
            "status": "CONFIRMED",
            "execution_mode": "SIMULATION",
            "steps": [{"step_number": 1, "type": "PAYMENT_REQUESTED"}],
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        trace = client.payments.trace("pi_py_day8")
        self.assertEqual(trace["trace_id"], "trc_py_01")
        self.assertEqual(trace["execution_mode"], "SIMULATION")

        # Test verify_webhook alias
        from agentpay import verify_webhook
        secret = "whsec_abc123"
        now = int(time.time())
        payload = '{"test":true}'
        sig = hmac.new(secret.encode("utf-8"), f"{now}.{payload}".encode("utf-8"), hashlib.sha256).hexdigest()
        self.assertTrue(verify_webhook(payload, f"t={now},v1={sig}", secret))

    @patch("requests.request")
    def test_a2a_discovery_and_services(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "agents": [
                {
                    "agent_id": "agent_data_01",
                    "service_id": "data-processing",
                    "capabilities": ["data_extraction"],
                    "pricing_model": "FIXED",
                    "base_price": "500000",
                    "reputation": 9800,
                }
            ]
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        discovered = client.agents.discover(capability="data_extraction", min_reputation=9000)
        self.assertEqual(len(discovered), 1)
        self.assertEqual(discovered[0]["agent_id"], "agent_data_01")

        mock_resp.json.return_value = {
            "services": [
                {"agent_id": "agent_data_01", "service_id": "data-processing"}
            ]
        }
        services = client.agents.get_services("agent_data_01")
        self.assertEqual(len(services), 1)
        self.assertEqual(services[0]["service_id"], "data-processing")

    @patch("requests.request")
    def test_a2a_quotes_and_negotiation(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "quote_id": "quote_py_01",
            "buyer_agent_id": "agent_buyer",
            "seller_agent_id": "agent_seller",
            "service_id": "data-processing",
            "price": "480000",
            "status": "OFFERED",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        quote = client.quotes.request(
            service_id="data-processing",
            buyer_agent_id="agent_buyer",
            proposed_price="450000",
        )
        self.assertEqual(quote["quote_id"], "quote_py_01")
        self.assertEqual(quote["price"], "480000")

        countered = client.quotes.counter("quote_py_01", agent_id="agent_buyer", proposed_price="460000")
        self.assertEqual(countered["quote_id"], "quote_py_01")

        accepted = client.quotes.accept("quote_py_01")
        self.assertEqual(accepted["quote_id"], "quote_py_01")

    @patch("requests.request")
    def test_a2a_hires_payments_and_results(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "id": "hire_py_01",
            "buyer_agent_id": "agent_buyer",
            "seller_agent_id": "agent_seller",
            "service_id": "data-processing",
            "call_depth": 1,
            "status": "CREATED",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        hire = client.hires.create(
            buyer_agent_id="agent_buyer",
            quote_id="quote_py_01",
            mission_id="mission_100",
            expected_result="json_data",
        )
        self.assertEqual(hire["id"], "hire_py_01")

        mock_resp.json.return_value = {"id": "hire_py_01", "status": "PAID"}
        paid = client.hires.execute_payment("hire_py_01")
        self.assertEqual(paid["status"], "PAID")

        mock_resp.json.return_value = {"id": "hire_py_01", "status": "RESULT_RECEIVED"}
        result = client.hires.submit_result(
            hire_id="hire_py_01",
            result_type="json",
            result={"key": "val"},
            quality=0.98,
        )
        self.assertEqual(result["status"], "RESULT_RECEIVED")

        mock_resp.json.return_value = {"id": "hire_py_01", "status": "CANCELLED"}
        cancelled = client.hires.cancel("hire_py_01", "Test cancellation")
        self.assertEqual(cancelled["status"], "CANCELLED")

    @patch("requests.request")
    def test_a2a_economic_graph(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "mission_id": "mission_py_99",
            "nodes": [
                {"id": "mission_py_99", "type": "MISSION", "label": "Analysis"},
                {"id": "agent_01", "type": "AGENT", "label": "Agent Alpha"},
            ],
            "edges": [
                {"source": "agent_01", "target": "hire_py_01", "type": "HIRED"},
            ],
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        graph = client.missions.economic_graph("mission_py_99")
        self.assertEqual(graph["mission_id"], "mission_py_99")
        self.assertEqual(len(graph["nodes"]), 2)
        self.assertEqual(len(graph["edges"]), 1)

    @patch("requests.request")
    def test_intelligence_services(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "service_id": "data_agent",
            "success_rate_bps": 9800,
            "confidence": "HIGH",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        perf = client.services.performance("data_agent", window="last_10_jobs")
        self.assertEqual(perf["success_rate_bps"], 9800)

        mock_resp.json.return_value = {"service_id": "data_agent", "circuit_breaker_status": "HEALTHY", "anomalies": []}
        anom = client.services.anomalies("data_agent")
        self.assertEqual(anom["circuit_breaker_status"], "HEALTHY")

        mock_resp.json.return_value = {"service_id": "data_agent", "reputation_score": 9800}
        rep = client.services.reputation("data_agent")
        self.assertEqual(rep["reputation_score"], 9800)

    @patch("requests.request")
    def test_intelligence_missions(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "mission_id": "msn_100",
            "recovery_attempts": 1,
            "status": "COMPLETED",
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")
        intel = client.missions.intelligence("msn_100")
        self.assertEqual(intel["mission_id"], "msn_100")
        self.assertEqual(intel["recovery_attempts"], 1)

        mock_resp.json.return_value = {
            "mission_id": "msn_100",
            "strategy": "TRY_ALTERNATIVE_SERVICE",
            "proposed_steps": [{"recommended_service_id": "agent_data_b"}],
        }
        proposal = client.missions.replan("msn_100")
        self.assertEqual(proposal["strategy"], "TRY_ALTERNATIVE_SERVICE")

        mock_resp.json.return_value = {"mission_id": "msn_100", "recovery_attempts": 1}
        rec = client.missions.recovery("msn_100")
        self.assertEqual(rec["recovery_attempts"], 1)

        mock_resp.json.return_value = {"mission_id": "msn_100", "observations": [{"id": "obs_1"}]}
        obs = client.missions.observations("msn_100")
        self.assertEqual(len(obs["observations"]), 1)

    @patch("requests.request")
    def test_swarms_orchestration(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.json.return_value = {
            "swarm": {
                "id": "swm_py_01",
                "name": "Market Intelligence Swarm",
                "objective": "Build industry report",
                "status": "CREATED",
                "max_budget": "5000000",
                "task_count": 5,
            }
        }
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_live_test")

        # 1. Create Swarm
        sw = client.swarms.create(
            name="Market Intelligence Swarm",
            objective="Build industry report",
            max_budget="5000000",
        )
        self.assertEqual(sw["id"], "swm_py_01")
        self.assertEqual(sw["status"], "CREATED")

        # 2. Get Swarm
        mock_resp.json.return_value = {"swarm": {"id": "swm_py_01", "status": "RUNNING"}}
        sw_get = client.swarms.get("swm_py_01")
        self.assertEqual(sw_get["id"], "swm_py_01")

        # 3. Start Swarm
        mock_resp.json.return_value = {"swarm": {"id": "swm_py_01", "status": "RUNNING"}}
        sw_started = client.swarms.start("swm_py_01")
        self.assertEqual(sw_started["status"], "RUNNING")

        # 4. Simulate
        mock_resp.json.return_value = {
            "is_valid_dag": True,
            "task_count": 5,
            "estimated_cost": "2500000",
            "risk_score": {"overall_score": 10, "risk_level": "LOW"},
        }
        sim = client.swarms.simulate(
            name="Simulated Swarm",
            objective="Build report",
            max_budget="3000000",
        )
        self.assertTrue(sim["is_valid_dag"])

        # 5. Tasks
        mock_resp.json.return_value = {
            "tasks": [{"id": "t1", "title": "Research"}, {"id": "t2", "title": "Data"}]
        }
        tasks = client.swarms.tasks("swm_py_01")
        self.assertEqual(len(tasks), 2)

        # 6. Graph
        mock_resp.json.return_value = {
            "graph": {"nodes": [{"id": "t1"}], "edges": [], "is_dag": True}
        }
        g = client.swarms.graph("swm_py_01")
        self.assertTrue(g["is_dag"])

        # 7. Trace
        mock_resp.json.return_value = {
            "trace": {"swarm_id": "swm_py_01", "events": [{"event_type": "swarm.started"}]}
        }
        tr = client.swarms.trace("swm_py_01")
        self.assertEqual(tr["swarm_id"], "swm_py_01")

        # 8. Risk
        mock_resp.json.return_value = {
            "risk_score": {"overall_score": 15, "risk_level": "LOW"}
        }
        rk = client.swarms.risk("swm_py_01")
        self.assertEqual(rk["risk_level"], "LOW")

        # 9. Replan
        mock_resp.json.return_value = {
            "proposal": {"strategy": "TRY_ALTERNATIVE_SERVICE", "confidence": "HIGH"}
        }
        rep = client.swarms.replan("swm_py_01")
        self.assertEqual(rep["strategy"], "TRY_ALTERNATIVE_SERVICE")

        # 10. Cancel
        mock_resp.json.return_value = {"swarm": {"id": "swm_py_01", "status": "CANCELLED"}}
        canc = client.swarms.cancel("swm_py_01")
        self.assertEqual(canc["status"], "CANCELLED")

    @patch("requests.request")
    def test_open_agent_network(self, mock_req):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_req.return_value = mock_resp

        client = AgentPay(api_key="ap_test_key")

        # 1. Register
        mock_resp.json.return_value = {
            "agent_id": "agent_auditor_01",
            "display_name": "Sentinel Auditor",
            "status": "ACTIVE",
        }
        registered = client.agent_network.register({
            "protocol_version": "agentpay.network.v1",
            "agent_id": "agent_auditor_01",
            "name": "Sentinel Auditor",
        })
        self.assertEqual(registered["agent_id"], "agent_auditor_01")
        self.assertEqual(registered["status"], "ACTIVE")

        # 2. List Discovery
        mock_resp.json.return_value = {
            "agents": [{"identity": {"agent_id": "agent_auditor_01"}, "trust_evaluation": {"trust_score": 9200}}],
            "count": 1,
        }
        res = client.agent_network.list(capability="security.audit@1.0")
        self.assertEqual(res["count"], 1)
        self.assertEqual(res["agents"][0]["identity"]["agent_id"], "agent_auditor_01")

        # 3. Create & Fund Contract
        mock_resp.json.return_value = {"contract_id": "c_py_01", "status": "FUNDED", "payment_intent_id": "pi_123"}
        funded = client.agent_network.fund_contract("c_py_01")
        self.assertEqual(funded["status"], "FUNDED")

        # 4. Graph
        mock_resp.json.return_value = {"nodes": [{"id": "agent_auditor_01", "type": "AGENT"}], "edges": []}
        graph = client.agent_network.get_graph()
        self.assertEqual(len(graph["nodes"]), 1)

if __name__ == "__main__":
    unittest.main()



