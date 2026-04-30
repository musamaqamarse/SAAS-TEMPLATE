from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, storage, users


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Place startup work here (DB warm-up, background tasks, etc.)
    yield
    # Place shutdown work here.


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(storage.router, prefix="/storage", tags=["storage"])


@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "env": settings.APP_ENV}
