import pytest


@pytest.mark.integration
def test_register_sets_refresh_cookie_and_bootstraps_admin(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "admin@example.com",
            "password": "secret123",
            "full_name": "Admin User",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["role"] == "admin"
    assert payload["user"]["is_superuser"] is True
    assert payload["access_token"]
    assert "edutest_refresh_token=" in response.headers["set-cookie"]


@pytest.mark.integration
def test_refresh_requires_cookie(client):
    response = client.post("/api/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token cookie is missing"


@pytest.mark.integration
def test_logout_revokes_refresh_session(client):
    register_response = client.post(
        "/api/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "secret123",
            "full_name": "Teacher User",
        },
    )
    assert register_response.status_code == 200

    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 200

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["detail"] == "Logged out"

    second_refresh = client.post("/api/auth/refresh")
    assert second_refresh.status_code == 401
    assert second_refresh.json()["detail"] == "Refresh token cookie is missing"
