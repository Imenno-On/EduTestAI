from contextlib import asynccontextmanager
import asyncio
import logging

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from app.routes import auth, health, tests, users

from fastapi.middleware.cors import CORSMiddleware

from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel, OAuthFlowPassword
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.security import OAuth2PasswordBearer


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(health.router)
app.include_router(tests.router, prefix="/api")
