"""
Flight Search Agent — ADK LlmAgent with MCPToolset.

Connects to the Travel API MCP Server to search for flights.
This agent is specialized in finding the best flight options based on
user criteria (destination, dates, budget, preferences).
"""

import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, SseConnectionParams

# The default model for fast agents
FLASH_MODEL = os.environ.get("FLASH_MODEL", "gemini-3.1-flash-lite")
TRAVEL_MCP_PORT = int(os.environ.get("TRAVEL_MCP_PORT", 8001))

FLIGHT_AGENT_INSTRUCTION = """You are the Flight Search Agent, a specialized travel assistant focused on finding the best flight options.

## Your Capabilities
- Search for flights using the search_flights tool
- Compare flight options by price, duration, stops, and airline
- Recommend the best flights based on user preferences and budget

## How to Respond
When given a flight search request:
1. Use the search_flights tool with appropriate filters (origin, destination, date, max_price, etc.)
2. Analyze the results and rank them by relevance to the user's needs
3. Present the top 3-5 options clearly with:
   - Airline and flight number
   - Departure/arrival times and duration
   - Number of stops
   - Price in USD
4. If the budget is tight, prioritize cheaper options and suggest alternatives
5. If no flights match, relax filters and explain what's available

## Budget Negotiation
If asked to find flights within a specific budget:
- First search with the exact budget as max_price
- If few/no results, search with a slightly higher budget and note which flights exceed the target
- Always be transparent about prices vs. the user's budget

## Response Format
Always respond with structured, clear information. Include a brief summary recommendation at the end.
"""


def create_flight_agent() -> LlmAgent:
    """Create and return the Flight Search Agent with MCP tools."""
    mcp_toolset = MCPToolset(
        connection_params=SseConnectionParams(
            url=f"http://127.0.0.1:{TRAVEL_MCP_PORT}/sse",
        ),
    )

    agent = LlmAgent(
        name="flight_search_agent",
        model=FLASH_MODEL,
        instruction=FLIGHT_AGENT_INSTRUCTION,
        description="Searches for flights based on origin, destination, dates, budget, and preferences. Returns ranked flight options with pricing.",
        tools=[mcp_toolset],
    )

    return agent
