"""
Тесты: проекты, этапы, задачи, сдачи, проверки, публикации, шаблоны (research app).
"""

import io
import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from rest_framework import status

from research.models import (
    ResearchProject, ResearchStage, StageTask, TaskSubmission, SubmissionReview,
    Publication, PlanTemplate, ProjectStatus, StageStatus, TaskStatus, TaskType,
    ReviewDecision, PublicationType,
)


# ── Вспомогательные URL-строители ──────────────────────────────────────────────

def projects_url():
    return "/api/projects/"


def project_url(pk):
    return f"/api/projects/{pk}/"


def dashboard_url():
    return "/api/projects/dashboard-stats/"


def generate_url(pk):
    return f"/api/projects/{pk}/generate_template/"


def stages_url(project_pk):
    return f"/api/projects/{project_pk}/stages/"


def stage_url(project_pk, stage_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/"


def tasks_url(project_pk, stage_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/tasks/"


def task_url(project_pk, stage_pk, task_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/"


def submissions_url(project_pk, stage_pk, task_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/submissions/"


def submission_url(project_pk, stage_pk, task_pk, sub_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/submissions/{sub_pk}/"


def review_url(project_pk, stage_pk, task_pk, sub_pk):
    return f"/api/projects/{project_pk}/stages/{stage_pk}/tasks/{task_pk}/submissions/{sub_pk}/review/"


def templates_url():
    return "/api/plan-templates/"


def template_url(pk):
    return f"/api/plan-templates/{pk}/"


def publications_url(project_pk):
    return f"/api/projects/{project_pk}/publications/"


# ── Проекты ────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestResearchProject:

    def test_student_sees_only_own_project(
        self, api_client, student, student2, project, project2
    ):
        api_client.force_authenticate(user=student)
        response = api_client.get(projects_url())
        assert response.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in response.data]
        assert project.id in ids
        assert project2.id not in ids

    def test_supervisor_sees_only_supervised(
        self, api_client, supervisor, supervisor2, project, project2
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(projects_url())
        assert response.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in response.data]
        assert project.id in ids
        assert project2.id not in ids

    def test_head_sees_all_department_projects(
        self, api_client, head, project, project2
    ):
        api_client.force_authenticate(user=head)
        response = api_client.get(projects_url())
        assert response.status_code == status.HTTP_200_OK
        ids = [p["id"] for p in response.data]
        assert project.id in ids
        assert project2.id in ids

    def test_create_project_as_supervisor(self, api_client, supervisor, enrollment):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "enrollment_id": enrollment.id,
            "title": "Новый проект",
            "description": "Описание",
            "keywords": "тест",
            "start_date": str(date.today()),
            "status": ProjectStatus.DRAFT,
        }
        response = api_client.post(projects_url(), payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert ResearchProject.objects.filter(title="Новый проект").exists()

    def test_create_project_as_student_forbidden(self, api_client, student, enrollment):
        api_client.force_authenticate(user=student)
        payload = {
            "enrollment_id": enrollment.id,
            "title": "Нелегальный проект",
            "description": "",
            "keywords": "",
            "start_date": str(date.today()),
            "status": ProjectStatus.DRAFT,
        }
        response = api_client.post(projects_url(), payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_project(self, api_client, student, project):
        api_client.force_authenticate(user=student)
        response = api_client.get(project_url(project.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == project.id

    def test_update_project_status_as_supervisor(self, api_client, supervisor, project):
        api_client.force_authenticate(user=supervisor)
        response = api_client.patch(
            project_url(project.id), {"status": ProjectStatus.APPROVED}
        )
        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.status == ProjectStatus.APPROVED

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(projects_url())
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Dashboard-stats ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDashboardStats:

    def test_empty_stats_for_project_without_tasks(
        self, api_client, supervisor, project
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(dashboard_url())
        assert response.status_code == status.HTTP_200_OK
        entry = next(e for e in response.data if e["project_id"] == project.id)
        assert entry["total"] == 0
        assert entry["completion_percent"] == 0

    def test_stats_counts_done_tasks(self, api_client, supervisor, project, stage):
        StageTask.objects.create(
            stage=stage, title="Задача 1", task_type=TaskType.FILE,
            deadline=date.today() + timedelta(days=5), status=TaskStatus.DONE,
        )
        StageTask.objects.create(
            stage=stage, title="Задача 2", task_type=TaskType.FILE,
            deadline=date.today() + timedelta(days=5), status=TaskStatus.TODO,
        )
        StageTask.objects.create(
            stage=stage, title="Задача 3", task_type=TaskType.FILE,
            deadline=date.today() - timedelta(days=1), status=TaskStatus.OVERDUE,
        )
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(dashboard_url())
        assert response.status_code == status.HTTP_200_OK
        entry = next(e for e in response.data if e["project_id"] == project.id)
        assert entry["total"] == 3
        assert entry["done"] == 1
        assert entry["todo"] == 1
        assert entry["overdue"] == 1
        assert entry["completion_percent"] == 33

    def test_student_sees_only_own_stats(
        self, api_client, student, project, project2, stage
    ):
        StageTask.objects.create(
            stage=stage, title="Задача", task_type=TaskType.FILE,
            deadline=date.today() + timedelta(days=5), status=TaskStatus.DONE,
        )
        api_client.force_authenticate(user=student)
        response = api_client.get(dashboard_url())
        ids = [e["project_id"] for e in response.data]
        assert project.id in ids
        assert project2.id not in ids


# ── Generate Template ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestGenerateTemplate:

    def test_generate_from_plan_template(
        self, api_client, supervisor, project, plan_template
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.post(
            generate_url(project.id), {"template_id": plan_template.id}
        )
        assert response.status_code == status.HTTP_200_OK
        assert project.stages.count() == 1
        assert project.stages.first().tasks.count() == 2

    def test_generate_default_plan_when_no_template(
        self, api_client, supervisor, project
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.post(generate_url(project.id), {})
        assert response.status_code == status.HTTP_200_OK
        assert project.stages.count() > 0

    def test_generate_twice_returns_error(
        self, api_client, supervisor, project, stage
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.post(generate_url(project.id), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "уже создан" in response.data.get("detail", "")

    def test_generate_as_student_forbidden(self, api_client, student, project):
        api_client.force_authenticate(user=student)
        response = api_client.post(generate_url(project.id), {})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_generate_as_foreign_supervisor_forbidden(
        self, api_client, supervisor2, project
    ):
        api_client.force_authenticate(user=supervisor2)
        response = api_client.post(generate_url(project.id), {})
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        )


# ── Этапы ──────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestResearchStage:

    def test_list_stages_as_student(self, api_client, student, project, stage):
        api_client.force_authenticate(user=student)
        response = api_client.get(stages_url(project.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_create_stage_as_supervisor(self, api_client, supervisor, project):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "name": "Разработка",
            "order": 1,
            "start_date": str(date.today()),
            "deadline": str(date.today() + timedelta(days=30)),
            "status": StageStatus.PENDING,
        }
        response = api_client.post(stages_url(project.id), payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert ResearchStage.objects.filter(name="Разработка").exists()

    def test_create_stage_as_student_forbidden(self, api_client, student, project):
        api_client.force_authenticate(user=student)
        payload = {
            "name": "Нелегальный этап",
            "order": 99,
            "start_date": str(date.today()),
            "deadline": str(date.today() + timedelta(days=10)),
            "status": StageStatus.PENDING,
        }
        response = api_client.post(stages_url(project.id), payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_stage_as_supervisor(self, api_client, supervisor, project, stage):
        api_client.force_authenticate(user=supervisor)
        response = api_client.patch(
            stage_url(project.id, stage.id),
            {"status": StageStatus.COMPLETED},
        )
        assert response.status_code == status.HTTP_200_OK
        stage.refresh_from_db()
        assert stage.status == StageStatus.COMPLETED

    def test_delete_stage_as_supervisor(self, api_client, supervisor, project, stage):
        api_client.force_authenticate(user=supervisor)
        response = api_client.delete(stage_url(project.id, stage.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchStage.objects.filter(id=stage.id).exists()


# ── Задачи ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStageTask:

    def test_list_tasks_as_student(self, api_client, student, project, stage, task):
        api_client.force_authenticate(user=student)
        response = api_client.get(tasks_url(project.id, stage.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_create_task_as_supervisor(self, api_client, supervisor, project, stage):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "title": "Новая задача",
            "task_type": TaskType.FILE,
            "deadline": str(date.today() + timedelta(days=10)),
            "status": TaskStatus.TODO,
        }
        response = api_client.post(tasks_url(project.id, stage.id), payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert StageTask.objects.filter(title="Новая задача").exists()

    def test_create_task_as_student_forbidden(
        self, api_client, student, project, stage
    ):
        api_client.force_authenticate(user=student)
        payload = {
            "title": "Нелегальная задача",
            "task_type": TaskType.FILE,
            "deadline": str(date.today() + timedelta(days=5)),
            "status": TaskStatus.TODO,
        }
        response = api_client.post(tasks_url(project.id, stage.id), payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_task_status_as_supervisor(
        self, api_client, supervisor, project, stage, task
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.patch(
            task_url(project.id, stage.id, task.id),
            {"status": TaskStatus.IN_PROGRESS},
        )
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == TaskStatus.IN_PROGRESS


# ── Сдачи материалов ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTaskSubmission:

    def _fake_pdf(self):
        return ContentFile(b"%PDF-1.4 fake pdf content", name="report.pdf")

    def test_student_creates_submission(
        self, api_client, student, project, stage, task
    ):
        upload = SimpleUploadedFile("work.txt", b"content", content_type="text/plain")
        api_client.force_authenticate(user=student)
        with patch(
            "research.views.generate_submission_report", return_value=self._fake_pdf()
        ):
            response = api_client.post(
                submissions_url(project.id, stage.id, task.id),
                {"text": "Моя работа", "file": upload},
                format="multipart",
            )
        assert response.status_code == status.HTTP_201_CREATED
        assert TaskSubmission.objects.filter(task=task).exists()
        task.refresh_from_db()
        assert task.status == TaskStatus.IN_PROGRESS

    def test_supervisor_cannot_create_submission(
        self, api_client, supervisor, project, stage, task
    ):
        upload = SimpleUploadedFile("work.txt", b"content", content_type="text/plain")
        api_client.force_authenticate(user=supervisor)
        response = api_client.post(
            submissions_url(project.id, stage.id, task.id),
            {"text": "Попытка", "file": upload},
            format="multipart",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_foreign_student_cannot_submit(
        self, api_client, student2, project, stage, task
    ):
        upload = SimpleUploadedFile("work.txt", b"content", content_type="text/plain")
        api_client.force_authenticate(user=student2)
        with patch(
            "research.views.generate_submission_report", return_value=self._fake_pdf()
        ):
            response = api_client.post(
                submissions_url(project.id, stage.id, task.id),
                {"text": "Чужая работа", "file": upload},
                format="multipart",
            )
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        )

    def test_list_submissions_as_supervisor(
        self, api_client, supervisor, project, stage, task
    ):
        sub = TaskSubmission.objects.create(
            task=task,
            text="Тест",
            file=SimpleUploadedFile("f.txt", b"data"),
            status="SUBMITTED",
        )
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(submissions_url(project.id, stage.id, task.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


# ── Проверки сдач ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSubmissionReview:

    @pytest.fixture
    def submission(self, task):
        return TaskSubmission.objects.create(
            task=task,
            text="Моя работа",
            file=SimpleUploadedFile("work.txt", b"data"),
            status="SUBMITTED",
        )

    def test_review_approved_sets_task_done(
        self, api_client, supervisor, project, stage, task, submission
    ):
        api_client.force_authenticate(user=supervisor)
        url = review_url(project.id, stage.id, task.id, submission.id)
        response = api_client.post(url, {"decision": ReviewDecision.APPROVED, "comment": ""})
        assert response.status_code == status.HTTP_201_CREATED
        task.refresh_from_db()
        assert task.status == TaskStatus.DONE
        submission.refresh_from_db()
        assert submission.status == "APPROVED"

    def test_review_needs_revision_sets_task_in_progress(
        self, api_client, supervisor, project, stage, task, submission
    ):
        api_client.force_authenticate(user=supervisor)
        url = review_url(project.id, stage.id, task.id, submission.id)
        response = api_client.post(
            url, {"decision": ReviewDecision.NEEDS_REVISION, "comment": "Доработать"}
        )
        assert response.status_code == status.HTTP_201_CREATED
        task.refresh_from_db()
        assert task.status == TaskStatus.IN_PROGRESS
        submission.refresh_from_db()
        assert submission.status == "NEEDS_REVISION"

    def test_student_cannot_review(
        self, api_client, student, project, stage, task, submission
    ):
        api_client.force_authenticate(user=student)
        url = review_url(project.id, stage.id, task.id, submission.id)
        response = api_client.post(url, {"decision": ReviewDecision.APPROVED})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_foreign_supervisor_cannot_review(
        self, api_client, supervisor2, project, stage, task, submission
    ):
        api_client.force_authenticate(user=supervisor2)
        url = review_url(project.id, stage.id, task.id, submission.id)
        response = api_client.post(url, {"decision": ReviewDecision.APPROVED})
        assert response.status_code in (
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        )


# ── Публикации ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPublications:

    def test_student_creates_publication_marks_task_done(
        self, api_client, student, project, stage, publication_task
    ):
        api_client.force_authenticate(user=student)
        payload = {
            "title": "Статья о системе",
            "type": PublicationType.ARTICLE,
            "status": "DRAFT",
            "year": 2026,
        }
        url = f"/api/projects/{project.id}/stages/{stage.id}/tasks/{publication_task.id}/publications/"
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        publication_task.refresh_from_db()
        assert publication_task.status == TaskStatus.DONE

    def test_student_cannot_publish_for_file_task(
        self, api_client, student, project, stage, task
    ):
        api_client.force_authenticate(user=student)
        payload = {"title": "Попытка", "type": PublicationType.ARTICLE, "status": "DRAFT"}
        url = f"/api/projects/{project.id}/stages/{stage.id}/tasks/{task.id}/publications/"
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_publications_by_project(
        self, api_client, supervisor, project, stage, publication_task
    ):
        Publication.objects.create(
            task=publication_task,
            title="Тестовая публикация",
            type=PublicationType.ARTICLE,
        )
        api_client.force_authenticate(user=supervisor)
        response = api_client.get(publications_url(project.id))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


# ── Шаблоны планов ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestPlanTemplate:

    def test_list_templates_any_authenticated(
        self, api_client, student, plan_template
    ):
        api_client.force_authenticate(user=student)
        response = api_client.get(templates_url())
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_template_as_supervisor(self, api_client, supervisor):
        api_client.force_authenticate(user=supervisor)
        payload = {
            "name": "Мой шаблон",
            "description": "Описание",
            "stages": [
                {
                    "name": "Этап А",
                    "order": 1,
                    "duration_days": 10,
                    "tasks": [{"title": "Задача А1", "order": 1, "task_type": "FILE"}],
                }
            ],
        }
        response = api_client.post(templates_url(), payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert PlanTemplate.objects.filter(name="Мой шаблон").exists()

    def test_create_template_as_student_forbidden(self, api_client, student):
        api_client.force_authenticate(user=student)
        response = api_client.post(
            templates_url(), {"name": "Нет", "description": ""}, format="json"
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_system_template_forbidden(
        self, api_client, head, system_template
    ):
        api_client.force_authenticate(user=head)
        response = api_client.delete(template_url(system_template.id))
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert PlanTemplate.objects.filter(id=system_template.id).exists()

    def test_delete_own_template_as_supervisor(
        self, api_client, supervisor, plan_template
    ):
        api_client.force_authenticate(user=supervisor)
        response = api_client.delete(template_url(plan_template.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not PlanTemplate.objects.filter(id=plan_template.id).exists()

    def test_supervisor_cannot_delete_others_template(
        self, api_client, supervisor2, plan_template
    ):
        api_client.force_authenticate(user=supervisor2)
        response = api_client.delete(template_url(plan_template.id))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_head_can_delete_any_non_system_template(
        self, api_client, head, plan_template
    ):
        api_client.force_authenticate(user=head)
        response = api_client.delete(template_url(plan_template.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT
