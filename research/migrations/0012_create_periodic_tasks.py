"""
Data migration: регистрирует задачу update_deadlines в django_celery_beat.
После применения задача появится в Django Admin → Periodic Tasks.
"""
from django.db import migrations


def create_deadline_task(apps, schema_editor):
    """Создаём расписание: каждый день в 00:05."""
    try:
        CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
        PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute="5",
            hour="0",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
        )
        PeriodicTask.objects.get_or_create(
            name="update-deadlines-daily",
            defaults={
                "crontab": schedule,
                "task": "research.tasks.update_deadlines",
                "enabled": True,
                "description": "Ежедневно помечает просроченные задачи и этапы как OVERDUE",
            },
        )
    except Exception:
        pass


def remove_deadline_task(apps, schema_editor):
    try:
        PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
        PeriodicTask.objects.filter(name="update-deadlines-daily").delete()
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("research", "0011_alter_plantemplatetask_task_type_and_more"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [
        migrations.RunPython(create_deadline_task, remove_deadline_task),
    ]
