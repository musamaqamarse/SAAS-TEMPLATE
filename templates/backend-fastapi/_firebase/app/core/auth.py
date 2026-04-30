from dataclasses import dataclass
from typing import Any

from fastapi import Header, HTTPException, status
from firebase_admin import auth as fb_auth

from app.core.db import ensure_firebase_initialized


@dataclass
class CurrentUser:
    id: str
    email: str | None
    claims: dict[str, Any]


async def require_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    ensure_firebase_initialized()
    token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}") from e
    return CurrentUser(
        id=decoded.get("uid", ""),
        email=decoded.get("email"),
        claims=decoded,
    )
