from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, status

from services.weather_service import weather_service

router = APIRouter(prefix="/api", tags=["weather"])


@router.get("/weather")
async def get_weather(
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
) -> Dict[str, Any]:
    """
    Current weather for a location.

    Auth: none required (matches /api/analyze's "anonymous demo allowed"
    posture). Always returns HTTP 200 with a `status` field
    ("ok" / "cached" / "unavailable") instead of raising 5xx on provider
    failure, so the frontend can render a graceful fallback state
    (mock/demo weather, or a "weather unavailable" banner) instead of a
    hard error screen.

    If lat/lng are omitted, defaults to a demo location (Nashik,
    Maharashtra) so the endpoint is still usable before the frontend's
    geolocation capture resolves.
    """
    if lat is None or lng is None:
        # Demo fallback location — Nashik, Maharashtra — matches the
        # placeholder used in src/data/mock.ts so behaviour is consistent
        # before real geolocation is available (denied, unsupported, or
        # still resolving).
        lat, lng = 19.9975, 73.7898

    if lat == 0 and lng == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"field": "lat/lng", "message": "Invalid coordinates (0, 0)."},
        )

    result = await weather_service.get_current_weather(lat=lat, lng=lng)
    return result
