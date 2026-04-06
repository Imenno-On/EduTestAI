from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.schemas.user_schema import UserCreate, TokenWithUser
from app.services.auth_service import AuthService
from app.repositories.auth_repository import UserRepository, RefreshTokenRepository

router = APIRouter()
REFRESH_COOKIE_NAME = "edutest_refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokenRepository(session)
    return AuthService(user_repo=user_repo, refresh_repo=refresh_repo)


def _should_use_secure_cookie() -> bool:
    return settings.backend_public_url.startswith("https://")


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    secure = _should_use_secure_cookie()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    secure = _should_use_secure_cookie()
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        path="/api/auth",
    )


@router.post("/auth/register", response_model=TokenWithUser)
async def register(
    user: UserCreate,
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Регистрация пользователя + access token в JSON и refresh token в HttpOnly cookie.
    """
    token_payload, refresh_token = await auth_service.register_user(user, session=session)
    _set_refresh_cookie(response, refresh_token)
    return token_payload


@router.post("/auth/login", response_model=TokenWithUser)
async def login(
    form_data: UserCreate,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Вход по email/паролю + access token в JSON и refresh token в HttpOnly cookie.
    """
    token_payload, refresh_token = await auth_service.login(form_data.email, form_data.password)
    _set_refresh_cookie(response, refresh_token)
    return token_payload


@router.post("/auth/refresh", response_model=TokenWithUser)
async def refresh_token(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Обновление access token по refresh token из HttpOnly cookie.
    """
    refresh_token_value = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cookie is missing",
        )

    token_payload, new_refresh_token = await auth_service.refresh(refresh_token_value)
    _set_refresh_cookie(response, new_refresh_token)
    return token_payload


@router.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Logout: отзыв текущей refresh-сессии и очистка refresh cookie.
    """
    refresh_token_value = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token_value:
        await auth_service.refresh_repo.revoke(refresh_token_value)
    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}