"""
Hotel Agent A2A Server — Exposes the Hotel Recommendation Agent via A2A protocol.

Runs on port 9002 and serves an Agent Card at /.well-known/agent.json
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from google.adk.a2a.utils.agent_to_a2a import to_a2a

from agents.hotel_agent.agent import create_hotel_agent

HOTEL_AGENT_PORT = int(os.environ.get("HOTEL_AGENT_PORT", 9002))


def create_app():
    """Create the A2A Starlette app for the Hotel Agent."""
    agent = create_hotel_agent()
    app = to_a2a(agent, port=HOTEL_AGENT_PORT)
    return app


app = create_app()


if __name__ == "__main__":
    print(f"🏨 Hotel Agent A2A Server starting on port {HOTEL_AGENT_PORT}...")
    print(f"   Agent Card: http://127.0.0.1:{HOTEL_AGENT_PORT}/.well-known/agent.json")
    uvicorn.run(
        "agents.hotel_agent.server:app",
        host="127.0.0.1",
        port=HOTEL_AGENT_PORT,
        reload=False,
        log_level="info",
    )
