from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.user_schema import UserCreate, TokenWithUser, UserResponse
from app.services.auth_service import AuthService
from app.repositories.auth_repository import UserRepository, RefreshTokenRepository
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokenRepository(session)
    return AuthService(user_repo=user_repo, refresh_repo=refresh_repo)


@router.post("/auth/register", response_model=TokenWithUser)
async def register(
    user: UserCreate,
    session: AsyncSession = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Регистрация пользователя + выдача пары токенов (access + refresh).
    """
    return await auth_service.register_user(user, session=session)


@router.post("/auth/login", response_model=TokenWithUser)
async def login(
    form_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Вход по email/паролю + выдача пары токенов (access + refresh).
    """
    return await auth_service.login(form_data.email, form_data.password)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/auth/refresh", response_model=TokenWithUser)
async def refresh_token(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Обновление access token по действующему refresh token (с ротацией refresh).
    """
    return await auth_service.refresh(payload.refresh_token)


@router.post("/auth/logout")
async def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Logout: отзыв текущей refresh-сессии (или всех сессий пользователя).
    """
    await auth_service.logout(current_user, payload.refresh_token)
    return {"detail": "Logged out"}