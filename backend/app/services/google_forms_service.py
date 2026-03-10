import aiohttp
import os
import logging
import json
import re
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получение URL скрипта
SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")
if not SCRIPT_URL:
    raise RuntimeError("GOOGLE_SCRIPT_URL не найден в переменных окружения")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception(lambda e: isinstance(e, (aiohttp.ClientError, json.JSONDecodeError))),
    reraise=True
)
async def create_google_form(title: str, questions: List[Dict[str, Any]]) -> dict:
    """
    Создает Google Form и возвращает словарь с двумя URL:
    - publishedUrl: для прохождения теста (ученики)
    - editUrl: для редактирования (учителя)
    """
    # Валидация данных
    if not title or not title.strip():
        raise ValueError("Название формы не может быть пустым")

    if not questions:
        raise ValueError("Список вопросов не может быть пустым")

    # Подготовка тела запроса
    body = {
        "title": title.strip(),
        "questions": [
            {
                "question": q["question"],
                "options": q["options"],
                "correct": q["correct"]
            } for q in questions
        ]
    }

    logger.info(f"Отправка запроса на создание формы: '{title}' с {len(questions)} вопросами")
    logger.debug(f"Тело запроса: {json.dumps(body, ensure_ascii=False)[:500]}...")

    try:
        timeout = aiohttp.ClientTimeout(total=30)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "QuizGenerator/1.0"
            }

            async with session.post(
                    SCRIPT_URL,
                    json=body,
                    headers=headers
            ) as resp:
                raw_text = await resp.text()

                logger.debug(f"Google Script response status: {resp.status}")
                logger.debug(f"Google Script raw response: {raw_text[:500]}{'...' if len(raw_text) > 500 else ''}")

                # Проверка на HTML ответ (ошибка)
                if raw_text.strip().startswith('<!DOCTYPE html>') or '<html' in raw_text.lower():
                    error_msg = "Google Script вернул HTML страницу вместо JSON"
                    try:
                        # Пытаемся извлечь сообщение об ошибке из HTML
                        error_match = re.search(r'<title>([^<]+)</title>', raw_text)
                        if error_match:
                            error_msg += f": {error_match.group(1).strip()}"

                        # Пытаемся найти текст ошибки в теле страницы
                        error_content_match = re.search(r'<div[^>]*>([^<]+)</div>', raw_text)
                        if error_content_match:
                            error_msg += f" - {error_content_match.group(1).strip()}"
                    except Exception as parse_error:
                        logger.warning(f"Ошибка при парсинге HTML ошибки: {parse_error}")

                    error_msg += f". Полный ответ: {raw_text[:200]}..."
                    raise RuntimeError(error_msg)

                # Проверка статуса ответа
                if resp.status != 200:
                    error_msg = f"Google Script вернул статус {resp.status}"
                    try:
                        error_data = json.loads(raw_text)
                        error_detail = error_data.get('error', raw_text[:200])
                        error_msg += f": {error_detail}"
                    except json.JSONDecodeError:
                        error_msg += f": {raw_text[:200]}"
                    raise RuntimeError(error_msg)

                # Парсинг JSON ответа
                try:
                    data = json.loads(raw_text)
                except json.JSONDecodeError as e:
                    error_context = raw_text[:1000]
                    raise RuntimeError(
                        f"Не удалось распарсить JSON ответ от Google Script: {e}. "
                        f"Ответ: {error_context}"
                    )

                # Валидация ответа
                if not isinstance(data, dict):
                    raise RuntimeError(f"Ожидался словарь в ответе, получено: {type(data)}")

                if not data.get('success', False):
                    error_detail = data.get('error', 'Неизвестная ошибка')
                    raise RuntimeError(f"Google Script вернул ошибку: {error_detail}")

                if "publishedUrl" not in data or "editUrl" not in data:
                    raise RuntimeError(
                        f"Ответ Google Script не содержит обязательных полей 'publishedUrl' и 'editUrl'. "
                        f"Полученные поля: {list(data.keys())}"
                    )

                published_url = data["publishedUrl"].strip()
                edit_url = data["editUrl"].strip()

                # Проверка валидности URL
                if not published_url.startswith(("http://", "https://")) or not edit_url.startswith(
                        ("http://", "https://")):
                    raise RuntimeError(f"Невалидные URL в ответе. Published: {published_url}, Edit: {edit_url}")

                logger.info(f"✅ Успешно создана форма. Published URL: {published_url}, Edit URL: {edit_url}")
                return {
                    "published_url": published_url,
                    "edit_url": edit_url
                }

    except aiohttp.ClientTimeout as e:
        logger.error(f"Таймаут при запросе к Google Script: {str(e)}")
        raise RuntimeError("Таймаут при запросе к Google Script. Попробуйте позже.")
    except aiohttp.ClientError as e:
        logger.error(f"Ошибка подключения к Google Script: {str(e)}")
        raise RuntimeError("Ошибка подключения к сервису Google Forms. Проверьте сетевое соединение.")
    except json.JSONDecodeError as e:
        logger.error(f"Ошибка парсинга JSON: {str(e)}. Ответ: {raw_text[:500]}...")
        raise RuntimeError(f"Ошибка парсинга ответа от Google Script: {str(e)}")
    except Exception as e:
        logger.exception("Неожиданная ошибка при создании Google Form")
        raise RuntimeError(f"Неожиданная ошибка при создании формы: {str(e)}")