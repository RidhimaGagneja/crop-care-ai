"""
Weather service for CropCare AI.

Fetches current weather from Open-Meteo (no API key required) and
normalizes it directly into the shape the frontend already expects
(`WeatherNow` in src/types/index.ts):

    temperatureC, humidity, rainfallMm, windKph, condition, location, updatedAt

Kept as its own module (services/weather_service.py) so the AI model code
never has to know about it, and so this can be swapped for a different
provider (e.g. OpenWeatherMap) later without touching the route or the
frontend contract.

Failure behaviour (per product requirement: never fabricate data):
  - Live call succeeds            -> return fresh data, status "ok"
  - Live call fails, cache exists -> return last-known reading, status "cached"
  - Live call fails, no cache     -> status "unavailable", data is None
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# How long a cached reading stays eligible to be served as a fallback.
CACHE_TTL_SECONDS = 60 * 60  # 1 hour

# Open-Meteo's numeric weather_code -> short human-readable condition text.
# https://open-meteo.com/en/docs (WMO Weather interpretation codes)
WEATHER_CODE_TEXT: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
}


class WeatherServiceError(Exception):
    """Raised only for programmer errors; normal provider failures do not raise."""


# In-memory cache keyed by rounded (lat, lng). Good enough for a hackathon
# demo / single-process deployment. Swap for Redis if you run multiple
# workers or need it to survive restarts.
_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}


def _cache_key(lat: float, lng: float) -> Tuple[float, float]:
    # Round to ~1km precision so nearby requests share a cache entry.
    return (round(lat, 2), round(lng, 2))


def _condition_text(code: Optional[int]) -> str:
    if code is None:
        return "Unknown"
    return WEATHER_CODE_TEXT.get(code, "Unsettled weather")


def _location_label(lat: float, lng: float, resolved_name: Optional[str]) -> str:
    if resolved_name:
        return resolved_name
    return f"{lat:.2f}, {lng:.2f}"


def _to_weather_now(payload: Dict[str, Any], lat: float, lng: float) -> Dict[str, Any]:
    """Map Open-Meteo's raw JSON into the frontend's WeatherNow shape."""
    current = payload["current"]
    return {
        "temperatureC": current["temperature_2m"],
        "humidity": current["relative_humidity_2m"],
        "rainfallMm": current["precipitation"],
        "windKph": current["wind_speed_10m"],
        "condition": _condition_text(current.get("weather_code")),
        "location": _location_label(lat, lng, None),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


class WeatherService:
    """Public interface used by routes/weather.py (and, later, the risk engine)."""

    async def get_current_weather(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Always returns a dict of the shape:
            { "status": "ok" | "cached" | "unavailable", "data": {...} | None, "message": str | None }

        Never raises for normal failure conditions (timeouts, bad gateway,
        network errors) — the route layer can trust this not to blow up
        the request.
        """
        key = _cache_key(lat, lng)

        params = {
            "latitude": lat,
            "longitude": lng,
            # IMPORTANT: must be one comma-joined string, not a list.
            # httpx serializes a list value as repeated `current=` keys
            # (current=a&current=b&...), but Open-Meteo expects a single
            # comma-separated value — repeated keys make it silently use
            # only the last one and drop the rest of the fields.
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation",
                    "wind_speed_10m",
                    "weather_code",
                ]
            ),
            "timezone": "auto",
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(OPEN_METEO_URL, params=params)
                resp.raise_for_status()
                data = _to_weather_now(resp.json(), lat, lng)

            _cache[key] = (time.time(), data)
            return {"status": "ok", "data": data, "message": None}

        except Exception as exc:  # noqa: BLE001 - deliberately broad: this
            # method must never raise. Anything unexpected (a provider
            # schema change, an httpx internals change, etc.) should
            # degrade to cached/unavailable, not 500 the whole request.
            cached = _cache.get(key)
            if cached is not None:
                cached_at, cached_data = cached
                age_min = int((time.time() - cached_at) / 60)
                return {
                    "status": "cached",
                    "data": cached_data,
                    "message": f"Live weather unavailable, showing a reading from "
                    f"about {age_min} min ago.",
                }

            return {
                "status": "unavailable",
                "data": None,
                "message": f"Weather data is currently unavailable ({exc.__class__.__name__}).",
            }


weather_service = WeatherService()
