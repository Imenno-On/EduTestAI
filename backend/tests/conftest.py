from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from pathlib import Path
from tempfile import mkdtemp

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_session
from app.main import app as fastapi_app
from app.models.generated_form import GeneratedForm
from app.models.refresh_token import RefreshToken
from app.models.test_attachment import TestAttachment
from app.models.user import User


TEST_DB_DIR = Path(mkdtemp(prefix="edutestai-tests-"))
TEST_DB_PATH = TEST_DB_DIR / "test.sqlite3"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"


@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
def session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(autouse=True)
async def reset_database(engine) -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def db_session(session_factory) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


@pytest.fixture
def app(session_factory, monkeypatch) -> Iterator:
    monkeypatch.setattr("app.services.storage_service.ensure_bucket", lambda: None)

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_session] = override_get_session
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    def _build(user: User) -> dict[str, str]:
        token = create_access_token({"sub": user.email, "role": user.role})
        return {"Authorization": f"Bearer {token}"}

    return _build


@pytest.fixture
def create_user():
    async def _create(
        session: AsyncSession,
        *,
        email: str,
        password: str = "secret123",
        role: str = "user",
        is_superuser: bool = False,
        is_active: bool = True,
        full_name: str | None = None,
    ) -> User:
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_superuser=is_superuser,
            is_active=is_active,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    return _create


@pytest.fixture
def create_form():
    async def _create(
        session: AsyncSession,
        *,
        owner_id: int,
        title: str = "Test form",
        published_url: str = "https://forms.example.com/fill",
        edit_url: str = "https://forms.example.com/edit",
        question_count: int = 5,
        original_text: str = "Sample text",
    ) -> GeneratedForm:
        form = GeneratedForm(
            owner_id=owner_id,
            title=title,
            published_url=published_url,
            edit_url=edit_url,
            question_count=question_count,
            original_text=original_text,
        )
        session.add(form)
        await session.commit()
        await session.refresh(form)
        return form

    return _create


@pytest.fixture
def create_attachment():
    async def _create(
        session: AsyncSession,
        *,
        form_id: int,
        filename: str = "notes.txt",
        s3_key: str = "tests/1/notes.txt",
        content_type: str = "text/plain",
        size_bytes: int = 64,
    ) -> TestAttachment:
        attachment = TestAttachment(
            form_id=form_id,
            filename=filename,
            s3_key=s3_key,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        session.add(attachment)
        await session.commit()
        await session.refresh(attachment)
        return attachment

    return _create
