from django.db import models
from django.conf import settings
from django.utils import timezone
from stud.models import StudentEnrollment
User = settings.AUTH_USER_MODEL

class ProjectStatus(models.TextChoices):
    DRAFT = "DRAFT", "Черновик"
    APPROVED = "APPROVED", "Утвержден"
    IN_PROGRESS = "IN_PROGRESS", "В работе"
    PRE_DEFENSE = "PRE_DEFENSE", "Предзащита"
    DEFENDED = "DEFENDED", "Защищён"
    REJECTED = "REJECTED", "Отклонён"

class SubmissionStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Отправлено"
    NEEDS_REVISION = "NEEDS_REVISION", "На доработку"
    APPROVED = "APPROVED", "Принято"

class ReviewDecision(models.TextChoices):
    APPROVED = "APPROVED", "Принять"
    NEEDS_REVISION = "NEEDS_REVISION", "Вернуть на доработку"

class TaskStatus(models.TextChoices):
    TODO = "TODO", "Не начата"
    IN_PROGRESS = "IN_PROGRESS", "В работе"
    DONE = "DONE", "Выполнена"
    OVERDUE = "OVERDUE", "Просрочена"

class StageStatus(models.TextChoices):
    PENDING = "PENDING", "Ожидает начала"
    IN_PROGRESS = "IN_PROGRESS", "В работе"
    COMPLETED = "COMPLETED", "Завершён"
    OVERDUE = "OVERDUE", "Просрочен"

class TaskType(models.TextChoices):
    FILE = "FILE"
    PUBLICATION = "PUBLICATION"

class PublicationType(models.TextChoices):
    ARTICLE = "ARTICLE", "Статья"
    THESIS = "THESIS", "Тезисы"
    CONFERENCE = "CONFERENCE", "Доклад"

class PublicationStatus(models.TextChoices):
    DRAFT = "DRAFT", "Черновик"
    PENDING = "PENDING", "На рассмотрении"
    PRINT = "PRINT", "В печати"
    PUBLISHED = "PUBLISHED", "Опубликована"
    REJECTED = "REJECTED", "Отклонена"

class ResearchProject(models.Model):
    enrollment = models.ForeignKey(StudentEnrollment, on_delete=models.CASCADE, related_name="research_projects")
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="supervised_projects")
    title = models.CharField(max_length=500)
    description = models.TextField()
    keywords = models.CharField(max_length=500)
    start_date = models.DateField()
    status = models.CharField(max_length=20, choices=ProjectStatus.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ResearchStage(models.Model):
    project = models.ForeignKey(ResearchProject, on_delete=models.CASCADE,related_name="stages")
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    start_date = models.DateField()
    deadline = models.DateField()
    status = models.CharField(max_length=20, choices=StageStatus.choices)
    def __str__(self):
        return f"{self.project} - {self.name}"

class StageTask(models.Model):
    stage = models.ForeignKey(
        ResearchStage,
        on_delete=models.CASCADE,
        related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    deadline = models.DateField(null=True, blank=True)
    task_type = models.CharField(max_length=25, choices=TaskType, default=TaskType.FILE)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Centralised completion tracking: stamp completed_at the moment the
        # task transitions into DONE, and clear it when it leaves DONE.
        if self.status == TaskStatus.DONE:
            if self.completed_at is None:
                self.completed_at = timezone.now()
        else:
            self.completed_at = None
        # Keep completed_at persisted even when callers pass update_fields=["status"]
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = set(update_fields)
            if "status" in update_fields:
                update_fields.add("completed_at")
                kwargs["update_fields"] = update_fields
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class TaskSubmission(models.Model):
    task = models.ForeignKey(StageTask, on_delete=models.CASCADE, related_name="submissions")
    text = models.TextField(blank=True)
    file = models.FileField(upload_to="task_submissions/")
    report = models.FileField(upload_to="submission_reports/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=SubmissionStatus.choices, default=SubmissionStatus.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)

class SubmissionReview(models.Model):
    reviewer = models.ForeignKey(User,
        on_delete=models.CASCADE
    )
    submission = models.OneToOneField(
        TaskSubmission,
        on_delete=models.CASCADE,
        related_name="review")
    decision = models.CharField(max_length=20, choices=ReviewDecision.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class IndexingSystem(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Publisher(models.Model):
    name = models.CharField(max_length=500, unique=True)
    city = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Publication(models.Model):
    type = models.CharField(max_length=25, choices=PublicationType.choices, default=PublicationType.ARTICLE)
    status = models.CharField(max_length=20, choices=PublicationStatus.choices, default=PublicationStatus.DRAFT)
    url = models.URLField(blank=True)
    task = models.ForeignKey(StageTask, on_delete=models.CASCADE, related_name="publications")
    title = models.CharField(max_length=500)
    doi = models.CharField(max_length=255, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    indexes = models.ManyToManyField(IndexingSystem, blank=True, related_name="publications")
    publisher = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class PlanTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="plan_templates"
    )
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class PlanTemplateStage(models.Model):
    template = models.ForeignKey(PlanTemplate, on_delete=models.CASCADE, related_name="stages")
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    duration_days = models.PositiveIntegerField(default=14)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.template.name} — {self.name}"


class PlanTemplateTask(models.Model):
    stage = models.ForeignKey(PlanTemplateStage, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    task_type = models.CharField(max_length=25, choices=TaskType.choices, default=TaskType.FILE)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title

