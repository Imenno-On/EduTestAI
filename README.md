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

- **если в БД ещё нет ни одного `admin`, следующий зарегистрированный пользователь становится `admin`** (и `is_superuser=true`),
- последующие — `user`.

Код: `backend/app/routes/auth.py` (эндпоинт регистрации).

## Frontend (React + TypeScript): ролевое поведение и “защита маршрутов”

Приложение использует маршрутизацию через `react-router-dom` (`App.tsx`):

- **Публичные маршруты**: `/`, `/login`
- **Приватные маршруты**: `/app/tests`, `/app/students`, `/app/groups`, `/app/statistics`
- **Админский маршрут**: `/app/admin`
- Защита реализована через `ProtectedRoute` и `AdminRoute`

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

---

## Лабораторная №2 — Access и Refresh токены

### Схема аутентификации

- Используется пара токенов:
  - `access_token` с коротким временем жизни для доступа к API
  - `refresh_token` для обновления сессии
- `refresh_token` хранится в БД в таблице `refresh_tokens` и отправляется клиенту только через `HttpOnly` cookie
- При `refresh` происходит **ротация**: старый refresh-токен отзывается, новый создаётся заново
- При `logout` текущий refresh-токен отзывается, дальнейшее обновление access-токена блокируется

### Backend

- **Модель**: `backend/app/models/refresh_token.py`
- **Repository layer**: `backend/app/repositories/auth_repository.py`
- **Service layer**: `backend/app/services/auth_service.py`
- **Endpoints**:
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/users/me`

### Frontend

- Централизованное состояние аутентификации: `frontend/src/context/AuthContext.tsx`
- В `localStorage` сохраняется только `access_token`, а `refresh_token` живёт в `HttpOnly` cookie
- В `frontend/src/lib/api.ts` реализовано автоматическое обновление access-токена при `401`
- При невалидной сессии состояние очищается, а пользователь возвращается на вход

### Что проверять

- успешный и неуспешный логин
- обновление access-токена через refresh
- невозможность refresh после logout
- сохранение RBAC-проверок поверх access-токена

---

## Лабораторная №4 — SEO-оптимизация и внешние API

### SEO на frontend

- Приложение переведено на понятные URL через `react-router-dom`
- Публичная страница `/` индексируется
- Закрытые страницы `/app/*` и `/login` получают `noindex, nofollow`
- Используется SEO-компонент `frontend/src/components/Seo.tsx`:
  - `title`
  - `description`
  - `canonical`
  - `Open Graph`
  - `Twitter meta`
  - `JSON-LD` для главной страницы

### SEO на backend

- `GET /robots.txt`
- `GET /sitemap.xml`
- Реализация: `backend/app/routes/seo.py`
- В `robots.txt` закрыты:
  - `/api/`
  - `/docs`
  - `/redoc`
  - `/openapi.json`
  - `/app/`

### Производительность

- Тяжёлые приватные страницы подключаются через `React.lazy()`:
  - `StudentsPage`
  - `GroupsPage`
  - `StatisticsPage`
  - `AdminPage`
- Список вложений к тестам загружается **по запросу**, а не для каждой карточки сразу

### Внешние API

Для выполнения лабораторной использована уже существующая интеграция:

- `OpenRouter` — генерация вопросов по тексту
- `Google Forms` — создание формы с вопросами

Pipeline:

`Текст пользователя -> OpenRouter -> нормализация вопросов -> Google Forms -> сохранение GeneratedForm`

Реализация:

- `backend/app/services/llm_service.py`
- `backend/app/services/google_forms_service.py`
- `backend/app/routes/tests.py`

Что сделано для устойчивости:

- ключи и параметры вынесены в `backend/app/core/config.py`
- таймауты и retry для внешних вызовов
- ограничение параллельных запросов к LLM
- graceful degradation на UI: пользователь видит понятную ошибку, если внешний сервис временно недоступен

### Проверка ЛР4

- открыть `/robots.txt` и `/sitemap.xml`
- проверить `title`, `description`, `canonical`, `og:*`, `JSON-LD` на `/`
- убедиться, что `/app/*` не индексируются
- проверить генерацию теста при нормальной работе внешних сервисов и при их временной недоступности

---

## Лабораторная №5 — Комплексное тестирование клиентской и серверной частей

### Что добавлено

- тестовая модель приложения: `docs/testing-model.md`
- backend-инфраструктура на `pytest`: `backend/pytest.ini`, `backend/requirements-test.txt`
- backend unit/integration тесты: `backend/tests/unit`, `backend/tests/integration`
- frontend unit/integration тесты на `Vitest` + `Testing Library`
- frontend E2E smoke-тесты на `Playwright`: `frontend/e2e`

### Что покрывается

#### Backend

- сервисный слой аутентификации:
  - bootstrap первого `admin`
  - запрет дублирующего email
  - ротация refresh-токена
- endpoint'ы:
  - регистрация, refresh, logout
  - RBAC для списка тестов и списка пользователей
  - запрет доступа к чужому тесту
  - обработка отказа LLM-сервиса
  - загрузка вложений, валидация файла, выдача pre-signed URL

#### Frontend

- восстановление и очистка auth-state в `AuthContext`
- обработка `401 -> refresh -> retry` в `frontend/src/lib/api.ts`
- защита маршрутов `ProtectedRoute` и `AdminRoute`
- ролевое отображение admin-навигации

#### E2E

- вход и переход в кабинет
- открытие admin-страницы администратором
- фильтрация и пагинация списка тестов с проверкой URL

### Структура тестов

```text
backend/tests/
  integration/
  unit/

frontend/src/
  **/*.test.ts
  **/*.test.tsx

frontend/e2e/
```

### Запуск backend-тестов

```bash
cd backend
pip install -r requirements-test.txt
pytest
pytest --cov=app --cov-report=term-missing
```

### Запуск frontend unit/integration тестов

```bash
cd frontend
npm install
npm run test
npm run test:coverage
```

### Запуск E2E

```bash
cd frontend
npx playwright install
npm run test:e2e
```

### Принципы тестовой инфраструктуры

- backend использует отдельные тестовые зависимости и изолированную SQLite БД
- внешние сервисы `OpenRouter`, `Google Forms` и S3 мокируются
- frontend unit-тесты работают в `jsdom`
- E2E-тесты используют браузерный сценарий с моками сетевых ответов
- состояние очищается между тестами через фикстуры, reset моков и очистку `localStorage`

