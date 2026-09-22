"""
Itinerary Planner Agent — The Orchestrator.

This is the main agent that coordinates all other agents via A2A protocol
and directly uses the Maps MCP server. It uses gemini-3.1-pro-preview for
heavy-duty orchestration and reasoning.

Architecture:
  - RemoteA2aAgent × 3 → Flight Agent (9001), Hotel Agent (9002), Weather Agent (9003)
  - MCPToolset × 1 → Maps MCP (8003) for route optimization and place details
"""

import os
from google.adk.agents import LlmAgent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from google.adk.tools.mcp_tool import MCPToolset, SseConnectionParams

# PRO_MODEL dictates the model used for complex planning and reasoning
PRO_MODEL = os.environ.get("PRO_MODEL", "gemini-3.1-flash-lite")
MAPS_MCP_PORT = int(os.environ.get("MAPS_MCP_PORT", 8003))
FLIGHT_AGENT_PORT = int(os.environ.get("FLIGHT_AGENT_PORT", 9001))
HOTEL_AGENT_PORT = int(os.environ.get("HOTEL_AGENT_PORT", 9002))
WEATHER_AGENT_PORT = int(os.environ.get("WEATHER_AGENT_PORT", 9003))


ITINERARY_INSTRUCTION = """You are the Itinerary Planner Agent, the master orchestrator of a multi-agent travel planning system.

## Your Role
You coordinate 3 specialized sub-agents (via A2A protocol) and 1 MCP server to create comprehensive travel itineraries:

1. **Flight Search Agent** — Find flights (origin, destination, dates, budget)
2. **Hotel Recommendation Agent** — Find hotels (city, dates, budget, style)
3. **Weather Information Agent** — Get weather forecasts for the destination
4. **Maps MCP** (direct tools) — Optimize routes and get place details

## Planning Process
When a user requests a travel plan, follow this process:

### Step 1: Gather Information
Parse the user's request for: origin, destination, departure date, return date, budget, travel style, number of travelers, and any special requests.

### Step 2: Parallel Information Gathering
Delegate to your sub-agents:
- Ask the Flight Search Agent for flight options (outbound + return)
- Ask the Hotel Recommendation Agent for accommodation options
- Ask the Weather Information Agent for destination weather forecast

### Step 3: Budget Optimization
Calculate the total estimated cost:
  total = best_flight_outbound + best_flight_return + (hotel_per_night × nights)

If total > user_budget:
  - Re-request flights with max_price = budget × 0.35
  - Re-request hotels with tighter budget = (budget - flight_cost) / nights
  This produces REAL multi-turn A2A calls visible in the activity log.

### Step 4: Route Planning
Use the Maps MCP tools to:
- Get details about key attractions at the destination
- Optimize daily activity routes

### Step 5: Build the Itinerary
Create a detailed day-by-day plan with:
- Daily activities with times, locations, and estimated costs
- Restaurant and dining suggestions
- Transportation between activities
- Weather-appropriate clothing suggestions

## Response Format
When you are generating or updating a travel plan, you MUST include the FULL travel plan as a JSON block wrapped in ```json ... ``` fences.
Make sure the `daily_itinerary` array contains a separate object for EVERY SINGLE DAY of the trip!
If the user is asking a conversational question or requesting a modification, provide a helpful natural language response BEFORE the JSON block.

Here is the exact JSON structure you must follow inside the markdown block:
```json
{
  "trip_summary": {
    "destination": "City, Country",
    "dates": {"departure": "YYYY-MM-DD", "return": "YYYY-MM-DD"},
    "duration_nights": 5,
    "travelers": 1,
    "travel_style": "moderate",
    "total_budget_usd": 2000,
    "estimated_total_usd": 1850
  },
  "flights": {
    "outbound": {
      "airline": "...", "flight_number": "...", "departure_time": "...",
      "arrival_time": "...", "price_usd": 0, "stops": 0
    },
    "return": {
      "airline": "...", "flight_number": "...", "departure_time": "...",
      "arrival_time": "...", "price_usd": 0, "stops": 0
    }
  },
  "hotel": {
    "name": "...", "star_rating": 4, "price_per_night_usd": 0,
    "total_cost_usd": 0, "amenities": [], "guest_rating": 0
  },
  "weather": {
    "summary": "...",
    "avg_temp_high_c": 0, "avg_temp_low_c": 0,
    "rainy_days": 0,
    "packing_tips": []
  },
  "daily_itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Arrival & Exploration",
      "weather_forecast": "Partly cloudy, 22°C",
      "activities": [
        {
          "time": "09:00",
          "activity": "...",
          "location": "...",
          "estimated_cost_usd": 0,
          "duration_hours": 2,
          "notes": "..."
        }
      ],
      "meals": [
        {"type": "lunch", "suggestion": "...", "estimated_cost_usd": 15}
      ],
      "daily_total_usd": 0
    }
    // ... YOU MUST ADD AN OBJECT LIKE THIS FOR EVERY SINGLE DAY OF THE TRIP
  ],
  "expense_breakdown": {
    "flights_usd": 0,
    "hotel_usd": 0,
    "activities_usd": 0,
    "meals_usd": 0,
    "transportation_usd": 0,
    "total_usd": 0,
    "remaining_budget_usd": 0
  }
}
```

## Important Rules
- You are a helpful conversational AI. Always respond naturally to questions.
- If the plan changes, ALWAYS include the full updated JSON block at the end of your message.
- If a sub-agent is unavailable, include a "service_unavailable" field for that section.
- Keep activity suggestions realistic and popular for the destination.
- Include free activities to help budget travelers.
- Estimate meal costs based on the destination's cost of living.
"""


