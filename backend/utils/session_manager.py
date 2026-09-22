"""
Session manager for the Travel Planner.

Wraps ADK's InMemorySessionService to provide
session creation, retrieval, and state management.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from google.adk.sessions import InMemorySessionService


APP_NAME = "travel_planner"


class SessionManager:
    """Manages user sessions for the Travel Planner API."""

    def __init__(self):
        self._service = InMemorySessionService()
        self._metadata: dict[str, dict[str, Any]] = {}

    @property
    def service(self) -> InMemorySessionService:
        """Return the underlying ADK session service."""
        return self._service

    async def create_session(self, user_id: str | None = None) -> str:
        """Create a new session and return its ID."""
        if not user_id:
            user_id = f"user_{uuid.uuid4().hex[:8]}"

        session = await self._service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
        )

        self._metadata[session.id] = {
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0,
            "has_plan": False,
            "last_plan": None,
        }

        return session.id

    async def get_session(self, session_id: str, user_id: str | None = None):
        """Get an existing session by ID."""
        meta = self._metadata.get(session_id)
        if not meta:
            return None

        uid = user_id or meta["user_id"]
        session = await self._service.get_session(
            app_name=APP_NAME,
            user_id=uid,
            session_id=session_id,
        )
        return session

    def get_session_metadata(self, session_id: str) -> dict | None:
        """Get session metadata (creation time, message count, etc.)."""
        return self._metadata.get(session_id)

    def update_metadata(self, session_id: str, **kwargs) -> None:
        """Update session metadata fields."""
        if session_id in self._metadata:
            self._metadata[session_id].update(kwargs)

    def increment_message_count(self, session_id: str) -> None:
        """Increment the message count for a session."""
        if session_id in self._metadata:
            self._metadata[session_id]["message_count"] += 1

    def store_plan(self, session_id: str, plan: dict) -> None:
        """Store a travel plan in the session metadata."""
        if session_id in self._metadata:
            self._metadata[session_id]["has_plan"] = True
            self._metadata[session_id]["last_plan"] = plan

    def get_plan(self, session_id: str) -> dict | None:
        """Retrieve the last stored plan for a session."""
        meta = self._metadata.get(session_id)
        if meta:
            return meta.get("last_plan")
        return None

    def list_sessions(self) -> list[dict]:
        """List all active sessions with their metadata."""
        return [
            {"session_id": sid, **meta}
            for sid, meta in self._metadata.items()
        ]
