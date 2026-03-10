"""
Эндпоинты для тестов, сгенерированных ИИ (GeneratedForm).
Текст → LLM → вопросы → Google Forms → запись в БД с ссылками.
Фильтрация, сортировка, пагинация, вложения (S3).
"""
from typing import List, Optional
import logging
from datetime import datetime, date
from pydantic import ValidationError

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.generated_form import GeneratedForm
from app.models.test_attachment import TestAttachment
from app.models.user import User
from app.schemas.generated_form_schema import (
    GenerateTestRequest,
    GeneratedFormRead,
    GeneratedFormUpdate,
    TestAttachmentRead,
    TestAttachmentWithUrl,
    PaginatedResponse,
)
from app.services.google_forms_service import create_google_form
from app.services.llm_service import generate_questions_from_text
from app.services.storage_service import (
    validate_file,
    generate_s3_key,
    upload_file,
    delete_file as s3_delete_file,
    get_presigned_download_url,
)
from app.core.dependencies import get_current_user, require_permission, require_any_permission
from app.core.roles import Permission, Role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["Tests"])

# Валидация query params
SortField = Query(None, description="Поле сортировки: created_at, title, question_count")
SortOrder = Query("desc", regex="^(asc|desc)$")
Page = Query(1, ge=1)
PerPage = Query(10, ge=1, le=100)


def _build_form_read(form, user_role: Role, owner_id=None, owner_email=None, owner_full_name=None):
    return GeneratedFormRead(
        id=form.id,
        published_url=form.published_url,
        edit_url=form.edit_url,
        question_count=form.question_count or 0,
        title=form.title,
        created_at=form.created_at,
        owner_id=owner_id or (form.owner.id if form.owner and user_role == Role.ADMIN else None),
        owner_email=owner_email or (form.owner.email if form.owner and user_role == Role.ADMIN else None),
        owner_full_name=owner_full_name or (form.owner.full_name if form.owner and user_role == Role.ADMIN else None),
    )


