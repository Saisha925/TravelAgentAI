"""
Travel API MCP Server — FastMCP on port 8001.

Provides tools for searching flights and hotels from mock data.
This server loads local JSON datasets and exposes them as MCP tools
that ADK agents (Flight Agent, Hotel Agent) can call.
"""

import json
import os
from pathlib import Path
from fastmcp import FastMCP

# ─── Load mock data ──────────────────────────────────────────────────────

DATA_DIR = Path(__file__).parent / "mock_data"

with open(DATA_DIR / "flights.json", "r", encoding="utf-8") as f:
    FLIGHTS = json.load(f)

with open(DATA_DIR / "hotels.json", "r", encoding="utf-8") as f:
    HOTELS = json.load(f)


# ─── Create FastMCP server ──────────────────────────────────────────────

mcp = FastMCP("TravelAPIMCP")


@mcp.tool
def search_flights(
    origin: str = "",
    destination: str = "",
    date: str = "",
    max_price: float = 0,
    airline: str = "",
    max_stops: int = -1,
) -> str:
    """Search for available flights.

    Args:
        origin: Origin city or airport code (e.g., 'New York' or 'JFK').
                If empty, matches all origins.
        destination: Destination city or airport code (e.g., 'London' or 'LHR').
                     If empty, matches all destinations.
        date: Travel date in YYYY-MM-DD format. If empty, matches all dates.
        max_price: Maximum price in USD. If 0, no price filter applied.
        airline: Airline name filter (partial match). If empty, matches all airlines.
        max_stops: Maximum number of stops. If -1, no stop filter applied.

    Returns:
        JSON string with matching flights and count.
    """
    results = []

    for flight in FLIGHTS:
        # Origin filter (city name or airport code, case-insensitive)
        if origin:
            origin_lower = origin.lower()
            if (
                origin_lower not in flight["origin"].lower()
                and origin_lower not in flight["origin_code"].lower()
            ):
                continue

        # Destination filter
        if destination:
            dest_lower = destination.lower()
            if (
                dest_lower not in flight["destination"].lower()
                and dest_lower not in flight["destination_code"].lower()
            ):
                continue

        # Date filter
        # if date and date not in flight.get("available_dates", []):
        #     continue

        # Price filter
        if max_price > 0 and flight["price_usd"] > max_price:
            continue

        # Airline filter
        if airline and airline.lower() not in flight["airline"].lower():
            continue

        # Stops filter
        if max_stops >= 0 and flight["stops"] > max_stops:
            continue

        results.append(flight)

    return json.dumps(
        {
            "count": len(results),
            "flights": results,
            "filters_applied": {
                "origin": origin or "any",
                "destination": destination or "any",
                "date": date or "any",
                "max_price": max_price if max_price > 0 else "none",
                "airline": airline or "any",
                "max_stops": max_stops if max_stops >= 0 else "none",
            },
        },
        indent=2,
    )


@mcp.tool
def search_hotels(
    city: str = "",
    check_in_date: str = "",
    check_out_date: str = "",
    max_price_per_night: float = 0,
    min_star_rating: int = 0,
    style: str = "",
    min_guest_rating: float = 0,
) -> str:
    """Search for available hotels.

    Args:
        city: City name to search (e.g., 'London', 'Tokyo'). If empty, matches all.
        check_in_date: Check-in date (YYYY-MM-DD). For informational purposes only.
        check_out_date: Check-out date (YYYY-MM-DD). For informational purposes only.
        max_price_per_night: Maximum price per night in USD. If 0, no filter.
        min_star_rating: Minimum star rating (1-5). If 0, no filter.
        style: Travel style filter (e.g., 'luxury', 'budget', 'romantic'). If empty, no filter.
        min_guest_rating: Minimum guest rating (0-10). If 0, no filter.

    Returns:
        JSON string with matching hotels and count.
    """
    results = []

    for hotel in HOTELS:
        # City filter
        if city and city.lower() not in hotel["city"].lower():
            continue

        # Price filter
        if max_price_per_night > 0 and hotel["price_per_night_usd"] > max_price_per_night:
            continue

        # Star rating filter
        if min_star_rating > 0 and hotel["star_rating"] < min_star_rating:
            continue

        # Style filter
        if style and style.lower() not in [s.lower() for s in hotel.get("style", [])]:
            continue

        # Guest rating filter
        if min_guest_rating > 0 and hotel["guest_rating"] < min_guest_rating:
            continue

        results.append(hotel)

    return json.dumps(
        {
            "count": len(results),
            "hotels": results,
            "filters_applied": {
                "city": city or "any",
                "check_in_date": check_in_date or "any",
                "check_out_date": check_out_date or "any",
                "max_price_per_night": max_price_per_night if max_price_per_night > 0 else "none",
                "min_star_rating": min_star_rating if min_star_rating > 0 else "none",
                "style": style or "any",
                "min_guest_rating": min_guest_rating if min_guest_rating > 0 else "none",
            },
        },
        indent=2,
    )


# ─── Run the server ─────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("TRAVEL_MCP_PORT", 8001))
    print(f"🛫 Travel API MCP Server starting on port {port}...")
    print(f"   Loaded {len(FLIGHTS)} flights, {len(HOTELS)} hotels")
    mcp.run(transport="sse", host="127.0.0.1", port=port)
