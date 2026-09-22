"""
Weather Information Agent — ADK LlmAgent with MCPToolset.

Connects to the Weather MCP Server to provide weather forecasts.
This agent specializes in providing weather information and
packing/activity recommendations based on conditions.
"""

import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, SseConnectionParams

# The default model for fast agents
FLASH_MODEL = os.environ.get("FLASH_MODEL", "gemini-3.1-flash-lite")
WEATHER_MCP_PORT = int(os.environ.get("WEATHER_MCP_PORT", 8002))

WEATHER_AGENT_INSTRUCTION = """You are the Weather Information Agent, a specialized assistant focused on weather conditions for travel planning.

## Your Capabilities
- Get weather forecasts using the get_weather_forecast tool (real data from Open-Meteo API)
- Provide packing recommendations based on weather conditions
- Advise on best activities for the weather
- Warn about severe weather conditions

## How to Respond
When given a weather request:
1. Use the get_weather_forecast tool with the city name and trip duration
2. Analyze the forecast data and provide:
   - Day-by-day weather summary (temperature, conditions, precipitation)
   - Overall weather assessment for the trip
   - Packing recommendations
   - Activity suggestions based on weather
   - Any weather warnings or advisories
3. Convert temperatures if asked (the data includes both Celsius and Fahrenheit)

## Response Format
Provide a clear, traveler-friendly weather briefing. Focus on what matters for trip planning:
- Will it rain? Should they pack an umbrella?
- Temperature range — what to wear?
- Any extreme weather to be aware of?
- Best days for outdoor activities

Keep it practical and actionable.
"""


def create_weather_agent() -> LlmAgent:
    """Create and return the Weather Information Agent with MCP tools."""
    mcp_toolset = MCPToolset(
        connection_params=SseConnectionParams(
            url=f"http://127.0.0.1:{WEATHER_MCP_PORT}/sse",
        ),
    )

    agent = LlmAgent(
        name="weather_information_agent",
        model=FLASH_MODEL,
        instruction=WEATHER_AGENT_INSTRUCTION,
        description="Provides weather forecasts for travel destinations with packing tips and activity recommendations. Uses real-time data from Open-Meteo.",
        tools=[mcp_toolset],
    )

    return agent