@router.get("/generated", response_model=PaginatedResponse[GeneratedFormRead])
async def list_generated_forms(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
    search: Optional[str] = Query(None, min_length=1, max_length=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    owner_id: Optional[int] = Query(None, description="Только для admin"),
    sort: Optional[str] = SortField,
    order: str = SortOrder,
    page: int = Page,
    per_page: int = PerPage,
):
    """Список тестов с фильтрацией, поиском, сортировкой и пагинацией."""
    user_role = current_user.get_role()

    q = select(GeneratedForm).options(selectinload(GeneratedForm.owner))
    if user_role != Role.ADMIN:
        q = q.where(GeneratedForm.owner_id == current_user.id)
    elif owner_id is not None:
        q = q.where(GeneratedForm.owner_id == owner_id)

    if search:
        q = q.where(GeneratedForm.title.ilike(f"%{search}%"))
    if date_from:
        q = q.where(GeneratedForm.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.where(GeneratedForm.created_at <= datetime.combine(date_to, datetime.max.time()))

    count_q = select(func.count(GeneratedForm.id)).select_from(GeneratedForm)
    if user_role != Role.ADMIN:
        count_q = count_q.where(GeneratedForm.owner_id == current_user.id)
    elif owner_id is not None:
        count_q = count_q.where(GeneratedForm.owner_id == owner_id)
    if search:
        count_q = count_q.where(GeneratedForm.title.ilike(f"%{search}%"))
    if date_from:
        count_q = count_q.where(GeneratedForm.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        count_q = count_q.where(GeneratedForm.created_at <= datetime.combine(date_to, datetime.max.time()))
    total = (await session.execute(count_q)).scalar() or 0

    sort_col = {
        "created_at": GeneratedForm.created_at,
        "title": GeneratedForm.title,
        "question_count": GeneratedForm.question_count,
    }.get(sort or "created_at", GeneratedForm.created_at)
    q = q.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

    q = q.offset((page - 1) * per_page).limit(per_page)
    res = await session.execute(q)
    forms = res.scalars().all()

    result = []
    for form in forms:
        try:
            result.append(_build_form_read(form, user_role))
        except (ValidationError, Exception) as e:
            logger.warning("Skip form %s: %s", form.id, e)

    total_pages = (total + per_page - 1) // per_page if total else 0
    return PaginatedResponse(
        items=result,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/generated/{form_id}", response_model=GeneratedFormRead)
async def get_generated_form(
    form_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Получить один тест."""
    res = await session.execute(
        select(GeneratedForm).options(selectinload(GeneratedForm.owner)).where(GeneratedForm.id == form_id)
    )
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    user_role = current_user.get_role()
    if user_role != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return _build_form_read(form, user_role)


@router.patch("/generated/{form_id}", response_model=GeneratedFormRead)
async def update_generated_form(
    form_id: int,
    payload: GeneratedFormUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Обновить тест (title). Только владелец или admin."""
    res = await session.execute(
        select(GeneratedForm).options(selectinload(GeneratedForm.owner)).where(GeneratedForm.id == form_id)
    )
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    user_role = current_user.get_role()
    if user_role != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if payload.title is not None:
        form.title = payload.title[:255] if len(payload.title) > 255 else payload.title
    await session.commit()
    await session.refresh(form)
    return _build_form_read(form, user_role)


@router.delete("/generated/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generated_form(
    form_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_DELETE_OWN, Permission.TEST_DELETE_ALL])
    ),
):
    """Удалить тест (и все вложения)."""
    res = await session.execute(select(GeneratedForm).where(GeneratedForm.id == form_id))
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    user_role = current_user.get_role()
    if user_role != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")

    att_res = await session.execute(select(TestAttachment).where(TestAttachment.form_id == form_id))
    for att in att_res.scalars().all():
        s3_delete_file(att.s3_key)
    session.delete(form)
    await session.commit()


@router.post(
    "/generated/{form_id}/attachments",
    response_model=TestAttachmentRead,
)
async def upload_attachment(
    form_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Загрузить вложение к тесту."""
    res = await session.execute(select(GeneratedForm).where(GeneratedForm.id == form_id))
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    if current_user.get_role() != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")

    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "unnamed"

    try:
        validate_file(filename, content_type, len(content))
    except ValueError as e:
        raise HTTPException(400, str(e))

    s3_key = generate_s3_key(form_id, filename)
    upload_file(content, s3_key, content_type)

    att = TestAttachment(
        form_id=form_id,
        filename=filename,
        s3_key=s3_key,
        content_type=content_type,
        size_bytes=len(content),
    )
    session.add(att)
    await session.commit()
    await session.refresh(att)
    return TestAttachmentRead(
        id=att.id,
        form_id=att.form_id,
        filename=att.filename,
        content_type=att.content_type,
        size_bytes=att.size_bytes,
        created_at=att.created_at,
    )


@router.get("/generated/{form_id}/attachments", response_model=List[TestAttachmentWithUrl])
async def list_attachments(
    form_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Список вложений с pre-signed URL для скачивания."""
    res = await session.execute(select(GeneratedForm).where(GeneratedForm.id == form_id))
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    if current_user.get_role() != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")

    att_res = await session.execute(select(TestAttachment).where(TestAttachment.form_id == form_id))
    result = []
    for att in att_res.scalars().all():
        url = get_presigned_download_url(att.s3_key, att.filename)
        result.append(
            TestAttachmentWithUrl(
                id=att.id,
                form_id=att.form_id,
                filename=att.filename,
                content_type=att.content_type,
                size_bytes=att.size_bytes,
                created_at=att.created_at,
                download_url=url,
            )
        )
    return result


@router.delete("/generated/{form_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    form_id: int,
    attachment_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Удалить вложение."""
    res = await session.execute(select(GeneratedForm).where(GeneratedForm.id == form_id))
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(404, "Generated form not found")
    if current_user.get_role() != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(403, "Access denied")

    att_res = await session.execute(
        select(TestAttachment).where(
            TestAttachment.id == attachment_id,
            TestAttachment.form_id == form_id,
        )
    )
    att = att_res.scalar_one_or_none()
    if not att:
        raise HTTPException(404, "Attachment not found")
    s3_delete_file(att.s3_key)
    session.delete(att)
    await session.commit()


@router.post(
    "/generate",
    response_model=GeneratedFormRead,
)
async def generate_test(
    payload: GenerateTestRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_permission(Permission.TEST_CREATE)),
):
    """Генерация теста из текста (ИИ + Google Forms)."""
    start_time = datetime.utcnow()
    logger.info("Начало генерации теста для пользователя %s", current_user.id)

    if not payload.text or not payload.text.strip():
        raise HTTPException(400, "Текст не может быть пустым")

    try:
        questions = await generate_questions_from_text(payload.text)
    except Exception as e:
        logger.exception("Ошибка генерации вопросов: %s", e)
        raise HTTPException(503, "Сервис генерации вопросов временно недоступен")

    if not questions or len(questions) < 3:
        raise HTTPException(400, "Слишком мало вопросов. Нужно минимум 3.")

    title_keywords = payload.text.strip().split()[:5]
    form_title = f"Тест: {' '.join(title_keywords)}"[:100]

    try:
        form_urls = await create_google_form(title=form_title, questions=questions)
    except Exception as e:
        logger.exception("Ошибка создания Google Form: %s", e)
        raise HTTPException(503, "Google Forms временно недоступен")

    db_form = GeneratedForm(
        title=form_title,
        published_url=form_urls["published_url"],
        edit_url=form_urls["edit_url"],
        owner_id=current_user.id,
        question_count=len(questions),
        original_text=payload.text[:500] + "..." if len(payload.text) > 500 else payload.text,
    )
    session.add(db_form)
    await session.commit()
    await session.refresh(db_form)

    logger.info("Генерация завершена за %.2f с", (datetime.utcnow() - start_time).total_seconds())
    return _build_form_read(db_form, current_user.get_role())
