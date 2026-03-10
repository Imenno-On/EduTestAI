# EduTestAI — RBAC (Лабораторная №1)

Проект: пользователь вводит текст → LLM генерирует вопросы → создаётся форма в Google Forms → пользователь получает ссылки (на прохождение и редактирование), а запись сохраняется в БД.

## Сущности и действия, требующие контроля доступа

- **Users**
  - Просмотр своего профиля
  - Просмотр списка пользователей (админ)
  - Управление ролями пользователей (админ)
- **Generated tests (GeneratedForm)**
  - Генерация теста из текста
  - Просмотр списка тестов
  - Удаление теста
  - Ограничение “только свои данные” для обычных пользователей

Принципы:

- **Запрет по умолчанию**: доступ к защищённым endpoint’ам даётся только при наличии нужных прав.
- **Минимальные привилегии**: роль `user` видит/удаляет только свои тесты.
- **RBAC**: проверка прав реализована через роли и permissions на backend.

## Роли и permissions (матрица)

Роли: `guest`, `user`, `admin`.

| Permission | guest | user | admin | Описание |
|---|---:|---:|---:|---|
| `test:create` | ✗ | ✓ | ✓ | Генерация теста (создание формы) |
| `test:view:own` | ✗ | ✓ | ✓ | Просмотр своих тестов |
| `test:view:all` | ✗ | ✗ | ✓ | Просмотр всех тестов |
| `test:delete:own` | ✗ | ✓ | ✓ | Удаление своих тестов |
| `test:delete:all` | ✗ | ✗ | ✓ | Удаление любых тестов |
| `user:view:own` | ✗ | ✓ | ✓ | Просмотр своего профиля |
| `user:view:all` | ✗ | ✗ | ✓ | Просмотр всех пользователей |
| `user:manage:roles` | ✗ | ✗ | ✓ | Изменение ролей пользователей |

Реализация матрицы: `backend/app/core/roles.py`.

Доп. ограничение “только свои данные”:

- `user` получает из `/api/tests/generated` **только** записи с `owner_id == current_user.id`
- `user` может удалить **только** свои формы (`/api/tests/generated/{id}`)

## Backend (FastAPI): где проверяются права

Основные зависимости (guards):

- `get_current_user` — проверка Bearer токена, активность пользователя
- `require_permission(permission)` — проверка наличия permission
- `require_any_permission([..])` — проверка “хотя бы одного” permission (удобно для эндпоинтов, где `user` и `admin` имеют разные возможности)

Код: `backend/app/core/dependencies.py`.

Защищённые эндпоинты (примеры):

- `POST /api/tests/generate` → требует `test:create`
- `GET /api/tests/generated` → требует `test:view:own` или `test:view:all`
- `DELETE /api/tests/generated/{form_id}` → требует `test:delete:own` или `test:delete:all` + проверка “свои/чужие”
- `GET /api/users` → требует `user:view:all`
- `PATCH /api/users/{user_id}/role` → требует `user:manage:roles`
- При недостатке прав возвращается **403 Forbidden**

### Bootstrap администратора (для удобства проверки лабы)

Чтобы не менять БД вручную, реализовано правило:

- **первый зарегистрированный пользователь становится `admin`** (и `is_superuser=true`),
- последующие — `user`.

Код: `backend/app/routes/auth.py` (эндпоинт регистрации).

## Frontend (React + TypeScript): ролевое поведение и “защита маршрутов”

Приложение использует внутреннюю навигацию по страницам (`App.tsx`):

- **Приватные страницы** (`dashboard/tests/students/groups/statistics/admin`) недоступны без авторизации → редирект на `auth`
- Страница **`admin`** недоступна без роли `admin` → редирект на `dashboard`

Ролевое поведение UI:

- Пункт меню “Пользователи” и страница управления ролями отображаются только для `admin`

## Запуск

### Backend

1) Перейти в папку `backend`
2) Установить зависимости
3) Настроить `backend/.env` (не коммитится)
4) Запустить приложение (пример)

> Команды зависят от того, как у тебя запускалось в MVP (uvicorn/poetry/docker). Если используешь docker-compose — см. `docker-compose.yml`.

### Frontend

1) Перейти в папку `frontend`
2) Установить зависимости
3) Запустить dev-сервер

## Как проверить корректность RBAC (быстрый чек-лист)

- **Guest**:
  - не может открыть кабинет/админку (уходит на авторизацию)
  - не может вызвать защищённые API без токена → 401/403
- **User**:
  - может создать тест
  - видит только свои тесты
  - не может открыть admin UI, `GET /api/users` даёт 403
- **Admin**:
  - видит всех пользователей (`GET /api/users`)
  - может менять роли (`PATCH /api/users/{id}/role`)
  - видит все тесты

---

## Лабораторная №3 — Фильтрация, CRUD, объектное хранилище

### Фильтрация, поиск, сортировка, пагинация

**Сущность**: список тестов (`GeneratedForm`).

- **Фильтры**: поиск по названию (`search`), дата от (`date_from`), дата до (`date_to`), для admin — `owner_id`.
- **Сортировка**: по полям `created_at`, `title`, `question_count`, порядок `asc`/`desc`.
- **Пагинация**: `page`, `per_page` (до 100).
- Состояние фильтров сохраняется в URL (query params), при навигации назад параметры восстанавливаются.

**Backend**: `GET /api/tests/generated` с query-параметрами. Валидация через FastAPI `Query()`.

**Frontend**: форма фильтров на странице «Мои тесты», кнопка «Применить», пагинация «Назад/Далее».

### CRUD и вложения

- **Создание**: `POST /api/tests/generate` (как ранее).
- **Просмотр**: `GET /api/tests/generated`, `GET /api/tests/generated/{id}`.
- **Редактирование**: `PATCH /api/tests/generated/{id}` (обновление `title`).
- **Удаление**: `DELETE /api/tests/generated/{id}` (каскадно удаляет вложения и записи в S3).

### Объектное хранилище (S3-совместимое MinIO)

- **Сервис**: `backend/app/services/storage_service.py`.
- **Модель**: `TestAttachment` — связь `form_id` → `GeneratedForm`.
- **Ограничения**: расширения `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.txt`; размер до 10 МБ.
- **Загрузка**: `POST /api/tests/generated/{id}/attachments` (multipart/form-data).
- **Список + pre-signed URL**: `GET /api/tests/generated/{id}/attachments`.
- **Удаление**: `DELETE /api/tests/generated/{id}/attachments/{attachment_id}`.

MinIO поднимается через `docker-compose`; бакет создаётся при старте backend.

### Запуск с MinIO

```bash
docker-compose up -d   # PostgreSQL + MinIO
cd backend && pip install boto3 && alembic upgrade head && uvicorn app.main:app --reload
```

