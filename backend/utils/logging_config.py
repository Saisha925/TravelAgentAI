"""
Structured logging configuration for the Multi-Agent Travel Planner.

Captures every A2A request/response and MCP tool call with timestamps,
source/target identifiers, and payload summaries. Logs are stored per
session for the verification endpoint.
"""

import logging
import json
import time
from datetime import datetime, timezone
from collections import defaultdict
from typing import Any


# ─── Per-session log store ───────────────────────────────────────────────
# Keyed by session_id → list of log entries
_session_logs: dict[str, list[dict[str, Any]]] = defaultdict(list)


def get_session_logs(session_id: str) -> list[dict[str, Any]]:
    """Return all logged events for a given session."""
    return _session_logs.get(session_id, [])


def clear_session_logs(session_id: str) -> None:
    """Clear logs for a session."""
    _session_logs.pop(session_id, None)


def log_a2a_request(
    session_id: str,
    source_agent: str,
    target_agent: str,
    request_payload: Any,
) -> str:
    """Log an A2A request. Returns a request_id for correlation."""
    request_id = f"a2a-{int(time.time() * 1000)}"
    entry = {
        "id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "a2a_request",
        "source": source_agent,
        "target": target_agent,
        "payload": _safe_serialize(request_payload),
    }
    _session_logs[session_id].append(entry)
    logger.info(
        f"[A2A REQUEST] {source_agent} → {target_agent} | {request_id}"
    )
    return request_id


def log_a2a_response(
    session_id: str,
    request_id: str,
    source_agent: str,
    target_agent: str,
    response_payload: Any,
    duration_ms: float | None = None,
    error: str | None = None,
) -> None:
    """Log an A2A response, correlated with the original request."""
    entry = {
        "id": f"{request_id}-resp",
        "request_id": request_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "a2a_response",
        "source": target_agent,
        "target": source_agent,
        "payload": _safe_serialize(response_payload),
        "duration_ms": duration_ms,
        "error": error,
    }
    _session_logs[session_id].append(entry)
    status = "ERROR" if error else "OK"
    logger.info(
        f"[A2A RESPONSE] {target_agent} → {source_agent} | {request_id} | {status} | {duration_ms}ms"
    )


def log_mcp_call(
    session_id: str,
    agent_name: str,
    server_name: str,
    tool_name: str,
    arguments: Any,
    result: Any = None,
    duration_ms: float | None = None,
    error: str | None = None,
) -> None:
    """Log an MCP tool invocation."""
    entry = {
        "id": f"mcp-{int(time.time() * 1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "mcp_call",
        "agent": agent_name,
        "server": server_name,
        "tool": tool_name,
        "arguments": _safe_serialize(arguments),
        "result_summary": _truncate(str(result), 500) if result else None,
        "duration_ms": duration_ms,
        "error": error,
    }
    _session_logs[session_id].append(entry)
    status = "ERROR" if error else "OK"
    logger.info(
        f"[MCP CALL] {agent_name} → {server_name}.{tool_name} | {status} | {duration_ms}ms"
    )


def log_event(
    session_id: str,
    event_type: str,
    message: str,
    details: Any = None,
) -> None:
    """Log a generic system event."""
    entry = {
        "id": f"evt-{int(time.time() * 1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": event_type,
        "message": message,
        "details": _safe_serialize(details) if details else None,
    }
    _session_logs[session_id].append(entry)
    logger.info(f"[{event_type.upper()}] {message}")


# ─── Helpers ─────────────────────────────────────────────────────────────

def _safe_serialize(obj: Any) -> Any:
    """Safely serialize an object for logging."""
    try:
        if isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        if isinstance(obj, (dict, list)):
            json.dumps(obj)  # Validate it's serializable
            return obj
        return str(obj)
    except (TypeError, ValueError):
        return str(obj)


def _truncate(text: str, max_len: int = 500) -> str:
    """Truncate text for log readability."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "... [truncated]"


# ─── Standard Python logging setup ──────────────────────────────────────

def setup_logging(level: int = logging.INFO) -> None:
    """Configure structured logging for all components."""
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    # Root logger
    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers
    if not root.handlers:
        root.addHandler(console_handler)

    # Quiet down noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


# Module-level logger
logger = logging.getLogger("travel_planner")

# Auto-setup on import
setup_logging()
