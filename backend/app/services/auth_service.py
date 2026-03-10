from datetime import datetime, timedelta
from typing import Tuple
import secrets

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.roles import Role
from app.models.user import User
from app.repositories.auth_repository import UserRepository, RefreshTokenRepository
from app.schemas.user_schema import UserCreate, UserResponse, TokenWithUser


ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


class AuthService:
    def __init__(self, user_repo: UserRepository, refresh_repo: RefreshTokenRepository) -> None:
        self.user_repo = user_repo
        self.refresh_repo = refresh_repo

    async def _create_token_pair(self, user: User) -> Tuple[str, str]:
        access_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role},
            expires_delta=access_expires,
        )

        refresh_token = secrets.token_urlsafe(32)
        refresh_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        await self.refresh_repo.create(
            user_id=user.id,
            token=refresh_token,
            expires_at=refresh_expires_at,
        )
        return access_token, refresh_token

    async def register_user(self, payload: UserCreate, session: AsyncSession) -> TokenWithUser:
        # Проверка уникальности email
        existing = await self.user_repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Bootstrap: если нет ни одного admin, новый пользователь становится админом
        existing_admin_res = await session.execute(
            select(User.id).where(User.role == Role.ADMIN.value).limit(1)
        )
        has_admin = existing_admin_res.scalar_one_or_none() is not None
        is_first_admin = not has_admin
        role_value = Role.ADMIN.value if is_first_admin else Role.USER.value

        db_user = User(
            email=payload.email,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            role=role_value,
            is_superuser=is_first_admin,
        )

        db_user = await self.user_repo.create_user(db_user)

        access_token, refresh_token = await self._create_token_pair(db_user)

        return TokenWithUser(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=db_user.id,
                email=db_user.email,
                full_name=db_user.full_name,
                is_active=db_user.is_active,
                is_superuser=db_user.is_superuser,
                role=db_user.role,
                created_at=db_user.created_at,
            ),
        )

    async def authenticate_user(self, email: str, password: str) -> User:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")
        return user

    async def login(self, email: str, password: str) -> TokenWithUser:
        user = await self.authenticate_user(email, password)
        access_token, refresh_token = await self._create_token_pair(user)
        return TokenWithUser(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                role=user.role,
                created_at=user.created_at,
            ),
        )

    async def refresh(self, refresh_token: str) -> TokenWithUser:
        db_token = await self.refresh_repo.get_valid(refresh_token)
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        user = db_token.user

        # Ротация: текущий refresh помечаем отозванным, создаём новую пару
        await self.refresh_repo.revoke(refresh_token)
        access_token, new_refresh_token = await self._create_token_pair(user)

        return TokenWithUser(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                role=user.role,
                created_at=user.created_at,
            ),
        )

    async def logout(self, user: User, refresh_token: str | None = None) -> None:
        # Если передан конкретный refresh_token — отзываем его, иначе все токены пользователя
        if refresh_token:
            await self.refresh_repo.revoke(refresh_token)
        else:
            await self.refresh_repo.revoke_all_for_user(user.id)

