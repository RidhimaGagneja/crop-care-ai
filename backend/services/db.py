"""
Connection to our Supabase database.

Think of this file as the phone line between the backend and the database.
Every other file that needs to save or read data calls functions from here
instead of talking to Supabase directly.
"""
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from supabase import create_client, Client

# Load the secret notebook (.env) that holds our database address + key.
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def sign_up(email: str, password: str, name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Create a new account. Returns user info + a login token, or None on failure.

    Note: if Supabase's "Confirm email" setting is turned on, sign-up
    succeeds but Supabase does NOT hand back a usable session/token until
    the person clicks a confirmation link. We treat that as a failure here
    (returning None) rather than silently returning a broken/empty token
    that would cause confusing errors everywhere else.
    """
    if supabase is None:
        return None
    try:
        payload: Dict[str, Any] = {"email": email, "password": password}
        if name:
            payload["options"] = {"data": {"name": name}}
        res = supabase.auth.sign_up(payload)
    except Exception as e:
        print(f"[SIGNUP ERROR] {type(e).__name__}: {e}")
        return None
    if res.user is None or res.session is None:
        print("[SIGNUP ERROR] No session returned — email confirmation is likely still required in Supabase.")
        return None
    return {
        "user_id": res.user.id,
        "email": res.user.email,
        "name": (res.user.user_metadata or {}).get("name") if res.user.user_metadata else None,
        "access_token": res.session.access_token,
    }


def sign_in(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Log an existing user in. Returns user info + a login token, or None on failure."""
    if supabase is None:
        return None
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as e:
        print(f"[LOGIN ERROR] {type(e).__name__}: {e}")
        return None
    if res.user is None or res.session is None:
        return None
    return {
        "user_id": res.user.id,
        "email": res.user.email,
        "name": (res.user.user_metadata or {}).get("name") if res.user.user_metadata else None,
        "access_token": res.session.access_token,
    }


def _use_token(access_token: Optional[str]) -> None:
    """Temporarily make requests act as this logged-in user (or as anonymous
    if no token), so the database's security rules know who is asking."""
    if supabase is None:
        return
    if access_token:
        supabase.postgrest.auth(access_token)
    else:
        supabase.postgrest.auth(SUPABASE_KEY)


def save_analysis(
    crop_name: str,
    analysis_type: str,
    image_filename: Optional[str],
    result: Dict[str, Any],
    access_token: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Save one analysis result into the `analyses` table.

    Returns the saved row (with its new id) or None if the database isn't
    connected (so the app can still work even if the database is down).
    """
    if supabase is None:
        return None

    row = {
        "crop_name": crop_name,
        "analysis_type": analysis_type,
        "condition": result.get("condition"),
        "prediction_type": result.get("type"),
        "confidence": result.get("confidence"),
        "severity": result.get("severity"),
        "risk": result.get("risk"),
        "image_filename": image_filename,
        "result": result,  # the whole answer, saved as one neat package
    }
    _use_token(access_token)
    try:
        response = supabase.table("analyses").insert(row).execute()
    finally:
        _use_token(None)  # always switch back to anonymous afterwards
    if response.data:
        return response.data[0]
    return None


def get_history(limit: int = 20, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get the most recent saved analyses this caller is allowed to see,
    newest first. Logged-in users see their own; anonymous callers see
    only analyses nobody owns."""
    if supabase is None:
        return []

    _use_token(access_token)
    try:
        response = (
            supabase.table("analyses")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    finally:
        _use_token(None)
    return response.data or []


def get_analysis_by_id(analysis_id: str, access_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get one specific past analysis by its id — only if this caller is
    allowed to see it (their own analysis, per the database's security rules)."""
    if supabase is None:
        return None

    _use_token(access_token)
    try:
        response = supabase.table("analyses").select("*").eq("id", analysis_id).execute()
    finally:
        _use_token(None)
    if response.data:
        return response.data[0]
    return None
