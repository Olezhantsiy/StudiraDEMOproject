from celery import shared_task
from django.utils import timezone

from .models import ResearchStage, StageTask, StageStatus, TaskStatus

@shared_task(bind=True, name="research.tasks.update_deadlines")
def update_deadlines(self):
    today = timezone.now().date()

    updated_stages = ResearchStage.objects.filter(
        deadline__lt=today
    ).exclude(
        status__in=[StageStatus.COMPLETED, StageStatus.OVERDUE]
    ).update(status=StageStatus.OVERDUE)

    updated_tasks = StageTask.objects.filter(
        deadline__lt=today
    ).exclude(
        status__in=[TaskStatus.DONE, TaskStatus.OVERDUE]
    ).update(status=TaskStatus.OVERDUE)

    return {
        "stages_updated": updated_stages,
        "tasks_updated": updated_tasks,
        "checked_at": today.isoformat(),
    }
