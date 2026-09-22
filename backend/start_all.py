import os
import sys
import asyncio
import uvicorn
from dotenv import load_dotenv
from pathlib import Path

# Load .env
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

# Add backend directory to path if not present so imports work cleanly
sys.path.append(str(Path(__file__).parent))

from utils.logging_config import setup_logging, logger

async def serve_uvicorn(app, port: int, name: str, host: str = "127.0.0.1"):
    """Helper to serve a Uvicorn app asynchronously without blocking the event loop."""
    logger.info(f"✅ Starting {name} on http://{host}:{port}")
    config = uvicorn.Config(app, host=host, port=port, log_level="warning")
    server = uvicorn.Server(config)
    await server.serve()

async def main():
    setup_logging()
    logger.info("=" * 60)
    logger.info("  Multi-Agent Travel Planner — Single-Process Mode")
    logger.info("=" * 60)

    # Check for API key
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key or api_key == "your-gemini-api-key-here":
        logger.error("❌ ERROR: GOOGLE_API_KEY is not set!")
        sys.exit(1)

    logger.info("🔄 Initializing apps (this may take a moment)...")

    # 1. Import all MCP Server apps
    from mcp_servers.travel_api_mcp import mcp as travel_mcp
    from mcp_servers.weather_mcp import mcp as weather_mcp
    from mcp_servers.maps_mcp import mcp as maps_mcp

    # Note: We do not use .http_app() directly here because it lacks the SSE routes.
    # Instead, we will use .run() in separate threads below.

    # 2. Import all Agent servers
    from agents.flight_agent.server import app as flight_agent_app
    from agents.hotel_agent.server import app as hotel_agent_app
    from agents.weather_agent.server import app as weather_agent_app

    # 3. Import Backend API
    from api.main import app as main_api_app

    # 4. Get ports from environment
    travel_port = int(os.environ.get("TRAVEL_MCP_PORT", 8001))
    weather_mcp_port = int(os.environ.get("WEATHER_MCP_PORT", 8002))
    maps_port = int(os.environ.get("MAPS_MCP_PORT", 8003))
    
    flight_port = int(os.environ.get("FLIGHT_AGENT_PORT", 9001))
    hotel_port = int(os.environ.get("HOTEL_AGENT_PORT", 9002))
    weather_agent_port = int(os.environ.get("WEATHER_AGENT_PORT", 9003))
    
    api_port = int(os.environ.get("PORT", os.environ.get("API_PORT", 8000)))

    logger.info("🚀 All apps initialized. Starting servers...")

    # 5. Run all in parallel
    # Note: FastMCP requires .run() for SSE endpoints to be properly initialized,
    # so we run them in separate threads to avoid blocking the event loop.
    tasks = [
        asyncio.to_thread(travel_mcp.run, transport="sse", host="127.0.0.1", port=travel_port),
        asyncio.to_thread(weather_mcp.run, transport="sse", host="127.0.0.1", port=weather_mcp_port),
        asyncio.to_thread(maps_mcp.run, transport="sse", host="127.0.0.1", port=maps_port),
        
        serve_uvicorn(flight_agent_app, flight_port, "Flight Agent"),
        serve_uvicorn(hotel_agent_app, hotel_port, "Hotel Agent"),
        serve_uvicorn(weather_agent_app, weather_agent_port, "Weather Agent"),
        
        # Main API must bind to 0.0.0.0 for Render
        serve_uvicorn(main_api_app, api_port, "Backend API", host="0.0.0.0"),
    ]

    await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Shutting down all services...")
