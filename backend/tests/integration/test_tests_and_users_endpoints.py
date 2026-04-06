import pytest


def _register_user(client, email: str, password: str = "secret123"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": email.split("@")[0]},
    )
    assert response.status_code == 200
    return response.json()["access_token"], response.json()["user"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.integration
def test_generated_forms_list_respects_rbac_and_admin_owner_fields(client, monkeypatch):
    async def fake_questions(_text: str):
        return ["Q1", "Q2", "Q3"]

    async def fake_google_form(*, title: str, questions):
        return {
            "published_url": f"https://forms.example.com/{title}/published",
            "edit_url": f"https://forms.example.com/{title}/edit",
        }

    monkeypatch.setattr("app.routes.tests.generate_questions_from_text", fake_questions)
    monkeypatch.setattr("app.routes.tests.create_google_form", fake_google_form)

    admin_token, admin_user = _register_user(client, "admin@example.com")
    user_token, user_user = _register_user(client, "user@example.com")

    admin_form = client.post(
        "/api/tests/generate",
        json={"text": "admin form text"},
        headers=_auth_headers(admin_token),
    )
    user_form = client.post(
        "/api/tests/generate",
        json={"text": "user form text"},
        headers=_auth_headers(user_token),
    )

    assert admin_form.status_code == 200
    assert user_form.status_code == 200

    user_list = client.get("/api/tests/generated", headers=_auth_headers(user_token))
    assert user_list.status_code == 200
    user_payload = user_list.json()
    assert user_payload["total"] == 1
    assert user_payload["items"][0]["owner_id"] is None
    assert user_payload["items"][0]["title"].startswith("Тест: user form text")

    admin_list = client.get(
        f"/api/tests/generated?owner_id={user_user['id']}",
        headers=_auth_headers(admin_token),
    )
    assert admin_list.status_code == 200
    admin_payload = admin_list.json()
    assert admin_payload["total"] == 1
    assert admin_payload["items"][0]["owner_id"] == user_user["id"]
    assert admin_payload["items"][0]["owner_email"] == user_user["email"]
    assert admin_payload["items"][0]["title"] != admin_form.json()["title"]
    assert admin_user["role"] == "admin"


@pytest.mark.integration
def test_generate_test_returns_service_unavailable_when_llm_fails(client, monkeypatch):
    async def fake_questions(_text: str):
        raise RuntimeError("provider down")

    monkeypatch.setattr("app.routes.tests.generate_questions_from_text", fake_questions)

    token, _ = _register_user(client, "teacher@example.com")
    response = client.post(
        "/api/tests/generate",
        json={"text": "Some source text"},
        headers=_auth_headers(token),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Сервис генерации вопросов временно недоступен"


@pytest.mark.integration
def test_non_owner_cannot_read_foreign_form(client, monkeypatch):
    async def fake_questions(_text: str):
        return ["Q1", "Q2", "Q3"]

    async def fake_google_form(*, title: str, questions):
        return {
            "published_url": "https://forms.example.com/published",
            "edit_url": "https://forms.example.com/edit",
        }

    monkeypatch.setattr("app.routes.tests.generate_questions_from_text", fake_questions)
    monkeypatch.setattr("app.routes.tests.create_google_form", fake_google_form)

    owner_token, _ = _register_user(client, "owner@example.com")
    stranger_token, _ = _register_user(client, "stranger@example.com")
    form_response = client.post(
        "/api/tests/generate",
        json={"text": "Owner private form"},
        headers=_auth_headers(owner_token),
    )
    form_id = form_response.json()["id"]

    response = client.get(
        f"/api/tests/generated/{form_id}",
        headers=_auth_headers(stranger_token),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Access denied"


@pytest.mark.integration
def test_attachment_upload_and_listing_use_validation_and_presigned_urls(client, monkeypatch):
    async def fake_questions(_text: str):
        return ["Q1", "Q2", "Q3"]

    async def fake_google_form(*, title: str, questions):
        return {
            "published_url": "https://forms.example.com/published",
            "edit_url": "https://forms.example.com/edit",
        }

    monkeypatch.setattr("app.routes.tests.generate_questions_from_text", fake_questions)
    monkeypatch.setattr("app.routes.tests.create_google_form", fake_google_form)
    monkeypatch.setattr("app.routes.tests.upload_file", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        "app.routes.tests.get_presigned_download_url",
        lambda s3_key, filename: f"https://downloads.example.com/{filename}",
    )

    token, _ = _register_user(client, "files@example.com")
    form_response = client.post(
        "/api/tests/generate",
        json={"text": "Attachment source"},
        headers=_auth_headers(token),
    )
    form_id = form_response.json()["id"]

    invalid_upload = client.post(
        f"/api/tests/generated/{form_id}/attachments",
        headers=_auth_headers(token),
        files={"file": ("payload.exe", b"123", "application/octet-stream")},
    )
    assert invalid_upload.status_code == 400

    valid_upload = client.post(
        f"/api/tests/generated/{form_id}/attachments",
        headers=_auth_headers(token),
        files={"file": ("lesson.txt", b"notes", "text/plain")},
    )
    assert valid_upload.status_code == 200

    attachments = client.get(
        f"/api/tests/generated/{form_id}/attachments",
        headers=_auth_headers(token),
    )
    assert attachments.status_code == 200
    payload = attachments.json()
    assert len(payload) == 1
    assert payload[0]["filename"] == "lesson.txt"
    assert payload[0]["download_url"] == "https://downloads.example.com/lesson.txt"


@pytest.mark.integration
def test_users_endpoint_is_forbidden_for_regular_user_and_available_for_admin(client):
    admin_token, _ = _register_user(client, "admin@example.com")
    user_token, _ = _register_user(client, "viewer@example.com")

    forbidden = client.get("/api/users", headers=_auth_headers(user_token))
    assert forbidden.status_code == 403

    allowed = client.get("/api/users", headers=_auth_headers(admin_token))
    assert allowed.status_code == 200
    payload = allowed.json()
    assert len(payload) == 2
    assert {item["email"] for item in payload} == {"admin@example.com", "viewer@example.com"}
