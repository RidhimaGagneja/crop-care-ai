"""
Sign-up and login endpoints.

These forward to Supabase's built-in login system (Supabase Auth) — we
never store passwords ourselves, Supabase handles that safely.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from services import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(payload: SignupRequest):
    """Create a new farmer account. Returns a login token to use on future requests."""
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"field": "password", "message": "Password must be at least 6 characters."},
        )

    result = db.sign_up(payload.email, payload.password, name=payload.name)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "email",
                "message": (
                    "Could not log you in right after signup. This usually means "
                    "'Confirm email' is still turned on in Supabase (Authentication → "
                    "Sign In / Providers → Email) — turn it off, or check your inbox "
                    "for a confirmation link."
                ),
            },
        )
    return result


@router.post("/login")
async def login(payload: LoginRequest):
    """Log an existing farmer in. Returns a login token to use on future requests."""
    result = db.sign_in(payload.email, payload.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Incorrect email or password."},
        )
    return result
