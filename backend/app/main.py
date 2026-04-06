from contextlib import asynccontextmanager
import asyncio
import logging

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from app.core.config import settings
from app.routes import auth, health, seo, tests, users

from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.services.storage_service import ensure_bucket
        await asyncio.to_thread(ensure_bucket)
    except Exception as e:
        logging.getLogger("app").warning("S3 bucket init skipped: %s", e)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="EduTest AI Backend",
    version="0.1.0",
    openapi_tags=[
        {"name": "Auth", "description": "Register & login"},
        {"name": "Tests", "description": "AI generated tests"},
        {"name": "Health Check", "description": "Health check"},
    ],
)

allowed_origins = list(
    {
        settings.frontend_public_url,
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(health.router)
app.include_router(tests.router, prefix="/api")
app.include_router(seo.router)
