"""
Тесты: кафедры, программы, группы, зачисления (stud app).
"""

import pytest
from datetime import date
from rest_framework import status

from stud.models import Department, EducationalProgram, AcademicGroup, StudentEnrollment, DegreeLevel
from users.models import UserRole


# ── Кафедры ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDepartment:
    url = "/api/departments/"

    def test_list_requires_auth(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_departments(self, api_client, student, department):
        api_client.force_authenticate(user=student)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_as_head_success(self, api_client, head):
        api_client.force_authenticate(user=head)
        payload = {
            "name": "Новая кафедра",
            "description": "Описание",
            "head_id": head.id,
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert Department.objects.filter(name="Новая кафедра").exists()

    def test_create_as_student_forbidden(self, api_client, student):
        api_client.force_authenticate(user=student)
        payload = {"name": "Не моя кафедра", "description": ""}
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_as_supervisor_forbidden(self, api_client, supervisor):
        api_client.force_authenticate(user=supervisor)
        payload = {"name": "Чужая", "description": ""}
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_as_head_success(self, api_client, head, department):
        api_client.force_authenticate(user=head)
        response = api_client.delete(f"{self.url}{department.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_as_student_forbidden(self, api_client, student, department):
        api_client.force_authenticate(user=student)
        response = api_client.delete(f"{self.url}{department.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Образовательные программы ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestEducationalProgram:
    url = "/api/programs/"

    def test_list_all_authenticated(self, api_client, student, program):
        api_client.force_authenticate(user=student)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_as_head_success(self, api_client, head, department):
        api_client.force_authenticate(user=head)
        payload = {
            "full_name": "Прикладная математика",
            "short_name": "ПМ",
            "degree_level": DegreeLevel.ASPIRANT,
            "department_id": department.id,
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_as_student_forbidden(self, api_client, student, department):
        api_client.force_authenticate(user=student)
        payload = {
            "full_name": "Нелегальная программа",
            "short_name": "НП",
            "degree_level": DegreeLevel.MAGISTR,
            "department_id": department.id,
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Академические группы ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAcademicGroup:
    url = "/api/groups/"

    def test_list_returns_groups(self, api_client, supervisor, group):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_as_head_success(self, api_client, head, program):
        api_client.force_authenticate(user=head)
        payload = {
            "name": "ИСТ-251",
            "program_id": program.id,
            "start_date": "2025-09-01",
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_201_CREATED

    def test_group_students_action(self, api_client, supervisor, group, enrollment):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(f"{self.url}{group.id}/students/")
        assert response.status_code == status.HTTP_200_OK
        ids = [u["id"] for u in response.data]
        assert enrollment.student.id in ids


# ── Зачисления ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStudentEnrollment:
    url = "/api/enrollments/"

    def test_student_sees_own_enrollment(self, api_client, student, enrollment):
        api_client.force_authenticate(user=student)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["student"]["id"] == student.id

    def test_create_enrollment_as_head(self, api_client, head, student2, group):
        api_client.force_authenticate(user=head)
        payload = {
            "student_id": student2.id,
            "group_id": group.id,
            "start_date": "2024-09-01",
            "status": "ACTIVE",
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_enrollment_as_student_forbidden(
        self, api_client, student, student2, group
    ):
        api_client.force_authenticate(user=student)
        payload = {
            "student_id": student2.id,
            "group_id": group.id,
            "start_date": "2024-09-01",
            "status": "ACTIVE",
        }
        response = api_client.post(self.url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ── Список студентов ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStudentList:
    url = "/api/students/"

    def test_returns_only_students(self, api_client, supervisor, student, head):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        roles = {u["role"] for u in response.data}
        assert roles == {"STD"}
