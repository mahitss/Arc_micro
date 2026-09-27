"""FastAPI web serving harness for AgentPay ADK agent."""

from fastapi import FastAPI

from app.agent import root_agent

api = FastAPI(
    title="AgentPay Autonomous Agent API",
    description="Google ADK Agent Service for AgentPay Financial Control Plane",
    version="1.0.0",
)


@api.get("/health")
def health():
    return {
        "status": "healthy",
        "agent": root_agent.name,
        "service": "agentpay-agent",
    }
