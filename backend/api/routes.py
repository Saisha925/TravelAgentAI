"""
API Routes for the Travel Planner backend.

Endpoints:
  POST /api/plan          — Create a new travel plan
  POST /api/chat          — Chat to refine an existing plan
  GET  /api/session/{id}  — Get session info
  GET  /api/agent-cards   — Fetch all A2A agent cards
  GET  /api/logs/{id}     — Get A2A/MCP logs for a session
  GET  /api/health        — Health check for all services
"""

import json
import time
import httpx
from fastapi import APIRouter, HTTPException

from google.adk.runners import InMemoryRunner
from google.genai import types as genai_types

from api.models import (
    TravelPlanRequest,
    TravelPlanResponse,
    ChatMessage,
    ChatResponse,
    SessionInfo,
    AgentCardInfo,
    HealthResponse,
)
from agents.itinerary_agent.agent import create_itinerary_agent
from utils.session_manager import SessionManager, APP_NAME
from utils.logging_config import (
    get_session_logs,
    log_event,
    logger,
)

# ─── Router ─────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api")

# ─── Shared state (initialized in main.py lifespan) ─────────────────────

_runner: InMemoryRunner | None = None
_session_manager: SessionManager | None = None


def init_runner_and_sessions(runner: InMemoryRunner, session_manager: SessionManager):
    """Called from main.py lifespan to inject shared state."""
    global _runner, _session_manager
    _runner = runner
    _session_manager = session_manager


# ─── Agent card URLs ─────────────────────────────────────────────────────

import os

AGENT_CARD_URLS = {
    "flight_search_agent": f"http://127.0.0.1:{os.environ.get('FLIGHT_AGENT_PORT', 9001)}/.well-known/agent.json",
    "hotel_recommendation_agent": f"http://127.0.0.1:{os.environ.get('HOTEL_AGENT_PORT', 9002)}/.well-known/agent.json",
    "weather_information_agent": f"http://127.0.0.1:{os.environ.get('WEATHER_AGENT_PORT', 9003)}/.well-known/agent.json",
}


# ─── POST /api/plan ──────────────────────────────────────────────────────

@router.post("/plan", response_model=TravelPlanResponse)
async def create_plan(request: TravelPlanRequest):
    """Create a new travel plan using the multi-agent system."""
    if not _runner or not _session_manager:
        raise HTTPException(status_code=503, detail="Agent system not initialized")

    # Create or reuse session
    if request.session_id:
        session_id = request.session_id
        session = await _session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        user_id = _session_manager.get_session_metadata(session_id)["user_id"]
    else:
        session_id = await _session_manager.create_session()
        user_id = _session_manager.get_session_metadata(session_id)["user_id"]

    log_event(session_id, "plan_request", f"Plan requested: {request.origin} → {request.destination}")

    # Build the user message
    user_message = _build_plan_prompt(request)
    _session_manager.increment_message_count(session_id)

    # Run the orchestrator agent
    start_time = time.time()
    warnings = []

    try:
        full_response = ""
        async for event in _runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=user_message)],
            ),
        ):
            # Collect text from agent events
            if hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts") and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            full_response += part.text

        duration_ms = (time.time() - start_time) * 1000
        log_event(
            session_id,
            "plan_completed",
            f"Plan generated in {duration_ms:.0f}ms",
        )

        # Try to parse JSON from the response
        plan = _extract_plan_json(full_response)

        if plan:
            _session_manager.store_plan(session_id, plan)
            return TravelPlanResponse(
                session_id=session_id,
                status="completed",
                plan=plan,
                warnings=warnings,
            )
        else:
            # Return raw response if JSON parsing fails
            return TravelPlanResponse(
                session_id=session_id,
                status="completed",
                plan={},
                raw_response=full_response,
                warnings=["Could not parse structured plan from agent response"],
            )

    except Exception as e:
        logger.error(f"Plan generation failed: {e}", exc_info=True)
        log_event(session_id, "plan_error", str(e))
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")


