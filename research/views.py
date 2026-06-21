from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from django.http import FileResponse
from rest_framework.response import Response

from users.models import UserRole
from .models import ReviewDecision, TaskStatus, TaskType
from .models import (
    ResearchProject, ResearchStage, StageTask, TaskSubmission, SubmissionReview,
    Publication, PlanTemplate, IndexingSystem,
)
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from research.services.plan_templates import DEFAULT_RESEARCH_PLAN
from research.services.pdf_generator_new import generate_submission_report
from research.services.stage_report import generate_stage_docx
from research.services import stats as stats_service
from .serializers import (
    ResearchProjectSerializer,
    ResearchStageSerializer,
    StageTaskSerializer,
    TaskSubmissionSerializer,
    SubmissionReviewSerializer,
    PublicationsSerializer,
    IndexingSystemSerializer,
    PlanTemplateSerializer,
    PlanTemplateListSerializer,
)
from .permissions import (
    IsProjectSupervisor,
    IsSubmissionOwner,
    IsSubmissionAuthorOrReviewer, IsStudent, IsPublicationOwner, IsSupervisorOrHead,
    is_supervisor_of, supervisor_ids_in_department,
)
from users.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import mimetypes

class ResearchProjectViewSet(viewsets.ModelViewSet):
    queryset = ResearchProject.objects.all()
    serializer_class = ResearchProjectSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update"]:
            return [IsProjectSupervisor()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.role == UserRole.HEAD:
            return ResearchProject.objects.filter(
                Q(enrollment__group__program__department__head=user) | Q(supervisor=user)
            ).distinct()

        if user.role == UserRole.SUPERVISOR:
            return ResearchProject.objects.filter(supervisor=user)

        if user.role == UserRole.STUDENT:
            return ResearchProject.objects.filter(enrollment__student=user)

        return ResearchProject.objects.all()

    def perform_create(self, serializer):
        serializer.save(supervisor=self.request.user)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request):
        projects = self.get_queryset()
        project_ids = list(projects.values_list("id", flat=True))

        raw_stats = (
            StageTask.objects.filter(stage__project_id__in=project_ids)
            .values("stage__project_id")
            .annotate(
                total=Count("id"),
                done=Count("id", filter=Q(status="DONE")),
                in_progress=Count("id", filter=Q(status="IN_PROGRESS")),
                todo=Count("id", filter=Q(status="TODO")),
                overdue=Count("id", filter=Q(status="OVERDUE")),
            )
        )

        stats_map = {s["stage__project_id"]: s for s in raw_stats}

        result = []
        for pid in project_ids:
            s = stats_map.get(pid, {"total": 0, "done": 0, "in_progress": 0, "todo": 0, "overdue": 0})
            total = s["total"]
            result.append({
                "project_id": pid,
                "total": total,
                "done": s["done"],
                "in_progress": s["in_progress"],
                "todo": s["todo"],
                "overdue": s["overdue"],
                "completion_percent": round(s["done"] / total * 100) if total > 0 else 0,
            })

        return Response(result)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Detailed statistics for a single project (role-scoped via get_object)."""
        project = self.get_object()
        return Response({
            "project_id": project.id,
            "project_title": project.title,
            "progress": stats_service.project_progress(project),
            "upcoming_tasks": stats_service.upcoming_tasks(project),
            "overdue_tasks": stats_service.overdue_tasks(project),
            "burndown": stats_service.burndown(project),
        })

    @action(detail=False, methods=["get"], url_path="supervisor-summary")
    def supervisor_summary(self, request):
        """Aggregated metrics for a supervisor with per-student breakdown.

        SPV may only view their own summary; HOD may view any supervisor in
        their department; everyone else is forbidden.
        """
        user = request.user
        supervisor_id = request.query_params.get("supervisor_id")

        if user.role == UserRole.SUPERVISOR:
            if supervisor_id and int(supervisor_id) != user.id:
                raise PermissionDenied("Можно смотреть только свою статистику")
            supervisor = user
        elif user.role == UserRole.HEAD:
            if supervisor_id:
                if int(supervisor_id) not in supervisor_ids_in_department(user):
                    raise PermissionDenied("Этот руководитель не на вашей кафедре")
                supervisor = get_object_or_404(User, id=supervisor_id)
            else:
                supervisor = user
        else:
            raise PermissionDenied("Недостаточно прав")

        return Response(stats_service.supervisor_summary(supervisor))

    @action(detail=False, methods=["get"], url_path="department-summary")
    def department_summary(self, request):
        """Per-supervisor aggregated metrics for the head's department (HOD only)."""
        user = request.user
        if user.role != UserRole.HEAD:
            raise PermissionDenied("Доступно только заведующему кафедрой")
        return Response(stats_service.department_summary(user))

    @action(detail=True, methods=["post"], permission_classes=[IsProjectSupervisor])
    def generate_template(self, request, pk=None):
        project = self.get_object()

        if not is_supervisor_of(request.user, project):
            raise PermissionDenied("Вы не руководитель этого проекта")
        if project.stages.exists():
            return Response({"detail": "План уже создан"}, status=400)

        today = timezone.now().date()
        created_stages = []
        template_id = request.data.get("template_id")

        if template_id:
            plan_template = get_object_or_404(PlanTemplate, id=template_id)
            cumulative_days = 0
            for stage_tmpl in plan_template.stages.prefetch_related("tasks").all():
                start_date = today + timedelta(days=cumulative_days)
                deadline = start_date + timedelta(days=stage_tmpl.duration_days)
                stage = ResearchStage.objects.create(
                    project=project,
                    name=stage_tmpl.name,
                    order=stage_tmpl.order,
                    start_date=start_date,
                    deadline=deadline,
                    status="PENDING",
                )
                for task in stage_tmpl.tasks.all():
                    StageTask.objects.create(
                        stage=stage, title=task.title, description="", deadline=deadline,
                    )
                cumulative_days += stage_tmpl.duration_days
                created_stages.append(stage.name)
        else:
            system_tpl = PlanTemplate.objects.filter(is_system=True).prefetch_related("stages__tasks").first()
            if system_tpl:
                cumulative_days = 0
                for stage_tmpl in system_tpl.stages.all():
                    start_date = today + timedelta(days=cumulative_days)
                    deadline = start_date + timedelta(days=stage_tmpl.duration_days)
                    stage = ResearchStage.objects.create(
                        project=project,
                        name=stage_tmpl.name,
                        order=stage_tmpl.order,
                        start_date=start_date,
                        deadline=deadline,
                        status="PENDING",
                    )
                    for task in stage_tmpl.tasks.all():
                        StageTask.objects.create(
                            stage=stage, title=task.title, description="", deadline=deadline,
                        )
                    cumulative_days += stage_tmpl.duration_days
                    created_stages.append(stage.name)
            else:
                stage_duration = 14
                for index, stage_data in enumerate(DEFAULT_RESEARCH_PLAN, start=1):
                    start_date = today + timedelta(days=(index - 1) * stage_duration)
                    deadline = start_date + timedelta(days=stage_duration)
                    stage = ResearchStage.objects.create(
                        project=project,
                        name=stage_data["stage"],
                        order=index,
                        start_date=start_date,
                        deadline=deadline,
                        status="PENDING",
                    )
                    for task_name in stage_data["tasks"]:
                        StageTask.objects.create(
                            stage=stage, title=task_name, description="", deadline=deadline,
                        )
                    created_stages.append(stage.name)

        return Response({
            "message": "Шаблонный план успешно создан",
            "stages_created": created_stages
        })


