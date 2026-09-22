"""
FastAPI Application — Main entry point for the Travel Planner backend.

Sets up:
  - FastAPI with lifespan (initializes the ADK runner on startup)
  - CORS middleware for frontend communication
  - All API routes
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment before anything else
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from google.adk.runners import InMemoryRunner

from agents.itinerary_agent.agent import create_itinerary_agent
from api.routes import router, init_runner_and_sessions
from utils.session_manager import SessionManager, APP_NAME
from utils.logging_config import setup_logging, logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initialize and tear down resources."""
    setup_logging()
    logger.info("🚀 Travel Planner API starting up...")

    # Create the orchestrator agent
    itinerary_agent = await create_itinerary_agent()
    logger.info("✅ Itinerary Planner Agent created")

    # Create the ADK runner
    runner = InMemoryRunner(
        agent=itinerary_agent,
    )
    runner.auto_create_session = True
    logger.info("✅ InMemoryRunner initialized")

    # Create session manager
    session_manager = SessionManager()
    logger.info("✅ SessionManager initialized")

    # Inject into routes
    init_runner_and_sessions(runner, session_manager)
    logger.info("✅ Routes initialized — API ready!")

    yield

    logger.info("👋 Travel Planner API shutting down...")


# ─── Create FastAPI app ─────────────────────────────────────────────────

app = FastAPI(
    title="Multi-Agent Travel Planner API",
    description=(
        "A multi-agent travel planning system built with Google ADK, "
        "FastMCP servers, and the A2A protocol. Orchestrates Flight, Hotel, "
        "and Weather agents to create comprehensive travel itineraries."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "Multi-Agent Travel Planner API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "POST /api/plan",
            "POST /api/chat",
            "GET /api/session/{id}",
            "GET /api/agent-cards",
            "GET /api/logs/{id}",
            "GET /api/health",
        ],
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", os.environ.get("API_PORT", 8000)))
    logger.info(f"Starting API server on port {port}...")
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
