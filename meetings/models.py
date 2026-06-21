from django.db import models
from django.conf import settings
from research.models import ResearchProject

User = settings.AUTH_USER_MODEL


class MeetingStatus(models.TextChoices):
    PLANNED = "PLANNED", "Планируется"
    DONE = "DONE", "Проведено"
    CANCELLED = "CANCELLED", "Отменено"


class Meeting(models.Model):
    project = models.ForeignKey(
        ResearchProject, on_delete=models.CASCADE, related_name="meetings"
    )
    organizer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="organized_meetings"
    )
    title = models.CharField(max_length=255, default="Встреча")
    datetime = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    location = models.CharField(max_length=255, blank=True)
    timezone = models.CharField(max_length=64, default="UTC")
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=MeetingStatus.choices, default=MeetingStatus.PLANNED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["datetime"]

    def __str__(self):
        return f"{self.title} ({self.datetime:%Y-%m-%d %H:%M})"
