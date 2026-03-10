from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_session
from app.schemas.user_schema import UserResponse, UserUpdateRole
from app.models.user import User
from app.core.roles import Role

router = APIRouter()


@router.get("/users/me", response_model=UserResponse)
async def read_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        role=current_user.role,
        created_at=current_user.created_at,
    )


# ---------- Admin: управление ролями пользователей ----------
@router.get("/users", response_model=List[UserResponse])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin()),
):
    """Список всех пользователей. Доступно только администратору."""
    res = await session.execute(select(User).order_by(User.id))
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_superuser=u.is_superuser,
            role=u.role,
            created_at=u.created_at,
        )
        for u in res.scalars().all()
    ]


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    payload: UserUpdateRole,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_admin()),
):
    """Изменить роль пользователя. Доступно только администратору."""
    res = await session.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and payload.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot demote yourself from admin",
        )
    user.role = payload.role.value
    await session.commit()
    await session.refresh(user)
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        role=user.role,
        created_at=user.created_at,
    )
