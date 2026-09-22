"""
Flight Agent A2A Server — Exposes the Flight Search Agent via A2A protocol.

Runs on port 9001 and serves an Agent Card at /.well-known/agent.json
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from google.adk.a2a.utils.agent_to_a2a import to_a2a

from agents.flight_agent.agent import create_flight_agent

FLIGHT_AGENT_PORT = int(os.environ.get("FLIGHT_AGENT_PORT", 9001))


def create_app():
    """Create the A2A Starlette app for the Flight Agent."""
    agent = create_flight_agent()
    app = to_a2a(agent, port=FLIGHT_AGENT_PORT)
    return app


app = create_app()


if __name__ == "__main__":
    print(f"✈️ Flight Agent A2A Server starting on port {FLIGHT_AGENT_PORT}...")
    print(f"   Agent Card: http://127.0.0.1:{FLIGHT_AGENT_PORT}/.well-known/agent.json")
    uvicorn.run(
        "agents.flight_agent.server:app",
        host="127.0.0.1",
        port=FLIGHT_AGENT_PORT,
        reload=False,
        log_level="info",
    )
