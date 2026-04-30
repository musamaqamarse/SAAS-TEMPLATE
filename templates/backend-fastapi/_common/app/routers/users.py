from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, require_user

router = APIRouter()


@router.get("/me")
async def me(user: CurrentUser = Depends(require_user)):
    return {"id": user.id, "email": user.email, "claims": user.claims}
