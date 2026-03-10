from fastapi import Depends, HTTPException, status
from app.core.security import bearer_scheme, decode_token
from app.models.user import User
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from sqlalchemy import select
from app.core.roles import Role, Permission, has_permission
from typing import List


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(auth.credentials)
    email: str = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return user


def require_role(allowed_roles: List[Role]):
    """
    Зависимость для проверки роли пользователя.
    Использование: @router.get("/admin", dependencies=[Depends(require_role([Role.ADMIN]))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.get_role()
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker


def require_permission(permission: Permission):
    """
    Зависимость для проверки разрешения пользователя.
    Использование: @router.post("/test", dependencies=[Depends(require_permission(Permission.TEST_CREATE))])
    """
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.get_role()
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permission: {permission.value}",
            )
        return current_user
    return permission_checker


def require_admin():
    """Зависимость для проверки, что пользователь является администратором"""
    return require_role([Role.ADMIN])