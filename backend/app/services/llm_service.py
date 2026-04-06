import asyncio
import json
import re
from typing import Any

from openai import AsyncOpenAI
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings

_client: AsyncOpenAI | None = None
_llm_semaphore = asyncio.Semaphore(settings.external_api_concurrency_limit)


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY не найден в переменных окружения")
        _client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            timeout=settings.external_api_timeout_seconds,
        )
    return _client


@retry(
    stop=stop_after_attempt(settings.external_api_max_retries),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _request_questions(prompt: str):
    async with _llm_semaphore:
        client = get_client()
        return await client.chat.completions.create(
            model=settings.openrouter_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )


async def generate_questions_from_text(text: str) -> list[dict]:
    """
    Генерирует 5 вопросов с вариантами через OpenRouter.
    Поддерживает разные форматы ответов.
    """
    prompt = f"""
    Ты — генератор тестов. На основе предоставленного текста создай ровно 5 вопросов с 4 вариантами ответа каждый.
    Правильный ответ должен быть указан индексом (0–3).
    Ответь СТРОГО в формате JSON-массива, без дополнительных пояснений, маркдауна или текста.
    Используй поле "correct" для индекса правильного ответа.

    Пример правильного формата:
    [
      {{
        "question": "Пример вопроса",
        "options": ["Вариант1", "Вариант2", "Вариант3", "Вариант4"],
        "correct": 2
      }}
    ]

    Текст: {text}
    """

    response = await _request_questions(prompt)

    raw = response.choices[0].message.content
    print("[DEBUG] raw response:", repr(raw))

    # Удаляем markdown обёртки
    content = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.DOTALL | re.IGNORECASE)
    content = content.strip()

    # Попытки извлечь данные
    try:
        # Пробуем распарсить как есть
        data = json.loads(content)

        # Если данные в формате {"questions": [...]} - извлекаем массив
        if isinstance(data, dict) and "questions" in data:
            questions_data = data["questions"]
        else:
            questions_data = data

    except json.JSONDecodeError:
        # Пытаемся найти JSON внутри текста
        match = re.search(r'\[.*\]|\{.*\}', content, re.DOTALL)
        if not match:
            print("[WARN] Не найден JSON-массив в ответе")
            return _get_fallback_questions()

        json_str = match.group(0)
        try:
            data = json.loads(json_str)
            if isinstance(data, dict) and "questions" in data:
                questions_data = data["questions"]
            else:
                questions_data = data
        except (json.JSONDecodeError, TypeError) as e:
            print(f"[ERROR] Не удалось распарсить JSON: {e}")
            return _get_fallback_questions()

    # Валидация и преобразование вопросов
    validated_questions = []

    # Убеждаемся, что questions_data - это список
    if not isinstance(questions_data, list):
        print(f"[WARN] Данные не являются списком: {type(questions_data)}")
        return _get_fallback_questions()

    for i, item in enumerate(questions_data[:5], 1):
        try:
            # Поддержка разных форматов полей для правильного ответа
            correct_key = 'correct' if 'correct' in item else 'answer' if 'answer' in item else None

            if correct_key is None:
                print(f"[WARN] Вопрос {i} не содержит поля 'correct' или 'answer'")
                continue

            validated = {
                "question": str(item["question"]).strip(),
                "options": [str(opt).strip() for opt in item.get("options", [])[:4]],
                "correct": int(item[correct_key])
            }

            # Проверки
            if len(validated["options"]) < 2:
                print(f"[WARN] Вопрос {i} имеет менее 2 вариантов ответа")
                continue

            if not 0 <= validated["correct"] < len(validated["options"]):
                print(f"[WARN] Некорректный индекс правильного ответа для вопроса {i}")
                validated["correct"] = 0  # Безопасный fallback

            validated_questions.append(validated)
            print(f"[DEBUG] Вопрос {i} успешно провалидирован")

        except (KeyError, TypeError, ValueError, IndexError) as e:
            print(f"[WARN] Вопрос {i} не прошел валидацию: {e}")
            continue

    if len(validated_questions) < 3:
        print(f"[WARN] Недостаточно валидных вопросов ({len(validated_questions)}), используем fallback")
        return _get_fallback_questions()

    return validated_questions[:5]


def _get_fallback_questions() -> list[dict]:
    """Возвращает вопросы-заглушки при ошибках"""
    return [
        {
            "question": "Что является столицей Франции?",
            "options": ["Лондон", "Берлин", "Париж", "Мадрид"],
            "correct": 2
        },
        {
            "question": "Какой цвет получается при смешении синего и желтого?",
            "options": ["Красный", "Зеленый", "Фиолетовый", "Оранжевый"],
            "correct": 1
        },
        {
            "question": "Сколько сторон у треугольника?",
            "options": ["2", "3", "4", "5"],
            "correct": 1
        },
        {
            "question": "Кто написал 'Гамлета'?",
            "options": ["Чарльз Диккенс", "Марк Твен", "Уильям Шекспир", "Лев Толстой"],
            "correct": 2
        },
        {
            "question": "Что такое H₂O?",
            "options": ["Кислород", "Углекислый газ", "Вода", "Водород"],
            "correct": 2
        }
    ]