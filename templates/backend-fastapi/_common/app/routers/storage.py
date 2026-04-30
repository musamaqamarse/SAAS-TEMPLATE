from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.auth import CurrentUser, require_user
from app.core.db import storage_upload, storage_signed_url

router = APIRouter()


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_user),
):
    if not file.filename:
        raise HTTPException(400, "Missing filename")
    contents = await file.read()
    object_path = f"{user.id}/{file.filename}"
    await storage_upload(object_path, contents, file.content_type or "application/octet-stream")
    url = await storage_signed_url(object_path, expires_in=3600)
    return {"path": object_path, "url": url}
