from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q

from .models import Meeting
from .serializers import MeetingSerializer, MeetingUpdateSerializer
from users.models import UserRole


class MeetingPermission(permissions.BasePermission):
    """
    - Any authenticated user can list/retrieve meetings they are a participant of
      (organizer, or student/supervisor of the related project).
    - Student can create meetings for their own projects.
    - Supervisor/Head can create + fully update (including datetime reschedule).
    - Only organizer or supervisor of the project can delete.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        project = obj.project

        is_supervisor = (
            project.supervisor_id == user.id
            if hasattr(project, "supervisor_id")
            else project.supervisor and project.supervisor.id == user.id
        )
        is_student = (
            project.enrollment.student_id == user.id
            if hasattr(project.enrollment, "student_id")
            else False
        )
        is_spv_or_hod = user.role in (UserRole.SUPERVISOR, UserRole.HEAD)

        if view.action in ("retrieve",):
            return is_supervisor or is_student or obj.organizer_id == user.id

        if view.action in ("update", "partial_update"):
            if is_spv_or_hod:
                return True
            # Student can only update notes/location (not datetime) — enforced in serializer
            return obj.organizer_id == user.id

        if view.action == "destroy":
            return obj.organizer_id == user.id or is_supervisor

        return False


class MeetingViewSet(viewsets.ModelViewSet):
    permission_classes = [MeetingPermission]
    serializer_class = MeetingSerializer

    def get_queryset(self):
        user = self.request.user
        # Return meetings where user is the organizer, supervisor, or the enrolled student
        qs = Meeting.objects.select_related(
            "project", "project__enrollment__student", "project__supervisor", "organizer"
        ).filter(
            Q(organizer=user)
            | Q(project__supervisor=user)
            | Q(project__enrollment__student=user)
        ).distinct()

        # Optional filter by project
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        # Optional filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def get_serializer_class(self):
        user = self.request.user
        if self.action in ("update", "partial_update") and user.role in (
            UserRole.SUPERVISOR,
            UserRole.HEAD,
        ):
            return MeetingUpdateSerializer
        return MeetingSerializer

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    def update(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()

        # Students cannot reschedule (change datetime)
        if user.role == UserRole.STUDENT and "datetime" in request.data:
            return Response(
                {"detail": "Студент не может изменять дату и время встречи."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)
