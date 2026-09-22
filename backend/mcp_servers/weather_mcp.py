"""
Weather MCP Server — FastMCP on port 8002.

Provides weather forecast data using the free Open-Meteo API.
Uses Nominatim (OpenStreetMap) for geocoding city names to coordinates.
No API keys required — both services are free and open.
"""

import os
import json
import httpx
from fastmcp import FastMCP

# ─── Create FastMCP server ──────────────────────────────────────────────

mcp = FastMCP("WeatherMCP")

# Common headers for Nominatim (requires User-Agent)
NOMINATIM_HEADERS = {
    "User-Agent": "TravelPlannerMCP/1.0 (travel-planner-demo)",
}


async def _geocode_city(city: str) -> dict | None:
    """Geocode a city name to lat/lon using Nominatim."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": city,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=params, headers=NOMINATIM_HEADERS)
        response.raise_for_status()
        results = response.json()
        if results:
            return {
                "lat": float(results[0]["lat"]),
                "lon": float(results[0]["lon"]),
                "display_name": results[0].get("display_name", city),
            }
    return None


@mcp.tool
async def get_weather_forecast(
    city: str,
    days: int = 7,
) -> str:
    """Get weather forecast for a city using the Open-Meteo API.

    Makes real HTTP calls to Nominatim for geocoding and Open-Meteo for weather data.

    Args:
        city: City name (e.g., 'London', 'Tokyo', 'Paris').
        days: Number of forecast days (1-16, default 7).

    Returns:
        JSON string with daily weather forecast including temperature,
        precipitation, wind speed, and weather conditions.
    """
    days = max(1, min(16, days))

    # Step 1: Geocode the city
    geo = await _geocode_city(city)
    if not geo:
        return json.dumps({
            "error": f"Could not find location for '{city}'",
            "city": city,
        })

    # Step 2: Fetch weather from Open-Meteo
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": geo["lat"],
        "longitude": geo["lon"],
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "precipitation_sum",
            "precipitation_probability_max",
            "weathercode",
            "windspeed_10m_max",
            "sunrise",
            "sunset",
            "uv_index_max",
        ]),
        "timezone": "auto",
        "forecast_days": days,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    # Step 3: Format the response
    daily = data.get("daily", {})
    dates = daily.get("time", [])

    # WMO weather code descriptions
    weather_codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy",
        3: "Overcast", 45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        66: "Light freezing rain", 67: "Heavy freezing rain",
        71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall",
        77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers",
        82: "Violent rain showers", 85: "Slight snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }

    forecast_days = []
    for i, date in enumerate(dates):
        code = daily.get("weathercode", [0])[i] if i < len(daily.get("weathercode", [])) else 0
        forecast_days.append({
            "date": date,
            "temp_max_c": daily.get("temperature_2m_max", [0])[i],
            "temp_min_c": daily.get("temperature_2m_min", [0])[i],
            "temp_max_f": round(daily.get("temperature_2m_max", [0])[i] * 9 / 5 + 32, 1),
            "temp_min_f": round(daily.get("temperature_2m_min", [0])[i] * 9 / 5 + 32, 1),
            "feels_like_max_c": daily.get("apparent_temperature_max", [0])[i],
            "precipitation_mm": daily.get("precipitation_sum", [0])[i],
            "precipitation_probability_pct": daily.get("precipitation_probability_max", [0])[i],
            "weather_code": code,
            "weather_description": weather_codes.get(code, "Unknown"),
            "wind_speed_max_kmh": daily.get("windspeed_10m_max", [0])[i],
            "sunrise": daily.get("sunrise", [""])[i],
            "sunset": daily.get("sunset", [""])[i],
            "uv_index_max": daily.get("uv_index_max", [0])[i],
        })

    # Packing advice based on conditions
    avg_temp = sum(d["temp_max_c"] for d in forecast_days) / len(forecast_days) if forecast_days else 20
    rainy_days = sum(1 for d in forecast_days if d["precipitation_probability_pct"] > 50)

    packing_tips = []
    if avg_temp < 10:
        packing_tips.append("Pack warm layers, coat, and gloves")
    elif avg_temp < 20:
        packing_tips.append("Bring a light jacket and layers")
    else:
        packing_tips.append("Light summer clothing recommended")

    if rainy_days > 2:
        packing_tips.append("Bring an umbrella and waterproof jacket")
    if any(d["uv_index_max"] > 6 for d in forecast_days):
        packing_tips.append("Pack sunscreen (UV index will be high)")

    return json.dumps(
        {
            "city": city,
            "location": geo["display_name"],
            "coordinates": {"lat": geo["lat"], "lon": geo["lon"]},
            "timezone": data.get("timezone", "unknown"),
            "forecast_days": forecast_days,
            "summary": {
                "avg_high_c": round(sum(d["temp_max_c"] for d in forecast_days) / len(forecast_days), 1),
                "avg_low_c": round(sum(d["temp_min_c"] for d in forecast_days) / len(forecast_days), 1),
                "rainy_days": rainy_days,
                "total_precipitation_mm": round(sum(d["precipitation_mm"] for d in forecast_days), 1),
            },
            "packing_tips": packing_tips,
        },
        indent=2,
    )


# ─── Run the server ─────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("WEATHER_MCP_PORT", 8002))
    print(f"🌤️ Weather MCP Server starting on port {port}...")
    print("   Using Open-Meteo (free, no API key) + Nominatim geocoding")
    mcp.run(transport="sse", host="127.0.0.1", port=port)