# ─── POST /api/chat ──────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat_refine(request: ChatMessage):
    """Chat to refine an existing travel plan."""
    if not _runner or not _session_manager:
        raise HTTPException(status_code=503, detail="Agent system not initialized")

    session = await _session_manager.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    meta = _session_manager.get_session_metadata(request.session_id)
    user_id = meta["user_id"]
    _session_manager.increment_message_count(request.session_id)

    log_event(request.session_id, "chat_message", f"User: {request.message[:100]}")

    try:
        full_response = ""
        async for event in _runner.run_async(
            user_id=user_id,
            session_id=request.session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=request.message)],
            ),
        ):
            if hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts") and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            full_response += part.text

        # Try to extract updated plan
        updated_plan = _extract_plan_json(full_response)
        if updated_plan:
            _session_manager.store_plan(request.session_id, updated_plan)

        # Strip the JSON block from the chat response so the user only sees the natural language
        import re
        display_response = re.sub(r"```(?:json)?\s*\n.*?\n\s*```", "", full_response, flags=re.DOTALL).strip()
        
        # If there's no text left after stripping (e.g. only returned JSON), fallback to a generic message
        if not display_response:
            display_response = "I have updated the travel plan."

        return ChatResponse(
            session_id=request.session_id,
            status="completed",
            response=display_response,
            updated_plan=updated_plan,
        )

    except Exception as e:
        logger.error(f"Chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# ─── GET /api/session/{session_id} ───────────────────────────────────────

@router.get("/session/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session information."""
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Not initialized")

    meta = _session_manager.get_session_metadata(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    return SessionInfo(
        session_id=session_id,
        user_id=meta["user_id"],
        created_at=meta.get("created_at"),
        message_count=meta.get("message_count", 0),
        has_plan=meta.get("has_plan", False),
    )


# ─── GET /api/agent-cards ────────────────────────────────────────────────

@router.get("/agent-cards", response_model=list[AgentCardInfo])
async def get_agent_cards():
    """Fetch Agent Cards from all A2A sub-agents."""
    cards = []
    async with httpx.AsyncClient(timeout=5.0) as client:
        for agent_name, url in AGENT_CARD_URLS.items():
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                card_data = resp.json()
                cards.append(AgentCardInfo(
                    agent_name=agent_name,
                    url=url,
                    status="online",
                    description=card_data.get("description", ""),
                    card_json=card_data,
                ))
            except Exception as e:
                cards.append(AgentCardInfo(
                    agent_name=agent_name,
                    url=url,
                    status="offline",
                    description=f"Error: {str(e)}",
                ))
    return cards


# ─── GET /api/logs/{session_id} ──────────────────────────────────────────

@router.get("/logs/{session_id}")
async def get_logs(session_id: str):
    """Get A2A/MCP activity logs for a session."""
    logs = get_session_logs(session_id)
    return {"session_id": session_id, "count": len(logs), "logs": logs}


# ─── GET /api/health ─────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check health of all services."""
    services = {}

    # Check MCP servers
    mcp_ports = {
        "travel_api_mcp": int(os.environ.get("TRAVEL_MCP_PORT", 8001)),
        "weather_mcp": int(os.environ.get("WEATHER_MCP_PORT", 8002)),
        "maps_mcp": int(os.environ.get("MAPS_MCP_PORT", 8003)),
    }

    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, port in mcp_ports.items():
            try:
                resp = await client.get(f"http://127.0.0.1:{port}/sse")
                services[name] = "online"
            except Exception:
                services[name] = "offline"

        # Check A2A agents
        for agent_name, url in AGENT_CARD_URLS.items():
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                services[agent_name] = "online"
            except Exception:
                services[agent_name] = "offline"

    overall = "ok" if all(v == "online" for v in services.values()) else "degraded"
    return HealthResponse(status=overall, services=services)


# ─── Helpers ─────────────────────────────────────────────────────────────

def _build_plan_prompt(req: TravelPlanRequest) -> str:
    """Build a detailed prompt for the orchestrator agent."""
    prompt = f"""Please create a comprehensive travel plan with the following details:

- **Origin:** {req.origin}
- **Destination:** {req.destination}
- **Departure Date:** {req.departure_date}
- **Return Date:** {req.return_date}
- **Total Budget:** ${req.budget_usd:,.0f} USD
- **Number of Travelers:** {req.travelers}
- **Travel Style:** {req.travel_style}
"""
    if req.special_requests:
        prompt += f"- **Special Requests:** {req.special_requests}\n"

    prompt += """
Please search for flights, hotels, and weather data, then create a detailed day-by-day itinerary.
Optimize the route for daily activities and stay within the budget.
Respond with ONLY a valid JSON object following EXACTLY this structure (no markdown, just JSON):
{
  "trip_summary": {
    "destination": "...",
    "dates": { "departure": "YYYY-MM-DD", "return": "YYYY-MM-DD" },
    "duration_nights": 0,
    "travelers": 0,
    "travel_style": "...",
    "total_budget_usd": 0,
    "estimated_total_usd": 0
  },
  "flights": {
    "outbound": { "airline": "...", "flight_number": "...", "departure_time": "...", "arrival_time": "...", "price_usd": 0, "stops": 0, "duration_hours": 0 },
    "return": { "airline": "...", "flight_number": "...", "departure_time": "...", "arrival_time": "...", "price_usd": 0, "stops": 0, "duration_hours": 0 }
  },
  "hotel": {
    "name": "...", "star_rating": 0, "price_per_night_usd": 0, "total_cost_usd": 0, "amenities": ["..."], "guest_rating": 0
  },
  "weather": {
    "summary": "...", "avg_temp_high_c": 0, "avg_temp_low_c": 0, "rainy_days": 0, "packing_tips": ["..."]
  },
  "daily_itinerary": [
    {
      "day": 1, "date": "YYYY-MM-DD", "theme": "...", "weather_forecast": "...",
      "activities": [ { "time": "...", "activity": "...", "location": "...", "estimated_cost_usd": 0, "duration_hours": 0, "notes": "..." } ],
      "meals": [ { "type": "...", "suggestion": "...", "estimated_cost_usd": 0 } ],
      "daily_total_usd": 0
    }
    // ... YOU MUST ADD AN OBJECT LIKE THIS FOR EVERY SINGLE DAY OF THE TRIP
  ],
  "expense_breakdown": {
    "flights_usd": 0, "hotel_usd": 0, "activities_usd": 0, "meals_usd": 0, "transportation_usd": 0, "total_usd": 0, "remaining_budget_usd": 0
  }
}
"""
    return prompt


def _extract_plan_json(text: str) -> dict | None:
    """Try to extract a JSON object from the agent's response text."""
    if not text:
        return None

    # Try direct JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON block in markdown code fences
    import re
    json_pattern = re.compile(r"```(?:json)?\s*\n(.*?)\n\s*```", re.DOTALL)
    match = json_pattern.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find a JSON object between { and }
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        try:
            return json.loads(text[brace_start : brace_end + 1])
        except json.JSONDecodeError:
            pass

    return None
