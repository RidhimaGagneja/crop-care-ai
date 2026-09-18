from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile, status

from services.prediction_service import (
    SUPPORTED_CROPS,
    prediction_service,
)
from services import db
from data.demo_data import ALLOWED_IMAGE_TYPES


router = APIRouter(prefix="/api", tags=["analysis"])


def require_login(authorization: Optional[str]) -> str:
    """Every route that touches personal data calls this first. Raises 401
    if the person isn't logged in; otherwise returns their login token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Please log in to use CropCare AI."},
        )
    return authorization.split(" ", 1)[1]


# ============================================================
# CONFIG
# ============================================================

SUPPORTED_ANALYSIS_TYPES = {
    "disease",
    "pest",
    "both",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================
# ANALYZE IMAGE
# ============================================================

@router.post(
    "/analyze",
    response_model_exclude_none=True,
)
async def analyze_image(
    crop: str = Form(...),
    analysis_type: str = Form(...),
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:

    token = require_login(authorization)

    # --------------------------------------------------------
    # Validate image presence
    # --------------------------------------------------------

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": "Missing image file.",
            },
        )

    # --------------------------------------------------------
    # Validate content type
    # --------------------------------------------------------

    content_type = (image.content_type or "").lower().strip()

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": (
                    f"Invalid image type '{content_type}'. "
                    f"Supported types: {', '.join(ALLOWED_IMAGE_TYPES)}"
                ),
            },
        )

    # --------------------------------------------------------
    # Normalize crop
    # --------------------------------------------------------

    crop = crop.strip()

    if not crop:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "crop",
                "message": "Crop is required.",
            },
        )

    # Case-insensitive crop matching
    crop_lookup = {
        supported.lower(): supported
        for supported in SUPPORTED_CROPS
    }

    normalized_crop = crop_lookup.get(crop.lower())

    if normalized_crop is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "crop",
                "message": (
                    f"Unsupported crop '{crop}'. "
                    f"Supported crops: {', '.join(sorted(SUPPORTED_CROPS))}"
                ),
            },
        )

    # --------------------------------------------------------
    # Normalize analysis type
    # --------------------------------------------------------

    analysis_type = analysis_type.strip().lower()

    if analysis_type not in SUPPORTED_ANALYSIS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "analysis_type",
                "message": (
                    f"Invalid analysis type '{analysis_type}'. "
                    f"Supported: "
                    f"{', '.join(sorted(SUPPORTED_ANALYSIS_TYPES))}"
                ),
            },
        )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": "Uploaded image file is empty.",
            },
        )

    # --------------------------------------------------------
    # Validate image size
    # --------------------------------------------------------

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "field": "image",
                "message": "Image size must be 10 MB or smaller.",
            },
        )

    # --------------------------------------------------------
    # Run AI prediction
    # --------------------------------------------------------

    try:
        result = prediction_service.predict(
            image_bytes=image_bytes,
            crop=normalized_crop,
            analysis_type=analysis_type,
        )

    except Exception as exc:
        # Log actual error on backend
        print("Analysis service error:", repr(exc))

        # Never expose internal traceback to frontend
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "field": "analysis",
                "message": "Unable to analyze the image right now.",
            },
        ) from exc

    # --------------------------------------------------------
    # Save this result into the database (the "memory" box).
    # If saving fails for any reason, we still return the result to the
    # farmer - a database hiccup should never break the analysis itself.
    # --------------------------------------------------------

    try:
        saved_row = db.save_analysis(
            crop_name=normalized_crop,
            analysis_type=analysis_type,
            image_filename=image.filename,
            result=result,
            access_token=token,
        )
        if saved_row and "id" in saved_row:
            result["id"] = saved_row["id"]
            result["created_at"] = saved_row.get("created_at")
    except Exception as e:
        print(f"[DB SAVE ERROR] {type(e).__name__}: {e}")

    # --------------------------------------------------------
    # Return standardized AI response
    # --------------------------------------------------------

    return result


@router.get("/history")
async def get_history(limit: int = 20, authorization: Optional[str] = Header(None)) -> List[Dict[str, Any]]:
    """Return this logged-in farmer's own past analyses, newest first."""
    token = require_login(authorization)
    try:
        return db.get_history(limit=limit, access_token=token)
    except Exception as e:
        print(f"[HISTORY ERROR] {type(e).__name__}: {e}")
        return []


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Return one specific saved analysis by its id — only if it belongs
    to the logged-in caller."""
    token = require_login(authorization)
    row = db.get_analysis_by_id(analysis_id, access_token=token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": f"No analysis found with id '{analysis_id}'"},
        )
    return row