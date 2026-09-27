"""Root Agent definition for AgentPay Autonomous Agent powered by Google ADK."""

import os
from pathlib import Path

from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from app.tools import (
    check_payment_status,
    list_registered_services,
    propose_payment_intent,
)

# Model configuration
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Load system instructions from canonical prompt file
PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "agent_system_v1.txt"
if PROMPT_PATH.exists():
    with open(PROMPT_PATH, encoding="utf-8") as f:
        SYSTEM_INSTRUCTION = f.read()
else:
    SYSTEM_INSTRUCTION = (
        "You are an autonomous AI agent operating within the AgentPay financial infrastructure "
        "on the Arc blockchain. You never hold private keys and only propose bounded payment intents."
    )

root_agent = Agent(
    name="agent",
    model=Gemini(
        model=MODEL,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=[
        list_registered_services,
        propose_payment_intent,
        check_payment_status,
    ],
)

app = App(
    root_agent=root_agent,
    name="agentpay-agent-app",
)
