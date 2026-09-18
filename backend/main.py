from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from routes.analysis import router as analysis_router
from routes.auth import router as auth_router
from routes.weather import router as weather_router

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "explainability").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CropCare AI Backend",
    version="0.1.0",
    description="FastAPI backend for CropCare AI crop disease & pest detection (DEMO mode).",
)


class PermissiveCORSMiddleware(BaseHTTPMiddleware):
    """Origin-echoing CORS middleware safe for local/demo development.

    Starlette's default ``CORSMiddleware`` returns HTTP 400 ("Disallowed CORS
    origin") on preflight (OPTIONS) requests whose ``Origin`` isn't explicitly
    in ``allow_origins``. Browsers interpret that non-2xx preflight response
    as ``net::ERR_ABORTED`` and cancel the real request — which is exactly the
    failure the user reported for ``http://127.0.0.1:8000/``.

    To keep this demo backend frictionless against any plausible frontend
    origin/port/hostname we instead:

    * Echo the request's ``Origin`` header back as
      ``Access-Control-Allow-Origin`` (so any origin works).
    * Always add ``Access-Control-Allow-Credentials: true`` so
      ``credentials: "include"`` fetch calls from the browser don't abort.
    * Add ``Vary: Origin`` so caches don't mix responses for different
      callers (RFC 9110 compliant and shared-cache safe).
    * Respond to all ``OPTIONS`` preflights with HTTP 204 + the necessary
      ``Access-Control-Allow-*`` headers, short-circuiting to guarantee the
      browser never sees a 4xx preflight.
    * For non-preflight (real) requests, attach CORS headers to the normal
      response so simple CORS requests also don't abort.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        origin = request.headers.get("origin")

        if request.method == "OPTIONS":
            response = Response(status_code=204)
            self._attach_cors_headers(request, response, origin)
            response.headers["Content-Length"] = "0"
            return response

        response = await call_next(request)
        self._attach_cors_headers(request, response, origin)
        return response

    def _attach_cors_headers(self, request: Request, response: Response, origin: str | None) -> None:
        allow_origin = origin if origin else "*"
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        requested_headers = request.headers.get("access-control-request-headers")
        response.headers["Access-Control-Allow-Headers"] = (
            requested_headers if requested_headers else "*"
        )
        response.headers["Access-Control-Max-Age"] = "600"
        vary = response.headers.get("vary")
        vary_parts = [p.strip() for p in vary.split(",")] if vary else []
        if "Origin" not in vary_parts:
            vary_parts.append("Origin")
        response.headers["Vary"] = ", ".join(vary_parts)


app.add_middleware(PermissiveCORSMiddleware)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "CropCare AI Backend"}


app.include_router(analysis_router)
app.include_router(auth_router)
app.include_router(weather_router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def root():
    return {
        "name": "CropCare AI Backend",
        "version": "0.1.0",
        "endpoints": {
            "health": "GET /api/health",
            "analyze": "POST /api/analyze (multipart/form-data: crop, analysis_type, image)",
            "weather": "GET /api/weather (query: lat, lng)",
        },
    }
