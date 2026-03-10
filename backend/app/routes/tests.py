"""
Эндпоинты для тестов, сгенерированных ИИ (GeneratedForm).
Текст → LLM → вопросы → Google Forms → запись в БД с ссылками.
"""
from typing import List
import logging
from datetime import datetime
from pydantic import ValidationError

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.generated_form import GeneratedForm
from app.models.user import User
from app.schemas.generated_form_schema import GenerateTestRequest, GeneratedFormRead
from app.services.google_forms_service import create_google_form
from app.services.llm_service import generate_questions_from_text
from app.core.dependencies import get_current_user, require_permission, require_any_permission
from app.core.roles import Permission, Role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tests", tags=["Tests"])


# ---------- Список тестов (AI-формы). USER — свои, ADMIN — все ----------
@router.get("/generated", response_model=List[GeneratedFormRead])
async def list_generated_forms(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_VIEW_OWN, Permission.TEST_VIEW_ALL])
    ),
):
    """Получить список сгенерированных тестов. USER — только свои, ADMIN — все."""
    try:
        logger.info(f"Запрос списка форм для пользователя {current_user.id} (email: {current_user.email})")
        user_role = current_user.get_role()
        if user_role == Role.ADMIN:
            res = await session.execute(
                select(GeneratedForm)
                .options(selectinload(GeneratedForm.owner))
                .order_by(GeneratedForm.created_at.desc())
            )
        else:
            res = await session.execute(
                select(GeneratedForm)
                .where(GeneratedForm.owner_id == current_user.id)
                .options(selectinload(GeneratedForm.owner))
                .order_by(GeneratedForm.created_at.desc())
            )
        forms = res.scalars().all()
        logger.info(f"Найдено {len(forms)} форм для пользователя {current_user.id}")

        if not forms:
            return []

        result = []
        for form in forms:
            owner_id = None
            owner_email = None
            owner_full_name = None
            if user_role == Role.ADMIN and form.owner:
                owner_id = form.owner.id
                owner_email = form.owner.email
                owner_full_name = form.owner.full_name

            try:
                validated_form = GeneratedFormRead(
                    id=form.id,
                    published_url=form.published_url,
                    edit_url=form.edit_url,
                    question_count=form.question_count if form.question_count is not None else 0,
                    title=form.title,
                    created_at=form.created_at,
                    owner_id=owner_id,
                    owner_email=owner_email,
                    owner_full_name=owner_full_name,
                )
                result.append(validated_form)
            except ValidationError as validation_error:
                logger.error(f"Ошибка валидации формы {form.id}: {str(validation_error)}", exc_info=True)
                try:
                    manual_form = GeneratedFormRead(
                        id=form.id,
                        published_url=str(form.published_url) if form.published_url else "",
                        edit_url=str(form.edit_url) if form.edit_url else "",
                        question_count=int(form.question_count) if form.question_count is not None else 0,
                        title=str(form.title) if form.title else "Без названия",
                        created_at=form.created_at if form.created_at else datetime.utcnow(),
                        owner_id=owner_id,
                        owner_email=owner_email,
                        owner_full_name=owner_full_name,
                    )
                    result.append(manual_form)
                except Exception as manual_error:
                    logger.error(f"Не удалось создать форму {form.id}: {str(manual_error)}", exc_info=True)
            except Exception as form_error:
                logger.error(f"Ошибка при сериализации формы {form.id}: {str(form_error)}", exc_info=True)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении списка форм: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось получить список тестов: {str(e)}",
        )


# ---------- Удаление сгенерированного теста. USER — только свои, ADMIN — любые ----------
@router.delete("/generated/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generated_form(
    form_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(
        require_any_permission([Permission.TEST_DELETE_OWN, Permission.TEST_DELETE_ALL])
    ),
):
    """Удалить сгенерированный тест."""
    res = await session.execute(select(GeneratedForm).where(GeneratedForm.id == form_id))
    form = res.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Generated form not found")
    user_role = current_user.get_role()
    if user_role != Role.ADMIN and form.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own forms.",
        )
    await session.delete(form)
    await session.commit()


# ---------- Генерация теста из текста (ИИ + Google Forms) ----------
@router.post(
    "/generate",
    response_model=GeneratedFormRead,
    responses={
        400: {"description": "Некорректные данные запроса"},
        429: {"description": "Превышен лимит запросов"},
        500: {"description": "Внутренняя ошибка сервера"},
        503: {"description": "Сервис недоступен"},
    },
    summary="Генерация теста на основе текста",
    description="Создает тест из текста с помощью ИИ и публикует в Google Forms",
)
async def generate_test(
    payload: GenerateTestRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_permission(Permission.TEST_CREATE)),
):
    """Текст → ИИ генерирует вопросы → создаётся форма в Google Forms → сохраняется запись с ссылками."""
    start_time = datetime.utcnow()
    logger.info(f"Начало генерации теста для пользователя {current_user.id}, длина текста: {len(payload.text)}")

    if not payload.text or not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текст для генерации теста не может быть пустым",
        )

    try:
        questions = await generate_questions_from_text(payload.text)
    except Exception as e:
        logger.error(f"Ошибка генерации вопросов: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис генерации вопросов временно недоступен. Попробуйте позже.",
        )

    logger.info(f"Сгенерировано {len(questions)} вопросов для пользователя {current_user.id}")
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось сгенерировать вопросы. Попробуйте другой текст.",
        )
    if len(questions) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Сгенерировано слишком мало вопросов ({len(questions)}). Нужно минимум 3.",
        )

    title_keywords = payload.text.strip().split()[:5]
    form_title = f"Тест: {' '.join(title_keywords)}"
    if len(form_title) > 100:
        form_title = form_title[:97] + "..."

    try:
        form_urls = await create_google_form(title=form_title, questions=questions)
    except Exception as e:
        logger.error(f"Ошибка создания Google Form: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис Google Forms временно недоступен. Попробуйте позже.",
        )

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

    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"Генерация теста завершена за {duration:.2f} с для пользователя {current_user.id}")

    return GeneratedFormRead(
        id=db_form.id,
        published_url=form_urls["published_url"],
        edit_url=form_urls["edit_url"],
        question_count=len(questions),
        title=form_title,
        created_at=db_form.created_at,
    )
