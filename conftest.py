"""
Общие pytest-фикстуры для всего проекта Studira.
"""

import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient

from users.models import User, UserRole
from stud.models import Department, EducationalProgram, AcademicGroup, StudentEnrollment, DegreeLevel
from research.models import (
    ResearchProject, ResearchStage, StageTask,
    TaskSubmission, ProjectStatus, StageStatus, TaskStatus, TaskType,
    PlanTemplate, PlanTemplateStage, PlanTemplateTask,
)


# ── Вспомогательная функция ────────────────────────────────────────────────────

def make_user(username, role, password="testpass123"):
    user = User.objects.create_user(
        username=username,
        password=password,
        email=f"{username}@test.ru",
        first_name="Иван",
        last_name="Тестов",
    )
    user.role = role
    user.save()
    return user


# ── Пользователи ───────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student(db):
    return make_user("student1", UserRole.STUDENT)


@pytest.fixture
def student2(db):
    return make_user("student2", UserRole.STUDENT)


@pytest.fixture
def supervisor(db):
    return make_user("supervisor1", UserRole.SUPERVISOR)


@pytest.fixture
def supervisor2(db):
    return make_user("supervisor2", UserRole.SUPERVISOR)


@pytest.fixture
def head(db):
    return make_user("head1", UserRole.HEAD)


# ── Учебная структура ──────────────────────────────────────────────────────────

@pytest.fixture
def department(db, head):
    return Department.objects.create(
        name="Кафедра информационных систем",
        description="Тестовая кафедра",
        head=head,
    )


@pytest.fixture
def program(db, department):
    return EducationalProgram.objects.create(
        full_name="Информационные системы и технологии",
        short_name="ИСТ",
        degree_level=DegreeLevel.MAGISTR,
        department=department,
    )


@pytest.fixture
def group(db, program):
    return AcademicGroup.objects.create(
        name="ИСТ-241",
        program=program,
        start_date=date(2024, 9, 1),
        end_date=date(2026, 6, 30),
    )


@pytest.fixture
def enrollment(db, student, group, supervisor):
    return StudentEnrollment.objects.create(
        student=student,
        group=group,
        supervisor=supervisor,
        start_date=date(2024, 9, 1),
        status="ACTIVE",
    )


@pytest.fixture
def enrollment2(db, student2, group, supervisor2):
    return StudentEnrollment.objects.create(
        student=student2,
        group=group,
        supervisor=supervisor2,
        start_date=date(2024, 9, 1),
        status="ACTIVE",
    )


# ── Исследовательский проект ───────────────────────────────────────────────────

@pytest.fixture
def project(db, enrollment, supervisor):
    return ResearchProject.objects.create(
        enrollment=enrollment,
        supervisor=supervisor,
        title="Разработка системы планирования",
        description="Тестовый проект",
        keywords="планирование, система",
        start_date=date.today(),
        status=ProjectStatus.IN_PROGRESS,
    )


@pytest.fixture
def project2(db, enrollment2, supervisor2):
    return ResearchProject.objects.create(
        enrollment=enrollment2,
        supervisor=supervisor2,
        title="Второй проект",
        description="Ещё один проект",
        keywords="тест",
        start_date=date.today(),
        status=ProjectStatus.IN_PROGRESS,
    )


# ── Этап и задача ──────────────────────────────────────────────────────────────

@pytest.fixture
def stage(db, project):
    return ResearchStage.objects.create(
        project=project,
        name="Анализ литературы",
        order=1,
        start_date=date.today(),
        deadline=date.today() + timedelta(days=14),
        status=StageStatus.IN_PROGRESS,
    )


@pytest.fixture
def task(db, stage):
    return StageTask.objects.create(
        stage=stage,
        title="Написать обзор",
        task_type=TaskType.FILE,
        deadline=date.today() + timedelta(days=14),
        status=TaskStatus.TODO,
    )


@pytest.fixture
def publication_task(db, stage):
    return StageTask.objects.create(
        stage=stage,
        title="Опубликовать статью",
        task_type=TaskType.PUBLICATION,
        deadline=date.today() + timedelta(days=14),
        status=TaskStatus.TODO,
    )


# ── Overdue-объекты (для Celery тестов) ───────────────────────────────────────

@pytest.fixture
def overdue_stage(db, project):
    return ResearchStage.objects.create(
        project=project,
        name="Просроченный этап",
        order=2,
        start_date=date.today() - timedelta(days=30),
        deadline=date.today() - timedelta(days=1),
        status=StageStatus.IN_PROGRESS,
    )


@pytest.fixture
def overdue_task(db, overdue_stage):
    return StageTask.objects.create(
        stage=overdue_stage,
        title="Просроченная задача",
        task_type=TaskType.FILE,
        deadline=date.today() - timedelta(days=1),
        status=TaskStatus.IN_PROGRESS,
    )


# ── Шаблон плана ───────────────────────────────────────────────────────────────

@pytest.fixture
def plan_template(db, supervisor):
    tpl = PlanTemplate.objects.create(
        name="Стандартный шаблон",
        description="Тест",
        created_by=supervisor,
        is_system=False,
    )
    stage_tpl = PlanTemplateStage.objects.create(
        template=tpl, name="Этап 1", order=1, duration_days=14
    )
    PlanTemplateTask.objects.create(
        stage=stage_tpl, title="Задача 1.1", order=1, task_type=TaskType.FILE
    )
    PlanTemplateTask.objects.create(
        stage=stage_tpl, title="Задача 1.2", order=2, task_type=TaskType.FILE
    )
    return tpl


@pytest.fixture
def system_template(db):
    tpl = PlanTemplate.objects.create(
        name="Системный шаблон",
        description="Нельзя удалить",
        is_system=True,
    )
    stage_tpl = PlanTemplateStage.objects.create(
        template=tpl, name="Анализ", order=1, duration_days=7
    )
    PlanTemplateTask.objects.create(
        stage=stage_tpl, title="Обзор", order=1, task_type=TaskType.FILE
    )
    return tpl
