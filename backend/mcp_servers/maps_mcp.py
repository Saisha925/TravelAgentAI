"""
Maps MCP Server — FastMCP on port 8003.

Provides tools for route optimization and place details using free APIs:
- Nominatim (OpenStreetMap) for geocoding and place details
- OSRM demo server for route optimization

No API keys required.
"""

import os
import json
import httpx
from fastmcp import FastMCP

# ─── Create FastMCP server ──────────────────────────────────────────────

mcp = FastMCP("MapsMCP")

NOMINATIM_HEADERS = {
    "User-Agent": "TravelPlannerMCP/1.0 (travel-planner-demo)",
}


async def _geocode(place: str) -> dict | None:
    """Geocode a place name to lat/lon using Nominatim."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place, "format": "json", "limit": 1}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=NOMINATIM_HEADERS)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0].get("display_name", place),
            }
    return None


@mcp.tool
async def get_place_details(place_name: str) -> str:
    """Get details about a place using Nominatim/OpenStreetMap geocoding.

    Makes a real HTTP call to Nominatim for place information.

    Args:
        place_name: Name of a place, landmark, or address
                    (e.g., 'Eiffel Tower, Paris', 'Times Square, New York').

    Returns:
        JSON string with place details including coordinates,
        full address, and type information.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": place_name,
        "format": "json",
        "limit": 5,
        "addressdetails": 1,
        "extratags": 1,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=NOMINATIM_HEADERS)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        return json.dumps({
            "error": f"No results found for '{place_name}'",
            "place_name": place_name,
        })

    places = []
    for r in results:
        address = r.get("address", {})
        places.append({
            "name": r.get("display_name", place_name),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "type": r.get("type", "unknown"),
            "category": r.get("class", "unknown"),
            "address": {
                "road": address.get("road", ""),
                "city": address.get("city", address.get("town", address.get("village", ""))),
                "state": address.get("state", ""),
                "country": address.get("country", ""),
                "postcode": address.get("postcode", ""),
            },
            "importance": r.get("importance", 0),
        })

    return json.dumps(
        {
            "query": place_name,
            "count": len(places),
            "places": places,
        },
        indent=2,
    )


@mcp.tool
async def optimize_route(places: str) -> str:
    """Optimize the visit order for a list of places using OSRM.

    Makes real HTTP calls to Nominatim for geocoding and OSRM for route optimization.

    Args:
        places: A semicolon-separated list of place names
                (e.g., 'Eiffel Tower, Paris;Louvre Museum;Notre-Dame Cathedral').
                Minimum 2 places required.

    Returns:
        JSON string with optimized route order, total distance,
        total duration, and leg-by-leg directions.
    """
    place_list = [p.strip() for p in places.split(";") if p.strip()]

    if len(place_list) < 2:
        return json.dumps({
            "error": "At least 2 places are required for route optimization",
            "places_provided": len(place_list),
        })

    # Step 1: Geocode all places
    geocoded = []
    failed = []
    for place in place_list:
        geo = await _geocode(place)
        if geo:
            geocoded.append({"name": place, **geo})
        else:
            failed.append(place)

    if len(geocoded) < 2:
        return json.dumps({
            "error": "Could not geocode enough places for routing",
            "geocoded": len(geocoded),
            "failed": failed,
        })

    # Step 2: Build OSRM trip request (optimized order)
    coords = ";".join(f"{g['lon']},{g['lat']}" for g in geocoded)
    osrm_url = f"http://router.project-osrm.org/trip/v1/driving/{coords}"
    params = {
        "overview": "simplified",
        "geometries": "geojson",
        "steps": "false",
        "roundtrip": "false",
        "source": "first",
        "destination": "last",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            resp = await client.get(osrm_url, params=params)
            resp.raise_for_status()
            osrm_data = resp.json()
        except Exception as e:
            # Fallback: return places in original order with straight-line distances
            return json.dumps({
                "route_optimized": False,
                "note": f"OSRM routing unavailable ({str(e)}), returning original order",
                "places": geocoded,
                "failed_geocoding": failed,
            })

    if osrm_data.get("code") != "Ok":
        return json.dumps({
            "error": "Route optimization failed",
            "osrm_code": osrm_data.get("code"),
            "places": geocoded,
        })

    # Step 3: Parse OSRM response
    trips = osrm_data.get("trips", [])
    if not trips:
        return json.dumps({
            "error": "No route found",
            "places": geocoded,
        })

    trip = trips[0]
    waypoints = osrm_data.get("waypoints", [])

    # Map waypoints back to place names (by waypoint_index in trip)
    optimized_order = []
    for wp in sorted(waypoints, key=lambda w: w.get("waypoint_index", 0)):
        idx = wp.get("waypoint_index", 0)
        original_idx = wp.get("trips_index", 0)
        if idx < len(geocoded):
            optimized_order.append(geocoded[idx])

    # If the optimized order parsing fails, fall back to original
    if not optimized_order:
        optimized_order = geocoded

    # Build legs info
    legs = trip.get("legs", [])
    leg_details = []
    for i, leg in enumerate(legs):
        from_place = optimized_order[i]["name"] if i < len(optimized_order) else "Unknown"
        to_place = optimized_order[i + 1]["name"] if i + 1 < len(optimized_order) else "Unknown"
        leg_details.append({
            "from": from_place,
            "to": to_place,
            "distance_km": round(leg.get("distance", 0) / 1000, 1),
            "duration_minutes": round(leg.get("duration", 0) / 60, 1),
        })

    total_distance_km = round(trip.get("distance", 0) / 1000, 1)
    total_duration_min = round(trip.get("duration", 0) / 60, 1)

    return json.dumps(
        {
            "route_optimized": True,
            "total_distance_km": total_distance_km,
            "total_duration_minutes": total_duration_min,
            "total_duration_formatted": f"{int(total_duration_min // 60)}h {int(total_duration_min % 60)}m",
            "optimized_order": [p["name"] for p in optimized_order],
            "legs": leg_details,
            "places": optimized_order,
            "failed_geocoding": failed,
        },
        indent=2,
    )


# ─── Run the server ─────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("MAPS_MCP_PORT", 8003))
    print(f"🗺️ Maps MCP Server starting on port {port}...")
    print("   Using Nominatim (free) + OSRM demo server (free)")
    mcp.run(transport="sse", host="127.0.0.1", port=port)
