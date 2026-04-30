import base64
import json as _json
from dataclasses import dataclass
from typing import Any

import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.SUPABASE_URL:
            raise HTTPException(500, "SUPABASE_URL is not configured")
        _jwks_client = PyJWKClient(f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json")
    return _jwks_client


@dataclass
class CurrentUser:
    id: str
    email: str | None
    claims: dict[str, Any]


def _decode_supabase_jwt(token: str) -> dict[str, Any]:
    # Detect algorithm from JWT header — new Supabase projects use ES256, legacy use HS256.
    try:
        header = _json.loads(base64.b64decode(token.split(".")[0] + "=="))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token")

    alg = header.get("alg", "HS256")

    try:
        if alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(500, "SUPABASE_JWT_SECRET is not configured")
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}") from e


async def require_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    claims = _decode_supabase_jwt(token)
    return CurrentUser(
        id=claims.get("sub", ""),
        email=claims.get("email"),
        claims=claims,
    )
