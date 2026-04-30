import os
from datetime import timedelta

import firebase_admin
from firebase_admin import credentials, firestore, storage

from app.core.config import settings

_initialized = False


def ensure_firebase_initialized() -> None:
    global _initialized
    if _initialized:
        return
    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
    else:
        cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(
        cred,
        {
            "projectId": settings.FIREBASE_PROJECT_ID,
            "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", f"{settings.FIREBASE_PROJECT_ID}.appspot.com"),
        },
    )
    _initialized = True


def db():
    ensure_firebase_initialized()
    return firestore.client()


def bucket():
    ensure_firebase_initialized()
    return storage.bucket()


async def storage_upload(path: str, data: bytes, content_type: str) -> None:
    blob = bucket().blob(path)
    blob.upload_from_string(data, content_type=content_type)


async def storage_signed_url(path: str, expires_in: int = 3600) -> str:
    blob = bucket().blob(path)
    return blob.generate_signed_url(expiration=timedelta(seconds=expires_in), version="v4")
