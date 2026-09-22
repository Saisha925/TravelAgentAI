"""
Pydantic models for the Travel Planner API request/response payloads.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class TravelPlanRequest(BaseModel):
    """Request model for creating a travel plan."""
    origin: str = Field(..., description="Origin city (e.g., 'New York')")
    destination: str = Field(..., description="Destination city (e.g., 'London')")
    departure_date: str = Field(..., description="Departure date (YYYY-MM-DD)")
    return_date: str = Field(..., description="Return date (YYYY-MM-DD)")
    budget_usd: float = Field(..., ge=100, description="Total budget in USD")
    travelers: int = Field(default=1, ge=1, le=10, description="Number of travelers")
    travel_style: str = Field(
        default="moderate",
        description="Travel style: 'budget', 'moderate', or 'luxury'",
    )
    special_requests: Optional[str] = Field(
        default=None,
        description="Any special requests or preferences",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for continuing a conversation",
    )


class ChatMessage(BaseModel):
    """Request model for chat-based plan refinement."""
    message: str = Field(..., description="User message for plan refinement")
    session_id: str = Field(..., description="Session ID from a previous plan")


class TravelPlanResponse(BaseModel):
    """Response model for a travel plan."""
    session_id: str
    status: str = Field(default="completed")
    plan: dict = Field(default_factory=dict, description="The full travel plan JSON")
    raw_response: Optional[str] = Field(
        default=None,
        description="Raw text response from the agent (used if JSON parsing fails)",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Degradation warnings (e.g., unavailable services)",
    )


class ChatResponse(BaseModel):
    """Response model for chat-based refinement."""
    session_id: str
    status: str = Field(default="completed")
    response: str = Field(..., description="Agent's text response")
    updated_plan: Optional[dict] = Field(
        default=None,
        description="Updated plan JSON if the plan was modified",
    )


class SessionInfo(BaseModel):
    """Response model for session information."""
    session_id: str
    user_id: str
    created_at: Optional[str] = None
    message_count: int = 0
    has_plan: bool = False


class AgentCardInfo(BaseModel):
    """Response model for agent card information."""
    agent_name: str
    url: str
    status: str = Field(default="unknown")
    description: Optional[str] = None
    card_json: Optional[dict] = None


class HealthResponse(BaseModel):
    """Response model for health checks."""
    status: str = "ok"
    services: dict = Field(default_factory=dict)
