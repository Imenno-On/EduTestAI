from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session
from app.schemas.user_schema import UserCreate, Token, TokenWithUser, UserResponse
from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.roles import Role

router = APIRouter()


@router.post("/auth/register", response_model=TokenWithUser)
async def register(user: UserCreate, session: AsyncSession = Depends(get_session)):
    print("[DEBUG] email:", user.email)
    print("[DEBUG] password length:", len(user.password.encode()), "bytes")
    res = await session.execute(select(User).where(User.email == user.email))
    if res.scalar():
        raise HTTPException(400, "Email already registered")

    # Bootstrap: новый пользователь становится admin, если в БД ещё нет ни одного admin.
    existing_admin_res = await session.execute(
        select(User.id).where(User.role == Role.ADMIN.value).limit(1)
    )
    has_admin = existing_admin_res.scalar_one_or_none() is not None
    is_first_admin = not has_admin
    role_value = Role.ADMIN.value if is_first_admin else Role.USER.value
    db_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        full_name=user.full_name,
        role=role_value,
        is_superuser=is_first_admin,
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    token = create_access_token(data={"sub": user.email})
    return TokenWithUser(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            is_active=db_user.is_active,
            is_superuser=db_user.is_superuser,
            role=db_user.role,
            created_at=db_user.created_at,
        )
    )

@router.post("/auth/login", response_model=TokenWithUser)
async def login(form_data: UserCreate, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(User).where(User.email == form_data.email))
    user = res.scalar()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(400, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "User account is inactive")
    token = create_access_token(data={"sub": user.email})
    return TokenWithUser(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            role=user.role,
            created_at=user.created_at,
        )
    )