class ResearchStageViewSet(viewsets.ModelViewSet):
    queryset = ResearchStage.objects.all()
    serializer_class = ResearchStageSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "destroy", "partial_update"]:
            return [IsProjectSupervisor()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        project_id = self.kwargs["project_pk"]

        qs = ResearchStage.objects.filter(project_id=project_id)

        if user.role == UserRole.HEAD:
            return qs.filter(
                Q(project__enrollment__group__program__department__head=user) | Q(project__supervisor=user)
            ).distinct()

        if user.role == UserRole.SUPERVISOR:
            return qs.filter(project__supervisor=user)

        if user.role == UserRole.STUDENT:
            return qs.filter(project__enrollment__student=user)

        return ResearchStage.objects.none()

    def perform_create(self, serializer):
        project_id = self.kwargs["project_pk"]
        project = get_object_or_404(ResearchProject, id=project_id)

        if not is_supervisor_of(self.request.user, project):
            raise PermissionDenied("Вы не руководитель этого проекта")

        serializer.save(project=project)

    def perform_update(self, serializer):
        stage = self.get_object()
        if not is_supervisor_of(self.request.user, stage.project):
            raise PermissionDenied("Вы не руководитель этого проекта")
        serializer.save()

    @action(detail=True, methods=["get"], url_path="generate_report",
            permission_classes=[permissions.IsAuthenticated])
    def generate_report(self, request, project_pk=None, pk=None):
        stage = self.get_object()
        docx_file = generate_stage_docx(stage)
        response = FileResponse(
            docx_file,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="stage_report_{stage.id}.docx"'
        )
        return response


class StageTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StageTaskSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "destroy", "partial_update"]:
            return [IsProjectSupervisor()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        stage_id = self.kwargs["stage_pk"]

        qs = StageTask.objects.filter(stage_id=stage_id)

        if user.role == UserRole.HEAD:
            return qs.filter(
                Q(stage__project__enrollment__group__program__department__head=user)
                | Q(stage__project__supervisor=user)
            ).distinct()

        if user.role == UserRole.SUPERVISOR:
            return qs.filter(stage__project__supervisor=user)

        if user.role == UserRole.STUDENT:
            return qs.filter(stage__project__enrollment__student=user)

        return qs

    def perform_create(self, serializer):
        stage_id = self.kwargs["stage_pk"]
        stage = get_object_or_404(ResearchStage, id=stage_id)
        if not is_supervisor_of(self.request.user, stage):
            raise PermissionDenied("Вы не руководитель этого проекта")
        serializer.save(stage=stage)

    def perform_update(self, serializer):
        task = self.get_object()
        if not is_supervisor_of(self.request.user, task):
            raise PermissionDenied("Вы не руководитель этого проекта")
        serializer.save()


class TaskSubmissionViewSet(viewsets.ModelViewSet):
    queryset = TaskSubmission.objects.all()
    serializer_class = TaskSubmissionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsStudent()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsSubmissionOwner()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        task_id = self.kwargs["task_pk"]

        qs = TaskSubmission.objects.filter(task_id=task_id)

        if user.role == UserRole.HEAD:
            return qs.filter(
                Q(task__stage__project__enrollment__group__program__department__head=user)
                | Q(task__stage__project__supervisor=user)
            ).distinct()

        if user.role == UserRole.SUPERVISOR:
            return qs.filter(task__stage__project__supervisor=user)

        if user.role == UserRole.STUDENT:
            return qs.filter(task__stage__project__enrollment__student=user)

        return qs

    def perform_create(self, serializer):
        task_id = self.kwargs["task_pk"]
        task = get_object_or_404(StageTask, id=task_id)
        user = self.request.user

        if task.stage.project.enrollment.student != user:
            raise PermissionDenied("Это не ваша задача")

        submission = serializer.save(task=task)
        pdf_file = generate_submission_report(submission)
        submission.report.save(pdf_file.name, pdf_file, save=True)
        if task.status != TaskStatus.DONE:
            task.status = TaskStatus.IN_PROGRESS
            task.save(update_fields=["status"])

    def perform_update(self, serializer):
        submission = self.get_object()
        if not is_supervisor_of(self.request.user, submission):
            raise PermissionDenied("Вы не руководитель этого проекта")
        serializer.save()

    @action(detail=True, methods=["get"], permission_classes=[IsSubmissionAuthorOrReviewer])
    def download(self, request, pk=None, **kwargs):
        submission = self.get_object()
        file = submission.file
        mime_type, _ = mimetypes.guess_type(file.name)
        response = FileResponse(file.open("rb"), content_type=mime_type or "application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{file.name.split("/")[-1]}"'
        return response

    @action(detail=True, methods=["get"], permission_classes=[IsSubmissionAuthorOrReviewer])
    def download_report(self, request, pk=None, **kwargs):
        submission = self.get_object()
        file = submission.report
        if not file:
            return Response({"detail": "Отчёт не найден"}, status=404)
        response = FileResponse(file.open("rb"), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{file.name.split("/")[-1]}"'
        return response

class SubmissionReviewViewSet(viewsets.ModelViewSet):
    queryset = SubmissionReview.objects.all()
    serializer_class = SubmissionReviewSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsProjectSupervisor()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        submission_id = self.kwargs.get("submission_pk")
        qs = SubmissionReview.objects.filter(submission_id=submission_id)
        if user.role == UserRole.HEAD:
            return qs.filter(
                Q(submission__task__stage__project__enrollment__group__program__department__head=user)
                | Q(submission__task__stage__project__supervisor=user)
            ).distinct()
        if user.role == UserRole.SUPERVISOR:
            return qs.filter(submission__task__stage__project__supervisor=user)
        if user.role == UserRole.STUDENT:
            return qs.filter(submission__task__stage__project__enrollment__student=user)
        return SubmissionReview.objects.none()

    def _apply_review(self, review):
        """Sync submission status and task status based on review decision."""
        submission = review.submission
        task = submission.task
        submission.status = review.decision
        submission.save(update_fields=["status"])
        if review.decision == ReviewDecision.APPROVED:
            task.status = TaskStatus.DONE
        else:
            task.status = TaskStatus.IN_PROGRESS
        task.save(update_fields=["status"])

    def perform_create(self, serializer):
        submission_id = self.kwargs["submission_pk"]
        submission = get_object_or_404(TaskSubmission, id=submission_id)
        if not is_supervisor_of(self.request.user, submission):
            raise PermissionDenied("Вы не руководитель этого проекта")
        review = serializer.save(reviewer=self.request.user, submission=submission)
        self._apply_review(review)

    def perform_update(self, serializer):
        review = self.get_object()
        if not is_supervisor_of(self.request.user, review):
            raise PermissionDenied("Вы не руководитель этого проекта")
        updated = serializer.save()
        self._apply_review(updated)

class PlanTemplateViewSet(viewsets.ModelViewSet):
    queryset = PlanTemplate.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return PlanTemplateListSerializer
        return PlanTemplateSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            return [IsSupervisorOrHead()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsSupervisorOrHead()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        if instance.is_system:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Системный шаблон нельзя удалить.")
        instance.delete()


class IndexingSystemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IndexingSystem.objects.all()
    serializer_class = IndexingSystemSerializer
    permission_classes = [permissions.IsAuthenticated]


class PublicationsViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all()
    serializer_class = PublicationsSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsPublicationOwner()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        task_pk = self.kwargs.get("task_pk")
        project_pk = self.kwargs.get("project_pk")

        if task_pk:
            qs = Publication.objects.filter(task_id=task_pk)
        elif project_pk:
            qs = Publication.objects.filter(task__stage__project_id=project_pk)
        else:
            return Publication.objects.none()

        if user.role == UserRole.HEAD:
            return qs.filter(
                Q(task__stage__project__enrollment__group__program__department__head=user)
                | Q(task__stage__project__supervisor=user)
            ).distinct()
        if user.role == UserRole.SUPERVISOR:
            return qs.filter(task__stage__project__supervisor=user)
        if user.role == UserRole.STUDENT:
            return qs.filter(task__stage__project__enrollment__student=user)

        return Publication.objects.none()

    def perform_create(self, serializer):
        task_pk = self.kwargs.get("task_pk")
        if not task_pk:
            raise PermissionDenied("Публикации создаются только через задачу")
        task = get_object_or_404(StageTask, id=task_pk)
        if task.task_type != TaskType.PUBLICATION:
            raise PermissionDenied("Эта задача не предусматривает создание публикаций")
        user = self.request.user
        project = task.stage.project
        if user.role == UserRole.STUDENT and project.enrollment.student != user:
            raise PermissionDenied("Это не ваш проект")
        if user.role in (UserRole.SUPERVISOR, UserRole.HEAD) and not is_supervisor_of(user, task):
            raise PermissionDenied("Вы не руководитель этого проекта")
        serializer.save(task=task)
        # Публикация создана — задача считается выполненной
        if task.status != TaskStatus.DONE:
            task.status = TaskStatus.DONE
            task.save(update_fields=["status"])

    def perform_update(self, serializer):
        publication = self.get_object()
        project = publication.task.stage.project
        user = self.request.user
        if not is_supervisor_of(user, publication) and project.enrollment.student != user:
            raise PermissionDenied("Это не ваша публикация")
        serializer.save()

