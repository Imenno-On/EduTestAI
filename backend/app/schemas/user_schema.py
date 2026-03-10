from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.core.roles import Role


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None


class UserResponse(UserBase):
    id: int
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    role: str  # Роль пользователя
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRole(BaseModel):
    """Схема для обновления роли пользователя (только для админа)"""
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str

    class Config:
        from_attributes = True


class TokenWithUser(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

    class Config:
        from_attributes = True