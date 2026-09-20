# AgentPay Developer Platform Plan

## 1. Vision & Objective

AgentPay must transition from a standalone application into developer infrastructure. External developers building AI agents using Python (LangChain, CrewAI, AutoGen, OpenAI Swarm) and TypeScript (Vercel AI SDK, LangChain.js) must be able to import a single package and give their agent safe, policy-controlled USDC payment capabilities in under 10 lines of code.

---

## 2. 10-Day Realistic Scope & Prioritization

| Capability | Priority | 10-Day Feasibility | Deliverable Description |
| :--- | :---: | :---: | :--- |
| **API Key Authentication** | **P0** | High (Day 2) | Header `Authorization: Bearer apk_...` validated via hashed DB lookup. |
| **TypeScript / JS SDK** | **P0** | High (Days 4–5) | `@agentpay/sdk` published locally/npm with full typing and fetch client. |
| **Python SDK** | **P0** | High (Days 5–6) | `agentpay` pip-installable package targeting Python 3.10+ with sync/async client. |
| **LangChain / Tool Wrapper** | **P1** | Medium (Day 7) | Pre-built tool definitions: `AgentPayPaymentTool` for direct agent integration. |
| **Webhooks Dispatcher** | **P1** | Medium (Days 6–7) | Asynchronous webhook delivery with HMAC-SHA256 signatures. |
| **Interactive API Docs** | **P1** | High (Day 8) | OpenAPI 3.1 schema + embedded Swagger/Scalar UI in Next.js. |
| **AgentPay CLI (`agentpay`)** | **P2** | Low (Day 9/Later) | Developer CLI for key management and local simulation. |
| **Multi-Language Sandbox** | **P3** | Low (Post-MVP) | Cloud-hosted multi-tenant sandbox environment. |

---

## 3. TypeScript SDK Design (`@agentpay/sdk`)

```typescript
import { AgentPay } from '@agentpay/sdk';

const agentpay = new AgentPay({
  apiKey: process.env.AGENTPAY_API_KEY!,
  baseUrl: 'https://api.agentpay.arc.io',
});

// Autonomous Agent requests a payment
const intent = await agentpay.payments.createIntent({
  agentId: 'research-agent',
  serviceId: 'web-research',
  amountUSDC: '0.18',
  purpose: 'Academic paper retrieval',
  justification: 'Dataset required for synthesis query',
});

if (intent.status === 'CONFIRMED') {
  console.log(`Settled on Arc: ${intent.transactionHash}`);
} else if (intent.status === 'APPROVAL_REQUIRED') {
  console.log('Payment routed to human controller.');
}
```

---

## 4. Python SDK Design (`agentpay-python`)

```python
from agentpay import AgentPay

client = AgentPay(api_key="apk_test_...")

# Tool call inside LangChain / CrewAI
@tool
def pay_service(service_id: str, amount_usdc: float, justification: str):
    """Pay an approved service provider using AgentPay USDC infrastructure."""
    intent = client.payments.create_intent(
        agent_id="research-agent",
        service_id=service_id,
        amount=str(amount_usdc),
        justification=justification
    )
    return intent.model_dump()
```

---

## 5. Developer Experience & Integration Workflow

1. **Step 1: Get API Key**: Developer signs up in the Control Center and generates an API key `apk_live_...`.
2. **Step 2: Configure Policy**: In 60 seconds, sets maximum per-transaction ($0.50) and daily limit ($10.00).
3. **Step 3: Add SDK Tool to Agent**: Injects `AgentPayTool` into their existing agent prompt/tool list.
4. **Step 4: Autonomous Execution**: Agent reasons, requests payments, and settles on Arc with zero private key risk.
