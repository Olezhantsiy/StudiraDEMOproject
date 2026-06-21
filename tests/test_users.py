"""
Тесты: авторизация, регистрация, профиль пользователя (users app).
"""

import pytest
from django.urls import reverse
from rest_framework import status

from users.models import User, UserRole


# ── Регистрация ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRegistration:
    url = "/api/users/register/"

    def test_register_creates_student(self, api_client):
        payload = {
            "username": "newuser",
            "email": "newuser@test.ru",
            "password": "securepass123",
            "first_name": "Алексей",
            "last_name": "Петров",
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username="newuser")
        assert user.role == UserRole.STUDENT

    def test_register_missing_username(self, api_client):
        payload = {"email": "x@x.ru", "password": "pass"}
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_username(self, api_client, student):
        payload = {
            "username": student.username,
            "email": "other@test.ru",
            "password": "pass123",
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_missing_password(self, api_client):
        payload = {"username": "nopass", "email": "nopass@test.ru"}
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ── Аутентификация (JWT) ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestLogin:
    url = "/api/users/login/"

    def test_login_returns_tokens(self, api_client, student):
        response = api_client.post(
            self.url, {"username": student.username, "password": "testpass123"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_wrong_password(self, api_client, student):
        response = api_client.post(
            self.url, {"username": student.username, "password": "wrongpassword"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        response = api_client.post(
            self.url, {"username": "ghost", "password": "12345"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_contains_role(self, api_client, supervisor):
        response = api_client.post(
            self.url, {"username": supervisor.username, "password": "testpass123"}
        )
        assert response.status_code == status.HTTP_200_OK
        import jwt
        token = response.data["access"]
        payload = jwt.decode(token, options={"verify_signature": False})
        assert payload.get("role") == UserRole.SUPERVISOR


# ── Профиль /me/ ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeEndpoint:
    url = "/api/users/me/"

    def test_me_unauthenticated_returns_401(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_user_data(self, api_client, student):
        api_client.force_authenticate(user=student)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == student.username
        assert response.data["role"] == UserRole.STUDENT

    def test_me_patch_updates_name(self, api_client, student):
        api_client.force_authenticate(user=student)
        response = api_client.patch(self.url, {"first_name": "Дмитрий"})
        assert response.status_code == status.HTTP_200_OK
        student.refresh_from_db()
        assert student.first_name == "Дмитрий"

    def test_me_cannot_change_role(self, api_client, student):
        api_client.force_authenticate(user=student)
        # role — read_only, поле игнорируется
        api_client.patch(self.url, {"role": "HOD"})
        student.refresh_from_db()
        assert student.role == UserRole.STUDENT

    def test_me_put_updates_profile(self, api_client, supervisor):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "first_name": "Новое",
            "last_name": "Имя",
            "middle_name": "Отчество",
            "email": "new@test.ru",
        }
        response = api_client.put(self.url, payload)
        assert response.status_code == status.HTTP_200_OK
        supervisor.refresh_from_db()
        assert supervisor.first_name == "Новое"
