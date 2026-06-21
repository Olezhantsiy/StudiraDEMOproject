"""Unit tests for research.services.stats."""
from datetime import date, timedelta

import pytest
from django.utils import timezone

from research.models import StageTask, TaskStatus
from research.services.stats import burndown


@pytest.mark.django_db
class TestBurndown:
    def test_empty_when_no_tasks(self, project):
        assert burndown(project) == []

    def test_starts_at_total_with_linear_ideal(self, project, stage):
        start = date.today() - timedelta(days=30)
        end_deadline = date.today() + timedelta(days=30)
        project.start_date = start
        project.save()

        for i in range(15):
            StageTask.objects.create(
                stage=stage,
                title=f"Задача {i}",
                deadline=end_deadline,
                status=TaskStatus.TODO,
            )

        series = burndown(project)
        assert series[0]["ideal_remaining"] == 15
        assert series[0]["actual_remaining"] == 15

        today_point = next(p for p in series if p["date"] == date.today().isoformat())
        assert today_point["ideal_remaining"] < 15
        assert today_point["actual_remaining"] == 15

        end_point = next(p for p in series if p["date"] == end_deadline.isoformat())
        assert end_point["ideal_remaining"] == 0

    def test_actual_decreases_when_tasks_completed(self, project, stage):
        start = date.today() - timedelta(days=30)
        end_deadline = date.today() + timedelta(days=30)
        project.start_date = start
        project.save()

        tasks = [
            StageTask.objects.create(
                stage=stage,
                title=f"Задача {i}",
                deadline=end_deadline,
                status=TaskStatus.TODO,
            )
            for i in range(15)
        ]

        tasks[0].status = TaskStatus.DONE
        tasks[0].completed_at = timezone.now() - timedelta(days=5)
        tasks[0].save()
        tasks[1].status = TaskStatus.DONE
        tasks[1].completed_at = timezone.now() - timedelta(days=2)
        tasks[1].save()

        series = burndown(project)
        today_point = next(p for p in series if p["date"] == date.today().isoformat())
        assert today_point["actual_remaining"] == 13

        mid_point = next(
            p for p in series if p["date"] == (date.today() - timedelta(days=5)).isoformat()
        )
        assert mid_point["actual_remaining"] == 14
