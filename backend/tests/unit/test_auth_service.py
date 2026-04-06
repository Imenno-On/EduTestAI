import pytest
from fastapi import HTTPException

from app.repositories.auth_repository import RefreshTokenRepository, UserRepository
from app.services.auth_service import AuthService
from app.core.roles import Role
from app.schemas.user_schema import UserCreate


@pytest.mark.unit
@pytest.mark.asyncio
async def test_register_user_bootstraps_first_admin_then_regular_user(db_session):
    service = AuthService(
        user_repo=UserRepository(db_session),
        refresh_repo=RefreshTokenRepository(db_session),
    )

    first_payload = UserCreate(
        email="first@example.com",
        password="secret123",
        full_name="First Admin",
    )
    second_payload = UserCreate(
        email="second@example.com",
        password="secret123",
        full_name="Second User",
    )

    first_token, _ = await service.register_user(first_payload, session=db_session)
    second_token, _ = await service.register_user(second_payload, session=db_session)

    assert first_token.user.role == Role.ADMIN.value
    assert first_token.user.is_superuser is True
    assert second_token.user.role == Role.USER.value
    assert second_token.user.is_superuser is False


@pytest.mark.unit
@pytest.mark.asyncio
async def test_register_user_rejects_duplicate_email(db_session):
    service = AuthService(
        user_repo=UserRepository(db_session),
        refresh_repo=RefreshTokenRepository(db_session),
    )
    payload = UserCreate(email="dup@example.com", password="secret123", full_name="Dup")

    await service.register_user(payload, session=db_session)

    with pytest.raises(HTTPException) as exc:
        await service.register_user(payload, session=db_session)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Email already registered"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_refresh_rotates_token_and_revokes_old_one(db_session, create_user):
    user = await create_user(
        db_session,
        email="rotate@example.com",
        role=Role.USER.value,
    )
    service = AuthService(
        user_repo=UserRepository(db_session),
        refresh_repo=RefreshTokenRepository(db_session),
    )

    _, original_refresh = await service._create_token_pair(user)
    token_payload, new_refresh = await service.refresh(original_refresh)

    old_record = await service.refresh_repo.get_valid(original_refresh)
    new_record = await service.refresh_repo.get_valid(new_refresh)

    assert token_payload.user.id == user.id
    assert new_refresh != original_refresh
    assert old_record is None
    assert new_record is not None