from google.adk.a2a.utils.agent_to_a2a import AgentCardBuilder
from agents.flight_agent.agent import create_flight_agent
from agents.hotel_agent.agent import create_hotel_agent
from agents.weather_agent.agent import create_weather_agent

async def create_itinerary_agent() -> LlmAgent:
    """Create and return the Itinerary Planner Agent (orchestrator)."""

    flight_agent_card = await AgentCardBuilder(
        agent=create_flight_agent(),
        rpc_url=f"http://127.0.0.1:{FLIGHT_AGENT_PORT}"
    ).build()

    hotel_agent_card = await AgentCardBuilder(
        agent=create_hotel_agent(),
        rpc_url=f"http://127.0.0.1:{HOTEL_AGENT_PORT}"
    ).build()

    weather_agent_card = await AgentCardBuilder(
        agent=create_weather_agent(),
        rpc_url=f"http://127.0.0.1:{WEATHER_AGENT_PORT}"
    ).build()

    # Remote A2A agents for sub-agent communication
    flight_agent = RemoteA2aAgent(
        name="flight_search_agent",
        description="Searches for flights based on origin, destination, dates, and budget. Returns ranked flight options.",
        agent_card=flight_agent_card,
    )

    hotel_agent = RemoteA2aAgent(
        name="hotel_recommendation_agent",
        description="Searches for hotels based on city, dates, budget, and style. Returns ranked hotel recommendations.",
        agent_card=hotel_agent_card,
    )

    weather_agent = RemoteA2aAgent(
        name="weather_information_agent",
        description="Provides weather forecasts for travel destinations with packing tips and activity recommendations.",
        agent_card=weather_agent_card,
    )

    # Direct MCP connection to Maps server
    maps_mcp = MCPToolset(
        connection_params=SseConnectionParams(
            url=f"http://127.0.0.1:{MAPS_MCP_PORT}/sse",
        ),
    )

    agent = LlmAgent(
        name="itinerary_planner_agent",
        model=PRO_MODEL,
        instruction=ITINERARY_INSTRUCTION,
        description="Master travel planner that orchestrates flight, hotel, weather, and maps agents to create comprehensive itineraries with budget optimization.",
        sub_agents=[flight_agent, hotel_agent, weather_agent],
        tools=[maps_mcp],
    )

    return agent
