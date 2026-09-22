"""
Weather Agent A2A Server — Exposes the Weather Information Agent via A2A protocol.

Runs on port 9003 and serves an Agent Card at /.well-known/agent.json
"""

import os
import sys
import uvicorn
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from google.adk.a2a.utils.agent_to_a2a import to_a2a

from agents.weather_agent.agent import create_weather_agent

WEATHER_AGENT_PORT = int(os.environ.get("WEATHER_AGENT_PORT", 9003))


def create_app():
    """Create the A2A Starlette app for the Weather Agent."""
    agent = create_weather_agent()
    app = to_a2a(agent, port=WEATHER_AGENT_PORT)
    return app


app = create_app()


if __name__ == "__main__":
    print(f"🌤️ Weather Agent A2A Server starting on port {WEATHER_AGENT_PORT}...")
    print(f"   Agent Card: http://127.0.0.1:{WEATHER_AGENT_PORT}/.well-known/agent.json")
    uvicorn.run(
        "agents.weather_agent.server:app",
        host="127.0.0.1",
        port=WEATHER_AGENT_PORT,
        reload=False,
        log_level="info",
    )
