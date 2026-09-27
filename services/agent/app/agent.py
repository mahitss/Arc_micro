"""Root Agent definition for AgentPay Autonomous Agent powered by Google ADK with Universal AI Provider."""

import logging
import os
from pathlib import Path

from google.adk.agents import Agent
from google.adk.apps import App

from app.tools import (
    check_payment_status,
    list_registered_services,
    propose_payment_intent,
)

logger = logging.getLogger("agentpay.agent")

# Detect AI Provider and Model
openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("AI_API_KEY")
provider = os.getenv("AI_PROVIDER", "openrouter" if openrouter_key else "gemini").lower()

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


def create_model():
    """Create the configured universal AI model instance.
    
    SECURITY INVARIANT:
    AI models are strictly advisory. They generate structured proposals
    and have ZERO direct access to private keys, signing, or vault transfers.
    """
    if (provider == "openrouter" or provider == "openai") and openrouter_key:
        try:
            from google.adk.labs.openai import OpenAILlm
            from openai import AsyncOpenAI

            endpoint = os.getenv("AI_ENDPOINT", "https://openrouter.ai/api/v1")
            model_name = os.getenv("AI_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
            client = AsyncOpenAI(
                api_key=openrouter_key,
                base_url=endpoint,
                default_headers={
                    "HTTP-Referer": "https://agentpay.arc.io",
                    "X-Title": "AgentPay Universal Agent",
                },
            )
            logger.info(
                "Universal AI Layer active: OpenRouter (model=%s, endpoint=%s)",
                model_name,
                endpoint,
            )
            return OpenAILlm(model=model_name, client=client)
        except Exception as e:
            logger.warning(
                "Failed to initialize OpenRouter model (%s), checking Gemini fallback",
                e,
            )

    # Fallback to Gemini if configured
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    try:
        from google.adk.models import Gemini
        from google.genai import types

        logger.info("Initializing Google Gemini model: %s", gemini_model)
        return Gemini(
            model=gemini_model,
            retry_options=types.HttpRetryOptions(attempts=3),
        )
    except Exception as e:
        logger.warning("Failed to initialize Gemini model: %s, creating safe fallback", e)
        from google.adk.models.base_llm import BaseLlm
        from google.adk.models.llm_response import LlmResponse
        from google.genai import types as genai_types

        class MockLlm(BaseLlm):
            model: str = "mock"

            async def generate_content_async(self, llm_request, stream=False):
                yield LlmResponse(
                    content=genai_types.Content(
                        role="model",
                        parts=[
                            genai_types.Part.from_text(
                                text="I am an AgentPay advisory agent running in simulation mode."
                            )
                        ],
                    )
                )

        return MockLlm()


model_instance = create_model()

root_agent = Agent(
    name="agent",
    model=model_instance,
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
