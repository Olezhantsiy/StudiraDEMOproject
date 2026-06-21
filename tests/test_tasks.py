"""
Тесты: фоновые Celery-задачи (research/tasks.py).
Celery-задачи тестируются напрямую без брокера — проверяется логика изменения статусов.
"""

import pytest
from datetime import date, timedelta

from research.models import (
    ResearchStage, StageTask, StageStatus, TaskStatus, TaskType,
)
from research.tasks import update_deadlines


# ── Вспомогательные фикстуры ───────────────────────────────────────────────────

@pytest.fixture
def pending_stage_past_deadline(db, project):
    """Этап с истёкшим дедлайном в статусе IN_PROGRESS — должен стать OVERDUE."""
    return ResearchStage.objects.create(
        project=project,
        name="Просроченный этап",
        order=10,
        start_date=date.today() - timedelta(days=30),
        deadline=date.today() - timedelta(days=1),
        status=StageStatus.IN_PROGRESS,
    )


@pytest.fixture
def completed_stage_past_deadline(db, project):
    """Завершённый этап с истёкшим дедлайном — статус НЕ должен меняться."""
    return ResearchStage.objects.create(
        project=project,
        name="Завершённый",
        order=11,
        start_date=date.today() - timedelta(days=30),
        deadline=date.today() - timedelta(days=5),
        status=StageStatus.COMPLETED,
    )


@pytest.fixture
def already_overdue_stage(db, project):
    """Уже просроченный этап — не должен дублироваться в счётчике."""
    return ResearchStage.objects.create(
        project=project,
        name="Уже просроченный",
        order=12,
        start_date=date.today() - timedelta(days=30),
        deadline=date.today() - timedelta(days=10),
        status=StageStatus.OVERDUE,
    )


@pytest.fixture
def future_stage(db, project):
    """Этап с будущим дедлайном — не должен меняться."""
    return ResearchStage.objects.create(
        project=project,
        name="Будущий этап",
        order=13,
        start_date=date.today(),
        deadline=date.today() + timedelta(days=30),
        status=StageStatus.IN_PROGRESS,
    )


@pytest.fixture
def in_progress_task_past_deadline(db, stage):
    return StageTask.objects.create(
        stage=stage,
        title="Просроченная задача",
        task_type=TaskType.FILE,
        deadline=date.today() - timedelta(days=1),
        status=TaskStatus.IN_PROGRESS,
    )


@pytest.fixture
def todo_task_past_deadline(db, stage):
    return StageTask.objects.create(
        stage=stage,
        title="Невыполненная просроченная",
        task_type=TaskType.FILE,
        deadline=date.today() - timedelta(days=2),
        status=TaskStatus.TODO,
    )


@pytest.fixture
def done_task_past_deadline(db, stage):
    """Выполненная задача с истёкшим дедлайном — НЕ должна меняться."""
    return StageTask.objects.create(
        stage=stage,
        title="Выполненная задача",
        task_type=TaskType.FILE,
        deadline=date.today() - timedelta(days=3),
        status=TaskStatus.DONE,
    )


@pytest.fixture
def future_task(db, stage):
    """Задача с будущим дедлайном — не должна меняться."""
    return StageTask.objects.create(
        stage=stage,
        title="Будущая задача",
        task_type=TaskType.FILE,
        deadline=date.today() + timedelta(days=7),
        status=TaskStatus.TODO,
    )


# ── Тесты задачи update_deadlines ─────────────────────────────────────────────

@pytest.mark.django_db
class TestUpdateDeadlines:

    def test_in_progress_stage_becomes_overdue(
        self, pending_stage_past_deadline
    ):
        result = update_deadlines.run()
        pending_stage_past_deadline.refresh_from_db()
        assert pending_stage_past_deadline.status == StageStatus.OVERDUE
        assert result["stages_updated"] >= 1

    def test_completed_stage_not_changed(
        self, completed_stage_past_deadline
    ):
        update_deadlines.run()
        completed_stage_past_deadline.refresh_from_db()
        assert completed_stage_past_deadline.status == StageStatus.COMPLETED

    def test_already_overdue_stage_not_double_counted(
        self, already_overdue_stage
    ):
        result = update_deadlines.run()
        already_overdue_stage.refresh_from_db()
        assert already_overdue_stage.status == StageStatus.OVERDUE
        # Уже просроченный не должен попасть в счётчик обновлений
        assert result["stages_updated"] == 0

    def test_future_stage_not_changed(self, future_stage):
        update_deadlines.run()
        future_stage.refresh_from_db()
        assert future_stage.status == StageStatus.IN_PROGRESS

    def test_in_progress_task_becomes_overdue(self, in_progress_task_past_deadline):
        update_deadlines.run()
        in_progress_task_past_deadline.refresh_from_db()
        assert in_progress_task_past_deadline.status == TaskStatus.OVERDUE

    def test_todo_task_becomes_overdue(self, todo_task_past_deadline):
        update_deadlines.run()
        todo_task_past_deadline.refresh_from_db()
        assert todo_task_past_deadline.status == TaskStatus.OVERDUE

    def test_done_task_not_changed(self, done_task_past_deadline):
        update_deadlines.run()
        done_task_past_deadline.refresh_from_db()
        assert done_task_past_deadline.status == TaskStatus.DONE

    def test_future_task_not_changed(self, future_task):
        update_deadlines.run()
        future_task.refresh_from_db()
        assert future_task.status == TaskStatus.TODO

    def test_result_contains_correct_fields(
        self, pending_stage_past_deadline, in_progress_task_past_deadline
    ):
        result = update_deadlines.run()
        assert "stages_updated" in result
        assert "tasks_updated" in result
        assert "checked_at" in result
        assert result["stages_updated"] >= 1
        assert result["tasks_updated"] >= 1

    def test_multiple_overdue_objects(self, db, project, stage):
        """Пакетное обновление нескольких просроченных объектов."""
        past = date.today() - timedelta(days=1)
        for i in range(3):
            ResearchStage.objects.create(
                project=project,
                name=f"Просроченный {i}",
                order=20 + i,
                start_date=date.today() - timedelta(days=10),
                deadline=past,
                status=StageStatus.PENDING,
            )
            StageTask.objects.create(
                stage=stage,
                title=f"Задача {i}",
                task_type=TaskType.FILE,
                deadline=past,
                status=TaskStatus.TODO,
            )
        result = update_deadlines.run()
        assert result["stages_updated"] == 3
        assert result["tasks_updated"] == 3
