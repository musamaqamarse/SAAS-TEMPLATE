import os
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings

BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "__PROJECT_KEBAB__-uploads")


@lru_cache(maxsize=1)
def admin_client() -> Client:
    """Service-role client. Use only in server code; never expose to browsers."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase service-role credentials are not configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def storage_upload(path: str, data: bytes, content_type: str) -> None:
    client = admin_client()
    client.storage.from_(BUCKET).upload(
        path=path,
        file=data,
        file_options={"content-type": content_type, "upsert": "true"},
    )


async def storage_signed_url(path: str, expires_in: int = 3600) -> str:
    client = admin_client()
    res = client.storage.from_(BUCKET).create_signed_url(path, expires_in)
    return res.get("signedURL") or res.get("signed_url") or ""
